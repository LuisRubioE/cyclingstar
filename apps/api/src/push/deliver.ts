import { createHash, randomUUID } from 'node:crypto'
import {
  type Database,
  type DeliveryResult,
  type PushChannel,
  type PushTargetRow,
  claimNotice,
  pushTargetsOf,
  readNoticeSettings,
  recordDelivery,
} from '@cyclingstar/db'
import {
  NOTICE_CATALOG,
  type NoticeInput,
  type NoticePayload,
  PUSH_SEND_TIMEOUT_MS,
  noticePayload,
} from '@cyclingstar/shared'
import { type PushSubscription, type RequestOptions, sendNotification } from 'web-push'
import type { Vapid } from '../env.js'
import type { MailQueue } from '../mailQueue.js'
import { isAllowedPushEndpoint, isPushKey } from './endpoint.js'

/**
 * EL ENVÍO (docs/cuenta.md §13.6, §13.7 y §13.9; D-50). Como `ai/src/pvp/push.ts` de `twilightstruggle`:
 * `web-push` con VAPID, apagado sin claves, después del cambio y en segundo plano. Un `Deliverer` por canal
 * (hoy solo Web Push; FCM y APNs el día que haya app). Ningún error vuelve al navegador y no hay aviso de
 * prueba que salga de la API (I-01): sería un envío a voluntad del cliente.
 */

export type { DeliveryResult, PushChannel, PushTargetRow }

export interface DeliveryOptions {
  readonly ttlS: number
  readonly urgency: 'normal' | 'high'
  /** SHA-256 del `tag` en base64url, 32 caracteres. */
  readonly topic: string
}

export interface Deliverer {
  readonly channel: PushChannel
  send(
    target: PushTargetRow,
    payload: NoticePayload,
    opts: DeliveryOptions,
  ): Promise<DeliveryResult>
}

/**
 * `Topic` (§13.2; 13-e): un aviso nuevo con el mismo `tag` sustituye al pendiente en el servicio de push.
 * Admite 32 caracteres de base64url y `stage-<raceId>` puede pasar, así que va el SHA-256 cortado.
 */
export function noticeTopic(tag: string): string {
  return createHash('sha256').update(tag).digest('base64url').slice(0, 32)
}

/** Las opciones de envío de una carga, del catálogo. */
export function deliveryOptionsOf(payload: NoticePayload): DeliveryOptions {
  const spec = NOTICE_CATALOG[payload.kind]
  return { ttlS: spec.ttlS, urgency: spec.urgency, topic: noticeTopic(payload.tag) }
}

/** Lo que llama a un servicio de push: `web-push`, o el doble de los tests. */
export type PushSender = (
  subscription: PushSubscription,
  payload: string,
  options: RequestOptions,
) => Promise<{ statusCode: number }>

const webPushSender: PushSender = (s, p, o) => sendNotification(s, p, o)

/** Una credencial de Web Push guardada, comprobada otra vez: las filas viejas pasan por la lista de hoy. */
function suscripcionDe(credential: unknown): PushSubscription | null {
  if (credential === null || typeof credential !== 'object') return null
  const c = credential as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  if (!isAllowedPushEndpoint(c.endpoint)) return null
  const p256dh = c.keys?.p256dh
  const auth = c.keys?.auth
  if (!isPushKey(p256dh, 200) || !isPushKey(auth, 100)) return null
  return { endpoint: c.endpoint as string, keys: { p256dh, auth } }
}

export type PushLog = (msg: string, data: Record<string, unknown>) => void

/**
 * Web Push (§13.6): 2xx es `ok`; 404 o 410 es `gone` (RFC 8030 §7.3); un endpoint que la lista ya no acepta
 * es `gone`; cualquier otro error es `retry` y se registra con el host y el estado, sin el endpoint ni el
 * cuerpo.
 */
