import {
  type AwayResponse,
  type OkResponse,
  type WelcomeBackResponse,
  awayResponseSchema,
  okResponseSchema,
  welcomeBackResponseSchema,
} from '@cyclingstar/shared'
import { request, requestOptionalAuth } from './request'

/**
 * LA AUSENCIA (docs/cuenta.md §14; PR 13 de E4). `GET /api/me/away` la piden `AwayBand` (una vez por carga
 * con la sesión), `Away` y la fila de `Account`, con la misma clave; `Welcome back`, la suya.
 */
export const AWAY_KEY = ['me-away'] as const
export const WELCOME_BACK_KEY = ['me-welcome-back'] as const

/** La ausencia viva y los datos de las líneas de `Away`, o null sin sesión. */
export async function getAway(): Promise<AwayResponse | null> {
  return requestOptionalAuth('/api/me/away', awayResponseSchema, {
    errorMessage: 'Could not load your away time.',
  })
}

/**
 * Declara la ausencia o cambia su fecha (`PUT /api/me/away`): `until`, las 00:00 locales del día elegido.
 * Lanza `ApiError` con `fecha_fuera_de_rango` si la vuelta queda fuera de la ventana.
 */
export async function putAway(until: string): Promise<AwayResponse> {
  return request('/api/me/away', awayResponseSchema, {
    method: 'PUT',
    json: { until },
    errorMessage: 'Could not set your away time.',
  })
}

/** `End now` (`DELETE /api/me/away`). */
export async function deleteAway(): Promise<OkResponse> {
  return request('/api/me/away', okResponseSchema, {
    method: 'DELETE',
    errorMessage: 'Could not end your away time.',
  })
}

/** `Welcome back`, o null sin sesión. */
export async function getWelcomeBack(): Promise<WelcomeBackResponse | null> {
  return requestOptionalAuth('/api/me/welcome-back', welcomeBackResponseSchema, {
    errorMessage: 'Could not load what happened while you were away.',
  })
}

/** Cierra `Welcome back` (`DELETE /api/me/welcome-back`). */
export async function deleteWelcomeBack(): Promise<OkResponse> {
  return request('/api/me/welcome-back', okResponseSchema, {
    method: 'DELETE',
    errorMessage: 'Could not close this notice.',
  })
}
