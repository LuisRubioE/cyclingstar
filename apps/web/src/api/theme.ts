import { type Theme, type ThemeResponse, themeResponseSchema } from '@cyclingstar/shared'
import { request, requestOptionalAuth } from './request'

/** El modo guardado en la cuenta (E3, docs/visual.md §3.3, D-00i; paso 23), o null sin sesión. */
export async function getTheme(): Promise<ThemeResponse | null> {
  return requestOptionalAuth('/api/me/theme', themeResponseSchema, {
    errorMessage: 'Could not load your appearance.',
  })
}

/** Guarda el modo en la cuenta, para que siga al jugador de un aparato a otro. */
export async function putTheme(theme: Theme): Promise<ThemeResponse> {
  return request('/api/me/theme', themeResponseSchema, {
    method: 'PUT',
    json: { theme },
    errorMessage: 'Could not save your appearance.',
  })
}
