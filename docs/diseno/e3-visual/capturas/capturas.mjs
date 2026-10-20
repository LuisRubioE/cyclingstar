#!/usr/bin/env node
/* global process, console, window, document, URL */
/**
 * E3, mapa 05: LAS CAPTURAS Y SUS MEDIDAS, contra el servidor de `servir.mjs`.
 *
 * Para cada pantalla de la lista (`SHOTS`), dos contextos nuevos de Chromium (Playwright 1.56, el
 * instalado en /opt/pw-browsers; nunca `playwright install`):
 *   - 360 × 800, `deviceScaleFactor` 2, `isMobile` y táctil (las `-360.png`, de 720 px de ancho);
 *   - 1.280 × 800, relación 1 (las `-1280.png`).
 * Se espera a que `main` deje de decir «Loading…» (y 5 s de `networkidle` como mucho), se hacen los
 * gestos de la pantalla (desplegar los 28 días, darle a `Play`), se vuelve arriba del todo y se
 * captura la página entera: la barra inferior fija del teléfono sale en la franja de la primera
 * pantalla (de 743 a 800 px de página), como la ve quien abre la página. En cada una, las medidas de
 * `medir.mjs` y los fallos de axe-core (WCAG 2.0 a 2.2, A y AA), con los de contraste por pareja de
 * colores. El contexto lleva `bypassCSP` para poder inyectar axe-core.
 *
 * Cada contexto sale con su propia IP en `x-forwarded-for` (la API confía en el proxy, app.ts l. 159):
 * el límite global es de 300 peticiones por minuto e IP (security.ts l. 10) y una carga de página son
 * unas 35. La sesión de cada cuenta se abre una vez, por la API (better-auth), y se reutiliza.
 *
 * Uso (con `servir.mjs` escuchando):
 *   node <este-fichero> --base http://localhost:3005 --cuentas <carpeta>/cuentas.json \
 *     --out <carpeta-de-capturas> --axe <ruta>/axe.min.js [--solo <regex>] [--sin-axe]
 * Escribe los PNG sin reducir en --out y las medidas en <out>/medidas.json (con --solo, sustituye las
 * de esas pantallas y conserva las demás).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { measurePage } from './medir.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const BASE = arg('--base', 'http://localhost:3005')
const CUENTAS = JSON.parse(readFileSync(resolve(arg('--cuentas', 'cuentas.json')), 'utf8'))
const OUT = resolve(arg('--out', 'capturas'))
const AXE = resolve(arg('--axe', 'axe.min.js'))
const SOLO = arg('--solo', null)
const SIN_AXE = process.argv.includes('--sin-axe')
const PW = arg('--playwright', '/opt/node22/lib/node_modules/playwright/index.mjs')
const { chromium, request } = await import(pathToFileURL(PW).href)

const VIEWPORTS = {
  360: {
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
}

let ipCounter = 0
const nextIp = () => {
  ipCounter += 1
  return `10.5.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`
}

/** La sesión de una cuenta (sus cookies), abierta por la API como lo haría el formulario. */
async function sessionOf(email) {
  const api = await request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { origin: BASE, 'x-forwarded-for': nextIp() },
  })
  const res = await api.post('/api/auth/sign-in/email', {
    data: { email, password: CUENTAS.password },
  })
  if (!res.ok()) throw new Error(`sign-in ${email}: ${res.status()} ${await res.text()}`)
  const state = await api.storageState()
  await api.dispose()
  return state
}

/** Lo que la API dice del mundo, para elegir carreras, equipos y corredores reales. */
async function discover(sessions) {
  const api = await request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
  })
  const get = async (path, state) => {
    const ctx = state
      ? await request.newContext({
          baseURL: BASE,
          storageState: state,
          extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
        })
      : api
    const res = await ctx.get(path)
    const body = res.ok() ? await res.json() : null
    if (state) await ctx.dispose()
    return body
  }
  const out = {
    calendar: await get('/api/calendar'),
    rankings: await get('/api/rankings'),
    teams: await get('/api/teams'),
    me: await get('/api/riders/me', sessions.jugador),
    managerControl: await get('/api/me/team-control', sessions.manager),
  }
  await api.dispose()
  return out
}

function pick(world) {
  const ranking = world.rankings?.ranking ?? []
  const teams = world.teams?.teams ?? []
  const wt = teams.find((t) => t.division === 'WT') ?? teams[0] ?? null
  return {
    topRider: ranking[0]?.riderId ?? null,
    wtTeamId: wt?.id ?? null,
    managerTeamId: world.managerControl?.control?.team?.id ?? null,
  }
}

/** Espera a que no quede ningún «Loading…» en la página (o se rinde a los `ms`). */
async function settle(page, ms = 15000) {
  try {
    // Corto a propósito: la petición del horizonte de un visitante (401) no llega a «terminar» para
    // Playwright y la página nunca queda en networkidle.
    await page.waitForLoadState('networkidle', { timeout: 5000 })
  } catch {
    /* una página con sondeo no llega a networkidle: sigue */
  }
  try {
    await page.waitForFunction(
      () => !/Loading…/.test(document.querySelector('main')?.innerText ?? ''),
      null,
      { timeout: ms },
    )
  } catch {
    /* se queda cargando: se captura así y se dice */
  }
  await page.waitForTimeout(400)
}

