import {
  type DevicesResponse,
  type MeAccountResponse,
  type OkResponse,
  type SignOutOthersResponse,
  devicesResponseSchema,
  meAccountResponseSchema,
  okResponseSchema,
  signOutOthersResponseSchema,
} from '@cyclingstar/shared'
import { request, requestOptionalAuth } from './request'

/**
 * LA CUENTA (docs/cuenta.md §4.5; PR 9 de E4): si ya dio su fecha de nacimiento, o null sin sesión. La lee
 * `ProtectedRoute` para llevar a la puerta de la fecha; la fecha no viaja en la sesión (4-f).
 */
export async function getMeAccount(): Promise<MeAccountResponse | null> {
  return requestOptionalAuth('/api/me/account', meAccountResponseSchema, {
    errorMessage: 'Could not load your account.',
  })
}

/**
 * Da la fecha, una vez (`PUT /api/me/birth-date`). Lanza `ApiError` con su código: `UNDER_MINIMUM_AGE`,
 * `INVALID_BIRTH_DATE` o `already_set`.
 */
export async function putBirthDate(birthDate: string): Promise<OkResponse> {
  return request('/api/me/birth-date', okResponseSchema, {
    method: 'PUT',
    json: { birthDate },
    errorMessage: 'Could not save your date of birth.',
  })
}

/** Las sesiones de la cuenta (`GET /api/me/devices`, docs/cuenta.md §6.4): sin IP, agente ni token. */
export async function getDevices(): Promise<DevicesResponse> {
  return request('/api/me/devices', devicesResponseSchema, {
    errorMessage: 'Could not load your devices.',
  })
}

/** Cierra otra sesión de la cuenta (`DELETE /api/me/devices/:id`, §6.5); la propia da 409 `usa_sign_out`. */
export async function deleteDevice(id: string): Promise<OkResponse> {
  return request(`/api/me/devices/${encodeURIComponent(id)}`, okResponseSchema, {
    method: 'DELETE',
    errorMessage: 'Could not sign out of that device.',
  })
}

/**
 * Cierra todas las otras sesiones (`POST /api/auth/devices/sign-out-others`, §6.5; 6-c, 6-g). Bajo `/api/auth`
 * para que el navegador mande la `cs_device` y reciba la reemitida.
 */
export async function signOutOthers(): Promise<SignOutOthersResponse> {
  return request('/api/auth/devices/sign-out-others', signOutOthersResponseSchema, {
    method: 'POST',
    json: {},
    errorMessage: 'Could not sign out of your other devices.',
  })
}

/** Quita este navegador de la `cs_device` (`POST /api/auth/devices/forget`, §6.5; 6-h). No cierra la sesión. */
export async function forgetDevice(): Promise<OkResponse> {
  return request('/api/auth/devices/forget', okResponseSchema, {
    method: 'POST',
    json: {},
    errorMessage: 'Could not forget this device.',
  })
}
