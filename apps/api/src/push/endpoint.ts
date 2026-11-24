/**
 * LA LISTA BLANCA DE LOS SERVICIOS DE PUSH (docs/cuenta.md §13.6; I-01, X-12, O-12, 13-j). `web-push` abre
 * TLS al host y al puerto de la URL sea cual sea el esquema, y sus errores serían un oráculo de puertos de la
 * red privada de Railway: solo se envía a los servicios de push de los navegadores. La lista es la de
 * `twilightstruggle` (`PUSH_HOSTS`, `ai/src/pvp/push.ts`): Google para Chrome y los suyos (también
 * `google.com`, que según su comentario usan los Chrome nuevos), Mozilla, Microsoft y Apple. Se comprueba al
 * guardar y otra vez al enviar, por las filas viejas.
 */
export const PUSH_ALLOWED_HOSTS = [
  'googleapis.com',
  'google.com',
  'push.services.mozilla.com',
  'notify.windows.com',
  'push.apple.com',
] as const

/** El largo máximo de un endpoint. */
export const PUSH_ENDPOINT_MAX = 1024

/**
 * Solo `https:`, puerto vacío o 443, sin usuario ni contraseña, como mucho 1.024 caracteres y con el host
 * igual a uno de la lista o acabado en `.` y uno de ellos.
 */
export function isAllowedPushEndpoint(raw: unknown): boolean {
  if (typeof raw !== 'string' || raw.length > PUSH_ENDPOINT_MAX) return false
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (url.port !== '' && url.port !== '443') return false
  if (url.username !== '' || url.password !== '') return false
  const host = url.hostname.toLowerCase()
  return PUSH_ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
}

/** Las claves de una suscripción, en base64url (como `validSubscription` de `twilightstruggle`). */
const B64URL = /^[A-Za-z0-9_-]+=*$/
export function isPushKey(raw: unknown, max: number): raw is string {
  return typeof raw === 'string' && raw.length <= max && B64URL.test(raw)
}
