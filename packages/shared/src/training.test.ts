import { describe, expect, it } from 'vitest'
import { SESSIONS, SESSION_CATALOG, defaultCoachPlan, sessionTss } from './training.js'

describe('shared: catálogo de entrenamiento (SPEC 5.1)', () => {
  it('define cada sesión con carga por intensidad', () => {
    for (const session of SESSIONS) {
      const info = SESSION_CATALOG[session]
      expect(info.tss.suave).toBeGreaterThanOrEqual(0)
      expect(info.tss.fuerte).toBeGreaterThanOrEqual(info.tss.suave)
    }
  })

  it('la carga de Puertos fuerte es 140 (SPEC 5.1)', () => {
    expect(sessionTss({ session: 'puertos', intensity: 'fuerte' })).toBe(140)
  })

  it('el plan por defecto es determinista y cíclico por semana', () => {
    expect(defaultCoachPlan(1)).toEqual(defaultCoachPlan(8))
    expect(defaultCoachPlan(3).session).toBe(defaultCoachPlan(10).session)
  })
})
