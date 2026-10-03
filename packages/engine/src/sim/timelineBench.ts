/**
 * LO QUE COMPARTEN LOS TESTS DEL GRABADOR (E2, docs/retransmision.md §16.2 y §16.4; paso 4b): la
 * entrada de una etapa del banco, su semilla, un reparto con la forma del de producción y la etapa
 * corrida con el grabador enganchado como lo engancha `packages/db` (el colector aparte de §5.3). Lo
 * usan `sim/timeline.test.ts` (los bancos: B11, I1, I2, I3, I5, B2, B6 y B21) y la prueba de humo de
 * `stage/probeHooks.test.ts`, que corre en la suite rápida.
 *
 * No es código de producción: nadie lo exporta por el índice. Vive aquí, como `scenarios.ts`, porque
 * el motor no puede importar de `packages/db` y los dos tests necesitan la misma envoltura.
 */
import type {
  Block,
  CastRider,
  StageTimeline,
  TimelineCast,
  TimelineEvent,
} from '@cyclingstar/shared'
import { photoBlocksOf } from '@cyclingstar/shared'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { stageSeed } from '../stage/rng.js'
import { stageLengthKm } from '../stage/sample.js'
import { simulateStage } from '../stage/simulate.js'
import type { StageInput, StageOutput, StageProbe } from '../stage/types.js'
import { type RaceRadio, raceRadioCollector, radioKmPoints } from './raceRadio.js'
import { realRaceScenario } from './scenarios.js'
import {
  type TimelineRecorder,
  freezeStageWeather,
  profileStripOf,
  timelineRecorder,
} from './timeline.js'

/**
 * La entrada de una etapa del calendario, como la de los bancos: `realRaceScenario` (176 corredores
 * iguales en 22 equipos) más el `timeTrial` del calendario, que `realRaceScenario` no pone y sin el que
 * una crono se correría en línea sobre un perfil de crono (Rcodigo-030).
 */
export function inputOf(raceId: string, day: number): StageInput {
  const stage = SEASON_CALENDAR.find((r) => r.id === raceId)?.stages.find((s) => s.index === day)
  if (stage === undefined) throw new Error(`banco: no existe ${raceId} e${day}`)
  const { input } = realRaceScenario(raceId, day)
  return stage.timeTrial === true ? { ...input, timeTrial: true } : input
}

/** La semilla de los bancos de E2: la de B11 (`b11-0` y `b11-1`), que el 4a ya usó para la identidad. */
export const seedOf = (raceId: string, day: number, s: number): string =>
  stageSeed({ worldSeed: `b11-${s}`, raceId, stageDay: day, engineVersion: ENGINE_VERSION })

const COUNTRIES = ['ES', 'FR', 'IT', 'BE', 'NL', 'CO', 'GB', 'DE', 'US', 'AU', 'DK', 'SI']

/**
 * UN REPARTO CON LA FORMA DEL DE PRODUCCIÓN (§4.2 `TimelineCast`). El de verdad lo arma `packages/db`
 * con `buildTimelineCast` en el paso 5 (D-15); aquí hace falta uno para cerrar la línea y para que B6
 * pese lo que pesará: cada corredor con dorsal, equipo, país y su salida en la general (inventada de
 * forma determinista a partir de la segunda etapa, porque el campo homogéneo sale sin general), los
 * tres primeros con el maillot de líder, del cuarto al décimo con su línea de general, y tres favoritos.
 */
export function benchCast(input: StageInput, raceId: string, day: number): TimelineCast {
  const teams: { teamId: string; jerseySeed: string }[] = []
  const teamIx = new Map<string, number>()
  const from = day > 1 ? { raceKey: `${raceId}:s0`, stageDay: day - 1 } : null
  const riders = input.riders.map((x, rider): CastRider => {
    let team: number | null = null
    if (x.teamId != null) {
      team = teamIx.get(x.teamId) ?? null
      if (team === null) {
        team = teams.length
        teamIx.set(x.teamId, team)
        teams.push({ teamId: x.teamId, jerseySeed: `${x.teamId}:kit` })
      }
    }
    const rank = rider + 1
    const deficitS = from === null ? null : rank === 1 ? 0 : 7 * rank + ((rank * 37) % 53)
    const jersey = (['gc', 'points', 'kom'] as const)[rider]
    return {
      rider,
      riderId: x.riderId,
      bib: x.bib ?? rank,
      team,
      country: COUNTRIES[rider % COUNTRIES.length]!,
      gender: 'M',
      start: {
        gcRank: from === null ? null : rank,
        gcDeficitS: deficitS,
        from,
      },
      worn:
        from !== null && jersey !== undefined
          ? { kind: 'leader', jersey, delegated: false, from }
          : { kind: 'team' },
      distinctions:
        from !== null && rank > 3 && rank <= 10 && deficitS !== null
          ? [{ kind: 'gc', rank, deficitS, from }]
          : [],
      knownWins: rider % 7 === 0 ? 2 : 0,
    }
  })
  return {
    riders,
    teams,
    favourites: [0, 1, 2].map((rider) => ({ rider, why: 'climb' as const })),
  }
}

/** Cuántas veces se llamó a cada gancho de la sonda. */
export interface HookCalls {
  snapshot: number
  event: number
  banner: number
  ride: number
}

/** Una grabación en marcha: la sonda que se le pasa al motor y lo que hace falta para cerrarla. */
export interface Recording {
  readonly probe: StageProbe
  readonly recorder: TimelineRecorder
  readonly calls: HookCalls
  readonly blocks: number
  readonly lengthKm: number
  /** Cierra la línea con la salida de la etapa: la radio del colector, el reparto, el recorrido y el tiempo. */
  close(output: StageOutput): { readonly radio: RaceRadio | null; readonly timeline: StageTimeline }
}

