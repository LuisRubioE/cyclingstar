import type { PushTargetRow } from '@cyclingstar/db'
import { noticePayload } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { deliveryOptionsOf, noticeTopic, webPushDeliverer } from './push/deliver.js'
import { PUSH_ALLOWED_HOSTS, isAllowedPushEndpoint } from './push/endpoint.js'
import { pushTargetBodySchema } from './routes/notices.js'

/**
 * LA SSRF DE LOS AVISOS (docs/cuenta.md §13.6 y §17.1; I-01, X-12, O-12, 13-j). `web-push` abre TLS al host y
 * al puerto de la URL sea cual sea el esquema: un endpoint fuera de la lista de servicios de push se rechaza
 * al guardar (el cuerpo de `POST /api/me/push-targets`) y otra vez al enviar (una fila vieja no llega a
 * `web-push` y se borra como `gone`).
 */

const MALOS = [
  'http://localhost',
  'https://postgres.railway.internal:5432/x',
  'https://10.0.0.1/x',
  'https://fcm.googleapis.com.evil.com/x',
  'https://user:pw@fcm.googleapis.com/x',
  'https://fcm.googleapis.com:8443/x',
  'http://fcm.googleapis.com/x',
  'https://evilgoogleapis.com/x',
  'ftp://fcm.googleapis.com/x',
  `https://fcm.googleapis.com/${'a'.repeat(1024)}`,
  'no es una url',
]
const BUENOS = [
  'https://fcm.googleapis.com/fcm/send/abc',
  'https://jmt17.google.com/fcm/send/abc',
  'https://updates.push.services.mozilla.com/wpush/v2/abc',
  'https://wns2-par02p.notify.windows.com/w/?token=abc',
  'https://web.push.apple.com/QGx',
  'https://fcm.googleapis.com:443/fcm/send/abc',
]
const KEYS = { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) }
const VAPID = { publicKey: 'B'.repeat(87), privateKey: 'p'.repeat(43), subject: 'https://x.test' }
const fila = (endpoint: string): PushTargetRow => ({
  id: '00000000-0000-0000-0000-000000000001',
  userId: 'u',
  sessionId: null,
  channel: 'webpush',
  credential: { endpoint, keys: KEYS },
})

describe('isAllowedPushEndpoint', () => {
  it('rechaza http:, puertos raros, credenciales en la URL, hosts que solo se parecen y lo largo', () => {
    for (const url of MALOS) expect(isAllowedPushEndpoint(url), url).toBe(false)
  })

  it('acepta los cinco servicios de PUSH_ALLOWED_HOSTS, como host o tras un punto', () => {
    expect(PUSH_ALLOWED_HOSTS).toEqual([
      'googleapis.com',
      'google.com',
      'push.services.mozilla.com',
      'notify.windows.com',
      'push.apple.com',
    ])
    for (const url of BUENOS) expect(isAllowedPushEndpoint(url), url).toBe(true)
  })

  it('al guardar: el cuerpo de POST /api/me/push-targets no pasa con un endpoint fuera de la lista', () => {
    const tz = 'Europe/Madrid'
    for (const endpoint of MALOS)
      expect(
        pushTargetBodySchema.safeParse({ channel: 'webpush', endpoint, keys: KEYS, timeZone: tz })
          .success,
        endpoint,
      ).toBe(false)
    expect(
      pushTargetBodySchema.safeParse({
        channel: 'webpush',
        endpoint: BUENOS[0],
        keys: KEYS,
        timeZone: tz,
      }).success,
    ).toBe(true)
    // la zona, contra las del motor; y las claves, en base64url
    expect(
      pushTargetBodySchema.safeParse({
        channel: 'webpush',
        endpoint: BUENOS[0],
        keys: KEYS,
        timeZone: 'Mars/Olympus',
      }).success,
    ).toBe(false)
    expect(
      pushTargetBodySchema.safeParse({
        channel: 'webpush',
        endpoint: BUENOS[0],
        keys: { ...KEYS, auth: 'no/vale' },
        timeZone: tz,
      }).success,
    ).toBe(false)
  })

  it('al enviar: una fila vieja fuera de la lista es gone y web-push no la ve', async () => {
    const vistos: string[] = []
    const d = webPushDeliverer(VAPID, async (sub) => {
      vistos.push(sub.endpoint)
      return { statusCode: 201 }
    })
    const p = noticePayload({ kind: 'password_changed' })
    for (const url of MALOS) expect(await d.send(fila(url), p, deliveryOptionsOf(p))).toBe('gone')
    expect(vistos).toEqual([])
    expect(await d.send(fila(BUENOS[0]!), p, deliveryOptionsOf(p))).toBe('ok')
    expect(vistos).toEqual([BUENOS[0]])
  })
})

describe('el envío de web-push', () => {
  it('404 y 410 son gone; otro error, retry, y se registra el host sin el endpoint', async () => {
    const p = noticePayload({ kind: 'away_over' })
    const log: Record<string, unknown>[] = []
    const con = (statusCode: number) =>
      webPushDeliverer(
        VAPID,
        async () => {
          throw Object.assign(new Error('x'), { statusCode })
        },
        (_m, d) => log.push(d),
      )
    expect(await con(404).send(fila(BUENOS[0]!), p, deliveryOptionsOf(p))).toBe('gone')
    expect(await con(410).send(fila(BUENOS[0]!), p, deliveryOptionsOf(p))).toBe('gone')
    expect(await con(500).send(fila(BUENOS[0]!), p, deliveryOptionsOf(p))).toBe('retry')
    expect(log).toEqual([{ host: 'fcm.googleapis.com', status: 500 }])
  })

  it('TTL, urgencia y Topic del catálogo; Topic de 32 caracteres base64url (13-e)', async () => {
    let opciones: Record<string, unknown> = {}
    let carga = ''
    const d = webPushDeliverer(VAPID, async (_s, payload, o) => {
      opciones = o as Record<string, unknown>
      carga = payload
      return { statusCode: 201 }
    })
    const p = noticePayload({ kind: 'new_sign_in', deviceLabel: 'Chrome on Android' })
    await d.send(fila(BUENOS[0]!), p, deliveryOptionsOf(p))
    expect(opciones).toMatchObject({ TTL: 43_200, urgency: 'high', timeout: 15_000 })
    expect(opciones.topic).toBe(noticeTopic('signin'))
    expect(noticeTopic(`stage-${'x'.repeat(60)}`)).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(JSON.parse(carga)).toEqual(p)
  })
})
