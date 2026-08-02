import { ATTRIBUTES, COUNTRIES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { planWorld, teamCountryFromSeed } from './world.js'

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
  it('compone 236 equipos con cifras reales por división (18 WT + 18 PRS + 200 CON)', () => {
    const { teams } = planWorld('world-seed')
    expect(teams).toHaveLength(18 + 18 + 200)
    expect(teams.filter((t) => t.division === 'WT')).toHaveLength(18)
    expect(teams.filter((t) => t.division === 'PRS')).toHaveLength(18)
    expect(teams.filter((t) => t.division === 'CON')).toHaveLength(200)
  })

  it('genera al menos 3.200 corredores; los fichados tienen equipo, los libres no', () => {
    const { riders } = planWorld('world-seed')
    expect(riders.length).toBeGreaterThanOrEqual(3200)
    const signed = 18 * 14 + 18 * 12 + 200 * 10
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

  it('cada equipo tiene una nacionalidad real (país con datos) y es reproducible', () => {
    const codes = new Set(COUNTRIES.map((c) => c.code))
    const a = planWorld('world-seed').teams
    const b = planWorld('world-seed').teams
    for (let i = 0; i < a.length; i++) {
      expect(codes.has(a[i]!.country)).toBe(true)
      // Determinista: mismo país en dos planificaciones y desde la fórmula de semilla.
      expect(a[i]!.country).toBe(b[i]!.country)
      expect(a[i]!.country).toBe(teamCountryFromSeed(a[i]!.jerseySeed, a[i]!.division))
    }
  })

  it('el WorldTour tira de potencias tradicionales (sin países exóticos)', () => {
    const wt = planWorld('world-seed').teams.filter((t) => t.division === 'WT')
    const allowed = new Set([
      'BE',
      'FR',
      'IT',
      'NL',
      'ES',
      'GB',
      'US',
      'AU',
      'DE',
      'CH',
      'KZ',
      'AE',
    ])
    for (const t of wt) expect(allowed.has(t.country)).toBe(true)
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
