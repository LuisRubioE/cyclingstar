import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { KIT_MIN_PX } from '@cyclingstar/shared'
import { type BrowserContext, type Page, expect, test } from '@playwright/test'
import {
  MIN_FIELD_FONT_PX,
  MIN_FONT_PX,
  MIN_INLINE_TARGET_PX,
  MIN_TARGET_PX,
} from '../src/components/ui/constants'
import { type Umbrales, medirPagina } from './medidas'
import { type Sesiones, abrePantalla, mundoDe, sesionesDe } from './navega'
import { type MundoDePrueba, TELEFONO_PANTALLAS, type TelefonoPantalla } from './pantallas'
import { COMPROBACIONES, COMPROBACION_DE_LA_BARRA, type Cifras, faltasDeCero } from './faltas'
import {
  ANSWER_MAX_TOP_PX,
  GROUP_BAR_MAX_BOTTOM_PX,
  PHONE_FONT,
  PHONE_MIN,
  PHONE_REF,
  THUMB_ZONE,
  TOOL_PAGE_MAX_PX,
} from './telefono.config'

/**
 * «SE JUEGA BIEN EN UN TELÉFONO», COMO PRUEBA (E3, docs/visual.md §7; PR 2b, D-18). Las diez
 * comprobaciones de §7.1 en `/_ui` y en las 46 pantallas de `pantallas.ts`, a 360 × 800 y a 320 × 640.
 * Cada cifra es un número de faltas, y cada una tiene que ser cero (o `null` donde una comprobación no
 * corre). La 09 tiene además la suya propia a 360, la barra de grupos (§7.3; desde el PR 17a), y el modo
 * oscuro, la comprobación 6 de cada pantalla a 360 (paso 23).
 *
 * Antes de medir, el instrumento se prueba a sí mismo (17-b): la letra con que Chromium pinta el `h1`
 * de `control.html` tiene que ser `PHONE_FONT`, leída por CDP (Ruso-021; 7-k), y `control.html`, que
 * tiene contadas sus faltas, tiene que darlas exactas. Un instrumento que deja de medir no deja la
 * prueba en verde.
 *
 * DESDE EL PASO 24, CERO Y SIN LÍNEA BASE (§7.4 y §17.24). Hasta el cierre de E3, `telefono-baseline.json`
 * guardaba las faltas de cada pantalla y ancho, y un trinquete contra la base del PR, medida en la misma
 * ejecución y sobre el mismo mundo, no dejaba subir ninguna: el mundo de la prueba no sale igual en dos
 * construcciones, y las cifras de otro mundo no se podían comparar. E3 terminó con el fichero a cero, y el
 * paso 24 lo borró. Cero es cero en cualquier mundo: la prueba ya no mide la base, y no compara con nada.
 * Con `TELEFONO_SALIDA`, escribe además lo medido, para el artefacto del CI o para mirarlo en local.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const CONTROL = resolve(HERE, 'control.html')
/** Dónde escribir lo medido; sin él, no se escribe. */
const SALIDA = process.env.TELEFONO_SALIDA ?? null

/** Los dos teléfonos de §7.1. */
const ANCHOS = { '360': PHONE_REF, '320': PHONE_MIN } as const
type Ancho = keyof typeof ANCHOS

/** La clave de la comprobación propia de la 09, junto a las de sus dos anchos (§7.3). */
const BARRA = '360-barra' as const
/** La del modo oscuro (§7.4; 7-n; paso 23): solo la comprobación 6, a 360. */
const OSCURO = '360-dark' as const
type Clave = Ancho | typeof BARRA | typeof OSCURO

/** Las reglas de axe-core de la comprobación 6. */
const REGLAS_AXE = [
  'color-contrast',
  'target-size',
  'select-name',
  'button-name',
  'link-name',
  'label',
  'dlitem',
  'definition-list',
]

/** Las faltas de `control.html`, contadas a mano: una de cada, y dos recortes y dos objetivos. */
const FALTAS_DE_CONTROL: Cifras = [1, 2, 1, 1, 2, 1, 1, 1, 1, 1]

