import { describe, expect, it } from 'vitest'
import { mulberry32, seededRng } from './rng.js'

describe('shared: RNG sembrado', () => {
  it('es determinista para la misma semilla', () => {
    const a = seededRng('hola')
    const b = seededRng('hola')
    const seqA = [a(), a(), a()]
    const seqB = [b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('difiere entre semillas distintas', () => {
    const a = seededRng('hola')
    const b = seededRng('adios')
    expect(a()).not.toBe(b())
  })

  it('produce valores en [0, 1)', () => {
    const rng = mulberry32(12345)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
