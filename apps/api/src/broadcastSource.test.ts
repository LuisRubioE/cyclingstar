import { worldHorizon } from '@cyclingstar/db'
import {
  NO_LEADERS,
  type StageTimeline,
  cutTimeline,
  instantAt,
  photoAt,
  photoBlocksOf,
  visibilityOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  ROAD_FIXTURES,
  fixtureStage,
  loadRecordedTimeline,
  loadStoredRadio,
} from './__fixtures__/broadcast/load.js'
import {
  type CastEntry,
  type RadioStage,
  type StoredRadioPhoto,
  type StoredStage,
  adaptRadioStage,
  estimatedHeadClock,
  provisionalCast,
  recordedClockOf,
  revealStoredEvents,
  serveCast,
  storedPhotoBlocks,
  threeKmRuleRiders,
} from './broadcastSource.js'
import type { ChronicleEvent, StoredRadio } from './chronicle.js'

/**
 * EL RELOJ ESTIMADO DE LAS ETAPAS SIN LÍNEA (docs/retransmision.md §3.8; D-07). Las etapas corridas
 * antes de que se grabe la línea (paso 5) no tienen reloj de grupo: la cabeza se estima integrando la
 * velocidad del grupo de cabeza de cada foto de la radio guardada y reescalando para que la meta
 * caiga en el tiempo del ganador. Sobre ese reloj, el adaptador fecha cada suceso guardado con las
 * reglas de revelado (`revealSOf`, §4.7), y con esa hora nace B19 (16-a, 17-d).
 */

type Group = StoredRadioPhoto['groups'][number]
const group = (over: Partial<Group> = {}): Group => ({
  kind: 'peloton',
  gapS: 0,
  speedKmh: 36,
  pulling: [],
  watching: [],
  ...over,
})
/** Una foto con solo la cabeza, a esa velocidad (null: la radio no pudo medirla). */
const head = (km: number, speedKmh: number | null): StoredRadioPhoto => ({
  km,
  groups: [group({ speedKmh })],
})

describe('estimatedHeadClock · el reloj de la cabeza (§3.8)', () => {
  it('desde la v90 la velocidad de una foto es la del km que acaba de recorrer: el tramo de la k a la k + 1 va con la de la k + 1', () => {
    // La primera foto mide el km siguiente (20 km/h, como la segunda) y la tercera, el que va del 1
    // al 2 (40 km/h): 180 s y 90 s. Con la velocidad de la foto k en el tramo siguiente, que era la
    // regla de la v89, el segundo tramo saldría a 20 km/h y la cabeza llegaría al km 1 a los 135 s.
    const clock = estimatedHeadClock([head(0, 20), head(1, 20), head(2, 40)], 2, 270)
    expect(clock).toEqual([0, 180, 270, 270])
  })

  it('con huecos de velocidad, un tramo sin ella toma la última conocida, y los anteriores al primero que la tiene, la de ése', () => {
    // Tramos: 0→1 sin dato (antes del primero: 30), 1→2 a 30, 2→3 sin dato (la última: 30), 3→4 a 60.
    const kms = [head(0, null), head(1, null), head(2, 30), head(3, null), head(4, 60)]
    // 120 + 120 + 120 + 60 = 420 s, que el ganador hizo en 840: todo se estira por dos.
    expect(estimatedHeadClock(kms, 4, 840)).toEqual([0, 240, 480, 720, 840, 840])
  })

  it('la meta cae exactamente en el tiempo del ganador, y el reloj no retrocede', () => {
    const kms = [head(0.1, 41.3), head(1.1, 37.9), head(2.1, null), head(2.9, 52.7)]
    const clock = estimatedHeadClock(kms, 3, 1234.5)
    expect(clock).not.toBeNull()
    expect(clock?.at(-1)).toBe(1234.5)
    for (let k = 1; k < (clock?.length ?? 0); k++)
      expect(clock?.[k]).toBeGreaterThanOrEqual(clock?.[k - 1] ?? 0)
  })

  it('una radio sin ninguna velocidad de cabeza no tiene reloj que estimar: null', () => {
    expect(estimatedHeadClock([head(0, null), head(1, null), head(2, 0)], 2, 300)).toBeNull()
    expect(estimatedHeadClock([], 2, 300)).toBeNull()
  })
})

