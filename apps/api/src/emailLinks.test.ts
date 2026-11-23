import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { EMAIL_JWT_TTL_S, RESET_TOKEN_TTL_S } from '@cyclingstar/shared'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import type { MailMessage } from './mailer.js'
import { createMailQueue } from './mailQueue.js'

/**
 * LOS ENLACES DE CORREO, DE PUNTA A PUNTA (docs/cuenta.md §5.1, §5.2 y §5.4; D-12, I-04, 5-h; PR 8).
 *
 * Los dos correos llevan a la página de botón con el token en el fragmento (`#token=`), que el navegador
 * no manda: lo que llega al servidor al abrir el enlace no trae el token y no cambia nada. Confirmar es
 * pulsar, que manda el token en el cuerpo de `POST /api/account/verify-email` y deja la sesión; recuperar
 * es `POST /api/auth/reset-password`, también con el token en el cuerpo. Y los enlaces viejos, con el token
 * en la URL, siguen valiendo `LEGACY_LINK_GRACE_DAYS` (hasta el PR 19).
 */
const BASE = 'http://localhost:3000'
const PASSWORD = 'contrasena-larga'
const CORREO = 'rosa@example.com'

describe('los enlaces de correo, contra una base real', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  const sent: MailMessage[] = []
  const cola = createMailQueue()
  const poolBefore = process.env.DB_POOL_MAX

  const post = (url: string, body: unknown, cookie?: string) =>
    app.inject({
      method: 'POST',
      url,
      headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) },
      payload: JSON.stringify(body),
    })
  const get = (url: string, cookie?: string) =>
    app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} })

  /** Lo que salió desde la última vez, ya con la cola vacía. */
  async function salidos(): Promise<MailMessage[]> {
    await cola.drain()
    return sent.splice(0)
  }
  /** El enlace del correo: la única URL absoluta del texto plano. */
  const enlaceDe = (m: MailMessage | undefined): URL => {
    const url = m?.text.match(/https?:\/\/\S+/)?.[0]
    if (!url) throw new Error('el correo no trae enlace')
    return new URL(url)
  }
  /** El token del fragmento, como lo lee la página. */
  const tokenDe = (u: URL): string => new URLSearchParams(u.hash.slice(1)).get('token') ?? ''
  const cookiesDe = (res: { headers: Record<string, unknown> }): string => {
    const h = res.headers['set-cookie']
    const lista = Array.isArray(h) ? (h as string[]) : typeof h === 'string' ? [h] : []
    return lista.map((c) => c.split(';')[0]).join('; ')
  }
  const confirmado = async (email: string): Promise<boolean> => {
    const [fila] = await tdb.client<{ email_verified: boolean }[]>`
      select email_verified from users where email = ${email}`
    return fila!.email_verified
  }

  /** Una cuenta aprobada sin confirmar, y el `verify_signup` que le llega. */
  async function cuentaPorConfirmar(email: string): Promise<URL> {
    await post('/api/auth/sign-up/email', {
      name: '',
      email,
      password: PASSWORD,
      birthDate: '1990-01-01',
    })
    await tdb.client`update users set status = 'approved', approved_at = now() where email = ${email}`
    await salidos()
    await post('/api/auth/send-verification-email', { email })
    const [correo] = await salidos()
    return enlaceDe(correo)
  }

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
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

  afterEach(() => {
    vi.useRealTimers()
  })

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('verify_signup lleva a /verify-email#token=: ni la ruta de la API ni el token en lo que llega al servidor', async () => {
    const enlace = await cuentaPorConfirmar(CORREO)
    expect(enlace.origin).toBe(BASE)
    expect(enlace.pathname).toBe('/verify-email')
    expect(enlace.search).toBe('')
    expect(enlace.hash).toMatch(/^#token=[\w.-]+$/)
    // el JWT vive EMAIL_JWT_TTL_S (24 horas)
    const payload = JSON.parse(
      Buffer.from(tokenDe(enlace).split('.')[1]!, 'base64url').toString('utf8'),
    ) as { exp: number; iat: number }
    expect(payload.exp - payload.iat).toBe(EMAIL_JWT_TTL_S)
  })

  it('abrir el enlace no confirma nada: lo que llega al servidor es /verify-email, sin token', async () => {
    const enlace = await cuentaPorConfirmar('abre@example.com')
    const res = await get(`${enlace.pathname}${enlace.search}`)
    expect(res.headers['set-cookie']).toBeUndefined()
    expect(await confirmado('abre@example.com')).toBe(false)
  })

  it('pulsar el botón confirma con el token en el cuerpo del POST y deja la sesión', async () => {
    const enlace = await cuentaPorConfirmar('pulsa@example.com')
    const res = await post('/api/account/verify-email', { token: tokenDe(enlace) })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: true })
    const cookie = cookiesDe(res)
    expect(cookie).toContain('session_token')
    expect(await confirmado('pulsa@example.com')).toBe(true)
    const sesion = await get('/api/auth/get-session', cookie)
    expect((sesion.json() as { user: { email: string } }).user.email).toBe('pulsa@example.com')

    // el mismo token, otra vez: 200 sin sesión nueva (la cuenta ya está confirmada, §5.1)
    const otra = await post('/api/account/verify-email', { token: tokenDe(enlace) })
    expect(otra.statusCode).toBe(200)
    expect(cookiesDe(otra)).not.toContain('session_token')
  })

  it('el token caducado da TOKEN_EXPIRED, el malo INVALID_TOKEN, y sin token, 400', async () => {
    const enlace = await cuentaPorConfirmar('tarde@example.com')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + (EMAIL_JWT_TTL_S + 60) * 1000)
    const tarde = await post('/api/account/verify-email', { token: tokenDe(enlace) })
    vi.useRealTimers()
    expect(tarde.statusCode).toBe(401)
    expect(tarde.json()).toEqual({ code: 'TOKEN_EXPIRED' })
    expect(cookiesDe(tarde)).toBe('')
    expect(await confirmado('tarde@example.com')).toBe(false)

    const malo = await post('/api/account/verify-email', { token: 'no-es-un-jwt' })
    expect(malo.statusCode).toBe(401)
    expect(malo.json()).toEqual({ code: 'INVALID_TOKEN' })
    expect((await post('/api/account/verify-email', {})).statusCode).toBe(400)
  })

  it('reset_password lleva a /reset-password#token=, el POST con el token en el cuerpo guarda, y el usado da INVALID_TOKEN', async () => {
    await post('/api/auth/request-password-reset', { email: CORREO, redirectTo: '/reset-password' })
    const [correo] = await salidos()
    const enlace = enlaceDe(correo)
    expect(enlace.pathname).toBe('/reset-password')
    expect(enlace.search).toBe('')
    expect(enlace.hash).toMatch(/^#token=\w+$/)
    expect(correo!.text).not.toContain('/api/auth/')
    // la fila del token vive RESET_TOKEN_TTL_S (una hora)
    const [fila] = await tdb.client<{ vida: number }[]>`
      select extract(epoch from expires_at - created_at)::int as vida from verifications
      where value = (select id::text from users where email = ${CORREO})`
    expect(fila!.vida).toBe(RESET_TOKEN_TTL_S)

    const token = tokenDe(enlace)
    const reset = await post('/api/auth/reset-password', { token, newPassword: 'otra-contrasena' })
    expect(reset.statusCode).toBe(200)
    const usado = await post('/api/auth/reset-password', { token, newPassword: 'tercera-clave' })
    expect(usado.statusCode).toBe(400)
    expect((usado.json() as { code: string }).code).toBe('INVALID_TOKEN')
  })

  /*
    LA GRACIA DE LOS ENLACES VIEJOS (§5.2; LEGACY_LINK_GRACE_DAYS): los que salieron antes del PR 8 llevan el
    token en la URL de la API, y siguen valiendo hasta que el PR 19 quite su código.
  */
  it('el enlace viejo de recuperar sigue llevando a /reset-password?token=', async () => {
    await post('/api/auth/request-password-reset', { email: CORREO, redirectTo: '/reset-password' })
    const token = tokenDe(enlaceDe((await salidos())[0]))
    const res = await get(`/api/auth/reset-password/${token}?callbackURL=%2Freset-password`)
    expect(res.statusCode).toBe(302)
    const destino = new URL(res.headers.location as string, BASE)
    expect(destino.pathname).toBe('/reset-password')
    expect(destino.searchParams.get('token')).toBe(token)
  })

  it('el enlace viejo de confirmar sigue confirmando y abriendo sesión', async () => {
    const token = tokenDe(await cuentaPorConfirmar('vieja@example.com'))
    const res = await get(`/api/auth/verify-email?token=${token}&callbackURL=%2Fverify-email`)
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/verify-email')
    expect(cookiesDe(res)).toContain('session_token')
    expect(await confirmado('vieja@example.com')).toBe(true)
  })
})
