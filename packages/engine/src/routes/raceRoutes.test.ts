import { describe, expect, it } from 'vitest'
import { SEASON_CALENDAR } from './calendar.js'
import { RACE_ROUTES, raceRoute, stageEndpoints } from './raceRoutes.js'

/** Carreras con recorrido definido: todas menos los campeonatos nacionales (que son en un sitio). */
const routedRaces = SEASON_CALENDAR.filter((r) => !r.championshipCountry)

describe('recorridos reales de carrera', () => {
  it('cada carrera (no campeonato) tiene un recorrido con una localidad más que etapas', () => {
    for (const race of routedRaces) {
      const route = RACE_ROUTES[race.id]
      expect(route, `${race.id} (${race.name}) necesita recorrido`).toBeDefined()
      expect(route!.length, `${race.id} (${race.name}) debe encadenar etapas+1 localidades`).toBe(
        race.stages.length + 1,
      )
    }
  })

  it('todas las localidades son cadenas ASCII no vacías', () => {
    for (const route of Object.values(RACE_ROUTES)) {
      for (const town of route) {
        expect(town.trim().length).toBeGreaterThan(0)
        expect(/^[\x20-\x7e]+$/.test(town), `"${town}" debe ser ASCII`).toBe(true)
      }
    }
  })

  it('no hay recorridos de carreras inexistentes en el calendario', () => {
    const ids = new Set(SEASON_CALENDAR.map((r) => r.id))
    for (const id of Object.keys(RACE_ROUTES)) {
      expect(ids.has(id), `${id} no está en el calendario`).toBe(true)
    }
  })

  it('stageEndpoints encadena las etapas (meta de una = salida de la siguiente)', () => {
    const multi = routedRaces.find((r) => r.stages.length >= 3)!
    const s1 = stageEndpoints(multi.id, 1)
    const s2 = stageEndpoints(multi.id, 2)
    expect(s1).not.toBeNull()
    expect(s2).not.toBeNull()
    expect(s1!.to).toBe(s2!.from)
  })

  it('devuelve null fuera de rango o para una carrera sin recorrido', () => {
    expect(raceRoute('does-not-exist')).toBeNull()
    expect(stageEndpoints('does-not-exist', 1)).toBeNull()
    const first = routedRaces[0]!
    expect(stageEndpoints(first.id, 0)).toBeNull()
    expect(stageEndpoints(first.id, first.stages.length + 1)).toBeNull()
  })
})
