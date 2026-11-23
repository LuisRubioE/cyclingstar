import { createHash } from 'node:crypto'
import { accountSummary, setBirthDateOnce } from '@cyclingstar/db'
import {
  type DeviceRow,
  type DevicesResponse,
  type MeAccountResponse,
  birthDateBodySchema,
  birthDateSchema,
  deviceLabel,
  devicesResponseSchema,
  meAccountResponseSchema,
  okResponseSchema,
} from '@cyclingstar/shared'
import type { FastifyRequest } from 'fastify'
import { badRequest, notFound, sendError, unauthorized } from '../http.js'
import { type RoutePlugin, toWebHeaders } from './context.js'

/**
 * El id de una sesión en `Devices` (docs/cuenta.md §6.4): 16 caracteres hex del SHA-256 del token. Identifica
 * la fila y no sirve como cookie.
 */
export const deviceId = (token: string): string =>
  createHash('sha256').update(token).digest('hex').slice(0, 16)

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
 *
 * Con el PR 11 (docs/cuenta.md §6.4, §6.5 y §12.1; 12-b), `GET /api/me/account` lleva los valores de la lista
 * de `Account`, y llegan los aparatos:
 *
 * - `GET /api/me/devices`: las sesiones de la cuenta (`auth.api.listSessions`), de la más reciente a la más
 *   vieja, con `deviceLabel` calculado aquí; sin IP, sin agente crudo y sin token (DD-06 A).
 * - `DELETE /api/me/devices/:id`: cierra otra sesión de la cuenta (`auth.api.revokeSession`), sin
 *   confirmación; 404 `no_encontrado` si el id no es de una sesión suya, 409 `usa_sign_out` si es la
 *   propia (6-b). Sus `push_targets` se borrarán antes cuando existan (PR 14; I-25).
 */
export const meAccountRoutes: RoutePlugin = async (app, { db, auth }) => {
  app.get(
    '/api/me/account',
    { config: { response: { 200: meAccountResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const viewer = await request.viewer()
      if (viewer === null || viewer.readOnly) return unauthorized(reply)
      const c = await accountSummary(db, viewer.userId)
      if (c === null) return unauthorized(reply)
      return {
        ok: true,
        email: c.email,
        joinedAt: c.joinedAt.toISOString(),
        birthDateSet: c.birthDateSet,
        passwordChangedAt: c.passwordChangedAt?.toISOString() ?? null,
        devices: c.devices,
        emailUndeliverableAt: c.emailUndeliverableAt?.toISOString() ?? null,
      } satisfies MeAccountResponse
    },
  )

  /** Las sesiones de la cuenta de la petición y el token de la propia, o null sin sesión. */
  async function sesionesDe(request: FastifyRequest) {
    const viewer = await request.viewer()
    if (viewer === null || viewer.readOnly) return null
    const headers = toWebHeaders(request)
    const propia = await auth.api.getSession({ headers })
    if (propia === null) return null
    const todas = await auth.api.listSessions({ headers })
    return { headers, token: propia.session.token, todas }
  }

  app.get(
    '/api/me/devices',
    { config: { response: { 200: devicesResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const s = await sesionesDe(request)
      if (s === null) return unauthorized(reply)
      const filas: DeviceRow[] = s.todas
        .map((x) => ({
          id: deviceId(x.token),
          label: deviceLabel(x.userAgent),
          current: x.token === s.token,
          createdAt: new Date(x.createdAt).toISOString(),
          lastActiveAt: new Date(x.updatedAt).toISOString(),
        }))
        .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
      return { ok: true, devices: filas } satisfies DevicesResponse
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/api/me/devices/:id',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const s = await sesionesDe(request)
      if (s === null) return unauthorized(reply)
      const objetivo = s.todas.find((x) => deviceId(x.token) === request.params.id)
      if (objetivo === undefined) return notFound(reply)
      if (objetivo.token === s.token) return sendError(reply, 409, 'usa_sign_out')
      await auth.api.revokeSession({ headers: s.headers, body: { token: objetivo.token } })
      return { ok: true }
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