/**
 * Una etapa de 3 km a 36 km/h: la cabeza pasa el final de cada km de foto 100 s después que el
 * anterior, sin reescalar (el ganador la hace en 290 s), y está en el km x en el segundo
 * 100 · (x − 0,1). Las fotos son las de la radio guardada: al final del bloque de 0,1, 1,1 y 2,1 km y
 * en la meta.
 */
function stage(over: Partial<StoredStage> = {}): StoredStage {
  // La entrada (el RiderIx): Ana, Bea, Cris y Dani. La radio solo nombra a tres: 0 Bea, 1 Ana, 2 Cris.
  // Cris sale sola en el km 0,55; en el 2,1 Ana ya se ha quedado en un tercer grupo.
  const fuga = group({ kind: 'fuga', pulling: [2] })
  return {
    riderIds: ['a', 'b', 'c', 'd'],
    lengthKm: 3,
    winnerS: 290,
    radio: {
      riders: ['b', 'a', 'c'],
      kms: [
        { km: 0.1, groups: [group({ pulling: [0], watching: [1, 2] })] },
        { km: 1.1, groups: [fuga, group({ gapS: 30, pulling: [0, 1] })] },
        {
          km: 2.1,
          groups: [
            fuga,
            group({ gapS: 50, pulling: [0] }),
            group({ kind: 'grupeto', gapS: 70, watching: [1] }),
          ],
        },
        { km: 3, groups: [fuga, group({ gapS: 60, pulling: [0, 1] })] },
      ],
    },
    ...over,
  }
}

const ev = (over: Partial<ChronicleEvent> & { plantilla: string }): ChronicleEvent => ({
  km: 1.55,
  tS: 0,
  tipo: '',
  protagonistas: [],
  ...over,
})

