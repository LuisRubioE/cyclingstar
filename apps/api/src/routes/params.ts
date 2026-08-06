import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { z } from 'zod'

/**
 * Validación de los parámetros de ruta. Antes iban directos a la base de datos: un `:id` que no
 * fuera un uuid hacía reventar la consulta de Postgres (`invalid input syntax for type uuid`) y el
 * manejador de errores lo traducía a un 500. Un id mal formado es culpa del cliente (400), o
 * simplemente un recurso que no existe (404), nunca un error del servidor.
 */

/** Todos los ids del modelo son uuid generados por Postgres (SPEC 11). */
const uuidSchema = z.string().uuid()

/** Devuelve el uuid si el valor lo es; null si no. */
export function parseUuid(value: string): string | null {
  const parsed = uuidSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/**
 * Id de carrera del calendario: un slug estable de autoría del motor ('tour-de-france',
 * 'test-tour'). Se valida por FORMA aquí y, cuando la ruta lo necesita, por pertenencia al
 * calendario con `isCalendarRaceId`.
 */
const raceSlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

/** Devuelve el id de carrera si tiene forma de slug; null si no. */
export function parseRaceId(value: string): string | null {
  const parsed = raceSlugSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/** Si el id corresponde a una carrera real del calendario de temporada. */
export function isCalendarRaceId(raceId: string): boolean {
  return SEASON_CALENDAR.some((race) => race.id === raceId)
}

/** Día de etapa: entero positivo pequeño (las carreras más largas tienen 21 etapas). */
const stageDaySchema = z.coerce.number().int().min(1).max(60)

/** Devuelve el día de etapa si es un entero válido; null si no. */
export function parseStageDay(value: string): number | null {
  const parsed = stageDaySchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/**
 * Clave de carrera-temporada, `${raceId}:s${season}`, tal como la guarda la base de datos.
 * Devuelve sus partes solo si el id es una carrera real del calendario.
 */
export function parseRaceKey(value: string): { raceId: string; season: number } | null {
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*):s(\d{1,4})$/.exec(value)
  if (!match?.[1] || !match[2]) return null
  const raceId = match[1]
  if (!isCalendarRaceId(raceId)) return null
  return { raceId, season: Number(match[2]) }
}
