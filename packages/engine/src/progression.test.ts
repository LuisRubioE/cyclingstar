import { ATTRIBUTES, type Attribute, seededRng } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { type RiderDayContext, type RiderDayState, simulateRiderDay } from './progression.js'

function baseState(): RiderDayState {
  const attributes = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) attributes[attr] = 40
  attributes.REC = 55
  return { attributes, ctl: 45, atl: 45, morale: 50, health: 'sano', healthUntilDay: null }
}

function context(gameDay: number, seed: string): RiderDayContext {
  const ceilings = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) ceilings[attr] = 80
  return {
    gameDay,
    age: 24,
    ceilings,
    talent: 60,
    fragility: 1,
    peakAge: 28,
    declineAge: 32,
    choice: { session: 'fondo', intensity: 'normal' },
    kInst: 1,
    kStaff: 1,
    rng: seededRng(seed),
  }
}

describe('progression: simulateRiderDay (SPEC 5.2, 5.5, 4)', () => {
  it('es determinista dado el RNG', () => {
    const a = simulateRiderDay(baseState(), context(1, 'x'))
    const b = simulateRiderDay(baseState(), context(1, 'x'))
    expect(a).toEqual(b)
  })

  it('a lo largo de 14 días de Fondo, RES sube hacia el techo y la forma evoluciona', () => {
    let state = baseState()
    const startRes = state.attributes.RES
    let lastTsb = 0
    for (let day = 1; day <= 14; day++) {
      const result = simulateRiderDay(state, context(day, `seed-${day}`))
      state = result.state
      lastTsb = result.log.tsb
      // Invariante: ningún atributo supera su techo.
      for (const attr of ATTRIBUTES) expect(state.attributes[attr]).toBeLessThanOrEqual(80)
    }
    // Fondo entrena RES: sube de forma explicable.
    expect(state.attributes.RES).toBeGreaterThan(startRes)
    // La carga sostenida empuja ATL por encima de CTL (fatiga acumulada): TSB negativo.
    expect(state.ctl).toBeGreaterThan(45)
    expect(lastTsb).toBeLessThan(0)
  })

  it('un corredor enfermo no entrena (TSS 0) hasta recuperarse', () => {
    const sick: RiderDayState = { ...baseState(), health: 'enfermo', healthUntilDay: 5 }
    const result = simulateRiderDay(sick, context(3, 'y'))
    expect(result.log.tss).toBe(0)
    expect(result.log.activity).toBe('enfermo')
  })
})
