import { createHash } from 'node:crypto'
import {
  type AccountExportData,
  accountExportData,
  accountSummary,
  clearAttempts,
  reserveAttempt,
  setBirthDateOnce,
} from '@cyclingstar/db'
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
import type { FastifyReply, FastifyRequest } from 'fastify'
import { badRequest, notFound, sendError, unauthorized } from '../http.js'
import { limitKeys } from '../limitKeys.js'
import {
  PASSWORD_ATTEMPTS_LOCKED_MESSAGE,
  failureClosesSession,
  reserveSessionPassword,
} from '../passwordAttempts.js'
import { AUTH_RATE_LIMIT, EXPORT_RULE, SESSION_PASSWORD_FAILS } from '../security.js'
import { type RoutePlugin, deleteSessionByToken, toWebHeaders } from './context.js'

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
/**
 * EL FICHERO DE `POST /api/me/export` (docs/cuenta.md §10.5; D-39, 10-f, 10-g). Sin la contraseña ni su hash,
 * los tokens de sesión, la IP (no se guarda), las claves de `auth_limits` ni el contenido de `admin_audit`.
 */
export interface AccountExport extends AccountExportData {
  exportedAt: string
  devices: DeviceRow[]
  /** Aparatos con avisos, sin la dirección ni las claves del servicio de push. `[]` fijo hasta el PR 14, que crea `push_targets` (10-g). */
  notificationDevices: {
    id: string
    channel: 'webpush' | 'fcm' | 'apns'
    label: string
    createdAt: string
    lastOkAt: string | null
  }[]
}

/** Las sesiones de better-auth como filas de `Devices` (§6.4), de la más reciente a la más vieja. */
function deviceRows(
  todas: readonly {
    token: string
    userAgent?: string | null | undefined
    createdAt: Date
    updatedAt: Date
  }[],
  propia: string,
): DeviceRow[] {
  return todas
    .map((x) => ({
      id: deviceId(x.token),
      label: deviceLabel(x.userAgent),
      current: x.token === propia,
      createdAt: new Date(x.createdAt).toISOString(),
      lastActiveAt: new Date(x.updatedAt).toISOString(),
    }))
    .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
}

/** Un fallo de exportar, con el `code` que traduce la web (§12.3) y, en los 429, su espera. */
function exportFailure(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  extra: { retryAfterS?: number; signedOut?: true } = {},
): FastifyReply {
  if (extra.retryAfterS !== undefined) reply.header('retry-after', String(extra.retryAfterS))
  return reply.status(status).send({ ok: false, error: code, code, message, ...extra })
}

export const meAccountRoutes: RoutePlugin = async (app, { db, auth }) => {
  // Las claves de `auth_limits` salen del mismo secreto que el proxy (7-a); sin él (dobles de better-auth),
  // las de un secreto fijo, como allí.
  const secreto = (auth as { options?: { secret?: unknown } }).options?.secret
  const keys = limitKeys(typeof secreto === 'string' ? secreto : 'sin-secreto')

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
      return { ok: true, devices: deviceRows(s.todas, s.token) } satisfies DevicesResponse
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

  /**
   * `POST /api/me/export` con `{ password }` (docs/cuenta.md §10.5; D-39): reserva L3 (`pw:` y `pwu:`) antes de
   * mirar la contraseña, que comprueba `auth.api.verifyPassword` desde el servidor. Mala, 400
   * `INVALID_PASSWORD` y el intento queda contado (al décimo del día de la sesión, se cierra: 429 con
   * `signedOut`). Buena, L3 a cero y se reserva `exp:` (`EXPORTS_PER_DAY`; la cuarta, 429 `EXPORT_LIMIT`).
   * Responde el JSON como adjunto y sin caché. Fuera de la puerta de la fecha (`BIRTH_DATE_GATE_EXEMPT`).
   */
  app.post(
    '/api/me/export',
    { config: { rateLimit: AUTH_RATE_LIMIT, spoiler: 'safe' } },
    async (request, reply) => {
      const viewer = await request.viewer()
      if (viewer === null || viewer.readOnly) return unauthorized(reply)
      const headers = toWebHeaders(request)
      const sesion = await auth.api.getSession({ headers })
      if (sesion === null) return unauthorized(reply)
      const cuerpo: unknown = request.body
      const password =
        typeof cuerpo === 'object' && cuerpo !== null && 'password' in cuerpo
          ? cuerpo.password
          : undefined
      if (typeof password !== 'string' || password === '') return badRequest(reply)

      const ahora = new Date()
      const l3 = await reserveSessionPassword(
        db,
        keys,
        { id: sesion.session.id, userId: sesion.user.id },
        ahora,
      )
      if (!l3.ok) {
        if (l3.signedOut) await deleteSessionByToken(auth, sesion.session.token)
        return exportFailure(
          reply,
          429,
          'PASSWORD_ATTEMPTS_LOCKED',
          PASSWORD_ATTEMPTS_LOCKED_MESSAGE,
          {
            retryAfterS: l3.retryAfterS,
            ...(l3.signedOut ? { signedOut: true as const } : {}),
          },
        )
      }
      let buena = false
      try {
        buena = (await auth.api.verifyPassword({ body: { password }, headers })).status
      } catch {
        // better-auth lanza `INVALID_PASSWORD` con la mala: el intento ya está contado.
      }
      if (!buena) {
        if (failureClosesSession(l3.dayCount)) {
          await deleteSessionByToken(auth, sesion.session.token)
          return exportFailure(
            reply,
            429,
            'PASSWORD_ATTEMPTS_LOCKED',
            PASSWORD_ATTEMPTS_LOCKED_MESSAGE,
            { retryAfterS: SESSION_PASSWORD_FAILS.lockS, signedOut: true },
          )
        }
        return exportFailure(reply, 400, 'INVALID_PASSWORD', "That's not your current password.")
      }
      await clearAttempts(db, l3.keys)
      const cupo = await reserveAttempt(db, keys.exp(sesion.user.id), EXPORT_RULE, ahora)
      if (!cupo.allowed) {
        return exportFailure(
          reply,
          429,
          'EXPORT_LIMIT',
          "You've downloaded your data 3 times today. Try again tomorrow.",
          { retryAfterS: cupo.retryAfterS },
        )
      }

      const datos = await accountExportData(db, sesion.user.id)
      if (datos === null) return unauthorized(reply)
      const todas = await auth.api.listSessions({ headers })
      const fichero: AccountExport = {
        exportedAt: ahora.toISOString(),
        ...datos,
        devices: deviceRows(todas, sesion.session.token),
        notificationDevices: [],
      }
      const dia = ahora.toISOString().slice(0, 10)
      reply.header('content-type', 'application/json; charset=utf-8')
      reply.header('content-disposition', `attachment; filename="cycling-star-${dia}.json"`)
      reply.header('cache-control', 'no-store')
      return reply.send(JSON.stringify(fichero, null, 2))
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
