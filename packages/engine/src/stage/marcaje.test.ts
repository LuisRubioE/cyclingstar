import { describe, expect, it } from 'vitest'
import { markingMargin, resolveMarking, wheelProbability } from './marcaje.js'

describe('marcaje (6.18)', () => {
  it('p_rueda sube con la ventaja táctica del marcador y baja con marcadores de más', () => {
    // A igual TAC: 0.35 base.
    expect(wheelProbability(60, 60)).toBeCloseTo(0.35)
    // Marcador más listo: sube.
    expect(wheelProbability(80, 60)).toBeCloseTo(0.35 + 20 / 80)
    // Marcadores extra reparten el trabajo del objetivo: baja.
    expect(wheelProbability(60, 60, 2)).toBeCloseTo(0.35 - 0.2)
    // Saturada entre 0.15 y 0.90.
    expect(wheelProbability(10, 99)).toBe(0.15)
    expect(wheelProbability(99, 10)).toBe(0.9)
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
