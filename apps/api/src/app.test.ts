import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

const app = buildApp()

afterAll(async () => {
  await app.close()
})

describe('api: /health', () => {
  it('responde { ok: true } con estado 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })
})
