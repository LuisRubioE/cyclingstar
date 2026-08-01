import { seededRng } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { neoproAge, shouldRetire } from './lifecycle.js'

describe('engine: ciclo vital entre temporadas (SPEC 2, 10, Paso 37)', () => {
  it('un corredor joven nunca se retira', () => {
    const rng = seededRng('a')
    for (let i = 0; i < 50; i++) expect(shouldRetire(25, 32, rng)).toBe(false)
  })

  it('a los 39 o más siempre se retira', () => {
    const rng = seededRng('b')
    expect(shouldRetire(39, 33, rng)).toBe(true)
    expect(shouldRetire(41, 30, rng)).toBe(true)
  })

  it('la tasa de retiro crece con la edad pasado el declive', () => {
    const rate = (age: number) => {
      const rng = seededRng(`r${age}`)
      let n = 0
      for (let i = 0; i < 1000; i++) if (shouldRetire(age, 33, rng)) n++
      return n / 1000
    }
    expect(rate(34)).toBeLessThan(rate(37))
    expect(rate(37)).toBeGreaterThan(0)
    expect(rate(37)).toBeLessThan(1)
  })

  it('los neoprofesionales tienen entre 19 y 23 años', () => {
    const rng = seededRng('neo')
    for (let i = 0; i < 200; i++) {
      const age = neoproAge(rng)
      expect(age).toBeGreaterThanOrEqual(19)
      expect(age).toBeLessThanOrEqual(23)
    }
  })
})