const umbrales = (answer: string | null, tool: boolean): Umbrales => ({
  minFontPx: MIN_FONT_PX,
  minFieldFontPx: MIN_FIELD_FONT_PX,
  minTargetPx: MIN_TARGET_PX,
  minInlineTargetPx: MIN_INLINE_TARGET_PX,
  kitMinPx: KIT_MIN_PX,
  answerMaxTopPx: ANSWER_MAX_TOP_PX,
  toolPageMaxPx: TOOL_PAGE_MAX_PX,
  answer,
  tool,
})

/** La letra con que Chromium pinta el primer `h1`, por CDP: `document.fonts` no ve las del sistema. */
async function letraDelH1(context: BrowserContext, page: Page): Promise<string[]> {
  const cdp = await context.newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' })
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
  await cdp.detach()
  return fonts.map((f) => f.familyName)
}

/** La comprobación 6: los nodos que axe-core da por malos en sus ocho reglas, inyectado como en el mapa 05. */
async function cuentaAxe(page: Page): Promise<number> {
  await page.addScriptTag({ path: AXE })
  return page.evaluate(async (reglas) => {
    interface Axe {
      run(
        ctx: Document,
        opts: object,
      ): Promise<{ violations: readonly { nodes: readonly unknown[] }[] }>
    }
    const axe = (window as unknown as { axe: Axe }).axe
    const r = await axe.run(document, {
      runOnly: { type: 'rule', values: reglas },
      resultTypes: ['violations'],
    })
    return r.violations.reduce((n, v) => n + v.nodes.length, 0)
  }, REGLAS_AXE)
}

/**
 * La comprobación 8: tras la edición, `[data-primary-action]` visible y entera en el 40 % de abajo de la
 * ventana, arriba del todo y al final del desplazamiento. 0 si cumple en las dos posiciones.
 */
async function mideAccion(page: Page, edit: (page: Page) => Promise<void>): Promise<number> {
  await edit(page)
  const enElPulgar = () =>
    page.evaluate((zona) => {
      const el = document.querySelector('[data-primary-action]')
      if (el === null || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        return false
      const r = el.getBoundingClientRect()
      const alto = window.innerHeight
      return r.width > 0 && r.top >= alto * (1 - zona) - 0.5 && r.bottom <= alto + 0.5
    }, THUMB_ZONE)
  await page.evaluate(() => window.scrollTo(0, 0))
  const arriba = await enElPulgar()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const abajo = await enElPulgar()
  return arriba && abajo ? 0 : 1
}

/**
 * La comprobación propia de la 09 (§7.3; Rcobertura-040, 14-g): el borde de abajo de
 * `[data-ui="GroupBar"]`, en el documento como el de la 7, a `GROUP_BAR_MAX_BOTTOM_PX` o menos. 0 o 1
 * como la 7, y 1 si no hay barra.
 */
async function mideBarra(page: Page): Promise<{ cifras: Cifras; bordePx: number | null }> {
  const bordePx = await page.evaluate(() => {
    const el = document.querySelector('[data-ui="GroupBar"]')
    return el === null ? null : el.getBoundingClientRect().bottom + window.scrollY
  })
  return { cifras: [bordePx !== null && bordePx <= GROUP_BAR_MAX_BOTTOM_PX ? 0 : 1], bordePx }
}

/** Las diez de la página abierta, en el orden de §7.1. */
async function diez(
  page: Page,
  answer: string | null,
  tool: boolean,
  edit: ((page: Page) => Promise<void>) | undefined,
) {
  const m = await page.evaluate(medirPagina, umbrales(answer, tool))
  const axe = await cuentaAxe(page)
  const accion = edit ? await mideAccion(page, edit) : null
  const cifras: Cifras = [
    m.reflujo,
    m.recortes,
    m.letra,
    m.campos,
    m.objetivos,
    axe,
    m.respuesta,
    accion,
    m.alto,
    m.maillot,
  ]
  return { cifras, muestras: m.muestras }
}

/**
 * Escribe lo medido en `TELEFONO_SALIDA`, si lo hay. Cada test deja su trozo en la carpeta de resultados,
 * que Playwright vacía al empezar, y vuelve a montar el fichero entero con todos los trozos que hay: un
 * trabajador que Playwright cambia tras un fallo no pierde lo que midió el anterior.
 */
function apunta(outputDir: string, id: string, clave: Clave, cifras: Cifras): void {
  if (SALIDA === null) return
  const trozos = resolve(outputDir, 'linea-base')
  mkdirSync(trozos, { recursive: true })
  writeFileSync(resolve(trozos, `${id}@${clave}.json`), JSON.stringify(cifras))
  // `"320"` y `"360"` son claves de índice, que un objeto pone delante y en orden: `"360-barra"` sale detrás
  const pantallas: Record<string, Partial<Record<Clave, Cifras>>> = {}
  for (const f of readdirSync(trozos).sort()) {
    const [pid, c] = f.replace(/\.json$/, '').split('@') as [string, Clave]
    ;(pantallas[pid] ??= {})[c] = JSON.parse(readFileSync(resolve(trozos, f), 'utf8')) as Cifras
  }
  const orden = TELEFONO_PANTALLAS.map((x) => x.id).filter((x) => pantallas[x] !== undefined)
  const json = JSON.stringify(
    { pantallas: Object.fromEntries(orden.map((x) => [x, pantallas[x]])) },
    null,
    2,
  )
  // Una línea por pantalla y ancho, como en §7.4: los arrays de cifras, cada uno en su renglón.
  const compacto = json.replace(
    /\[\s+([^\]]*?)\s+\]/g,
    (_, xs: string) => `[${xs.replace(/\s+/g, ' ')}]`,
  )
  writeFileSync(SALIDA, `${compacto}\n`)
}

