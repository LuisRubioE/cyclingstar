import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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
import {
  COMPROBACIONES,
  COMPROBACION_DE_LA_BARRA,
  type Cifras,
  faltasDelTrinquete,
} from './trinquete'
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
 * Cada cifra es un número de faltas; `telefono-baseline.json` guarda las de cada pantalla y ancho, y E3
 * está terminado cuando está a cero (o a `null` donde una comprobación no corre). La 09 tiene además la
 * suya propia a 360, la barra de grupos (§7.3; desde el PR 17a), que el fichero guarda aparte, en su
 * clave `"360-barra"`, y que el trinquete mira con las mismas reglas.
 *
 * Antes de medir, el instrumento se prueba a sí mismo (17-b): la letra con que Chromium pinta el `h1`
 * de `control.html` tiene que ser `PHONE_FONT`, leída por CDP (Ruso-021; 7-k), y `control.html`, que
 * tiene contadas sus faltas, tiene que darlas exactas. Un instrumento que deja de medir no deja el
 * trinquete en verde.
 *
 * EL TRINQUETE SE MIDE CONTRA LA BASE, SOBRE EL MISMO MUNDO. El mundo de la prueba no sale igual en dos
 * construcciones del mismo código (dos dieron cifras distintas en 14 de los 92 pares de pantalla y
 * ancho; medido el mismo mundo dos veces, 0), y el CI lo reconstruye cada vez que cambia su clave o
 * caduca su caché, y en cada push a `main`, que no ve la caché de los PR. Así que el CI no compara con
 * las cifras del fichero, que se midieron sobre otro mundo: mide en la misma ejecución la web de la base
 * del PR y la del PR, sobre el mismo mundo, y falla si una cifra sube. El fichero es el libro de lo que
 * baja: si una cifra baja en la medida, el PR tiene que bajarla también en el fichero, y si no baja, no
 * puede bajarla (7-h, generalizada; detallado en `docs/diseno/e3-visual/implementacion.md`).
 *
 * Los modos, por `TELEFONO_LINEA_BASE`:
 *
 * - `compara` (sin él): cada cifra, igual a la del fichero. Es para el que mide en su mundo, el mismo
 *   sobre el que escribió el fichero.
 * - `escribe`: mide y escribe lo medido en `TELEFONO_SALIDA` (por defecto, el fichero del repositorio).
 * - `trinquete`, el del CI: ninguna cifra sube sobre la de `TELEFONO_REFERENCIA` (la web de la base,
 *   medida sobre el mismo mundo) y el fichero se mueve como la medida respecto al de la base
 *   (`TELEFONO_LIBRO_BASE`); escribe lo medido en `TELEFONO_SALIDA`. Con `TELEFONO_INSTRUMENTO=cambia`,
 *   el PR toca el instrumento (las comprobaciones o las pantallas) y puede reescribir el fichero entero.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const CONTROL = resolve(HERE, 'control.html')
const LINEA_BASE = resolve(HERE, 'telefono-baseline.json')
const MODO = process.env.TELEFONO_LINEA_BASE ?? 'compara'
const SALIDA = process.env.TELEFONO_SALIDA ?? LINEA_BASE
const REFERENCIA = process.env.TELEFONO_REFERENCIA ?? null
const LIBRO_BASE = process.env.TELEFONO_LIBRO_BASE ?? null
const INSTRUMENTO_CAMBIA = process.env.TELEFONO_INSTRUMENTO === 'cambia'

if (!['compara', 'escribe', 'trinquete'].includes(MODO))
  throw new Error(`TELEFONO_LINEA_BASE: «${MODO}» no es un modo (compara, escribe o trinquete)`)
if (MODO === 'trinquete' && REFERENCIA === null)
  throw new Error('TELEFONO_LINEA_BASE=trinquete pide TELEFONO_REFERENCIA')

/** Los dos teléfonos de §7.1. */
const ANCHOS = { '360': PHONE_REF, '320': PHONE_MIN } as const
type Ancho = keyof typeof ANCHOS

/** La clave de la comprobación propia de la 09 en el fichero, junto a las de sus dos anchos (§7.3). */
const BARRA = '360-barra' as const
type Clave = Ancho | typeof BARRA

interface LineaBase {
  readonly pantallas: Readonly<Record<string, Partial<Record<Clave, Cifras>>>>
}

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

const leeLineaBase = (fichero: string | null): LineaBase | null =>
  fichero !== null && existsSync(fichero)
    ? (JSON.parse(readFileSync(fichero, 'utf8')) as LineaBase)
    : null

const lineaBase = leeLineaBase(LINEA_BASE) ?? { pantallas: {} }
const referencia = leeLineaBase(REFERENCIA)
const libroBase = leeLineaBase(LIBRO_BASE)

/** `compara`: lo medido, igual al fichero. */
function diferencias(
  medidas: Cifras,
  esperadas: Cifras | undefined,
  nombres: readonly string[],
): string[] {
  if (esperadas === undefined) return ['no está en telefono-baseline.json']
  return nombres.flatMap((nombre, i) => {
    const m = medidas[i] ?? null
    const e = esperadas[i] ?? null
    if (m === e) return []
    if (m === null || e === null) return [`${nombre}: ${e} en el fichero, ${m} medido`]
    return [`${nombre}: ${m > e ? 'sube' : 'baja'} de ${e} a ${m}`]
  })
}

