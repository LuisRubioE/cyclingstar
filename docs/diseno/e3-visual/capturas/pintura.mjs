#!/usr/bin/env node
/* global process, console, window, document, performance, PerformanceObserver, PopStateEvent, URL */
/**
 * E3, mapa 05: LA PRIMERA PINTURA EN UN TELÉFONO SIMULADO Y LO QUE PASA SIN RED, contra `servir.mjs`.
 *
 * Pintura: 360 × 800, relación 2, táctil, caché vacía (un contexto nuevo por medida), la CPU a ×4
 * (`Emulation.setCPUThrottlingRate`) y la red de los perfiles de Chrome DevTools por
 * `Network.emulateNetworkConditions`: «Slow 4G» (562,5 ms, 1,44 Mbit/s de bajada, 675 kbit/s de
 * subida) y «Fast 4G» (165 ms, 8,1 Mbit/s y 3,6 Mbit/s), los dos que usó el paso 10b de E2
 * (docs/diseno/e2-retransmision/implementacion.md l. 1145 y 1159). Por página y perfil, tres medidas y
 * su mediana: la primera pintura con contenido (FCP), la mayor (LCP) y su elemento, el momento en que
 * `main` ya no dice «Loading…» (lista), las peticiones y los bytes por la red (`encodedDataLength`),
 * con su reparto por tipo. ES UNA SIMULACIÓN EN CHROMIUM SIN CABEZA, NO UNA MEDIDA DE UN TELÉFONO.
 *
 * Sin red, con la sesión del jugador (`context.setOffline`), a 360 y a 1.280 px:
 *   (a) en `/me/races`, un enlace a `/news`, cuyo trozo de JavaScript no se ha cargado (48-…);
 *   (b) volver a `/me/profile`, ya visitada con red (50-…);
 *   (c) ir a la ficha de otro corredor: el trozo es el de `/me/profile`, los datos no se han pedido (51-…);
 *   (d) recargar (49-…).
 *
 * Uso: node <este-fichero> --base http://localhost:3005 --cuentas <carpeta>/cuentas.json \
 *        --out <carpeta-de-capturas> [--reps 3] [--solo-pintura | --solo-red] [--corredor <id>]
 * Escribe <out>/pintura.json y los PNG de 48 a 51.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const BASE = arg('--base', 'http://localhost:3005')
const CUENTAS = JSON.parse(readFileSync(resolve(arg('--cuentas', 'cuentas.json')), 'utf8'))
const OUT = resolve(arg('--out', 'capturas'))
const REPS = Number(arg('--reps', '3'))
const PW = arg('--playwright', '/opt/node22/lib/node_modules/playwright/index.mjs')
const STAGE = arg('--etapa-url', '/world/races/race-valencia/stages/3')
const { chromium, request } = await import(pathToFileURL(PW).href)

const MOBILE = {
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
}
const PROFILES = {
  'Slow 4G': { latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 },
  'Fast 4G': { latency: 165, downloadThroughput: 1012500, uploadThroughput: 450000 },
}
let ip = 0
const nextIp = () => `10.7.${Math.floor(++ip / 250)}.${(ip % 250) + 1}`

async function sessionOf(email) {
  const api = await request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { origin: BASE, 'x-forwarded-for': nextIp() },
  })
  const res = await api.post('/api/auth/sign-in/email', {
    data: { email, password: CUENTAS.password },
  })
  if (!res.ok()) throw new Error(`sign-in ${email}: ${res.status()}`)
  const state = await api.storageState()
  await api.dispose()
  return state
}

const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b)
  return s.length === 0 ? null : s[Math.floor(s.length / 2)]
}

async function paintOnce(browser, path, state, profile) {
  const context = await browser.newContext({
    ...MOBILE,
    ...(state ? { storageState: state } : {}),
    extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.__lcp = null
    window.__lcpElement = null
    new PerformanceObserver((list) => {
      const e = list.getEntries()
      const last = e[e.length - 1]
      window.__lcp = last.startTime
      window.__lcpElement = last.element
        ? `${last.element.tagName.toLowerCase()}: ${(last.element.textContent ?? '').trim().slice(0, 60)}`
        : null
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  })
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...PROFILES[profile] })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  let bytes = 0
  let requests = 0
  let lastFinish = Date.now()
  const kindOf = new Map()
  const byType = {}
  cdp.on('Network.responseReceived', (e) => {
    const path = new URL(e.response.url).pathname
    const kind =
      path.startsWith('/api/') || path === '/health' ? 'api' : (path.split('.').pop() ?? '')
    kindOf.set(
      e.requestId,
      path.startsWith('/assets/') || path.startsWith('/api/') || path === '/health' ? kind : 'html',
    )
  })
  cdp.on('Network.loadingFinished', (e) => {
    bytes += e.encodedDataLength
    requests += 1
    lastFinish = Date.now()
    const kind = kindOf.get(e.requestId) ?? 'otro'
    byType[kind] = (byType[kind] ?? 0) + e.encodedDataLength
  })
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForFunction(
    () => {
      const main = document.querySelector('main')
      return main !== null && !/Loading…/.test(main.innerText) && main.innerText.trim().length > 40
    },
    null,
    { timeout: 120000, polling: 50 },
  )
  const ready = await page.evaluate(() => performance.now())
  // Sin `networkidle`: la petición del horizonte de un visitante no llega a terminar para Playwright.
  // Se espera a que pasen 3 s sin ninguna descarga terminada, con un tope de 40 s.
  const quietSince = Date.now()
  while (Date.now() - lastFinish < 3000 && Date.now() - quietSince < 40000) {
    await page.waitForTimeout(250)
  }
  const paints = await page.evaluate(() => ({
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
    lcp: window.__lcp,
    lcpElement: window.__lcpElement,
  }))
  await context.close()
  return { ...paints, ready, bytes, requests, byType }
}

async function paints(browser, sessions) {
  const pages = [
    { name: 'portada del jugador', path: '/', who: 'jugador' },
    { name: 'portada del visitante', path: '/', who: null },
    { name: 'plan de entrenamiento', path: '/me/training', who: 'jugador' },
    { name: 'etapa (Watch, visitante)', path: STAGE, who: null },
  ]
  const rows = []
  for (const p of pages) {
    for (const profile of Object.keys(PROFILES)) {
      const runs = []
      for (let i = 0; i < REPS; i++)
        runs.push(await paintOnce(browser, p.path, p.who ? sessions[p.who] : null, profile))
      const row = {
        page: p.name,
        path: p.path,
        profile,
        fcp: median(runs.map((r) => r.fcp)),
        lcp: median(runs.map((r) => r.lcp)),
        ready: median(runs.map((r) => r.ready)),
        bytes: median(runs.map((r) => r.bytes)),
        requests: median(runs.map((r) => r.requests)),
        byType: runs[0].byType,
        lcpElement: runs[0].lcpElement,
        runs,
      }
      rows.push(row)
      console.log(
        `${p.name} · ${profile}: FCP ${Math.round(row.fcp)} ms · LCP ${Math.round(row.lcp)} ms · lista ${Math.round(row.ready)} ms · ${row.requests} peticiones · ${Math.round(row.bytes / 1024)} KB`,
      )
    }
  }
  return rows
}

async function offline(browser, sessions, riderId) {
  const out = []
  const text = (page) =>
    page
      .evaluate(() => (document.querySelector('main') ?? document.body).innerText.slice(0, 300))
      .catch(() => '')
  // Navegación de cliente sin tocar la red: la misma que hace un enlace de React Router.
  const go = (page, path) =>
    page.evaluate((p) => {
      window.history.pushState({}, '', p)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, path)
  for (const [width, opts] of [
    [360, MOBILE],
    [1280, { viewport: { width: 1280, height: 800 } }],
  ]) {
    const make = async () => {
      const context = await browser.newContext({
        ...opts,
        storageState: sessions.jugador,
        extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
      })
      return { context, page: await context.newPage() }
    }
    const r = { width }
    // (a) Un enlace a una página cuyo trozo de JavaScript no se ha cargado todavía.
    {
      const { context, page } = await make()
      await page.goto(`${BASE}/me/races`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(4000)
      await context.setOffline(true)
      await page.locator('a[href="/news"]:visible').first().click()
      await page.waitForTimeout(6000)
      r.unloadedChunk = await text(page)
      await page.screenshot({
        path: resolve(OUT, `48-sin-red-navegar-${width}.png`),
        fullPage: true,
      })
      await context.close()
    }
    // (b) Una página ya visitada (su trozo y sus datos, en memoria) y (c) una de trozo cargado y datos
    // sin pedir (la ficha de otro corredor: el mismo trozo que /me/profile).
    {
      const { context, page } = await make()
      await page.goto(`${BASE}/me/races`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(4000)
      await go(page, '/me/profile')
      await page.waitForTimeout(4000)
      await go(page, '/me/races')
      await page.waitForTimeout(1500)
      await context.setOffline(true)
      await go(page, '/me/profile')
      await page.waitForTimeout(4000)
      r.visited = await text(page)
      await page.screenshot({ path: resolve(OUT, `50-sin-red-visitada-${width}.png`) })
      await go(page, `/world/riders/${riderId}`)
      await page.waitForTimeout(8000)
      r.uncachedData = await text(page)
      await page.screenshot({ path: resolve(OUT, `51-sin-red-sin-datos-${width}.png`) })
      // (d) Recargar sin red.
      try {
        await page.reload({ timeout: 15000 })
      } catch (e) {
        r.reload = String(e).split('\n')[0].slice(0, 160)
      }
      await page.waitForTimeout(1500)
      r.reloadUrl = page.url()
      await page.screenshot({ path: resolve(OUT, `49-sin-red-recargar-${width}.png`) })
      await context.close()
    }
    out.push(r)
    console.log(JSON.stringify(r))
  }
  return out
}

const sessions = { jugador: await sessionOf(CUENTAS.accounts.jugador.email) }
const browser = await chromium.launch()
// Con --solo-pintura o --solo-red, lo que no se repite se conserva del `pintura.json` que ya hubiera.
const file = resolve(OUT, 'pintura.json')
const before = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
const result = { ...before, base: BASE, at: new Date().toISOString(), profiles: PROFILES, cpu: 4 }
const save = () => writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`)
if (!process.argv.includes('--solo-red')) {
  result.paints = await paints(browser, sessions)
  save()
}
if (!process.argv.includes('--solo-pintura')) {
  result.offline = await offline(browser, sessions, arg('--corredor', CUENTAS.summary?.manager?.id))
  save()
}
await browser.close()
