import { describe, expect, it } from 'vitest'
import { outboundTravelDays } from './riderSchedule.js'

/**
 * El viaje de IDA (#30). El modelo de viajes siempre cobró el desplazamiento en dinero Y en días,
 * pero los días solo se aplicaban a la VUELTA: `travel_until_day` se escribe al terminar la carrera.
 * La víspera de correr en otro continente el corredor entrenaba con normalidad, y el planificador se
 * lo enseñaba como un día de trabajo más. Aquí se sella el cálculo de los días de ida, que es puro.
 */
describe('viaje de ida: qué días se pierden antes de la salida', () => {
  it('en casa no se viaja: se duerme en casa y se sale por la mañana', () => {
    expect(outboundTravelDays(100, 'ES', 'ES')).toEqual([])
    // Y sin distinguir mayúsculas, que es como llegan la residencia y el país de la carrera.
    expect(outboundTravelDays(100, 'es', 'ES')).toEqual([])
  })

  it('dentro del continente cuesta el día anterior', () => {
    expect(outboundTravelDays(100, 'ES', 'FR')).toEqual([99])
  })

  it('intercontinental cuesta los DOS días anteriores', () => {
    expect(outboundTravelDays(100, 'ES', 'CO')).toEqual([98, 99])
  })

  it('sin residencia conocida se asume lo peor (intercontinental), nunca gratis', () => {
    expect(outboundTravelDays(100, null, 'CO')).toEqual([98, 99])
  })

  it('los días son los ANTERIORES a la salida: el día de la carrera nunca se cuenta como viaje', () => {
    for (const to of ['ES', 'FR', 'CO']) {
      expect(outboundTravelDays(100, 'ES', to)).not.toContain(100)
    }
  })
})
