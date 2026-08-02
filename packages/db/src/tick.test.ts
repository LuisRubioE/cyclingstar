import { describe, expect, it } from 'vitest'
import { reanchorClock, targetGameDay } from './tick.js'

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

describe('tick: reanchorClock', () => {
  const now = new Date('2026-03-01T12:00:00.000Z')

  it('re-ancla tras un avance forzado para reanudar la cadencia desde ahora', () => {
    const anchor = reanchorClock({
      forced: true,
      currentDayAtStart: 40,
      target: 40,
      finalDay: 45,
      now,
      msPerGameDay: SIX_HOURS_MS,
    })
    expect(anchor).not.toBeNull()
    // El ancla deja el mundo justo en su día actual a día de hoy: target(ahora) == finalDay,
    // así que el próximo tick automático cae exactamente a un intervalo.
    expect(targetGameDay(anchor!, now, SIX_HOURS_MS)).toBe(45)
    const nextTickMs = anchor!.getTime() + (45 + 1) * SIX_HOURS_MS - now.getTime()
    expect(nextTickMs).toBe(SIX_HOURS_MS)
  })

  it('re-ancla un mundo que arrancó por delante del tiempo real (avances manuales previos)', () => {
    // El mundo está en el día 50 pero el tiempo real solo da para el 42: la cuenta atrás sería de
    // más de un intervalo hasta que reanclamos.
    const anchor = reanchorClock({
      forced: false,
      currentDayAtStart: 50,
      target: 42,
      finalDay: 50,
      now,
      msPerGameDay: SIX_HOURS_MS,
    })
    expect(anchor).not.toBeNull()
    expect(targetGameDay(anchor!, now, SIX_HOURS_MS)).toBe(50)
  })

  it('no re-ancla en un tick normal que se pone al día con el tiempo real', () => {
    expect(
      reanchorClock({
        forced: false,
        currentDayAtStart: 10,
        target: 12,
        finalDay: 12,
        now,
        msPerGameDay: SIX_HOURS_MS,
      }),
    ).toBeNull()
  })

  it('no re-ancla cuando el mundo ya está justo en el día objetivo', () => {
    expect(
      reanchorClock({
        forced: false,
        currentDayAtStart: 12,
        target: 12,
        finalDay: 12,
        now,
        msPerGameDay: SIX_HOURS_MS,
      }),
    ).toBeNull()
  })
})
