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

export async function fetchRace(raceId: string): Promise<RaceView> {
  return request(`/api/calendar/${raceId}`, raceViewSchema, {
    errorMessage: 'Could not load the race.',
  })
}

export async function fetchStartlist(raceId: string): Promise<RaceStartlist> {
  return request(`/api/calendar/${raceId}/startlist`, raceStartlistSchema, {
    errorMessage: 'Could not load the startlist.',
  })
}
