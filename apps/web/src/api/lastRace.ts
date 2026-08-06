/**
 * Informe personal de la última carrera (qué ordené vs qué pasó). El servidor reconstruye la
 * crónica desde el snapshot sellado; aquí solo hablamos HTTP: las frases están en `domain/narration`
 * y las traducciones de rol/mentalidad en `domain/labels`.
 */

import {
  type RaceReportEvent,
  type RaceReportOrders,
  type RiderRaceReport,
  lastRaceResponseSchema,
} from '@cyclingstar/shared'
import { requestOptionalAuth } from './request'

export type { RaceReportEvent, RaceReportOrders, RiderRaceReport }

/** Sin sesión (401) no hay informe: null. Cualquier otro fallo se propaga. */
export async function fetchLastRace(): Promise<RiderRaceReport | null> {
  const data = await requestOptionalAuth('/api/riders/me/last-race', lastRaceResponseSchema, {
    errorMessage: 'Could not load your last race.',
  })
  return data?.report ?? null
}
