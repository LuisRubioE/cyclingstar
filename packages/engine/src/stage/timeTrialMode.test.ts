import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  bikeSwapNetS,
  caughtPenaltyS,
  domestiqueShare,
  pacerGainS,
  pacingBlowUpGain,
  pacingTimeDeltaS,
  riskFromSplits,
  slotWeatherS,
  worthSwapping,
} from './timeTrialMode.js'

describe('la dosificación es una apuesta (R27.1)', () => {
  it('salir a tope gana tiempo Y MÁS QUE DUPLICA el riesgo de reventar', () => {
    expect(pacingTimeDeltaS('a_tope')).toBeLessThan(0)
    expect(pacingBlowUpGain('a_tope')).toBeGreaterThan(2)
  })

  it('salir conservador pierde tiempo y no arriesga nada', () => {
    expect(pacingTimeDeltaS('conservador')).toBeGreaterThan(0)
    expect(pacingBlowUpGain('conservador')).toBe(1)
  })

  it('y el término medio no es ni una cosa ni la otra, que es lo que lo hace el término medio', () => {
    expect(pacingTimeDeltaS('progresivo')).toBe(0)
    expect(pacingBlowUpGain('progresivo')).toBe(1)
  })

  it('EL GREGARIO SIN NADA QUE JUGARSE corre al 70 %, y eso le deja depósito para mañana', () => {
    expect(domestiqueShare(true)).toBe(STAGE.timeTrial.domestiqueShare)
    expect(domestiqueShare(true)).toBeLessThan(1)
    expect(domestiqueShare(false)).toBe(1)
  })
})

describe('las referencias del rival (R27.2)', () => {
  it('perder en un parcial pone nervioso, y ganar tranquiliza', () => {
    expect(riskFromSplits(20)).toBeGreaterThan(1)
    expect(riskFromSplits(-20)).toBeLessThan(1)
  })

  it('…y dentro de los ocho segundos no pasa nada: eso es ir igualado', () => {
    expect(riskFromSplits(0)).toBe(1)
    expect(riskFromSplits(7)).toBe(1)
    expect(riskFromSplits(-7)).toBe(1)
  })

  it('EL ALCANCE ES ASIMÉTRICO: si alcanzar diera ventaja, la crono estaría rota', () => {
    expect(caughtPenaltyS(true)).toBeGreaterThan(0)
    expect(caughtPenaltyS(false)).toBe(0)
  })

  it('y marcar tiempo para el jefe es la única forma de hacer equipo en una prueba individual', () => {
    expect(pacerGainS(true)).toBe(STAGE.timeTrial.pacerGainS)
    expect(pacerGainS(false)).toBe(0)
  })
})

describe('el cambio de bici (R27.3) y el horario (R27.5)', () => {
  it('A VECES LA DECISIÓN CORRECTA ES NO CAMBIAR, y por eso es una decisión', () => {
    // Con poco terreno favorable los dieciocho segundos del cambio no se amortizan.
    expect(worthSwapping(10)).toBe(false)
    expect(bikeSwapNetS(10)).toBeGreaterThan(0)
  })

  it('…y con recorrido de sobra, sí', () => {
    expect(worthSwapping(80)).toBe(true)
    expect(bikeSwapNetS(80)).toBeLessThan(0)
  })

  it('el punto de equilibrio está donde la aritmética lo pone, no donde nos gustaría', () => {
    const equilibrio = STAGE.timeTrial.bikeSwapS / STAGE.timeTrial.bikeGainPerKm
    expect(worthSwapping(equilibrio - 1)).toBe(false)
    expect(worthSwapping(equilibrio + 1)).toBe(true)
  })

  it('la lotería del horario reparte por franja, y la primera no la sufre nadie', () => {
    expect(slotWeatherS(0, 1)).toBe(0)
    expect(slotWeatherS(2, 1)).toBe(STAGE.timeTrial.weatherSpreadS)
    expect(slotWeatherS(2, -1)).toBe(-STAGE.timeTrial.weatherSpreadS)
  })
})
