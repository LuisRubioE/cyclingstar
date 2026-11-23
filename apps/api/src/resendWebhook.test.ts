import { createHmac } from 'node:crypto'
import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import Fastify from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { resendWebhookRoutes } from './routes/resendWebhook.js'

/**
 * EL WEBHOOK DE RESEND (docs/cuenta.md §9.2 y §9.3; 9-d, 9-e, 9-f; PR 7). La firma es la de Standard
 * Webhooks que usa `svix`: HMAC-SHA256 de `<svix-id>.<svix-timestamp>.<cuerpo crudo>` con la clave en base64
 * tras `whsec_`, comprobada aquí a mano con `node:crypto`. Sin firma válida, 401 y nada más. `status` nunca
 * retrocede, así que un evento repetido no cambia nada; un rebote, una queja o una supresión marcan
 * `users.email_undeliverable_at`, y un `email.delivered` de un correo posterior la quita.
 */
const CLAVE = Buffer.from('clave-de-prueba-del-webhook-32by')
const SECRET = `whsec_${CLAVE.toString('base64')}`

function firmar(
  cuerpo: string,
  { id = 'msg_1', ts = Math.floor(Date.now() / 1000), clave = CLAVE } = {},
): Record<string, string> {
  const firma = createHmac('sha256', clave).update(`${id}.${ts}.${cuerpo}`).digest('base64')
  return {
    'content-type': 'application/json',
    'svix-id': id,
    'svix-timestamp': String(ts),
    'svix-signature': `v1,${firma}`,
  }
}

const evento = (type: string, emailId: string): string =>
  JSON.stringify({ type, created_at: '2026-11-23T12:00:00.000Z', data: { email_id: emailId } })

