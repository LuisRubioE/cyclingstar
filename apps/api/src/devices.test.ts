import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { devicesResponseSchema, meAccountResponseSchema } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import { DEVICE_COOKIE, createDeviceCookies } from './deviceCookie.js'
import { limitKeys } from './limitKeys.js'
import { createMailQueue } from './mailQueue.js'

/**
 * LOS APARATOS DE LA CUENTA, DE PUNTA A PUNTA (docs/cuenta.md §6.4, §6.5 y §12.1; PR 11). Contra una base de
 * verdad: `GET /api/me/devices` sin token, IP ni agente crudo, con un id de 16 hex que no sirve como cookie;
 * otra cuenta no ve ni cierra tus sesiones; la propia da 409 `usa_sign_out`; `sign-out-others` deja solo
 * la tuya, sube `device_epoch`, borra las claves `pw:` de las sesiones cerradas y reemite la `cs_device`
 * de este navegador; `forget` quita su entrada y deja las de las otras cuentas. Y `GET /api/me/account`
 * completa (12-b).
 */
const BASE = 'http://localhost:3000'
const SECRET = 's'.repeat(32)
const BUENA = 'contrasena-buena'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'

let ipSiguiente = 1
const ipNueva = (): string => {
  const n = ipSiguiente++
  return `203.0.${Math.floor(n / 250)}.${(n % 250) + 1}`
}

/** Las `Set-Cookie` de una respuesta. */
const setCookies = (res: { headers: Record<string, unknown> }): string[] => {
  const crudas = res.headers['set-cookie']
  return (Array.isArray(crudas) ? crudas : typeof crudas === 'string' ? [crudas] : []) as string[]
}

/** El valor de una `Set-Cookie`, como `nombre=valor`, o null. */
function cookieDe(res: { headers: Record<string, unknown> }, nombre: string): string | null {
  return (
    setCookies(res)
      .find((c) => c.startsWith(`${nombre}=`))
      ?.split(';')[0] ?? null
  )
}

