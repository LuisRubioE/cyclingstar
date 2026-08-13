import { describe, expect, it } from 'vitest'
import type { OrdersResponse } from '../api/training'
import { adoptTeamSuggestions, applyEdits, buildServerPlan, withEdit } from './trainingPlan'

const response = (over: Partial<OrdersResponse> = {}): OrdersResponse => ({
  currentDay: 10,
  horizonDays: 28,
  orders: [],
  raceDays: [],
  travelDays: [],
  ...over,
})

describe('web: plan semanal de entrenamiento', () => {
  it('propone los próximos días y salta los de carrera', () => {
    const plan = buildServerPlan(response({ raceDays: [12, 13] }), 5)
    expect(plan.map((d) => d.gameDay)).toEqual([11, 14, 15])
  })

  it('salta también los días de VIAJE DE IDA: ese día se vuela, no se entrena', () => {
    const plan = buildServerPlan(
      response({
        raceDays: [14],
        travelDays: [
          { gameDay: 12, raceKey: 'race-x:s0', raceName: 'Race X', country: 'co' },
          { gameDay: 13, raceKey: 'race-x:s0', raceName: 'Race X', country: 'co' },
        ],
      }),
      5,
    )
    expect(plan.map((d) => d.gameDay)).toEqual([11, 15])
  })

  it('respeta las órdenes ya guardadas y rellena el resto con el plan del entrenador', () => {
    const plan = buildServerPlan(
      response({ orders: [{ gameDay: 12, session: 'puertos', intensity: 'fuerte' }] }),
      3,
    )
    expect(plan.find((d) => d.gameDay === 12)).toEqual({
      gameDay: 12,
      session: 'puertos',
      intensity: 'fuerte',
    })
    expect(plan).toHaveLength(3)
  })

  it('un refetch en segundo plano NO borra lo que el jugador está editando', () => {
    const edits = withEdit({}, 12, { session: 'sprint', intensity: 'fuerte' })

    // Llega una respuesta nueva del servidor (el refetch): la base cambia, la edición no.
    const refetched = buildServerPlan(
      response({ orders: [{ gameDay: 12, session: 'fondo', intensity: 'suave' }] }),
      3,
    )
    const visible = applyEdits(refetched, edits)

    expect(visible.find((d) => d.gameDay === 12)).toEqual({
      gameDay: 12,
      session: 'sprint',
      intensity: 'fuerte',
    })
  })

  it('editar un día no toca los demás', () => {
    const plan = buildServerPlan(response(), 3)
    const edits = withEdit(withEdit({}, 11, { session: 'crono' }), 13, { intensity: 'suave' })
    const visible = applyEdits(plan, edits)
    expect(visible[0]?.session).toBe('crono')
    expect(visible[1]).toEqual(plan[1])
    expect(visible[2]?.intensity).toBe('suave')
  })

  it('adoptar el plan del equipo solo cambia los días que el equipo sugiere', () => {
    const plan = buildServerPlan(response(), 3)
    const suggestions = new Map([
      [12, { gameDay: 12, session: 'umbral' as const, intensity: 'normal' as const }],
    ])
    const edits = adoptTeamSuggestions(plan, {}, suggestions)
    expect(Object.keys(edits)).toEqual(['12'])
    expect(applyEdits(plan, edits).find((d) => d.gameDay === 12)?.session).toBe('umbral')
  })
})
