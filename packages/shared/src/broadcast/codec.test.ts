import { describe, expect, it } from 'vitest'
import { synthLine, toyStage } from './__fixtures__/syntheticLine.js'
import {
  type StoredTimelineV1,
  STORED_MATCH,
  TimelineFormatError,
  decodeTimeline,
  encodeTimeline,
} from './codec.js'
import type { GroupDetail, StageTimeline, StateEvent, TimelineEvent } from './timeline.js'

/**
 * I3, LA VUELTA DEL CÓDEC (E2, docs/retransmision.md §4.3, §4.4 y §16.2; D-10, D-52, PR 4b).
 *
 * `stage_timelines.body` guarda el JSON de `encodeTimeline` y la API lo lee con `decodeTimeline`; lo
 * guardado no se reescribe nunca, así que la vuelta tiene que ser exacta: `decodeTimeline(
 * encodeTimeline(tl))` es `tl` campo a campo, los `Int16Array` por contenido y los `Map` por entradas
 * en orden, sin tolerancia (§4.1: todo número de la línea sale ya redondeado con los cuatro redondeos).
 * Es la otra mitad de I3 (la de las claves está en `reduce.test.ts`), y corre aquí, en la suite
 * rápida, porque un cambio en `codec.ts` no corre los bancos del motor (15-d). Sobre la línea de
 * juguete de `reduce.test.ts`, completada con todo lo que la etapa de juguete no tiene: sucesos,
 * capa de detalle, pancartas, percances, reparto, tiempo y meta; y sobre una crono.
 */

const OPTS = { photoEvery: 10, keyEvery: 20, lastBlocks: 10 } as const

/** Un suceso de la línea con sus números ya redondeados como los guarda el formato (km en décimas, relojes en Ds). */
function event(
  source: number,
  plantilla: string,
  km10: number,
  tDs: number,
  bEmit: number,
  revealDs: number,
  riders: readonly number[],
  datos: TimelineEvent['datos'],
): TimelineEvent {
  return {
    source,
    plantilla,
    km: km10 / 10,
    tS: tDs / 10,
    bEmit,
    revealS: revealDs / 10,
    riders,
    datos,
  }
}

