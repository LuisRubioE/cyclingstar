import { describe, expect, it } from 'vitest'
import type { StageOrder } from '../api/raceOrders'
import {
  type OrdersDraft,
  buildServerOrders,
  changedStages,
  defaultOrder,
  defaultRaceKey,
  resolveOrders,
  withOrderPatch,
} from './raceOrdersDraft'

const stages = [{ day: 1 }, { day: 2 }, { day: 3 }]
const TOUR = 'tour:s1'
const GIRO = 'giro:s1'

describe('web: borrador de órdenes de etapa', () => {
  it('completa con órdenes por defecto las etapas sin orden guardada', () => {
    const saved: StageOrder[] = [{ ...defaultOrder(2), role: 'lider' }]
    const server = buildServerOrders(stages, saved)
    expect(Object.keys(server)).toEqual(['1', '2', '3'])
    expect(server[2]?.role).toBe('lider')
    expect(server[1]?.role).toBe('libre')
  })

  it('un refetch en segundo plano NO borra las ediciones sin guardar', () => {
    const server = buildServerOrders(stages, [])
    const draft = withOrderPatch(null, TOUR, server, 2, { role: 'cazaetapas', effort: 'a_tope' })

    // El servidor responde otra vez (mismos datos u otros): el borrador sigue mandando.
    const refetched = buildServerOrders(stages, [{ ...defaultOrder(2), role: 'gregario' }])
    const visible = resolveOrders(refetched, draft, TOUR)

    expect(visible[2]?.role).toBe('cazaetapas')
    expect(visible[2]?.effort).toBe('a_tope')
    // Las etapas que no se han tocado sí reflejan lo último del servidor.
    expect(visible[1]).toEqual(refetched[1])
  })

  it('el borrador de OTRA carrera no se muestra (ni se guardaría) en la carrera seleccionada', () => {
    const server = buildServerOrders(stages, [])
    const draftDelTour = withOrderPatch(null, TOUR, server, 1, { role: 'lider' })

    // El jugador cambia a otra carrera antes de guardar: se ven las órdenes del Giro, no las suyas.
    const visible = resolveOrders(server, draftDelTour, GIRO)
    expect(visible[1]?.role).toBe('libre')
    expect(Object.values(visible)).toEqual(Object.values(server))
  })

  it('editar tras cambiar de carrera empieza un borrador nuevo para la carrera actual', () => {
    const server = buildServerOrders(stages, [])
    const draftDelTour: OrdersDraft = withOrderPatch(null, TOUR, server, 1, { role: 'lider' })

    const draftDelGiro = withOrderPatch(draftDelTour, GIRO, server, 3, { role: 'sprinter' })

    expect(draftDelGiro.raceKey).toBe(GIRO)
    expect(draftDelGiro.orders[1]).toBeUndefined() // no arrastra la edición del Tour
    expect(resolveOrders(server, draftDelGiro, GIRO)[3]?.role).toBe('sprinter')
    expect(resolveOrders(server, draftDelGiro, GIRO)[1]?.role).toBe('libre')
  })

  it('sin carrera seleccionada se muestran las órdenes del servidor tal cual', () => {
    const server = buildServerOrders(stages, [])
    const draft = withOrderPatch(null, TOUR, server, 1, { role: 'lider' })
    expect(resolveOrders(server, draft, null)).toEqual(server)
  })
})

describe('el cazaetapas no sale reservón', () => {
  it('al elegir cazaetapas con la mentalidad por defecto, se propone combativo', () => {
    const d = withOrderPatch(null, 'r:s0', {}, 1, { role: 'cazaetapas' })
    expect(d.orders[1]!.role).toBe('cazaetapas')
    expect(d.orders[1]!.mentality).toBe('combativo')
  })

  it('si el jugador ya había elegido otra mentalidad, se respeta', () => {
    const d1 = withOrderPatch(null, 'r:s0', {}, 1, { mentality: 'supercombativo' })
    const d2 = withOrderPatch(d1, 'r:s0', {}, 1, { role: 'cazaetapas' })
    expect(d2.orders[1]!.mentality).toBe('supercombativo')
  })

  it('y después puede volver a reservón a mano', () => {
    const d1 = withOrderPatch(null, 'r:s0', {}, 1, { role: 'cazaetapas' })
    const d2 = withOrderPatch(d1, 'r:s0', {}, 1, { mentality: 'reservon' })
    expect(d2.orders[1]!.mentality).toBe('reservon')
    expect(d2.orders[1]!.role).toBe('cazaetapas')
  })
})

