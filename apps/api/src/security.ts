import { createHash, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { clientIp, ipBucket } from './clientIp.js'
import { unauthorized } from './http.js'

/**
 * Límite GLOBAL por IP. Generoso a propósito: la web es una SPA servida desde el mismo origen, así
 * que una navegación normal encadena estáticos + varias llamadas a /api. Su función no es moldear
 * el uso legítimo sino cortar el escaneo y el scraping masivo.
 */
export const GLOBAL_RATE_LIMIT = { max: 300, timeWindow: '1 minute' } as const

/**
 * EL LÍMITE DEL REPRODUCTOR (E2, docs/retransmision.md §14.5, decisión 14-q): el `config.rateLimit`
 * propio de `GET …/broadcast/chunk` (3a) y de `POST /api/me/watch/:raceKey/:day` (7a). `@fastify/rate-limit` da
 * a una ruta con límite propio su contador EN LUGAR del global, así que el reproductor no gasta el cupo
 * de la navegación ni al revés. En un modo rápido un espectador pide de 33 a 60 veces por etapa, y los
 * que salen por la misma IP (una casa, un operador con CGNAT) compartirían el contador. Con sesión, por
 * usuario: veinte veces el peor minuto de un espectador (58, §14.3), con sitio para reanudar y varios
 * dispositivos, y aun así corta un cliente en bucle (S/E de los jueces). Sin sesión, por IP y con el
 * cupo del global. Un 429 lleva `retry-after`, que el reproductor espera con `Loading` (§10.12).
 */
export const PLAYER_USER_MAX_PER_MINUTE = 1_200
export const PLAYER_RATE_LIMIT = {
  timeWindow: '1 minute',
  keyGenerator: async (request: FastifyRequest): Promise<string> => {
    const v = await request.viewer() // memorizado por petición: la ruta lo usa después
    return v !== null && !v.readOnly ? `u:${v.userId}` : `ip:${ipBucket(clientIp(request))}`
  },
  max: (_request: FastifyRequest, key: string): number =>
    key.startsWith('u:') ? PLAYER_USER_MAX_PER_MINUTE : GLOBAL_RATE_LIMIT.max,
} as const

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
 * LOS LÍMITES POR CUENTA, APARATO, SESIÓN E IP, EN POSTGRES (docs/cuenta.md §7.4 y §16.1; D-24; 7-k).
 * Los aplica el proxy de `/api/auth/*` reservando ANTES de reenviar (`reserveAttempt`, §7.3).
 */
/** L1: 10 intentos en 15 minutos contra un correo desde navegadores sin `cs_device` válida; sin tope diario. */
export const ACCOUNT_FAILS = { windowS: 900, max: 10, dayMax: null, lockS: 900 } as const
/** L2: el aparato conocido también tiene techo, 10 en 15 minutos y 30 al día. */
export const DEVICE_FAILS = { windowS: 900, max: 10, dayMax: 30, lockS: 900 } as const
/** L3 por sesión: 5 en 15 minutos y 10 al día; al décimo del día se cierra esa sesión. */
export const SESSION_PASSWORD_FAILS = { windowS: 900, max: 5, dayMax: 10, lockS: 900 } as const
/** L3 por cuenta: el techo de quien reparte intentos entre sesiones, 30 al día. */
export const ACCOUNT_PASSWORD_FAILS_DAY = {
  windowS: 86_400,
  max: 30,
  dayMax: null,
  lockS: 900,
} as const
/** L4: las rutas que mandan correo, 20 al día por IP (o por su /64). */
export const MAIL_ROUTES_PER_IP_DAY = {
  windowS: 86_400,
  max: 20,
  dayMax: null,
  lockS: 900,
} as const

/** Vida de `cs_device`: sobrevive a `Sign out` (§7.5; D-23). */
export const DEVICE_COOKIE_DAYS = 180
/** Cuentas por navegador en `cs_device`; la sexta saca a la más vieja (7-e). */
export const DEVICE_COOKIE_MAX_ACCOUNTS = 5

/**
 * LA LISTA BLANCA DE `/api/auth/*` (docs/cuenta.md §8.1; D-29, I-06, O-21, 8-a): las once rutas de
 * better-auth que sirve el proxy. Todo lo demás bajo `/api/auth/*` da 404 sin llegar a better-auth, y
 * better-auth lo cierra otra vez con `disabledPaths` (auth.ts). Ningún plugin ni ruta nueva entra sin
 * decidirlo aquí. `:token` es un segmento cualquiera.
 */
export const AUTH_ALLOWED_PATHS = [
  { method: 'POST', path: '/sign-up/email' },
  { method: 'POST', path: '/sign-in/email' },
  { method: 'GET', path: '/get-session' },
  { method: 'POST', path: '/sign-out' },
  { method: 'GET', path: '/verify-email' },
  { method: 'POST', path: '/send-verification-email' },
  { method: 'POST', path: '/request-password-reset' },
  { method: 'GET', path: '/reset-password/:token' },
  { method: 'POST', path: '/reset-password' },
  { method: 'POST', path: '/change-password' },
  { method: 'POST', path: '/delete-user' },
] as const satisfies readonly { method: 'GET' | 'POST'; path: string }[]

/** ¿Sirve el proxy esta ruta? `ruta` es la de después de `/api/auth`, ya normalizada y sin `?`. */
export function isAllowedAuthPath(method: string, ruta: string): boolean {
  return AUTH_ALLOWED_PATHS.some((r) => {
    if (r.method !== method) return false
    if (!r.path.includes('/:')) return r.path === ruta
    const base = r.path.slice(0, r.path.indexOf('/:') + 1)
    return ruta.startsWith(base) && /^[^/]+$/.test(ruta.slice(base.length))
  })
}

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
