/**
 * EL TRADUCTOR ÚNICO DE LOS FALLOS DE LA CUENTA (docs/cuenta.md §12.3; D-25). Lo usan todas las páginas de
 * entrada (`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`) y los formularios de
 * `Account`. Traduce por estado y por código; nunca pinta el `message` del servidor, que es de better-auth o
 * nuestro y no está escrito para el jugador (un 429 se pintaba como «contraseña mala», captura 35).
 */

/** Lo que trae el cuerpo de un fallo: el `code` de better-auth o el `error` de la API, y la espera del 429. */
export interface AuthErrorBody {
  readonly code?: string
  readonly error?: string
  readonly message?: string
  readonly retryAfterS?: number
}

/** Sin `retryAfterS` (el 429 del limitador de better-auth no lo trae), se espera un minuto. */
const ESPERA_POR_DEFECTO_S = 60

const SIN_RED = "Can't reach Cycling Star. Check your connection and try again."
const OTRO = 'Something went wrong. Try again in a minute.'
const ENLACE_GASTADO = 'This link has expired or has already been used.'

/** Los textos por código, fuera del 429 (§12.3). `null`: la página lo dice a su manera. */
const POR_CODIGO: Readonly<Record<string, string | null>> = {
  INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password.',
  INVALID_PASSWORD: "That's not your current password.",
  // el `Notice` de §5.3, con el correo del envío: lo pinta `Login`
  EMAIL_NOT_VERIFIED: null,
  // el `Notice` de §4.9, la cuenta que espera aprobación: lo pinta `Login`
  ACCOUNT_PENDING: null,
  PASSWORD_TOO_SHORT: 'Use at least 8 characters.',
  PASSWORD_TOO_LONG: 'Your password can be at most 128 characters.',
  INVALID_TOKEN: ENLACE_GASTADO,
  TOKEN_EXPIRED: ENLACE_GASTADO,
  // de PR siguientes (el presupuesto de correo, PR 7): el texto ya está, la lógica no
  MAIL_BUDGET_EXHAUSTED: "We can't send emails right now. Try again tomorrow.",
}

/** Los 429 con código propio (de PR siguientes: el bloqueo por cuenta, PR 6; la exportación, PR 12). */
const LIMITES: Readonly<Record<string, string>> = {
  ACCOUNT_LOCKED:
    'Too many failed attempts on this account. Try again in 15 minutes, or reset your password.',
  PASSWORD_ATTEMPTS_LOCKED: 'Too many wrong passwords. Try again in 15 minutes.',
  EXPORT_LIMIT: "You've downloaded your data 3 times today. Try again tomorrow.",
}

/** 45 da «45 seconds»; 60 da «1 minute»; 238 da «4 minutes» (los minutos, redondeados hacia arriba). */
export function waitText(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds))
  if (s < 60) return s === 1 ? '1 second' : `${s} seconds`
  const m = Math.ceil(s / 60)
  return m === 1 ? '1 minute' : `${m} minutes`
}

/** El porqué del botón deshabilitado tras un 429, que baja cada segundo: 238 da «You can try again in 3:58.» */
export function countdownText(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `You can try again in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.`
}

/** La espera de un 429, en segundos: la del argumento, la del cuerpo o la de por defecto. */
export function retryAfterOf(error: AuthErrorBody | null, retryAfterS: number | null): number {
  return retryAfterS ?? error?.retryAfterS ?? ESPERA_POR_DEFECTO_S
}

/** status 0 es «sin red». Devuelve el texto de la tabla; null si el caso no se pinta (redirige). */
export function authErrorText(
  error: AuthErrorBody | null,
  status: number,
  retryAfterS: number | null,
): string | null {
  if (status === 0) return SIN_RED
  const code = error?.code
  if (status === 429) {
    const propio = code !== undefined ? LIMITES[code] : undefined
    if (propio !== undefined) return propio
    // el de Fastify (`demasiadas_peticiones`) y el del limitador de better-auth, sin código
    return `Too many attempts from this connection. Try again in ${waitText(retryAfterOf(error, retryAfterS))}.`
  }
  if (code !== undefined && code in POR_CODIGO) return POR_CODIGO[code] ?? null
  return OTRO
}
