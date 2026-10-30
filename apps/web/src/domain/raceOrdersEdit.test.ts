import { describe, expect, it } from 'vitest'
import { defaultOrder } from './raceOrdersDraft'
import {
  barStatus,
  copyPatch,
  copyTargets,
  kmPatch,
  ordersToSave,
  releaseAfterSave,
  selectedRaceKey,
  teamsPatch,
  triggerPatch,
} from './raceOrdersEdit'

/**
 * LO QUE HACEN LOS CONTROLES DE LA PANTALLA DE ÓRDENES (E3, PR 21i, tras su revisión), fuera de la página para
 * probarlo sin pulsar: lo que escribe cada forma del disparo, a qué etapas va una copia y qué copia, los equipos
 * con los que no se tira, qué borrador se suelta al guardar, qué dice la barra y qué carrera se ve.
 */

describe('el disparo', () => {
  it('cada forma escribe su disparo, y el kilómetro escribe también el triggerKm de siempre', () => {
    expect(triggerPatch('ninguno')).toEqual({ triggerOn: null, triggerKm: null })
    expect(triggerPatch('km')).toEqual({ triggerOn: { at: 'km', km: 0 }, triggerKm: 0 })
    expect(triggerPatch('climb')).toEqual({
      triggerOn: { at: 'climb', which: 'last', part: 'pie' },
      triggerKm: null,
    })
    expect(triggerPatch('gap')).toEqual({ triggerOn: { at: 'gap', overS: 120 }, triggerKm: null })
    expect(triggerPatch('weather')).toEqual({
      triggerOn: { at: 'weather', cond: 'lluvia' },
      triggerKm: null,
    })
    expect(triggerPatch('sector')).toEqual({
      triggerOn: { at: 'sector', index: 1 },
      triggerKm: null,
    })
  })

  it('el kilómetro escrito, en los dos sitios; vacío, el 0', () => {
    expect(kmPatch('40')).toEqual({ triggerOn: { at: 'km', km: 40 }, triggerKm: 40 })
    expect(kmPatch('')).toEqual({ triggerOn: { at: 'km', km: 0 }, triggerKm: 0 })
  })
})

describe('copiar a las demás', () => {
  const etapas = [
    { day: 1, kind: 'llana', timeTrial: false },
    { day: 2, kind: 'reina', timeTrial: false },
    { day: 3, kind: 'llana', timeTrial: false },
    { day: 4, kind: 'cri', timeTrial: true },
    { day: 5, kind: 'llana', timeTrial: false },
  ] as const

  it('a las del mismo tipo, todas menos ella y la crono', () => {
    expect(copyTargets(etapas, 3, 'iguales')).toEqual([1, 5])
  })

  it('al resto de la carrera, las que vienen detrás, sin la crono', () => {
    expect(copyTargets(etapas, 2, 'siguientes')).toEqual([3, 5])
  })

  it('lo que copia: la orden, con su objetivo y el disparo entero, para que pantalla y motor digan lo mismo', () => {
    const origen = {
      ...defaultOrder(1),
      role: 'gregario' as const,
      targetRiderId: 'm1',
      mentality: 'combativo' as const,
      effort: 'a_tope' as const,
      triggerOn: { at: 'climb' as const, which: 'last' as const, part: 'pie' as const },
      triggerKm: null,
      contestSprints: true,
      contestClimbs: false,
    }
    expect(copyPatch(origen)).toEqual({
      role: 'gregario',
      targetRiderId: 'm1',
      mentality: 'combativo',
      effort: 'a_tope',
      triggerOn: { at: 'climb', which: 'last', part: 'pie' },
      triggerKm: null,
      contestSprints: true,
      contestClimbs: false,
    })
  })
})

describe('los equipos con los que no tiro', () => {
  it('marcar añade el equipo; desmarcar lo quita y deja los demás', () => {
    expect(teamsPatch(['t-a'], 't-b', true)).toEqual({ refuseRelayTeams: ['t-a', 't-b'] })
    expect(teamsPatch(['t-a', 't-b'], 't-a', false)).toEqual({ refuseRelayTeams: ['t-b'] })
  })
})

describe('al guardar', () => {
  const enviado = { raceKey: 'a:s0', orders: {} }

  it('se mandan las órdenes de todas las etapas, también las que no se tocaron, como siempre (H-08)', () => {
    const orders = { 3: defaultOrder(3), 1: { ...defaultOrder(1), role: 'sprinter' as const } }
    expect(ordersToSave(orders).map((o) => [o.stageDay, o.role])).toEqual([
      [1, 'sprinter'],
      [3, 'libre'],
    ])
  })

  it('se suelta el borrador mandado, el de la carrera guardada', () => {
    expect(releaseAfterSave(enviado, enviado, 'a:s0')).toBeNull()
  })

  it('lo tocado mientras tanto se queda', () => {
    const otro = { raceKey: 'a:s0', orders: { 1: defaultOrder(1) } }
    expect(releaseAfterSave(otro, enviado, 'a:s0')).toBe(otro)
  })

  it('el borrador de otra carrera no se suelta nunca al guardar esta', () => {
    expect(releaseAfterSave(enviado, enviado, 'b:s0')).toBe(enviado)
  })
})

describe('lo que dice la barra', () => {
  it('el estado del guardado, el de la carrera que se ve', () => {
    expect(barStatus({ raceKey: 'a:s0', status: 'saving' }, 'a:s0', 1)).toBe('saving')
    expect(barStatus({ raceKey: 'a:s0', status: 'failed' }, 'a:s0', 1)).toBe('failed')
    expect(barStatus({ raceKey: 'a:s0', status: 'saved' }, 'a:s0', 0)).toBe('saved')
  })

  it('el guardado de otra carrera no sale en esta: ni su Saving, ni su fallo con Retry', () => {
    expect(barStatus({ raceKey: 'a:s0', status: 'saving' }, 'b:s0', 0)).toBe('idle')
    expect(barStatus({ raceKey: 'a:s0', status: 'failed' }, 'b:s0', 0)).toBe('idle')
  })

  it('guardado, si quedan cambios hechos mientras guardaba, la barra los cuenta y no se va', () => {
    expect(barStatus({ raceKey: 'a:s0', status: 'saved' }, 'a:s0', 1)).toBe('idle')
  })
})

describe('la carrera que se ve', () => {
  const races = [
    { raceKey: 'a:s0', ongoing: false },
    { raceKey: 'b:s0', ongoing: false },
  ]

  it('la elegida; si no, la del borrador; si no, la de por defecto', () => {
    expect(selectedRaceKey({ chosen: 'b:s0', draftRace: 'a:s0', races, requested: null })).toBe(
      'b:s0',
    )
    expect(selectedRaceKey({ chosen: null, draftRace: 'b:s0', races, requested: null })).toBe(
      'b:s0',
    )
    expect(selectedRaceKey({ chosen: null, draftRace: null, races, requested: null })).toBe('a:s0')
  })

  it('con algo tocado, aunque la carrera empiece y la de por defecto pase a otra, se queda en la suya', () => {
    const empezada = [{ raceKey: 'a:s0', ongoing: true }, races[1]!]
    expect(
      selectedRaceKey({ chosen: null, draftRace: 'a:s0', races: empezada, requested: null }),
    ).toBe('a:s0')
  })
})