describe('los aparatos de la cuenta, contra una base real (§6.4 y §6.5)', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  const cola = createMailQueue()
  const poolBefore = process.env.DB_POOL_MAX
  const devices = createDeviceCookies(SECRET, false)
  const keys = limitKeys(SECRET)

  const post = (path: string, body: unknown, cookie?: string, ua = ANDROID) =>
    app.inject({
      method: 'POST',
      url: path,
      headers: {
        'content-type': 'application/json',
        origin: BASE,
        'user-agent': ua,
        'x-forwarded-for': ipNueva(),
        ...(cookie ? { cookie } : {}),
      },
      payload: JSON.stringify(body),
    })

  const get = (url: string, cookie?: string) =>
    app.inject({
      method: 'GET',
      url,
      headers: { 'x-forwarded-for': ipNueva(), ...(cookie ? { cookie } : {}) },
    })

  const borrar = (id: string, cookie: string) =>
    app.inject({
      method: 'DELETE',
      url: `/api/me/devices/${id}`,
      headers: { origin: BASE, 'x-forwarded-for': ipNueva(), cookie },
    })

  async function cuenta(email: string): Promise<void> {
    await post('/api/auth/sign-up/email', {
      name: '',
      email,
      password: BUENA,
      birthDate: '1990-01-01',
    })
    await tdb.client`update users set status = 'approved', email_verified = true where email = ${email}`
  }

  /** Entra desde un navegador con ese agente; `device` es la `cs_device` que ya traía. */
  async function sesion(email: string, ua: string, device?: string) {
    const res = await post('/api/auth/sign-in/email', { email, password: BUENA }, device, ua)
    expect(res.statusCode).toBe(200)
    const session = cookieDe(res, 'better-auth.session_token')!
    const cs = cookieDe(res, DEVICE_COOKIE)!
    return { session, device: cs, both: `${session}; ${cs}` }
  }

  const dueño = async (email: string) => {
    const [u] = await tdb.client<
      { id: string; device_epoch: number }[]
    >`select id, device_epoch from users where email = ${email}`
    return { id: u!.id, deviceEpoch: u!.device_epoch }
  }

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: SECRET,
      baseURL: BASE,
      mailQueue: cola,
      mailer: { send: async () => true },
    })
    app = buildApp({ db: tdb.db, auth, serveWeb: false })
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('GET /api/me/devices: las sesiones de la cuenta, la propia marcada, sin token, IP ni agente crudo', async () => {
    const email = 'lista@example.com'
    await cuenta(email)
    const a = await sesion(email, ANDROID)
    await sesion(email, IPHONE)
    // la del iPhone, la más reciente: la lista va por `updated_at` descendente
    const res = await get('/api/me/devices', a.session)
    expect(res.statusCode).toBe(200)
    const cuerpo = devicesResponseSchema.parse(res.json())
    expect(cuerpo.devices.map((d) => [d.label, d.current])).toEqual([
      ['Safari on iPhone', false],
      ['Chrome on Android', true],
    ])
    for (const d of cuerpo.devices) expect(d.id).toMatch(/^[0-9a-f]{16}$/)
    // nada que sirva para entrar ni que diga de dónde: ni token, ni IP, ni el agente
    const tokens = await tdb.client<
      { token: string }[]
    >`select token from sessions s join users u on u.id = s.user_id where u.email = ${email}`
    for (const { token } of tokens) expect(res.body).not.toContain(token)
    for (const campo of ['token', 'ipAddress', 'userAgent', 'Mozilla', '203.0.'])
      expect(res.body).not.toContain(campo)
    // el id no sirve como cookie
    expect(
      (await get('/api/me/devices', `better-auth.session_token=${cuerpo.devices[0]!.id}`))
        .statusCode,
    ).toBe(401)
  })

  it('otra cuenta no ve ni cierra tus sesiones; la propia da 409 usa_sign_out; otra tuya se cierra', async () => {
    const email = 'mia@example.com'
    await cuenta(email)
    await cuenta('otra@example.com')
    const a = await sesion(email, ANDROID)
    const b = await sesion(email, WINDOWS)
    const otra = await sesion('otra@example.com', IPHONE)

    const mias = devicesResponseSchema.parse((await get('/api/me/devices', a.session)).json())
    const suyas = devicesResponseSchema.parse((await get('/api/me/devices', otra.session)).json())
    expect(suyas.devices).toHaveLength(1)
    for (const d of mias.devices) expect(suyas.devices.map((x) => x.id)).not.toContain(d.id)

    // la otra cuenta no cierra una sesión mía: 404, y sigue viva
    const deB = mias.devices.find((d) => !d.current)!
    const ajeno = await borrar(deB.id, otra.session)
    expect(ajeno.statusCode).toBe(404)
    expect(ajeno.json()).toMatchObject({ ok: false, error: 'no_encontrado' })
    expect((await get('/api/me/devices', b.session)).statusCode).toBe(200)

    // la propia se cierra con Sign out
    const propia = mias.devices.find((d) => d.current)!
    const r409 = await borrar(propia.id, a.session)
    expect(r409.statusCode).toBe(409)
    expect(r409.json()).toMatchObject({ ok: false, error: 'usa_sign_out' })

    // un id que no es de nadie, 404
    expect((await borrar('0123456789abcdef', a.session)).statusCode).toBe(404)

    // la otra mía se cierra, sin confirmación, y su cookie deja de valer
    const ok = await borrar(deB.id, a.session)
    expect(ok.statusCode).toBe(200)
    expect(ok.json()).toEqual({ ok: true })
    expect((await get('/api/me/devices', b.session)).statusCode).toBe(401)
    expect(
      devicesResponseSchema.parse((await get('/api/me/devices', a.session)).json()).devices,
    ).toHaveLength(1)
  })

  it('sin sesión, 401 en las cuatro', async () => {
    expect((await get('/api/me/devices')).statusCode).toBe(401)
    expect((await borrar('0123456789abcdef', 'x=y')).statusCode).toBe(401)
    expect((await post('/api/auth/devices/sign-out-others', {})).statusCode).toBe(401)
    expect((await post('/api/auth/devices/forget', {})).statusCode).toBe(401)
  })

  it('sign-out-others deja solo la tuya, sube device_epoch, borra las pw: de las cerradas y reemite cs_device', async () => {
    const email = 'todas@example.com'
    await cuenta(email)
    const a = await sesion(email, ANDROID)
    const b = await sesion(email, IPHONE)
    await sesion(email, WINDOWS)
    const antes = await dueño(email)
    // una clave pw: de cada sesión, como si cada una hubiera fallado una contraseña
    const ids = await tdb.client<
      { id: string; token: string }[]
    >`select s.id, s.token from sessions s join users u on u.id = s.user_id where u.email = ${email}`
    for (const s of ids)
      await tdb.client`insert into auth_limits (key, window_start, count, day_start, day_count) values (${keys.pw(s.id)}, now(), 1, now(), 1)`
    const propia = ids.find((s) => a.session.includes(s.token))!

    const res = await post('/api/auth/devices/sign-out-others', {}, a.both)
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true, closed: 2 })
    expect(res.body).not.toContain('token')

    // solo queda la de este navegador
    const lista = devicesResponseSchema.parse((await get('/api/me/devices', a.session)).json())
    expect(lista.devices.map((d) => d.current)).toEqual([true])
    expect((await get('/api/me/devices', b.session)).statusCode).toBe(401)

    // el epoch sube en uno: la cs_device vieja deja de valer y la nueva vale
    const despues = await dueño(email)
    expect(despues.deviceEpoch).toBe(antes.deviceEpoch + 1)
    const nueva = cookieDe(res, DEVICE_COOKIE)
    expect(nueva).not.toBeNull()
    expect(devices.validFor(devices.read(a.device), email, despues)).toBeNull()
    expect(devices.validFor(devices.read(nueva!), email, despues)).not.toBeNull()
    expect(setCookies(res).find((c) => c.startsWith(`${DEVICE_COOKIE}=`))).toMatch(
      /; Path=\/api\/auth; Max-Age=\d+; HttpOnly; SameSite=Lax/,
    )

    // las pw: de las cerradas se borran; la de la propia sigue (si no, cerrar las otras reiniciaría L3)
    const quedan = await tdb.client<
      { key: string }[]
    >`select key from auth_limits where key like 'pw:%'`
    const claves = quedan.map((q) => q.key)
    for (const s of ids.filter((s) => s.id !== propia.id))
      expect(claves).not.toContain(keys.pw(s.id))
    expect(claves).toContain(keys.pw(propia.id))

    // sin otras, cierra cero y sigue respondiendo bien
    expect((await post('/api/auth/devices/sign-out-others', {}, a.both)).json()).toEqual({
      ok: true,
      closed: 0,
    })
  })

  it('con dos cuentas en la cs_device, cerrar las otras sesiones de una deja intacta la entrada de la otra (6-g)', async () => {
    await cuenta('uno@example.com')
    await cuenta('dos@example.com')
    const uno = await sesion('uno@example.com', ANDROID)
    // la segunda cuenta entra en el mismo navegador: la cookie lleva las dos entradas
    const dos = await sesion('dos@example.com', ANDROID, uno.device)
    const entradas = devices.read(dos.device)
    expect(entradas).toHaveLength(2)
    const deDos = dos.device.split('=')[1]!.split('~')[1]!

    const res = await post('/api/auth/devices/sign-out-others', {}, `${uno.session}; ${dos.device}`)
    expect(res.statusCode).toBe(200)
    const nueva = cookieDe(res, DEVICE_COOKIE)!
    // la de `dos` sigue, igual byte a byte, y vale
    expect(nueva.split('=')[1]!.split('~')).toContain(deDos)
    expect(
      devices.validFor(devices.read(nueva), 'dos@example.com', await dueño('dos@example.com')),
    ).not.toBeNull()
    expect(
      devices.validFor(devices.read(nueva), 'uno@example.com', await dueño('uno@example.com')),
    ).not.toBeNull()
  })

  it('forget quita de la cs_device la entrada de esta cuenta y deja las otras; sola, borra la cookie', async () => {
    await cuenta('compartido@example.com')
    await cuenta('vecino@example.com')
    const vecino = await sesion('vecino@example.com', WINDOWS)
    const yo = await sesion('compartido@example.com', WINDOWS, vecino.device)
    expect(devices.read(yo.device)).toHaveLength(2)

    const res = await post('/api/auth/devices/forget', {}, `${yo.session}; ${yo.device}`)
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    const queda = cookieDe(res, DEVICE_COOKIE)!
    expect(devices.read(queda)).toHaveLength(1)
    expect(
      devices.validFor(
        devices.read(queda),
        'compartido@example.com',
        await dueño('compartido@example.com'),
      ),
    ).toBeNull()
    expect(
      devices.validFor(
        devices.read(queda),
        'vecino@example.com',
        await dueño('vecino@example.com'),
      ),
    ).not.toBeNull()
    // forget no cierra la sesión: eso lo hace después `sign-out`
    expect((await get('/api/me/devices', yo.session)).statusCode).toBe(200)

    // con su entrada sola, la cookie se borra
    const solo = await post('/api/auth/devices/forget', {}, vecino.both)
    expect(setCookies(solo).find((c) => c.startsWith(`${DEVICE_COOKIE}=`))).toMatch(
      /^cs_device=; Path=\/api\/auth; Max-Age=0/,
    )
  })

  it('GET /api/me/account completa (12-b): correo, alta, fecha, contraseña, aparatos y correo que no llega', async () => {
    const email = 'cuenta@example.com'
    await cuenta(email)
    const a = await sesion(email, ANDROID)
    await sesion(email, IPHONE)
    const res = await get('/api/me/account', a.session)
    expect(res.statusCode).toBe(200)
    const c = meAccountResponseSchema.parse(res.json())
    expect(c).toMatchObject({
      ok: true,
      email,
      birthDateSet: true,
      devices: 2,
      emailUndeliverableAt: null,
    })
    const [fila] = await tdb.client<
      { created_at: string | Date; updated_at: string | Date }[]
    >`select u.created_at, a.updated_at from users u join accounts a on a.user_id = u.id and a.provider_id = 'credential' where u.email = ${email}`
    expect(c.joinedAt).toBe(new Date(fila!.created_at).toISOString())
    expect(c.passwordChangedAt).toBe(new Date(fila!.updated_at).toISOString())

    await tdb.client`update users set email_undeliverable_at = '2026-11-20T10:00:00Z' where email = ${email}`
    expect((await get('/api/me/account', a.session)).json().emailUndeliverableAt).toBe(
      '2026-11-20T10:00:00.000Z',
    )
  })

  it('cambiar la contraseña mueve passwordChangedAt (§12.1)', async () => {
    const email = 'cambia@example.com'
    await cuenta(email)
    const a = await sesion(email, ANDROID)
    const antes = (await get('/api/me/account', a.session)).json().passwordChangedAt as string
    await new Promise((r) => setTimeout(r, 20))
    const cambio = await post(
      '/api/auth/change-password',
      { currentPassword: BUENA, newPassword: 'contrasena-nueva', revokeOtherSessions: true },
      a.both,
    )
    expect(cambio.statusCode).toBe(200)
    const nueva = cookieDe(cambio, 'better-auth.session_token') ?? a.session
    const despues = (await get('/api/me/account', nueva)).json().passwordChangedAt as string
    expect(new Date(despues).getTime()).toBeGreaterThan(new Date(antes).getTime())
  })
})
