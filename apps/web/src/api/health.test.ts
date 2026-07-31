import { describe, expect, it } from 'vitest'
import { parseHealth } from './health'

describe('web: cliente tipado de /health', () => {
  it('parsea una respuesta válida contra el contrato compartido', () => {
    const payload = {
      ok: true,
      engineVersion: 1,
      gameDay: null,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
    }
    expect(parseHealth(payload)).toEqual(payload)
  })

  it('rechaza una respuesta que no cumple el contrato', () => {
    expect(() => parseHealth({ ok: true })).toThrow()
  })
})
