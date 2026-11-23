import { createHmac, hkdfSync } from 'node:crypto'

/**
 * LAS CLAVES DERIVADAS DE `SESSION_SECRET` (docs/cuenta.md §7.3 y §7.5; 7-a): una por uso, con HKDF y su
 * etiqueta, para que la firma de `cs_device` y los HMAC de `auth_limits` no compartan clave con la
 * sesión ni entre ellos.
 */
export function deriveKey(secret: string, label: 'cs-auth-limits' | 'cs-device'): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, '', label, 32))
}

/** Correo normalizado: `trim` y minúsculas (§7.3). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Las claves de `auth_limits` (§7.3): un prefijo y el HMAC-SHA256 de su valor. La tabla no guarda un
 * correo, ni siquiera los que no existen: un SHA-256 sin secreto se invierte con un diccionario.
 */
export interface LimitKeys {
  /** L1: intentos de entrar contra un correo, desde navegadores sin `cs_device` válida. */
  acct(email: string): string
  /** L2: intentos desde un aparato conocido, por el nonce de su entrada de `cs_device`. */
  dev(nonce: string): string
  /** L3, por sesión (7-k). */
  pw(sessionId: string): string
  /** L3, el techo por cuenta (7-k). */
  pwu(userId: string): string
  /** L4: las rutas de correo, por IP (o su /64). */
  mailip(ipBucket: string): string
}

export function limitKeys(secret: string): LimitKeys {
  const clave = deriveKey(secret, 'cs-auth-limits')
  const h = (prefijo: string, valor: string): string =>
    `${prefijo}:${createHmac('sha256', clave).update(valor).digest('base64url')}`
  return {
    acct: (email) => h('acct', normalizeEmail(email)),
    dev: (nonce) => h('dev', nonce),
    pw: (sessionId) => h('pw', sessionId),
    pwu: (userId) => h('pwu', userId),
    mailip: (ip) => h('mailip', ip),
  }
}
