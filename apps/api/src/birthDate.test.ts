import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import type { RouteOptions } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth, localeFrom } from './auth.js'
import { BIRTH_DATE_GATE_EXEMPT, birthDateGateApplies } from './birthDateGate.js'
import { createMailQueue } from './mailQueue.js'

/**
 * LA EDAD, DE PUNTA A PUNTA (docs/cuenta.md §4; PR 9 de E4). El registro pide la fecha y la valida antes de
 * mirar el correo (el menor recibe el mismo 400 exista o no la cuenta, X-09); la fecha no viaja en
 * `get-session`; la cuenta de hoy sin fecha no escribe nada hasta darla (la puerta, 4-g), y la da una vez
 * con `PUT /api/me/birth-date`; el panel la rectifica con su fila de `admin_audit` sin el valor. Y el gancho
 * de creación: `name`, `locale` y las condiciones; `image`, fuera.
 */
const ROOT = 'dueno@example.com'
const BASE = 'http://localhost:3000'
const PASSWORD = 'contrasena-larga'
const ADULTO = '1990-01-01'
/** Quince años y unos días el día que corra el test: siempre menor. */
const MENOR = `${new Date().getUTCFullYear() - 15}-01-01`

describe('la edad, contra una base real', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  let rootCookie = ''
  const rutas: { method: string; url: string }[] = []
  const cola = createMailQueue()
  const poolBefore = process.env.DB_POOL_MAX

  const authPost = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'POST',
      url: `/api/auth${path}`,
      headers: { 'content-type': 'application/json', origin: BASE, ...headers },
      payload: JSON.stringify(body),
    })
  const conSesion = (method: 'GET' | 'PUT' | 'PATCH' | 'POST', url: string, payload?: unknown) =>
    app.inject({
      method,
      url,
      headers: { cookie: rootCookie, origin: BASE },
      ...(payload !== undefined ? { payload: payload as Record<string, unknown> } : {}),
    })
  const filaDe = async (email: string) => {
    const [fila] = await tdb.client<
      {
        id: string
        name: string
        locale: string
        birth_date: string | null
        terms_version: string | null
        terms_accepted_at: string | null
      }[]
    >`select id, name, locale, birth_date::text, terms_version, terms_accepted_at
        from users where email = ${email}`
    return fila
  }

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailQueue: cola,
      adminEmail: ROOT,
      mailer: { send: async () => true },
    })
    app = buildApp({
      db: tdb.db,
      auth,
      serveWeb: false,
      adminEmail: ROOT,
      // con todas las rutas montadas: también el avance y el webhook
      onAdminAdvance: async () => {
        throw new Error('no se llama')
      },
      resendWebhookSecret: 'whsec_dGVzdA==',
    })
    // Las rutas registradas, como las ve el gancho: antes de `ready()`, que es cuando cargan los plugins.
    app.addHook('onRoute', (r: RouteOptions) => {
      for (const method of Array.isArray(r.method) ? r.method : [r.method])
        rutas.push({ method, url: r.url })
    })
    await authPost(
      '/sign-up/email',
      { name: '', email: ROOT, password: PASSWORD, birthDate: ADULTO },
      { 'accept-language': 'es-ES,es;q=0.9,en;q=0.8' },
    )
    await cola.drain()
    await tdb.client`update users set email_verified = true where email = ${ROOT}`
    const login = await authPost('/sign-in/email', { email: ROOT, password: PASSWORD })
    const setCookie = login.headers['set-cookie']
    const lista = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    rootCookie = lista.map((c) => c.split(';')[0]).join('; ')
  }, 120_000)

  afterAll(async () => {
    await cola.drain()
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  describe('el registro', () => {
    it('sin fecha, 400', async () => {
      const res = await authPost('/sign-up/email', {
        name: '',
        email: 'sinfecha@example.com',
        password: PASSWORD,
      })
      expect(res.statusCode).toBe(400)
      expect(await filaDe('sinfecha@example.com')).toBeUndefined()
    })

    it('un menor recibe el mismo 400 con un correo nuevo y con uno que ya tiene cuenta (X-09)', async () => {
      const nuevo = await authPost('/sign-up/email', {
        name: '',
        email: 'nuevo@example.com',
        password: PASSWORD,
        birthDate: MENOR,
      })
      const existe = await authPost('/sign-up/email', {
        name: '',
        email: ROOT,
        password: PASSWORD,
        birthDate: MENOR,
      })
      expect(nuevo.statusCode).toBe(400)
      expect(existe.statusCode).toBe(nuevo.statusCode)
      expect(existe.body).toBe(nuevo.body)
      expect(nuevo.json()).toMatchObject({ code: 'VALIDATION_ERROR', message: 'UNDER_MINIMUM_AGE' })
      // y no se guarda nada del menor
      expect(await filaDe('nuevo@example.com')).toBeUndefined()
    })

    it('una fecha imposible es INVALID_BIRTH_DATE', async () => {
      const res = await authPost('/sign-up/email', {
        name: '',
        email: 'imposible@example.com',
        password: PASSWORD,
        birthDate: '2001-02-29',
      })
      expect(res.statusCode).toBe(400)
      expect(res.json()).toMatchObject({ message: 'INVALID_BIRTH_DATE' })
    })

    it('`image` en el cuerpo, 400 y nada creado', async () => {
      const res = await authPost('/sign-up/email', {
        name: '',
        email: 'foto@example.com',
        password: PASSWORD,
        birthDate: ADULTO,
        image: 'https://example.com/a.png',
      })
      expect(res.statusCode).toBe(400)
      expect(await filaDe('foto@example.com')).toBeUndefined()
    })

    it("la cuenta nueva: `name` 'Player', el idioma de Accept-Language y las condiciones aceptadas", async () => {
      const fila = await filaDe(ROOT)
      expect(fila).toMatchObject({
        name: 'Player',
        locale: 'es',
        birth_date: ADULTO,
        terms_version: '2026-11-draft',
      })
      expect(fila?.terms_accepted_at).not.toBeNull()
      await authPost('/sign-up/email', {
        name: 'Luis',
        email: 'sinidioma@example.com',
        password: PASSWORD,
        birthDate: ADULTO,
      })
      expect(await filaDe('sinidioma@example.com')).toMatchObject({ name: 'Player', locale: 'en' })
    })

    it('localeFrom: la etiqueta primaria en dos letras, o en', () => {
      expect(localeFrom('es-ES,es;q=0.9')).toBe('es')
      expect(localeFrom('FR')).toBe('fr')
      expect(localeFrom('*')).toBe('en')
      expect(localeFrom(undefined)).toBe('en')
    })

    it('la fecha no viaja en get-session (returned: false)', async () => {
      const res = await conSesion('GET', '/api/auth/get-session')
      expect(res.statusCode).toBe(200)
      expect(res.body).not.toContain('birthDate')
      expect(res.body).not.toContain(ADULTO)
    })
  })

  describe('la cuenta de hoy, sin fecha', () => {
    it('GET /api/me/account dice birthDateSet', async () => {
      expect((await conSesion('GET', '/api/me/account')).json()).toEqual({
        ok: true,
        birthDateSet: true,
      })
      await tdb.client`update users set birth_date = null where email = ${ROOT}`
      expect((await conSesion('GET', '/api/me/account')).json()).toEqual({
        ok: true,
        birthDateSet: false,
      })
    })

    it('la puerta: 403 BIRTH_DATE_REQUIRED en toda escritura de /api fuera de la lista', async () => {
      const puerta = rutas.filter((r) => birthDateGateApplies(r.method, r.url))
      // las rutas de juego que no cuelgan de /api/riders ni de /api/me también
      const claves = puerta.map((r) => `${r.method} ${r.url}`)
      for (const k of [
        'POST /api/teams/take-over',
        'PUT /api/teams/me',
        'PUT /api/my-orders',
        'PUT /api/me/theme',
        'POST /api/world/advance',
      ])
        expect(claves).toContain(k)
      expect(puerta.length).toBeGreaterThan(10)
      for (const r of puerta) {
        const url = r.url.replace(/:[A-Za-z]+/g, '1').replace(/\*/g, 'x')
        const res = await conSesion(r.method as 'POST', url, {})
        expect({ ruta: `${r.method} ${r.url}`, status: res.statusCode, body: res.json() }).toEqual({
          ruta: `${r.method} ${r.url}`,
          status: 403,
          body: { ok: false, error: 'BIRTH_DATE_REQUIRED' },
        })
      }
    })

    it('la lista: salir, el panel, los webhooks y dar la fecha no pasan por la puerta; leer tampoco', () => {
      for (const [method, url] of [
        ['POST', '/api/auth/sign-out'],
        ['POST', '/api/auth/delete-user'],
        ['PATCH', '/api/admin/users/:id'],
        ['POST', '/api/webhooks/resend'],
        ['PUT', '/api/me/birth-date'],
        ['POST', '/api/me/export'],
        ['DELETE', '/api/me/devices/:id'],
        ['POST', '/api/me/push-targets'],
        ['PUT', '/api/me/notices'],
        ['GET', '/api/riders/me'],
        ['POST', '/health'],
      ] as const)
        expect(birthDateGateApplies(method, url), `${method} ${url}`).toBe(false)
      expect(BIRTH_DATE_GATE_EXEMPT.length).toBe(8)
      expect(birthDateGateApplies('POST', '/api/me/reveal/:raceKey/:day')).toBe(true)
    })

    it('leer sigue abierto', async () => {
      expect((await conSesion('GET', '/api/me/theme')).statusCode).toBe(200)
    })

    it('PUT /api/me/birth-date: un menor no se guarda; la buena una vez; la segunda, 409', async () => {
      const menor = await conSesion('PUT', '/api/me/birth-date', { birthDate: MENOR })
      expect(menor.statusCode).toBe(400)
      expect(menor.json()).toEqual({ ok: false, error: 'UNDER_MINIMUM_AGE' })
      expect((await filaDe(ROOT))?.birth_date).toBeNull()
      const imposible = await conSesion('PUT', '/api/me/birth-date', { birthDate: '1990-02-30' })
      expect(imposible.json()).toEqual({ ok: false, error: 'INVALID_BIRTH_DATE' })
      const buena = await conSesion('PUT', '/api/me/birth-date', { birthDate: '1985-06-15' })
      expect(buena.statusCode).toBe(200)
      expect(buena.json()).toEqual({ ok: true })
      expect((await filaDe(ROOT))?.birth_date).toBe('1985-06-15')
      const otra = await conSesion('PUT', '/api/me/birth-date', { birthDate: '1980-01-01' })
      expect(otra.statusCode).toBe(409)
      expect(otra.json()).toEqual({ ok: false, error: 'already_set' })
      expect((await filaDe(ROOT))?.birth_date).toBe('1985-06-15')
    })

    it('con la fecha dada, la puerta se abre', async () => {
      const res = await conSesion('PUT', '/api/me/theme', { theme: 'dark' })
      expect(res.statusCode).toBe(200)
    })

    it('sin sesión, la ruta da su 401', async () => {
      const res = await app.inject({ method: 'PUT', url: '/api/me/birth-date', payload: {} })
      expect(res.statusCode).toBe(401)
      expect((await app.inject({ method: 'GET', url: '/api/me/account' })).statusCode).toBe(401)
    })
  })

  describe('el panel rectifica la fecha', () => {
    it('PATCH /api/admin/users/:id con birthDate: menor, 400; buena, guardada con su fila sin el valor', async () => {
      await authPost('/sign-up/email', {
        name: '',
        email: 'jugador@example.com',
        password: PASSWORD,
        birthDate: '1999-09-09',
      })
      const id = (await filaDe('jugador@example.com'))!.id
      const menor = await conSesion('PATCH', `/api/admin/users/${id}`, { birthDate: MENOR })
      expect(menor.statusCode).toBe(400)
      expect(menor.json()).toEqual({ ok: false, error: 'UNDER_MINIMUM_AGE' })
      expect((await filaDe('jugador@example.com'))?.birth_date).toBe('1999-09-09')

      const buena = await conSesion('PATCH', `/api/admin/users/${id}`, { birthDate: '1998-08-08' })
      expect(buena.statusCode).toBe(200)
      expect((await filaDe('jugador@example.com'))?.birth_date).toBe('1998-08-08')
      const filas = await tdb.client<{ action: string; detail: unknown }[]>`
        select action, detail from admin_audit where target_user_id = ${id}`
      expect(filas).toEqual([
        { action: 'user.birth_date', detail: { field: 'birthDate', from: null, to: null } },
      ])
    })

    it('sobre la cuenta raíz, 409 es_el_admin_raiz', async () => {
      const id = (await filaDe(ROOT))!.id
      const res = await conSesion('PATCH', `/api/admin/users/${id}`, { birthDate: '1970-01-01' })
      expect(res.statusCode).toBe(409)
      expect(res.json()).toEqual({ ok: false, error: 'es_el_admin_raiz' })
    })
  })
})
