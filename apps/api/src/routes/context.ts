import type { Database, TickSummary } from '@cyclingstar/db'
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
  /** Guarda de ADMIN_TOKEN en tiempo constante; responde 401 y devuelve false si no cuadra. */
  requireAdmin: AdminGuard
}

/** Contexto de las rutas de admin: no necesitan sesión de usuario, solo base de datos y token. */
export interface AdminRouteContext {
  db: Database
  requireAdmin: AdminGuard
  onAdminTick?: () => Promise<TickSummary>
  onAdminAdvance?: (days: number) => Promise<TickSummary>
}

/** Un plugin de rutas de dominio. */
export type RoutePlugin = FastifyPluginAsync<RouteContext>

/** Construye el lector de sesión que comparten todas las rutas autenticadas. */
export function createCurrentUserId(
  auth: Auth,
): (request: FastifyRequest) => Promise<string | null> {
  return async (request) => {
    const session = await auth.api.getSession({ headers: toWebHeaders(request) })
    return session?.user.id ?? null
  }
}
