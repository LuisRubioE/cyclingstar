import { describe, expect, it } from 'vitest'
import { seededRng } from '@cyclingstar/shared'
import { blockProbability, rollHazard } from './hazard.js'
import {
  advanceGroup,
  createGroup,
  gapSeconds,
  isCapture,
  mainGroupId,
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
    const g1 = advanceGroup(g0, flat, 75, undefined, {})
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
        fast = advanceGroup(fast, flat, 90, undefined, {}, dx)
        slow = advanceGroup(slow, flat, 45, undefined, {}, dx)
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

/**
 * QUIÉN ES EL PELOTÓN (v29). Los grupos del motor se llaman por su ORIGEN y esos nombres no caducan:
 * un grupo nacido del pelotón seguía siendo «el pelotón» con dos corredores, y uno descolgado seguía
 * siendo «grupeto» con cien. Medido sobre 8.510 fotos del banco, la etiqueta mentía en el 22,1 % —y
 * en el 21,0 % iba MÁS gente detrás del falso pelotón que dentro de él—.
 */
describe('mainGroupId: el pelotón es el que lleva la gente', () => {
  const T = 1.25

  it('sin grupos no hay pelotón', () => {
    expect(mainGroupId([], 'peloton', T)).toBeNull()
  })

  it('el caso de Race Andalucía: dos corredores no son un pelotón con cien detrás', () => {
    const road = [
      { id: 'mov-1', size: 1 },
      { id: 'peloton', size: 2 },
      { id: 'shed-3', size: 100 },
    ]
    expect(mainGroupId(road, 'peloton', T)).toBe('shed-3')
  })

  it('dos mitades parecidas NO se intercambian el título: hace falta superarlo con margen', () => {
    const road = [
      { id: 'peloton', size: 53 },
      { id: 'shed-1', size: 55 },
    ]
    // 55 no llega a 53·1,25 = 66,25: la etiqueta se queda donde estaba (el caso que la v17 dejó
    // deliberadamente «cerca del centro»).
    expect(mainGroupId(road, 'peloton', T)).toBe('peloton')
    // …y al revés: si el título lo tenía el otro, tampoco se lo quita el de 53.
    expect(mainGroupId(road, 'shed-1', T)).toBe('shed-1')
  })

  it('cuando uno se lleva claramente la carrera, el título cambia de dueño', () => {
    const road = [
      { id: 'peloton', size: 40 },
      { id: 'shed-1', size: 60 },
    ]
    expect(mainGroupId(road, 'peloton', T)).toBe('shed-1')
  })

  it('si el que tenía el título ya no existe —fundido o vacío— manda el tamaño', () => {
    const road = [
      { id: 'mov-2', size: 8 },
      { id: 'shed-1', size: 90 },
    ]
    expect(mainGroupId(road, 'peloton', T)).toBe('shed-1')
    expect(mainGroupId(road, null, T)).toBe('shed-1')
  })

  it('es TOTAL: dos grupos del mismo tamaño dan la misma respuesta venga como venga la lista', () => {
    const a = { id: 'aaa', size: 50 }
    const b = { id: 'bbb', size: 50 }
    expect(mainGroupId([a, b], null, T)).toBe('aaa')
    expect(mainGroupId([b, a], null, T)).toBe('aaa')
  })

  it('el pelotón entero al completo se queda con su nombre, que es el caso normal', () => {
    const road = [
      { id: 'mov-1', size: 6 },
      { id: 'peloton', size: 140 },
    ]
    expect(mainGroupId(road, 'peloton', T)).toBe('peloton')
  })
})
