import { describe, expect, it } from 'vitest'
import { activeText, deviceMeta, devicesStatus, othersText, shortDate } from './accountDates'

/**
 * LAS FECHAS DE LA CUENTA (docs/cuenta.md §12.2; 12-g): relativas hasta 7 días y absolutas después, con el
 * año si no es el actual. Las horas, a mediodía local para que ningún huso cambie el día.
 */
const AHORA = new Date(2026, 10, 23, 12, 0, 0)
const hace = (ms: number): string => new Date(AHORA.getTime() - ms).toISOString()
const HORA = 3_600_000
const DIA = 24 * HORA

describe('las fechas de Account y Devices (12-g)', () => {
  it('shortDate: 12 Nov, y con el año si no es el actual', () => {
    expect(shortDate(new Date(2026, 10, 12, 12).toISOString(), AHORA)).toBe('12 Nov')
    expect(shortDate(new Date(2025, 8, 3, 12).toISOString(), AHORA)).toBe('3 Sep 2025')
    expect(shortDate(new Date(2026, 10, 12, 12).toISOString(), AHORA, true)).toBe('12 Nov 2026')
  })

  it('activeText: now, horas, días hasta 7 y la fecha después', () => {
    expect(activeText(hace(5 * 60_000), AHORA)).toBe('Active now')
    expect(activeText(hace(HORA), AHORA)).toBe('Active 1 hour ago')
    expect(activeText(hace(5 * HORA), AHORA)).toBe('Active 5 hours ago')
    expect(activeText(hace(DIA), AHORA)).toBe('Active 1 day ago')
    expect(activeText(hace(2 * DIA), AHORA)).toBe('Active 2 days ago')
    expect(activeText(hace(7 * DIA), AHORA)).toBe('Active 7 days ago')
    expect(activeText(new Date(2026, 9, 20, 12).toISOString(), AHORA)).toBe('Active 20 Oct')
  })

  it('deviceMeta: la propia, Active now; las otras, su actividad; y cuándo entró', () => {
    const creada = new Date(2026, 10, 12, 12).toISOString()
    expect(
      deviceMeta({ current: true, createdAt: creada, lastActiveAt: hace(3 * DIA) }, AHORA),
    ).toBe('Active now · Signed in 12 Nov')
    expect(
      deviceMeta({ current: false, createdAt: creada, lastActiveAt: hace(2 * DIA) }, AHORA),
    ).toBe('Active 2 days ago · Signed in 12 Nov')
  })

  it('la línea de Devices y el número de las otras', () => {
    expect(devicesStatus(3)).toBe("You're signed in on 3 devices.")
    expect(devicesStatus(1)).toBe("You're only signed in here.")
    expect(othersText(2)).toBe('2 other devices')
    expect(othersText(1)).toBe('1 other device')
  })
})
