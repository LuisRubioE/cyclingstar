import { describe, expect, it } from 'vitest'
import { buildRiderRaceResults } from './riderResults.js'

/**
 * Agrupación de los resultados de un corredor por carrera (docs/navegacion.md §3.6). Lógica pura:
 * lo que se prueba aquí es que la GENERAL sea siempre el titular de la carrera —se gane o no— y que
 * las etapas queden debajo como desglose, ordenadas y sin perderse ninguna.
 *
 * Las carreras son del calendario real del motor: Catalonia (7 etapas), France (21) y Sanremo (una
 * clásica de un día).
 */

const CATALONIA = 'race-catalonia:s1' // 7 etapas, sale el día 82
const FRANCE = 'race-france:s1' //       21 etapas, sale el día 185
const SANREMO = 'race-sanremo:s1' //     un día, sale el día 80

describe('buildRiderRaceResults', () => {
  it('la general es el resultado de la carrera aunque no se gane', () => {
    const [race] = buildRiderRaceResults(
      [
        { raceId: FRANCE, stageDay: 1, puesto: 12 },
        { raceId: FRANCE, stageDay: 2, puesto: 8 },
      ],
      new Map([[FRANCE, { puesto: 3, dnf: false }]]),
      new Map([[FRANCE, 21]]),
      10,
    )
    expect(race).toBeDefined()
    expect(race!.raceName).toBe('Race France')
    expect(race!.gcPuesto).toBe(3)
    expect(race!.dnf).toBe(false)
    expect(race!.finished).toBe(true)
    expect(race!.isOneDay).toBe(false)
    expect(race!.stageCount).toBe(21)
  })

  it('agrupa todas las etapas de una carrera en una sola entrada, ordenadas por día', () => {
    const rows = [
      { raceId: CATALONIA, stageDay: 3, puesto: 3 },
      { raceId: CATALONIA, stageDay: 1, puesto: 1 },
      { raceId: CATALONIA, stageDay: 2, puesto: 1 },
    ]
    const out = buildRiderRaceResults(
      rows,
      new Map([[CATALONIA, { puesto: 1, dnf: false }]]),
      new Map(),
      10,
    )
    expect(out).toHaveLength(1)
    expect(out[0]!.stages).toEqual([
      { stageDay: 1, puesto: 1 },
      { stageDay: 2, puesto: 1 },
      { stageDay: 3, puesto: 3 },
    ])
  })

  it('en una carrera de un día el puesto de la única etapa ES el de la carrera', () => {
    const [race] = buildRiderRaceResults(
      [{ raceId: SANREMO, stageDay: 1, puesto: 5 }],
      new Map(),
      new Map([[SANREMO, 1]]),
      10,
    )
    expect(race!.isOneDay).toBe(true)
    expect(race!.gcPuesto).toBe(5)
    expect(race!.finished).toBe(true)
  })

  it('marca el abandono y no inventa puesto de general cuando no hay', () => {
    const [race] = buildRiderRaceResults(
      [{ raceId: CATALONIA, stageDay: 1, puesto: 40 }],
      new Map([[CATALONIA, { puesto: 120, dnf: true }]]),
      new Map([[CATALONIA, 7]]),
      10,
    )
    expect(race!.dnf).toBe(true)

    const [sinGeneral] = buildRiderRaceResults(
      [{ raceId: CATALONIA, stageDay: 1, puesto: 40 }],
      new Map(),
      new Map([[CATALONIA, 7]]),
      10,
    )
    expect(sinGeneral!.gcPuesto).toBeNull()
  })

  it('una carrera en curso no está terminada', () => {
    const [race] = buildRiderRaceResults(
      [{ raceId: CATALONIA, stageDay: 1, puesto: 4 }],
      new Map([[CATALONIA, { puesto: 4, dnf: false }]]),
      new Map([[CATALONIA, 3]]),
      10,
    )
    expect(race!.finished).toBe(false)
    expect(race!.gcPuesto).toBe(4)
  })

  it('ordena de lo más reciente a lo más antiguo y recorta al límite', () => {
    const rows = [
      { raceId: SANREMO, stageDay: 1, puesto: 9 }, // temporada 1, día 80
      { raceId: FRANCE, stageDay: 1, puesto: 2 }, //  temporada 1, día 185
      { raceId: 'race-catalonia:s0', stageDay: 1, puesto: 1 }, // temporada 0
    ]
    const gc = new Map()
    expect(buildRiderRaceResults(rows, gc, new Map(), 10).map((r) => r.raceId)).toEqual([
      'race-france',
      'race-sanremo',
      'race-catalonia',
    ])
    expect(buildRiderRaceResults(rows, gc, new Map(), 1).map((r) => r.raceId)).toEqual([
      'race-france',
    ])
  })

  it('ignora la vuelta de prueba y las carreras que no están en el calendario', () => {
    const out = buildRiderRaceResults(
      [
        { raceId: 'test-tour', stageDay: 1, puesto: 1 },
        { raceId: 'race-que-no-existe:s1', stageDay: 1, puesto: 1 },
      ],
      new Map(),
      new Map(),
      10,
    )
    expect(out).toEqual([])
  })
})
