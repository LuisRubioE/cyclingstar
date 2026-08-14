import { describe, expect, it } from 'vitest'
import type { RadioKm } from '@cyclingstar/shared'
import { radioGap, radioRows } from './RaceRadioPanel'

const km = (i: number, groups: number): RadioKm => ({
  km: i,
  racing: 100,
  gone: 0,
  groups: Array.from({ length: groups }, () => ({
    kind: 'peloton' as const,
    size: 10,
    gapS: 0,
    energyPct: 80,
    pulling: [],
  })),
})

describe('Race Radio: qué filas se pintan', () => {
  it('el hueco se lee como en carretera, y el líder va a raya', () => {
    expect(radioGap(0)).toBe('—')
    expect(radioGap(-3)).toBe('—')
    expect(radioGap(9)).toBe('+0:09')
    expect(radioGap(214)).toBe('+3:34')
  })

  it('por defecto una de cada cinco, y la última siempre', () => {
    const kms = Array.from({ length: 12 }, (_, i) => km(i, 1))
    expect(radioRows(kms, 5).map((k) => k.km)).toEqual([0, 5, 10, 11])
  })

  it('un km con MÁS DE DOS grupos sale siempre: ahí es donde se rompe la carrera', () => {
    const kms = Array.from({ length: 12 }, (_, i) => km(i, i === 3 ? 4 : 1))
    expect(radioRows(kms, 5).map((k) => k.km)).toContain(3)
  })

  it('a 1 km salen todas', () => {
    const kms = Array.from({ length: 7 }, (_, i) => km(i, 1))
    expect(radioRows(kms, 1)).toHaveLength(7)
  })
})