/**
 * LO QUE CAMBIA AL GUARDAR (E3, docs/visual.md §4.3 y §4.9; PR 21i): las etapas cuya orden en pantalla no es la
 * guardada, que cuenta la barra de guardar. Tocar y volver a lo guardado no es un cambio: las cuatro palancas
 * del 17a sin preferencia valen lo mismo sin llegar, a null o, los equipos, vacías; y los equipos y el disparo,
 * sin mirar su orden.
 */
describe('changedStages (PR 21i)', () => {
  const server = buildServerOrders(stages, [])

  it('sin tocar nada, ninguna', () => {
    expect(changedStages(server, resolveOrders(server, null, TOUR))).toEqual([])
  })

  it('las que difieren de lo guardado, por su día', () => {
    const d1 = withOrderPatch(null, TOUR, server, 3, { role: 'gregario' })
    const d2 = withOrderPatch(d1, TOUR, server, 1, { effort: 'a_tope' })
    expect(changedStages(server, resolveOrders(server, d2, TOUR))).toEqual([1, 3])
  })

  it('tocar y volver a lo guardado no es un cambio, con las palancas sin preferencia a null o vacías', () => {
    const ida = withOrderPatch(null, TOUR, server, 2, { role: 'gregario' })
    const vuelta = withOrderPatch(ida, TOUR, server, 2, {
      role: 'libre',
      triggerOn: null,
      triggerKm: null,
      dayGoal: null,
      chasePolicy: null,
      refuseRelayTeams: [],
    })
    expect(changedStages(server, resolveOrders(server, vuelta, TOUR))).toEqual([])
  })

  it('los equipos vetados y el disparo, sin mirar su orden', () => {
    const guardada = buildServerOrders(stages, [
      {
        ...defaultOrder(1),
        refuseRelayTeams: ['t-a', 't-b'],
        triggerOn: { at: 'climb', which: 'last', part: 'pie' },
      },
    ])
    const d = withOrderPatch(null, TOUR, guardada, 1, {
      refuseRelayTeams: ['t-b', 't-a'],
      triggerOn: { part: 'pie', which: 'last', at: 'climb' },
    })
    expect(changedStages(guardada, resolveOrders(guardada, d, TOUR))).toEqual([])
    const otra = withOrderPatch(d, TOUR, guardada, 1, { refuseRelayTeams: ['t-a'] })
    expect(changedStages(guardada, resolveOrders(guardada, otra, TOUR))).toEqual([1])
  })
})

/**
 * LA CARRERA QUE SE ABRE (E3, PR 21i): la del enlace (`?race=`), si está; si no, la más próxima que aún no ha
 * empezado; y si todas han empezado, la primera. Se calcula al pintar y no en un efecto, así que la hoja de
 * la carrera se pide desde el primer pintado.
 */
describe('defaultRaceKey (PR 21i)', () => {
  const races = [
    { raceKey: 'a:s0', ongoing: true },
    { raceKey: 'b:s0', ongoing: false },
    { raceKey: 'c:s0', ongoing: false },
  ]

  it('la del enlace, si está entre las mías', () => {
    expect(defaultRaceKey(races, 'c:s0')).toBe('c:s0')
  })

  it('si no, la más próxima que aún no ha empezado', () => {
    expect(defaultRaceKey(races, null)).toBe('b:s0')
    expect(defaultRaceKey(races, 'z:s0')).toBe('b:s0')
  })

  it('si todas han empezado, la primera; y sin carreras, ninguna', () => {
    expect(defaultRaceKey([{ raceKey: 'a:s0', ongoing: true }], null)).toBe('a:s0')
    expect(defaultRaceKey([], null)).toBeNull()
  })
})
