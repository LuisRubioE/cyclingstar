import type { FastifyRequest, FastifyServerOptions } from 'fastify'

/**
 * LOS LOGS SIN ENLACES DE CUENTA (E4, docs/cuenta.md §10.3; D-37; PR 4).
 *
 * Cada línea `incoming request` de pino llevaba la URL entera: el JWT de verificación (cuyo cuerpo
 * es el correo en base64url), el token de recuperación en `/reset-password/<token>` y `callbackURL`.
 * Quien leyera los logs podía usar un enlace vivo o sacar el correo. Aquí se tapan esos valores antes
 * de escribir; la IP se queda entera, porque es lo que permite investigar un ataque, y Privacy lo dice.
 */

export const REDACTED = '[redacted]'

/** Parámetros cuyo valor no se escribe nunca. Además, cualquiera cuyo nombre contenga `email`. */
const SECRET_PARAMS: ReadonlySet<string> = new Set(['token', 'callbackurl'])

function isSecretParam(name: string): boolean {
  const n = name.toLowerCase()
  return SECRET_PARAMS.has(n) || n.includes('email')
}

/**
 * La URL de la petición (ruta y consulta, sin origen) con los secretos tapados: el valor de
 * `token`, `callbackURL` y de todo parámetro con `email` en el nombre, y el segmento que sigue a
 * `/reset-password/`. Lo que no se entiende se devuelve sin consulta, que es donde viven los
 * secretos: un log no puede ser la vía por la que se escapen.
 */
export function redactUrl(url: string): string {
  const q = url.indexOf('?')
  const path = (q === -1 ? url : url.slice(0, q)).replace(
    /(\/reset-password\/)[^/?#]+/gi,
    `$1${REDACTED}`,
  )
  if (q === -1) return path
  const query = url.slice(q + 1).split('#')[0] ?? ''
  const parts = query.split('&').map((pair) => {
    const eq = pair.indexOf('=')
    const rawName = eq === -1 ? pair : pair.slice(0, eq)
    let name = rawName
    try {
      name = decodeURIComponent(rawName.replace(/\+/g, ' '))
    } catch {
      return REDACTED
    }
    return isSecretParam(name) && eq !== -1 ? `${rawName}=${REDACTED}` : pair
  })
  return `${path}?${parts.join('&')}`
}

/** El serializador de la petición: método, URL tapada y dirección remota. Nada de cabeceras. */
export function serializeRequest(req: FastifyRequest): {
  method: string
  url: string
  remoteAddress: string | undefined
} {
  return { method: req.method, url: redactUrl(req.url), remoteAddress: req.ip }
}

/** Las opciones del logger de la API, con el serializador de arriba. */
export function loggerOptions(
  level: string,
  extra: { stream?: { write(msg: string): void } } = {},
): FastifyServerOptions['logger'] {
  return {
    level,
    serializers: { req: serializeRequest as (req: unknown) => unknown },
    ...(extra.stream ? { stream: extra.stream } : {}),
  } as FastifyServerOptions['logger']
}
