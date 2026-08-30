import { describe, expect, it } from 'vitest'
import { flatScenario, queenScenario } from '../sim/scenarios.js'
import { simulateStage } from './simulate.js'

describe('engine: puntos de clasificación (SPEC 6.11, fix #10)', () => {
  it('la meta de etapa reparte puntos de regularidad a los primeros', () => {
    const out = simulateStage(flatScenario().input, 'seed-points')
    const withPoints = out.results.filter((r) => r.puntosVolante > 0)
    // Muchos corredores puntúan (no solo el de una meta volante intermedia).
    expect(withPoints.length).toBeGreaterThanOrEqual(10)
    /**
     * El ganador puntúa más que el segundo… SALVO que el segundo se haya llevado una meta volante
     * por el camino, que es exactamente lo que hace interesante una clasificación por puntos. En
     * esta semilla pasa desde la v41 —resulta ser un día de abanicos, lateral 0,98—: spr-0 gana la
     * volante del km 100, remata segundo y los dos acaban con 40. La prueba sigue vigilando lo que
     * de verdad importa —que el reparto siga el orden de meta— y deja de exigir un estricto mayor
     * donde el modelo dice legítimamente «empate».
     */
    const p1 = out.results.find((r) => r.puesto === 1)!
    const p2 = out.results.find((r) => r.puesto === 2)!
    const volantes = new Set(
      out.events
        .filter((e) => e.plantilla === 'sprint_intermediate')
        .flatMap((e) => e.protagonistas),
    )
    if (volantes.has(p2.riderId)) expect(p1.puntosVolante).toBeGreaterThanOrEqual(p2.puntosVolante)
    else expect(p1.puntosVolante).toBeGreaterThan(p2.puntosVolante)
  })

  it('la montaña reparte entre varios escaladores, no solo uno', () => {
    const out = simulateStage(queenScenario().input, 'seed-kom')
    const withClimb = out.results.filter((r) => r.puntosMontana > 0)
    expect(withClimb.length).toBeGreaterThanOrEqual(3)
  })
})
