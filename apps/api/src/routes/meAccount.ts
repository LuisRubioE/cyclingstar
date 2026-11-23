import { hasBirthDate, setBirthDateOnce } from '@cyclingstar/db'
import {
  type MeAccountResponse,
  birthDateBodySchema,
  birthDateSchema,
  meAccountResponseSchema,
  okResponseSchema,
} from '@cyclingstar/shared'
import { badRequest, sendError, unauthorized } from '../http.js'
import type { RoutePlugin } from './context.js'

/**
 * LA CUENTA DEL JUGADOR (docs/cuenta.md §4.5; 4-f). Nacen en el PR 9 de E4:
 *
 * - `GET /api/me/account`: `{ ok, birthDateSet }`. La web la lee en `ProtectedRoute` para llevar a la
 *   puerta de la fecha, porque la fecha ya no viaja en la sesión (`returned: false`). El PR 11 le añade el
 *   resto de §12.1.
 * - `PUT /api/me/birth-date`: `{ birthDate }`, con `birthDateSchema`; escribe una vez (409 `already_set` si
 *   ya hay fecha) y con menos de 16, 400 `UNDER_MINIMUM_AGE` sin guardar nada. La rectificación la hace un
 *   administrador desde el panel (`PATCH /api/admin/users/:id`). Está fuera de la puerta de la fecha.
 *
 * Las dos piden sesión: una `cs_viewer` sola da 401.
 */
export const meAccountRoutes: RoutePlugin = async (app, { db }) => {
  app.get(
    '/api/me/account',
    { config: { response: { 200: meAccountResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const viewer = await request.viewer()
      if (viewer === null || viewer.readOnly) return unauthorized(reply)
      const set = await hasBirthDate(db, viewer.userId)
      if (set === null) return unauthorized(reply)
      return { ok: true, birthDateSet: set } satisfies MeAccountResponse
    },
  )

  app.put(
    '/api/me/birth-date',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const viewer = await request.viewer()
      if (viewer === null || viewer.readOnly) return unauthorized(reply)
      const body = birthDateBodySchema.safeParse(request.body)
      if (!body.success) return badRequest(reply)
      const fecha = birthDateSchema.safeParse(body.data.birthDate)
      if (!fecha.success)
        return badRequest(reply, fecha.error.issues[0]?.message ?? 'INVALID_BIRTH_DATE')
      const out = await setBirthDateOnce(db, viewer.userId, fecha.data)
      if (out === 'no_existe') return unauthorized(reply)
      if (out === 'already_set') return sendError(reply, 409, 'already_set')
      return { ok: true }
    },
  )
}
