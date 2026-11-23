import { request as httpRequest } from 'node:http'
import type { AddressInfo } from 'node:net'
import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth, disabledAuthPaths } from './auth.js'
import { AUTH_ALLOWED_PATHS } from './security.js'

/**
 * UNA RUTA QUE NO ESTÁ EN SU FORMA NORMAL DA 404, ANTES DEL LÍMITE Y DEL PROXY (docs/cuenta.md §7.2, 7-j).
 *
 * find-my-way recibe la ruta tal cual: `/api/auth/x/../sign-in/email` no casa con la ruta estática
 * del límite estricto y caía en el comodín de 60 por minuto; después `new URL(...)` la normalizaba y
 * better-auth atendía `sign-in/email` igual. Con `node:http`, porque `fetch` y `inject` normalizan
 * la ruta antes de mandarla y no verían nada.
 */
describe('/api/auth/*: la ruta cruda tiene que ser la normalizada', () => {
  let tdb: TestDb
  let app: FastifyInstance
  let port = 0
  /** Las cabeceras de la última respuesta de `rawPost`. */
  let ultimas: Record<string, unknown> = {}
  const BASE = 'http://localhost:3000'

  beforeAll(async () => {
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailer: { send: async () => true },
    })
    app = buildApp({ migrationsApplied: true, serveWeb: false, auth })
    await app.listen({ port: 0, host: '127.0.0.1' })
    port = (app.server.address() as AddressInfo).port
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
  })

  /** Un POST con la ruta exactamente como se escribe: `node:http` no la toca. */
  const rawPost = (path: string, body: unknown): Promise<number> =>
    new Promise((resolve, reject) => {
      const payload = JSON.stringify(body)
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port,
          method: 'POST',
          path,
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(payload),
            origin: BASE,
          },
        },
        (res) => {
          ultimas = res.headers
          res.resume()
          res.on('end', () => resolve(res.statusCode ?? 0))
        },
      )
      req.on('error', reject)
      req.end(payload)
    })

  const RUTAS = ['sign-in/email', 'request-password-reset', 'change-password']
  const VARIANTES = [
    (r: string) => `/api/auth/x/../${r}`,
    (r: string) => `/api/auth/./${r}`,
    (r: string) => `/api/auth/x/%2e%2e/${r}`,
  ]

  it.each(RUTAS)('las tres variantes medidas contra %s dan 404', async (ruta) => {
    for (const variante of VARIANTES) {
      const status = await rawPost(variante(ruta), {
        email: 'nadie@example.com',
        password: 'intento',
      })
      expect(status, variante(ruta)).toBe(404)
    }
  })

  it('también //, %2f, %5c y las mayúsculas', async () => {
    for (const path of [
      '/api/auth//sign-in/email',
      '/api/auth/x%2f..%2fsign-in/email',
      '/api/auth/x%5c..%5csign-in/email',
      '/api/auth/x/%2E%2E/sign-in/email',
      '/api/auth/sign-in/email/..',
    ]) {
      expect(await rawPost(path, { email: 'nadie@example.com', password: 'x' }), path).toBe(404)
    }
  })

  it('25 intentos por el atajo chocan todos con 404 o con el límite, nunca con la contraseña', async () => {
    const vistos = new Set<number>()
    for (let i = 0; i < 25; i++) {
      vistos.add(
        await rawPost('/api/auth/x/../sign-in/email', {
          email: 'nadie@example.com',
          password: `intento-${i}`,
        }),
      )
    }
    for (const status of vistos) expect([404, 429]).toContain(status)
    // El 404 llega antes que el límite: no gasta el contador de nadie.
    expect(ultimas['x-ratelimit-limit']).toBeUndefined()
  })

  it('la ruta normal sigue llegando a better-auth', async () => {
    const status = await rawPost('/api/auth/sign-in/email?x=1', {
      email: 'nadie@example.com',
      password: 'intento',
    })
    expect(status).toBe(401)
  })
})

/**
 * LA LISTA BLANCA Y LOS DOS CERROJOS (docs/cuenta.md §8.1; D-29, X-14, 8-a, 8-g, 8-l). El proxy solo
 * deja pasar las once rutas de `AUTH_ALLOWED_PATHS`; `disabledPaths` cierra lo demás dentro de
 * better-auth (salvo `/verify-email`, que usa la ruta interna de §5.2), y el `hooks.before` cierra las
 * plantillas con parámetros. Los ganchos corren también en `auth.api.*`, así que lo que el servidor
 * llama por dentro (`verifyPassword` para la exportación, `revokeOtherSessions` para cerrar las otras)
 * tiene que seguir funcionando.
 */