/**
 * Escribe lo medido. Cada test deja su trozo en la carpeta de resultados, que Playwright vacía al
 * empezar, y vuelve a montar el fichero entero con todos los trozos que hay: un trabajador que Playwright
 * cambia tras un fallo no pierde lo que midió el anterior.
 */
function apunta(outputDir: string, id: string, clave: Clave, cifras: Cifras): void {
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

test('el trinquete: sus reglas, con cifras de mentira', () => {
  const sin = { instrumentoCambia: false }
  const diez = (x: number | null): Cifras => Array.from({ length: 10 }, () => x)
  const con = (i: number, x: number | null, c: Cifras = diez(5)): Cifras =>
    c.map((v, j) => (j === i ? x : v))
  // Nada cambia: nada que decir.
  expect(faltasDelTrinquete(diez(5), diez(5), diez(7), diez(7), sin)).toEqual([])
  // Una sube sobre la base, aunque el fichero diga otra cosa.
  expect(faltasDelTrinquete(con(2, 6), diez(5), diez(7), diez(7), sin)).toEqual([
    '3 · la letra: sube de 5 a 6 sobre la base',
  ])
  // Una baja: el fichero tiene que bajarla también, a lo que sea, aunque se midiera en otro mundo.
  expect(faltasDelTrinquete(con(4, 3), diez(5), con(4, 6, diez(7)), diez(7), sin)).toEqual([])
  expect(faltasDelTrinquete(con(4, 3), diez(5), diez(7), diez(7), sin)).toEqual([
    '5 · los objetivos: baja de 5 a 3 y el fichero no lo apunta (7 en la base, 7 en el PR)',
  ])
  // No se apunta una bajada que no se mide.
  expect(faltasDelTrinquete(diez(5), diez(5), con(0, 6, diez(7)), diez(7), sin)).toEqual([
    '1 · el reflujo: el fichero cambia de 7 a 6 y la medida no (5)',
  ])
  // Una pantalla gana su edición: de null a un número, con el número en el fichero (§7.4, regla 3).
  const sinEdicion = con(7, null)
  expect(
    faltasDelTrinquete(con(7, 1), sinEdicion, con(7, 1, diez(7)), con(7, null, diez(7)), sin),
  ).toEqual([])
  expect(
    faltasDelTrinquete(con(7, 1), sinEdicion, con(7, null, diez(7)), con(7, null, diez(7)), sin),
  ).toEqual(['8 · la acción: la medida pasa de null a 1 y el fichero dice null'])
  // Sin medida de la base, nada que comparar; sin la pantalla en el fichero, falta.
  expect(faltasDelTrinquete(diez(9), undefined, diez(7), diez(7), sin)).toEqual([])
  expect(faltasDelTrinquete(diez(5), diez(5), undefined, diez(7), sin)).toEqual([
    'no está en telefono-baseline.json',
  ])
  // El PR que crea el fichero, o el que cambia el instrumento, lo reescribe; pero nunca sube.
  expect(faltasDelTrinquete(con(1, 3), diez(5), diez(2), undefined, sin)).toEqual([])
  expect(
    faltasDelTrinquete(con(1, 3), diez(5), diez(2), diez(7), { instrumentoCambia: true }),
  ).toEqual([])
  expect(faltasDelTrinquete(con(1, 6), diez(5), diez(2), undefined, sin)).toEqual([
    '2 · los recortes: sube de 5 a 6 sobre la base',
  ])
  // La barra de la 09, con su nombre y las mismas reglas (§7.3).
  const barra = { ...sin, nombres: COMPROBACION_DE_LA_BARRA }
  expect(faltasDelTrinquete([1], [0], [0], [0], barra)).toEqual([
    'la barra de grupos: sube de 0 a 1 sobre la base',
  ])
  expect(faltasDelTrinquete([0], [1], [1], [1], barra)).toEqual([
    'la barra de grupos: baja de 1 a 0 y el fichero no lo apunta (1 en la base, 1 en el PR)',
  ])
  expect(faltasDelTrinquete([0], [1], [0], undefined, barra)).toEqual([])
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
        if (MODO !== 'compara') apunta(info.project.outputDir, p.id, clave, c)
        const fichero = lineaBase.pantallas[p.id]?.[clave]
        if (MODO === 'compara')
          expect(diferencias(c, fichero, nombres), `${p.id} a ${clave}, contra el fichero`).toEqual(
            [],
          )
        if (MODO === 'trinquete')
          expect(
            faltasDelTrinquete(
              c,
              referencia?.pantallas[p.id]?.[clave],
              fichero,
              libroBase?.pantallas[p.id]?.[clave],
              { instrumentoCambia: INSTRUMENTO_CAMBIA, nombres },
            ),
            `${p.id} a ${clave}, contra la base (las faltas de muestra, en el adjunto)`,
          ).toEqual([])
      }
    })
  }
}
