import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { tacticalCostFactor, tacticalCostMultiplier } from './cost.js'
import {
  accordionActive,
  accordionTerm,
  descentLossS,
  echelonAttempt,
  initialPlacement,
  isBoxed,
  placeFinishWeight,
  placementStep,
  pushTerm,
  sectorEntryLossS,
  sectorLambdaScale,
  turnGainM,
} from './placement.js'

describe('placement — el estado (R15a.1)', () => {
  it('arranca en la mitad de la fila y se queda dentro de [0,1]', () => {
    expect(initialPlacement(0)).toBe(0.5)
    expect(initialPlacement(-10)).toBe(0)
    expect(initialPlacement(10)).toBe(1)
  })

  it('SIN HACER NADA SE RETROCEDE, y la glosa manda: cien km de la primera fila a la cola', () => {
    let p = 0.5
    for (let i = 0; i < 100; i++) p = placementStep(p, 1, 0, 50, 0)
    expect(p).toBeCloseTo(1, 5)
  })

  it('empujar gana puestos mucho más rápido de lo que la deriva los quita', () => {
    const quieto = placementStep(0.8, 1, 0, 50, 0)
    const empujando = placementStep(0.8, 1, 1, 50, 0)
    expect(quieto).toBeGreaterThan(0.8)
    expect(empujando).toBeLessThan(0.8 - 0.2)
  })

  it('el ruido lo atenúa TAC, pero nunca lo apaga del todo', () => {
    const malo = placementStep(0.5, 1, 0, 0, 1) - placementStep(0.5, 1, 0, 0, 0)
    const bueno = placementStep(0.5, 1, 0, 100, 1) - placementStep(0.5, 1, 0, 100, 0)
    expect(bueno).toBeCloseTo(malo / 2, 6)
    expect(bueno).toBeGreaterThan(0)
  })

  it('da lo mismo llamarla diez veces con 0,1 que una vez con 1', () => {
    let p = 0.5
    for (let i = 0; i < 10; i++) p = placementStep(p, 0.1, 0.4, 50, 0)
    expect(p).toBeCloseTo(placementStep(0.5, 1, 0.4, 50, 0), 9)
  })
})

describe('el acordeón (R15a.2) y el coste táctico (§9.1bis)', () => {
  it('solo aprieta en el llano nervioso', () => {
    expect(accordionActive('aproximacion')).toBe(true)
    expect(accordionActive('desenlace')).toBe(true)
    expect(accordionActive('control')).toBe(false)
    expect(accordionActive('fuga')).toBe(false)
  })

  it('EL DE DELANTE PAGA MENOS Y EL DE ATRÁS MÁS, y la suma del grupo es cero', () => {
    const grupo = [0.1, 0.3, 0.5, 0.7, 0.9]
    const media = grupo.reduce((a, b) => a + b, 0) / grupo.length
    const terminos = grupo.map((p) => accordionTerm(p, media))
    expect(terminos[0]!).toBeLessThan(0)
    expect(terminos[4]!).toBeGreaterThan(0)
    expect(terminos.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 12)
  })

  it('y empujar también redistribuye: el grupo gasta lo mismo, cambia QUIÉN', () => {
    const pushings = [1, 1, 0, 0, 0, 0]
    const brutos = pushings.map(pushTerm)
    const media = brutos.reduce((a, b) => a + b, 0) / brutos.length
    const suma = brutos
      .map((push) => tacticalCostMultiplier({ push, accordion: 0 }, media))
      .reduce((a, b) => a + b, 0)
    expect(Math.abs(suma)).toBeLessThan(0.02)
  })

  it('sin términos el factor vale 1 EXACTO: ése es el brazo A/B', () => {
    expect(tacticalCostFactor({ push: 0, accordion: 0 }, 0)).toBe(1)
  })

  it('y el tope existe: ni el que remonta cien puestos en pleno acordeón pasa del ±60 %', () => {
    expect(tacticalCostMultiplier({ push: 5, accordion: 5 }, 0)).toBe(STAGE.tacticalCostCap)
    expect(tacticalCostMultiplier({ push: 0, accordion: -5 }, 5)).toBe(-STAGE.tacticalCostCap)
  })
})

describe('el sprint (R15a.4)', () => {
  it('el que llega el último del pelotón remata peor que el que llega primero', () => {
    expect(placeFinishWeight(0)).toBe(1)
    expect(placeFinishWeight(1)).toBeCloseTo(1 - STAGE.placement.finishMax, 9)
  })

  it('ENCAJONADO: pierde sin que le gane nadie, llegando entero', () => {
    expect(isBoxed(0.9, 4, 3)).toBe(true)
    // Delante, no: el que va primero nunca está encajonado por muchos carriles llenos que haya.
    expect(isBoxed(0.2, 9, 3)).toBe(false)
    // Y si la carretera está despejada tampoco, por atrás que vaya.
    expect(isBoxed(0.9, 0, 3)).toBe(false)
  })

  it('el último giro congela: los tres primeros ganan cuerpos, el decimoquinto ya no', () => {
    expect(turnGainM(0)).toBeGreaterThan(turnGainM(1))
    expect(turnGainM(2)).toBeGreaterThan(0)
    expect(turnGainM(3)).toBe(0)
    expect(turnGainM(15)).toBe(0)
  })
})

describe('el sector (R15a.6) y el bajador (R15a.7)', () => {
  it('entrar por detrás cuesta segundos; entrar en las quince primeras no', () => {
    expect(sectorEntryLossS(0.2)).toBe(0)
    expect(sectorEntryLossS(0.6)).toBe(STAGE.placement.sectorLossS)
  })

  it('el adoquín cobra posición ESCALANDO LA λ, no el exponente de la física', () => {
    expect(sectorLambdaScale(0)).toBeCloseTo(0.4, 9)
    expect(sectorLambdaScale(1)).toBeCloseTo(1.6, 9)
    expect(sectorLambdaScale(1)).toBeGreaterThan(4 * sectorLambdaScale(0) - 0.01)
  })

  it('sin bajador se ceden veinte segundos SIN que nadie ataque, y con lluvia el doble', () => {
    expect(descentLossS(true, false)).toBe(0)
    expect(descentLossS(true, true)).toBe(0)
    expect(descentLossS(false, false)).toBe(STAGE.placement.descentNoHelperS)
    expect(descentLossS(false, true)).toBe(2 * STAGE.placement.descentNoHelperS)
  })
})

describe('el abanico tiene autor (R15a.3b)', () => {
  const base = { vientoLateral: 0.7, placeLeales: 0.2, placeVictima: 0.6, spent: 0.3 }

  it('con viento, los míos colocados, una víctima mal colocada y presupuesto, se abre', () => {
    expect(echelonAttempt(base)).toBe(true)
  })

  it('y basta que falle una para que no', () => {
    expect(echelonAttempt({ ...base, vientoLateral: 0.2 })).toBe(false)
    expect(echelonAttempt({ ...base, placeLeales: 0.5 })).toBe(false)
    expect(echelonAttempt({ ...base, placeVictima: null })).toBe(false)
    expect(echelonAttempt({ ...base, placeVictima: 0.1 })).toBe(false)
    expect(echelonAttempt({ ...base, spent: 0.9 })).toBe(false)
  })

  it('NO SE ABRE CONTRA NADIE QUE YA VAYA DELANTE: ésa es la mitad que le da autor', () => {
    expect(echelonAttempt({ ...base, placeVictima: 0.44 })).toBe(false)
    expect(echelonAttempt({ ...base, placeVictima: 0.45 })).toBe(true)
  })
})
