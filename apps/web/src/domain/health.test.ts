import type { RiderHealth } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { HEALTH_LOOK, healthDaysLeft, healthUntilLabel, isOut } from './health'

describe('etiquetas de salud', () => {
  it('tiene los cuatro estados del enum de la base de datos', () => {
    expect(Object.keys(HEALTH_LOOK).sort()).toEqual(
      ['enfermo', 'lesionado', 'molestias', 'sano'].sort(),
    )
  })

  it('solo enfermo y lesionado dejan fuera de combate', () => {
    expect(isOut('sano')).toBe(false)
    expect(isOut('molestias')).toBe(false)
    expect(isOut('enfermo')).toBe(true)
    expect(isOut('lesionado')).toBe(true)
  })
})

describe('días de baja que quedan', () => {
  const lesion = (untilDay: number | null): RiderHealth => ({ state: 'lesionado', untilDay })

  it('cuenta HOY: el motor recupera al pasar untilDay', () => {
    // Baja hasta el día 143 y hoy es el 138 ⇒ 138, 139, 140, 141, 142 y 143: seis días.
    expect(healthDaysLeft(lesion(143), 138)).toBe(6)
  })

  it('el último día de baja cuenta como uno', () => {
    expect(healthDaysLeft(lesion(143), 143)).toBe(1)
  })

  it('una fecha ya pasada no deja días (vuelve en el próximo tick)', () => {
    expect(healthDaysLeft(lesion(143), 144)).toBeNull()
  })

  it('no hay días que contar sin fecha, sin mundo o estando sano', () => {
    expect(healthDaysLeft(lesion(null), 138)).toBeNull()
    expect(healthDaysLeft(lesion(143), null)).toBeNull()
    expect(healthDaysLeft({ state: 'molestias', untilDay: 143 }, 138)).toBeNull()
    expect(healthDaysLeft(null, 138)).toBeNull()
  })
})

describe('hasta cuándo dura la baja', () => {
  it('dice el día de juego y los días que restan', () => {
    expect(healthUntilLabel({ state: 'lesionado', untilDay: 143 }, 138)).toBe(
      'out until GD 143 · ~6 days',
    )
  })

  it('el último día se dice en singular', () => {
    expect(healthUntilLabel({ state: 'enfermo', untilDay: 143 }, 143)).toBe(
      'out until GD 143 · ~1 day',
    )
  })

  it('sin mundo se dice la fecha, sin contar días', () => {
    expect(healthUntilLabel({ state: 'lesionado', untilDay: 143 }, null)).toBe('out until GD 143')
  })

  it('usa el día DE LA TEMPORADA, como el reloj del mundo', () => {
    // El día de juego 500 es el 136 de la segunda temporada (364 días por temporada).
    expect(healthUntilLabel({ state: 'lesionado', untilDay: 500 }, null)).toBe('out until GD 136')
  })

  it('no dice nada si está sano, con molestias, sin fecha o con la fecha pasada', () => {
    expect(healthUntilLabel({ state: 'sano', untilDay: null }, 138)).toBeNull()
    expect(healthUntilLabel({ state: 'molestias', untilDay: 140 }, 138)).toBeNull()
    expect(healthUntilLabel({ state: 'lesionado', untilDay: null }, 138)).toBeNull()
    expect(healthUntilLabel({ state: 'lesionado', untilDay: 130 }, 138)).toBeNull()
    expect(healthUntilLabel(null, 138)).toBeNull()
  })
})
