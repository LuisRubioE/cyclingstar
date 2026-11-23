import { describe, expect, it } from 'vitest'
import { ageOn, isOldEnough, makeBirthDateSchema, parseIsoDate } from './birthDate.js'
import { MIN_AGE_YEARS, MIN_BIRTH_YEAR } from './constants.js'

/**
 * LA REGLA DE LA EDAD (docs/cuenta.md §4.2; D-06, 4-a): la fecha en `YYYY-MM-DD`, la edad en el día UTC
 * y 16 años cumplidos. El reloj se fija con `makeBirthDateSchema(now)`.
 */

/** El primer issue de la regla con el reloj en `today` (UTC), o null si la fecha vale. */
function problema(value: string, today: string): string | null {
  const schema = makeBirthDateSchema(() => new Date(`${today}T12:00:00Z`))
  const r = schema.safeParse(value)
  return r.success ? null : (r.error.issues[0]?.message ?? 'sin mensaje')
}

describe('birthDate: parseIsoDate', () => {
  it('una fecha real, en sus tres números', () => {
    expect(parseIsoDate('2008-07-01')).toEqual({ year: 2008, month: 7, day: 1 })
  })

  it('las fechas que no existen o no tienen la forma dan null', () => {
    for (const v of ['2023-02-29', '2010-04-31', '2010-13-01', '2010-00-10', '2010-1-01', '', 'x'])
      expect(parseIsoDate(v), v).toBeNull()
    expect(parseIsoDate('2008-02-29')).toEqual({ year: 2008, month: 2, day: 29 })
  })
})

describe('birthDate: la edad en UTC', () => {
  it('el día del cumpleaños ya cuenta el año', () => {
    const birth = { year: 2010, month: 11, day: 23 }
    expect(ageOn(birth, new Date('2026-11-23T00:00:00Z'))).toBe(16)
    expect(ageOn(birth, new Date('2026-11-22T23:59:59Z'))).toBe(15)
  })

  it('quien nació un 29 de febrero cumple el 1 de marzo en año no bisiesto', () => {
    const birth = { year: 2008, month: 2, day: 29 }
    expect(ageOn(birth, new Date('2025-02-28T12:00:00Z'))).toBe(16)
    expect(ageOn(birth, new Date('2024-02-28T12:00:00Z'))).toBe(15)
    expect(ageOn(birth, new Date('2024-02-29T12:00:00Z'))).toBe(16)
    expect(ageOn({ year: 2009, month: 2, day: 28 }, new Date('2025-02-28T12:00:00Z'))).toBe(16)
    // en 2026, no bisiesto: el 28 todavía 17, el 1 de marzo 18
    expect(ageOn(birth, new Date('2026-02-28T12:00:00Z'))).toBe(17)
    expect(ageOn(birth, new Date('2026-03-01T12:00:00Z'))).toBe(18)
  })

  it('16 es la edad mínima', () => {
    expect(MIN_AGE_YEARS).toBe(16)
    expect(MIN_BIRTH_YEAR).toBe(1900)
    expect(isOldEnough({ year: 2010, month: 11, day: 23 }, new Date('2026-11-23T00:00:00Z'))).toBe(
      true,
    )
  })
})

describe('birthDate: birthDateSchema', () => {
  const HOY = '2026-11-23'

  it('16 cumplidos hoy entra; 15 años y 364 días, no', () => {
    expect(problema('2010-11-23', HOY)).toBeNull()
    expect(problema('2010-11-24', HOY)).toBe('UNDER_MINIMUM_AGE')
  })

  it('29 de febrero: en año no bisiesto los cumple el 1 de marzo', () => {
    expect(problema('2008-02-29', '2024-02-28')).toBe('UNDER_MINIMUM_AGE')
    expect(problema('2008-02-29', '2024-02-29')).toBeNull()
    expect(problema('2009-02-28', '2025-02-28')).toBeNull()
  })

  it('las fechas imposibles, futuras o anteriores a 1900 son INVALID_BIRTH_DATE', () => {
    for (const v of [
      '2023-02-29',
      '1990-04-31',
      '1899-12-31',
      '2026-11-24',
      '2030-01-01',
      '1990/01/01',
      '',
    ])
      expect(problema(v, HOY), v).toBe('INVALID_BIRTH_DATE')
    expect(problema('1900-01-01', HOY)).toBeNull()
  })

  it('la fecha de hoy es válida pero no tiene 16', () => {
    expect(problema(HOY, HOY)).toBe('UNDER_MINIMUM_AGE')
  })

  it('el día UTC manda: a las 23:30 de Madrid ya es el día siguiente si UTC lo dice', () => {
    const schema = makeBirthDateSchema(() => new Date('2026-11-22T23:30:00Z'))
    expect(schema.safeParse('2010-11-23').success).toBe(false)
    const despues = makeBirthDateSchema(() => new Date('2026-11-23T00:30:00Z'))
    expect(despues.safeParse('2010-11-23').success).toBe(true)
  })
})
