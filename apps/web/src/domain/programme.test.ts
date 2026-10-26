import { describe, expect, it } from 'vitest'
import { programmeTravel } from './programme'

/**
 * EL VIAJE EN EL PROGRAMA (E3, docs/visual.md §11.6; PR 15): `On your programme` dice cuándo sale el
 * corredor, cuándo vuelve y cuánto pagó, en días de la temporada; sin viaje, nada.
 */
describe('programmeTravel', () => {
  it('el agente libre: la ida, la vuelta y lo que pagó', () => {
    expect(programmeTravel({ travelOut: [51], travelBack: [53], travelPaid: 48 })).toBe(
      'Day 51 out, Day 53 back · paid 48',
    )
  })

  it('el corredor de un equipo no paga: sin cifra', () => {
    expect(programmeTravel({ travelOut: [51], travelBack: [53], travelPaid: null })).toBe(
      'Day 51 out, Day 53 back',
    )
  })

  it('dos días de cada lado, y la cifra con su separador', () => {
    expect(programmeTravel({ travelOut: [54, 55], travelBack: [61, 62], travelPaid: 1248 })).toBe(
      'Days 54 to 55 out, Days 61 to 62 back · paid 1,248',
    )
  })

  it('en casa no hay viaje', () => {
    expect(programmeTravel({ travelOut: [], travelBack: [], travelPaid: null })).toBeNull()
  })

  it('la ida que pisa otra carrera no sale: solo la vuelta', () => {
    expect(programmeTravel({ travelOut: [], travelBack: [25, 26], travelPaid: null })).toBe(
      'Days 25 to 26 back',
    )
  })
})
