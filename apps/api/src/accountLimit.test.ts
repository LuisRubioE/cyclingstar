import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import type { FastifyRequest } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import { clientIp, ipBucket } from './clientIp.js'
import { DEVICE_COOKIE, createDeviceCookies } from './deviceCookie.js'
import type { MailMessage } from './mailer.js'
import { createMailQueue } from './mailQueue.js'

/**
 * LOS LÍMITES DE INTENTO, DE PUNTA A PUNTA (docs/cuenta.md §7 y §17; PR 6). Contra una base de verdad
 * (PGlite con todas las migraciones): la reserva antes de reenviar aguanta una ráfaga, `cs_device` impide
 * que un tercero cierre la cuenta del dueño, L3 se cuenta por sesión, la firma lleva el id de la cuenta y
 * `device_epoch` invalida las cookies viejas al cambiar la contraseña.
 *
 * Cada intento sale de una IP distinta (`x-forwarded-for`): así se mide la capa por cuenta, no el límite
 * de Fastify por IP (10 cada 5 minutos), que es otra capa.
 */
const BASE = 'http://localhost:3000'
const SECRET = 's'.repeat(32)
const BUENA = 'contrasena-buena'
const MALA = 'contrasena-mala'

let ipSiguiente = 1
/** Una IP nueva en cada intento: el atacante que reparte entre mil IP (A2). */
const ipNueva = (): string => {
  const n = ipSiguiente++
  return `198.51.${Math.floor(n / 250)}.${(n % 250) + 1}`
}

/** El valor de una `Set-Cookie` de la respuesta, como `nombre=valor`, o null. */
function cookieDe(res: { headers: Record<string, unknown> }, nombre: string): string | null {
  const crudas = res.headers['set-cookie']
  const lista = Array.isArray(crudas) ? crudas : typeof crudas === 'string' ? [crudas] : []
  for (const c of lista as string[]) {
    if (c.startsWith(`${nombre}=`)) return c.split(';')[0] ?? null
  }
  return null
}

