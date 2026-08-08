import { describe, expect, it } from 'vitest'
import { conditionBars, conditionLabel, conditionSeries, fitnessBar } from './condition'

describe('la condición que ve el jugador', () => {
  it('el fondo sale acotado a 0-100 por mucho que suba el CTL interno', () => {
    expect(fitnessBar(0)).toBe(0)
    // 118 es un valor interno real del diario: la barra no puede pasar de 100.
    expect(fitnessBar(118)).toBe(100)
    expect(fitnessBar(47.5)).toBe(50)
  })

  it('la frescura tampoco se sale de la escala con un TSB extremo', () => {
    expect(conditionBars({ gameDay: 1, ctl: 80, tsb: 90 }).freshness).toBe(100)
    expect(conditionBars({ gameDay: 1, ctl: 80, tsb: -90 }).freshness).toBe(0)
  })

  it('ningún punto del diario produce un valor fuera de 0-100', () => {
    const log = [
      { gameDay: 1, ctl: 0, tsb: 0 },
      { gameDay: 2, ctl: 130, tsb: -70 },
      { gameDay: 3, ctl: 95, tsb: 45 },
    ]
    for (const p of conditionSeries(log)) {
      expect(p.fitness).toBeGreaterThanOrEqual(0)
      expect(p.fitness).toBeLessThanOrEqual(100)
      expect(p.freshness).toBeGreaterThanOrEqual(0)
      expect(p.freshness).toBeLessThanOrEqual(100)
    }
  })

  it('la etiqueta cualitativa cubre toda la escala', () => {
    expect(conditionLabel(95)).toBe('Excellent')
    expect(conditionLabel(65)).toBe('Good')
    expect(conditionLabel(45)).toBe('Fair')
    expect(conditionLabel(25)).toBe('Low')
    expect(conditionLabel(5)).toBe('Very low')
  })
})