/** Una etapa corrida con el grabador enganchado. */
export interface RecordedStage {
  readonly input: StageInput
  readonly seed: string
  readonly output: StageOutput
  readonly recorder: TimelineRecorder
  readonly radio: RaceRadio | null
  readonly calls: HookCalls
  readonly blocks: number
  readonly lengthKm: number
  /** La línea cerrada, con el reparto de `benchCast`, el recorrido de `profileStripOf` y el tiempo de `freezeStageWeather`. */
  readonly timeline: StageTimeline
}

/**
 * EL GRABADOR ENGANCHADO como lo hace `startStageTimeline` (§5.3): la foto de CADA bloque al grabador,
 * y las de los bloques de radioKmPoints además a la radio, que es la que da la capa de detalle al
 * cerrar. Los ganchos van al grabador de verdad, sin envoltura que capture sus fallos: un error suyo
 * pone el test en rojo.
 */
export function startRecording(
  raceId: string,
  day: number,
  input: StageInput,
  seed: string,
): Recording {
  const lengthKm = stageLengthKm(input.profile)
  const blocks = Math.round(lengthKm / STAGE.dx)
  const radioBlocks: ReadonlySet<Block> = new Set(photoBlocksOf(lengthKm, STAGE.dx))
  const timeTrial = input.timeTrial === true
  const recorder = timelineRecorder({
    blocks,
    dx: STAGE.dx,
    lengthKm,
    timeTrial,
    radioBlocks,
    riderIds: input.riders.map((r) => r.riderId),
  })
  const radio = raceRadioCollector(radioKmPoints(lengthKm))
  const blockOf = (km: number): Block =>
    Math.max(0, Math.min(blocks - 1, Math.round(km / STAGE.dx - 0.5)))
  const calls: HookCalls = { snapshot: 0, event: 0, banner: 0, ride: 0 }
  const probe: StageProbe = {
    atKm: Array.from({ length: blocks }, (_, b) => (b + 0.5) * STAGE.dx),
    onSnapshot: (km, riders, mainId) => {
      calls.snapshot++
      if (radioBlocks.has(blockOf(km))) radio.probe.onSnapshot(km, riders, mainId)
      recorder.onSnapshot(km, riders, mainId)
    },
    onEvent: (e, b) => {
      calls.event++
      recorder.onEvent(e, b)
    },
    onBanner: (x) => {
      calls.banner++
      recorder.onBanner(x)
    },
    onTimeTrialRide: (x) => {
      calls.ride++
      recorder.onTimeTrialRide(x)
    },
  }
  return {
    probe,
    recorder,
    calls,
    blocks,
    lengthKm,
    close: (output) => {
      const stageRadio = timeTrial ? null : radio.radio({ incidents: output.incidents })
      const timeline = recorder.finish({
        input,
        output,
        radio: stageRadio,
        cast: benchCast(input, raceId, day),
        profile: profileStripOf(input.profile, { raceId, stageDay: day }),
        weather: freezeStageWeather(input, seed),
      })
      return { radio: stageRadio, timeline }
    },
  }
}

/** CORRE LA ETAPA CON EL GRABADOR (`startRecording`) y cierra la línea. */
export function recordStage(
  raceId: string,
  day: number,
  input: StageInput,
  seed: string,
): RecordedStage {
  const rec = startRecording(raceId, day, input, seed)
  const output = simulateStage(input, seed, rec.probe)
  const { radio, timeline } = rec.close(output)
  return {
    input,
    seed,
    output,
    recorder: rec.recorder,
    radio,
    calls: rec.calls,
    blocks: rec.blocks,
    lengthKm: rec.lengthKm,
    timeline,
  }
}

/** Un uuid determinista (la forma de los ids de producción, 36 caracteres) a partir de un texto. */
function uuidOf(text: string): string {
  const words: string[] = []
  for (let salt = 0; salt < 4; salt++) {
    let h = 0x811c9dc5 ^ salt
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
    words.push((h >>> 0).toString(16).padStart(8, '0'))
  }
  const hex = words.join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

/**
 * LA LÍNEA CON LOS IDS DE PRODUCCIÓN, para pesarla (B6). Los corredores y los equipos del banco se
 * llaman `uni-12` y `eq-3`; en producción son uuid de 36 caracteres que gzip no comprime y que van dos
 * veces (en `riderIds` y en el reparto) y en los `datos` de los sucesos, así que pesar la línea del
 * banco tal cual la daría hasta un 10 % más ligera de lo que se guarda (§5.7). Cambia cada id por un
 * uuid determinista y no toca nada más.
 */
export function withProductionIds(tl: StageTimeline): StageTimeline {
  const ids = new Map<string, string>()
  for (const id of tl.riderIds) ids.set(id, uuidOf(`rider:${id}`))
  for (const t of tl.cast.teams) ids.set(t.teamId, uuidOf(`team:${t.teamId}`))
  const swap = (x: string): string => ids.get(x) ?? x
  const datosOf = (d: TimelineEvent['datos']): TimelineEvent['datos'] =>
    d === null
      ? null
      : Object.fromEntries(
          Object.entries(d).map(([k, v]) => [k, typeof v === 'string' ? swap(v) : v]),
        )
  return {
    ...tl,
    riderIds: tl.riderIds.map(swap),
    events: tl.events.map((e) => ({ ...e, datos: datosOf(e.datos) })),
    cast: {
      ...tl.cast,
      riders: tl.cast.riders.map((c) => ({ ...c, riderId: swap(c.riderId) })),
      teams: tl.cast.teams.map((t) => ({
        teamId: swap(t.teamId),
        jerseySeed: uuidOf(`kit:${t.teamId}`),
      })),
    },
  }
}
