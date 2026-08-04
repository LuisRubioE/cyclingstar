import { describe, expect, it } from 'vitest'
import { CITY_POOLS, raceRoute, stageEndpoints } from './cities.js'

describe('cities: recorridos de carrera', () => {
  it('cada país anfitrión tiene un pool de ciudades reales sin duplicados', () => {
    for (const [country, pool] of Object.entries(CITY_POOLS)) {
      expect(pool.length, `${country} necesita >= 6 ciudades`).toBeGreaterThanOrEqual(6)
      expect(new Set(pool).size, `${country} no debe repetir ciudades`).toBe(pool.length)
      // ASCII imprimible (sin tildes que rompan): nada por encima de 0x7e.
      for (const city of pool) {
        expect(/^[\x20-\x7e]+$/.test(city), `${country}: "${city}" debe ser ASCII`).toBe(true)
      }
    }
  })

  it('raceRoute es determinista y encadena una ciudad más que etapas', () => {
    const a = raceRoute('race-fr', 'FR', 5)
    const b = raceRoute('race-fr', 'FR', 5)
    expect(a).not.toBeNull()
    expect(a).toEqual(b) // mismo trazado siempre
    expect(a).toHaveLength(6) // stages + 1
    for (const city of a!) expect(CITY_POOLS.FR).toContain(city)
    // Sin repetir ciudad consecutiva (salida != meta en cada etapa).
    for (let i = 1; i < a!.length; i++) expect(a![i]).not.toBe(a![i - 1])
  })

  it('carreras distintas dan trazados distintos en el mismo país', () => {
    const a = raceRoute('tour-de-france', 'FR', 4)
    const b = raceRoute('paris-nice', 'FR', 4)
    expect(a).not.toEqual(b)
  })

  it('stageEndpoints devuelve salida y meta encadenadas', () => {
    const s1 = stageEndpoints('giro', 'IT', 3, 1)
    const s2 = stageEndpoints('giro', 'IT', 3, 2)
    expect(s1).not.toBeNull()
    expect(s2).not.toBeNull()
    // La meta de la etapa 1 es la salida de la etapa 2 (recorrido continuo).
    expect(s1!.to).toBe(s2!.from)
  })

  it('devuelve null sin país, país desconocido o índice fuera de rango', () => {
    expect(raceRoute('x', null, 3)).toBeNull()
    expect(raceRoute('x', 'ZZ', 3)).toBeNull()
    expect(stageEndpoints('x', 'IT', 3, 0)).toBeNull()
    expect(stageEndpoints('x', 'IT', 3, 4)).toBeNull()
  })
})
