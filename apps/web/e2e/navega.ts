import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, type BrowserContext, type Page, expect, request } from '@playwright/test'
import { type CuentaDePrueba, type MundoDePrueba, type TelefonoPantalla, rutaDe } from './pantallas'

/**
 * CÓMO SE ABRE UNA PANTALLA DE LA PRUEBA (E3, docs/visual.md §7.2 y §7.3; PR 2b). Lo comparten la prueba
 * del teléfono (`telefono.spec.ts`) y las pasadas de cada noche que la usan (`nocturno.spec.ts`): el
 * mundo de `cuentas.json`, las sesiones de sus cuentas, una IP por contexto y la espera a que la página
 * acabe de cargar.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const CUENTAS = process.env.E2E_CUENTAS ?? resolve(HERE, 'world/.mundo/cuentas.json')

let ip = 0
/** Una IP propia por contexto: el límite de la API es de 300 peticiones por minuto e IP. */
export const nextIp = (): string => `10.4.${Math.floor(++ip / 250)}.${(ip % 250) + 1}`

export type Sesion = Awaited<ReturnType<typeof sesionDe>>
export type Sesiones = Readonly<Partial<Record<CuentaDePrueba, Sesion>>>

/** La sesión de una cuenta, abierta por la API como lo haría el formulario. */
export async function sesionDe(baseURL: string, email: string, password: string) {
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL, 'x-forwarded-for': nextIp() },
  })
  const res = await api.post('/api/auth/sign-in/email', { data: { email, password } })
  expect(res.ok(), `la sesión de ${email}: ${res.status()}`).toBe(true)
  const estado = await api.storageState()
  await api.dispose()
  return estado
}

/** El mundo de la prueba: `cuentas.json` y los dos ids que da la API. */
export async function mundoDe(baseURL: string): Promise<MundoDePrueba> {
  const c = JSON.parse(readFileSync(CUENTAS, 'utf8')) as {
    day: number
    password: string
    accounts: Record<'jugador' | 'manager' | 'nuevo', { email: string }>
    firstTimeTrialStage: { race: string; stage: number }
  }
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
  })
  const teams = (await (await api.get('/api/teams')).json()) as {
    teams: readonly { id: string; division: string }[]
  }
  const rankings = (await (await api.get('/api/rankings')).json()) as {
    ranking: readonly { riderId: string }[]
  }
  await api.dispose()
  const wt = teams.teams.find((t) => t.division === 'WT')
  const top = rankings.ranking[0]
  if (wt === undefined || top === undefined)
    throw new Error('el mundo no tiene equipo WorldTour o ranking')
  return {
    day: c.day,
    password: c.password,
    accounts: {
      jugador: { email: c.accounts.jugador.email },
      manager: { email: c.accounts.manager.email },
      nuevo: { email: c.accounts.nuevo.email },
      visitante: { email: null },
    },
    firstWorldTourTeamId: wt.id,
    topRankedRiderId: top.riderId,
    firstTimeTrialStage: c.firstTimeTrialStage,
  }
}

/** Las sesiones de las tres cuentas con corredor o sin él; el visitante no tiene. */
export async function sesionesDe(baseURL: string, world: MundoDePrueba): Promise<Sesiones> {
  const abre = (cuenta: 'jugador' | 'manager' | 'nuevo') =>
    sesionDe(baseURL, world.accounts[cuenta].email!, world.password)
  return {
    jugador: await abre('jugador'),
    manager: await abre('manager'),
    nuevo: await abre('nuevo'),
  }
}

/**
 * Espera a que la página acabe de cargar: la red quieta (cinco segundos como mucho: `Watch` y el
 * horizonte sondean), ningún `Loading…` en `main`, la letra cargada y medio segundo para que se asiente.
 */
export async function asienta(page: Page, id: string): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  await page
    .waitForFunction(
      () => {
        const main = document.querySelector('main')
        return main !== null && !/Loading…/.test(main.innerText)
      },
      null,
      { timeout: 30_000, polling: 100 },
    )
    .catch(() => {
      throw new Error(`${id}: la pantalla no acaba de cargar (sigue en «Loading…» a los 30 s)`)
    })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.waitForTimeout(500)
}

/** Las opciones de un contexto de la prueba: el teléfono, la cuenta y lo que pide axe. */
export interface Telefono {
  readonly viewport: { readonly width: number; readonly height: number }
  readonly deviceScaleFactor: number
  readonly isMobile: boolean
  readonly hasTouch: boolean
}

/**
 * Abre una pantalla como la ve su cuenta, en ese teléfono: la intercepción de los estados, la espera, la
 * comprobación de que no baja sola al cargar (Ruso-005), lo que la prepara (7-j) y arriba del todo.
 * Devuelve el contexto, que cierra quien llama.
 */
export async function abrePantalla(
  browser: Browser,
  baseURL: string,
  p: TelefonoPantalla,
  telefono: Telefono,
  world: MundoDePrueba,
  sesiones: Sesiones,
): Promise<{ context: BrowserContext; page: Page }> {
  const sesion = sesiones[p.account]
  const context = await browser.newContext({
    ...telefono,
    baseURL,
    bypassCSP: true,
    locale: 'en-GB',
    timezoneId: 'Europe/Madrid',
    extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
    ...(sesion ? { storageState: sesion } : {}),
  })
  try {
    const page = await context.newPage()
    if (p.intercept) {
      const { url, respond } = p.intercept
      await page.route(url, (route) =>
        respond === 'hang'
          ? undefined
          : route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: '{"ok":false,"error":"interno"}',
            }),
      )
    }
    await page.goto(rutaDe(p, world), { waitUntil: 'domcontentloaded' })
    if (p.waitMs !== undefined) await page.waitForTimeout(p.waitMs)
    else await asienta(page, p.id)
    expect(
      await page.evaluate(() => window.scrollY),
      `${p.id}: la página baja sola al cargar`,
    ).toBe(0)
    if (p.prepare) {
      await p.prepare(page)
      await page.waitForTimeout(500)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    return { context, page }
  } catch (e) {
    await context.close()
    throw e
  }
}
