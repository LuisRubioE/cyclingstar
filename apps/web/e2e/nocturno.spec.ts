import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { KIT_MIN_PX } from '@cyclingstar/shared'
import { type Browser, type BrowserContext, type Page, expect, test } from '@playwright/test'
import {
  MIN_FIELD_FONT_PX,
  MIN_FONT_PX,
  MIN_INLINE_TARGET_PX,
  MIN_TARGET_PX,
} from '../src/components/ui/constants'
import { medirPagina } from './medidas'
import { type Sesion, type Telefono, abrePantalla, mundoDe, nextIp, sesionesDe } from './navega'
import { TELEFONO_PANTALLAS } from './pantallas'
import { ANSWER_MAX_TOP_PX, PHONE_REF, TOOL_PAGE_MAX_PX } from './telefono.config'

/**
 * LO QUE CORRE CADA NOCHE (E3, docs/visual.md §7.5 y §16.5; PR 2a, y las pasadas 3 y 4 desde el 2b). Cuatro pasadas sobre el mundo de
 * `world/build.mjs`, que informan y no paran ningún PR (D-19, D-50): el rendimiento con la red y la CPU
 * de un teléfono, `Watch` con los umbrales de E2, la letra al doble y de lado. Corre en el trabajo
 * `Teléfono de noche` de `cobertura.yml`, con `playwright test --project=nocturno`.
 *
 * Es una simulación en Chromium sin cabeza, no la medida de un teléfono: la red y la CPU de los perfiles
 * de Chrome DevTools por CDP (Slow 4G, 562,5 ms y 1,44 Mbit/s de bajada; Fast 4G, 165 ms y 8,1 Mbit/s;
 * la CPU a ×4), a 360 × 800 con relación 2, y la mediana de cinco cargas. Es el método de
 * `docs/diseno/e3-visual/capturas/pintura.mjs`, que midió lo de hoy (mapa 05 §12).
 *
 * Un umbral que la web de hoy todavía no cumple va como `test.fixme`, con la cifra de hoy en el nombre
 * (§17.1, regla 1): lo quita el PR que lo arregla. Las cifras de cada noche van adjuntas al informe
 * (`nocturno.json`), cumplan o no.
 */

/** Los perfiles de red de Chrome DevTools, en bytes por segundo y milisegundos. */
const PERFILES = {
  'Slow 4G': { latency: 562.5, downloadThroughput: 180_000, uploadThroughput: 84_375 },
  'Fast 4G': { latency: 165, downloadThroughput: 1_012_500, uploadThroughput: 450_000 },
} as const
type Perfil = keyof typeof PERFILES

const MOVIL = {
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
}
/** La CPU de un teléfono de gama media frente a la del ejecutor. */
const CPU = 4
/** La mediana de cinco cargas (§7.5). */
const CARGAS = 5
/** La etapa en línea de `Watch` del mapa 05 (las pantallas 08 y 09). */
const ETAPA = '/world/races/race-valencia/stages/3'

/** Los umbrales de §7.5 (D-50) y los de E2 para `Watch` (`docs/retransmision.md` §18.5). */
const UMBRAL = {
  primeraPinturaFrioMs: 3000,
  listaFrioMs: 5000,
  listaCalienteMs: 2000,
  listaCalientePlanMs: 3000,
  watchPrimeraPinturaMs: 2000,
  watchFps: 30,
  tareaLargaMs: 50,
} as const

interface Pagina {
  readonly nombre: string
  readonly ruta: string
  readonly jugador: boolean
  readonly plan?: true
  /**
   * La lista en frío de hoy con Slow 4G, si no cumple siempre el umbral: la mediana de cinco con DejaVu
   * Sans en las pasadas del contenedor de diseño (el mapa 05 §12, con Inter, dio 5,70 y 5,22). Pasa a ser
   * un test de verdad cuando el PR que la baja quita el `fixme`: el del plan, el PR 6, que la dejó de
   * 4,85 a 4,89 (antes, de 5,04 a 5,19).
   */
  readonly hoyListaFrio?: string
}