let sesiones: Sesiones = {}
let world: MundoDePrueba

test.beforeAll(async ({ browser }, info) => {
  // EL INSTRUMENTO, ANTES QUE NADA. La letra: si no es DejaVu Sans, lo que parte de línea y lo que se
  // sale cambia, y con ello cinco de las diez comprobaciones (§7.6).
  const context = await browser.newContext({ ...PHONE_REF })
  const page = await context.newPage()
  await page.goto(pathToFileURL(CONTROL).href)
  const letra = await letraDelH1(context, page)
  await context.close()
  expect(
    letra,
    `la letra de la prueba (FONTCONFIG_FILE=${process.env.FONTCONFIG_FILE ?? ''})`,
  ).toEqual([PHONE_FONT])

  const baseURL = info.project.use.baseURL ?? 'http://localhost:3005'
  world = await mundoDe(baseURL)
  sesiones = await sesionesDe(baseURL, world)
})

test('cero: la regla, con cifras de mentira', () => {
  const diez = (x: number | null): Cifras => Array.from({ length: 10 }, () => x)
  const con = (i: number, x: number | null, c: Cifras = diez(0)): Cifras =>
    c.map((v, j) => (j === i ? x : v))
  // Todo a cero, o sin correr: nada que decir.
  expect(faltasDeCero(diez(0))).toEqual([])
  expect(faltasDeCero(diez(null))).toEqual([])
  expect(faltasDeCero(con(7, null))).toEqual([])
  // Una falta, con su nombre y su cifra; dos, las dos.
  expect(faltasDeCero(con(2, 3))).toEqual(['3 · la letra: 3'])
  expect(faltasDeCero(con(9, 1, con(0, 2)))).toEqual(['1 · el reflujo: 2', '10 · el maillot: 1'])
  // Una cifra que falta no pasa por una que no corre.
  expect(faltasDeCero(diez(0).slice(0, 9))).toEqual([
    'la medida trae 9 cifras y las comprobaciones son 10',
  ])
  // La barra de la 09, con su nombre (§7.3).
  expect(faltasDeCero([0], COMPROBACION_DE_LA_BARRA)).toEqual([])
  expect(faltasDeCero([1], COMPROBACION_DE_LA_BARRA)).toEqual(['la barra de grupos: 1'])
})

test('el instrumento: control.html da exactas sus faltas', async ({ browser }) => {
  const context = await browser.newContext({ ...PHONE_REF, bypassCSP: true })
  const page = await context.newPage()
  await page.goto(pathToFileURL(CONTROL).href)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  const { cifras, muestras } = await diez(page, 'Panel', true, async () => {})
  await context.close()
  expect(cifras, JSON.stringify(muestras, null, 2)).toEqual(FALTAS_DE_CONTROL)
})

