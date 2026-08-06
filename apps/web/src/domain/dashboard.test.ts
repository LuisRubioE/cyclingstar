import { describe, expect, it } from 'vitest'
import { type DashboardInputs, buildDashboard } from './dashboard'

/** Estado tranquilo: nada que decidir hoy. */
const calm: DashboardInputs = {
  nextRace: null,
  trainingPlannedDays: 7,
  offers: 0,
  freeAgent: false,
  affordableEntries: 0,
  bookedRaces: 2,
}

describe('buildDashboard', () => {
  it('no muestra nada si no hay nada accionable', () => {
    expect(buildDashboard(calm)).toEqual([])
  })

  it('no pide órdenes si la carrera ya las tiene', () => {
    const actions = buildDashboard({
      ...calm,
      nextRace: {
        raceKey: 'r:s0',
        raceName: 'Volta',
        daysUntil: 1,
        ongoing: false,
        hasOrders: true,
      },
    })
    expect(actions).toEqual([])
  })

  it('ordena por urgencia, no por sección: lo que caduca con el próximo tick va primero', () => {
    const actions = buildDashboard({
      ...calm,
      nextRace: {
        raceKey: 'r:s0',
        raceName: 'Volta',
        daysUntil: 0,
        ongoing: false,
        hasOrders: false,
      },
      trainingPlannedDays: 2,
      offers: 2,
    })
    expect(actions.map((a) => a.id)).toEqual(['race-orders', 'training', 'offers'])
    expect(actions[0]!.dueInDays).toBe(0)
    expect(actions[0]!.tone).toBe('urgent')
  })

  it('una carrera lejana cede el paso a la cola de entrenamiento que se agota', () => {
    const actions = buildDashboard({
      ...calm,
      nextRace: {
        raceKey: 'r:s0',
        raceName: 'Volta',
        daysUntil: 6,
        ongoing: false,
        hasOrders: false,
      },
      trainingPlannedDays: 0,
    })
    expect(actions.map((a) => a.id)).toEqual(['training', 'race-orders'])
  })

  it('las ofertas, sin fecha límite, van detrás de todo lo que sí caduca', () => {
    const actions = buildDashboard({ ...calm, offers: 1, trainingPlannedDays: 1 })
    expect(actions.map((a) => a.id)).toEqual(['training', 'offers'])
    expect(actions[1]!.dueInDays).toBeNull()
  })

  it('solo propone inscribirse si soy agente libre y no tengo ninguna carrera', () => {
    const base = { ...calm, freeAgent: true, affordableEntries: 3, bookedRaces: 0 }
    expect(buildDashboard(base).map((a) => a.id)).toEqual(['entries'])
    expect(buildDashboard({ ...base, bookedRaces: 1 })).toEqual([])
    expect(buildDashboard({ ...base, freeAgent: false })).toEqual([])
    expect(buildDashboard({ ...base, affordableEntries: 0 })).toEqual([])
  })

  it('la carrera en curso es urgente aunque el día de salida ya haya pasado', () => {
    const actions = buildDashboard({
      ...calm,
      nextRace: {
        raceKey: 'r:s0',
        raceName: 'Volta',
        daysUntil: -3,
        ongoing: true,
        hasOrders: false,
      },
    })
    expect(actions[0]!.dueInDays).toBe(0)
    expect(actions[0]!.title).toContain('right now')
  })
})
