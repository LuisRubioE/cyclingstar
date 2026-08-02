import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

// serveWeb: false para probar el comportamiento de la API de forma determinista,
// independientemente de si la web está compilada.
const app = buildApp({ migrationsApplied: true, serveWeb: false, tickIntervalMinutes: 360 })

afterAll(async () => {
  await app.close()
})

describe('api: /health', () => {
  it('reporta versión, fecha de juego (nula) y migraciones aplicadas', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      ok: true,
      engineVersion: 1,
      gameDay: null,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
    })
  })

  it('devuelve un 404 uniforme para rutas desconocidas', async () => {
    const res = await app.inject({ method: 'GET', url: '/no-existe' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ ok: false, error: 'no_encontrado' })
  })
})

describe('api: lista de bloqueo de nombres (admin)', () => {
  // Un db mínimo basta: la comprobación del token ocurre antes de tocar la base.
  const adminApp = buildApp({
    migrationsApplied: true,
    serveWeb: false,
    tickIntervalMinutes: 360,
    db: {} as never,
    adminToken: 'x'.repeat(16),
  })
  afterAll(async () => {
    await adminApp.close()
  })

  it('rechaza sin token', async () => {
    const res = await adminApp.inject({ method: 'GET', url: '/api/admin/blocklist?kind=team' })
    expect(res.statusCode).toBe(401)
  })

  it('rechaza con token incorrecto', async () => {
    const res = await adminApp.inject({
      method: 'GET',
      url: '/api/admin/blocklist?kind=team',
      headers: { 'x-admin-token': 'incorrecto' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rechaza un kind inválido aun con token correcto', async () => {
    const res = await adminApp.inject({
      method: 'GET',
      url: '/api/admin/blocklist?kind=nope',
      headers: { 'x-admin-token': 'x'.repeat(16) },
    })
    expect(res.statusCode).toBe(400)
  })
})
