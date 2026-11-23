import { verifyEmailResponseSchema } from '@cyclingstar/shared'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { type Auth, VERIFY_EMAIL_PATH } from '../auth.js'
import { badRequest } from '../http.js'
import { AUTH_RATE_LIMIT } from '../security.js'
import { toWebHeaders } from './context.js'

/**
 * `POST /api/account/verify-email` (docs/cuenta.md §5.2; 5-h, 8-l): el botón de `VerifyEmail` manda aquí
 * el token, EN EL CUERPO. La ruta arma dentro del proceso el `GET /api/auth/verify-email?token=…` de
 * better-auth, sin `callbackURL`, se lo pasa a `auth.handler` y devuelve su JSON y su `Set-Cookie`: con
 * `autoSignInAfterVerification` la sesión queda en el navegador que pulsó. Así el token, que abre sesión,
 * no cruza el borde de Railway en una URL.
 *
 * Lo que responde better-auth 1.7.27 sin `callbackURL` (`email-verification.mjs`): 200
 * `{ status: true, user: null }` al confirmar (con la cookie de sesión) y también con una cuenta ya
 * confirmada (sin cookie: el token usado no vuelve a abrir sesión); 401 `{ code: 'TOKEN_EXPIRED' }` o
 * `{ code: 'INVALID_TOKEN' }` con el token caducado o malo; 401 `USER_NOT_FOUND` si la cuenta ya no está.
 *
 * Por eso `/verify-email` no entra nunca en `disabledPaths` (auth.ts): la cerraría también para esta
 * llamada. La ruta queda fuera de `/api/auth/*`, de su lista blanca y de su proxy. Un cuerpo JSON pide
 * `content-type: application/json`, que otro sitio no puede mandar sin la comprobación previa de CORS.
 */

const bodySchema = z.object({ token: z.string().min(1).max(4096) })

export const accountVerifyRoutes: FastifyPluginAsync<{ auth: Auth }> = async (app, { auth }) => {
  app.post(
    '/api/account/verify-email',
    {
      config: {
        rateLimit: AUTH_RATE_LIMIT,
        response: { 200: verifyEmailResponseSchema },
        spoiler: 'safe',
      },
    },
    async (request, reply) => {
      const body = bodySchema.safeParse(request.body)
      if (!body.success) return badRequest(reply)
      const url = new URL(`/api/auth${VERIFY_EMAIL_PATH}`, `${request.protocol}://${request.host}`)
      url.searchParams.set('token', body.data.token)
      const headers = toWebHeaders(request)
      headers.delete('content-type')
      const response = await auth.handler(new Request(url, { method: 'GET', headers }))
      for (const cookie of response.headers.getSetCookie()) reply.header('set-cookie', cookie)
      reply.status(response.status)
      let cuerpo: unknown = null
      try {
        cuerpo = JSON.parse(await response.text())
      } catch {
        // sin JSON (no debería pasar sin `callbackURL`): solo el estado
      }
      if (response.status === 200) return { status: true }
      // el fallo, solo con su código: la web lo traduce con `authErrorText` (§12.3)
      const code =
        typeof cuerpo === 'object' && cuerpo !== null && 'code' in cuerpo
          ? String(cuerpo.code)
          : 'INVALID_TOKEN'
      return reply.send({ code })
    },
  )
}
