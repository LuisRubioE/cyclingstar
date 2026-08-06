import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import type { Auth } from '../auth.js'
import { AUTH_RATE_LIMIT, CREDENTIAL_AUTH_PATHS, CREDENTIAL_RATE_LIMIT } from '../security.js'
import { toWebHeaders } from './context.js'

export interface AuthProxyContext {
  auth: Auth
}

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
    const body = await response.text()
    return reply.send(body.length > 0 ? body : null)
  }

  // Rutas de credenciales: mismo handler, límite estricto contra la fuerza bruta (security.ts).
  // find-my-way resuelve la ruta estática antes que el comodín, así que el resto de endpoints de
  // better-auth sigue pasando por el comodín sin cambios.
  for (const url of CREDENTIAL_AUTH_PATHS) {
    app.post(url, { config: { rateLimit: CREDENTIAL_RATE_LIMIT } }, forwardToAuth)
  }

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    config: { rateLimit: AUTH_RATE_LIMIT },
    handler: forwardToAuth,
  })
}
