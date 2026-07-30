import { describe, expect, it } from 'vitest'
import { healthSchema } from './index.js'

describe('shared: esqueleto', () => {
  it('valida un payload de salud correcto', () => {
    expect(healthSchema.parse({ ok: true })).toEqual({ ok: true })
  })

  it('rechaza un payload inválido', () => {
    expect(() => healthSchema.parse({ ok: 'sí' })).toThrow()
  })
})
