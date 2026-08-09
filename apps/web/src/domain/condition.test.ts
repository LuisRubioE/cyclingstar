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
    const deep = conditionBars({ gameDay: 1, ctl: 80, tsb: -90 }).freshness
    expect(deep).toBeGreaterThanOrEqual(0)
    expect(deep).toBeLessThan(10)
  })

  it('en fatiga profunda la barra sigue distinguiendo un día de otro', () => {
    // Correr lleva el TSB a -80/-100 y la barra se quedaba clavada en 0 durante días, así que el
    // jugador descansaba y no veía moverse nada. Aquí se comprueba lo contrario: que baja de forma
    // estricta, punto a punto, en la banda que produce competir.
    const at = (tsb: number) => conditionBars({ gameDay: 1, ctl: 80, tsb }).freshness
    expect(at(-40)).toBeGreaterThan(at(-60))
    expect(at(-60)).toBeGreaterThan(at(-80))
    expect(at(-80)).toBeGreaterThan(at(-110))
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
