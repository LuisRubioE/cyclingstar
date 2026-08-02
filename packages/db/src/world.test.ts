import { ATTRIBUTES, COUNTRIES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { planWorld, teamCountryByIndex } from './world.js'

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
  it('compone 221 equipos con el reparto real por división (18 WT + 18 PRS + 185 CON)', () => {
    const { teams } = planWorld('world-seed')
    expect(teams).toHaveLength(18 + 18 + 185)
    expect(teams.filter((t) => t.division === 'WT')).toHaveLength(18)
    expect(teams.filter((t) => t.division === 'PRS')).toHaveLength(18)
    expect(teams.filter((t) => t.division === 'CON')).toHaveLength(185)
  })

  it('genera al menos 3.200 corredores; los fichados tienen equipo, los libres no', () => {
    const { riders } = planWorld('world-seed')
    expect(riders.length).toBeGreaterThanOrEqual(3200)
    const signed = 18 * 14 + 18 * 12 + 185 * 10
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

  it('el WorldTour usa el reparto real (BE 3, FR 3, DE 2, NL 2, …)', () => {
    const wt = planWorld('world-seed').teams.filter((t) => t.division === 'WT')
    const tally: Record<string, number> = {}
    for (const t of wt) tally[t.country] = (tally[t.country] ?? 0) + 1
    expect(tally).toEqual({
      BE: 3,
      FR: 3,
      DE: 2,
      NL: 2,
      US: 1,
      GB: 1,
      CH: 1,
      BH: 1,
      AU: 1,
      ES: 1,
      AE: 1,
      KZ: 1,
    })
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
