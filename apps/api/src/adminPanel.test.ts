import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'

/**
 * EL PANEL DE ADMINISTRACIÓN, DE PUNTA A PUNTA: sesión de verdad, base de verdad (PGlite).
 *
 * Lo que se sella aquí es QUIÉN entra. Una guarda de admin mal hecha no se nota en el uso normal
 * —el dueño entra y todo funciona— y sólo se ve el día que entra quien no debía. Por eso se prueba
 * sobre todo el «no»: el jugador corriente, el que se registra con el correo del dueño sin
 * confirmarlo, el que manda un token malo junto a una sesión buena.
 */
const ROOT = 'dueno@example.com'
const BASE = 'http://localhost:3000'
const ADMIN_TOKEN = 't'.repeat(32)

describe('panel de administración, contra una base real', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  const cookies: Record<string, string> = {}
  const ids: Record<string, string> = {}

  const authPost = (path: string, body: unknown) =>
    app.inject({
      method: 'POST',
      url: `/api/auth${path}`,
      headers: { 'content-type': 'application/json', origin: BASE },
      payload: JSON.stringify(body),
    })

  /** Da de alta una cuenta, la confirma si se pide, y guarda su cookie de sesión. */
  async function alta(nombre: string, email: string, confirmar = true): Promise<void> {
    await authPost('/sign-up/email', { name: nombre, email, password: 'contrasena-larga' })
    if (confirmar) {
      await tdb.client`update users set email_verified = true where email = ${email}`
    }
    const [fila] = await tdb.client<{ id: string }[]>`select id from users where email = ${email}`
    ids[nombre] = fila!.id
    const login = await authPost('/sign-in/email', { email, password: 'contrasena-larga' })
    const setCookie = login.headers['set-cookie']
    const lista = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    cookies[nombre] = lista.map((c) => c.split(';')[0]).join('; ')
  }

  const como = (
    quien: string | null,
    method: 'GET' | 'PATCH' | 'DELETE',
    url: string,
    payload?: unknown,
    extra: Record<string, string> = {},
  ) =>
    app.inject({
      method,
      url,
      headers: {
        ...(quien ? { cookie: cookies[quien]! } : {}),
        ...(payload !== undefined ? { 'content-type': 'application/json' } : {}),
        ...extra,
      },
      ...(payload !== undefined ? { payload: JSON.stringify(payload) } : {}),
    })

  beforeAll(async () => {
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailer: {
        async send() {
          return true
        },
      },
    })
    app = buildApp({
      db: tdb.db,
      auth,
      serveWeb: false,
      adminToken: ADMIN_TOKEN,
      adminEmail: ROOT,
    })
    await alta('dueno', ROOT)
    await alta('jugador', 'jugador@example.com')
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
  })

  it('el dueño (ADMIN_EMAIL confirmado) entra con su sesión, sin token', async () => {
    const res = await como('dueno', 'GET', '/api/admin/whoami')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true, via: 'session', userId: ids.dueno })
  })

  it('un jugador corriente no entra', async () => {
    expect((await como('jugador', 'GET', '/api/admin/whoami')).statusCode).toBe(401)
    expect((await como('jugador', 'GET', '/api/admin/users')).statusCode).toBe(401)
  })

  it('sin sesión no entra nadie', async () => {
    expect((await como(null, 'GET', '/api/admin/users')).statusCode).toBe(401)
  })

  /* Una sesión de admin no «rescata» un token malo: quien lo manda está probando el token. */
  it('un token equivocado no cae a la sesión, aunque la sesión sea de admin', async () => {
    const res = await como('dueno', 'GET', '/api/admin/whoami', undefined, {
      'x-admin-token': 'x'.repeat(32),
    })
    expect(res.statusCode).toBe(401)
  })

  it('el token sigue valiendo para las máquinas', async () => {
    const res = await como(null, 'GET', '/api/admin/whoami', undefined, {
      'x-admin-token': ADMIN_TOKEN,
    })
    expect(res.json()).toEqual({ ok: true, via: 'token', userId: null })
  })

  it('la lista trae las cuentas y marca al raíz', async () => {
    const res = await como('dueno', 'GET', '/api/admin/users')
    const { users } = res.json() as { users: { email: string; isRootAdmin: boolean }[] }
    expect(users.map((u) => u.email).sort()).toEqual(['dueno@example.com', 'jugador@example.com'])
    expect(users.find((u) => u.email === ROOT)?.isRootAdmin).toBe(true)
    expect(users.find((u) => u.email !== ROOT)?.isRootAdmin).toBe(false)
  })

  it('busca por un trozo del correo', async () => {
    const res = await como('dueno', 'GET', '/api/admin/users?q=jugad')
    const { users } = res.json() as { users: { email: string }[] }
    expect(users.map((u) => u.email)).toEqual(['jugador@example.com'])
  })

  it('dar admin a otro lo deja entrar', async () => {
    const res = await como('dueno', 'PATCH', `/api/admin/users/${ids.jugador}`, { isAdmin: true })
    expect(res.statusCode).toBe(200)
    expect((await como('jugador', 'GET', '/api/admin/whoami')).statusCode).toBe(200)
  })

  it('otro admin no puede borrar al raíz', async () => {
    const res = await como('jugador', 'DELETE', `/api/admin/users/${ids.dueno}`)
    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ ok: false, error: 'es_el_admin_raiz' })
  })

  it('nadie se quita el admin a sí mismo ni se borra desde el panel', async () => {
    const quitar = await como('jugador', 'PATCH', `/api/admin/users/${ids.jugador}`, {
      isAdmin: false,
    })
    expect(quitar.statusCode).toBe(409)
    const borrar = await como('dueno', 'DELETE', `/api/admin/users/${ids.dueno}`)
    expect(borrar.statusCode).toBe(409)
  })

  it('un cambio vacío o con campos inventados es un 400', async () => {
    expect((await como('dueno', 'PATCH', `/api/admin/users/${ids.jugador}`, {})).statusCode).toBe(
      400,
    )
    const inventado = await como('dueno', 'PATCH', `/api/admin/users/${ids.jugador}`, {
      email: 'otro@example.com',
    })
    expect(inventado.statusCode).toBe(400)
  })

  it('confirmar el correo y dar premium a mano', async () => {
    await tdb.client`update users set email_verified = false where id = ${ids.jugador!}`
    const res = await como('dueno', 'PATCH', `/api/admin/users/${ids.jugador}`, {
      emailVerified: true,
      premium: true,
    })
    expect(res.statusCode).toBe(200)
    const [fila] = await tdb.client<{ email_verified: boolean; premium: boolean }[]>`
      select email_verified, premium from users where id = ${ids.jugador!}`
    expect(fila).toEqual({ email_verified: true, premium: true })
  })

  /*
    Registrarse con el correo del dueño SIN confirmarlo no da nada. Es la condición que impide que
    ADMIN_EMAIL sea una puerta: sin ella, bastaría con conocer el correo del dueño.
  */
  it('el correo del raíz sin confirmar no es admin', async () => {
    await tdb.client`update users set email_verified = false where id = ${ids.dueno!}`
    expect((await como('dueno', 'GET', '/api/admin/whoami')).statusCode).toBe(401)
    await tdb.client`update users set email_verified = true where id = ${ids.dueno!}`
  })

  it('borrar una cuenta desde el panel la quita del todo', async () => {
    const res = await como('dueno', 'DELETE', `/api/admin/users/${ids.jugador}`)
    expect(res.statusCode).toBe(200)
    const quedan = await tdb.client`select id from users where id = ${ids.jugador!}`
    expect(quedan).toHaveLength(0)
    // Y con ella su sesión: la cookie que tenía ya no abre nada.
    expect((await como('jugador', 'GET', '/api/admin/whoami')).statusCode).toBe(401)
  })

  it('borrar una cuenta que no existe es un 404', async () => {
    const res = await como('dueno', 'DELETE', `/api/admin/users/${ids.jugador}`)
    expect(res.statusCode).toBe(404)
  })
})
