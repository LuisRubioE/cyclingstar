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
 * Rutas de better-auth que reciben o cambian credenciales, o que disparan un correo. Se registran explícitamente (además del
 * comodín /api/auth/*) solo para colgarles el límite estricto: find-my-way resuelve la ruta estática
 * antes que el comodín, así que el resto de endpoints de auth sigue por el comodín sin cambios.
 *
 * Aquí estaba `/api/auth/forget-password`, que en better-auth 1.6 YA NO EXISTE: la ruta se llama
 * `/request-password-reset`. El límite estricto protegía una puerta tapiada mientras la de verdad
 * —la que manda el correo— iba por el comodín, con el límite flojo.
 */
export const CREDENTIAL_AUTH_PATHS = [
  '/api/auth/sign-in/email',
  '/api/auth/sign-up/email',
  // Las dos que MANDAN CORREO. Sin límite estricto, una sola IP puede pedir mil enlaces de
  // recuperación contra mil direcciones: sondea qué cuentas existen, quema la reputación del
  // dominio en Resend y llena de correo buzones ajenos.
  '/api/auth/request-password-reset',
  '/api/auth/send-verification-email',
  '/api/auth/reset-password',
  '/api/auth/change-password',
  '/api/auth/change-email',
  // Comprueba la contraseña igual que el login: sin límite estricto sería otra puerta para
  // probarlas por fuerza bruta desde una sesión robada.
  '/api/auth/delete-user',
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
 * Quién ha pasado la guarda de admin. Importa para las salvaguardas del panel (nadie se quita el
 * permiso ni se borra a sí mismo), que sólo tienen sentido cuando hay una PERSONA detrás.
 */
export type AdminActor = { via: 'token' } | { via: 'session'; userId: string }

/**
 * Guarda de administrador: responde 401 y devuelve `null` cuando la petición no es de un admin;
 * si lo es, devuelve quién.
 */
export type AdminGuard = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<AdminActor | null>

/**
 * Crea la guarda de admin. Es el ÚNICO sitio donde se decide quién es administrador: todas las
 * rutas de admin (y el avance del mundo) pasan por aquí. Dos puertas:
 *
 *  - el ADMIN_TOKEN en `x-admin-token`, comparado en tiempo constante. Es la de las máquinas (el
 *    cron del tick, los scripts), que no tienen sesión;
 *  - una SESIÓN de usuario administrador (`sessionAdmin` devuelve su id, o null). Es la de las
 *    personas: el panel de la web ya no pide pegar un secreto en el navegador.
 *
 * Sin ADMIN_TOKEN configurado esa puerta queda cerrada (401), nunca abierta: un despliegue mal
 * configurado no debe exponer las operaciones destructivas.
 */
export function createAdminGuard(
  adminToken: string | undefined,
  sessionAdmin?: (request: FastifyRequest) => Promise<string | null>,
): AdminGuard {
  return async (request, reply) => {
    const provided = request.headers['x-admin-token']
    const tokenOk =
      typeof adminToken === 'string' &&
      adminToken.length > 0 &&
      typeof provided === 'string' &&
      timingSafeEqualString(provided, adminToken)
    if (tokenOk) return { via: 'token' }
    // Un token presente y malo NO cae a la sesión: quien lo manda está probando el token.
    if (typeof provided !== 'string' && sessionAdmin) {
      const userId = await sessionAdmin(request)
      if (userId) return { via: 'session', userId }
    }
    unauthorized(reply)
    return null
  }
}
