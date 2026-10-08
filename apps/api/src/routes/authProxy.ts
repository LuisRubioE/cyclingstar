import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import type { Auth } from '../auth.js'
import { AUTH_RATE_LIMIT, CREDENTIAL_AUTH_PATHS, CREDENTIAL_RATE_LIMIT } from '../security.js'
import { viewerCookieHeader } from '../viewerCookie.js'
import { toWebHeaders } from './context.js'

export interface AuthProxyContext {
  auth: Auth
  /** APP_URL va por https: la cookie que se borra lleva Secure, como la que se puso (E2, §10.8). */
  secureCookies?: boolean
}

/**
 * Las salidas explícitas de la cuenta, que además borran `cs_viewer`, la cookie que solo restringe
 * (E2, docs/retransmision.md §10.8; D-34; paso 7a). La caducidad de la sesión NO la borra: es justo el
 * caso para el que existe.
 */
const CLEARS_VIEWER_COOKIE: ReadonlySet<string> = new Set([
  '/api/auth/sign-out',
  '/api/auth/delete-user',
])

/**
 * Montaje de better-auth en /api/auth/* (Paso 9). Reconstruye una Request web a partir de la
 * petición de Fastify y reenvía la respuesta, preservando las cookies de sesión.
 */
export const authProxyRoutes: FastifyPluginAsync<AuthProxyContext> = async (app, ctx) => {
  const { auth } = ctx

  const forwardToAuth = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const url = new URL(request.url, `${request.protocol}://${request.host}`)
    const init: RequestInit = { method: request.method, headers: toWebHeaders(request) }
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
    if (hasBody && request.body != null) {
      init.body = JSON.stringify(request.body)
    }
    const webRequest = new Request(url, init)

    const response = await auth.handler(webRequest)

    reply.status(response.status)
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() === 'set-cookie') continue
      reply.header(key, value)
    }
    for (const cookie of response.headers.getSetCookie()) {
      reply.header('set-cookie', cookie)
    }
    if (response.ok && CLEARS_VIEWER_COOKIE.has(url.pathname)) {
      reply.header('set-cookie', viewerCookieHeader(null, ctx.secureCookies ?? false))
    }
    const body = await response.text()
    return reply.send(body.length > 0 ? body : null)
  }

  // Rutas de credenciales: mismo handler, límite estricto contra la fuerza bruta (security.ts).
  // find-my-way resuelve la ruta estática antes que el comodín, así que el resto de endpoints de
  // better-auth sigue pasando por el comodín sin cambios.
  for (const url of CREDENTIAL_AUTH_PATHS) {
    app.post(url, { config: { rateLimit: CREDENTIAL_RATE_LIMIT, spoiler: 'safe' } }, forwardToAuth)
  }

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    config: { rateLimit: AUTH_RATE_LIMIT, spoiler: 'safe' },
    handler: forwardToAuth,
  })
}
