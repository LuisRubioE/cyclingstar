/**
 * Invariantes de balance de la etapa llana (SPEC 6.17), que corren en CI. Todo es determinista
 * (semillas fijas, sin reloj ni Math.random), así que los rangos se validan de forma reproducible
 * bit a bit. La campaña completa de calibración se lanza con `pnpm sim`.
 */
import { describe, expect, it } from 'vitest'
import { advanceGroup, createGroup } from '../stage/group.js'
import { accLimit, blockSeconds } from '../stage/physics.js'
import type { Block } from '../stage/types.js'
import { analyzeFlat } from './analyze.js'
import { campaignSeeds, flatScenario } from './scenarios.js'

const flat: Block = { tipo: 'llano', g: 0, estrellas: 0 }

describe('invariantes de llano (6.17)', () => {
  const scenario = flatScenario()
  const stats = analyzeFlat(scenario, campaignSeeds(scenario.name, 120))

  it('la fuga gana entre el 2% y el 8% de las etapas', () => {
    expect(stats.breakawayWinPct).toBeGreaterThanOrEqual(2)
    expect(stats.breakawayWinPct).toBeLessThanOrEqual(8)
  })

  it('el mejor sprinter gana entre el 30% y el 45% con 3 sprinters de nivel', () => {
    expect(stats.bestSprinterWinPct).toBeGreaterThanOrEqual(30)
    expect(stats.bestSprinterWinPct).toBeLessThanOrEqual(45)
  })

  it('cuando los sprinters cazan, la captura mediana cae entre el km 25 y el km 8 a meta', () => {
    expect(stats.capturePct).toBeGreaterThan(85)
    expect(stats.medianCatchKmToFinish).toBeGreaterThanOrEqual(8)
    expect(stats.medianCatchKmToFinish).toBeLessThanOrEqual(25)
  })
})

describe('cierre del pelotón comprometido (6.17)', () => {
  it('un pelotón comprometido cierra entre 50 y 75 segundos por cada 10 km', () => {
    // Fuga a tempo (0.6) y pelotón a compromiso alto de caza (0.85), mismos punteros (~68).
    let brk = createGroup('brk', ['b'], { compromiso: 0.6 })
    let pel = createGroup('pel', ['p'], { compromiso: 0.85 })
    for (let i = 0; i < 50; i++) {
      brk = advanceGroup(brk, flat, 68, {})
      pel = advanceGroup(pel, flat, 68, {})
    }
    const gap0 = pel.tS - brk.tS
    for (let i = 0; i < 100; i++) {
      brk = advanceGroup(brk, flat, 68, {})
      pel = advanceGroup(pel, flat, 68, {})
    }
    const cierre = gap0 - (pel.tS - brk.tS)
    expect(cierre).toBeGreaterThanOrEqual(50)
    expect(cierre).toBeLessThanOrEqual(75)
  })
})

describe('inercia acotada (6.17)', () => {
  it('a ritmo de carrera, ningún grupo varía más de 4 km/h entre bloques (fuera de cerillo y descenso)', () => {
    // La cota es ACC_PEDAL·dt; con dx = 0.1 km se mantiene ≤ 4 km/h por encima de ~36 km/h.
    for (let v = 40; v <= 55; v += 1) {
      const dt = blockSeconds(v)
      const deltaMax = accLimit(0) * dt // g = 0: sin regalo de gravedad
      expect(deltaMax).toBeLessThanOrEqual(4)
    }
  })
})
