import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import { limitKeys } from './limitKeys.js'
import { MAIL_BUDGET_EXHAUSTED_BODY, createMailJournal, mailBudgetOpen } from './mailBudget.js'
import { type OutgoingMail, createResendMailer } from './mailer.js'
import { createMailQueue } from './mailQueue.js'
import { MAIL_DAILY_BUDGET_DEFAULT, MAIL_RESET_RESERVE } from './security.js'

/**
 * EL PRESUPUESTO DE CORREO Y L5, CONTRA UNA BASE REAL (docs/cuenta.md §7.4 y §7.6; 7-f, 7-m; PR 7). El día
 * UTC tiene `MAIL_DAILY_BUDGET` (90) envíos: `verify_signup` para a los 60 y `reset_password` sigue hasta
 * 90, con la reserva de 30 gastada una sola vez por destinatario y día (`rsv:`). L5: tres correos por buzón
 * y hora, sin tope diario; el cuarto no sale y la respuesta no cambia. Todo se cuenta en `email_log`.
 */
const SECRET = 's'.repeat(32)
const BASE = 'http://localhost:3000'
const keys = limitKeys(SECRET)

const correo = (to: string, kind: OutgoingMail['kind'] = 'reset_password'): OutgoingMail => ({
  to,
  kind,
  userId: null,
  subject: 'x',
  text: 'x',
  html: '<p>x</p>',
})

