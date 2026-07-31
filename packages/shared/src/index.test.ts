import { describe, expect, it } from 'vitest'
import { healthSchema } from './index.js'

describe('shared: contrato de /health', () => {
  it('valida una respuesta de salud completa', () => {
    const payload = { ok: true, engineVersion: 1, gameDay: null, migrationsApplied: true }
    expect(healthSchema.parse(payload)).toEqual(payload)
  })

  it('rechaza una respuesta incompleta', () => {
    expect(() => healthSchema.parse({ ok: true })).toThrow()
  })
})