describe('límites por cuenta, aparato y sesión, contra una base real', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  const sent: MailMessage[] = []
  const cola = createMailQueue()
  const poolBefore = process.env.DB_POOL_MAX

  const post = (path: string, body: unknown, cookie?: string, ip = ipNueva()) =>
    app.inject({
      method: 'POST',
      url: `/api/auth${path}`,
      headers: {
        'content-type': 'application/json',
        origin: BASE,
        'x-forwarded-for': ip,
        ...(cookie ? { cookie } : {}),
      },
      payload: JSON.stringify(body),
    })

  const entrar = (email: string, password: string, cookie?: string) =>
    post('/sign-in/email', { email, password }, cookie)

  /** Una cuenta aprobada y confirmada, lista para entrar. */
  async function cuenta(email: string): Promise<void> {
    await post('/sign-up/email', { name: '', email, password: BUENA })
    await tdb.client`update users set status = 'approved', email_verified = true where email = ${email}`
  }

  /** Entra con la buena y devuelve la cookie de sesión y la `cs_device`. */
  async function sesion(email: string, password = BUENA, cookie?: string) {
    const res = await entrar(email, password, cookie)
    expect(res.statusCode).toBe(200)
    const sesionCookie = cookieDe(res, 'better-auth.session_token')
    const device = cookieDe(res, DEVICE_COOKIE)
    expect(sesionCookie).not.toBeNull()
    expect(device).not.toBeNull()
    return { session: sesionCookie!, device: device! }
  }

  /** `n` intentos malos a la vez, cada uno desde un navegador nuevo y una IP nueva. */
  const rafaga = (email: string, n: number) =>
    Promise.all(Array.from({ length: n }, () => entrar(email, MALA)))

  beforeAll(async () => {
    // PGlite admite una sesión; los correos de better-auth leen la base en segundo plano.
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: SECRET,
      baseURL: BASE,
      mailQueue: cola,
      mailer: {
        async send(message) {
          sent.push(message)
          return true
        },
      },
    })
    app = buildApp({ db: tdb.db, auth, serveWeb: false })
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('la ráfaga: 40 a la vez contra un correo con L1 de 10, pasan 10 y 30 dan 429; la buena con su cs_device entra', async () => {
    const email = 'rafaga@example.com'
    await cuenta(email)
    const { device } = await sesion(email)

    const res = await rafaga(email, 40)
    const codigos = res.map((r) => r.statusCode)
    expect(codigos.filter((c) => c === 429)).toHaveLength(30)
    expect(codigos.filter((c) => c === 401)).toHaveLength(10)
    const bloqueo = res.find((r) => r.statusCode === 429)!
    expect(bloqueo.json()).toMatchObject({
      code: 'ACCOUNT_LOCKED',
      message:
        'Too many failed attempts on this account. Try again in 15 minutes, or reset your password.',
    })
    expect(bloqueo.json().retryAfterS).toBeGreaterThan(890)
    expect(Number(bloqueo.headers['retry-after'])).toBe(bloqueo.json().retryAfterS)
    // una sola fila de contador para el correo, con el HMAC y no el correo
    const filas = await tdb.client<
      { key: string }[]
    >`select key from auth_limits where key like 'acct:%'`
    expect(filas).toHaveLength(1)
    expect(filas[0]!.key).not.toContain('rafaga')

    // sin cs_device, ni la buena entra mientras dura el cierre
    expect((await entrar(email, BUENA)).statusCode).toBe(429)
    // con la cs_device de esta cuenta, la buena entra (L2)
    expect((await entrar(email, BUENA, device)).statusCode).toBe(200)
  })

  it('L1 cuenta igual con un correo que no existe: el 429 no delata cuentas', async () => {
    const res = await rafaga('nadie@example.com', 11)
    expect(res.map((r) => r.statusCode).filter((c) => c === 429)).toHaveLength(1)
    expect(res.find((r) => r.statusCode === 429)!.json().code).toBe('ACCOUNT_LOCKED')
  })

  it('un atacante no bloquea al dueño: tras recuperar, el navegador que recupera tiene cs_device y entra', async () => {
    const email = 'dueno@example.com'
    await cuenta(email)
    await rafaga(email, 10)
    expect((await entrar(email, BUENA)).statusCode).toBe(429)

    // el dueño, en un navegador nuevo, recupera
    sent.length = 0
    expect(
      (await post('/request-password-reset', { email, redirectTo: '/reset-password' })).statusCode,
    ).toBe(200)
    await cola.drain()
    const token = /\/reset-password#token=(\w+)/.exec(sent[0]!.text)?.[1]
    expect(token).toBeDefined()
    const nueva = 'contrasena-nueva'
    const reset = await post('/reset-password', { token, newPassword: nueva })
    expect(reset.statusCode).toBe(200)
    const device = cookieDe(reset, DEVICE_COOKIE)
    expect(device).not.toBeNull()
    const crudo = ([reset.headers['set-cookie']].flat() as string[]).find((c) =>
      c.startsWith(`${DEVICE_COOKIE}=`),
    )!
    expect(crudo).toMatch(/; Path=\/api\/auth; Max-Age=15552000; HttpOnly; SameSite=Lax/)

    // el atacante sigue: 10 fallos más
    await rafaga(email, 10)
    // desde otro navegador nuevo, la nueva da 429; desde el que recuperó, entra
    expect((await entrar(email, nueva)).statusCode).toBe(429)
    expect((await entrar(email, nueva, device!)).statusCode).toBe(200)
  })

  it('L3 por sesión: 5 contraseñas malas cierran change-password en esa sesión, no en las otras del dueño', async () => {
    const email = 'sesiones@example.com'
    await cuenta(email)
    const a = await sesion(email)
    const b = await sesion(email)
    const cambiar = (cookie: string) =>
      post('/change-password', { currentPassword: MALA, newPassword: 'otra-contrasena' }, cookie)

    for (let i = 0; i < 5; i++) expect((await cambiar(a.session)).statusCode).toBe(400)
    const sexta = await cambiar(a.session)
    expect(sexta.statusCode).toBe(429)
    expect(sexta.json()).toMatchObject({
      code: 'PASSWORD_ATTEMPTS_LOCKED',
      message: 'Too many wrong passwords. Try again in 15 minutes.',
    })
    expect(sexta.json().signedOut).toBeUndefined()
    // borrar la cuenta también pasa por L3 (7-c)
    expect((await post('/delete-user', { password: MALA }, a.session)).statusCode).toBe(429)
    // la otra sesión del dueño sigue pudiendo
    expect((await cambiar(b.session)).statusCode).toBe(400)
  })

  it('L3: al décimo fallo del día, el proxy cierra esa sesión y dice signedOut', async () => {
    const email = 'decimo@example.com'
    await cuenta(email)
    const a = await sesion(email)
    const cambiar = () =>
      post('/change-password', { currentPassword: MALA, newPassword: 'otra-contrasena' }, a.session)
    for (let i = 0; i < 5; i++) await cambiar()
    // pasado el cierre de 15 minutos (aquí, a mano), la ventana corta empieza otra vez y el día sigue
    await tdb.client`update auth_limits set count = 0, locked_until = null,
      window_start = now() - interval '1 hour' where key like 'pw:%'`
    const dia = async () =>
      (
        await tdb.client<
          { n: number }[]
        >`select max(day_count)::int as n from auth_limits where key like 'pw:%'`
      )[0]!.n
    while ((await dia()) < 9) expect((await cambiar()).statusCode).toBe(400)
    const decima = await cambiar()
    expect(decima.statusCode).toBe(429)
    expect(decima.json()).toMatchObject({ code: 'PASSWORD_ATTEMPTS_LOCKED', signedOut: true })
    const yaNo = await app.inject({
      method: 'GET',
      url: '/api/auth/get-session',
      headers: { cookie: a.session },
    })
    expect(yaNo.body).toBe('null')
  })

  it('device_epoch: cambiar la contraseña invalida las cs_device viejas y reemite la propia', async () => {
    const email = 'epoch@example.com'
    await cuenta(email)
    const uno = await sesion(email)
    const dos = await sesion(email)
    const nueva = 'contrasena-cambiada'
    const cambio = await post(
      '/change-password',
      { currentPassword: BUENA, newPassword: nueva, revokeOtherSessions: true },
      `${uno.session}; ${uno.device}`,
    )
    expect(cambio.statusCode).toBe(200)
    const reemitida = cookieDe(cambio, DEVICE_COOKIE)
    expect(reemitida).not.toBeNull()
    const [fila] = await tdb.client<{ device_epoch: number }[]>`
      select device_epoch from users where email = ${email}`
    expect(fila!.device_epoch).toBe(1)

    await rafaga(email, 10)
    // el navegador que no cambió la contraseña ya no es conocido; el que la cambió, sí
    expect((await entrar(email, nueva, dos.device)).statusCode).toBe(429)
    expect((await entrar(email, nueva, reemitida!)).statusCode).toBe(200)
  })

  it('L4: pasadas 20 peticiones de correo en el día desde una IP, 429 como el de Fastify', async () => {
    const ip = '203.0.113.50'
    expect(
      (
        await post(
          '/request-password-reset',
          { email: 'x@example.com', redirectTo: '/r' },
          undefined,
          ip,
        )
      ).statusCode,
    ).toBe(200)
    // las otras 19 del día, a mano: el límite de Fastify por IP (10 cada 5 minutos) llegaría antes
    await tdb.client`update auth_limits set count = 20 where key like 'mailip:%'`
    const res = await post('/send-verification-email', { email: 'x@example.com' }, undefined, ip)
    expect(res.statusCode).toBe(429)
    expect(res.json()).toMatchObject({ ok: false, error: 'demasiadas_peticiones' })
    expect(res.json().retryAfterS).toBeGreaterThan(86_000)
    // otra IP sigue
    const otra = await post(
      '/send-verification-email',
      { email: 'x@example.com' },
      undefined,
      '203.0.113.51',
    )
    expect(otra.statusCode).toBe(200)
  })
})

