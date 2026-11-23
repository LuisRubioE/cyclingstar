import { createHmac, timingSafeEqual } from 'node:crypto'
import type { EmailEventStatus } from '@cyclingstar/db'
import { okResponseSchema } from '@cyclingstar/shared'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { apiError } from '../http.js'

/**
 * EL WEBHOOK DE RESEND (docs/cuenta.md §9.2; 9-e, 9-f).
 *
 * `POST /api/webhooks/resend`, fuera de `/api/auth/*` y del límite de credenciales. La firma es la de
 * Standard Webhooks que Resend manda con `svix` (`svix-id`, `svix-timestamp`, `svix-signature`): el
 * HMAC-SHA256, en base64, de `<svix-id>.<svix-timestamp>.<cuerpo crudo>` con la clave que va en base64 tras
 * `whsec_`. El diseño pedía la librería `svix`; no está en el lockfile y la comprobación son veinte líneas
 * de `node:crypto`, así que va a mano: comparación en tiempo constante y 5 minutos de tolerancia en
 * `svix-timestamp`, como la librería. Sin firma válida, 401 y nada más.
 *
 * El cuerpo tiene que llegar CRUDO: un byte de diferencia rompe la firma. En Fastify un analizador de
 * cuerpo es de un contexto de encapsulación, no de una ruta, y puesto en la raíz cambiaría el JSON de toda
 * la API; por eso este plugin, que es su propio contexto, quita los analizadores heredados y lee todo como
 * `Buffer` (9-f). Las demás rutas siguen recibiendo el JSON analizado.
 */

/** La tolerancia de `svix-timestamp`, hacia atrás y hacia delante (la de la librería `svix`). */
export const WEBHOOK_TOLERANCE_S = 300

/** Los eventos que cambian `email_log.status`; el resto (`email.sent`, `email.opened`…) no hace nada. */
const ESTADOS: Readonly<Record<string, EmailEventStatus>> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.suppressed': 'suppressed',
  'email.failed': 'failed',
}

const eventoSchema = z.object({
  type: z.string(),
  data: z.object({ email_id: z.string().min(1) }).passthrough(),
})

/** La clave de `whsec_<base64>`. */
function claveDe(secret: string): Buffer {
  return Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64')
}

/**
 * Si la firma de Standard Webhooks vale para ese cuerpo crudo. `svix-signature` puede traer varias firmas
 * separadas por espacios (`v1,<base64>`), una por clave mientras se rota: basta una.
 */
export function verifyWebhookSignature(
  key: Buffer,
  headers: { id: unknown; timestamp: unknown; signature: unknown },
  body: Buffer,
  nowS: number = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers
  if (typeof id !== 'string' || typeof timestamp !== 'string' || typeof signature !== 'string') {
    return false
  }
  if (!/^\d{1,12}$/.test(timestamp)) return false
  if (Math.abs(nowS - Number(timestamp)) > WEBHOOK_TOLERANCE_S) return false
  const esperada = createHmac('sha256', key).update(`${id}.${timestamp}.`).update(body).digest()
  let vale = false
  for (const parte of signature.split(' ')) {
    const [version, firma] = parte.split(',')
    if (version !== 'v1' || firma === undefined) continue
    const dada = Buffer.from(firma, 'base64')
    // sin cortar el bucle: cuántas firmas se miran no depende de cuál acierta
    if (dada.length === esperada.length && timingSafeEqual(dada, esperada)) vale = true
  }
  return vale
}

export interface ResendWebhookContext {
  /** `RESEND_WEBHOOK_SECRET`, `whsec_<base64>`. */
  secret: string
  /** Aplica un evento ya firmado (`applyEmailEvent` sobre `email_log`). */
  onEvent: (resendId: string, status: EmailEventStatus) => Promise<void>
}

export const resendWebhookRoutes: FastifyPluginAsync<ResendWebhookContext> = async (app, ctx) => {
  const clave = claveDe(ctx.secret)
  app.removeAllContentTypeParsers()
  app.addContentTypeParser('*', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body)
  })

  app.post(
    '/api/webhooks/resend',
    { config: { response: { 200: okResponseSchema }, spoiler: 'safe' } },
    async (request, reply) => {
      const cuerpo = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0)
      const firmado = verifyWebhookSignature(
        clave,
        {
          id: request.headers['svix-id'],
          timestamp: request.headers['svix-timestamp'],
          signature: request.headers['svix-signature'],
        },
        cuerpo,
      )
      if (!firmado) return reply.status(401).send(apiError('no_autorizado'))
      let json: unknown
      try {
        json = JSON.parse(cuerpo.toString('utf8'))
      } catch {
        return reply.status(400).send(apiError('validacion'))
      }
      const evento = eventoSchema.safeParse(json)
      if (!evento.success) return reply.status(400).send(apiError('validacion'))
      const estado = ESTADOS[evento.data.type]
      if (estado !== undefined) await ctx.onEvent(evento.data.data.email_id, estado)
      return { ok: true }
    },
  )
}
