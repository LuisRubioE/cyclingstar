import { createHmac } from 'node:crypto'
import { SPOILER } from '@cyclingstar/shared'
import { timingSafeEqualString } from './security.js'

/**
 * LA COOKIE QUE SOLO RESTRINGE (E2, docs/retransmision.md §10.8; D-34, I-31; decisión 10-g; paso 7a).
 *
 * better-auth caduca la sesión a los siete días, y quien vuelve tras una semana llega sin sesión justo
 * cuando más resultados tiene por ver: sin sesión, `/news`, `/world` y los rankings son públicos y
 * cuentan quién ganó antes de que escriba la contraseña. `cs_viewer` lleva el id del jugador firmado con
 * HMAC-SHA256 y `SESSION_SECRET`, y con ella una petición sin sesión recibe el horizonte de ese jugador
 * EN LECTURA: se le vela lo que se le velaría con sesión, pero no escribe nada (las escrituras de
 * `/api/me` piden sesión) y ninguna ruta privada se abre con ella (`currentUserId` no la lee nunca). Si
 * dice un usuario que ya no existe, el horizonte es el del visitante.
 *
 * Formato versionado: `v1.<userId>.<emitida, s epoch>.<firma>`. No se cifra: lleva el id del propio
 * usuario, que no es secreto para quien tiene su dispositivo; lo que protege es la firma. La firma lleva
 * el prefijo `cs_viewer.` para separar este uso del secreto de los de better-auth. Se renueva como mucho
 * una vez al día (10-g): la firma lleva la hora, y firmarla en cada respuesta cambiaría la cabecera
 * `Cookie` en cada petición, y con `Vary: Cookie` el navegador no reutilizaría ningún tramo (§14.9).
 */

export const VIEWER_COOKIE = 'cs_viewer'
export const DAY_S = 86_400
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** `v1.<userId>.<emitida>.<firma>`; la firma es base64url(HMAC-SHA256(secret, 'cs_viewer.v1.<userId>.<emitida>')). */
export function signViewerCookie(userId: string, secret: string, nowS: number): string {
  const payload = `v1.${userId}.${Math.floor(nowS)}`
  return `${payload}.${mac(secret, payload)}`
}

/** El usuario si la cookie es de este servidor, tiene forma y no ha caducado; null en cualquier otro caso. Nunca lanza. */
export function readViewerCookie(
  raw: string | undefined | null,
  secret: string,
  nowS: number,
): { readonly userId: string; readonly issuedAtS: number } | null {
  if (raw == null || raw.length > 200) return null
  const parts = raw.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return null
  const [, userId = '', issued = '', signature = ''] = parts
  const issuedAtS = Number(issued)
  if (!UUID_RE.test(userId) || !/^\d+$/.test(issued) || !Number.isSafeInteger(issuedAtS))
    return null
  if (issuedAtS > nowS + 60 || nowS - issuedAtS > SPOILER.viewerCookieDays * DAY_S) return null
  return timingSafeEqualString(signature, mac(secret, `v1.${userId}.${issuedAtS}`))
    ? { userId, issuedAtS }
    : null
}

/** La cabecera Set-Cookie; con `null`, la que la borra (Max-Age=0). `HttpOnly` y `SameSite=Lax`, como la de sesión. */
export function viewerCookieHeader(value: string | null, secure: boolean): string {
  const base = `${VIEWER_COOKIE}=${value ?? ''}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
  return `${base}; Max-Age=${value === null ? 0 : SPOILER.viewerCookieDays * DAY_S}`
}

/** El valor de una cookie de la cabecera `Cookie`, o undefined. Sin decodificar: `cs_viewer` no lleva nada que haga falta. */
export function cookieValue(
  header: string | string[] | undefined,
  name: string,
): string | undefined {
  const all = Array.isArray(header) ? header.join('; ') : (header ?? '')
  for (const part of all.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return undefined
}

function mac(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(`cs_viewer.${payload}`).digest('base64url')
}