describe('revealStoredEvents · el revealS de lo guardado (§3.8, §4.7)', () => {
  it('por defecto, el reloj estimado del grupo de su primer protagonista al acabar el bloque del suceso', () => {
    // km 1,55: el bloque 15, que acaba en el km 1,6 (cabeza: 150 s). Ana va en el segundo grupo de la
    // última foto (la del km 1,1), a 30 s.
    const out = revealStoredEvents([ev({ plantilla: 'attack_go', protagonistas: ['a'] })], stage())
    expect(out?.revealS).toEqual([180])
  })

  it('…nunca antes de su tS, y en décimas, como la línea grabada (§3.8)', () => {
    const out = revealStoredEvents(
      [ev({ plantilla: 'attack_go', tS: 200.04, protagonistas: ['a'] })],
      stage(),
    )
    expect(out?.revealS).toEqual([200])
  })

  it('el que la radio no nombra en esa foto se revela con el reloj de la cabeza', () => {
    // km 2,55: el bloque 25, que acaba en el km 2,6 (cabeza: 250 s). Dani no está entre los
    // nombrados; Bea tira en el segundo grupo de la foto del km 2,1, a 50 s.
    const out = revealStoredEvents(
      [
        ev({ plantilla: 'attack_go', km: 2.55, protagonistas: ['d'] }),
        ev({ plantilla: 'attack_go', km: 2.55, protagonistas: ['b'] }),
      ],
      stage(),
    )
    expect(out?.revealS).toEqual([250, 300])
  })

  it('la fuga se revela al cuajar, cuando saca 45 s al pelotón en una foto, no en el km en que salió', () => {
    // Sale en el km 0,55 (bloque 5, cabeza en el 50 s); en la foto del km 1,1 saca 30 s al pelotón y
    // en la del 2,1, 50: ahí se confirma (STAGE.tacticBreakGapSeconds), con la cabeza en el 200 s.
    const formada = ev({ plantilla: 'breakaway_formed', km: 0.55, tS: 50, protagonistas: ['c'] })
    const colabora = { ...formada, plantilla: 'break_cooperation' }
    expect(revealStoredEvents([formada, colabora], stage())?.revealS).toEqual([200, 200])
    // Si ninguna foto la confirma (la radio no nombra a ninguno de los suyos), el km en que salió:
    // el bloque 5, que acaba en el km 0,6, con la cabeza en el 50 s.
    expect(revealStoredEvents([{ ...formada, protagonistas: ['d'] }], stage())?.revealS).toEqual([
      50,
    ])
  })

  it('el rebelde, con el siguiente suceso de su protagonista (next_emit)', () => {
    const rebelde = ev({ plantilla: 'rider_defies_team', km: 0.55, protagonistas: ['b'] })
    const ataque = ev({ plantilla: 'attack_go', km: 2.55, protagonistas: ['b'] })
    expect(revealStoredEvents([rebelde, ataque], stage())?.revealS).toEqual([300, 300])
  })

  it('un pinchazo de carretera, con el grupo en que iba al final del bloque anterior (incident)', () => {
    // km 2,05: el bloque 20, que acaba en el km 2,1. Al final del 19 Ana iba en el segundo grupo (la
    // foto del km 1,1), y ese puesto pasa el final del 20 a 50 s de la cabeza: 250 s. En esa foto ella
    // ya va en el tercero, a 70 s, porque se ha parado; pero se sabe cuando pasa su grupo (4-v).
    const pinchazo = ev({ plantilla: 'puncture', km: 2.05, protagonistas: ['a'] })
    expect(revealStoredEvents([pinchazo], stage())?.revealS).toEqual([250])
  })

  it('lo de la meta va al paquete de meta: nunca antes del reloj del ganador', () => {
    const out = revealStoredEvents(
      [ev({ plantilla: 'stage_win', km: 2.95, tS: 289, protagonistas: ['c'] })],
      stage(),
    )
    expect(out?.revealS).toEqual([290])
    expect(out?.view.finishS).toBe(290)
  })

  it('la vista: todos salen en el grupo 0, en el segundo 0; un grupo que no está en la foto no tiene reloj', () => {
    const view = revealStoredEvents([], stage())?.view
    expect(view?.groupAt(0, -1)).toBe(0)
    expect(view?.clockAt(0, -1)).toBe(0)
    expect(view?.clockAt(2, 15)).toBeNull()
    expect(view?.clockAt(2, 20)).toBe(270)
    expect(view?.headClockAt(29)).toBe(290)
    expect(view?.blockOfKm(1.55)).toBe(15)
  })

  it('sin velocidad de cabeza en ninguna foto, null: el adaptador no construye la línea', () => {
    const sinVelocidad = stage()
    const kms = sinVelocidad.radio.kms.map((k) => ({
      ...k,
      groups: k.groups.map((g) => ({ ...g, speedKmh: null })),
    }))
    expect(revealStoredEvents([], { ...sinVelocidad, radio: { ...sinVelocidad.radio, kms } })).toBe(
      null,
    )
  })
})

describe('storedPhotoBlocks · el bloque de cada foto es el del calendario del motor (3a)', () => {
  it.each(ROAD_FIXTURES)(
    '%s: cada foto en su bloque de photoBlocksOf, y la cuenta del km guardado se equivocaba en 14',
    (name) => {
      const stage = fixtureStage(name)
      const { kms } = loadStoredRadio(name)
      const calendar = photoBlocksOf(stage.lengthKm, 0.1)
      expect(storedPhotoBlocks(kms, stage.lengthKm)).toEqual([...calendar])
      // la cuenta del paso 2 (round(km / dx) − 1) ponía 14 fotos un bloque antes de tomarlas
      const byKm = kms.map((p) => Math.round(p.km / 0.1) - 1)
      const early = byKm.filter((b, k) => b !== calendar[k])
      expect(early).toHaveLength(14)
      byKm.forEach((b, k) => {
        if (b !== calendar[k]) expect(b).toBe(calendar[k]! - 1)
      })
    },
  )

  it('una radio que no sigue el calendario va por el km guardado, sin repetir bloque', () => {
    expect(storedPhotoBlocks([{ km: 0.1 }, { km: 0.15 }, { km: 0.6 }], 3)).toEqual([0, 1, 5])
  })
})