/** Las cuatro páginas del mapa 05 §12. */
const PAGINAS: readonly Pagina[] = [
  { nombre: 'la portada del jugador', ruta: '/', jugador: true, hoyListaFrio: 'de 4,59 a 5,35' },
  { nombre: 'la portada del visitante', ruta: '/', jugador: false },
  { nombre: 'el plan', ruta: '/me/training', jugador: true, plan: true },
  { nombre: 'Watch', ruta: ETAPA, jugador: false },
]

const mediana = (xs: readonly (number | null)[]): number | null => {
  const s = xs.filter((x): x is number => x !== null).sort((a, b) => a - b)
  return s.length === 0 ? null : s[Math.floor(s.length / 2)]!
}

async function emula(context: BrowserContext, page: Page, perfil: Perfil) {
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...PERFILES[perfil] })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
}

/**
 * Una página está lista cuando su `[data-answer]` está en `data-state="ready"` y nada de `main` sigue en
 * `loading` (§7.5); hasta que la página lleve su `data-answer`, cuando `main` ya no dice `Loading…` ni
 * tiene un `QueryView` cargando (PR 10).
 */
async function esperaLista(page: Page) {
  await page.waitForFunction(
    () => {
      const main = document.querySelector('main')
      if (main === null) return false
      const answer = document.querySelector('[data-answer]')
      if (answer !== null)
        return (
          answer.getAttribute('data-state') === 'ready' &&
          main.querySelector('[data-state="loading"]') === null
        )
      return (
        !/Loading…/.test(main.innerText) &&
        main.querySelector('[data-ui="QueryView"][data-state="loading"]') === null &&
        main.innerText.trim().length > 40
      )
    },
    null,
    { timeout: 120_000, polling: 50 },
  )
  return page.evaluate(() => performance.now())
}

const primeraPintura = (page: Page) =>
  page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null)

interface Medida {
  readonly pagina: string
  readonly perfil: Perfil
  readonly primeraPinturaFrioMs: number | null
  readonly listaFrioMs: number | null
  readonly listaCalienteMs: number | null
}

