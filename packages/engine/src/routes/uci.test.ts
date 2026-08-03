import { describe, expect, it } from 'vitest'
import { RACE_CLASSES, RACE_CLASS_INFO, classPrestige, racePoints } from './uci.js'

describe('engine: modelo de clases de carrera', () => {
  it('el ganador recibe los puntos tope de su clase y formato', () => {
    expect(racePoints('WT', 1, false)).toBe(500)
    expect(racePoints('Pro', 1, true)).toBe(200)
    expect(racePoints('1', 1, false)).toBe(125)
    expect(racePoints('NC', 1, false)).toBe(100)
  })

  it('la curva por posición es monótona no creciente y llega a cero fuera de rango', () => {
    let prev = Number.POSITIVE_INFINITY
    for (let pos = 1; pos <= 40; pos++) {
      const p = racePoints('WT', pos, false)
      expect(p).toBeLessThanOrEqual(prev)
      prev = p
    }
    expect(racePoints('WT', 41, false)).toBe(0)
    expect(racePoints('WT', 0, false)).toBe(0)
  })

  it('más clase, más prestigio y más puntos al ganador', () => {
    expect(classPrestige('WT')).toBeGreaterThan(classPrestige('Pro'))
    expect(classPrestige('Pro')).toBeGreaterThan(classPrestige('1'))
    expect(classPrestige('1')).toBeGreaterThan(classPrestige('2'))
    expect(racePoints('WT', 1, false)).toBeGreaterThan(racePoints('Pro', 1, false))
    expect(racePoints('Pro', 1, false)).toBeGreaterThan(racePoints('1', 1, false))
  })

  it('cada clase tiene ficha y etiqueta con punto', () => {
    for (const c of RACE_CLASSES) {
      expect(RACE_CLASS_INFO[c].label.startsWith('.')).toBe(true)
    }
  })
})