/**
 * UNA ETAPA DE 3 KM CON DIECISÉIS CORREDORES, para el adaptador entero (§3.8). La radio nombra a los
 * que tiran y, en un grupo de hasta doce, a todos (como `radioForStorage`). En la foto del km 1 salen
 * r0 y r1 (la fuga) y el pelotón de catorce solo nombra a r2, que tira; en la del 2, r14 ya se ha
 * bajado (km 1,55), r15 va descolgado y el pelotón de doce va nombrado entero; en la del 2,9 el
 * pelotón ha cazado la fuga y nombra a r2, que tira, y a r0, protagonista de un suceso. A 36 km/h la
 * cabeza pasa cada km de foto 100 s después que el anterior, y el ganador hace 290 s.
 */
function adapterStage(over: Partial<RadioStage> = {}): RadioStage {
  const ids = Array.from({ length: 16 }, (_, i) => `r${i}`)
  // El índice de cada uno en la lista de nombrados de la radio guardada: otro orden que el RiderIx.
  const stored = ['r2', 'r0', 'r1', 'r15', ...ids.slice(3, 14)]
  const ix = (id: string): number => stored.indexOf(id)
  const g = (
    kind: 'fuga' | 'peloton' | 'grupeto',
    size: number,
    gapS: number,
    pulling: string[],
    watching: string[] = [],
  ): StoredRadio['kms'][number]['groups'][number] => ({
    kind,
    size,
    gapS,
    speedKmh: 36,
    pulling: pulling.map(ix),
    watching: watching.map(ix),
    motivos: pulling.map(() => null),
    paraQuien: pulling.map(() => null),
  })
  const radio: StoredRadio = {
    starters: 16,
    riders: stored,
    kms: [
      { km: 0.1, racing: 16, gone: 0, groups: [g('peloton', 16, 0, ['r2'])] },
      {
        km: 1.1,
        racing: 16,
        gone: 0,
        groups: [g('fuga', 2, 0, ['r0', 'r1']), g('peloton', 14, 30, ['r2'])],
      },
      {
        km: 2.1,
        racing: 15,
        gone: 1,
        groups: [
          g('fuga', 2, 0, ['r0', 'r1']),
          g('peloton', 12, 50, ['r2'], ids.slice(3, 14)),
          g('grupeto', 1, 90, [], ['r15']),
        ],
      },
      {
        km: 2.9,
        racing: 15,
        gone: 1,
        groups: [g('peloton', 14, 0, ['r2'], ['r0']), g('grupeto', 1, 40, [], ['r15'])],
      },
    ],
  }
  const events: ChronicleEvent[] = [
    { km: 0.55, tS: 50, tipo: '', plantilla: 'attack_go', protagonistas: ['r0'] },
    { km: 1.55, tS: 155, tipo: '', plantilla: 'rider_abandons', protagonistas: ['r14'] },
    { km: 2.85, tS: 283, tipo: '', plantilla: 'breakaway_caught', protagonistas: ['r0', 'r1'] },
    { km: 2.95, tS: 289, tipo: '', plantilla: 'stage_win', protagonistas: ['r2'] },
  ]
  return {
    radio,
    events,
    riderIds: ids,
    lengthKm: 3,
    winnerS: 290,
    engineVersion: 91,
    finishTimes: new Map(ids.filter((id) => id !== 'r14').map((id) => [id, 290] as const)),
    nameableAlways: new Set(),
    profile: { altM: [0, 10, 20, 30], climbs: [], sprintsKm: [], laps: 1 },
    weather: { tempC: 20, rain: 0, spans: [] },
    cast: { riders: [], teams: [], favourites: [] },
    ...over,
  }
}