/** La línea de juguete de reduce.test.ts, completa: lo que el grabador de §5.4 deja en una etapa en línea. */
function roadLine(): StageTimeline {
  const { photos, riderIds } = toyStage()
  const { tl: core } = synthLine(photos, riderIds, OPTS)
  // Un percance de estado en el bloque 25 (el del descolgado), detrás del `clock` de ese bloque.
  const at = core.stateEvents.filter((e) => e.b <= 25).length
  const mishap: StateEvent = { t: 'mishap', b: 25, rider: 5, kind: 'caida', lostDs: 123 }
  const stateEvents = [...core.stateEvents.slice(0, at), mishap, ...core.stateEvents.slice(at)]
  const row = (g: number, extra: Partial<GroupDetail>): GroupDetail => ({
    g,
    speedKmh: 42.3,
    pullingTotal: 0,
    pullers: [],
    mishap: null,
    ...extra,
  })
  const detail = new Map<number, readonly GroupDetail[]>([
    [0, [row(0, { pullingTotal: 3, pullers: [{ rider: 4, motive: 'tren', forRider: 6 }] })]],
    [
      10,
      [
        row(0, {
          speedKmh: null,
          pullingTotal: 15,
          pullers: [
            { rider: 3, motive: 'equipo_general', forRider: null },
            { rider: 6, motive: null, forRider: 3 },
          ],
        }),
      ],
    ],
    [
      30,
      [
        row(0, { speedKmh: 40 }),
        row(1, { speedKmh: 45.1, mishap: { kind: 'pinchazo', lostS: 12.3 } }),
        row(2, { speedKmh: 38.9 }),
      ],
    ],
  ])
  return {
    ...core,
    engineVersion: 91,
    stateEvents,
    events: [
      event(0, 'breakaway_formed', 13, 1150, 12, 1170, [0, 1], null),
      event(-1, 'crash', 25, 2310, 25, 2310, [5], null),
      event(1, 'time_gap', 30, 2700, 30, 2810, [0, 1], {
        gapS: 32,
        trend: 1,
        chaseKind: 'peloton',
      }),
      event(2, 'climb_kom', 40, 3600, 40, 3655, [2], { cat: 'cat3', rival: 'r1' }),
      event(3, 'stage_win', 60, 5400, 60, 5430, [0], { margenS: 2 }),
    ],
    detail,
    banners: [
      { kind: 'meta_volante', km: 2.1, cat: null, name: null, revealS: 189.3, order: [] },
      {
        kind: 'cima',
        km: 4.1,
        cat: 'cat3',
        name: 'Cote de Begues',
        revealS: 365.5,
        order: [
          { rider: 2, points: 5 },
          { rider: 0, points: 3 },
        ],
      },
    ],
    profile: {
      altM: [12, 40, 95, 160, 140, 120, 118],
      climbs: [
        { footKm: 2.5, topKm: 4.1, cat: 'cat3', lenKm: 1.6, avgPct: 7.3, name: 'Cote de Begues' },
      ],
      sprintsKm: [2.1],
      laps: 1,
    },
    cast: {
      riders: riderIds.map((riderId, rider) => ({
        rider,
        riderId,
        bib: rider === 7 ? null : rider + 1,
        team: rider === 7 ? null : rider % 2,
        country: rider % 2 === 0 ? 'ES' : 'FR',
        gender: 'M' as const,
        start:
          rider < 4
            ? {
                gcRank: rider + 1,
                gcDeficitS: rider * 7.5,
                from: { raceKey: 'race-x:s0', stageDay: 2 },
              }
            : { gcRank: null, gcDeficitS: null, from: null },
        worn:
          rider === 0
            ? {
                kind: 'leader' as const,
                jersey: 'gc' as const,
                delegated: false,
                from: { raceKey: 'race-x:s0', stageDay: 2 },
              }
            : rider === 1
              ? {
                  kind: 'champion' as const,
                  title: {
                    scope: 'national' as const,
                    country: 'FR',
                    discipline: 'road' as const,
                    category: 'elite' as const,
                    season: 0,
                    validFromDay: 179,
                    validToDay: 543,
                    source: { raceKey: 'nc-fr-road:s0', stageDay: 1 },
                    provisional: true,
                  },
                }
              : { kind: 'team' as const },
        distinctions:
          rider === 2
            ? [
                {
                  kind: 'gc' as const,
                  rank: 3,
                  deficitS: 15,
                  from: { raceKey: 'race-x:s0', stageDay: 2 },
                },
                { kind: 'stage_wins' as const, stages: [{ raceKey: 'race-x:s0', stageDay: 1 }] },
              ]
            : [],
        knownWins: rider === 0 ? 4 : 0,
      })),
      teams: [
        { teamId: 'team-a', jerseySeed: 'seed-a' },
        { teamId: 'team-b', jerseySeed: 'seed-b' },
      ],
      favourites: [
        { rider: 2, why: 'climb' },
        { rider: 0, why: 'climb' },
      ],
    },
    weather: {
      tempC: 18.5,
      rain: 0.3,
      spans: [
        { fromKm: 0, rain: 0, windDir: 0.25, windKmh: 12.4, crosswind: false },
        { fromKm: 5, rain: 0.3, windDir: 0.271, windKmh: 12.4, crosswind: true },
      ],
    },
    finish: {
      finishS: 543.2,
      arrivals: [
        [5432, [0, 1, 2]],
        [5600, [3, 4, 6]],
        [5788, [5]],
      ],
    },
  }
}

