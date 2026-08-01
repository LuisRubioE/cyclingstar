import { seededRng } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { beta, gamma, normal, uniformInt } from './random.js'

describe('engine: distribuciones', () => {
  it('normal es determinista y ronda su media', () => {
    const rng = seededRng('n')
    const values = Array.from({ length: 5000 }, () => normal(rng, 50, 5))
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    expect(mean).toBeGreaterThan(48)
    expect(mean).toBeLessThan(52)
  })

  it('beta cae en [0, 1]', () => {
    const rng = seededRng('b')
    for (let i = 0; i < 1000; i++) {
      const value = beta(rng, 2, 4.5)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it('gamma es positivo', () => {
    const rng = seededRng('g')
    for (let i = 0; i < 1000; i++) {
      expect(gamma(rng, 2)).toBeGreaterThan(0)
    }
  })

  it('uniformInt respeta los límites inclusivos', () => {
    const rng = seededRng('u')
    for (let i = 0; i < 1000; i++) {
      const value = uniformInt(rng, 26, 31)
      expect(value).toBeGreaterThanOrEqual(26)
      expect(value).toBeLessThanOrEqual(31)
    }
  })
})
