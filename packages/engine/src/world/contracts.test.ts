import { seededRng } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ageMarketK, offerSalary, offerSeasons, releaseClause } from './contracts.js'

describe('engine: contratos y salarios (SPEC 7.2, Paso 36)', () => {
  it('el salario crece con el percentil de puntos', () => {
    const low = offerSalary({ division: 'WT', pointsPercentile: 0.1, age: 26, role: 'gregario' })
    const high = offerSalary({ division: 'WT', pointsPercentile: 0.9, age: 26, role: 'gregario' })
    expect(high).toBeGreaterThan(low)
  })

  it('respeta la base por división (WT > PRS > CON a igualdad)', () => {
    const args = { pointsPercentile: 0.5, age: 26, role: 'libre' as const }
    const wt = offerSalary({ ...args, division: 'WT' })
    const prs = offerSalary({ ...args, division: 'PRS' })
    const con = offerSalary({ ...args, division: 'CON' })
    expect(wt).toBeGreaterThan(prs)
    expect(prs).toBeGreaterThan(con)
  })

  it('aplica los tramos de edad del SPEC', () => {
    expect(ageMarketK(21)).toBe(1.1)
    expect(ageMarketK(26)).toBe(1.0)
    expect(ageMarketK(31)).toBe(0.85)
    expect(ageMarketK(35)).toBe(0.65)
  })

  it('el rol de líder paga más que el de gregario', () => {
    const base = { division: 'PRS' as const, pointsPercentile: 0.6, age: 27 }
    expect(offerSalary({ ...base, role: 'lider' })).toBeGreaterThan(
      offerSalary({ ...base, role: 'gregario' }),
    )
  })

  it('reproduce el valor exacto de la fórmula del SPEC', () => {
    // S_div(WT=900) * (0.4 + 1.6*0.5^1.4) * K_edad(1.0) * K_rol(libre 1.0)
    const expected = Math.round(900 * (0.4 + 1.6 * Math.pow(0.5, 1.4)))
    expect(offerSalary({ division: 'WT', pointsPercentile: 0.5, age: 26, role: 'libre' })).toBe(
      expected,
    )
  })

  it('la cláusula es el 25% del salario restante', () => {
    // 200/sem * 52 sem * 2 temporadas * 0.25 = 5200
    expect(releaseClause(200, 2)).toBe(5200)
  })

  it('la duración ofertada está en [1,3]', () => {
    const rng = seededRng('seasons')
    for (let i = 0; i < 100; i++) {
      const s = offerSeasons(0.5, rng)
      expect(s).toBeGreaterThanOrEqual(1)
      expect(s).toBeLessThanOrEqual(3)
    }
  })
})
