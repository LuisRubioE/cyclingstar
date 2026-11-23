import { clearHorizonCaches } from '@cyclingstar/db'
import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { awayResponseSchema, welcomeBackResponseSchema } from '@cyclingstar/shared'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import { createMailQueue } from './mailQueue.js'

/**
 * LA AUSENCIA, DE PUNTA A PUNTA (docs/cuenta.md §14 y §17; PR 13 de E4). Contra una base de verdad: declararla
 * con su fecha de vuelta; menos de 12 horas, una fecha pasada o más de 28 días, 400 `fecha_fuera_de_rango` con
 * la ventana; cambiar la fecha conserva `away_since` y cuenta el máximo desde ahora; entrar no la termina;
 * `End now` la termina y abre `Welcome back`, que se cierra con su `DELETE`; la que acaba sola a su fecha
 * abre `Welcome back` en la primera visita; y el `CHECK` de pareja rechaza una sola columna.
 */
const BASE = 'http://localhost:3000'
const SECRET = 'a'.repeat(32)
const EMAIL = 'ausente@example.com'
const BUENA = 'contrasena-buena'
const HORA = 3_600_000
const DIA = 24 * HORA

describe('la ausencia, contra una base real (§14)', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  let cookie = ''
  const poolBefore = process.env.DB_POOL_MAX

  const pide = (method: 'GET' | 'PUT' | 'DELETE', url: string, body?: unknown, c = cookie) =>
    app.inject({
      method,
      url,
      headers: {
        origin: BASE,
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(c !== '' ? { cookie: c } : {}),
      },
      ...(body !== undefined ? { payload: JSON.stringify(body) } : {}),
    })
  const declara = (until: Date | string) =>
    pide('PUT', '/api/me/away', { until: typeof until === 'string' ? until : until.toISOString() })

  const fila = async () =>
    (
      await tdb.client<
        {
          away_since: string | null
          away_until: string | null
          welcome_back_from: string | null
        }[]
      >`select away_since::text, away_until::text, welcome_back_from::text from users where email = ${EMAIL}`
    )[0]!

  async function entra(): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { origin: BASE, 'content-type': 'application/json' },
      payload: JSON.stringify({ email: EMAIL, password: BUENA }),
    })
    expect(res.statusCode).toBe(200)
    const crudas = res.headers['set-cookie']
    const lista = Array.isArray(crudas) ? crudas : crudas ? [crudas] : []
    return lista.map((c) => c.split(';')[0]).join('; ')
  }

  /** La escritura de `get-session` va sin esperar: se mira hasta que llega, o hasta rendirse. */
  async function hasta<T>(leer: () => Promise<T>, vale: (v: T) => boolean): Promise<T> {
    let v = await leer()
    for (let i = 0; i < 50 && !vale(v); i++) {
      await new Promise((r) => setTimeout(r, 20))
      v = await leer()
    }
    return v
  }

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: SECRET,
      baseURL: BASE,
      mailQueue: createMailQueue(),
      mailer: { send: async () => true },
    })
    app = buildApp({ db: tdb.db, auth, serveWeb: false })
    await auth.api.signUpEmail({
      body: { name: '', email: EMAIL, password: BUENA, birthDate: '1990-01-01' },
    })
    await tdb.client`update users set status = 'approved', email_verified = true where email = ${EMAIL}`
    cookie = await entra()
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  beforeEach(async () => {
    clearHorizonCaches()
    await tdb.client`update users set away_since = null, away_until = null, welcome_back_from = null where email = ${EMAIL}`
  })

  it('sin sesión, 401 las cinco', async () => {
    for (const [m, u] of [
      ['GET', '/api/me/away'],
      ['PUT', '/api/me/away'],
      ['DELETE', '/api/me/away'],
      ['GET', '/api/me/welcome-back'],
      ['DELETE', '/api/me/welcome-back'],
    ] as const)
      expect((await pide(m, u, m === 'PUT' ? { until: 'x' } : undefined, '')).statusCode).toBe(401)
  })

  it('sin ausencia: las dos a null y las líneas de quien no tiene corredor', async () => {
    const res = await pide('GET', '/api/me/away')
    expect(res.statusCode).toBe(200)
    expect(awayResponseSchema.parse(res.json())).toEqual({
      ok: true,
      awaySince: null,
      awayUntil: null,
      facts: { rider: null, managesTeam: false },
    })
  })

  it('declararla: away_since es ahora y la vuelta, la pedida', async () => {
    const until = new Date(Date.now() + 7 * DIA)
    const antes = Date.now()
    const res = await declara(until)
    expect(res.statusCode).toBe(200)
    const a = awayResponseSchema.parse(res.json())
    expect(a.awayUntil).toBe(until.toISOString())
    expect(new Date(a.awaySince!).getTime()).toBeGreaterThanOrEqual(antes - 1000)
    expect(awayResponseSchema.parse((await pide('GET', '/api/me/away')).json())).toEqual(a)
  })

  it('con su desfase: las 00:00 locales del día elegido', async () => {
    const d = new Date(Date.now() + 3 * DIA)
    const local = `${d.toISOString().slice(0, 10)}T00:00:00+02:00`
    const res = await declara(local)
    expect(res.statusCode).toBe(200)
    expect(res.json().awayUntil).toBe(new Date(local).toISOString())
  })

  it('los límites: menos de 12 horas, una fecha pasada y más de 28 días dan 400 con la ventana', async () => {
    for (const until of [
      new Date(Date.now() + 11 * HORA),
      new Date(Date.now() - DIA),
      new Date(Date.now() + 28 * DIA + HORA),
    ]) {
      const res = await declara(until)
      expect(res.statusCode).toBe(400)
      const body = res.json()
      expect(body).toMatchObject({ ok: false, error: 'fecha_fuera_de_rango' })
      expect(new Date(body.min).getTime() - Date.now()).toBeGreaterThan(11.9 * HORA)
      expect(new Date(body.max).getTime() - Date.now()).toBeLessThanOrEqual(28 * DIA)
    }
    expect((await fila()).away_until).toBeNull()
    // los bordes de dentro valen
    expect((await declara(new Date(Date.now() + 12 * HORA + 60_000))).statusCode).toBe(200)
    expect((await declara(new Date(Date.now() + 28 * DIA - 60_000))).statusCode).toBe(200)
  })

  it('un cuerpo malo: 400 VALIDATION_ERROR', async () => {
    for (const body of [{}, { until: '2026-12-03' }, { until: 'mañana' }, { until: 1 }]) {
      const res = await pide('PUT', '/api/me/away', body)
      expect(res.statusCode).toBe(400)
      expect(res.json()).toEqual({ ok: false, error: 'VALIDATION_ERROR' })
    }
  })

  it('cambiar la fecha la sustituye y conserva away_since (14-e)', async () => {
    const primera = awayResponseSchema.parse((await declara(new Date(Date.now() + 5 * DIA))).json())
    const nueva = new Date(Date.now() + 20 * DIA)
    const segunda = awayResponseSchema.parse((await declara(nueva)).json())
    expect(segunda.awaySince).toBe(primera.awaySince)
    expect(segunda.awayUntil).toBe(nueva.toISOString())
  })

  it('entrar no la termina: otra sesión y su get-session la dejan como estaba', async () => {
    await declara(new Date(Date.now() + 7 * DIA))
    const antes = await fila()
    // la última visita, vieja, para que get-session escriba de verdad
    await tdb.client`update users set last_seen_at = now() - interval '9 days' where email = ${EMAIL}`
    const otra = await entra()
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { cookie: otra },
    })
    expect(res.statusCode).toBe(200)
    await hasta(
      async () =>
        (
          await tdb.client<
            { reciente: boolean }[]
          >`select last_seen_at > now() - interval '1 minute' as reciente from users where email = ${EMAIL}`
        )[0]!.reciente,
      (x) => x,
    )
    const despues = await fila()
    expect(despues.away_since).toBe(antes.away_since)
    expect(despues.away_until).toBe(antes.away_until)
    expect(
      awayResponseSchema.parse(
        await pide('GET', '/api/me/away', undefined, otra).then((r) => r.json()),
      ).awayUntil,
    ).not.toBeNull()
    // y, con la ausencia viva, Welcome back espera
    expect((await pide('GET', '/api/me/welcome-back')).json()).toEqual({
      ok: true,
      welcomeBack: null,
    })
  })

  it('End now: la vuelta es ahora, away_since se queda y Welcome back cuenta desde ella', async () => {
    const a = awayResponseSchema.parse((await declara(new Date(Date.now() + 7 * DIA))).json())
    // como si hubiera salido hace tres días
    await tdb.client`update users set away_since = now() - interval '3 days', last_seen_at = now() - interval '3 days' where email = ${EMAIL}`
    const res = await pide('DELETE', '/api/me/away')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    const f = await fila()
    expect(f.away_since).not.toBeNull()
    expect(f.welcome_back_from).toBe(f.away_since)
    expect(new Date(f.away_until!).getTime()).toBeLessThanOrEqual(Date.now())
    expect(new Date(f.away_until!).getTime()).toBeLessThan(new Date(a.awayUntil!).getTime())
    expect((await pide('GET', '/api/me/away')).json()).toMatchObject({
      awaySince: null,
      awayUntil: null,
    })
    const w = welcomeBackResponseSchema.parse((await pide('GET', '/api/me/welcome-back')).json())
    expect(w.welcomeBack).toMatchObject({ days: 3, gameDays: 0, rider: null })
    // sin ausencia viva, DELETE da 200 y no toca nada
    expect((await pide('DELETE', '/api/me/away')).statusCode).toBe(200)
    expect((await fila()).welcome_back_from).toBe(f.welcome_back_from)
  })

  it('cerrar Welcome back la pone a nula, y la visita siguiente no la reabre', async () => {
    await declara(new Date(Date.now() + 7 * DIA))
    await pide('DELETE', '/api/me/away')
    expect((await fila()).welcome_back_from).not.toBeNull()
    const res = await pide('DELETE', '/api/me/welcome-back')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect((await fila()).welcome_back_from).toBeNull()
    expect((await pide('GET', '/api/me/welcome-back')).json()).toEqual({
      ok: true,
      welcomeBack: null,
    })
    // pasada la hora, get-session escribe otra vez: End now contó como visita y no la reabre
    await tdb.client`update users set last_seen_at = last_seen_at - interval '2 hours',
      away_since = away_since - interval '2 hours', away_until = away_until - interval '2 hours'
      where email = ${EMAIL}`
    clearHorizonCaches()
    await app.inject({ method: 'GET', url: '/api/auth/get-session', headers: { cookie } })
    await new Promise((r) => setTimeout(r, 200))
    expect((await fila()).welcome_back_from).toBeNull()
  })

  it('la que acaba sola a su fecha abre Welcome back en la primera visita, con away_since', async () => {
    await tdb.client`update users set away_since = now() - interval '10 days', away_until = now() - interval '1 hour',
      last_seen_at = now() - interval '9 days' where email = ${EMAIL}`
    clearHorizonCaches()
    await app.inject({ method: 'GET', url: '/api/auth/get-session', headers: { cookie } })
    const f = await hasta(fila, (x) => x.welcome_back_from !== null)
    expect(f.welcome_back_from).toBe(f.away_since)
    const w = welcomeBackResponseSchema.parse((await pide('GET', '/api/me/welcome-back')).json())
    expect(w.welcomeBack?.days).toBe(10)
  })

  it('el CHECK de pareja rechaza una sola columna, y una vuelta anterior a la salida', async () => {
    await expect(
      tdb.client`update users set away_until = now() + interval '1 day' where email = ${EMAIL}`,
    ).rejects.toThrow(/users_away_pair/)
    await expect(
      tdb.client`update users set away_since = now(), away_until = now() - interval '1 day' where email = ${EMAIL}`,
    ).rejects.toThrow(/users_away_pair/)
  })
})