async function axeOf(page) {
  if (SIN_AXE) return null
  await page.addScriptTag({ path: AXE })
  return page.evaluate(async () => {
    const all = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      resultTypes: ['violations'],
    })
    const contrast = all.violations.find((v) => v.id === 'color-contrast')
    const pairs = {}
    for (const n of contrast?.nodes ?? []) {
      const d = n.any?.[0]?.data ?? {}
      const key = `${d.fgColor} sobre ${d.bgColor}`
      const p = (pairs[key] ??= {
        fg: d.fgColor,
        bg: d.bgColor,
        ratio: d.contrastRatio,
        expected: d.expectedContrastRatio,
        fontSize: d.fontSize,
        nodes: 0,
        sample: (n.target ?? []).join(' ').slice(0, 90),
      })
      p.nodes += 1
    }
    return {
      rules: Object.fromEntries(all.violations.map((v) => [v.id, v.nodes.length])),
      contrastNodes: contrast?.nodes.length ?? 0,
      contrastPairs: Object.values(pairs).sort((a, b) => a.ratio - b.ratio),
    }
  })
}

async function shoot(browser, shot, width, sessions) {
  const context = await browser.newContext({
    ...VIEWPORTS[width],
    bypassCSP: true,
    locale: 'en-GB',
    timezoneId: 'Europe/Madrid',
    extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
    ...(shot.who ? { storageState: sessions[shot.who] } : {}),
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`.slice(0, 200)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`.slice(0, 200))
  })
  const failed = []
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`)
  })
  if (shot.route) await shot.route(page)
  const t0 = Date.now()
  await page.goto(`${BASE}${shot.path}`, { waitUntil: 'domcontentloaded' })
  if (shot.early) {
    await page.waitForTimeout(shot.early)
  } else {
    await settle(page)
  }
  if (shot.prep) await shot.prep(page, context)
  const loadMs = Date.now() - t0
  // Arriba del todo: la barra inferior fija sale en la página entera en la franja de la primera
  // pantalla (de 743 a 800 px en el teléfono), tapando lo que haya ahí, como la ve quien abre la página.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  const measures = await page.evaluate(measurePage)
  const name = `${shot.id}-${shot.name}-${width}.png`
  await page.screenshot({ path: resolve(OUT, name), fullPage: true, animations: 'disabled' })
  const axe = shot.noAxe
    ? null
    : await axeOf(page).catch((e) => ({ error: String(e).slice(0, 200) }))
  await context.close()
  return {
    file: name,
    url: shot.path,
    who: shot.who ?? 'visitante',
    loadMs,
    errors,
    failed,
    ...measures,
    axe,
  }
}

// ----------------------------------------------------------------------------- la lista

const sessions = {
  jugador: await sessionOf(CUENTAS.accounts.jugador.email),
  manager: await sessionOf(CUENTAS.accounts.manager.email),
  nuevo: await sessionOf(CUENTAS.accounts.nuevo.email),
}
const world = await discover(sessions)
const ids = pick(world)
writeFileSync(
  resolve(OUT, 'mundo-descubierto.json'),
  `${JSON.stringify({ ids, world }, null, 2)}\n`,
)

const STAGE_RACE = arg('--vuelta', 'race-valencia')
const STAGE_DAY = arg('--etapa', '3')
const RACING = arg('--en-curso', 'race-emirates')
const click = (label) => async (page) => {
  await page.getByRole('button', { name: label }).first().click()
  await page.waitForTimeout(600)
}
const hold = (pattern) => async (page) => {
  await page.route(pattern, () => {
    /* sin respuesta: la página se queda esperando */
  })
}
const fail = (pattern) => async (page) => {
  await page.route(pattern, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"ok":false,"error":"interno"}',
    }),
  )
}

const SHOTS = [
  {
    id: '01',
    name: 'me-training',
    path: '/me/training',
    who: 'jugador',
    prep: click(/Show the 28 days/),
  },
  { id: '02', name: 'me-races', path: '/me/races', who: 'jugador' },
  { id: '03', name: 'me-races-enter', path: '/me/races?tab=enter', who: 'jugador' },
  { id: '04', name: 'me-profile', path: '/me/profile', who: 'jugador' },
  { id: '05', name: 'race-vuelta', path: `/world/races/${STAGE_RACE}` },
  {
    id: '06',
    name: 'race-vuelta-teams',
    path: `/world/races/${STAGE_RACE}?tab=classifications&cls=teams`,
  },
  { id: '07', name: 'race-en-curso', path: `/world/races/${RACING}` },
  { id: '08', name: 'stage-watch', path: `/world/races/${STAGE_RACE}/stages/${STAGE_DAY}` },
  {
    id: '09',
    name: 'stage-watch-jugando',
    path: `/world/races/${STAGE_RACE}/stages/${STAGE_DAY}`,
    prep: async (page) => {
      await page.getByRole('button', { name: 'Play', exact: true }).first().click()
      await page.waitForTimeout(8000)
    },
    noAxe: true,
  },
  { id: '10', name: 'stage-report', path: `/world/races/${STAGE_RACE}/stages/${STAGE_DAY}/report` },
  { id: '11', name: 'world-rankings', path: '/world/rankings' },
  { id: '12', name: 'world-team', path: `/world/teams/${ids.wtTeamId}` },
  { id: '13', name: 'world-rider', path: `/world/riders/${ids.topRider}` },
  { id: '14', name: 'team-squad', path: '/team/squad', who: 'manager' },
  { id: '15', name: 'team-calendar', path: '/team/calendar', who: 'manager' },
  { id: '16', name: 'team-identity', path: '/team/identity', who: 'manager' },
  { id: '17', name: 'home-jugador', path: '/', who: 'jugador' },
  { id: '18', name: 'home-visitante', path: '/' },
  { id: '19', name: 'news', path: '/news' },
  { id: '20', name: 'world-races', path: '/world/races' },
  { id: '21', name: 'world-teams', path: '/world/teams' },
  { id: '22', name: 'world-nations', path: '/world/nations' },
  { id: '23', name: 'world-nation', path: '/world/nations/ES' },
  { id: '24', name: 'hall-of-fame', path: '/world/hall-of-fame' },
  { id: '25', name: 'me-orders', path: '/me/orders', who: 'jugador' },
  { id: '26', name: 'me-contract', path: '/me/contract', who: 'jugador' },
  { id: '27', name: 'me-finances', path: '/me/finances', who: 'jugador' },
  { id: '28', name: 'account', path: '/account', who: 'jugador' },
  { id: '29', name: 'me-training-manager', path: '/me/training', who: 'manager' },
  { id: '30', name: 'home-manager', path: '/', who: 'manager' },
  { id: '31', name: 'login', path: '/login' },
  { id: '32', name: 'register', path: '/register' },
  { id: '33', name: 'how-to-play', path: '/how-to-play' },
  { id: '34', name: 'create', path: '/create', who: 'nuevo' },
  { id: '35', name: 'race-un-dia', path: '/world/races/race-jaen' },
  {
    id: '36',
    name: 'stage-classifications',
    path: `/world/races/${STAGE_RACE}/stages/${STAGE_DAY}?tab=classifications`,
  },
  { id: '37', name: 'me-races-results', path: '/me/races?tab=results', who: 'jugador' },
  // Los estados
  {
    id: '40',
    name: 'cargando',
    path: '/me/training',
    who: 'jugador',
    route: hold('**/api/riders/me/orders**'),
    early: 3000,
  },
  {
    id: '41',
    name: 'error',
    path: '/me/training',
    who: 'jugador',
    route: fail('**/api/riders/me/orders**'),
  },
  { id: '42', name: 'error-todo', path: '/world/rankings', route: fail('**/api/**') },
  { id: '43', name: 'vacio-team-squad', path: '/team/squad', who: 'jugador' },
  { id: '44', name: 'vacio-home-sin-corredor', path: '/', who: 'nuevo' },
  { id: '45', name: 'vacio-training-sin-corredor', path: '/me/training', who: 'nuevo' },
  { id: '46', name: 'no-encontrada', path: '/ruta-que-no-existe' },
  {
    id: '47',
    name: 'corredor-inexistente',
    path: '/world/riders/00000000-0000-4000-8000-000000000000',
  },
]

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const results = []
for (const shot of SHOTS) {
  if (SOLO && !new RegExp(SOLO).test(`${shot.id}-${shot.name}`)) continue
  for (const width of [360, 1280]) {
    try {
      const r = await shoot(browser, shot, width, sessions)
      results.push(r)
      console.log(
        `${r.file}: ${r.loadMs} ms · ancho ${r.scrollWidth}/${r.innerWidth} · letra ${r.font.min} (main ${r.fontMain.min}) px · <44: ${r.targets.under44}/${r.targets.total} (main ${r.targetsMain.under44}/${r.targetsMain.total}) · contraste ${r.axe?.contrastNodes ?? '-'}${r.errors.length ? ` · errores ${r.errors.length}` : ''}`,
      )
    } catch (e) {
      console.log(`${shot.id}-${shot.name}-${width}: FALLO ${String(e).slice(0, 300)}`)
      results.push({
        file: `${shot.id}-${shot.name}-${width}.png`,
        url: shot.path,
        error: String(e).slice(0, 300),
      })
    }
  }
}
await browser.close()
// Con --solo, las medidas nuevas sustituyen a las de los mismos ficheros en `medidas.json`.
const file = resolve(OUT, 'medidas.json')
let previous = []
if (SOLO && existsSync(file)) previous = JSON.parse(readFileSync(file, 'utf8')).results
const fresh = new Set(results.map((r) => r.file))
const merged = [...previous.filter((r) => !fresh.has(r.file)), ...results].sort((a, b) =>
  a.file.localeCompare(b.file),
)
writeFileSync(
  file,
  `${JSON.stringify({ base: BASE, at: new Date().toISOString(), results: merged }, null, 2)}\n`,
)
console.log(`medidas en ${file}`)