describe('el presupuesto del día y L5, en email_log', () => {
  let tdb: TestDb
  let reloj = new Date('2026-11-23T12:00:00Z')

  /** El día ya lleva `n` envíos a otros buzones, a la hora del reloj. */
  async function llenarDia(n: number, at: Date = reloj): Promise<void> {
    await tdb.client`insert into email_log (kind, recipient_hash, status, created_at, updated_at)
      select 'verify_signup', 'relleno-' || g, 'sent', ${at.toISOString()}::timestamptz,
        ${at.toISOString()}::timestamptz from generate_series(1, ${n}) g`
  }

  const journal = () => createMailJournal(tdb.db, { secret: SECRET, now: () => reloj })

  beforeAll(async () => {
    tdb = await startTestDb()
  })
  afterAll(async () => {
    await tdb?.close()
  })
  beforeEach(async () => {
    reloj = new Date('2026-11-23T12:00:00Z')
    await tdb.client`delete from email_log`
    await tdb.client`delete from auth_limits`
  })

  it('las constantes: 90 al día y 30 de reserva (§16)', () => {
    expect(MAIL_DAILY_BUDGET_DEFAULT).toBe(90)
    expect(MAIL_RESET_RESERVE).toBe(30)
  })

  it('apunta queued con el HMAC del correo normalizado, sin el buzón, con su kind y su userId', async () => {
    const [u] = await tdb.client<{ id: string }[]>`
      insert into users (email, status) values ('fila@example.com', 'approved') returning id`
    const id = await journal().open({ ...correo(' Fila@Example.com '), userId: u!.id })
    expect(id).not.toBeNull()
    const filas = await tdb.client<Record<string, unknown>[]>`
      select id, kind, recipient_hash, user_id, status, resend_id from email_log`
    expect(filas).toEqual([
      {
        id,
        kind: 'reset_password',
        recipient_hash: keys.rcpt('fila@example.com'),
        user_id: u!.id,
        status: 'queued',
        resend_id: null,
      },
    ])
    expect(JSON.stringify(filas)).not.toContain('example.com')
    await tdb.client`delete from users where id = ${u!.id}`
  })

  it('verify_signup para a los 60 del día UTC; reset_password sigue hasta 90 y el 91 no sale', async () => {
    await llenarDia(59)
    const j = journal()
    expect(await j.open(correo('v60@example.com', 'verify_signup'))).not.toBeNull()
    expect(await j.open(correo('v61@example.com', 'verify_signup'))).toBeNull()
    expect(await mailBudgetOpen(tdb.db, 'verify_signup', 90, reloj)).toBe(false)
    expect(await mailBudgetOpen(tdb.db, 'reset_password', 90, reloj)).toBe(true)
    // 30 recuperaciones de 30 buzones distintos: la reserva entera
    for (let i = 1; i <= 30; i++) {
      expect(await j.open(correo(`r${i}@example.com`))).not.toBeNull()
    }
    expect(await j.open(correo('r31@example.com'))).toBeNull()
    expect(await mailBudgetOpen(tdb.db, 'reset_password', 90, reloj)).toBe(false)
    const [n] = await tdb.client<{ n: number }[]>`select count(*)::int as n from email_log`
    expect(n!.n).toBe(90)
  })

  it('el día es el UTC: lo de ayer no cuenta', async () => {
    await llenarDia(90, new Date('2026-11-22T23:59:00Z'))
    reloj = new Date('2026-11-23T00:00:30Z')
    expect(await journal().open(correo('hoy@example.com', 'verify_signup'))).not.toBeNull()
  })

  it('un mismo destinatario saca de la reserva una sola recuperación al día (7-m)', async () => {
    await llenarDia(60)
    const j = journal()
    expect(await j.open(correo('a@example.com'))).not.toBeNull()
    expect(await j.open(correo('A@example.com'))).toBeNull()
    expect(await j.open(correo('b@example.com'))).not.toBeNull()
  })

  it('por debajo de los 60, recuperar no gasta la reserva', async () => {
    await llenarDia(10)
    const j = journal()
    expect(await j.open(correo('a@example.com'))).not.toBeNull()
    expect(await j.open(correo('a@example.com'))).not.toBeNull()
    await llenarDia(48)
    // el día va por 60: la tercera del buzón sale de la reserva, que seguía entera
    expect(await j.open(correo('a@example.com'))).not.toBeNull()
  })

  it('L5: el cuarto correo a un buzón en una hora no sale; pasada la hora, sí', async () => {
    const j = journal()
    for (let i = 0; i < 3; i++) expect(await j.open(correo('l5@example.com'))).not.toBeNull()
    expect(await j.open(correo('L5@example.com', 'verify_signup'))).toBeNull()
    reloj = new Date(reloj.getTime() + 3_600_000 + 1_000)
    expect(await j.open(correo('l5@example.com'))).not.toBeNull()
  })

  it('mailer.send apunta queued ANTES de llamar a Resend y guarda resend_id y sent; un rechazo, failed', async () => {
    const vistos: string[] = []
    const fetchImpl = (async () => {
      const [fila] = await tdb.client<{ status: string }[]>`select status from email_log`
      vistos.push(fila?.status ?? 'sin fila')
      return new Response(JSON.stringify({ id: 're_abc' }), { status: 200 })
    }) as unknown as typeof fetch
    const mailer = createResendMailer({
      apiKey: 'k',
      from: 'a@b.co',
      fetchImpl,
      log: () => {},
      journal: journal(),
    })
    expect(await mailer.send(correo('m@example.com'))).toBe(true)
    expect(vistos).toEqual(['queued'])
    const filas = await tdb.client`select status, resend_id from email_log`
    expect(filas).toEqual([{ status: 'sent', resend_id: 're_abc' }])

    await tdb.client`delete from email_log`
    const rechaza = createResendMailer({
      apiKey: 'k',
      from: 'a@b.co',
      fetchImpl: (async () => new Response('no', { status: 422 })) as unknown as typeof fetch,
      log: () => {},
      journal: journal(),
    })
    expect(await rechaza.send(correo('m@example.com'))).toBe(false)
    expect(await tdb.client`select status, resend_id from email_log`).toEqual([
      { status: 'failed', resend_id: null },
    ])
  })

  it('sin hueco no sale a la red: ni L5 ni el presupuesto llaman a Resend', async () => {
    await llenarDia(90)
    let llamadas = 0
    const mailer = createResendMailer({
      apiKey: 'k',
      from: 'a@b.co',
      fetchImpl: (async () => {
        llamadas++
        return new Response('{}', { status: 200 })
      }) as unknown as typeof fetch,
      log: () => {},
      journal: journal(),
    })
    expect(await mailer.send(correo('n@example.com'))).toBe(false)
    expect(llamadas).toBe(0)
  })
})