/** Cinco cargas en frío (un contexto nuevo cada una) y cinco en caliente (la segunda en el mismo). */
async function mide(
  browser: Browser,
  baseURL: string,
  p: Pagina,
  perfil: Perfil,
  estado: Sesion | null,
): Promise<Medida> {
  const frio: { pintura: number | null; lista: number }[] = []
  const caliente: number[] = []
  for (let i = 0; i < CARGAS; i++) {
    const context = await browser.newContext({
      ...MOVIL,
      baseURL,
      ...(estado ? { storageState: estado } : {}),
      extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
    })
    const page = await context.newPage()
    await emula(context, page, perfil)
    await page.goto(p.ruta, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    const lista = await esperaLista(page)
    frio.push({ pintura: await primeraPintura(page), lista })
    // En caliente: la misma página otra vez, con la caché de la primera.
    await page.goto(p.ruta, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    caliente.push(await esperaLista(page))
    await context.close()
  }
  return {
    pagina: p.nombre,
    perfil,
    primeraPinturaFrioMs: mediana(frio.map((f) => f.pintura)),
    listaFrioMs: mediana(frio.map((f) => f.lista)),
    listaCalienteMs: mediana(caliente),
  }
}

interface Reproduccion {
  readonly velocidad: 1 | 4
  readonly fps: number
  readonly tareasLargas: number
  readonly tareaMasLargaMs: number
  /** Los km que avanzó la carrera mientras se medía: sin ellos, se habría medido una página quieta. */
  readonly kmRecorridos: number | null
}

/** Los km que le quedan a la carrera, de la capa fija (`158.0 km to go`, pantalla). */
const kmQueQuedan = (page: Page) =>
  page.evaluate(() => {
    const m = /([\d.]+) km to go/.exec(document.querySelector('main')?.textContent ?? '')
    return m ? Number.parseFloat(m[1]!) : null
  })

/** `Watch` reproduciendo diez segundos a esa velocidad, con la CPU a ×4: fotogramas y tareas largas. */
async function reproduce(
  browser: Browser,
  baseURL: string,
  velocidad: 1 | 4,
): Promise<Reproduccion> {
  const context = await browser.newContext({
    ...MOVIL,
    baseURL,
    extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
  })
  const page = await context.newPage()
  await emula(context, page, 'Fast 4G')
  await page.goto(ETAPA, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await esperaLista(page)
  await page.getByRole('button', { name: 'Play', exact: true }).first().click()
  if (velocidad !== 1) {
    // El botón de la velocidad pasa a la siguiente en cada toque (`Speed ×1, change to ×2`, pantalla).
    for (let i = 0; i < 6; i++) {
      const boton = page.locator('button[aria-label^="Speed ×"]:visible').first()
      if (((await boton.getAttribute('aria-label')) ?? '').startsWith(`Speed ×${velocidad},`)) break
      await boton.click()
    }
  }
  const antes = await kmQueQuedan(page)
  const r = await page.evaluate(async (ms: number) => {
    let fotogramas = 0
    let tareas = 0
    let masLarga = 0
    const obs = new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        tareas += 1
        masLarga = Math.max(masLarga, e.duration)
      }
    })
    obs.observe({ type: 'longtask' })
    const t0 = performance.now()
    await new Promise<void>((ok) => {
      const f = () => {
        fotogramas += 1
        if (performance.now() - t0 < ms) requestAnimationFrame(f)
        else ok()
      }
      requestAnimationFrame(f)
    })
    obs.disconnect()
    return {
      fps: fotogramas / ((performance.now() - t0) / 1000),
      tareasLargas: tareas,
      tareaMasLargaMs: masLarga,
    }
  }, 10_000)
  const despues = await kmQueQuedan(page)
  await context.close()
  const kmRecorridos = antes === null || despues === null ? null : antes - despues
  return { velocidad, ...r, kmRecorridos }
}

/** El teléfono de lado (H-16): el de referencia, girado. */
const DE_LADO: Telefono = {
  ...PHONE_REF,
  viewport: { width: PHONE_REF.viewport.height, height: PHONE_REF.viewport.width },
}

/** Las comprobaciones 1 y 2 de una pantalla, o lo que impidió medirla. */
type Pasada = Readonly<Record<string, { reflujo: number; recortes: number } | { error: string }>>

/**
 * Las pasadas 3 y 4 (§16.5): las 46 pantallas con la letra raíz al 200 % (H-17; WCAG 1.4.4 y la escala
 * de letra de Android), a 360 × 800, y de lado, a 800 × 360 (H-16), con las comprobaciones 1 y 2 de la
 * prueba del teléfono. Una pantalla que no se puede abrir se apunta y no para la pasada.
 */
async function pasada(
  browser: Browser,
  baseURL: string,
  telefono: Telefono,
  alDoble: boolean,
): Promise<Pasada> {
  const world = await mundoDe(baseURL)
  const sesiones = await sesionesDe(baseURL, world)
  const out: Record<string, { reflujo: number; recortes: number } | { error: string }> = {}
  for (const p of TELEFONO_PANTALLAS) {
    try {
      const { context, page } = await abrePantalla(browser, baseURL, p, telefono, world, sesiones)
      try {
        if (alDoble) {
          await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%'
          })
          await page.waitForTimeout(300)
          await page.evaluate(() => window.scrollTo(0, 0))
        }
        const m = await page.evaluate(medirPagina, {
          minFontPx: MIN_FONT_PX,
          minFieldFontPx: MIN_FIELD_FONT_PX,
          minTargetPx: MIN_TARGET_PX,
          minInlineTargetPx: MIN_INLINE_TARGET_PX,
          kitMinPx: KIT_MIN_PX,
          answerMaxTopPx: ANSWER_MAX_TOP_PX,
          toolPageMaxPx: TOOL_PAGE_MAX_PX,
          answer: null,
          tool: false,
        })
        out[p.id] = { reflujo: m.reflujo, recortes: m.recortes }
      } finally {
        await context.close()
      }
    } catch (e) {
      out[p.id] = { error: String(e).slice(0, 300) }
    }
  }
  return out
}

