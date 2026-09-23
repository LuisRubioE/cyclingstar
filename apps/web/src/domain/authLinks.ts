/**
 * Lectura de los enlaces que llegan POR CORREO.
 *
 * Los dos flujos nuevos terminan en una redirección del servidor a la web con la respuesta en la
 * query: `/reset-password?token=…` o `?error=INVALID_TOKEN`, y `/verify-email` con `?error=…` o sin
 * nada cuando ha ido bien. Leer eso es lógica pura, así que vive aquí y no dentro de una página:
 * un enlace caducado es lo MÁS probable que reciba un usuario (los de better-auth duran una hora)
 * y es justo el caso que no se puede probar a mano.
 */

/** Lo que dice un enlace de correo: sirve, no sirve, o trae el permiso (token) para seguir. */
export type LinkOutcome =
  | { kind: 'ok' }
  | { kind: 'approved' }
  | { kind: 'token'; token: string }
  | { kind: 'error'; message: string }

/**
 * Traducción de los códigos que devuelve better-auth. El mensaje crudo (`INVALID_TOKEN`) no le
 * dice nada a nadie; lo que hace falta es saber QUÉ HACER ahora.
 */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'TOKEN_EXPIRED':
      return 'That link has expired — they are only valid for one hour. Ask for a new one.'
    case 'INVALID_TOKEN':
      return 'That link is not valid any more. Ask for a new one.'
    case 'USER_NOT_FOUND':
      return 'That account no longer exists.'
    case 'EMAIL_ALREADY_VERIFIED':
      return 'That email was already confirmed. You can log in.'
    case 'INVALID_USER':
      return 'That link belongs to a different account. Log out and open it again.'
    default:
      return 'That link did not work. Ask for a new one.'
  }
}

/**
 * Enlace de recuperación de contraseña. El servidor redirige con `?token=…` cuando el enlace vale
 * y con `?error=…` cuando no; llegar sin ninguno de los dos (alguien que teclea la URL a mano) no
 * es un caso válido y se trata como enlace inservible, no como formulario vacío.
 */
export function readResetLink(search: string): LinkOutcome {
  const params = new URLSearchParams(search)
  const error = params.get('error')
  if (error) return { kind: 'error', message: authErrorMessage(error) }
  const token = params.get('token')
  if (token) return { kind: 'token', token }
  return { kind: 'error', message: 'Open this page from the link in your email.' }
}

/**
 * Vuelta de la verificación del correo. Aquí SÍ es válido llegar sin parámetros: el servidor
 * redirige limpio cuando la verificación ha salido bien.
 *
 * `?step=approved` es la vuelta del PRIMER enlace de un cambio de correo (el que llega a la
 * dirección vieja): el cambio está aprobado pero NO hecho, falta abrir el que acaba de salir hacia
 * la nueva. El servidor fija ese destino (ver `CHANGE_APPROVED_PATH` en la API). Un error manda
 * sobre el paso: better-auth lo añade detrás (`?step=approved&error=…`) si el enlace ya no valía.
 */
export function readVerificationLink(search: string): LinkOutcome {
  const params = new URLSearchParams(search)
  const error = params.get('error')
  if (error) return { kind: 'error', message: authErrorMessage(error) }
  return params.get('step') === 'approved' ? { kind: 'approved' } : { kind: 'ok' }
}
