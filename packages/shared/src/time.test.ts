import { describe, expect, it } from 'vitest'
import { formatCountdown, nextTickAt, seasonPosition } from './time.js'

describe('shared: seasonPosition', () => {
  it('el día 1 es temporada 1, día 1', () => {
    expect(seasonPosition(1)).toEqual({ season: 1, dayOfSeason: 1 })
  })

  it('el día 37 es temporada 1, día 37', () => {
    expect(seasonPosition(37)).toEqual({ season: 1, dayOfSeason: 37 })
  })

  it('el día 364 cierra la temporada 1', () => {
    expect(seasonPosition(364)).toEqual({ season: 1, dayOfSeason: 364 })
  })

  it('el día 365 abre la temporada 2', () => {
    expect(seasonPosition(365)).toEqual({ season: 2, dayOfSeason: 1 })
  })

  it('antes de empezar (día 0) es temporada 1, día 0', () => {
    expect(seasonPosition(0)).toEqual({ season: 1, dayOfSeason: 0 })
  })
})

describe('shared: nextTickAt', () => {
  it('devuelve el siguiente límite de 6h alineado al epoch', () => {
    const now = new Date('2026-01-01T01:30:00.000Z')
    expect(nextTickAt(now, 360).toISOString()).toBe('2026-01-01T06:00:00.000Z')
  })

  it('en un límite exacto salta al siguiente', () => {
    const now = new Date('2026-01-01T06:00:00.000Z')
    expect(nextTickAt(now, 360).toISOString()).toBe('2026-01-01T12:00:00.000Z')
  })
})

describe('shared: formatCountdown', () => {
  it('formatea horas, minutos y segundos', () => {
    expect(formatCountdown((5 * 3600 + 23 * 60 + 41) * 1000)).toBe('5h 23m 41s')
  })

  it('omite las horas cuando son cero', () => {
    expect(formatCountdown((3 * 60 + 9) * 1000)).toBe('3m 9s')
  })

  it('nunca es negativo', () => {
    expect(formatCountdown(-5000)).toBe('0s')
  })
})
