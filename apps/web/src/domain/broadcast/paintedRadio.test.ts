/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  BROADCAST,
  type BroadcastChunk,
  type BroadcastHead,
  type Ds,
  type StageTimeline,
  chunkOf,
  cutTimeline,
  decodeTimeline,
  fromDs,
  photoAt,
  photoBlocksOf,
  radioFromTimeline,
  startStateOf,
  visibilityOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  chunkChainOf,
  missingSpansOf,
  paintedRadioFromChunks,
  paintedUpToKm,
  radioNamesOf,
} from './paintedRadio'

/**
 * LA RADIO HASTA LO PINTADO (docs/retransmision.md §11.16 y §12.10; decisión 11-i; paso 11a): la
 * `Race Radio` de una etapa no conocida, que la web construye con la cabecera y los tramos de `Watch`
 * cortados en lo alcanzado. Sobre una congelada grabada de verdad (la e18), leída de los `.timeline.gz`
 * de `apps/api` como en `servedLine.test.ts`, de ahí la referencia a los tipos de Node.
 */

const url = new URL(
  '../../../../api/src/__fixtures__/broadcast/race-france-e18.timeline.gz',
  import.meta.url,
)
const TL: StageTimeline = decodeTimeline(JSON.parse(gunzipSync(readFileSync(url)).toString('utf8')))
const FINISH = visibilityOf(TL).finishDs
/** El corredor propio de la cabecera: uno del montón (el de en medio por llegada). */
const ARRIVALS = TL.finish.arrivals.flatMap(([, riders]) => riders)
const OWN = ARRIVALS[Math.floor(ARRIVALS.length / 2)]!

/** La cabecera de la congelada, con su reparto como cartas (el maillot que llevan) y la salida. */
const HEAD: BroadcastHead = {
  stage: {
    raceKey: 'race-france:s0',
    raceId: 'race-france',
    day: 18,
    name: 'Stage 18 · Summit finish',
    km: Math.round(TL.lengthKm),
    kind: 'reina',
    timeTrial: false,
    label: 'Summit finish',
    lengthKm: TL.lengthKm,
    dx: TL.dx,
    blocks: TL.blocks,
  },
  profile: TL.profile,
  weather: TL.weather,
  cast: TL.cast.riders.map((c) => ({
    ix: c.rider,
    id: c.riderId,
    name: `Rider ${c.rider}`,
    bib: c.bib,
    country: c.country,
    gender: c.gender,
    team: null,
    worn: c.worn,
    lines: [],
    notoriety: 8 as const,
    own: c.rider === OWN,
  })),
  startState: startStateOf(TL.cast, TL.riderIds.length),
  pace: [...BROADCAST.pace],
  estimateS: 1200,
  clock: 'exact',
  source: 'timeline',
  preview: { route: TL.profile, weather: TL.weather, jerseysInPlay: [], favourites: [] },
  view: { reachedS: null, known: false },
  gate: null,
  tt: null,
  tplRev: 0,
}

/** Los tramos de la línea entera con esos bordes, como los sirve la ruta (la voz no hace falta). */
function chunksOf(bounds: readonly Ds[]): BroadcastChunk[] {
  const out: BroadcastChunk[] = []
  for (let i = 1; i < bounds.length; i++) {
    const to = Math.min(bounds[i]!, FINISH)
    out.push({ ...chunkOf(TL, bounds[i - 1]!, to), lines: [] })
    if (to >= FINISH) break
  }
  return out
}

/** Bordes cada `stepS` de carrera hasta `upToDs` (el último, ese). */
const boundsTo = (upToDs: Ds, stepS: number = BROADCAST.chunkRaceS): Ds[] => {
  const out: Ds[] = [0]
  while (out.at(-1)! < upToDs) out.push(Math.min(upToDs, out.at(-1)! + stepS * 10))
  return out
}

/** La hora a la que se cierra cada foto de la línea entera: la mayor de las horas a las que se ven las marcas de sus grupos vivos. */
const CLOSES_AT: readonly Ds[] = (() => {
  const vis = visibilityOf(TL)
  return photoBlocksOf(TL.lengthKm, TL.dx).map((b) => {
    const alive = new Set([...photoAt(TL, b).groupOf].filter((g) => g >= 0))
    let at = 0
    TL.stateEvents.forEach((e, i) => {
      if (e.t === 'clock' && e.b === b)
        e.marks.forEach(([g], j) => {
          if (alive.has(g)) at = Math.max(at, vis.clockMarkDs[i]![j]!)
        })
    })
    return at
  })
})()

