import { ATTRIBUTES, type Attribute, seededRng } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { kAge, type RiderDayContext, type RiderDayState, simulateRiderDay } from './progression.js'

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

describe('progression: el reloj de edad va por clase de atributo (v54)', () => {
  it('a los 20 el esprint sube más deprisa que el fondo', () => {
    // motor_rapido 1,25 contra motor_lento 1,15: la punta se hace joven y el fondo se construye.
    expect(kAge('SPR', 20, 32)).toBe(1.25)
    expect(kAge('RES', 20, 32)).toBe(1.15)
    expect(kAge('TAC', 20, 32)).toBe(1.0)
  })

  it('a los 29 el esprint está estancado y el oficio sigue aprendiendo', () => {
    // La frase del dueño, en números: «a partir de los 27 se estancan» contra «Tactics debería
    // mejorar siempre».
    expect(kAge('SPR', 29, 32)).toBe(0.15)
    expect(kAge('RES', 29, 32)).toBe(0.4)
    expect(kAge('TAC', 29, 32)).toBe(0.9)
  })

  it('pasado el declive queda un hilo, que no es cero: «estancarse» no es «morirse»', () => {
    expect(kAge('SPR', 40, 32)).toBe(0.1)
    expect(kAge('TAC', 40, 32)).toBe(0.6)
  })

  it('la frontera de los tramos es el declive de CADA corredor, no una edad fija', () => {
    // Mismo corredor, misma edad, distinto `declineAge`: uno sigue en el tramo largo y el otro ya no.
    expect(kAge('MON', 33, 35)).toBe(0.15)
    expect(kAge('MON', 33, 32)).toBe(0.1)
  })
})

describe('progression: el declive mira la semana, no el día (v54)', () => {
  /** Un veterano por encima de su declive, que es cuando el declive existe. */
  function veterano(trainedLast7?: ReadonlySet<Attribute>): RiderDayContext {
    const ctx = context(0, 'declive')
    return {
      ...ctx,
      age: 36,
      declineAge: 32,
      // Una sesión que NO toca MON, para que lo único que le pase sea decaer.
      choice: { session: 'sprint', intensity: 'normal' },
      ...(trainedLast7 !== undefined ? { trainedLast7 } : {}),
    }
  }

  it('un atributo movido hace cinco días decae amortiguado', () => {
    const state = baseState()
    const sinTocar = simulateRiderDay(state, veterano())
    const tocado = simulateRiderDay(state, veterano(new Set<Attribute>(['MON'])))
    const perdidoSinTocar = state.attributes.MON - sinTocar.state.attributes.MON
    const perdidoTocado = state.attributes.MON - tocado.state.attributes.MON
    expect(perdidoSinTocar).toBeGreaterThan(0)
    // `trainedDecayFactor` es 0,4: pierde un 60 % menos.
    expect(perdidoTocado).toBeCloseTo(perdidoSinTocar * 0.4, 6)
  })

  it('la punta se va antes que el fondo', () => {
    const state = baseState()
    const out = simulateRiderDay(state, {
      ...veterano(),
      choice: { session: 'descanso_total', intensity: 'normal' },
    })
    const perdidoSPR = state.attributes.SPR - out.state.attributes.SPR
    const perdidoRES = state.attributes.RES - out.state.attributes.RES
    const perdidoPAV = state.attributes.PAV - out.state.attributes.PAV
    // motor_rapido 1,25 · motor_lento 1,0 · oficio 0,25.
    expect(perdidoSPR).toBeCloseTo(perdidoRES * 1.25, 6)
    expect(perdidoPAV).toBeCloseTo(perdidoRES * 0.25, 6)
  })

  it('TAC no decae nunca, tenga la edad que tenga', () => {
    const state = baseState()
    const out = simulateRiderDay(state, {
      ...veterano(),
      age: 45,
      choice: { session: 'descanso_total', intensity: 'normal' },
    })
    expect(out.state.attributes.TAC).toBe(state.attributes.TAC)
  })
})
