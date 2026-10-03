import {
  type BroadcastChunk,
  type InstantContext,
  type StageTimeline,
  chunkOf,
  cutTimeline,
  instantAt,
  photoBlocksOf,
  seededRng,
  visibilityOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ROAD_FIXTURES, loadTimeline } from './__fixtures__/broadcast/load.js'

/**
 * B9 · EL CORTE CAUSAL (docs/retransmision.md §16.4; D-06, I-10). El código de §16.4 sin la crono: en
 * el 3a importa solo `instantAt`, usa `at = instantAt` y recorre `ROAD_FIXTURES` (las cinco en línea),
 * porque `timeTrialInstantAt` no existe hasta el 6b y la crono no tiene `<etapa>.radio.json.gz` (§17.6).
 * Hasta el 6a `loadTimeline` construye la línea del adaptador de la radio (§3.8). El 6b añade la crono
 * (`const at = tl.timeTrial ? timeTrialInstantAt : instantAt` y `describe.each(FIXTURES)`).
 *
 * Una diferencia con el código de §16.4, a propósito: `atFinish` se compara con `to >= finishDs − 1` y
 * no con `to === finishDs`, porque un tramo solo lleva lo visible ANTES de la meta (`< finishDs`): el
 * que acaba en `finishDs − 1` ya lo lleva todo y es el último que hay que pedir (`chunkOf`, cut.ts).
 */

/** Sin espectador y sin salida: ni `own` ni `start` cambian lo que el corte deja ver. */
const ctxOf = (tl: StageTimeline): InstantContext => ({
  own: new Set(),
  start: {
    leaders: { gc: null, points: null, kom: null },
    gcTop: [],
    racingAtStart: tl.riderIds.length,
  },
  photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
})
const CHUNK_DS = 9000 // BROADCAST.chunkRaceS (900 s) en Ds
const REVEAL = 5 // revealDs en la tupla de un suceso (StoredTimelineV1, §4.3)
/** El tramo con `tt` aplanado: `tt` es un objeto { starts, km, checks } (§4.11). */
const flat = (c: Omit<BroadcastChunk, 'lines'>): Record<string, unknown> => ({
  ...c,
  tt: null,
  'tt.starts': c.tt?.starts ?? [],
  'tt.km': c.tt?.km ?? [],
  'tt.checks': c.tt?.checks ?? [],
})

describe.each(ROAD_FIXTURES)('B9 · el corte causal · %s', (name) => {
  const tl = loadTimeline(name)
  const ctx = ctxOf(tl)
  const { finishDs } = visibilityOf(tl)
  const at = instantAt

  it('lo que se ve en T no cambia al quitar de la línea todo lo que aún no se ve', () => {
    const rng = seededRng(`b9:${name}`)
    for (let i = 0; i < 200; i++) {
      const T = Math.floor(rng() * finishDs) / 10 // RaceS, de la salida al borde de la meta
      expect(at(cutTimeline(tl, T), T, ctx)).toEqual(at(tl, T, ctx))
    }
  })

  it('un tramo solo lleva lo visible en su intervalo, y nunca la meta', () => {
    for (let from = 0; from < finishDs; from += CHUNK_DS) {
      const to = Math.min(from + CHUNK_DS, finishDs)
      const c = chunkOf(tl, from, to)
      expect(c).toEqual(chunkOf(cutTimeline(tl, to / 10), from, to)) // nada de después de `to` hace falta para armarlo
      for (const e of c.events)
        expect(e[REVEAL] > from && e[REVEAL] <= to && e[REVEAL] < finishDs).toBe(true)
      // nunca la meta: la marca de la cabeza en el último bloque vale exactamente finishDs y es el tiempo del ganador (§4.6)
      for (let i = 0; i < c.clocks.length; i += 3)
        expect(
          c.clocks[i + 2]! > from && c.clocks[i + 2]! <= to && c.clocks[i + 2]! < finishDs,
        ).toBe(true)
      for (let i = 0; i < c.banners.length; i += 4 + 2 * c.banners[i + 3]!)
        expect(
          c.banners[i + 2]! > from && c.banners[i + 2]! <= to && c.banners[i + 2]! < finishDs,
        ).toBe(true)
      expect(c.tt).toBeNull()
      expect(c.atFinish).toBe(to >= finishDs - 1)
    }
  })

  it('los tramos, uno tras otro, son la línea entera hasta la meta: nada se pierde ni se repite', () => {
    const whole = chunkOf(tl, 0, finishDs)
    const joined = new Map<string, unknown[]>()
    for (let from = 0; from < finishDs; from += CHUNK_DS)
      for (const [k, v] of Object.entries(
        flat(chunkOf(tl, from, Math.min(from + CHUNK_DS, finishDs))),
      ))
        if (Array.isArray(v)) joined.set(k, [...(joined.get(k) ?? []), ...v])
    for (const [k, v] of Object.entries(flat(whole)))
      if (Array.isArray(v)) expect(joined.get(k) ?? []).toEqual(v)
  })

  it('el borde de la meta es el tiempo del ganador: la marca de la cabeza en el último bloque', () => {
    expect(finishDs).toBe(Math.round(tl.finish.finishS * 10))
  })
})
