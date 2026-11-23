import {
  type MeAccountResponse,
  type OkResponse,
  meAccountResponseSchema,
  okResponseSchema,
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
