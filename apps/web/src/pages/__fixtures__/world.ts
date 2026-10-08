/**
 * LO QUE LOS TESTS DE RENDER DEL 9b PONEN EN LA CACHÉ (E2, docs/retransmision.md §11.4 a §11.17; §16.6: sin
 * DOM, `renderToStaticMarkup` con la caché ya llena). La ficha de una carrera (`RaceView`), `/health` con
 * sus interruptores y el horizonte de quien mira. No lleva ninguna consulta: solo datos.
 */
import {
  BROADCAST,
  type BroadcastHead,
  type Health,
  type HorizonSummary,
  type RaceStagePlan,
  type RaceView,
  type SwitchMode,
} from '@cyclingstar/shared'

/** `/health` con los dos interruptores. */
export function healthWith(
  broadcastWatch: SwitchMode,
  spoilerMode: SwitchMode,
  gameDay = 200,
): Health {
  return {
    ok: true,
    engineVersion: 91,
    gameDay,
    migrationsApplied: true,
    tickIntervalMinutes: 360,
    features: { broadcastWatch, spoilerMode },
  }
}

/** El horizonte de un espectador con el velo (`rev` de espectador) y lo que se le pase. */
export function horizonWith(over: Partial<HorizonSummary> = {}): HorizonSummary {
  return {
    rev: '200.1',
    scope: 'guarded',
    ready: [],
    watching: [],
    expiredSinceLastVisit: [],
    revealConfirm: true,
    ...over,
  }
}

function stagePlan(index: number, kind: string): RaceStagePlan {
  return {
    index,
    name: `Stage ${index}`,
    label: kind === 'clasica' ? 'Classic' : 'Flat',
    kind,
    km: kind === 'clasica' ? 260 : 180,
    timeTrial: false,
    from: null,
    to: null,
    altimetry: '<svg/>',
    routeSource: 'real',
    edicion: 1,
    arch: null,
    cambiosRespectoAnterior: [],
  }
}

/** La ficha de una carrera: de un día (`stageCount` 1) o por etapas, con lo que se le pase encima. */
export function raceViewWith(stageCount: number, over: Partial<RaceView> = {}): RaceView {
  const oneDay = stageCount === 1
  return {
    race: {
      id: oneDay ? 'race-sanremo' : 'race-france',
      name: oneDay ? 'Race Sanremo' : 'Race France',
      level: 'WT',
      raceClass: 'WT',
      format: oneDay ? 'un-dia' : 'gran-vuelta',
      stageCount,
      country: oneDay ? 'IT' : 'FR',
      startDay: oneDay ? 79 : 185,
      routeSource: 'real',
    },
    dayOfSeason: 200,
    status: 'finished',
    runDays: Array.from({ length: stageCount }, (_, i) => i + 1),
    stages: Array.from({ length: stageCount }, (_, i) =>
      stagePlan(i + 1, oneDay ? 'clasica' : 'llana'),
    ),
    restAfter: [],
    gc: [],
    points: [],
    kom: [],
    teamGc: [],
    leaders: { gc: null, points: null, kom: null, team: null },
    stageWinners: [],
    history: [],
    ...over,
  }
}

/** La cabecera de la retransmisión de una etapa con línea grabada (la de `stageTables.test.tsx`, 9a). */
export function broadcastHeadWith(
  raceId: string,
  day: number,
  over: Partial<BroadcastHead> = {},
): BroadcastHead {
  const strip = { altM: [0, 100], climbs: [], sprintsKm: [], laps: 1 }
  const weather = { tempC: 18, rain: 0, spans: [] }
  return {
    stage: {
      raceKey: `${raceId}:s0`,
      raceId,
      day,
      name: `Stage ${day}`,
      km: 187,
      kind: 'reina',
      timeTrial: false,
      label: 'Summit finish',
      lengthKm: 187,
      dx: 0.1,
      blocks: 1870,
    },
    profile: strip,
    weather,
    cast: [],
    startState: { leaders: { gc: null, points: null, kom: null }, gcTop: [], racingAtStart: 0 },
    pace: [...BROADCAST.pace],
    estimateS: 540,
    clock: 'exact',
    source: 'timeline',
    preview: { route: strip, weather, jerseysInPlay: [], favourites: [] },
    view: { reachedS: null, known: false },
    gate: null,
    tt: null,
    tplRev: 1,
    ...over,
  }
}
