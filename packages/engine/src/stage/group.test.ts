import { describe, expect, it } from 'vitest'
import { seededRng } from '@cyclingstar/shared'
import { blockProbability, rollHazard } from './hazard.js'
import {
  advanceGroup,
  createGroup,
  gapSeconds,
  isCapture,
  mergeGroups,
  percentile75,
} from './group.js'
import type { Block } from './types.js'

const flat: Block = { tipo: 'llano', g: 0, estrellas: 0 }

describe('marco de riesgos (6.8)', () => {
  it('deriva la probabilidad por bloque de la intensidad por km', () => {
    // p = 1 - exp(-λ·dx). Con λ = 1 /km y dx = 0.1 km -> ~9.5%.
    expect(blockProbability(1, 0.1)).toBeCloseTo(1 - Math.exp(-0.1))
    expect(blockProbability(0, 0.1)).toBe(0)
  })

  it('el número esperado de eventos es invariante a la resolución (6.17)', () => {
    const lambda = 0.5 // eventos por km
    const distanceKm = 20
    const runs = 400

    const meanEvents = (dx: number): number => {
      const blocks = Math.round(distanceKm / dx)
      let total = 0
      for (let r = 0; r < runs; r++) {
        const rng = seededRng(`hazard-${dx}-${r}`)
        for (let i = 0; i < blocks; i++) if (rollHazard(rng, lambda, dx)) total += 1
      }
      return total / runs
    }

    const coarse = meanEvents(0.1)
    const fine = meanEvents(0.05)
    const expected = lambda * distanceKm // 10 eventos por corrida

    // Ambas resoluciones rondan el valor esperado y difieren menos del 5%.
    expect(coarse).toBeGreaterThan(expected * 0.9)
    expect(coarse).toBeLessThan(expected * 1.1)
    expect(Math.abs(coarse - fine) / fine).toBeLessThan(0.05)
  })
})

describe('grupos y relojes (6.3)', () => {
  it('el reloj avanza y la velocidad persigue a la objetivo', () => {
    const g0 = createGroup('peloton', ['a', 'b', 'c'], { compromiso: 1 })
    expect(g0.vActual).toBe(35)
    const g1 = advanceGroup(g0, flat, 75, {})
    expect(g1.tS).toBeGreaterThan(0)
    expect(g1.vActual).toBeGreaterThan(35) // acelera hacia la objetivo (~44 a P75=75, c=1)
  })

  it('el boquete de un descolgado se integra igual a cualquier resolución (6.3, 6.17)', () => {
    // Un grupo rápido y otro lento sobre llano; el boquete tras 10 km debe coincidir.
    const simulateGap = (dx: number): number => {
      let fast = createGroup('fuga', ['x'], { compromiso: 1 })
      let slow = createGroup('grupeto', ['y'], { compromiso: 0.2 })
      const blocks = Math.round(10 / dx)
      for (let i = 0; i < blocks; i++) {
        fast = advanceGroup(fast, flat, 90, {}, dx)
        slow = advanceGroup(slow, flat, 45, {}, dx)
      }
      return gapSeconds(fast, slow)
    }
    const coarse = simulateGap(0.1)
    const fine = simulateGap(0.05)
    expect(coarse).toBeGreaterThan(0)
    expect(Math.abs(coarse - fine) / fine).toBeLessThan(0.05)
  })

  it('captura y fusión cuando el boquete cae a 5 s o menos', () => {
    const a = createGroup('a', ['a1'], { tS: 100 })
    const near = createGroup('b', ['b1'], { tS: 103 })
    const far = createGroup('c', ['c1'], { tS: 130 })
    expect(isCapture(a, near)).toBe(true)
    expect(isCapture(a, far)).toBe(false)

    const merged = mergeGroups(a, near)
    expect(merged.riderIds).toEqual(['a1', 'b1'])
    expect(merged.tS).toBe(100) // hereda el reloj del que va delante
  })
})

describe('percentile75', () => {
  it('interpola el percentil 75 de los que marcan el ritmo', () => {
    expect(percentile75([10])).toBe(10)
    expect(percentile75([1, 2, 3, 4, 5])).toBeCloseTo(4)
  })
})
