import {
  type GcRow,
  type PointsEntry,
  type RaceHonour,
  type RaceStagePlan,
  type RaceStartlist,
  type RaceStatus,
  type RaceView,
  type StageWinner,
  type StartlistRider,
  type StartlistTeam,
  type TeamClassEntry,
  raceStartlistSchema,
  raceViewSchema,
} from '@cyclingstar/shared'
import { horizonKey } from '../queryClient'
import { request } from './request'

export type {
  GcRow,
  PointsEntry,
  RaceHonour,
  RaceStagePlan,
  RaceStartlist,
  RaceStatus,
  RaceView,
  StageWinner,
  StartlistRider,
  StartlistTeam,
  TeamClassEntry,
}

/**
 * Días que faltan para la salida (negativo si ya salió); null si aún no hay mundo y por tanto no hay
 * un "hoy" contra el que medir.
 */
export function daysUntilStart(view: RaceView): number | null {
  if (view.dayOfSeason == null) return null
  return view.race.startDay - view.dayOfSeason
}

/**
 * Último día de juego de la carrera: sus etapas más los días de descanso intercalados. Con
 * `race.startDay` da el rango de fechas de la cabecera.
 */
export function endDay(view: RaceView): number {
  return view.race.startDay + view.race.stageCount + view.restAfter.length - 1
}

/**
 * La ficha de una carrera. Con `diag`, el `?diag=1` del modo diagnóstico (E2, docs/retransmision.md §11.15,
 * 11-h; la API lo acepta desde el 8a y la web lo reenvía desde el 9b): un administrador con sesión la
 * recibe con el horizonte del mundo; para cualquier otro la API lo ignora.
 */
export async function fetchRace(
  raceId: string,
  opts: { readonly diag?: boolean } = {},
): Promise<RaceView> {
  return request(`/api/calendar/${raceId}${opts.diag === true ? '?diag=1' : ''}`, raceViewSchema, {
    errorMessage: 'Could not load the race.',
  })
}

/**
 * La clave de la ficha de carrera (§10.9): con `diag`, para que la del modo diagnóstico no sirva nunca la
 * vista normal ni al revés, y el `rev` del horizonte al final (9b): con la etapa vista o revelada, la ficha
 * se pide otra vez ya con ella.
 */
export function raceViewKey(
  raceId: string,
  diag: boolean,
  rev: string | undefined,
): readonly unknown[] {
  return horizonKey(['race', raceId, diag], rev)
}

export async function fetchStartlist(raceId: string): Promise<RaceStartlist> {
  return request(`/api/calendar/${raceId}/startlist`, raceStartlistSchema, {
    errorMessage: 'Could not load the startlist.',
  })
}
