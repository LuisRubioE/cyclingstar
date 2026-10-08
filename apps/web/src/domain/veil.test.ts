import type { CalendarRaceSummary, HorizonSummary } from '@cyclingstar/shared'
import { SPOILER } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  adaptiveIgnored,
  adaptiveOfferDue,
  aggregateNotice,
  expiredNotices,
  finalVeiled,
  hiddenStageCount,
  homeBlocks,
  lastRaceReadyText,
  raceKeyOn,
  raceVeil,
  raceVeilNotice,
  readyRaceKey,
  stagesText,
  waitingStage,
  watchHref,
} from './veil'

/**
 * EL VELO EN LA WEB DEL MUNDO (E2, docs/retransmision.md §11.4 a §11.6 y §11.12; I-39, 11-m, 11-q, 10-b;
 * paso 9b). Todo lo que este módulo decide sale del horizonte de quien mira (`GET /api/me/horizon`) y del
 * calendario público: nunca de lo que pasó en las etapas veladas (§11.6, la existencia también informa).
 */

const summary = (over: Partial<HorizonSummary> = {}): HorizonSummary => ({
  rev: '200.3',
  scope: 'guarded',
  ready: [],
  watching: [],
  expiredSinceLastVisit: [],
  ...over,
})

const stage = (index: number, kind = 'llana', km = 180, timeTrial = false) => ({
  index,
  name: `Stage ${index}`,
  label: kind === 'reina' ? 'Summit finish' : 'Flat',
  kind,
  km,
  timeTrial,
  from: null,
  to: null,
})

const race = (
  id: string,
  name: string,
  kinds: readonly string[],
  over: Partial<CalendarRaceSummary> = {},
) =>
  ({
    id,
    name,
    level: 'WT',
    raceClass: 'WT',
    championshipCountry: null,
    championshipCategory: null,
    country: 'FR',
    format: kinds.length === 1 ? 'un-dia' : 'gran-vuelta',
    startDay: 185,
    openTo: ['WT'],
    winner: null,
    restAfter: [],
    stages: kinds.map((k, i) => stage(i + 1, k, k === 'cri' ? 30 : 187, k === 'cri')),
    ...over,
  }) satisfies CalendarRaceSummary

// Una gran vuelta de 21 etapas: reinas la 12, la 15 y la 18, crono la 16 y la 20.
const TOUR_KINDS = Array.from({ length: 21 }, (_, i) =>
  [12, 15, 18].includes(i + 1) ? 'reina' : [16, 20].includes(i + 1) ? 'cri' : 'llana',
)
const tour = race('race-france', 'Race France', TOUR_KINDS)
const flanders = race('race-flanders', 'Race Flanders', ['clasica'], { startDay: 95 })
const giro = race('race-italy', 'Race Italy', TOUR_KINDS, { startDay: 128 })

describe('el número del aviso y lo velado de una carrera (11-m)', () => {
  it('hiddenStageCount es h.veil.length, la suma de ready[].stages, y 0 sin horizonte', () => {
    expect(hiddenStageCount(undefined)).toBe(0)
    expect(hiddenStageCount(null)).toBe(0)
    expect(
      hiddenStageCount(
        summary({
          ready: [
            {
              raceKey: 'race-france:s0',
              raceName: 'Race France',
              stages: [10, 11, 12],
              reason: 'headline',
              expiresOnDay: 263,
            },
            {
              raceKey: 'race-flanders:s0',
              raceName: 'Race Flanders',
              stages: [1],
              reason: 'follow',
              expiresOnDay: 151,
            },
          ],
        }),
      ),
    ).toBe(4)
  })

  it('raceKeyOn: la clave de la carrera en la temporada del día de juego; sin mundo, null', () => {
    expect(raceKeyOn('race-france', 200)).toBe('race-france:s0')
    expect(raceKeyOn('race-france', 364 + 10)).toBe('race-france:s1')
    expect(raceKeyOn('race-france', null)).toBeNull()
  })

  it('raceVeil: la entrada de esa carrera, o null si no está en el velo', () => {
    const h = summary({
      ready: [
        {
          raceKey: 'race-france:s0',
          raceName: 'Race France',
          stages: [10],
          reason: 'own_rider',
          expiresOnDay: 263,
        },
      ],
    })
    expect(raceVeil(h, 'race-france:s0')?.stages).toEqual([10])
    expect(raceVeil(h, 'race-france:s1')).toBeNull()
    expect(raceVeil(undefined, 'race-france:s0')).toBeNull()
  })

  it('finalVeiled: la última etapa de la carrera está en el velo (Finished · ready to watch)', () => {
    expect(finalVeiled({ stages: [20, 21] }, 21)).toBe(true)
    expect(finalVeiled({ stages: [10, 11] }, 21)).toBe(false)
    expect(finalVeiled(null, 21)).toBe(false)
    expect(finalVeiled({ stages: [1] }, 1)).toBe(true)
  })
})