describe('/api/auth/*: la lista blanca', () => {
  let tdb: TestDb
  let app: FastifyInstance
  let auth: ReturnType<typeof createAuth>
  const BASE = 'http://localhost:3000'
  const EMAIL = 'lista@example.com'
  const PASSWORD = 'contrasena-larga'
  const poolBefore = process.env.DB_POOL_MAX

  beforeAll(async () => {
    // PGlite admite UNA sesión (testDb.ts), y el correo de better-auth sale en segundo plano.
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailer: { send: async () => true },
    })
    app = buildApp({ db: tdb.db, migrationsApplied: true, serveWeb: false, auth })
    await app.ready()
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  const pedir = (method: 'GET' | 'POST', path: string, cookie?: string) =>
    app.inject({
      method,
      url: `/api/auth${path}`,
      headers: {
        origin: BASE,
        ...(cookie ? { cookie } : {}),
        ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { payload: '{}' } : {}),
    })

  /** Todas las plantillas de `auth.api`, con los parámetros sustituidos por `x`. */
  const rutasDeBetterAuth = (): string[] =>
    [
      ...new Set(
        Object.values(auth.api as Record<string, { path?: string }>)
          .map((e) => e.path)
          .filter((p): p is string => typeof p === 'string'),
      ),
    ].sort()

  const permitidas = new Set<string>(AUTH_ALLOWED_PATHS.map((r) => `${r.method} ${r.path}`))
  const conX = (p: string) => p.replace(/:[^/]+/g, 'x')

  it('son once', () => {
    expect(AUTH_ALLOWED_PATHS).toHaveLength(11)
  })

  it('todo punto de auth.api fuera de la lista da 404 por HTTP, por GET y por POST', async () => {
    const rutas = rutasDeBetterAuth()
    expect(rutas.length).toBeGreaterThan(20)
    for (const ruta of rutas) {
      for (const method of ['GET', 'POST'] as const) {
        if (permitidas.has(`${method} ${ruta}`)) continue
        const res = await pedir(method, conX(ruta))
        expect(res.statusCode, `${method} ${ruta}`).toBe(404)
      }
    }
  })

  it('las once llegan a better-auth: 200 o el error esperado, nunca 404', async () => {
    for (const { method, path } of AUTH_ALLOWED_PATHS) {
      const res = await pedir(method, conX(path))
      expect(res.statusCode, `${method} ${path}`).not.toBe(404)
    }
  })

  it('change-email, update-user y /callback/x dan 404', async () => {
    for (const ruta of ['/change-email', '/update-user', '/callback/x', '/verify-password']) {
      expect((await pedir('POST', ruta)).statusCode, ruta).toBe(404)
    }
    expect((await pedir('GET', '/callback/x')).statusCode).toBe(404)
  })

  it('las variantes de una ruta buena tampoco pasan: /sign-in/email/, //sign-in/email, /Sign-in/email', async () => {
    for (const ruta of ['/sign-in/email/', '//sign-in/email', '/Sign-in/email']) {
      expect((await pedir('POST', ruta)).statusCode, ruta).toBe(404)
    }
  })

  it('el segundo cerrojo: sin el proxy, better-auth da 404 a lo cerrado y deja /verify-email', async () => {
    const cerradas = disabledAuthPaths(auth.api as Record<string, { path?: string }>)
    expect(cerradas).toContain('/change-email')
    expect(cerradas).toContain('/update-user')
    expect(cerradas).not.toContain('/verify-email')
    for (const ruta of cerradas) {
      for (const method of ['GET', 'POST'] as const) {
        const res = await auth.handler(
          new Request(`${BASE}/api/auth${conX(ruta)}`, {
            method,
            headers: { origin: BASE, 'content-type': 'application/json' },
            ...(method === 'POST' ? { body: '{}' } : {}),
          }),
        )
        expect(res.status, `${method} ${ruta}`).toBe(404)
      }
    }
    const verify = await auth.handler(new Request(`${BASE}/api/auth/verify-email?token=x`))
    expect(verify.status).not.toBe(404)
  })

  it('desde el servidor siguen valiendo verifyPassword (la exportación) y revokeOtherSessions (sign-out-others)', async () => {
    await auth.api.signUpEmail({
      body: { name: '', email: EMAIL, password: PASSWORD, birthDate: '1990-01-01' },
    })
    await tdb.client`update users set email_verified = true, status = 'approved' where email = ${EMAIL}`
    const entrar = async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        headers: { origin: BASE, 'content-type': 'application/json' },
        payload: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      })
      expect(res.statusCode).toBe(200)
      const setCookie = res.headers['set-cookie']
      const lista = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
      return lista.map((c) => c.split(';')[0]).join('; ')
    }
    const una = await entrar()
    await entrar()
    const headers = new Headers({ cookie: una, origin: BASE })
    await expect(
      auth.api.verifyPassword({ body: { password: PASSWORD }, headers }),
    ).resolves.toMatchObject({ status: true })
    await expect(auth.api.revokeOtherSessions({ headers })).resolves.toMatchObject({
      status: true,
    })
    const [quedan] = await tdb.client<{ n: number }[]>`
      select count(*)::int as n from sessions s join users u on u.id = s.user_id where u.email = ${EMAIL}`
    expect(quedan!.n).toBe(1)
  })
})
