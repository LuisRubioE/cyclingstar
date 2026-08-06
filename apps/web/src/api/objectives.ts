import { type RacePref, okResponseSchema, racePrefsResponseSchema } from '@cyclingstar/shared'
import { request, requestOptionalAuth } from './request'

export type { RacePref }

/** Objetivos de calendario del corredor. Sin sesión (401) no hay objetivos que mostrar. */
export async function fetchRacePrefs(): Promise<RacePref[]> {
  const data = await requestOptionalAuth('/api/riders/me/race-prefs', racePrefsResponseSchema, {
    errorMessage: 'Could not load your objectives.',
  })
  return data?.races ?? []
}

export async function setRacePref(raceId: string, wanted: boolean): Promise<void> {
  await request('/api/riders/me/race-prefs', okResponseSchema, {
    method: 'PUT',
    json: { raceId, wanted },
    errorMessage: 'Could not update your objectives.',
  })
}
