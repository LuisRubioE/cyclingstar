import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

const app = buildApp({ migrationsApplied: true })

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
    })
  })

  it('devuelve un 404 uniforme para rutas desconocidas', async () => {
    const res = await app.inject({ method: 'GET', url: '/no-existe' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ ok: false, error: 'no_encontrado' })
  })
})
