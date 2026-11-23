import type { Database, ProgressMemory, TickSummary } from '@cyclingstar/db'
import { SESSION_MAX_AGE_DAYS } from '@cyclingstar/shared'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import type { Auth } from '../auth.js'
import type { AdminGuard } from '../security.js'

/** Convierte las cabeceras de una petición Fastify en un objeto Headers estándar. */
export function toWebHeaders(request: FastifyRequest): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (key.toLowerCase() === 'content-length') continue
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v)
    } else if (value != null) {
      headers.append(key, value)
    }
  }
  return headers
}

/**
 * Lo que cada plugin de rutas recibe como opciones de registro. Sustituye a las clausuras sobre
 * `deps` que tenía el monolito de app.ts: mismas dependencias, pero explícitas y tipadas.
 */
export interface RouteContext {
  db: Database
  auth: Auth
  /** Id del usuario de la sesión (better-auth), o null si la petición no trae sesión válida. */
  currentUserId: (request: FastifyRequest) => Promise<string | null>
  /** Guarda de admin (token o sesión de administrador); responde 401 y devuelve null si no. */
  requireAdmin: AdminGuard
  /**
   * La memoria de lo alcanzado de este proceso (E2, D-55, §10.3; paso 7a): la escriben los informes de
   * `POST /api/me/watch` y la vacía la meta (`POST …/broadcast/finish`); el 7b la lee para el tope de
   * los tramos. Una por app, con el umbral de `PROGRESS_MIN_DELTA_S`.
   */
  progress: ProgressMemory
}

/** Contexto de las rutas de admin: base de datos y la guarda (que ya resuelve token o sesión). */
export interface AdminRouteContext {
  db: Database
  requireAdmin: AdminGuard
  /** Correo del administrador raíz (ADMIN_EMAIL), para marcarlo en el panel. */
  rootEmail?: string
  onAdminTick?: () => Promise<TickSummary>
  onAdminAdvance?: (days: number) => Promise<TickSummary>
}

/** Un plugin de rutas de dominio. */
export type RoutePlugin = FastifyPluginAsync<RouteContext>

/**
 * ¿Pasó la sesión su techo de `SESSION_MAX_AGE_DAYS` desde que se abrió? (docs/cuenta.md §6.1; I-11)
 * better-auth la renueva con cada día de uso sin límite; una cookie robada no debe vivir más de un
 * trimestre aunque se use cada día.
 */
export function isPastSessionCeiling(createdAt: Date | string, now: number = Date.now()): boolean {
  return now - new Date(createdAt).getTime() > SESSION_MAX_AGE_DAYS * 86_400_000
}

/** Borra una sesión por su token, como hace better-auth al cerrarla. */
export async function deleteSessionByToken(auth: Auth, token: string): Promise<void> {
  const contexto = await auth.$context
  await contexto.internalAdapter.deleteSession(token)
}

/**
 * Construye el lector de sesión que comparten todas las rutas autenticadas. Una sesión que pasó su
 * techo cuenta como ninguna y se borra (el otro sitio que lo aplica es el proxy de `get-session`).
 */
export function createCurrentUserId(
  auth: Auth,
): (request: FastifyRequest) => Promise<string | null> {
  return async (request) => {
    const session = await auth.api.getSession({ headers: toWebHeaders(request) })
    if (!session) return null
    // Los dobles de better-auth de los tests de rutas solo traen `user`: sin sesión no hay techo.
    const sesion = session.session as typeof session.session | undefined
    if (sesion && isPastSessionCeiling(sesion.createdAt)) {
      await deleteSessionByToken(auth, sesion.token)
      return null
    }
    return session.user.id
  }
}
