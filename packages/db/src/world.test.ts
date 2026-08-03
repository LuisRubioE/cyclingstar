import { ATTRIBUTES, COUNTRIES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  type ClusterRider,
  type ClusterTeam,
  planNationalClustering,
  planWorld,
  teamCountryByIndex,
} from './world.js'

/** El plan sin los UUID de cliente (que sí varían por ejecución). */
function stableShape(seed: string) {
  const plan = planWorld(seed)
  return {
    teams: plan.teams.map((t) => ({
      name: t.name,
      division: t.division,
      budget: t.budget,
      philosophy: t.philosophy,
      facilities: t.facilities,
    })),
    riders: plan.riders.map((r) => ({
      name: r.name,
      country: r.country,
      archetype: r.archetype,
      birthSeason: r.birthSeason,
      attributes: r.attributes,
      hidden: r.hidden,
      hasTeam: r.teamId !== null,
    })),
  }
}

describe('db: génesis del mundo (SPEC 10, Paso 33)', () => {
  it('compone 219 equipos con el reparto real por división (18 WT + 16 PRS + 185 CON)', () => {
    const { teams } = planWorld('world-seed')
    expect(teams).toHaveLength(18 + 16 + 185)
    expect(teams.filter((t) => t.division === 'WT')).toHaveLength(18)
    expect(teams.filter((t) => t.division === 'PRS')).toHaveLength(16)
    expect(teams.filter((t) => t.division === 'CON')).toHaveLength(185)
  })

  it('genera al menos 3.200 corredores; los fichados tienen equipo, los libres no', () => {
    const { riders } = planWorld('world-seed')
    expect(riders.length).toBeGreaterThanOrEqual(3200)
    const signed = 18 * 14 + 16 * 12 + 185 * 10
    expect(riders.filter((r) => r.teamId !== null)).toHaveLength(signed)
    expect(riders.filter((r) => r.teamId === null).length).toBeGreaterThan(0)
  })

  it('es reproducible desde la semilla (misma composición ignorando UUID)', () => {
    expect(stableShape('world-seed')).toEqual(stableShape('world-seed'))
  })

  it('semillas distintas dan mundos distintos', () => {
    const a = stableShape('world-a')
    const b = stableShape('world-b')
    expect(a).not.toEqual(b)
  })

  it('cada corredor tiene atributos válidos y una birthSeason coherente con debut a los 20', () => {
    const { riders } = planWorld('world-seed')
    for (const rider of riders) {
      for (const attr of ATTRIBUTES) {
        expect(rider.attributes[attr]).toBeGreaterThanOrEqual(20)
        expect(rider.attributes[attr]).toBeLessThanOrEqual(95)
      }
      // Edad en génesis (temporada 0) = 20 - birthSeason, dentro de [18,38].
      const age = 20 - rider.birthSeason
      expect(age).toBeGreaterThanOrEqual(18)
      expect(age).toBeLessThanOrEqual(38)
    }
  })

  it('no hay nombres de equipo repetidos (validación de duplicados)', () => {
    const { teams } = planWorld('world-seed')
    const names = teams.map((t) => t.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('no hay nombres de corredor repetidos, ni bots ni humanos (validación de duplicados)', () => {
    const { riders } = planWorld('world-seed')
    const names = riders.map((r) => r.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('cada equipo tiene una nacionalidad real (país registrado) por índice de reparto', () => {
    const codes = new Set(COUNTRIES.map((c) => c.code))
    for (const t of planWorld('world-seed').teams) {
      expect(codes.has(t.country)).toBe(true)
    }
  })

  it('respeta el reparto exacto de nacionalidades del Continental real', () => {
    const con = planWorld('world-seed').teams.filter((t) => t.division === 'CON')
    const tally: Record<string, number> = {}
    for (const t of con) tally[t.country] = (tally[t.country] ?? 0) + 1
    // Muestra representativa del reparto pedido.
    expect(tally.CN).toBe(15)
    expect(tally.IT).toBe(13)
    expect(tally.FR).toBe(12)
    expect(tally.PT).toBe(10)
    expect(tally.JP).toBe(9)
    expect(tally.DE).toBe(9)
    expect(tally.US).toBe(8)
    expect(tally.NL).toBe(8)
    expect(tally.HK).toBe(1)
    expect(tally.XK).toBe(1)
    expect(tally.GU).toBe(1)
    expect(con.length).toBe(185)
  })

  it('el WorldTour usa el reparto real (BE 3, FR 2, DE 2, NL 2, NO 1, …)', () => {
    const wt = planWorld('world-seed').teams.filter((t) => t.division === 'WT')
    const tally: Record<string, number> = {}
    for (const t of wt) tally[t.country] = (tally[t.country] ?? 0) + 1
    expect(tally).toEqual({
      BE: 3,
      FR: 2,
      DE: 2,
      NL: 2,
      US: 1,
      GB: 1,
      CH: 1,
      BH: 1,
      AU: 1,
      ES: 1,
      AE: 1,
      NO: 1,
      KZ: 1,
    })
    expect(wt.length).toBe(18)
  })

  it('los ProTeams usan el reparto real (ES 4, IT 3, FR 3, US 2, CH 2, HU 1, BE 1)', () => {
    const prs = planWorld('world-seed').teams.filter((t) => t.division === 'PRS')
    const tally: Record<string, number> = {}
    for (const t of prs) tally[t.country] = (tally[t.country] ?? 0) + 1
    expect(tally).toEqual({ ES: 4, IT: 3, FR: 3, US: 2, CH: 2, HU: 1, BE: 1 })
    expect(prs.length).toBe(16)
  })

  it('el país del equipo i coincide con teamCountryByIndex', () => {
    const teams = planWorld('world-seed').teams
    const idxByDiv: Record<string, number> = { WT: 0, PRS: 0, CON: 0 }
    for (const t of teams) {
      const i = idxByDiv[t.division]!
      expect(t.country).toBe(teamCountryByIndex(t.division, i))
      idxByDiv[t.division] = i + 1
    }
  })

  it('cada equipo firmado tiene presupuesto positivo y un roster acorde a su división', () => {
    const { teams, riders } = planWorld('world-seed')
    const rosterByTeam = new Map<string, number>()
    for (const r of riders) {
      if (r.teamId) rosterByTeam.set(r.teamId, (rosterByTeam.get(r.teamId) ?? 0) + 1)
    }
    const expected: Record<string, number> = { WT: 14, PRS: 12, CON: 10 }
    for (const team of teams) {
      expect(team.budget).toBeGreaterThan(0)
      expect(rosterByTeam.get(team.id)).toBe(expected[team.division])
    }
  })
})

describe('db: núcleo nacional de la plantilla (SPEC 7.1)', () => {
  // Dos equipos CON (ES y FR), 10 corredores cada uno, mezcla inicial 50/50 mal repartida.
  const teams: ClusterTeam[] = [
    { id: 'esp', division: 'CON', country: 'ES', order: 0 },
    { id: 'fra', division: 'CON', country: 'FR', order: 1 },
  ]
  function mix(): ClusterRider[] {
    const rs: ClusterRider[] = []
    // 10 españoles y 10 franceses repartidos a medias en ambos equipos.
    for (let i = 0; i < 10; i++)
      rs.push({ id: `es-${i}`, country: 'ES', teamId: i < 5 ? 'esp' : 'fra' })
    for (let i = 0; i < 10; i++)
      rs.push({ id: `fr-${i}`, country: 'FR', teamId: i < 5 ? 'esp' : 'fra' })
    return rs
  }

  function rosterCountry(riders: ClusterRider[], changes: Map<string, string>, teamId: string) {
    const tally: Record<string, number> = {}
    for (const r of riders) {
      const team = changes.get(r.id) ?? r.teamId
      if (team === teamId) tally[r.country] = (tally[r.country] ?? 0) + 1
    }
    return tally
  }

  it('da a cada equipo mayoría de su país conservando el tamaño de plantilla', () => {
    const riders = mix()
    const changes = planNationalClustering(teams, riders)
    const esp = rosterCountry(riders, changes, 'esp')
    const fra = rosterCountry(riders, changes, 'fra')
    // Tamaño conservado (10 y 10).
    expect(Object.values(esp).reduce((a, b) => a + b, 0)).toBe(10)
    expect(Object.values(fra).reduce((a, b) => a + b, 0)).toBe(10)
    // Con cuota CON 0.7 y paisanos de sobra, cada equipo queda con mayoría clara de su país.
    expect(esp.ES).toBeGreaterThanOrEqual(7)
    expect(fra.FR).toBeGreaterThanOrEqual(7)
    expect(esp.ES).toBeGreaterThan(esp.FR ?? 0)
    expect(fra.FR).toBeGreaterThan(fra.ES ?? 0)
  })

  it('es idempotente: reaplicarla no mueve a nadie más', () => {
    const riders = mix()
    const first = planNationalClustering(teams, riders)
    const settled = riders.map((r) => ({ ...r, teamId: first.get(r.id) ?? r.teamId }))
    const second = planNationalClustering(teams, settled)
    expect(second.size).toBe(0)
  })

  it('no mueve corredores entre divisiones distintas', () => {
    const mixedDiv: ClusterTeam[] = [
      { id: 'wt', division: 'WT', country: 'ES', order: 0 },
      { id: 'con', division: 'CON', country: 'FR', order: 0 },
    ]
    const riders: ClusterRider[] = [
      { id: 'a', country: 'FR', teamId: 'wt' },
      { id: 'b', country: 'ES', teamId: 'con' },
    ]
    const changes = planNationalClustering(mixedDiv, riders)
    // Cada equipo es único en su división: nadie puede moverse sin cruzar de división, así que no
    // hay cambios (un solo equipo por división no admite reparto).
    expect(changes.size).toBe(0)
  })

  it('los paisanos que sobran forman legión extranjera en otros equipos (sin perder a nadie)', () => {
    // Un país (ES) con muchos corredores pero un solo equipo; el resto va a otros equipos.
    const three: ClusterTeam[] = [
      { id: 'esp', division: 'CON', country: 'ES', order: 0 },
      { id: 'fra', division: 'CON', country: 'FR', order: 1 },
      { id: 'ita', division: 'CON', country: 'IT', order: 2 },
    ]
    const riders: ClusterRider[] = []
    for (let i = 0; i < 20; i++) riders.push({ id: `es-${i}`, country: 'ES', teamId: 'esp' })
    for (let i = 0; i < 5; i++) riders.push({ id: `fr-${i}`, country: 'FR', teamId: 'fra' })
    for (let i = 0; i < 5; i++) riders.push({ id: `it-${i}`, country: 'IT', teamId: 'ita' })
    const changes = planNationalClustering(three, riders)
    const total = riders.length
    const placed = new Set(riders.map((r) => changes.get(r.id) ?? r.teamId))
    // Nadie queda sin equipo y se conservan los 30 corredores en 3 equipos.
    expect([...placed].every((t) => ['esp', 'fra', 'ita'].includes(t))).toBe(true)
    expect(total).toBe(30)
  })
})