describe('los textos de los avisos (§11.5; pantalla)', () => {
  it('stagesText: una etapa o un tramo seguido', () => {
    expect(stagesText([10])).toBe('stage 10')
    expect(stagesText([10, 11, 12])).toBe('stages 10-12')
  })

  it('la ficha de carrera: After stage 9 of 21 · stages 10-12 ready to watch; sin ninguna conocida, sin el After', () => {
    expect(raceVeilNotice([10, 11, 12], 21)).toBe(
      'After stage 9 of 21 · stages 10-12 ready to watch',
    )
    expect(raceVeilNotice([5], 21)).toBe('After stage 4 of 21 · stage 5 ready to watch')
    expect(raceVeilNotice([1, 2, 3], 21)).toBe('Stages 1-3 ready to watch')
    expect(raceVeilNotice([1], 7)).toBe('Stage 1 ready to watch')
  })

  it('los agregados: el ranking y los demás, con el número del velo y nada más; sin velo, nada', () => {
    expect(aggregateNotice('ranking', 3)).toBe('World ranking · as you know it · 3 stages hidden')
    expect(aggregateNotice('ranking', 1)).toBe('World ranking · as you know it · 1 stage hidden')
    expect(aggregateNotice('results', 3)).toBe(
      "Results from 3 stages you haven't watched are hidden",
    )
    expect(aggregateNotice('results', 1)).toBe(
      "Results from 1 stage you haven't watched are hidden",
    )
    expect(aggregateNotice('results', 0)).toBeNull()
  })
})

/**
 * LA PORTADA (§11.4; D-39, I-37, 11-q): `Continue watching` con las etapas a medias, `Ready to watch` con
 * las veladas de las carreras en guardia que siguen en curso, una fila por carrera y la más antigua primero,
 * y `While you were away` con las terminadas (que no se repiten arriba). Nada de lo que ve depende de lo
 * que pasó: el horizonte (qué etapas, por qué) y el calendario (km, tipo, cuántas tiene).
 */