/** Una crono de cuatro corredores: sin grupos ni fotos clave, con su traza (§4.2, §9.2). */
function timeTrialLine(): StageTimeline {
  return {
    format: 1,
    engineVersion: 91,
    dx: 0.1,
    blocks: 25,
    lengthKm: 2.5,
    timeTrial: true,
    clock: 'exact',
    riderIds: ['a', 'b', 'c', 'd'],
    groups: [],
    keys: [],
    stateEvents: [],
    events: [
      event(0, 'tt_start_order', 0, 0, 25, 0, [3], { mode: 'dorsales', intervalS: 60 }),
      event(1, 'puncture', 13, 2000, 25, 1530, [1], { perdidaS: 22, conCoche: 1 }),
      event(2, 'stage_win_itt', 25, 4100, 25, 4100, [2], { timeS: 225, marginS: 3 }),
    ],
    detail: new Map(),
    banners: [],
    profile: { altM: [0, 4, 8], climbs: [], sprintsKm: [], laps: 1 },
    cast: {
      riders: ['a', 'b', 'c', 'd'].map((riderId, rider) => ({
        rider,
        riderId,
        bib: rider + 1,
        team: null,
        country: 'IT',
        gender: 'F' as const,
        start: { gcRank: null, gcDeficitS: null, from: null },
        worn: { kind: 'team' as const },
        distinctions: [],
        knownWins: 0,
      })),
      teams: [],
      favourites: [{ rider: 2, why: 'tt' }],
    },
    weather: {
      tempC: 9.1,
      rain: 0,
      spans: [{ fromKm: 0, rain: 0, windDir: 0, windKmh: 0, crosswind: false }],
    },
    tt: {
      order: 'bib',
      intervalS: 60,
      checksKm: [],
      startDs: [1800, 1200, 600, 0],
      kmClockDs: [
        [880, 1760, 2280],
        [900, 1990, 2510],
        [860, 1700, 2250],
        [870, 1740, 2270],
      ],
      checkClockDs: [[], [], [], []],
      mishaps: [{ rider: 1, km: 1.5, kind: 'pinchazo', lostDs: 223 }],
    },
    finish: {
      finishS: 408,
      arrivals: [
        [2270, [3]],
        [2850, [2]],
        [3710, [1]],
        [4080, [0]],
      ],
    },
  }
}

/**
 * La línea en objetos planos para compararla sin tolerancia: los `Int16Array` por contenido (y su
 * tipo, que se comprueba aparte) y el `Map` de la capa de detalle por sus entradas EN ORDEN.
 */
function plain(tl: StageTimeline): unknown {
  return {
    ...tl,
    keys: tl.keys.map((k) => ({ ...k, groupOf: [...k.groupOf] })),
    detail: [...tl.detail],
  }
}

