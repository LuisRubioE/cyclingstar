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

  it('EL DÍA QUE EL MAILLOT CEDE, SUS RIVALES ATACAN MÁS', () => {
    // Es el contrario nº 9, y hoy el motor hace lo contrario: el mecanismo que existe es ciego a la
    // identidad del que flaquea y vive solo en el ataque final.
    expect(bloodFactor(1)).toBe(1)
    expect(bloodFactor(STAGE.director.bloodThreshold)).toBe(1)
    expect(bloodFactor(STAGE.director.bloodThreshold + 0.01)).toBe(1)
    // Vacío del todo: el apetito sube lo que dice la constante, ni más ni menos.
    expect(bloodFactor(0)).toBeCloseTo(1 + STAGE.director.bloodGain, 6)
    // Y a medio camino, la mitad: es una rampa, no un escalón.
    expect(bloodFactor(STAGE.director.bloodThreshold / 2)).toBeCloseTo(
      1 + STAGE.director.bloodGain / 2,
      6,
    )
  })
})

describe('engine: el interruptor del paso 11', () => {
  it('nace apagado: es el racimo que desafina todas las cazas', () => {
    expect(STAGE.director.enabled).toBe(false)
  })
})
