import { describe, expect, it } from 'vitest'
import { SEASON_CALENDAR } from './calendar.js'
import { RACE_ROUTES, raceRoute, stageEndpoints } from './raceRoutes.js'

/** Carreras con recorrido definido: todas menos los campeonatos nacionales (que son en un sitio). */
const routedRaces = SEASON_CALENDAR.filter((r) => !r.championshipCountry)

describe('recorridos reales de carrera', () => {
  it('cada carrera (no campeonato) tiene un par [salida, meta] por etapa', () => {
    for (const race of routedRaces) {
      const route = RACE_ROUTES[race.id]
      expect(route, `${race.id} (${race.name}) necesita recorrido`).toBeDefined()
      expect(route!.length, `${race.id} (${race.name}) debe tener un par por etapa`).toBe(
        race.stages.length,
      )
    }
  })

  it('todas las localidades son cadenas ASCII no vacías', () => {
    for (const route of Object.values(RACE_ROUTES)) {
      for (const [from, to] of route) {
        for (const town of [from, to]) {
          expect(town.trim().length).toBeGreaterThan(0)
          expect(/^[\x20-\x7e]+$/.test(town), `"${town}" debe ser ASCII`).toBe(true)
        }
      }
    }
  })

  it('no hay recorridos de carreras inexistentes en el calendario', () => {
    const ids = new Set(SEASON_CALENDAR.map((r) => r.id))
    for (const id of Object.keys(RACE_ROUTES)) {
      expect(ids.has(id), `${id} no está en el calendario`).toBe(true)
    }
  })

  it('stageEndpoints devuelve la salida y meta de cada etapa', () => {
    const multi = routedRaces.find((r) => r.stages.length >= 3)!
    const s1 = stageEndpoints(multi.id, 1)
    const last = stageEndpoints(multi.id, multi.stages.length)
    expect(s1).not.toBeNull()
    expect(last).not.toBeNull()
    expect(typeof s1!.from).toBe('string')
    expect(typeof last!.to).toBe('string')
  })

  it('devuelve null fuera de rango o para una carrera sin recorrido', () => {
    expect(raceRoute('does-not-exist')).toBeNull()
    expect(stageEndpoints('does-not-exist', 1)).toBeNull()
    const first = routedRaces[0]!
    expect(stageEndpoints(first.id, 0)).toBeNull()
    expect(stageEndpoints(first.id, first.stages.length + 1)).toBeNull()
  })
})
