import { type AuthFailure, authCall } from './authCall'

/** La ruta del botón de `VerifyEmail` (docs/cuenta.md §5.2; 5-h). */
export const CONFIRM_EMAIL_PATH = '/api/account/verify-email'

/**
 * EL BOTÓN DE `VerifyEmail` (§5.2; 5-h): manda el token EN EL CUERPO de `POST /api/account/verify-email`,
 * nunca en la URL, para que no quede en los registros del borde. Al 200 la API deja la sesión en este
 * navegador; la página pregunta por ella antes de hablar. Devuelve null si fue bien o su fallo traducido
 * por `authErrorText` (el caducado y el malo, `This link has expired or has already been used.`).
 */
export function confirmEmail(
  token: string,
  doFetch: typeof fetch = fetch,
): Promise<AuthFailure | null> {
  return authCall(async () => {
    const res = await doFetch(CONFIRM_EMAIL_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (res.ok) return { error: null }
    let cuerpo: unknown = {}
    try {
      cuerpo = await res.json()
    } catch {
      // sin cuerpo: basta el estado
    }
    return { error: { ...(typeof cuerpo === 'object' ? cuerpo : {}), status: res.status } }
  })
}
