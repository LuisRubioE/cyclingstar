import { describe, expect, it } from 'vitest'
import { type DashboardInputs, buildDashboard } from './dashboard'

/** Estado tranquilo: nada que decidir hoy (el día 50, en `Mixed` y sin plan vivo). */
const calm: DashboardInputs = {
  currentDay: 50,
  nextRace: null,
  mode: 'mixto',
  plan: null,
  tomorrowTravel: null,
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

  it('la carrera, por su nombre y sin artículo (§4.10; la revisión del 21g): nunca `the Race Var`', () => {
    const titulo = (daysUntil: number, ongoing: boolean) =>
      buildDashboard({
        ...calm,
        nextRace: {
          raceKey: 'race-var:s0',
          raceName: 'Race Var',
          daysUntil,
          ongoing,
          hasOrders: false,
        },
      })[0]!.title
    expect(titulo(-1, true)).toBe('You are racing Race Var right now')
    expect(titulo(3, false)).toBe('You race Race Var in 3 days')
    expect(titulo(1, false)).toBe('You race tomorrow: Race Var')
    expect(titulo(0, false)).toBe('You race today: Race Var')
  })

  it('el viaje de mañana: que no se entrena, con sus días de ida y de vuelta (§11.7)', () => {
    const [a] = buildDashboard({
      ...calm,
      tomorrowTravel: { raceName: 'Race Var', out: 1, back: 1 },
    })
    expect(a).toMatchObject({
      id: 'travel',
      title: 'You travel to Race Var tomorrow',
      detail: "You don't train on travel days: 1 out, 1 back.",
      cta: 'See your plan',
      to: '/me/training',
      dueInDays: 1,
    })
  })

  it('el plan vivo que acaba en siete días o menos lo dice, con su último día (PLAN_END_WARN_DAYS)', () => {
    const [a] = buildDashboard({ ...calm, plan: { endDay: 57 } })
    expect(a).toMatchObject({
      id: 'plan-end',
      title: 'Your plan ends on Day 57',
      detail: 'After that, your coach picks the sessions.',
      cta: 'Plan the next weeks',
      to: '/me/training',
      dueInDays: 7,
    })
    expect(buildDashboard({ ...calm, plan: { endDay: 58 } })).toEqual([])
  })

  it('sin plan vivo y sin órdenes en los próximos dos días, la cola está vacía', () => {
    const [a] = buildDashboard({ ...calm, trainingPlannedDays: 0 })
    expect(a).toMatchObject({
      id: 'training',
      title: 'Your training queue is empty',
      detail: 'Until you plan it, your coach picks the sessions.',
      cta: 'Plan the week',
      to: '/me/training',
    })
  })

  it('quien tiene sus bloques ya no ve la cola vacía (O-22)', () => {
    expect(buildDashboard({ ...calm, trainingPlannedDays: 0, plan: { endDay: 78 } })).toEqual([])
  })

  it('en Coach decides no se pide planificar: ni la cola ni el final del plan', () => {
    const coach = { ...calm, mode: 'entrenador' as const, trainingPlannedDays: 0 }
    expect(buildDashboard(coach)).toEqual([])
    expect(buildDashboard({ ...coach, plan: { endDay: 52 } })).toEqual([])
    // el viaje sí: no entrenar mañana vale en cualquier modo
    expect(
      buildDashboard({ ...coach, tomorrowTravel: { raceName: 'Race Var', out: 2, back: 2 } }).map(
        (a) => a.id,
      ),
    ).toEqual(['travel'])
  })
})
