import { createHash } from 'node:crypto'
import {
  deletePushTarget,
  listPushTargets,
  readNoticeSettings,
  savePushTarget,
  setNoticePrefs,
} from '@cyclingstar/db'
import {
  NOTICE_CATALOG,
  NOTICE_KINDS,
  type NoticeKind,
  type NoticesResponse,
  deviceLabel,
  effectiveNoticePrefs,
  isKnownTimeZone,
  noticePrefsBodySchema,
  noticesResponseSchema,
  okResponseSchema,
} from '@cyclingstar/shared'
import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import { badRequest, notFound, unauthorized } from '../http.js'
import { isAllowedPushEndpoint } from '../push/endpoint.js'
import { AUTH_RATE_LIMIT } from '../security.js'
import {
  type RoutePlugin,
  deleteSessionByToken,
  isPastSessionCeiling,
  toWebHeaders,
} from './context.js'

/**
 * LAS RUTAS DE LOS AVISOS (docs/cuenta.md §13.3, §13.4, §13.6 y §13.9; PR 14 de E4). Las cuatro quedan fuera
 * de la puerta de la fecha (D-09; `birthDateGate.ts`).
 *
 * - `POST /api/me/push-targets`: guarda este navegador (o, el día que haya app, su token) por `endpoint_hash`
 *   con la zona del navegador; 400 `canal_no_disponible` para `fcm` y `apns` hasta que haya app.
 * - `DELETE /api/me/push-targets/:id`: lo borra (`Turn off on this browser`, `Sign out`, `Remove`).
 * - `GET /api/me/notices` y `PUT /api/me/notices`: el estado de la pantalla y las casillas.
 * - `POST /api/me/notices/:kind/off`: la baja de un toque del service worker (`Turn off these`) y de
 *   `Don't want these?`.
 */

const b64url = z.string().regex(/^[A-Za-z0-9_-]+=*$/)
const timeZone = z.string().max(64).refine(isKnownTimeZone)

/** El cuerpo discriminado de §13.6: Web Push hoy; FCM y APNs, el contrato de la app (§13.9). */
export const pushTargetBodySchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('webpush'),
    endpoint: z.string().max(1024).refine(isAllowedPushEndpoint),
    keys: z.object({ p256dh: b64url.max(200), auth: b64url.max(100) }),
    timeZone,
  }),
  z.object({ channel: z.literal('fcm'), token: z.string().min(1).max(4096), timeZone }),
  z.object({
    channel: z.literal('apns'),
    token: z.string().regex(/^[0-9a-f]{64,200}$/),
    environment: z.enum(['production', 'sandbox']),
    timeZone,
  }),
])

const pushTargetResponseSchema = z.object({ ok: z.literal(true), id: z.string() })

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex')

export const noticeRoutes: RoutePlugin = async (app, { db, auth, notifier }) => {
  /** La sesión de la petición (su id y el de su usuario), o null; la que pasó su techo cuenta como ninguna. */
  const sesionDe = async (request: FastifyRequest) => {
    const s = await auth.api.getSession({ headers: toWebHeaders(request) })
    if (s === null) return null
    if (isPastSessionCeiling(s.session.createdAt)) {
      await deleteSessionByToken(auth, s.session.token)
      return null
    }
    return { sessionId: s.session.id, userId: s.user.id }
  }

  app.post(
    '/api/me/push-targets',
    {
      config: {
        rateLimit: AUTH_RATE_LIMIT,
        response: { 200: pushTargetResponseSchema },
        spoiler: 'safe',
      },
    },
    async (request, reply) => {
      const s = await sesionDe(request)
      if (s === null) return unauthorized(reply)
      const body = pushTargetBodySchema.safeParse(request.body)
      if (!body.success) return badRequest(reply, 'VALIDATION_ERROR')
      if (body.data.channel !== 'webpush') return badRequest(reply, 'canal_no_disponible')
      // Apagado sin claves: nadie se suscribe (§13.6).
      if (notifier === undefined || !notifier.enabled) return notFound(reply, 'avisos_apagados')
      const { endpoint, keys, timeZone: tz } = body.data
      const id = await savePushTarget(db, {
        userId: s.userId,
        sessionId: s.sessionId,
        channel: 'webpush',
        endpointHash: sha256(endpoint),
        credential: { endpoint, keys },
        label: deviceLabel(request.headers['user-agent']),
        timeZone: tz,
      })
      return { ok: true as const, id }
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/api/me/push-targets/:id',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const s = await sesionDe(request)
      if (s === null) return unauthorized(reply)
      if (!z.string().uuid().safeParse(request.params.id).success) return notFound(reply)
      if (!(await deletePushTarget(db, s.userId, request.params.id))) return notFound(reply)
      return { ok: true }
    },
  )

  app.get(
    '/api/me/notices',
    { config: { response: { 200: noticesResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const s = await sesionDe(request)
      if (s === null) return unauthorized(reply)
      const ajustes = await readNoticeSettings(db, s.userId)
      if (ajustes === null) return unauthorized(reply)
      const targets = await listPushTargets(db, s.userId)
      return {
        ok: true,
        enabled: notifier?.enabled ?? false,
        publicKey: notifier?.publicKey ?? null,
        prefs: effectiveNoticePrefs(ajustes.prefs) as Record<string, boolean>,
        timeZone: ajustes.timeZone,
        targets: targets.map((t) => ({
          id: t.id,
          label: t.label,
          createdAt: t.createdAt.toISOString(),
          lastOkAt: t.lastOkAt?.toISOString() ?? null,
          current: t.sessionId === s.sessionId,
        })),
      } satisfies NoticesResponse
    },
  )

  app.put(
    '/api/me/notices',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const s = await sesionDe(request)
      if (s === null) return unauthorized(reply)
      const body = noticePrefsBodySchema.safeParse(request.body)
      if (!body.success) return badRequest(reply, 'VALIDATION_ERROR')
      await setNoticePrefs(db, s.userId, body.data)
      return { ok: true }
    },
  )

  app.post<{ Params: { kind: string } }>(
    '/api/me/notices/:kind/off',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const s = await sesionDe(request)
      if (s === null) return unauthorized(reply)
      const kind = NOTICE_KINDS.find((k) => k === request.params.kind) as NoticeKind | undefined
      if (kind === undefined || !NOTICE_CATALOG[kind].switchable)
        return badRequest(reply, 'VALIDATION_ERROR')
      await setNoticePrefs(db, s.userId, { [kind]: false })
      return { ok: true }
    },
  )
}
