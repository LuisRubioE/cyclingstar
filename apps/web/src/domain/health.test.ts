import type { RiderHealth } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  HEALTH_LOOK,
  SPENT_FRESHNESS,
  healthChip,
  healthDaysLeft,
  healthNote,
  healthTone,
  healthUntilLabel,
  isOut,
} from './health'

describe('etiquetas de salud', () => {
  it('tiene los cuatro estados del enum de la base de datos', () => {
    expect(Object.keys(HEALTH_LOOK).sort()).toEqual(
      ['enfermo', 'lesionado', 'molestias', 'sano'].sort(),
    )
  })

  it('cada estado, con su tono (E3, PR 21h): sin clases de color, que eran de la ficha de antes', () => {
    expect(healthTone('sano')).toBe('good')
    expect(healthTone('molestias')).toBe('warn')
    expect(healthTone('enfermo')).toBe('bad')
    expect(healthTone('lesionado')).toBe('bad')
    for (const look of Object.values(HEALTH_LOOK)) expect(look).not.toHaveProperty('cls')
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
  it('dice el día de la temporada y los días que restan; nunca GD (§4.10; PR 21h)', () => {
    expect(healthUntilLabel({ state: 'lesionado', untilDay: 143 }, 138)).toBe(
      'out until Day 143 · ~6 days',
    )
  })

  it('el último día se dice en singular', () => {
    expect(healthUntilLabel({ state: 'enfermo', untilDay: 143 }, 143)).toBe(
      'out until Day 143 · ~1 day',
    )
  })

  it('sin mundo se dice la fecha, sin contar días', () => {
    expect(healthUntilLabel({ state: 'lesionado', untilDay: 143 }, null)).toBe('out until Day 143')
  })

  it('usa el día DE LA TEMPORADA, como el reloj del mundo', () => {
    // El día de juego 500 es el 136 de la segunda temporada (364 días por temporada).
    expect(healthUntilLabel({ state: 'lesionado', untilDay: 500 }, null)).toBe('out until Day 136')
  })

  it('no dice nada si está sano, con molestias, sin fecha o con la fecha pasada', () => {
    expect(healthUntilLabel({ state: 'sano', untilDay: null }, 138)).toBeNull()
    expect(healthUntilLabel({ state: 'molestias', untilDay: 140 }, 138)).toBeNull()
    expect(healthUntilLabel({ state: 'lesionado', untilDay: null }, 138)).toBeNull()
    expect(healthUntilLabel({ state: 'lesionado', untilDay: 130 }, 138)).toBeNull()
    expect(healthUntilLabel(null, 138)).toBeNull()
  })
})

describe('la nota de la insignia de salud', () => {
  it('un corredor sano y descansado lee la nota de siempre', () => {
    expect(healthNote('sano', 70)).toBe(HEALTH_LOOK.sano.note)
    expect(healthNote('sano', SPENT_FRESHNESS)).toBe(HEALTH_LOOK.sano.note)
  })

  it('un corredor sano pero fundido NO lee "listo para correr"', () => {
    // La insignia decía «Healthy · Fit to race and train» justo encima de una barra de frescura a
    // cero, que es lo contrario de lo que pasaba. Salud y frescura son ejes distintos, pero la nota
    // no puede afirmar lo que la barra desmiente.
    const note = healthNote('sano', 0)
    expect(note).not.toBe(HEALTH_LOOK.sano.note)
    expect(note).toMatch(/fatigued/i)
  })

  it('sin frescura (ficha pública) se lee la nota de siempre: es un dato privado', () => {
    expect(healthNote('sano', null)).toBe(HEALTH_LOOK.sano.note)
  })

  it('los estados de baja mandan sobre la frescura', () => {
    expect(healthNote('lesionado', 0)).toBe(HEALTH_LOOK.lesionado.note)
    expect(healthNote('enfermo', 0)).toBe(HEALTH_LOOK.enfermo.note)
    expect(healthNote('molestias', 0)).toBe(HEALTH_LOOK.molestias.note)
  })
})

describe('la chapa de salud de la cabecera (E3, §4.6; PR 21h)', () => {
  it('solo si no está sano: el estado, hasta cuándo y su tono', () => {
    expect(healthChip({ state: 'sano', untilDay: null }, 138)).toBeNull()
    expect(healthChip({ state: 'molestias', untilDay: 140 }, 138)).toEqual({
      text: 'Niggle',
      tone: 'warn',
    })
    expect(healthChip({ state: 'lesionado', untilDay: 143 }, 138)).toEqual({
      text: 'Injured · out until Day 143 · ~6 days',
      tone: 'bad',
    })
    expect(healthChip({ state: 'enfermo', untilDay: null }, 138)).toEqual({
      text: 'Ill',
      tone: 'bad',
    })
  })
})