describe('cs_device: la firma (§7.5; 7-l)', () => {
  const cookies = createDeviceCookies(SECRET, true)
  const valor = (setCookie: string): string => setCookie.split(';')[0]!

  it('la entrada de una cuenta no vale para otra con el mismo correo y el mismo epoch', () => {
    const cabecera = cookies.issue([], 'a@example.com', { id: 'cuenta-vieja', deviceEpoch: 0 })
    expect(cabecera).toMatch(/; Secure$/)
    const entradas = cookies.read(valor(cabecera))
    expect(
      cookies.validFor(entradas, 'A@example.com ', { id: 'cuenta-vieja', deviceEpoch: 0 }),
    ).not.toBeNull()
    expect(
      cookies.validFor(entradas, 'a@example.com', { id: 'cuenta-nueva', deviceEpoch: 0 }),
    ).toBeNull()
    expect(
      cookies.validFor(entradas, 'a@example.com', { id: 'cuenta-vieja', deviceEpoch: 1 }),
    ).toBeNull()
    expect(
      cookies.validFor(entradas, 'b@example.com', { id: 'cuenta-vieja', deviceEpoch: 0 }),
    ).toBeNull()
    // con otro secreto, tampoco
    expect(
      createDeviceCookies('t'.repeat(32), true).validFor(entradas, 'a@example.com', {
        id: 'cuenta-vieja',
        deviceEpoch: 0,
      }),
    ).toBeNull()
  })

  it('cinco cuentas por navegador: la sexta saca a la más vieja', () => {
    let cabecera = ''
    for (let i = 1; i <= 6; i++) {
      cabecera = cookies.issue(cookies.read(valor(cabecera)), `c${i}@example.com`, {
        id: `id${i}`,
        deviceEpoch: 0,
      })
    }
    const entradas = cookies.read(valor(cabecera))
    expect(entradas).toHaveLength(5)
    expect(cookies.validFor(entradas, 'c1@example.com', { id: 'id1', deviceEpoch: 0 })).toBeNull()
    expect(
      cookies.validFor(entradas, 'c6@example.com', { id: 'id6', deviceEpoch: 0 }),
    ).not.toBeNull()
    expect(valor(cabecera).length).toBeLessThan(500)
  })
})

describe('clientIp e ipBucket (§7.1; 7-i)', () => {
  const pide = (ip: string, socket = '10.0.0.1') =>
    ({
      ip,
      socket: { remoteAddress: socket },
      log: { warn: () => {} },
    }) as unknown as FastifyRequest

  it('request.ip si es una IP; si no, la del socket', () => {
    expect(clientIp(pide('203.0.113.7'))).toBe('203.0.113.7')
    expect(clientIp(pide('basura'))).toBe('10.0.0.1')
  })

  it('una IPv6 cuenta por su /64; una IPv4, entera', () => {
    expect(ipBucket('203.0.113.7')).toBe('203.0.113.7')
    expect(ipBucket('2001:db8:1:2:aaaa::1')).toBe('2001:db8:1:2::/64')
    expect(ipBucket('2001:db8:1:2:ffff:ffff:ffff:ffff')).toBe('2001:db8:1:2::/64')
    expect(ipBucket('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(ipBucket('::ffff:203.0.113.7')).toBe('203.0.113.7')
  })
})
