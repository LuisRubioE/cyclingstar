import {
  type NoticeKind,
  type NoticesResponse,
  type OkResponse,
  noticesResponseSchema,
  okResponseSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'
import { request, requestOptionalAuth } from './request'

/**
 * LOS AVISOS (docs/cuenta.md §13.4 y §13.6; PR 14 de E4). `GET /api/me/notices` lo piden `Notifications` y
 * los dos `Notice` del permiso, con la misma clave; sin las tres VAPID en el servidor, `enabled: false`.
 */
export const NOTICES_KEY = ['me-notices'] as const

export async function getNotices(): Promise<NoticesResponse | null> {
  return requestOptionalAuth('/api/me/notices', noticesResponseSchema, {
    errorMessage: 'Could not load your notification settings.',
  })
}

/** Una casilla de `Notifications` (`PUT /api/me/notices`): solo claves apagables. */
export async function putNoticePrefs(
  prefs: Partial<Record<NoticeKind, boolean>>,
): Promise<OkResponse> {
  return request('/api/me/notices', okResponseSchema, {
    method: 'PUT',
    json: prefs,
    errorMessage: "Couldn't save. Try again in a minute.",
  })
}

/** La baja de un toque (`Don't want these?`), la misma ruta que el service worker. */
export async function turnNoticeOff(kind: NoticeKind): Promise<OkResponse> {
  return request(`/api/me/notices/${kind}/off`, okResponseSchema, {
    method: 'POST',
    errorMessage: "Couldn't turn it off. Try again in a minute.",
  })
}

const pushTargetResponseSchema = z.object({ ok: z.literal(true), id: z.string() })

/** Guarda este navegador (`POST /api/me/push-targets`) con su zona; devuelve el id de su fila. */
export async function postPushTarget(body: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  timeZone: string
}): Promise<string> {
  const r = await request('/api/me/push-targets', pushTargetResponseSchema, {
    method: 'POST',
    json: { channel: 'webpush', ...body },
    errorMessage: "Couldn't turn on notifications. Try again in a minute.",
  })
  return r.id
}

/** Borra un aparato (`Turn off on this browser`, `Remove`, `Sign out`). */
export async function deletePushTarget(id: string): Promise<OkResponse> {
  return request(`/api/me/push-targets/${id}`, okResponseSchema, {
    method: 'DELETE',
    errorMessage: "Couldn't remove it. Try again in a minute.",
  })
}
