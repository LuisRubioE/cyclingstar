import { describe, expect, it } from 'vitest'
import {
  GROUP_TRAINING_BONUS_CAP,
  SESSIONS,
  SESSION_CATALOG,
  defaultCoachPlan,
  groupTrainingMultiplier,
  sessionTss,
} from './training.js'

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

  it('el entrenamiento en grupo bonifica las sesiones de grupo y crece con los compañeros', () => {
    // Sesión de grupo (fondo): sin compañeros = 1; sube con cada compañero hasta el tope.
    expect(groupTrainingMultiplier('fondo', 0)).toBe(1)
    expect(groupTrainingMultiplier('fondo', 1)).toBeGreaterThan(1)
    expect(groupTrainingMultiplier('fondo', 3)).toBeGreaterThan(groupTrainingMultiplier('fondo', 1))
    expect(groupTrainingMultiplier('fondo', 20)).toBeCloseTo(1 + GROUP_TRAINING_BONUS_CAP)
    // Sesión individual (sprint, crono, gimnasio): nunca bonifica, aunque haya compañeros.
    expect(groupTrainingMultiplier('sprint', 5)).toBe(1)
    expect(groupTrainingMultiplier('crono', 5)).toBe(1)
    expect(groupTrainingMultiplier('gimnasio', 5)).toBe(1)
    // El descanso tampoco.
    expect(groupTrainingMultiplier('descanso_total', 5)).toBe(1)
  })
})
