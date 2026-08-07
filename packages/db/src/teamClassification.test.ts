import { describe, expect, it } from 'vitest'
import { TEAM_SCORING_RIDERS, type TeamStageEntry, teamStageScores } from './teamClassification.js'

/**
 * La REGLA de la clasificación por equipos, sin base de datos: los tres mejores de cada equipo en
 * una etapa. Lo que aquí se fija es lo que luego escribe el tick y lo que se deriva del histórico:
 * la misma función alimenta a las dos, así que no pueden divergir.
 */

/** Atajo para montar el resultado de una etapa: [equipo, puesto, tiempo]. */
function entries(rows: readonly [string | null, number, number][]): TeamStageEntry[] {
  return rows.map(([teamId, puesto, tiempoS]) => ({
    riderId: `r${puesto}`,
    teamId,
    puesto,
    tiempoS,
  }))
}

describe('clasificación por equipos: los tres mejores de la etapa', () => {
  it('suma los TRES mejores tiempos de cada equipo, no todos sus corredores', () => {
    // El equipo A mete cinco: solo cuentan sus tres mejores (100 + 110 + 120), no los otros dos.
    const scores = teamStageScores(
      entries([
        ['A', 1, 100],
        ['A', 2, 110],
        ['A', 3, 120],
        ['A', 4, 130],
        ['A', 5, 140],
        ['B', 6, 150],
        ['B', 7, 160],
        ['B', 8, 170],
      ]),
    )
    const a = scores.find((s) => s.teamId === 'A')!
    const b = scores.find((s) => s.teamId === 'B')!
    expect(a.tiempoS).toBe(330)
    expect(a.sumaPuestos).toBe(6) // 1 + 2 + 3
    expect(a.mejorPuesto).toBe(1)
    expect(b.tiempoS).toBe(480)
    expect(b.sumaPuestos).toBe(21) // 6 + 7 + 8
  })

  it('no puntúa el equipo con menos de tres clasificados, pero deja constancia', () => {
    const scores = teamStageScores(
      entries([
        ['A', 1, 100],
        ['A', 2, 100],
        ['A', 3, 100],
        // El equipo B solo tiene dos en meta: no puntúa esta etapa.
        ['B', 4, 100],
        ['B', 5, 100],
      ]),
    )
    expect(scores).toHaveLength(2)
    const b = scores.find((s) => s.teamId === 'B')!
    expect(b.scored).toBe(false)
    expect(b.tiempoS).toBe(0)
    expect(b.sumaPuestos).toBe(0)
    // Y con exactamente tres sí puntúa: el umbral es "al menos tres".
    expect(scores.find((s) => s.teamId === 'A')!.scored).toBe(true)
    expect(TEAM_SCORING_RIDERS).toBe(3)
  })

  it('los agentes libres no tienen equipo: ni suman ni aparecen', () => {
    const scores = teamStageScores(
      entries([
        [null, 1, 90], // agente libre ganando la etapa
        [null, 2, 95],
        [null, 3, 95],
        ['A', 4, 100],
        ['A', 5, 110],
        ['A', 6, 120],
      ]),
    )
    // Un solo equipo en la tabla, y el tiempo del agente libre no se ha colado en él.
    expect(scores.map((s) => s.teamId)).toEqual(['A'])
    expect(scores[0]!.tiempoS).toBe(330)
  })

  it('a igualdad de tiempo elige a los mejor clasificados (llegada masiva)', () => {
    // Todo el equipo entra con el mismo tiempo: los tres que puntúan son los de mejor puesto, así
    // que la suma de puestos —el primer desempate— es la mínima posible.
    const scores = teamStageScores(
      entries([
        ['A', 10, 100],
        ['A', 2, 100],
        ['A', 40, 100],
        ['A', 5, 100],
      ]),
    )
    expect(scores[0]!.sumaPuestos).toBe(17) // 2 + 5 + 10
    expect(scores[0]!.mejorPuesto).toBe(2)
  })

  it('devuelve las filas en orden de id: la escritura en lote es determinista', () => {
    const scores = teamStageScores(
      entries([
        ['C', 1, 100],
        ['A', 2, 100],
        ['B', 3, 100],
        ['C', 4, 100],
        ['A', 5, 100],
        ['B', 6, 100],
        ['C', 7, 100],
        ['A', 8, 100],
        ['B', 9, 100],
      ]),
    )
    expect(scores.map((s) => s.teamId)).toEqual(['A', 'B', 'C'])
  })
})