describe('la Race Radio de una etapa no conocida, hasta lo pintado (11-i)', () => {
  it('solo las fotos cerradas en lo alcanzado, y cada una es la de la línea entera', () => {
    let partial = 0
    for (const reachedS of [0, 30, 600, 1834.5, 3600, 5000.7, 7777, fromDs(FINISH) - 1]) {
      const reached = Math.floor(reachedS * 10)
      // lo descargado va hasta lo alcanzado más prefetchRaceS, como lo pide Watch (§10.11)
      const chunks = chunksOf(boundsTo(reached + BROADCAST.prefetchRaceS * 10))
      const radio = paintedRadioFromChunks(HEAD, chunks, reachedS)
      let n = 0
      while (n < CLOSES_AT.length && CLOSES_AT[n]! <= reached) n++
      const names = radioNamesOf(HEAD, cutTimeline(TL, reachedS))
      expect(radio.kms, `lo alcanzado: ${reachedS} s`).toEqual(
        radioFromTimeline(TL, names).kms.slice(0, n),
      )
      if (n > 0 && n < CLOSES_AT.length) partial += 1
    }
    expect(partial).toBeGreaterThan(4)
  })

  it('lo descargado de más no cambia nada: con los tramos hasta lo alcanzado, la misma radio', () => {
    for (const reachedS of [900, 2345.6, 6000]) {
      const reached = Math.floor(reachedS * 10)
      const ahead = paintedRadioFromChunks(
        HEAD,
        chunksOf(boundsTo(reached + BROADCAST.prefetchRaceS * 10)),
        reachedS,
      )
      const exact = paintedRadioFromChunks(HEAD, chunksOf(boundsTo(reached, 450)), reachedS)
      expect(ahead).toEqual(exact)
      expect(ahead.kms.length).toBeGreaterThan(0)
    }
  })

  it('con nada pintado, ninguna foto; y la cabecera dice hasta qué km', () => {
    const none = paintedRadioFromChunks(HEAD, [], 0)
    expect(none.kms).toEqual([])
    expect(paintedUpToKm(none)).toBeNull()
    const some = paintedRadioFromChunks(HEAD, chunksOf(boundsTo(30_000)), 3000)
    expect(paintedUpToKm(some)).toBe(Math.round(some.kms.at(-1)!.km))
    expect(paintedUpToKm(some)).toBeGreaterThan(10)
  })

  it('a quién nombra: el propio en todas las fotos en que corre, y los nombrables por la política de §7.7', () => {
    const reachedS = fromDs(FINISH) - 1
    const radio = paintedRadioFromChunks(HEAD, chunksOf(boundsTo(FINISH)), reachedS)
    const ownId = TL.riderIds[OWN]!
    const blocks = photoBlocksOf(TL.lengthKm, TL.dx)
    let inBig = 0
    radio.kms.forEach((k, i) => {
      if (photoAt(TL, blocks[i]!).groupOf[OWN]! < 0) return
      const g = k.groups.find((x) => x.riders.some((r) => r.id === ownId))
      expect(g, `km ${k.km}`).toBeDefined()
      if (g!.size > BROADCAST.nameWholeGroupUpTo) inBig += 1
    })
    expect(inBig).toBeGreaterThan(10)
    // los de la general de salida que se nombran siempre, desde la primera foto en un grupo grande
    const names = radioNamesOf(HEAD, cutTimeline(TL, reachedS))
    const gcTop = HEAD.startState.gcTop.filter((r) => r.rank <= BROADCAST.namedGcTop)
    expect(gcTop.length).toBeGreaterThan(0)
    for (const row of gcTop) expect(names.nameableAt(0).has(row.rider)).toBe(true)
    // el protagonista de un suceso que aún no se ha visto no se nombra por él: la línea cortada no lo trae
    const always = new Set([
      ...gcTop.map((r) => r.rider),
      ...HEAD.cast.filter((x) => x.worn.kind !== 'team').map((x) => x.ix),
    ])
    const seen = new Set(TL.events.filter((e) => e.revealS <= 600).flatMap((e) => e.riders))
    const fresh = (r: number): boolean => !always.has(r) && !seen.has(r)
    const later = TL.events.find((e) => e.revealS > 600 && e.riders.some(fresh))!
    const rider = later.riders.find(fresh)!
    expect(radioNamesOf(HEAD, cutTimeline(TL, 600)).nameableAt(TL.lengthKm).has(rider)).toBe(false)
    expect(names.nameableAt(TL.lengthKm).has(rider)).toBe(true)
  })
})

describe('los tramos de la caché y los que faltan (11-i)', () => {
  const c = (fromDs: Ds, toDs: Ds, atFinish = false): BroadcastChunk =>
    ({ ...chunkOf(TL, fromDs, toDs), atFinish, lines: [] }) as BroadcastChunk

  it('se juntan desde 0, cada uno donde acabó el anterior, el más largo de los que empiezan igual', () => {
    const a = c(0, 9000)
    const b = c(9000, 18000)
    const b2 = c(9000, 13000)
    const d = c(18000, 20000)
    const far = c(25000, 30000)
    expect(chunkChainOf([far, d, b2, a, b])).toEqual([a, b, d])
    expect(chunkChainOf([b, d])).toEqual([])
    expect(chunkChainOf([a, c(9000, 12000, true), c(12000, 15000)])).toHaveLength(2)
  })

  it('lo que falta va de chunkRaceS en chunkRaceS hasta lo alcanzado hacia abajo', () => {
    const step = BROADCAST.chunkRaceS * 10
    expect(missingSpansOf(0, 0)).toEqual([])
    expect(missingSpansOf(0, 12.37)).toEqual([[0, 123]])
    expect(missingSpansOf(step, 2.5 * BROADCAST.chunkRaceS)).toEqual([
      [step, 2 * step],
      [2 * step, 2.5 * step],
    ])
    expect(missingSpansOf(3000, 100)).toEqual([])
  })
})