export function webPushDeliverer(
  vapid: Vapid,
  sender: PushSender = webPushSender,
  log: PushLog = () => {},
): Deliverer {
  return {
    channel: 'webpush',
    async send(target, payload, opts) {
      const sub = suscripcionDe(target.credential)
      if (sub === null) return 'gone'
      try {
        const r = await sender(sub, JSON.stringify(payload), {
          vapidDetails: {
            subject: vapid.subject,
            publicKey: vapid.publicKey,
            privateKey: vapid.privateKey,
          },
          TTL: opts.ttlS,
          urgency: opts.urgency,
          topic: opts.topic,
          timeout: PUSH_SEND_TIMEOUT_MS,
        })
        return r.statusCode >= 200 && r.statusCode < 300 ? 'ok' : 'retry'
      } catch (err) {
        const status = (err as { statusCode?: unknown }).statusCode
        if (status === 404 || status === 410) return 'gone'
        log('push send failed', {
          host: new URL(sub.endpoint).host,
          status: typeof status === 'number' ? status : null,
        })
        return 'retry'
      }
    },
  }
}

export interface Notifier {
  /** Con las tres VAPID. Sin ellas no se envía nada y nadie se suscribe. */
  readonly enabled: boolean
  readonly publicKey: string | null
  /** Manda una carga a esas filas y apunta cada resultado. Nunca lanza. */
  send(targets: readonly PushTargetRow[], payload: NoticePayload): Promise<void>
  /**
   * Un aviso de seguridad (13-a, 13-k), en segundo plano por la cola que espera el cierre ordenado: se apunta
   * en `notice_log` (`new_sign_in` con la hora UTC como `ref`, el tope de uno por hora) y sale a `targets`, o
   * a todas las filas de la cuenta.
   */
  security(
    userId: string,
    input: Extract<NoticeInput, { kind: 'password_changed' | 'new_sign_in' | 'email_changed' }>,
    targets?: readonly PushTargetRow[],
  ): void
}

export interface NotifierDeps {
  readonly db: Database
  readonly vapid: Vapid | null
  /** La cola de segundo plano (`mailQueue`, §5.6): la vacía `SIGTERM`. */
  readonly queue: MailQueue
  readonly sender?: PushSender
  readonly log?: PushLog
  readonly now?: () => Date
}

export function createNotifier(deps: NotifierDeps): Notifier {
  const { db, vapid } = deps
  const ahora = deps.now ?? (() => new Date())
  const deliverers: Partial<Record<PushChannel, Deliverer>> =
    vapid === null ? {} : { webpush: webPushDeliverer(vapid, deps.sender, deps.log) }

  const send = async (targets: readonly PushTargetRow[], payload: NoticePayload) => {
    const opts = deliveryOptionsOf(payload)
    for (const t of targets) {
      const d = deliverers[t.channel]
      if (d === undefined) continue
      try {
        await recordDelivery(db, t.id, await d.send(t, payload, opts), ahora())
      } catch (err) {
        deps.log?.('push record failed', { err: String(err) })
      }
    }
  }

  return {
    enabled: vapid !== null,
    publicKey: vapid?.publicKey ?? null,
    send,
    security(userId, input, targets) {
      if (vapid === null) return
      deps.queue.track(
        (async () => {
          const now = ahora()
          const ref =
            input.kind === 'new_sign_in'
              ? now.toISOString().slice(0, 13)
              : `${now.toISOString()}:${randomUUID()}`
          // Sin aparatos no hay a quién avisar, y no se gasta la hora de `new_sign_in`.
          const destinos = targets ?? (await pushTargetsOf(db, userId))
          if (destinos.length === 0) return
          const ajustes = await readNoticeSettings(db, userId)
          if (ajustes === null) return
          const r = await claimNotice(db, {
            userId,
            kind: input.kind,
            ref,
            now,
            timeZone: ajustes.timeZone,
          })
          if (r !== 'new') return
          await send(destinos, noticePayload(input))
        })(),
      )
    },
  }
}

/** Sin claves: no envía nada (tests de rutas y entornos locales). */
export function disabledNotifier(db: Database, queue: MailQueue): Notifier {
  return createNotifier({ db, vapid: null, queue })
}
