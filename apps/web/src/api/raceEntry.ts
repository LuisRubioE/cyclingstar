import {
  type EnterableRace,
  enterableRacesResponseSchema,
  okResponseSchema,
} from '@cyclingstar/shared'
import { request, requestOptionalAuth } from './request'

export type { EnterableRace }

/**
 * Carreras a las que el corredor puede inscribirse. Sin sesión (401) la lista es vacía; un 500 SÍ
 * se propaga (antes cualquier `!res.ok` devolvía [] y ocultaba los errores del servidor).
 */
export async function fetchEnterableRaces(): Promise<EnterableRace[]> {
  const data = await requestOptionalAuth(
    '/api/riders/me/race-entries',
    enterableRacesResponseSchema,
    { errorMessage: 'Could not load the races you can enter.' },
  )
  return data?.races ?? []
}

export async function enterRace(raceId: string): Promise<void> {
  await request(`/api/riders/me/race-entries/${raceId}`, okResponseSchema, {
    method: 'POST',
    errorMessage: 'Could not enter the race.',
  })
}

export async function withdrawRace(raceId: string): Promise<void> {
  await request(`/api/riders/me/race-entries/${raceId}`, okResponseSchema, {
    method: 'DELETE',
    errorMessage: 'Could not withdraw from the race.',
  })
}