/** Cuántas pantallas fallan una comprobación de una pasada, y cuántas faltas suman. */
const resumen = (p: Pasada, clave: 'reflujo' | 'recortes') => {
  const vals = Object.values(p).map((x) => ('error' in x ? null : x[clave]))
  return {
    pantallas: vals.filter((v) => v !== null && v > 0).length,
    faltas: vals.reduce<number>((n, v) => n + (v ?? 0), 0),
    sinMedir: vals.filter((v) => v === null).length,
  }
}

/** Lo que mide una noche: lo que va al informe y lo que leen los umbrales. */
interface Cifras {
  readonly umbrales: typeof UMBRAL
  readonly medidas: readonly Medida[]
  readonly watchPrimeraPinturaMs: number | null
  readonly reproducciones: readonly Reproduccion[]
  readonly alDoble: Pasada
  readonly deLado: Pasada
}

test.describe('cada noche (§16.5)', () => {
  // UNA MEDIDA POR NOCHE Y UN TEST POR UMBRAL. Los umbrales no van en serie, porque uno roto no puede dejar
  // sin mirar a los demás. Pero cuando un test falla, Playwright cambia de trabajador y vuelve a correr el
  // `beforeAll`: para no medir otra vez (unos tres minutos), las cifras se guardan en la carpeta de
  // resultados, que Playwright vacía al empezar cada pasada, y el trabajador nuevo las lee de ahí.
  let cifras: Cifras

  test.beforeAll(async ({ browser }, info) => {
    const fichero = resolve(info.project.outputDir, 'nocturno.json')
    if (existsSync(fichero)) {
      cifras = JSON.parse(readFileSync(fichero, 'utf8')) as Cifras
      return
    }
    info.setTimeout(30 * 60_000)
    const baseURL = info.project.use.baseURL ?? 'http://localhost:3005'
    const estado = (await sesionesDe(baseURL, await mundoDe(baseURL))).jugador ?? null
    const medidas: Medida[] = []
    for (const p of PAGINAS)
      medidas.push(await mide(browser, baseURL, p, 'Slow 4G', p.jugador ? estado : null))
    const watch = await mide(browser, baseURL, PAGINAS[3]!, 'Fast 4G', null)
    const reproducciones: Reproduccion[] = []
    for (const v of [1, 4] as const) reproducciones.push(await reproduce(browser, baseURL, v))
    const alDoble = await pasada(browser, baseURL, PHONE_REF, true)
    const deLado = await pasada(browser, baseURL, DE_LADO, false)
    cifras = {
      umbrales: UMBRAL,
      medidas,
      watchPrimeraPinturaMs: watch.primeraPinturaFrioMs,
      reproducciones,
      alDoble,
      deLado,
    }
    mkdirSync(info.project.outputDir, { recursive: true })
    writeFileSync(fichero, JSON.stringify(cifras, null, 2))
  })

  test('las cifras de la noche, adjuntas', async () => {
    await test.info().attach('nocturno.json', {
      body: JSON.stringify(cifras, null, 2),
      contentType: 'application/json',
    })
    expect(cifras.medidas).toHaveLength(PAGINAS.length)
  })

  // 1. El rendimiento (§7.5). La primera pintura en frío iba de 3,09 a 3,18 s con DejaVu Sans (de 3,13 a
  //    3,28 con Inter, mapa 05 §12): las banderas eran el 91 % de la hoja que la bloquea. Con su sprite
  //    (PR 6), de 2,89 a 2,93 en el contenedor de diseño, en dos pasadas.
  for (const p of PAGINAS) {
    const de = (m: readonly Medida[]) => m.find((x) => x.pagina === p.nombre)!
    test(`${p.nombre}: primera pintura en frío ≤ 3,0 s`, () => {
      expect(de(cifras.medidas).primeraPinturaFrioMs).toBeLessThanOrEqual(
        UMBRAL.primeraPinturaFrioMs,
      )
    })
    const lista = p.hoyListaFrio === undefined ? test : test.fixme
    lista(
      `${p.nombre}: lista en frío ≤ 5,0 s${p.hoyListaFrio === undefined ? '' : ` (hoy ${p.hoyListaFrio})`}`,
      () => {
        expect(de(cifras.medidas).listaFrioMs).toBeLessThanOrEqual(UMBRAL.listaFrioMs)
      },
    )
    test(`${p.nombre}: lista en caliente ≤ ${p.plan ? '3,0' : '2,0'} s`, () => {
      expect(de(cifras.medidas).listaCalienteMs).toBeLessThanOrEqual(
        p.plan ? UMBRAL.listaCalientePlanMs : UMBRAL.listaCalienteMs,
      )
    })
  }

  // 2. `Watch`, con los umbrales de E2 (`docs/retransmision.md` §18.5; Rcobertura-037).
  test('Watch: primera pintura ≤ 2 s con Fast 4G y CPU ×4', () => {
    expect(cifras.watchPrimeraPinturaMs).toBeLessThanOrEqual(UMBRAL.watchPrimeraPinturaMs)
  })
  for (const v of [1, 4] as const) {
    // El instrumento se prueba a sí mismo: una reproducción que no avanza mide una página quieta, que
    // siempre da 60 fotogramas y ninguna tarea larga.
    test(`Watch a ×${v}: la carrera avanza mientras se mide`, () => {
      expect(cifras.reproducciones.find((r) => r.velocidad === v)!.kmRecorridos).toBeGreaterThan(0)
    })
    test(`Watch a ×${v}: 30 fotogramas por segundo o más`, () => {
      expect(cifras.reproducciones.find((r) => r.velocidad === v)!.fps).toBeGreaterThanOrEqual(
        UMBRAL.watchFps,
      )
    })
    test(`Watch a ×${v}: ninguna tarea de más de 50 ms durante la reproducción`, () => {
      expect(
        cifras.reproducciones.find((r) => r.velocidad === v)!.tareaMasLargaMs,
      ).toBeLessThanOrEqual(UMBRAL.tareaLargaMs)
    })
  }

  // 3 y 4. La letra al doble (H-17) y de lado (H-16), en las 46 pantallas con las comprobaciones 1 y 2 de
  //        la prueba del teléfono (`/_ui` se suma con el PR 9a, que lo crea).
  test('la letra al doble y de lado: se abren las 46', () => {
    expect(resumen(cifras.alDoble, 'reflujo').sinMedir).toBe(0)
    expect(resumen(cifras.deLado, 'reflujo').sinMedir).toBe(0)
  })
  test.fixme('la letra al doble: ningún reflujo en las 46 (hoy, en 26)', () => {
    expect(resumen(cifras.alDoble, 'reflujo')).toEqual({ pantallas: 0, faltas: 0, sinMedir: 0 })
  })
  test.fixme('la letra al doble: ningún recorte en las 46 (hoy 724, en las 46)', () => {
    expect(resumen(cifras.alDoble, 'recortes')).toEqual({ pantallas: 0, faltas: 0, sinMedir: 0 })
  })
  test('de lado: ningún reflujo en las 46', () => {
    expect(resumen(cifras.deLado, 'reflujo')).toEqual({ pantallas: 0, faltas: 0, sinMedir: 0 })
  })
})
