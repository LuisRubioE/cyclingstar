import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  believedGap,
  bloodFactor,
  boardRound,
  boardSd,
  dirQualityOf,
  infoLagKm,
  readState,
  signalSd,
} from './director.js'

/**
 * DIRECTORES BOT FALIBLES (docs/tactica.md R24) y OLER LA SANGRE (R13.1).
 *
 * Lo que se prueba aquí es que **la física no se toca**: lo único que cambia es el NÚMERO sobre el
 * que se decide. Mismos vatios, distinta pizarra.
 */
describe('engine: el número de la pizarra (R24.2)', () => {
  it('una pizarra no tiene decimales, y la mala redondea más grueso', () => {
    expect(boardRound(0.9)).toBe(5)
    expect(boardRound(0.7)).toBe(10)
    expect(boardRound(0.3)).toBe(15)
  })

  it('el que dirige mal ve el dato más viejo y se equivoca más', () => {
    expect(infoLagKm(1)).toBeLessThan(infoLagKm(0))
    expect(boardSd(1)).toBeLessThan(boardSd(0))
  })

  it('SIN ERROR, el número creído es el hueco redondeado y nada más', () => {
    // Con ruido 0 la pizarra sigue redondeando: esa parte no es un error, es una pizarra.
    expect(believedGap(97, 0.9, 0)).toBe(95)
    expect(believedGap(97, 0.3, 0)).toBe(90)
  })

  it('y nunca dice que la fuga va por detrás', () => {
    expect(believedGap(3, 0.3, -5)).toBe(0)
  })

  it('la calidad de dirección es determinista por equipo y carrera', () => {
    expect(dirQualityOf('t-1', 'semilla')).toBe(dirQualityOf('t-1', 'semilla'))
    expect(dirQualityOf('t-1', 'semilla')).not.toBe(dirQualityOf('t-2', 'semilla'))
    for (const t of ['a', 'b', 'c', 'd', 'e']) {
      const q = dirQualityOf(t, 'x')
      expect(q).toBeGreaterThanOrEqual(0)
      expect(q).toBeLessThanOrEqual(1)
    }
  })
})

describe('engine: leer el estado del rival (R24.5) y oler la sangre (R13.1)', () => {
  it('el que lee la carrera se equivoca la mitad que el que no', () => {
    expect(signalSd(90)).toBeLessThan(signalSd(40) / 2 + 0.01)
    expect(signalSd(90)).toBeGreaterThan(0)
  })

  it('sin ruido se ve la verdad, y la lectura nunca se sale de [0,1]', () => {
    expect(readState(0.3, 70, 0)).toBeCloseTo(0.3, 6)
    expect(readState(0.02, 40, -9)).toBe(0)
    expect(readState(0.98, 40, 9)).toBe(1)
  })

  it('EL DÍA QUE EL MAILLOT CEDE, SUS RIVALES ATACAN MÁS — y «ceder» es CONTRA UNO MISMO', () => {
    // Es el contrario nº 9. Hasta la v80 la comparación era ABSOLUTA contra un listón de 0,45 que
    // estaba por debajo del percentil 5 de su propia distribución, así que la regla no la disparaba
    // el líder sino el error de lectura. Ahora la referencia es el depósito del que mira.
    const m = STAGE.director.bloodMargin
    const g = STAGE.director.bloodGain
    const span = STAGE.director.bloodSpan

    // Va MEJOR que yo: no hay sangre, por vacío que se le lea en términos absolutos. Es justo el
    // caso que el listón absoluto no sabía distinguir: en una etapa que deja a todos a 0,30, que el
    // líder esté a 0,30 no es sangre, es el día que ha hecho.
    expect(bloodFactor(0.3, 0.3)).toBe(1)
    expect(bloodFactor(0.9, 0.5)).toBe(1)
    expect(bloodFactor(m + 0.01 + 0.5, 0.5)).toBe(1)

    // Y al revés: ir a 0,60 SÍ es sangre si el que mira va a 0,70, que el listón absoluto tampoco
    // veía. Las dos mitades de la misma frase.
    expect(bloodFactor(0.6, 0.7)).toBeGreaterThan(1)

    // Un cuartil entero de diferencia (el IQR medido) da el efecto completo, ni más ni menos.
    expect(bloodFactor(0.5 - span, 0.5)).toBeCloseTo(1 + g, 6)
    // Y más allá NO sigue subiendo: la rampa está acotada.
    expect(bloodFactor(0.5 - 3 * span, 0.5)).toBeCloseTo(1 + g, 6)
    // A medio camino, la mitad: es una rampa, no un escalón.
    expect(bloodFactor(0.5 - span / 2, 0.5)).toBeCloseTo(1 + g / 2, 6)
  })

  it('…y la regla NO depende del recorrido, que es por lo que se cambió', () => {
    /**
     * EL CONTROL DE LA v80, y es el que justifica el cambio entero. Medido con la capa apagada, 60
     * semillas por recorrido, el depósito del maillot al pie del puerto decisivo vale ~0,553 en la
     * reina canónica y ~0,479 en una reina real de tercera semana. Con un listón absoluto, la misma
     * carrera contada en dos recorridos daba dos reglas distintas. Con el relativo, la MISMA
     * situación —el líder un pelo por debajo del que mira— da el MISMO factor en los dos.
     */
    const canonica = bloodFactor(0.553 - 0.02, 0.553)
    const real = bloodFactor(0.479 - 0.02, 0.479)
    expect(canonica).toBeCloseTo(real, 10)
    expect(canonica).toBeGreaterThan(1)
  })
})

describe('engine: el interruptor del paso 11', () => {
  it('nace apagado: es el racimo que desafina todas las cazas', () => {
    expect(STAGE.director.enabled).toBe(false)
  })
})