describe('adaptRadioStage · la línea degradada de una etapa sin línea (§3.8)', () => {
  const tl = adaptRadioStage(adapterStage()) as StageTimeline

  it('el catálogo: la fuga nace en su foto, el descolgado también, y la fuga cazada muere con el pelotón de sucesor', () => {
    expect(tl).not.toBeNull()
    expect(tl.groups).toEqual([
      { id: 'peloton', origin: 'start', bornB: 0, diedB: null, successor: null },
      { id: 'mov-1', origin: 'attack', bornB: 10, diedB: 27, successor: 0 },
      { id: 'shed-1', origin: 'shed', bornB: 20, diedB: null, successor: null },
    ])
    expect(tl).toMatchObject({ clock: 'estimated', timeTrial: false, blocks: 30, keys: [] })
  })

  it('las marcas: cada grupo en headS(k) + gapS en cada foto, la muerte con el hueco que llevaba y la meta en el tiempo del ganador', () => {
    const clocks = tl.stateEvents.flatMap((e) => (e.t === 'clock' ? [[e.b, e.marks]] : []))
    expect(clocks).toEqual([
      [0, [[0, 0]]],
      [
        10,
        [
          [0, 1300],
          [1, 1000],
        ],
      ],
      [
        20,
        [
          [0, 2500],
          [1, 2000],
          [2, 2900],
        ],
      ],
      [27, [[1, 2700]]], // la fuga, en el bloque anterior a la foto en que ya no está
      [
        28,
        [
          [0, 2800],
          [2, 3200],
        ],
      ],
      [
        29,
        [
          [0, 2900],
          [2, 3300],
        ],
      ],
    ])
    expect(visibilityOf(tl).finishDs).toBe(2900) // el tiempo del ganador
  })

  it('quién va dónde: los nombrados donde dice la radio y los demás donde iban; el que se baja, fuera en su foto', () => {
    const changes = tl.stateEvents.flatMap((e) =>
      e.t === 'move'
        ? [[e.b, 'move', e.to, e.riders]]
        : e.t === 'out'
          ? [[e.b, 'out', e.rider]]
          : [],
    )
    expect(changes).toEqual([
      [10, 'move', 1, [0, 1]],
      [20, 'out', 14],
      [20, 'move', 2, [15]],
      [28, 'move', 0, [0, 1]],
    ])
    expect(tl.stateEvents.some((e) => e.t === 'main')).toBe(false) // el título no cambia de grupo
  })

  it('el instante sobre la línea: la fuga delante, el pelotón de catorce a 30 s', () => {
    const ctx = {
      own: new Set<number>(),
      start: { leaders: { gc: null, points: null, kom: null }, gcTop: [], racingAtStart: 16 },
      photoBlocks: photoBlocksOf(3, 0.1),
    }
    const now = instantAt(tl, 150, ctx)
    expect(now.groups.map((x) => [x.g, x.size])).toEqual([
      [1, 2],
      [0, 14],
    ])
    expect(now.groups[0]!.members).toEqual([0, 1])
    expect(now.mainGap).toMatchObject({ ahead: 1, behind: 0, gapS: 30, ref: 'bunch' })
    // y cortar en una hora no cambia lo que se ve en ella (B9 en pequeño)
    expect(instantAt(cutTimeline(tl, 150), 150, ctx)).toEqual(now)
  })

  it('la capa de detalle, en cada foto y por GroupIx; los sucesos, por revealS con su bloque de emisión', () => {
    expect(tl.detail.get(10)).toEqual([
      {
        g: 0,
        speedKmh: 36,
        pullingTotal: 1,
        pullers: [{ rider: 2, motive: null, forRider: null }],
        mishap: null,
      },
      {
        g: 1,
        speedKmh: 36,
        pullingTotal: 2,
        pullers: [
          { rider: 0, motive: null, forRider: null },
          { rider: 1, motive: null, forRider: null },
        ],
        mishap: null,
      },
    ])
    expect(tl.events.map((e) => [e.source, e.plantilla, e.bEmit])).toEqual([
      [0, 'attack_go', 5],
      [1, 'rider_abandons', 15],
      [2, 'breakaway_caught', 28],
      [3, 'stage_win', 29],
    ])
    for (const e of tl.events) expect(e.revealS).toBeGreaterThanOrEqual(e.tS)
    expect(tl.events.at(-1)!.revealS).toBe(290) // lo de la meta, en la meta
  })

  it('la meta: las llegadas por tiempo, sin el que se bajó; sin reloj de cabeza no hay línea', () => {
    expect(tl.finish).toEqual({
      finishS: 290,
      arrivals: [[2900, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15]]],
    })
    const stage = adapterStage()
    const sinVelocidad = {
      ...stage.radio,
      kms: stage.radio.kms.map((k) => ({
        ...k,
        groups: k.groups.map((x) => ({ ...x, speedKmh: null })),
      })),
    }
    expect(adaptRadioStage({ ...stage, radio: sinVelocidad })).toBeNull()
  })
})