describe('el presupuesto en las rutas de /api/auth', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  const cola = createMailQueue()
  let enviados = 0
  const poolBefore = process.env.DB_POOL_MAX

  const authPost = (path: string, body: unknown) =>
    app.inject({
      method: 'POST',
      url: `/api/auth${path}`,
      headers: { 'content-type': 'application/json', origin: BASE },
      payload: JSON.stringify(body),
    })

  async function llenarDia(n: number): Promise<void> {
    await tdb.client`insert into email_log (kind, recipient_hash, status)
      select 'verify_signup', 'relleno-' || g, 'sent' from generate_series(1, ${n}) g`
  }

  beforeAll(async () => {
    // PGlite admite UNA sesión (testDb.ts): el proxy y el correo en segundo plano se turnan.
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: SECRET,
      baseURL: BASE,
      mailQueue: cola,
      mailer: createResendMailer({
        apiKey: 'k',
        from: 'a@b.co',
        log: () => {},
        journal: createMailJournal(tdb.db, { secret: SECRET }),
        fetchImpl: (async () => {
          enviados++
          return new Response(JSON.stringify({ id: `re_${enviados}` }), { status: 200 })
        }) as unknown as typeof fetch,
      }),
    })
    app = buildApp({ db: tdb.db, auth, serveWeb: false, mailDailyBudget: 90 })
    await tdb.client`insert into users (email, name, status, approved_at, email_verified)
      values ('jugador@example.com', 'Player', 'approved', now(), true)`
  })
  afterAll(async () => {
    await cola.drain()
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })
  beforeEach(async () => {
    await cola.drain()
    await tdb.client`delete from email_log`
    await tdb.client`delete from auth_limits`
    enviados = 0
  })

  it('a los 60 del día, send-verification-email da 503 MAIL_BUDGET_EXHAUSTED sin espera; sign-up/email y la recuperación no', async () => {
    await llenarDia(60)
    const res = await authPost('/send-verification-email', { email: 'jugador@example.com' })
    expect(res.statusCode).toBe(503)
    expect(res.body).toBe(MAIL_BUDGET_EXHAUSTED_BODY)
    expect(res.json()).toEqual({
      code: 'MAIL_BUDGET_EXHAUSTED',
      message: "We can't send emails right now. Try again tomorrow.",
    })
    expect(res.headers['retry-after']).toBeUndefined()

    const alta = await authPost('/sign-up/email', {
      name: '',
      email: 'nuevo@example.com',
      password: 'contrasena-larga',
      birthDate: '1990-01-01',
    })
    expect(alta.statusCode).toBe(200)
    const reset = await authPost('/request-password-reset', {
      email: 'jugador@example.com',
      redirectTo: '/reset-password',
    })
    expect(reset.statusCode).toBe(200)
    await cola.drain()
    expect(enviados).toBe(1)
  })

  it('a los 90, también request-password-reset da 503', async () => {
    await llenarDia(90)
    const res = await authPost('/request-password-reset', {
      email: 'jugador@example.com',
      redirectTo: '/reset-password',
    })
    expect(res.statusCode).toBe(503)
    expect(res.body).toBe(MAIL_BUDGET_EXHAUSTED_BODY)
  })

  it('L5: el cuarto correo a un buzón en una hora no sale, y la respuesta es idéntica byte a byte', async () => {
    const respuestas: string[] = []
    for (let i = 0; i < 4; i++) {
      const res = await authPost('/request-password-reset', {
        email: 'jugador@example.com',
        redirectTo: '/reset-password',
      })
      expect(res.statusCode).toBe(200)
      respuestas.push(res.body)
      await cola.drain()
    }
    expect(new Set(respuestas).size).toBe(1)
    expect(enviados).toBe(3)
    const filas = await tdb.client<{ status: string }[]>`select status from email_log`
    expect(filas.map((f) => f.status)).toEqual(['sent', 'sent', 'sent'])
  })
})