describe('homeBlocks (§11.4)', () => {
  const ready = [
    // el Giro, terminado con la 5 a la 21 sin ver
    {
      raceKey: 'race-italy:s0',
      raceName: 'Race Italy',
      stages: Array.from({ length: 17 }, (_, i) => i + 5),
      reason: 'headline' as const,
      expiresOnDay: 207,
    },
    // el Tour, en curso: la 10 a la 12 por ver, con su corredor en la lista de salida
    {
      raceKey: 'race-france:s0',
      raceName: 'Race France',
      stages: [10, 11, 12],
      reason: 'own_rider' as const,
      expiresOnDay: 263,
    },
  ]
  const watching = [{ raceKey: 'race-france:s0', stageDay: 10, reachedS: 3000, toGoKm: 41.6 }]
  const blocks = homeBlocks(summary({ ready, watching }), [tour, giro, flanders])

  it('Continue watching: una fila por etapa a medias, con lo que le queda a la cabeza', () => {
    expect(blocks.watching).toEqual([
      {
        raceKey: 'race-france:s0',
        raceId: 'race-france',
        stageDay: 10,
        text: 'Race France · Stage 10 · 42 km to go',
      },
    ])
  })

  it('Ready to watch: las carreras en curso, una fila con su cabecera y una tarjeta por etapa', () => {
    expect(blocks.ready).toHaveLength(1)
    const row = blocks.ready[0]!
    expect(row.header).toBe('Race France · 3 stages ready to watch')
    expect(row.ownRider).toBe(true)
    expect(row.cards.map((c) => c.text)).toEqual([
      'Stage 10 · 187 km · flat stage',
      'Stage 11 · 187 km · flat stage',
      'Stage 12 · 187 km · mountain stage',
    ])
    expect(row.cards[0]).toMatchObject({ raceId: 'race-france', stageDay: 10 })
  })

  it('While you were away: las terminadas, con lo que se puede hacer y sin repetirlas arriba (11-q)', () => {
    expect(blocks.away).toHaveLength(1)
    const away = blocks.away[0]!
    expect(away.header).toBe('Race Italy · 17 stages ready to watch')
    expect(away.continueFrom).toBe(5)
    expect(away.lastStage).toBe(21)
    // las que marca el perfil entre las veladas: reinas, cronos y la última
    expect(away.keyStages).toEqual([12, 15, 16, 18, 20, 21])
    expect(blocks.ready.some((r) => r.raceKey === 'race-italy:s0')).toBe(false)
  })

  it('el digest (8-b; 10a): los minutos de las veladas por su tipo y los cuadros, y su enlace desde la primera', () => {
    // de la 5 a la 21: doce llanas (60 s), tres reinas (150) y dos cronos (120), 1.410 s, más
    // (5 + 3) · 17 + 36 s de cuadros: 1.582 s, 26 min
    expect(blocks.away[0]!.digestMinutes).toBe(26)
    expect(watchHref('race-italy', 5, false, 'digest', 21)).toBe(
      '/world/races/race-italy/stages/5?tab=watch&view=digest&from=5&to=21',
    )
    // las etapas clave y las tarjetas, en Highlights
    expect(watchHref('race-italy', 12, false, 'highlights')).toBe(
      '/world/races/race-italy/stages/12?tab=watch&view=highlights',
    )
    // una carrera de un día: su ficha, que es su etapa (§11.17)
    expect(watchHref('race-flanders', 1, true, 'digest')).toBe(
      '/world/races/race-flanders?tab=watch&view=digest',
    )
  })

  it('una cuenta nueva ante una carrera de cabecera en curso: Race France is under way · Stage 10 of 21 · Watch from the start', () => {
    const fresh = homeBlocks(
      summary({
        ready: [
          {
            raceKey: 'race-france:s0',
            raceName: 'Race France',
            stages: Array.from({ length: 10 }, (_, i) => i + 1),
            reason: 'headline',
            expiresOnDay: 263,
          },
        ],
      }),
      [tour],
    )
    expect(fresh.ready[0]?.header).toBe(
      'Race France is under way · Stage 10 of 21 · Watch from the start',
    )
  })

  it('una carrera de un día: su tarjeta no numera la etapa', () => {
    const one = homeBlocks(
      summary({
        ready: [
          {
            raceKey: 'race-flanders:s0',
            raceName: 'Race Flanders',
            stages: [1],
            reason: 'follow',
            expiresOnDay: 151,
          },
        ],
      }),
      [flanders],
    )
    // terminada (la única etapa está velada): va a While you were away
    expect(one.ready).toEqual([])
    expect(one.away[0]?.header).toBe('Race Flanders · ready to watch')
    // su digest: una clásica (150 s) y sus cuadros, 3 min
    expect(one.away[0]?.digestMinutes).toBe(3)
  })

  it('sin el calendario todavía, nada: las tarjetas necesitan los km y el tipo', () => {
    const empty = homeBlocks(summary({ ready, watching }), [])
    expect(empty).toEqual({ watching: [], ready: [], away: [] })
  })
})

