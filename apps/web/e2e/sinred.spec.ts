import {
  type Browser,
  type BrowserContext,
  type Page,
  expect,
  request,
  test,
} from '@playwright/test'
import { type Sesion, asienta, mundoDe, nextIp, sesionDe } from './navega'
import type { MundoDePrueba } from './pantallas'
import { PHONE_REF } from './telefono.config'

/**
 * SIN RED (E3, docs/visual.md §12.1 y §16.2; PR 4, D-47). Los casos de §12.1 en Chromium, sobre el mundo
 * de la prueba del teléfono, salvo el de recargar sin red, que sin service worker da la página de error
 * del navegador y no tiene arreglo (D-00p):
 *
 * - un enlace a una página cuyo trozo no se cargó pinta su `ErrorState` en su sitio, con la cabecera, y
 *   `Try again` recarga al volver la red, o espera ocupado a que vuelva (captura 48); volver luego a esa
 *   página sigue siendo `network`, porque el navegador recuerda el fallo hasta recargar; y con red, un
 *   trozo que ya no existe (tras un despliegue) pide recargar;
 * - una página vista lleva `OfflineBanner` con la hora de lo que enseña, y `Back online` al volver
 *   (captura 50);
 * - un trozo cargado con sus datos sin pedir pinta `OfflineState` y se rehace solo al volver (captura 51);
 * - la sesión que no llega (`get-session` cortado) da la página y la cabecera del jugador, nunca `/login`;
 * - y una mutación en pausa sigue en la `ActionBar`: la barra nace en el 9a, pero la primera página que
 *   guarda con ella es la del plan, en el 14 (`/_ui` no llama a la API).
 *
 * Corre en el trabajo `Teléfono` de `ci.yml`. Cada caso abre su contexto: ninguno depende de otro.
 */

let world: MundoDePrueba
let sesion: Sesion
/** Dos corredores del ranking: el segundo es una ficha cuyo trozo ya está cargado y sus datos no. */
let riders: readonly [Corredor, Corredor]

interface Corredor {
  readonly riderId: string
  readonly name: string
}

test.beforeAll(async ({ baseURL }) => {
  world = await mundoDe(baseURL!)
  sesion = await sesionDe(baseURL!, world.accounts.jugador.email!, world.password)
  const api = await request.newContext({
    baseURL: baseURL!,
    extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
  })
  const ranking = (await (await api.get('/api/rankings')).json()) as {
    ranking: readonly Corredor[]
  }
  await api.dispose()
  const [a, b] = ranking.ranking
  if (a === undefined || b === undefined) throw new Error('el ranking del mundo tiene menos de dos')
  riders = [a, b]
})

/** Un teléfono con la sesión del jugador (o sin ella), como lo abriría quien juega. */
async function telefono(
  browser: Browser,
  baseURL: string,
  conSesion = true,
): Promise<BrowserContext> {
  return browser.newContext({
    ...PHONE_REF,
    baseURL,
    locale: 'en-GB',
    timezoneId: 'Europe/Madrid',
    extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
    ...(conSesion ? { storageState: sesion } : {}),
  })
}

/**
 * Navega dentro de la web, como un enlace: el router oye `popstate` y pinta la ruta nueva sin pedir la
 * página al servidor. Así no importa qué enlaces enseña la cabecera a este ancho.
 */