describe('I3 · la vuelta del códec es exacta (§4.3, §4.4)', () => {
  for (const [name, line] of [
    ['la línea de juguete en línea', roadLine],
    ['la crono de juguete', timeTrialLine],
  ] as const) {
    it(`${name}: decodeTimeline(encodeTimeline(tl)) es tl, campo a campo`, () => {
      const tl = line()
      const back = decodeTimeline(encodeTimeline(tl))
      expect(plain(back)).toStrictEqual(plain(tl))
      expect(back.keys.every((k) => k.groupOf instanceof Int16Array)).toBe(true)
      expect(back.detail).toBeInstanceOf(Map)
      expect(back.clock).toBe('exact')
    })

    it(`${name}: y pasando por el JSON que se guarda en stage_timelines.body`, () => {
      const tl = line()
      const stored: unknown = JSON.parse(JSON.stringify(encodeTimeline(tl)))
      expect(plain(decodeTimeline(stored))).toStrictEqual(plain(tl))
    })
  }

  it('la línea de juguete tiene de todo: si no, la vuelta no probaría nada', () => {
    const tl = roadLine()
    const kinds = new Set(tl.stateEvents.map((e) => e.t))
    expect([...kinds].sort()).toEqual(['clock', 'main', 'mishap', 'move', 'out'])
    expect(tl.keys.length).toBeGreaterThan(1)
    expect(tl.groups.some((g) => g.diedB !== null && g.successor !== null)).toBe(true)
  })

  it('lo guardado son listas planas de enteros y cadenas, con los códigos como cadena (§4.3)', () => {
    const tl = roadLine()
    const s = encodeTimeline(tl)
    expect(s.format).toBe(1)
    expect(s.groupIds).toEqual(['peloton', 'mov-1', 'shed-2'])
    expect(s.groupMeta).toEqual([0, 0, -1, -1, 1, 12, -1, -1, 2, 25, 46, 0])
    expect(s.moves.length % 3).toBe(0)
    expect(s.clocks.length % 3).toBe(0)
    expect(s.main).toEqual([50, 2])
    for (const n of [...s.moves, ...s.main, ...s.clocks]) expect(Number.isInteger(n)).toBe(true)
    // la pertenencia de cada foto clave en base64, un byte por corredor: GroupIx + 1, 0 = fuera
    expect(s.keys.map(([b]) => b)).toEqual([0, 20, 40])
    expect(s.keys[2]![1]).toBe('AgICAQEDAQA=') // en el 40: r0-r2 en mov-1, r5 en shed-2, r7 fuera
    expect(s.mishaps).toEqual([[25, 5, 'caida', 123]])
    expect(s.events[1]).toEqual([-1, 'crash', 25, 2310, 25, 2310, [5], null])
    expect(s.detail[0]).toEqual([0, 0, 423, 3, [[4, 'tren', 6]], null, 0])
    expect(s.detail[1]).toEqual([
      10,
      0,
      -1,
      15,
      [
        [3, 'equipo_general', -1],
        [6, null, 3],
      ],
      null,
      0,
    ])
    expect(s.detail[3]).toEqual([30, 1, 451, 0, [], 'pinchazo', 123])
    expect(s.banners[1]).toEqual([1, 41, 'cat3', 'Cote de Begues', 3655, [2, 5, 0, 3]])
    expect(s.finish).toEqual({ finishDs: 5432, arrivals: tl.finish.arrivals })
  })

  it('un motivo de relevo que ya no existe se lee como null: una palabra no tira la línea (O-14)', () => {
    const s = JSON.parse(JSON.stringify(encodeTimeline(roadLine()))) as {
      detail: [number, number, number, number, [number, string | null, number][], unknown, number][]
    }
    s.detail[0]![4][0]![1] = 'motivo_que_ya_no_existe'
    const back = decodeTimeline(s)
    expect(back.detail.get(0)![0]!.pullers[0]!.motive).toBeNull()
  })

  it('el formato 1 está atado a su esquema en los dos sentidos (STORED_MATCH)', () => {
    expect(STORED_MATCH).toBe(true)
  })
})

describe('el formato y lo que no cruza (§4.3, §15.2)', () => {
  const stored = (): StoredTimelineV1 => JSON.parse(JSON.stringify(encodeTimeline(roadLine())))

  it('un format desconocido lanza TimelineFormatError, sin intentar leerlo', () => {
    expect(() => decodeTimeline({ ...stored(), format: 2 })).toThrow(TimelineFormatError)
    expect(() => decodeTimeline({ ...stored(), format: 0 })).toThrow(TimelineFormatError)
    expect(() => decodeTimeline({})).toThrow(TimelineFormatError)
    expect(() => decodeTimeline(null)).toThrow(TimelineFormatError)
    expect(() => decodeTimeline('{"format":1}')).toThrow(TimelineFormatError)
  })

  it('las listas que no cruzan lanzan TimelineFormatError: un grupo que no existe, una foto clave corta', () => {
    const toNowhere = stored()
    expect(() => decodeTimeline({ ...toNowhere, moves: [...toNowhere.moves, 0, 0, 9] })).toThrow(
      TimelineFormatError,
    )
    const shortKey = stored()
    expect(() =>
      decodeTimeline({ ...shortKey, keys: [[0, 'AQE='], ...shortKey.keys.slice(1)] }),
    ).toThrow(TimelineFormatError)
    const clockBack = stored()
    expect(() => decodeTimeline({ ...clockBack, clocks: [...clockBack.clocks, 3, 0, 10] })).toThrow(
      TimelineFormatError,
    )
  })

  it('encodeTimeline no escribe una foto clave de más de 255 grupos (un byte por corredor, 4-i)', () => {
    const tl = roadLine()
    const many = Array.from({ length: 256 }, (_, i) => ({
      id: `mov-${i}`,
      origin: 'attack' as const,
      bornB: 1,
      diedB: 2,
      successor: 0,
    }))
    expect(() => encodeTimeline({ ...tl, groups: [...tl.groups, ...many] })).toThrow(
      TimelineFormatError,
    )
  })
})