describe('la caducidad y la oferta adaptativa (§10.5, DD-16, 10-b)', () => {
  it('expiredNotices: una por carrera caducada, con los días reales desde su última etapa', () => {
    // el Giro: la 21 es el día 128 + 20 = 148 de la temporada 0; hoy, el 212: 64 días de juego, 16 reales
    const out = expiredNotices(
      summary({ expiredSinceLastVisit: ['race-italy:s0'] }),
      [giro],
      212,
      360,
    )
    expect(out).toEqual([
      {
        raceKey: 'race-italy:s0',
        raceId: 'race-italy',
        lastStage: 21,
        text: 'Results of Race Italy are now shown (finished 16 days ago)',
      },
    ])
  })

  it('adaptiveIgnored suma las de cabecera caducadas sin conocerse; las demás no cuentan', () => {
    expect(adaptiveIgnored([], ['race-italy:s0', 'race-x:s0'])).toEqual(['race-italy:s0'])
    expect(adaptiveIgnored(['race-italy:s0'], ['race-italy:s0', 'race-france:s0'])).toEqual([
      'race-italy:s0',
      'race-france:s0',
    ])
  })

  it(`adaptiveOfferDue: una vez, con ${SPOILER.adaptiveAskAfterRaces} ignoradas y el alcance guarded`, () => {
    const two = ['race-italy:s0', 'race-france:s0']
    expect(adaptiveOfferDue(two, false, 'guarded')).toBe(true)
    expect(adaptiveOfferDue(two.slice(0, 1), false, 'guarded')).toBe(false)
    expect(adaptiveOfferDue(two, true, 'guarded')).toBe(false)
    expect(adaptiveOfferDue(two, false, 'own_only')).toBe(false)
  })
})

describe('las órdenes de la N+1 (§11.12, DD-09)', () => {
  it('waitingStage: la primera etapa corrida y no conocida de la carrera; null si no hay', () => {
    const h = summary({
      ready: [
        {
          raceKey: 'race-france:s0',
          raceName: 'Race France',
          stages: [6, 7],
          reason: 'own_rider',
          expiresOnDay: 263,
        },
      ],
    })
    expect(waitingStage(h, 'race-france:s0')).toBe(6)
    expect(waitingStage(h, 'race-italy:s0')).toBeNull()
    expect(waitingStage(undefined, 'race-france:s0')).toBeNull()
  })
})

describe('la última carrera velada (§11.4; sups. H1 y H5)', () => {
  const ready = { raceName: 'Race France', stageDay: 8, stageCount: 21 }

  it('lastRaceReadyText: la carrera y la etapa; de un día, sin la etapa', () => {
    expect(lastRaceReadyText(ready)).toBe('Your last race · Race France, Stage 8 · Ready to watch')
    expect(lastRaceReadyText({ raceName: 'Race Sanremo', stageDay: 1, stageCount: 1 })).toBe(
      'Your last race · Race Sanremo · Ready to watch',
    )
  })

  it('readyRaceKey: la carrera de ese nombre con esa etapa en el velo; si no está, null', () => {
    const h = summary({
      ready: [
        {
          raceKey: 'race-france:s0',
          raceName: 'Race France',
          stages: [8, 9],
          reason: 'own_rider',
          expiresOnDay: 263,
        },
      ],
    })
    expect(readyRaceKey(h, ready)).toBe('race-france:s0')
    expect(readyRaceKey(h, { raceName: 'Race France', stageDay: 3 })).toBeNull()
    expect(readyRaceKey(undefined, ready)).toBeNull()
  })
})
