import { describe, expect, it } from 'vitest'
import { targetGameDay } from './tick.js'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

describe('tick: targetGameDay', () => {
  const start = new Date('2026-01-01T00:00:00.000Z')

  it('es 0 en el instante de la creación del mundo', () => {
    expect(targetGameDay(start, start, SIX_HOURS_MS)).toBe(0)
  })

  it('avanza un día de juego cada 6 horas reales', () => {
    const sixHoursLater = new Date(start.getTime() + SIX_HOURS_MS)
    expect(targetGameDay(start, sixHoursLater, SIX_HOURS_MS)).toBe(1)
  })

  it('trunca las fracciones (5h59 sigue siendo día 0)', () => {
    const almost = new Date(start.getTime() + SIX_HOURS_MS - 60_000)
    expect(targetGameDay(start, almost, SIX_HOURS_MS)).toBe(0)
  })

  it('recupera varios días si el cron falló (1 día real = 4 días de juego)', () => {
    const oneDayLater = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    expect(targetGameDay(start, oneDayLater, SIX_HOURS_MS)).toBe(4)
  })

  it('nunca retrocede con relojes hacia atrás', () => {
    const before = new Date(start.getTime() - SIX_HOURS_MS)
    expect(targetGameDay(start, before, SIX_HOURS_MS)).toBe(0)
  })
})
