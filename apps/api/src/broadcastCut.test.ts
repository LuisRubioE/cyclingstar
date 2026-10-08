import {
  BANNER_CODE,
  type BroadcastChunk,
  type InstantContext,
  MISHAP_CODE,
  PULL_MOTIVE_CODE,
  type StageTimeline,
  type TimelineCore,
  chunkOf,
  cutTimeline,
  instantAt,
  photoAt,
  photoBlocksOf,
  seededRng,
  toDs,
  toKm10,
  visibilityOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ROAD_FIXTURES, loadTimeline } from './__fixtures__/broadcast/load.js'

/**
 * B9 · EL CORTE CAUSAL (docs/retransmision.md §16.4; D-06, I-10). El código de §16.4 sin la crono: en
 * el 3a importa solo `instantAt`, usa `at = instantAt` y recorre `ROAD_FIXTURES` (las cinco en línea),
 * porque `timeTrialInstantAt` no existe hasta el 6b y la crono no tiene `<etapa>.radio.json.gz` (§17.6).
 * Del 3a al 5 `loadTimeline` construía la línea del adaptador de la radio (§3.8); desde el 6a carga la
 * grabada (`<etapa>.timeline.gz`), con sus marcas de verdad, también las que bajan (§4.6). El 6b añade
 * la crono (`const at = tl.timeTrial ? timeTrialInstantAt : instantAt` y `describe.each(FIXTURES)`).
 *
 * Una diferencia con el código de §16.4, a propósito: `atFinish` se compara con `to >= finishDs − 1` y
 * no con `to === finishDs`, porque un tramo solo lleva lo visible ANTES de la meta (`< finishDs`): el
 * que acaba en `finishDs − 1` ya lo lleva todo y es el último que hay que pedir (`chunkOf`, cut.ts).
 *
 * Y dos del 3c. El tramo que empieza en 0 es [0, toDs] y no (0, toDs]: lo que se ve desde la salida (el
 * grupo de salida y lo que se vea en 0 Ds, como la marca del bloque 0 que la línea del adaptador ponía
 * en 0 Ds) va en el primero; los demás siguen siendo (fromDs, toDs], para que nada viaje dos veces. Y la
 * tercera cláusula compara los tramos, uno tras otro, con `cutTimeline` en el borde de cada uno, que es
 * lo que dice §4.6 (la unión de los tramos hasta T es la línea cortada en T), y no con
 * `chunkOf(tl, 0, finishDs)`, que tampoco traía lo de 0 Ds y por eso no lo veía.
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
/** El borde de abajo de un tramo: lo de después de `from`, y en el primero, también lo de 0 Ds (3c). */
const since = (d: number, from: number): boolean => (from === 0 ? d >= 0 : d > from)

/** Los registros de un tramo, lista a lista y cada uno en JSON (los de longitud variable, partidos). */
function recordsOf(c: Omit<BroadcastChunk, 'lines'>): Record<string, string[]> {
  const split = (xs: readonly number[], len: (at: number) => number): string[] => {
    const out: string[] = []
    for (let i = 0; i < xs.length; i += len(i)) out.push(JSON.stringify(xs.slice(i, i + len(i))))
    return out
  }
  return {
    groupsBorn: c.groupsBorn.map((x) => JSON.stringify(x)),
    groupsDied: c.groupsDied.map((x) => JSON.stringify(x)),
    moves: split(c.moves, () => 3),
    main: split(c.main, () => 2),
    clocks: split(c.clocks, () => 3),
    mishaps: split(c.mishaps, () => 4),
    details: split(c.details, (i) => 7 + 3 * c.details[i + 6]!),
    events: c.events.map((x) => JSON.stringify(x)),
    banners: split(c.banners, (i) => 4 + 2 * c.banners[i + 3]!),
  }
}

/**
 * Una línea en los registros de un tramo (§4.11), ordenados: lo que los tramos, uno tras otro, tienen
 * que traer. Escrito aquí y no con `chunkOf`, para que la tercera cláusula no se compare consigo misma.
 */