describe('el reparto provisional del adaptador (17-k) y su primera forma servida', () => {
  const identities = {
    riders: new Map([
      ['ana', { name: 'Ana Solis', country: 'ES', gender: 'F' as const }],
      ['bea', { name: 'Bea Roca', country: 'FR', gender: 'F' as const }],
      ['caro', { name: 'Caro Ruiz', country: 'IT', gender: 'F' as const }],
    ]),
    teams: new Map([['sol', { name: 'Team Sol', jerseySeed: 'j-sol' }]]),
  }
  const entries: CastEntry[] = [
    { riderId: 'ana', bib: 11, teamId: 'sol', gcRank: 1, gcDeficitS: 0 },
    { riderId: 'bea', bib: 12, teamId: 'sol', gcRank: 2, gcDeficitS: 14 },
    { riderId: 'caro', bib: null, teamId: null, gcRank: null, gcDeficitS: null },
  ]
  const from = { raceKey: 'race-france:s0', stageDay: 4 }
  const leaders = { gc: 'ana', points: 'bea', kom: null, team: 'sol' }

  it('cada corredor con su dorsal, su país y el equipo del día, y el maillot de líder de la N − 1', () => {
    const cast = provisionalCast(
      entries,
      identities,
      { leaders, delegated: new Set(['points']) },
      from,
    )
    expect(cast.teams).toEqual([{ teamId: 'sol', jerseySeed: 'j-sol' }])
    expect(
      cast.riders.map((r) => [r.rider, r.riderId, r.bib, r.team, r.country, r.gender]),
    ).toEqual([
      [0, 'ana', 11, 0, 'ES', 'F'],
      [1, 'bea', 12, 0, 'FR', 'F'],
      [2, 'caro', null, null, 'IT', 'F'],
    ])
    expect(cast.riders.map((r) => r.worn)).toEqual([
      { kind: 'leader', jersey: 'gc', delegated: false, from },
      { kind: 'leader', jersey: 'points', delegated: true, from },
      { kind: 'team' },
    ])
    expect(cast.riders[1]!.start).toEqual({ gcRank: 2, gcDeficitS: 14, from })
    expect(cast.riders[2]!.start).toEqual({ gcRank: null, gcDeficitS: null, from: null })
    // ningún título ni distinción: son del reparto congelado del 5
    for (const r of cast.riders) expect([r.distinctions, r.knownWins]).toEqual([[], 0])
    expect(cast.favourites).toEqual([])
  })

  it('el primer día nadie lleva maillot de líder ni sale con general', () => {
    const cast = provisionalCast(
      entries,
      identities,
      { leaders: NO_LEADERS, delegated: new Set() },
      null,
    )
    for (const r of cast.riders) {
      expect(r.worn).toEqual({ kind: 'team' })
      expect(r.start).toEqual({ gcRank: null, gcDeficitS: null, from: null })
    }
  })

  it('serveCast sin velo: los nombres de hoy, la notoriedad del maillot y los propios', () => {
    const cast = provisionalCast(
      entries,
      identities,
      { leaders, delegated: new Set(['points']) },
      from,
    )
    const names = {
      rider: (id: string) => identities.riders.get(id)?.name ?? '?',
      team: (id: string) => identities.teams.get(id)?.name ?? '?',
    }
    const cards = serveCast(cast, worldHorizon, names, { own: new Set([2]) })
    expect(cards.map((c) => [c.ix, c.name, c.team?.name ?? null, c.notoriety, c.own])).toEqual([
      [0, 'Ana Solis', 'Team Sol', 0, false],
      [1, 'Bea Roca', 'Team Sol', 3, false],
      [2, 'Caro Ruiz', null, 8, true],
    ])
    expect(cards[0]!.team).toEqual({ id: 'sol', name: 'Team Sol', jerseySeed: 'j-sol' })
    for (const c of cards) expect(c.lines).toEqual([])
  })
})

