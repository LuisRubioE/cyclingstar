import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { deriveKey, normalizeEmail } from './limitKeys.js'
import { DEVICE_COOKIE_DAYS, DEVICE_COOKIE_MAX_ACCOUNTS } from './security.js'
import { cookieValue } from './viewerCookie.js'

/**
 * `cs_device`: CÓMO NO SE CIERRA LA CUENTA DE OTRO (docs/cuenta.md §7.5; D-23; I-03).
 *
 * Hasta `DEVICE_COOKIE_MAX_ACCOUNTS` entradas separadas por `~`, cada una
 * `v1.<hmac del correo, 32>.<nonce, 16>.<firma, 43>`. La firma es el HMAC-SHA256 de
 * `v1.<hmac>.<nonce>.<userId>.<device_epoch>` con la clave `cs-device` (7-a). Ni el id ni el epoch
 * viajan: se leen de `users` al comprobar. El id va en la firma porque `device_epoch` vale 0 en toda
 * cuenta nueva: sin él, si un correo cambia de dueño, la entrada del dueño anterior valdría (7-l).
 * Subir el epoch invalida todas las entradas de esa cuenta (5-j).
 */
export const DEVICE_COOKIE = 'cs_device'

export interface DeviceEntry {
  readonly emailHash: string
  readonly nonce: string
  readonly sig: string
}

/** La cuenta contra la que se comprueba una entrada: la que hoy tiene ese correo. */
export interface DeviceOwner {
  readonly id: string
  readonly deviceEpoch: number
}

const ENTRADA = /^v1\.([A-Za-z0-9_-]{32})\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{43})$/

export interface DeviceCookies {
  /** Las entradas que trae la cabecera `Cookie`, sin comprobar; las que no tienen forma se ignoran. */
  read(cookieHeader: string | string[] | undefined): DeviceEntry[]
  /** La entrada de ese correo, si la hay y su firma vale para esa cuenta y su epoch de hoy. */
  validFor(
    entries: readonly DeviceEntry[],
    email: string,
    owner: DeviceOwner | null,
  ): DeviceEntry | null
  /**
   * La cabecera `Set-Cookie` con la entrada de ese correo nueva o renovada (al final: la sexta cuenta
   * saca a la más vieja, 7-e).
   */
  issue(entries: readonly DeviceEntry[], email: string, owner: DeviceOwner): string
}

export function createDeviceCookies(secret: string, secure: boolean): DeviceCookies {
  const clave = deriveKey(secret, 'cs-device')
  const mac = (texto: string): string =>
    createHmac('sha256', clave).update(texto).digest('base64url')
  const hashDe = (email: string): string => mac(`email.${normalizeEmail(email)}`).slice(0, 32)
  const firma = (emailHash: string, nonce: string, owner: DeviceOwner): string =>
    mac(`v1.${emailHash}.${nonce}.${owner.id}.${owner.deviceEpoch}`)
  const iguales = (a: string, b: string): boolean => {
    const x = Buffer.from(a)
    const y = Buffer.from(b)
    return x.length === y.length && timingSafeEqual(x, y)
  }
  const texto = (e: DeviceEntry): string => `v1.${e.emailHash}.${e.nonce}.${e.sig}`

  return {
    read(cookieHeader) {
      const valor = cookieValue(cookieHeader, DEVICE_COOKIE)
      if (valor === undefined || valor === '') return []
      const out: DeviceEntry[] = []
      for (const parte of valor.split('~')) {
        const m = ENTRADA.exec(parte)
        if (m?.[1] !== undefined && m[2] !== undefined && m[3] !== undefined) {
          out.push({ emailHash: m[1], nonce: m[2], sig: m[3] })
        }
      }
      return out.slice(-DEVICE_COOKIE_MAX_ACCOUNTS)
    },
    validFor(entries, email, owner) {
      if (owner === null) return null
      const h = hashDe(email)
      const entrada = entries.find((e) => e.emailHash === h)
      if (entrada === undefined) return null
      return iguales(entrada.sig, firma(h, entrada.nonce, owner)) ? entrada : null
    },
    issue(entries, email, owner) {
      const h = hashDe(email)
      const nonce = randomBytes(12).toString('base64url')
      const nueva: DeviceEntry = { emailHash: h, nonce, sig: firma(h, nonce, owner) }
      const todas = [...entries.filter((e) => e.emailHash !== h), nueva].slice(
        -DEVICE_COOKIE_MAX_ACCOUNTS,
      )
      return (
        `${DEVICE_COOKIE}=${todas.map(texto).join('~')}; Path=/api/auth; ` +
        `Max-Age=${DEVICE_COOKIE_DAYS * 86_400}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
      )
    },
  }
}
