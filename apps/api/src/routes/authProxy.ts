import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import type { Auth } from '../auth.js'
import { apiError } from '../http.js'
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
 * EL CUERPO FIJO DEL REGISTRO (docs/cuenta.md §5.3, 5-i). better-auth responde 200 también a un
 * correo que ya tiene cuenta, con un usuario inventado, pero el cuerpo lo delata: el id inventado es
 * el `generateId()` de 32 caracteres de better-auth y el de verdad el uuid de Postgres (36). Así que
 * todo 200 de `sign-up/email` sale con este cuerpo, igual byte a byte; la web solo lee `error`.
 */
const SIGN_UP_PATH = '/api/auth/sign-up/email'
export const SIGN_UP_OK_BODY = '{"token":null,"user":null}'

/** Lo que nunca lleva una ruta en su forma normal, en crudo o escapado (sin mirar mayúsculas). */
const RUTA_SOSPECHOSA = /\/\/|\/\.\/|\/\.\.\/|%2e|%2f|%5c/i

/**
 * ¿La ruta cruda de la petición está ya en su forma normal? (docs/cuenta.md §7.2, 7-j)
 *
 * find-my-way recibe la ruta tal cual y elige el límite por ella: `/api/auth/x/../sign-in/email` no
 * casaba con la ruta estática del límite estricto y caía en el comodín, y después `new URL(...)` la
 * normalizaba y better-auth atendía `sign-in/email` igual. Una ruta que no es igual a su
 * normalización, o que lleva `//`, `/./`, `/../`, `%2e`, `%2f` o `%5c`, no es de nadie: 404.
 */
export function isNormalAuthPath(rawUrl: string): boolean {
  const corte = rawUrl.indexOf('?')
  const ruta = corte === -1 ? rawUrl : rawUrl.slice(0, corte)
  if (RUTA_SOSPECHOSA.test(ruta)) return false
  try {
    return new URL(ruta, 'http://x').pathname === ruta
  } catch {
    return false
  }
}

/**
 * Montaje de better-auth en /api/auth/* (Paso 9). Reconstruye una Request web a partir de la
 * petición de Fastify y reenvía la respuesta, preservando las cookies de sesión.
 */
export const authProxyRoutes: FastifyPluginAsync<AuthProxyContext> = async (app, ctx) => {
  const { auth } = ctx

  // Antes del límite y del proxy: los ganchos del plugin van antes que los que @fastify/rate-limit
  // cuelga de cada ruta, así que el atajo ni gasta ni burla ningún contador.
  app.addHook('onRequest', async (request, reply) => {
    if (!isNormalAuthPath(request.raw.url ?? '')) {
      return reply.status(404).send(apiError('no_encontrado'))
    }
  })

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
      // La longitud la pone Fastify: el cuerpo puede cambiar aquí abajo.
      const nombre = key.toLowerCase()
      if (nombre === 'set-cookie' || nombre === 'content-length') continue
      reply.header(key, value)
    }
    for (const cookie of response.headers.getSetCookie()) {
      reply.header('set-cookie', cookie)
    }
    if (response.ok && CLEARS_VIEWER_COOKIE.has(url.pathname)) {
      reply.header('set-cookie', viewerCookieHeader(null, ctx.secureCookies ?? false))
    }
    const body = await response.text()
    if (response.status === 200 && url.pathname === SIGN_UP_PATH) {
      reply.header('content-type', 'application/json')
      return reply.send(SIGN_UP_OK_BODY)
    }
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
