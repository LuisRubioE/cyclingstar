import { type Database, reserveAttempt } from '@cyclingstar/db'
import type { LimitKeys } from './limitKeys.js'
import { ACCOUNT_PASSWORD_FAILS_DAY, SESSION_PASSWORD_FAILS } from './security.js'

/** El texto en inglés del 429 de L3; la web pone el suyo por `code` (§12.3). */
export const PASSWORD_ATTEMPTS_LOCKED_MESSAGE = 'Too many wrong passwords. Try again in 15 minutes.'

export type SessionPasswordReserve =
  | {
      readonly ok: true
      /** `pw:` y `pwu:`: se borran con la contraseña buena. */
      readonly keys: readonly [string, string]
      /** Los intentos de hoy de esta sesión, este incluido: al décimo fallo se cierra (7-k). */
      readonly dayCount: number
    }
  | {
      readonly ok: false
      readonly retryAfterS: number
      /** Pasó el tope diario de la sesión: quien llama la cierra y lo dice con `signedOut: true`. */
      readonly signedOut: boolean
    }

/**
 * L3, LA CONTRASEÑA CON UNA SESIÓN ABIERTA (docs/cuenta.md §7.4; 7-c, 7-k): reserva `pw:` (por sesión) y, si
 * pasa, `pwu:` (el techo por cuenta), ANTES de mirar la contraseña. La usan el proxy de `change-password` y
 * `delete-user` y `POST /api/me/export` (§10.5).
 */
export async function reserveSessionPassword(
  db: Database,
  keys: LimitKeys,
  session: { readonly id: string; readonly userId: string },
  now: Date,
): Promise<SessionPasswordReserve> {
  const porSesion = keys.pw(session.id)
  const porCuenta = keys.pwu(session.userId)
  const r = await reserveAttempt(db, porSesion, SESSION_PASSWORD_FAILS, now)
  if (!r.allowed) return { ok: false, retryAfterS: r.retryAfterS, signedOut: r.byDay }
  const c = await reserveAttempt(db, porCuenta, ACCOUNT_PASSWORD_FAILS_DAY, now)
  if (!c.allowed) return { ok: false, retryAfterS: c.retryAfterS, signedOut: false }
  return { ok: true, keys: [porSesion, porCuenta], dayCount: r.dayCount }
}

/** ¿Este fallo es el décimo del día de la sesión? Entonces se cierra (§7.4; 7-k). */
export function failureClosesSession(dayCount: number): boolean {
  return dayCount >= SESSION_PASSWORD_FAILS.dayMax
}
