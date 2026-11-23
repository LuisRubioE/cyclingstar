import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'

/**
 * EL REGISTRO NO DICE QUÉ CORREOS TIENEN CUENTA (docs/cuenta.md §5.3, 5-i).
 *
 * better-auth responde 200 a un correo que ya existe, con un usuario inventado, pero el cuerpo lo
 * delata: el inventado lleva el `generateId()` de 32 caracteres de better-auth y el de verdad el
 * uuid de Postgres. El proxy fija el cuerpo de todo 200 de `sign-up/email`, así que las dos
 * respuestas tienen que ser iguales byte a byte.
 */
describe('sign-up/email: el mismo cuerpo con un correo nuevo y con uno que existe', () => {
  let tdb: TestDb
  let app: FastifyInstance
  const BASE = 'http://localhost:3000'

  const poolBefore = process.env.DB_POOL_MAX

  beforeAll(async () => {
    // PGlite admite UNA sesión (testDb.ts), y el correo del registro, en segundo plano, lee el estado.
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailer: { send: async () => true },
    })
    app = buildApp({ migrationsApplied: true, serveWeb: false, auth })
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  const signUp = (email: string) =>
    app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { origin: BASE },
      payload: {
        name: 'luis',
        email,
        password: 'contrasena-larga',
        birthDate: '1990-01-01',
        callbackURL: '/verify-email',
      },
    })

  it('cuerpos iguales byte a byte, y fijos', async () => {
    const primero = await signUp('ana@example.com')
    const repetido = await signUp('ana@example.com')
    const otroNuevo = await signUp('bea@example.com')
    expect(primero.statusCode).toBe(200)
    expect(repetido.statusCode).toBe(200)
    expect(otroNuevo.statusCode).toBe(200)
    expect(repetido.body).toBe(otroNuevo.body)
    expect(primero.body).toBe(otroNuevo.body)
    expect(otroNuevo.body).toBe('{"token":null,"user":null}')
  })
})
