import {
  type TeamCalendar,
  type TeamCalendarRace,
  type TeamPlanRace,
  type TeamRacePlan,
  okResponseSchema,
  teamCalendarResponseSchema,
  teamRacePlanResponseSchema,
} from '@cyclingstar/shared'
import { request, requestOptionalAuth } from './request'

export type { TeamCalendar, TeamCalendarRace, TeamPlanRace, TeamRacePlan }

/** Draft de calendario del equipo. Sin sesión (401) no hay calendario; los 500 se propagan. */
export async function fetchTeamCalendar(): Promise<TeamCalendar | null> {
  const data = await requestOptionalAuth('/api/teams/me/calendar', teamCalendarResponseSchema, {
    errorMessage: 'Could not load your team calendar.',
  })
  return data?.calendar ?? null
}

/**
 * Plan de carreras del equipo al que pertenezco, en solo lectura. Null si no tengo equipo (o no
 * hay sesión): entonces `My Team` ni siquiera aparece en la barra.
 */
export async function fetchTeamRacePlan(): Promise<TeamRacePlan | null> {
  const data = await requestOptionalAuth('/api/teams/me/race-plan', teamRacePlanResponseSchema, {
    errorMessage: "Could not load your team's race plan.",
  })
  return data?.plan ?? null
}

export async function draftRace(raceId: string): Promise<void> {
  await request(`/api/teams/me/calendar/${raceId}`, okResponseSchema, {
    method: 'POST',
    errorMessage: 'Could not add the race to the plan.',
  })
}

export async function undraftRace(raceId: string): Promise<void> {
  await request(`/api/teams/me/calendar/${raceId}`, okResponseSchema, {
    method: 'DELETE',
    errorMessage: 'Could not remove the race from the plan.',
  })
}