/** Lo que se mide de una pantalla abierta: las diez y, en la 09 a 360, su barra (§7.3). */
async function mide(page: Page, p: TelefonoPantalla, ancho: Ancho) {
  const { cifras, muestras } = await diez(page, ancho === '360' ? p.answer : null, p.tool, p.edit)
  const barra = p.barra === true && ancho === '360' ? await mideBarra(page) : null
  return { cifras, muestras, barra }
}

for (const p of TELEFONO_PANTALLAS) {
  for (const ancho of Object.keys(ANCHOS) as Ancho[]) {
    test(`${p.id} a ${ancho}`, async ({ browser }, info) => {
      const baseURL = info.project.use.baseURL ?? 'http://localhost:3005'
      const { context, page } = await abrePantalla(
        browser,
        baseURL,
        p,
        ANCHOS[ancho],
        world,
        sesiones,
      )
      const { cifras, muestras, barra } = await mide(page, p, ancho).finally(() => context.close())
      await info.attach('medida.json', {
        body: JSON.stringify({ cifras, muestras, barra }, null, 2),
        contentType: 'application/json',
      })
      const medidas: readonly { clave: Clave; cifras: Cifras; nombres: readonly string[] }[] = [
        { clave: ancho, cifras, nombres: COMPROBACIONES },
        ...(barra === null
          ? []
          : [{ clave: BARRA, cifras: barra.cifras, nombres: COMPROBACION_DE_LA_BARRA }]),
      ]
      for (const { clave, cifras: c, nombres } of medidas) {
        apunta(info.project.outputDir, p.id, clave, c)
        expect(
          faltasDeCero(c, nombres),
          `${p.id} a ${clave} (las faltas de muestra, en el adjunto)`,
        ).toEqual([])
      }
    })
  }
}

/**
 * EL MODO OSCURO (E3, docs/visual.md §3.3 y §7.4; 7-n; paso 23). Solo la comprobación 6, a 360 × 800: el
 * modo redefine colores y nada más, así que las otras nueve no cambian. `/_ui` va con `?theme=dark`, que
 * no escribe la preferencia (5-h); las de visitante, con `cs-theme` en `dark` (lo pinta el guion de
 * `<head>`), y las de sesión, con la cuenta en `dark` y nada en el aparato (lo pinta `ThemeSync`). Antes de
 * medir, la página tiene que estar de verdad en oscuro: un modo que no se pinta no deja la cifra en verde.
 */
const enOscuro = (p: TelefonoPantalla): TelefonoPantalla =>
  p.id === '_ui' ? { ...p, path: '/_ui?theme=dark' } : p

for (const p of TELEFONO_PANTALLAS) {
  test(`${p.id} en oscuro`, async ({ browser }, info) => {
    const baseURL = info.project.use.baseURL ?? 'http://localhost:3005'
    const { context, page } = await abrePantalla(
      browser,
      baseURL,
      enOscuro(p),
      ANCHOS['360'],
      world,
      sesiones,
      { oscuro: p.id !== '_ui' },
    )
    const cifras = await (async (): Promise<Cifras> => {
      // con sesión lo pinta `ThemeSync` al llegar la cuenta: se le da un momento
      await expect
        .poll(() => page.evaluate(() => document.documentElement.dataset.theme), {
          message: `${p.id}: la página no está en oscuro`,
          timeout: 5_000,
        })
        .toBe('dark')
      if (p.id === '_ui')
        expect(
          await page.evaluate(() => localStorage.getItem('cs-theme')),
          '/_ui?theme=dark no escribe la preferencia (5-h)',
        ).toBeNull()
      const axe = await cuentaAxe(page)
      return [null, null, null, null, null, axe, null, null, null, null]
    })().finally(() => context.close())
    await info.attach('medida.json', {
      body: JSON.stringify({ cifras }, null, 2),
      contentType: 'application/json',
    })
    apunta(info.project.outputDir, p.id, OSCURO, cifras)
    expect(faltasDeCero(cifras), `${p.id} en oscuro`).toEqual([])
  })
}