function wireOf(tl: TimelineCore): Record<string, string[]> {
  const out: Record<string, unknown[][]> = {
    groupsBorn: [],
    groupsDied: [],
    moves: [],
    main: [],
    clocks: [],
    mishaps: [],
    details: [],
    events: [],
    banners: [],
  }
  tl.groups.forEach((g, i) => {
    out.groupsBorn!.push([i, g.id, g.origin])
    if (g.diedB !== null) out.groupsDied!.push([i, g.diedB, g.successor ?? -1])
  })
  for (const e of tl.stateEvents)
    if (e.t === 'out') out.moves!.push([e.b, e.rider, 0])
    else if (e.t === 'move') for (const r of e.riders) out.moves!.push([e.b, r, e.to + 1])
    else if (e.t === 'main') out.main!.push([e.b, e.group === null ? 0 : e.group + 1])
    else if (e.t === 'clock') for (const [g, ds] of e.marks) out.clocks!.push([e.b, g, ds])
    else out.mishaps!.push([e.b, e.rider, MISHAP_CODE[e.kind], e.lostDs])
  for (const [b, rows] of tl.detail)
    for (const row of rows)
      out.details!.push([
        b,
        row.g,
        row.speedKmh === null ? -1 : Math.round(row.speedKmh * 10),
        row.pullingTotal,
        row.mishap === null ? 0 : MISHAP_CODE[row.mishap.kind],
        row.mishap === null ? 0 : toDs(row.mishap.lostS),
        row.pullers.length,
        ...row.pullers.flatMap((p) => [
          p.rider,
          p.motive === null ? 0 : PULL_MOTIVE_CODE[p.motive],
          p.forRider ?? -1,
        ]),
      ])
  for (const e of tl.events)
    out.events!.push([
      e.source,
      e.plantilla,
      toKm10(e.km),
      toDs(e.tS),
      e.bEmit,
      toDs(e.revealS),
      e.riders,
      e.datos,
    ])
  for (const x of tl.banners)
    out.banners!.push([
      BANNER_CODE[x.kind],
      toKm10(x.km),
      toDs(x.revealS),
      x.order.length,
      ...x.order.flatMap((o) => [o.rider, o.points]),
    ])
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, v.map((x) => JSON.stringify(x)).sort()]),
  )
}

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
        expect(since(e[REVEAL], from) && e[REVEAL] <= to && e[REVEAL] < finishDs).toBe(true)
      // nunca la meta: la marca de la cabeza en el último bloque vale exactamente finishDs y es el tiempo del ganador (§4.6)
      for (let i = 0; i < c.clocks.length; i += 3)
        expect(
          since(c.clocks[i + 2]!, from) && c.clocks[i + 2]! <= to && c.clocks[i + 2]! < finishDs,
        ).toBe(true)
      for (let i = 0; i < c.banners.length; i += 4 + 2 * c.banners[i + 3]!)
        expect(
          since(c.banners[i + 2]!, from) && c.banners[i + 2]! <= to && c.banners[i + 2]! < finishDs,
        ).toBe(true)
      expect(c.tt).toBeNull()
      expect(c.atFinish).toBe(to >= finishDs - 1)
    }
  })

  it('los tramos, uno tras otro, son la línea cortada en el borde de cada uno: nada se pierde ni se repite', () => {
    const joined = new Map<string, string[]>()
    for (let from = 0; from < finishDs; from += CHUNK_DS) {
      const to = Math.min(from + CHUNK_DS, finishDs)
      for (const [k, v] of Object.entries(recordsOf(chunkOf(tl, from, to))))
        joined.set(k, [...(joined.get(k) ?? []), ...v])
      // el último lleva lo de antes del borde de la meta: la línea cortada una décima antes
      const cut = wireOf(cutTimeline(tl, Math.min(to, finishDs - 1) / 10))
      for (const [k, v] of Object.entries(cut))
        expect([...(joined.get(k) ?? [])].sort(), `${k} hasta ${to}`).toEqual(v)
    }
  })

  it('el primer tramo lleva lo que se ve desde la salida: el grupo de salida, su marca del bloque 0 y su fila del km 0', () => {
    const c = chunkOf(tl, 0, CHUNK_DS)
    expect(c.groupsBorn[0]).toEqual([0, tl.groups[0]!.id, 'start'])
    // la marca de salida, la primera de la etapa: la grabada es el reloj de verdad de la cabeza al
    // final del bloque 0 (la del adaptador valía 0 Ds, porque su reloj empezaba en la primera foto, §3.8)
    expect(c.clocks.slice(0, 2)).toEqual([0, 0])
    expect(c.clocks[2]).toBeGreaterThan(0)
    expect(c.clocks[2]).toBe(Math.min(...[...photoAt(tl, 0).clock.values()]))
    // la fila de detalle del grupo de salida en el km 0, que se ve con esa marca
    expect(c.details.slice(0, 2)).toEqual([0, 0])
  })

  it('el borde de la meta es el tiempo del ganador: la marca de la cabeza en el último bloque', () => {
    expect(finishDs).toBe(Math.round(tl.finish.finishS * 10))
  })
})

describe('B9 · la e18 sale con lluvia', () => {
  it('sus doce rain_front se ven con la marca de salida y van en el primer tramo, y en ninguno más', () => {
    const tl = loadTimeline('race-france-e18')
    // en la grabada, el suceso del bloque 0 se ve con el reloj de su bloque (§4.6): el de la marca de
    // salida, 9,2 s; la del adaptador los veía en 0 s
    const startDs = chunkOf(tl, 0, CHUNK_DS).clocks[2]!
    const atStart = tl.events.filter((e) => toDs(e.revealS) === startDs)
    expect(atStart.map((e) => e.plantilla)).toEqual(Array(12).fill('rain_front'))
    expect(tl.events.every((e) => toDs(e.revealS) >= startDs)).toBe(true)
    const first = chunkOf(tl, 0, CHUNK_DS).events.filter((e) => e[REVEAL] === startDs)
    expect(first.map((e) => e[0])).toEqual(atStart.map((e) => e.source))
    expect(chunkOf(tl, CHUNK_DS, 2 * CHUNK_DS).events.some((e) => e[REVEAL] === startDs)).toBe(
      false,
    )
  })
})
