import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { markingMargin, resolveMarking, wheelProbability } from './marcaje.js'

describe('marcaje (6.18)', () => {
  it('p_rueda sube con la ventaja táctica del marcador y baja con marcadores de más', () => {
    // A igual TAC, la base (0,60 desde la v39: el que tiene la ORDEN de marcar vive en esa rueda;
    // con 0,35 la perdía dos de cada tres veces, que no es marcar a nadie).
    expect(wheelProbability(60, 60)).toBeCloseTo(STAGE.markWheelBase)
    // Marcador más listo: sube.
    expect(wheelProbability(80, 60)).toBeCloseTo(
      Math.min(STAGE.markWheelMax, STAGE.markWheelBase + 20 / STAGE.markWheelTacScale),
    )
    // Marcadores extra reparten el trabajo del objetivo: baja.
    expect(wheelProbability(60, 60, 2)).toBeCloseTo(
      STAGE.markWheelBase - 2 * STAGE.markWheelExtraPenalty,
    )
    // Saturada entre 0.15 y 0.90.
    expect(wheelProbability(10, 99)).toBe(STAGE.markWheelMin)
    expect(wheelProbability(99, 10)).toBe(STAGE.markWheelMax)
  })

  it('el rebufo del ataque da +4 de tolerancia al marcador', () => {
    expect(markingMargin(50, 50)).toBe(4)
    expect(markingMargin(40, 50)).toBe(-6)
  })

  it('resuelve pegado / cede / suelto según el margen', () => {
    expect(resolveMarking(3)).toEqual({ kind: 'stuck' })
    // margen -4: cede 1.2·4 = 4.8 s pero aguanta.
    expect(resolveMarking(-4)).toEqual({ kind: 'gives', secondsLost: 4.8 })
    // margen -8: se suelta.
    expect(resolveMarking(-8)).toEqual({ kind: 'dropped' })
  })
})
