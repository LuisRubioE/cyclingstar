/**
 * EL EDITOR DEL MAILLOT (E3, docs/visual.md §8.7; PR 18b): lo que `KitPicker` pide a las tres rutas del
 * 18a. Todas las respuestas se validan con los esquemas compartidos.
 */

import {
  type KitCode,
  type KitSaveBody,
  type KitVerdict,
  type TeamKitResponse,
  kitSaveResponseSchema,
  kitVerdictSchema,
  teamKitResponseSchema,
} from '@cyclingstar/shared'
import { request } from './request'

export type { KitSaveBody, KitVerdict, TeamKitResponse }

/** El vigente, el programado, el culote, los cambios que quedan, lo que se tacha y los ocho rivales. */
export async function fetchMyKit(): Promise<TeamKitResponse> {
  return request('/api/teams/me/kit', teamKitResponseSchema, {
    errorMessage: 'Could not load your kit.',
  })
}

/** El veredicto de un maillot, que es la autoridad: el editor lo pide a los 300 ms del último toque. */
export async function checkMyKit(kit: KitCode): Promise<KitVerdict> {
  return request('/api/teams/me/kit/check', kitVerdictSchema, {
    method: 'POST',
    json: { kit },
    errorMessage: "Couldn't check this kit.",
  })
}

/**
 * Guarda el maillot (desde mañana), el culote (en el acto) o los dos. Lanza `ApiError` con el código del
 * servidor: `kit_reciente` llega con el suyo y sin `retry-after` (8-v), y su día lo vuelve a dar el GET.
 */
export async function saveMyKit(body: KitSaveBody): Promise<{ validFromDay: number | null }> {
  const data = await request('/api/teams/me/kit', kitSaveResponseSchema, {
    method: 'PUT',
    json: body,
    errorMessage: 'save_failed',
  })
  return { validFromDay: data.validFromDay }
}
