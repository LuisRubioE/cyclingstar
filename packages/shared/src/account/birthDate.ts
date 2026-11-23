import { z } from 'zod'
import { MIN_AGE_YEARS, MIN_BIRTH_YEAR } from './constants.js'

/**
 * LA REGLA DE LA EDAD (docs/cuenta.md §4.2; D-06, 4-a). La comparten la web, para el error en la página, y la
 * API, para la verdad: en better-auth corre como `validator.input` de `additionalFields.birthDate`, antes de
 * buscar el correo, así que el menor recibe el mismo 400 con un correo nuevo y con uno que ya tiene cuenta
 * (X-09). Los mensajes son los códigos, porque better-auth devuelve el `message` de la primera incidencia, y
 * la regla es síncrona: una asíncrona da 500 `ASYNC_VALIDATION_NOT_SUPPORTED`.
 */

export interface YearMonthDay {
  year: number
  month: number // 1 a 12
  day: number
}

export type BirthDateError = 'INVALID_BIRTH_DATE' | 'UNDER_MINIMUM_AGE'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` a sus tres números, o null si la fecha no existe (31 de abril, 29 de febrero de 2023). */
export function parseIsoDate(value: string): YearMonthDay | null {
  const m = ISO_DATE.exec(value)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null
  }
  return { year, month, day }
}

/** Años cumplidos el día UTC de `today`. Quien nació un 29 de febrero cumple el 1 de marzo en año no bisiesto. */
export function ageOn(birth: YearMonthDay, today: Date): number {
  const month = today.getUTCMonth() + 1
  const day = today.getUTCDate()
  const before = month < birth.month || (month === birth.month && day < birth.day)
  return today.getUTCFullYear() - birth.year - (before ? 1 : 0)
}

export function isOldEnough(birth: YearMonthDay, today: Date): boolean {
  return ageOn(birth, today) >= MIN_AGE_YEARS
}

/** La regla entera con un reloj inyectable, para los tests. */
export function makeBirthDateSchema(now: () => Date = () => new Date()) {
  return z.string().superRefine((value, ctx) => {
    const today = now()
    const birth = parseIsoDate(value)
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    if (
      birth === null ||
      birth.year < MIN_BIRTH_YEAR ||
      Date.UTC(birth.year, birth.month - 1, birth.day) > todayUtc
    ) {
      ctx.addIssue({ code: 'custom', message: 'INVALID_BIRTH_DATE' satisfies BirthDateError })
      return
    }
    if (!isOldEnough(birth, today)) {
      ctx.addIssue({ code: 'custom', message: 'UNDER_MINIMUM_AGE' satisfies BirthDateError })
    }
  })
}

export const birthDateSchema = makeBirthDateSchema()

/** El código de la primera incidencia de la regla, o null si la fecha vale. */
export function birthDateProblem(value: string, now: Date = new Date()): BirthDateError | null {
  const r = makeBirthDateSchema(() => now).safeParse(value)
  if (r.success) return null
  return r.error.issues[0]?.message === 'UNDER_MINIMUM_AGE'
    ? 'UNDER_MINIMUM_AGE'
    : 'INVALID_BIRTH_DATE'
}
