import { describe, expect, it } from 'vitest'
import { worldClock } from './words'

/**
 * El reloj del mundo de la cabecera (E3, docs/visual.md §6.3 y §4.10; PR 11): el día de la temporada, la
 * temporada y lo que falta para el próximo avance, en horas y minutos (`Day 50 · S1 · 4h 56m`), y la
 * frase entera para el lector. Nunca el día absoluto ni `GD`.
 */

const min = (m: number) => m * 60_000

describe('worldClock', () => {
  it('el día de la temporada, la temporada y lo que falta', () => {
    expect(worldClock(50, min(4 * 60 + 56))).toEqual({
      text: 'Day 50 · S1 · 4h 56m',
      label: 'Day 50 of season 1. Next update in 4 hours 56 minutes.',
    })
  })

  it('el día de la temporada, no el absoluto: el 400 es el 36 de la segunda', () => {
    expect(worldClock(400, min(90)).text).toBe('Day 36 · S2 · 1h 30m')
  })

  it('el más ancho, el último día de la temporada 12', () => {
    expect(worldClock(12 * 364, min(23 * 60 + 59)).text).toBe('Day 364 · S12 · 23h 59m')
  })

  it('los minutos, hacia arriba: lo que falta nunca se dice de menos', () => {
    expect(worldClock(50, 30_000)).toEqual({
      text: 'Day 50 · S1 · 1m',
      label: 'Day 50 of season 1. Next update in 1 minute.',
    })
    expect(worldClock(50, min(60)).text).toBe('Day 50 · S1 · 1h 0m')
    expect(worldClock(50, min(60) + 1).label).toBe(
      'Day 50 of season 1. Next update in 1 hour 1 minute.',
    )
  })

  it('a cero, now', () => {
    expect(worldClock(50, 0)).toEqual({
      text: 'Day 50 · S1 · now',
      label: 'Day 50 of season 1. Next update now.',
    })
    expect(worldClock(50, -5_000).text).toBe('Day 50 · S1 · now')
  })

  it('sin mundo todavía, Not started', () => {
    expect(worldClock(null, min(5))).toEqual({
      text: 'Not started · 5m',
      label: 'The world has not started yet. Next update in 5 minutes.',
    })
    expect(worldClock(0, min(5)).text).toBe('Not started · 5m')
  })
})
