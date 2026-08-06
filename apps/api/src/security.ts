import { createHash, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { unauthorized } from './http.js'

/**
 * Límite GLOBAL por IP. Generoso a propósito: la web es una SPA servida desde el mismo origen, así
 * que una navegación normal encadena estáticos + varias llamadas a /api. Su función no es moldear
 * el uso legítimo sino cortar el escaneo y el scraping masivo.
 */
export const GLOBAL_RATE_LIMIT = { max: 300, timeWindow: '1 minute' } as const

/**
 * Límite del resto de /api/auth/* (sobre todo get-session, que la web consulta en cada navegación).
 */
export const AUTH_RATE_LIMIT = { max: 60, timeWindow: '1 minute' } as const

/**
 * Límite ESTRICTO de las rutas de credenciales de better-auth: es la superficie de fuerza bruta de
 * contraseñas y de enumeración de cuentas. 10 intentos cada 5 minutos por IP dejan sitio de sobra a
 * quien se equivoca al teclear y hacen inviable probar un diccionario.
 */
export const CREDENTIAL_RATE_LIMIT = { max: 10, timeWindow: '5 minutes' } as const

/**
 * Rutas de better-auth que reciben o cambian credenciales. Se registran explícitamente (además del
 * comodín /api/auth/*) solo para colgarles el límite estricto: find-my-way resuelve la ruta estática
 * antes que el comodín, así que el resto de endpoints de auth sigue por el comodín sin cambios.
 */
export const CREDENTIAL_AUTH_PATHS = [
  '/api/auth/sign-in/email',
  '/api/auth/sign-up/email',
  '/api/auth/forget-password',
  '/api/auth/reset-password',
  '/api/auth/change-password',
  '/api/auth/change-email',
] as const

/**
 * Compara dos cadenas en tiempo constante.
 *
 * `crypto.timingSafeEqual` exige buffers de la MISMA longitud (si no, lanza), así que comparar
 * directamente filtraría la longitud del secreto y obligaría a un `if` que vuelve a introducir
 * un cortocircuito temporal. Comparamos en su lugar los SHA-256 de ambas cadenas: siempre 32
 * bytes, así que el tiempo de respuesta no depende ni del contenido ni de la longitud.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a, 'utf8').digest()
  const digestB = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(digestA, digestB)
}

/**
 * Guarda de administrador: responde 401 y devuelve `false` cuando la petición no trae el
 * ADMIN_TOKEN correcto en la cabecera `x-admin-token`.
 */
export type AdminGuard = (request: FastifyRequest, reply: FastifyReply) => boolean

/**
 * Crea la guarda de admin para un ADMIN_TOKEN dado. Es el ÚNICO sitio donde se comprueba el token:
 * todas las rutas de admin (y el avance del mundo) pasan por aquí.
 *
 * Sin ADMIN_TOKEN configurado no hay administrador posible y la puerta queda cerrada (401), nunca
 * abierta: un despliegue mal configurado no debe exponer las operaciones destructivas.
 */
export function createAdminGuard(adminToken: string | undefined): AdminGuard {
  return (request, reply) => {
    const provided = request.headers['x-admin-token']
    const ok =
      typeof adminToken === 'string' &&
      adminToken.length > 0 &&
      typeof provided === 'string' &&
      timingSafeEqualString(provided, adminToken)
    if (!ok) {
      unauthorized(reply)
      return false
    }
    return true
  }
}
