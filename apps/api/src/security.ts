import { createHash, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { unauthorized } from './http.js'

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
