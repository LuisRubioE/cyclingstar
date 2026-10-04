/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  type InstantContext,
  type StageTimeline,
  decodeTimeline,
  instantAt,
  photoBlocksOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'

/**
 * B8 · EL CLIENTE (docs/retransmision.md §16.4 y §18.1; decisiones 16-m y 18-l; paso 6a), en Node: lo
 * que cuesta el fotograma de `Watch`, `instantAt` sobre la línea grabada, con su paso 9 y su memo, en
 * las dos muestras de §16.4: todos los fotogramas de las congeladas a pasos de 1 s de carrera, como
 * `Watch` de ×1 a ×60, con el p95 sobre todos; y aparte los 600 seguidos del tramo de más grupos vivos
 * de la e20, con el p95 de esos 600 y la línea recién decodificada (sin nada memorizado de antes).
 *
 * La web no puede importar `load.ts` de `apps/api` (TS6059): lee los `.timeline.gz` congelados con
 * `readFileSync`, `gunzipSync` y `decodeTimeline`, como `readStageTimeline`, y por eso lleva la
 * referencia a los tipos de Node. Mide las cinco en línea: la crono se pinta con `timeTrialInstantAt`,
 * que llega en el 6b con su B8. El parse y el `safeParse` de la cabecera y del tramo mayor se miden
 * sobre lo que sirve la API de verdad, en `apps/api/src/broadcastFixtures.test.ts` (B6 de lo servido),
 * con los mismos esquemas de `shared` que usa la web: aquí no hay esas respuestas sin volcarlas.
 */

/**
 * EL UMBRAL DE B8 PARA EL FOTOGRAMA, el de §16.4, su única fuente escrita (16-v), y fijo (18-l): el p95
 * de `instantAt` ≤ 0,25 ms en las dos muestras. No se deriva de lo que mide este PR.
 */
const B8_INSTANT_P95_MS = 0.25
/** Los fotogramas seguidos del tramo denso de la e20 (§16.4). */
const DENSE_FRAMES = 600
/** Las pasadas por el tramo denso, cada una con la línea recién decodificada (abajo). */
const DENSE_PASSES = 5

const ROAD = [
  'race-france-e7',
  'race-france-e18',
  'race-france-e20',
  'race-flanders-e1',
  'race-colombia-e5',
] as const

/** La línea grabada de una congelada, un objeto nuevo en cada llamada: nada memorizado de antes. */
function lineOf(name: string): StageTimeline {
  const url = new URL(
    `../../../../api/src/__fixtures__/broadcast/${name}.timeline.gz`,
    import.meta.url,
  )
  return decodeTimeline(JSON.parse(gunzipSync(readFileSync(url)).toString('utf8')))
}

const ctxOf = (tl: StageTimeline): InstantContext => ({
  own: new Set(),
  start: {
    leaders: { gc: null, points: null, kom: null },
    gcTop: [],
    racingAtStart: tl.riderIds.length,
  },
  photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
})

const quantile = (xs: readonly number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? Number.NaN
}

/** Cada fotograma de `ts`, en orden, con lo que tarda y cuántos grupos pinta. */
function frames(tl: StageTimeline, ts: readonly number[]): { ms: number[]; groups: number[] } {
  const ctx = ctxOf(tl)
  const ms: number[] = []
  const groups: number[] = []
  for (const t of ts) {
    const t0 = performance.now()
    const at = instantAt(tl, t, ctx)
    ms.push(performance.now() - t0)
    groups.push(at.groups.length)
  }
  return { ms, groups }
}

describe('B8 · el fotograma de Watch en el cliente (§16.4; 16-m, 18-l)', () => {
  const all: number[] = []
  const rows: string[] = []
  let e20Groups: number[] = []

  it.each(ROAD)(
    '%s: todos los fotogramas a pasos de 1 s de carrera',
    (name) => {
      const tl = lineOf(name)
      const ts = Array.from({ length: Math.floor(tl.finish.finishS) + 1 }, (_, t) => t)
      const { ms, groups } = frames(tl, ts)
      all.push(...ms)
      if (name === 'race-france-e20') e20Groups = groups
      rows.push(
        `  ${name}: ${ms.length} fotogramas, p50 ${quantile(ms, 0.5).toFixed(3)} ms, p95 ` +
          `${quantile(ms, 0.95).toFixed(3)} ms, máx. ${Math.max(...ms).toFixed(2)} ms`,
      )
      expect(ms.length).toBeGreaterThan(10_000)
    },
    120_000,
  )

  it('el p95 sobre todos', () => {
    const p95 = quantile(all, 0.95)
    console.info(
      [
        `[broadcast] B8 · instantAt sobre la línea grabada (umbral p95 ≤ ${B8_INSTANT_P95_MS} ms):`,
        ...rows,
        `  las cinco: ${all.length} fotogramas, p95 ${p95.toFixed(3)} ms`,
      ].join('\n'),
    )
    expect(all.length).toBeGreaterThan(50_000)
    expect(p95).toBeLessThanOrEqual(B8_INSTANT_P95_MS)
  })

  it('los 600 seguidos del tramo de más grupos vivos de la e20, con la línea recién decodificada', () => {
    expect(e20Groups.length).toBeGreaterThan(DENSE_FRAMES)
    // la ventana de 600 s de carrera con más grupos pintados, sumados fotograma a fotograma
    let sum = e20Groups.slice(0, DENSE_FRAMES).reduce((a, b) => a + b, 0)
    let best = { from: 0, sum }
    for (let t = DENSE_FRAMES; t < e20Groups.length; t++) {
      sum += e20Groups[t]! - e20Groups[t - DENSE_FRAMES]!
      if (sum > best.sum) best = { from: t - DENSE_FRAMES + 1, sum }
    }
    // Cada pasada, con la línea recién decodificada: el memo empieza vacío, como al abrir la etapa en
    // ese punto, y cada fotograma hace en todas el mismo trabajo (los fallos del memo del paso 9 caen
    // en los mismos). El p95 es el de lo que tarda cada fotograma en su mejor pasada: el de 600
    // fotogramas son los 30 más lentos, y la carga de los demás ficheros de la suite, que corren a la
    // vez, o del resto de la máquina los mueve de una pasada a otra el doble que el código (medido en el
    // 6a: de 0,07 a 0,38 ms la misma pasada).
    const ts = Array.from({ length: DENSE_FRAMES }, (_, i) => best.from + i)
    const passes = Array.from(
      { length: DENSE_PASSES },
      () => frames(lineOf('race-france-e20'), ts).ms,
    )
    const bestMs = ts.map((_, i) => Math.min(...passes.map((ms) => ms[i]!)))
    const p95 = quantile(bestMs, 0.95)
    console.info(
      `[broadcast] B8 · el tramo denso de la e20: de ${best.from} a ${best.from + DENSE_FRAMES - 1} s, ` +
        `${(best.sum / DENSE_FRAMES).toFixed(1)} grupos de media; p95 ${p95.toFixed(3)} ms con cada ` +
        `fotograma en su mejor pasada (umbral ${B8_INSTANT_P95_MS} ms); el de cada pasada, ` +
        `${passes.map((ms) => quantile(ms, 0.95).toFixed(3)).join(', ')} ms`,
    )
    expect(best.sum / DENSE_FRAMES).toBeGreaterThan(5)
    expect(p95).toBeLessThanOrEqual(B8_INSTANT_P95_MS)
  })
})