async function navega(page: Page, path: string): Promise<void> {
  await page.evaluate((to) => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

/** Un instante en el reloj del teléfono, como lo escribe la franja: `14:02`. */
const horaDe = (page: Page, ms: number) =>
  page.evaluate(
    (t) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    ms,
  )

const cabecera = (page: Page) => page.locator('header').first()
const errorState = (page: Page) => page.locator('main [data-ui="ErrorState"]')
const franja = (page: Page) => page.locator('[data-ui="OfflineBanner"]')

/** La página de noticias, cargada de verdad: sus filtros, que solo pinta su trozo. */
const noticias = (page: Page) => page.locator('main #news-team')

/** Pulsa y espera a que la página se recargue: `Try again` y `Reload` recargan (`RouteBoundary`). */
async function recarga(page: Page, pulsa: () => Promise<void>): Promise<void> {
  const cargada = page.waitForEvent('load')
  await pulsa()
  await cargada
  await asienta(page, 'sinred')
}

test('un trozo sin cargar y sin red avisa en su sitio, con la cabecera, y Try again recarga al volver la red', async ({
  browser,
  baseURL,
}) => {
  const context = await telefono(browser, baseURL!)
  try {
    const page = await context.newPage()
    await page.goto('/world/rankings', { waitUntil: 'domcontentloaded' })
    await asienta(page, 'sinred')
    await context.setOffline(true)
    await navega(page, '/news')
    await expect(errorState(page)).toBeVisible()
    await expect(errorState(page)).toHaveAttribute('data-kind', 'network')
    await expect(errorState(page)).toContainText('This page needs a connection the first time.')
    await expect(cabecera(page)).toBeVisible()
    // la barrera raíz no: la web sigue entera
    await expect(page.getByText('Something went wrong')).toHaveCount(0)
    await context.setOffline(false)
    await recarga(page, () => errorState(page).getByRole('button', { name: 'Try again' }).click())
    await expect(noticias(page)).toBeVisible()
    await expect(errorState(page)).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('Try again sin red espera ocupado, y al volver la red recarga sola', async ({
  browser,
  baseURL,
}) => {
  const context = await telefono(browser, baseURL!)
  try {
    const page = await context.newPage()
    await page.goto('/world/rankings', { waitUntil: 'domcontentloaded' })
    await asienta(page, 'sinred')
    await context.setOffline(true)
    await navega(page, '/news')
    const boton = errorState(page).getByRole('button', { name: 'Try again' })
    await boton.click()
    // recargar sin red daría la página de error del navegador (D-00p): espera, ocupado
    const ocupado = errorState(page).getByRole('button', { name: 'Trying again…' })
    await expect(ocupado).toHaveAttribute('aria-busy', 'true')
    await expect(ocupado).toBeEnabled()
    await recarga(page, () => context.setOffline(false))
    await expect(noticias(page)).toBeVisible()
  } finally {
    await context.close()
  }
})

test('volver, ya con red, a una página cuyo trozo falló sin red sigue diciendo network, y Try again la carga', async ({
  browser,
  baseURL,
}) => {
  const context = await telefono(browser, baseURL!)
  try {
    const page = await context.newPage()
    await page.goto('/world/rankings', { waitUntil: 'domcontentloaded' })
    await asienta(page, 'sinred')
    await context.setOffline(true)
    await navega(page, '/news')
    await expect(errorState(page)).toHaveAttribute('data-kind', 'network')
    await navega(page, '/world/rankings')
    await expect(errorState(page)).toHaveCount(0)
    await context.setOffline(false)
    // el navegador recuerda el fallo hasta recargar: no es una versión vieja, es la red de antes
    await navega(page, '/news')
    await expect(errorState(page)).toHaveAttribute('data-kind', 'network')
    await recarga(page, () => errorState(page).getByRole('button', { name: 'Try again' }).click())
    await expect(noticias(page)).toBeVisible()
  } finally {
    await context.close()
  }
})

test('con red, un trozo que ya no existe (tras un despliegue) pide recargar, y Reload carga la página', async ({
  browser,
  baseURL,
}) => {
  const context = await telefono(browser, baseURL!)
  try {
    const page = await context.newPage()
    // el trozo de la página de noticias, como si el despliegue nuevo hubiera cambiado su huella
    await page.route(/\/assets\/News-[^/]+\.js$/, (route) => route.fulfill({ status: 404 }))
    await page.goto('/world/rankings', { waitUntil: 'domcontentloaded' })
    await asienta(page, 'sinred')
    await navega(page, '/news')
    await expect(errorState(page)).toBeVisible()
    await expect(errorState(page)).toHaveAttribute('data-kind', 'outdated')
    await expect(errorState(page)).toContainText('This version is out of date')
    await expect(cabecera(page)).toBeVisible()
    await page.unroute(/\/assets\/News-[^/]+\.js$/)
    await recarga(page, () => errorState(page).getByRole('button', { name: 'Reload' }).click())
    await expect(noticias(page)).toBeVisible()
    await expect(errorState(page)).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('una página vista, sin red, dice desde cuándo es lo que enseña, y Back online al volver', async ({
  browser,
  baseURL,
}) => {
  const context = await telefono(browser, baseURL!)
  try {
    const page = await context.newPage()
    // El reloj del teléfono, fijo (los temporizadores siguen): la clasificación se ve a una hora y las
    // noticias 28 minutos después, para que la hora de la franja diga de cuál es lo que se enseña.
    const vista = Date.parse('2026-10-25T13:02:00Z')
    await page.clock.setFixedTime(vista)
    await page.goto('/world/rankings', { waitUntil: 'domcontentloaded' })
    await asienta(page, 'sinred')
    await page.clock.setFixedTime(vista + 28 * 60_000)
    await navega(page, '/news')
    await asienta(page, 'sinred')
    await context.setOffline(true)
    await expect(franja(page)).toHaveText(
      `You're offline. Showing what you saw at ${await horaDe(page, vista + 28 * 60_000)}.`,
    )
    // volver a una página visitada: sale de la caché de React Query, con la hora de lo que enseña
    await navega(page, '/world/rankings')
    await expect(franja(page)).toHaveAttribute('data-state', 'offline')
    await expect(franja(page)).toHaveText(
      `You're offline. Showing what you saw at ${await horaDe(page, vista)}.`,
    )
    await expect(page.locator('main [data-ui="OfflineState"]')).toHaveCount(0)
    await expect(errorState(page)).toHaveCount(0)
    await context.setOffline(false)
    await expect(franja(page)).toHaveAttribute('data-state', 'ready')
    await expect(franja(page)).toHaveText('Back online')
    await expect(franja(page)).toHaveCount(0, { timeout: 5000 })
  } finally {
    await context.close()
  }
})

test('un trozo cargado con sus datos sin pedir, sin red, pinta OfflineState y se rehace al volver', async ({
  browser,
  baseURL,
}) => {
  const context = await telefono(browser, baseURL!)
  try {
    const page = await context.newPage()
    await page.goto(`/world/riders/${riders[0].riderId}`, { waitUntil: 'domcontentloaded' })
    await asienta(page, 'sinred')
    await context.setOffline(true)
    // la misma página con otro corredor: su trozo está, sus datos no
    await navega(page, `/world/riders/${riders[1].riderId}`)
    const offline = page.locator('main [data-ui="OfflineState"]')
    await expect(offline).toBeVisible()
    await expect(offline).toHaveText("You're offline. This loads when you reconnect.")
    await expect(errorState(page)).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText(riders[1].name)
    await context.setOffline(false)
    await expect(offline).toHaveCount(0)
    await asienta(page, 'sinred')
    // la ficha del segundo, que se ha pedido sola al volver la red
    await expect(page.locator('main')).toContainText(riders[1].name)
    await expect(errorState(page)).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('la sesión que no llega da la página y la cabecera del jugador, nunca /login', async ({
  browser,
  baseURL,
}) => {
  const context = await telefono(browser, baseURL!)
  try {
    const page = await context.newPage()
    // la primera carga, con la sesión: deja la marca `cs:signed-in`
    await page.goto('/me/training', { waitUntil: 'domcontentloaded' })
    await asienta(page, 'sinred')
    expect(await page.evaluate(() => localStorage.getItem('cs:signed-in'))).toBe('1')
    // la siguiente, con la página y sus datos pero sin la respuesta de la sesión
    await page.route('**/api/auth/get-session*', (route) => route.abort('internetdisconnected'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await asienta(page, 'sinred')
    expect(new URL(page.url()).pathname).toBe('/me/training')
    await expect(cabecera(page).getByRole('link', { name: 'Account' })).toBeVisible()
    await expect(cabecera(page).getByRole('link', { name: 'Log in' })).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('cs:signed-in'))).toBe('1')
  } finally {
    await context.close()
  }
})

test('y la sesión que dice que no hay sesión sí lleva a /login y quita la marca', async ({
  browser,
  baseURL,
}) => {
  const context = await telefono(browser, baseURL!)
  try {
    const page = await context.newPage()
    await page.goto('/me/training', { waitUntil: 'domcontentloaded' })
    await asienta(page, 'sinred')
    await page.route('**/api/auth/get-session*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }),
    )
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForURL('**/login')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cs:signed-in'))).toBeNull()
  } finally {
    await context.close()
  }
})

test.fixme('una mutación en pausa sigue en la ActionBar (nace en el 14, con el plan)', async () => {
  // `You're offline. Your changes stay here until you reconnect.` (§12.1): la `ActionBar` guarda en
  // memoria la mutación que React Query deja en pausa sin red y la manda al volver. La barra es del 9a;
  // la primera página que guarda con ella, la del plan, del 14.
})
