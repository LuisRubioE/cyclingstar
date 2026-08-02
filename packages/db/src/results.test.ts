import { describe, expect, it } from 'vitest'
import { type GcRow, teamsClassification } from './results.js'

function gc(riderId: string, teamName: string | null, tiempoTotalS: number): GcRow {
  return {
    riderId,
    name: riderId,
    country: 'FR',
    teamName,
    isBot: true,
    tiempoTotalS,
    puntosVolante: 0,
    puntosMontana: 0,
  }
}

describe('db: clasificación por equipos (SPEC)', () => {
  it('suma los 3 mejores de cada equipo y ordena por tiempo', () => {
    // gc llega ya ordenada por tiempo (como la devuelve getRaceGc).
    const rows: GcRow[] = [
      gc('a1', 'A', 100),
      gc('b1', 'B', 110),
      gc('a2', 'A', 120),
      gc('b2', 'B', 130),
      gc('a3', 'A', 140),
      gc('a4', 'A', 200), // el 4º de A no cuenta
      gc('b3', 'B', 150),
    ]
    const table = teamsClassification(rows)
    expect(table).toHaveLength(2)
    // A: 100+120+140 = 360; B: 110+130+150 = 390. A gana.
    expect(table[0]).toEqual({ teamName: 'A', tiempoTotalS: 360, riderCount: 4 })
    expect(table[1]).toEqual({ teamName: 'B', tiempoTotalS: 390, riderCount: 3 })
  })

  it('excluye equipos con menos de 3 corredores clasificados', () => {
    const rows: GcRow[] = [gc('a1', 'A', 100), gc('a2', 'A', 120), gc('c1', 'C', 130)]
    expect(teamsClassification(rows)).toHaveLength(0)
  })

  it('ignora a los corredores sin equipo (agentes libres, humano)', () => {
    const rows: GcRow[] = [
      gc('a1', 'A', 100),
      gc('a2', 'A', 120),
      gc('a3', 'A', 140),
      gc('free', null, 90),
    ]
    const table = teamsClassification(rows)
    expect(table).toHaveLength(1)
    expect(table[0]?.tiempoTotalS).toBe(360)
  })
})