describe('threeKmRuleRiders · la regla de los 3 km sobre las caídas de la línea grabada (6-o, §14.7)', () => {
  // La e7, una llana que acaba al sprint: el grupo que llega con el ganador, y uno de ellos que se cae.
  const tl = loadRecordedTimeline('race-france-e7')
  const [winnerDs, bunch] = tl.finish.arrivals[0]!
  const rider = bunch[bunch.length - 1]!
  /** La línea con una caída de `rider` a `toGoKm` de la meta, en su sitio entre los sucesos de estado. */
  const crashAt = (toGoKm: number): StageTimeline => {
    const b = Math.round((tl.lengthKm - toGoKm) / tl.dx - 0.5)
    const at = tl.stateEvents.findIndex((e) => e.b > b)
    const mishap = { t: 'mishap', b, rider, kind: 'caida', lostDs: 150 } as const
    return {
      ...tl,
      stateEvents: [...tl.stateEvents.slice(0, at), mishap, ...tl.stateEvents.slice(at)],
    }
  }

  it('la congelada: el que se caerá llega con el tiempo de su grupo, el del ganador, y sin caídas no hay nadie', () => {
    expect(bunch.length).toBeGreaterThan(1)
    expect(tl.finish.arrivals.find(([, rs]) => rs.includes(rider))?.[0]).toBe(winnerDs)
    expect(threeKmRuleRiders(tl, false)).toEqual([])
  })

  it('una caída a 2 km de un final al sprint, con el tiempo del grupo, sale; la misma en un final en alto, no', () => {
    const line = crashAt(2)
    expect(threeKmRuleRiders(line, false)).toEqual([rider])
    expect(threeKmRuleRiders(line, true)).toEqual([])
  })

  it('a 4 km de la meta la regla no la cubre', () => {
    expect(threeKmRuleRiders(crashAt(4), false)).toEqual([])
  })

  it('la fuente de una línea grabada: los sucesos guardados, el recorrido corrido y una vista sobre la línea', () => {
    const view = recordedClockOf(tl)
    expect(view.finishS).toBe(tl.finish.finishS)
    expect(view.riderIx(tl.riderIds[3]!)).toBe(3)
    expect(view.groupAt(3, -1)).toBe(0)
    const b = 1000
    const p = photoAt(tl, b)
    const g = view.groupAt(3, b)
    expect(g).toBe(p.groupOf[3])
    expect(view.clockAt(g!, b)).toBe(p.clock.get(g!)! / 10)
    expect(view.blockOfKm(100.05)).toBe(1000)
  })
})
