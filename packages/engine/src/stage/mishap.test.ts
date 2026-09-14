import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  breakWaits,
  canSwapBike,
  caravanPullS,
  carArrivalS,
  mishapLambda,
  mishapStopS,
} from './mishap.js'

describe('el dado del percance (R11.1)', () => {
  it('EL ADOQUÍN ES OTRO DEPORTE: veinte veces más pinchazos que el llano', () => {
    const llano = mishapLambda('llano', 0, 0.5)
    const paves = mishapLambda('paves', 0, 0.5)
    expect(paves / llano).toBeCloseTo(20, 6)
  })

  it('y la lluvia y la cola suman, pero sin cambiar el orden de magnitud', () => {
    const seco = mishapLambda('llano', 0, 0)
    expect(mishapLambda('llano', 1, 0)).toBeCloseTo(seco * 1.6, 9)
    expect(mishapLambda('llano', 0, 1)).toBeCloseTo(seco * 1.5, 9)
    expect(mishapLambda('llano', 0, 1)).toBeGreaterThan(mishapLambda('llano', 0, 0))
  })

  it('el orden de magnitud es el de la carretera: ~2,5 percances en una llana de 180', () => {
    const porEtapa = mishapLambda('llano', 0, 0.5) * 180 * 176
    expect(porEtapa).toBeGreaterThan(1.5)
    expect(porEtapa).toBeLessThan(4)
  })
})

describe('el coche (R11.2) y el ascensor (R11.3)', () => {
  const delante = { placement: 0.1, convoyRank: 1, hayCaravana: true }
  const atras = { placement: 0.9, convoyRank: 20, hayCaravana: true }

  it('TREINTA SEGUNDOS SISTEMÁTICOS entre el hombre del líder y el del equipo modesto', () => {
    const diferencia = carArrivalS(atras) - carArrivalS(delante)
    expect(diferencia).toBeGreaterThan(25)
    expect(diferencia).toBeLessThan(130)
  })

  it('y sin caravana el precio se triplica, que es pinchar en el puerto final', () => {
    const sinCoches = { ...delante, hayCaravana: false }
    expect(carArrivalS(sinCoches)).toBeCloseTo(carArrivalS(delante) * 3, 6)
  })

  it('una avería cuesta más que un pinchazo, y la rueda neutra encaja peor', () => {
    expect(mishapStopS('averia', delante)).toBeGreaterThan(mishapStopS('pinchazo', delante))
    const neutra = { ...delante, hayCaravana: false }
    expect(mishapStopS('pinchazo', neutra)).toBeGreaterThan(3 * carArrivalS(delante))
  })

  it('el ascensor devuelve tiempo mientras hay caravana, y se acaba a los seis km', () => {
    expect(caravanPullS(3, true)).toBe(36)
    expect(caravanPullS(20, true)).toBe(STAGE.mishap.caravanPullS * STAGE.mishap.caravanMaxKm)
    expect(caravanPullS(3, false)).toBe(0)
  })
})

describe('la bici (R11.4) y la espera de la fuga (R11.5)', () => {
  it('ceder la bici solo sirve si son de la misma talla', () => {
    expect(canSwapBike(180, 182)).toBe(true)
    expect(canSwapBike(180, 190)).toBe(false)
  })

  it('SE ESPERA POR ARITMÉTICA, NO POR CORTESÍA', () => {
    // Pelotón lejos y el hombre hacía su parte: se espera.
    expect(breakWaits(200, 0.25, 4, false)).toBe(true)
    // Pelotón encima: no se espera a nadie.
    expect(breakWaits(50, 0.25, 4, false)).toBe(false)
    // Iba de gorrón: tampoco.
    expect(breakWaits(200, 0.05, 4, false)).toBe(false)
  })

  it('…y NUNCA al que te va a ganar el sprint del grupo', () => {
    expect(breakWaits(600, 0.9, 4, true)).toBe(false)
  })
})
