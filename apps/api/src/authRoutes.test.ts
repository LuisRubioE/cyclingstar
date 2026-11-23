import { request as httpRequest } from 'node:http'
import type { AddressInfo } from 'node:net'
import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'

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
