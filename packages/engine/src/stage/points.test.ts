import { describe, expect, it } from 'vitest'
import { flatScenario, queenScenario } from '../sim/scenarios.js'
import { simulateStage } from './simulate.js'

describe('engine: puntos de clasificación (SPEC 6.11, fix #10)', () => {
  it('la meta de etapa reparte puntos de regularidad a los primeros', () => {
    const out = simulateStage(flatScenario().input, 'seed-points')
    const withPoints = out.results.filter((r) => r.puntosVolante > 0)
    // Muchos corredores puntúan (no solo el de una meta volante intermedia).
    expect(withPoints.length).toBeGreaterThanOrEqual(10)
    // El ganador puntúa más que el segundo.
    const p1 = out.results.find((r) => r.puesto === 1)!
    const p2 = out.results.find((r) => r.puesto === 2)!
    expect(p1.puntosVolante).toBeGreaterThan(p2.puntosVolante)
  })

  it('la montaña reparte entre varios escaladores, no solo uno', () => {
    const out = simulateStage(queenScenario().input, 'seed-kom')
    const withClimb = out.results.filter((r) => r.puntosMontana > 0)
    expect(withClimb.length).toBeGreaterThanOrEqual(3)
  })
})