describe('POST /api/webhooks/resend', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  let userId = ''

  const enviar = (cuerpo: string, headers: Record<string, string>) =>
    app.inject({ method: 'POST', url: '/api/webhooks/resend', headers, payload: cuerpo })

  const filaDe = async (resendId: string) => {
    const [f] = await tdb.client<{ status: string; updated_at: Date }[]>`
      select status, updated_at from email_log where resend_id = ${resendId}`
    return f
  }
  const marca = async (): Promise<string | null> => {
    const [u] = await tdb.client<{ m: string | null }[]>`
      select email_undeliverable_at as m from users where id = ${userId}`
    return u!.m
  }
  const apuntar = async (resendId: string, status = 'sent', creado = new Date()) => {
    await tdb.client`insert into email_log (resend_id, kind, recipient_hash, user_id, status, created_at, updated_at)
      values (${resendId}, 'verify_signup', 'h', ${userId}, ${status},
        ${creado.toISOString()}::timestamptz, ${creado.toISOString()}::timestamptz)`
  }

  beforeAll(async () => {
    tdb = await startTestDb()
    app = buildApp({ db: tdb.db, serveWeb: false, resendWebhookSecret: SECRET })
    const [u] = await tdb.client<{ id: string }[]>`
      insert into users (email, status) values ('rebote@example.com', 'approved') returning id`
    userId = u!.id
  })
  afterAll(async () => {
    await app?.close()
    await tdb?.close()
  })
  beforeEach(async () => {
    await tdb.client`delete from email_log`
    await tdb.client`update users set email_undeliverable_at = null`
  })

  it('sin RESEND_WEBHOOK_SECRET la ruta no se monta: 404', async () => {
    const sin = buildApp({ db: tdb.db, serveWeb: false })
    try {
      const cuerpo = evento('email.delivered', 're_1')
      const res = await sin.inject({
        method: 'POST',
        url: '/api/webhooks/resend',
        headers: firmar(cuerpo),
        payload: cuerpo,
      })
      expect(res.statusCode).toBe(404)
    } finally {
      await sin.close()
    }
  })

  it('firma buena: 200 y el estado cambia', async () => {
    await apuntar('re_1')
    const cuerpo = evento('email.delivered', 're_1')
    const res = await enviar(cuerpo, firmar(cuerpo))
    expect(res.statusCode).toBe(200)
    expect((await filaDe('re_1'))?.status).toBe('delivered')
  })

  it('firma mala, de otro secreto, sobre otro cuerpo o sin cabeceras: 401 y nada cambia', async () => {
    await apuntar('re_1')
    const cuerpo = evento('email.bounced', 're_1')
    const otraClave = await enviar(cuerpo, firmar(cuerpo, { clave: Buffer.from('otra') }))
    expect(otraClave.statusCode).toBe(401)
    const otroCuerpo = await enviar(cuerpo, firmar(evento('email.bounced', 're_2')))
    expect(otroCuerpo.statusCode).toBe(401)
    const sinFirma = await enviar(cuerpo, { 'content-type': 'application/json' })
    expect(sinFirma.statusCode).toBe(401)
    // el cuerpo es el crudo: el mismo JSON con otros espacios ya no es lo firmado
    const reformateado = JSON.stringify(JSON.parse(cuerpo), null, 1)
    expect((await enviar(reformateado, firmar(cuerpo))).statusCode).toBe(401)
    expect((await filaDe('re_1'))?.status).toBe('sent')
    expect(await marca()).toBeNull()
  })

  it('firma caducada (más de 5 minutos, hacia atrás o hacia delante): 401', async () => {
    await apuntar('re_1')
    const cuerpo = evento('email.bounced', 're_1')
    const ahora = Math.floor(Date.now() / 1000)
    expect((await enviar(cuerpo, firmar(cuerpo, { ts: ahora - 301 }))).statusCode).toBe(401)
    expect((await enviar(cuerpo, firmar(cuerpo, { ts: ahora + 301 }))).statusCode).toBe(401)
    expect((await filaDe('re_1'))?.status).toBe('sent')
    // dentro de la tolerancia, vale
    expect((await enviar(cuerpo, firmar(cuerpo, { ts: ahora - 200 }))).statusCode).toBe(200)
  })

  it('con varias firmas (la clave rotada), basta una buena', async () => {
    await apuntar('re_1')
    const cuerpo = evento('email.delivered', 're_1')
    const h = firmar(cuerpo)
    const res = await enviar(cuerpo, {
      ...h,
      'svix-signature': `v1,${Buffer.from('mala').toString('base64')} ${h['svix-signature']}`,
    })
    expect(res.statusCode).toBe(200)
  })

  it('un rebote duro marca email_undeliverable_at; un evento repetido, 200 sin cambiar nada', async () => {
    await apuntar('re_1')
    const cuerpo = evento('email.bounced', 're_1')
    expect((await enviar(cuerpo, firmar(cuerpo))).statusCode).toBe(200)
    const primera = await filaDe('re_1')
    const m = await marca()
    expect(primera?.status).toBe('bounced')
    expect(m).not.toBeNull()
    expect((await enviar(cuerpo, firmar(cuerpo))).statusCode).toBe(200)
    expect(await filaDe('re_1')).toEqual(primera)
    expect(await marca()).toEqual(m)
  })

  it('un delivered tardío no pisa un bounced', async () => {
    await apuntar('re_1', 'bounced')
    const cuerpo = evento('email.delivered', 're_1')
    expect((await enviar(cuerpo, firmar(cuerpo))).statusCode).toBe(200)
    expect((await filaDe('re_1'))?.status).toBe('bounced')
  })

  it('cada evento cambia status; rebote, queja y supresión marcan la cuenta, failed no', async () => {
    const casos = [
      ['email.delivered', 'delivered', false],
      ['email.bounced', 'bounced', true],
      ['email.complained', 'complained', true],
      ['email.suppressed', 'suppressed', true],
      ['email.failed', 'failed', false],
    ] as const
    for (const [tipo, estado, marcaLaCuenta] of casos) {
      await tdb.client`delete from email_log`
      await tdb.client`update users set email_undeliverable_at = null`
      await apuntar('re_x')
      const cuerpo = evento(tipo, 're_x')
      expect((await enviar(cuerpo, firmar(cuerpo))).statusCode).toBe(200)
      expect((await filaDe('re_x'))?.status).toBe(estado)
      expect((await marca()) !== null).toBe(marcaLaCuenta)
    }
  })

  it('un delivered de un correo posterior a la marca la quita; el de uno anterior, no (9-d)', async () => {
    await apuntar('re_viejo', 'sent', new Date(Date.now() - 60_000))
    await tdb.client`update users set email_undeliverable_at = now() - interval '30 seconds'`
    const viejo = evento('email.delivered', 're_viejo')
    await enviar(viejo, firmar(viejo))
    expect(await marca()).not.toBeNull()
    await apuntar('re_nuevo')
    const nuevo = evento('email.delivered', 're_nuevo')
    await enviar(nuevo, firmar(nuevo))
    expect(await marca()).toBeNull()
  })

  it('un evento de otro tipo o de un correo que no está: 200 sin tocar nada', async () => {
    await apuntar('re_1')
    const abierto = evento('email.opened', 're_1')
    expect((await enviar(abierto, firmar(abierto))).statusCode).toBe(200)
    const ajeno = evento('email.bounced', 're_otro')
    expect((await enviar(ajeno, firmar(ajeno))).statusCode).toBe(200)
    expect((await filaDe('re_1'))?.status).toBe('sent')
    expect(await marca()).toBeNull()
  })
})

describe('el webhook en su propio contexto de Fastify (9-f)', () => {
  it('otra ruta de la API sigue recibiendo el JSON analizado', async () => {
    const app = Fastify()
    void app.register(resendWebhookRoutes, {
      secret: SECRET,
      onEvent: async () => {},
    })
    app.post('/api/otra', async (request) => ({ tipo: typeof request.body, body: request.body }))
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/otra',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ a: 1 }),
      })
      expect(res.json()).toEqual({ tipo: 'object', body: { a: 1 } })
      const cuerpo = evento('email.delivered', 're_1')
      const hook = await app.inject({
        method: 'POST',
        url: '/api/webhooks/resend',
        headers: firmar(cuerpo),
        payload: cuerpo,
      })
      expect(hook.statusCode).toBe(200)
    } finally {
      await app.close()
    }
  })
})
