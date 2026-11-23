import { describe, expect, it } from 'vitest'
import type { TrainingMode } from './contracts.js'
import { type CoachContext, type TrainingChoice, coachPlan } from './training.js'
import { type TrainingDayContext, resolveTrainingDay } from './trainingDay.js'

/**
 * `manual` COMO `mixto` MIENTRAS DURA LA AUSENCIA (docs/cuenta.md §14.2; 14-c; PR 13 de E4): el mismo
 * corredor en `manual`, sin orden, da `descanso_activo` sin ausencia y la sesión del entrenador (o el plan
 * de equipo) con ella; en `mixto` y `entrenador`, lo mismo con y sin ausencia. La orden del jugador sigue
 * mandando: entrar y escribirla vale durante la ausencia.
 */

const DIA = 5 * 364 + 40
const COACH: CoachContext = {
  gameDay: DIA,
  seasonDay: 40,
  archetype: 'fondo',
  tsb: 0,
  health: 'sano',
  strainDays: 0,
  daysToNextRace: null,
  nextRaceIsGoal: false,
  nextRaceStages: 1,
  teamGoalInDays: null,
  daysSinceBlockEnd: null,
  lastBlockDays: 0,
  hardLast7: 0,
  yesterday: null,
}
const EQUIPO: TrainingChoice = { session: 'fondo', intensity: 'suave' }
const ORDEN: TrainingChoice = { session: 'umbral', intensity: 'fuerte' }

const ctx = (
  mode: TrainingMode,
  ownerAway: boolean,
  over: Partial<TrainingDayContext> = {},
): TrainingDayContext => ({
  gameDay: DIA,
  mode,
  archetype: 'fondo',
  race: null,
  travel: null,
  order: null,
  plan: null,
  teamPlan: null,
  coach: COACH,
  ownerAway,
  ...over,
})

describe('shared: el día sin orden con el dueño ausente (§14.2)', () => {
  it('manual sin ausencia: descanso activo', () => {
    expect(resolveTrainingDay(ctx('manual', false))).toMatchObject({
      session: 'descanso_activo',
      source: 'descanso',
    })
  })

  it('manual con ausencia: la sesión del entrenador, no el descanso', () => {
    const dia = resolveTrainingDay(ctx('manual', true))
    expect(dia.source).toBe('entrenador')
    expect(dia.session).toBe(coachPlan(COACH).session)
    expect(dia).toEqual(resolveTrainingDay(ctx('mixto', false)))
  })

  it('manual con ausencia y plan de equipo: el plan de equipo, como en mixto', () => {
    expect(resolveTrainingDay(ctx('manual', true, { teamPlan: EQUIPO }))).toMatchObject({
      ...EQUIPO,
      source: 'equipo',
    })
    expect(resolveTrainingDay(ctx('manual', false, { teamPlan: EQUIPO })).source).toBe('descanso')
  })

  it('la orden del jugador manda también ausente', () => {
    expect(resolveTrainingDay(ctx('manual', true, { order: ORDEN }))).toMatchObject({
      ...ORDEN,
      source: 'orden',
    })
  })

  it('mixto y entrenador: lo mismo con y sin ausencia', () => {
    for (const mode of ['mixto', 'entrenador'] as const)
      for (const over of [{}, { teamPlan: EQUIPO }, { order: ORDEN }])
        expect(resolveTrainingDay(ctx(mode, true, over))).toEqual(
          resolveTrainingDay(ctx(mode, false, over)),
        )
  })
})
