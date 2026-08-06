import { describe, expect, it } from 'vitest'
import type { StageOrder } from '../api/raceOrders'
import {
  type OrdersDraft,
  buildServerOrders,
  defaultOrder,
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
