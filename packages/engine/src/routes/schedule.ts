/**
 * Calendario a días de juego (Paso 44 previo). Mapea el número de etapa de una carrera al día de la
 * temporada en que se corre, contando los descansos de las grandes vueltas (SPEC 8). Puro.
 */
import type { CalendarRace } from './calendar.js'

/** Día de la temporada en que se corre una etapa (1-based) de la carrera, contando descansos. */
export function stageDayOfSeason(race: CalendarRace, stageIndex: number): number {
  const rest = race.restAfter ?? []
  const restBefore = rest.filter((r) => r < stageIndex).length
  return race.startDay + (stageIndex - 1) + restBefore
}

/** Número de etapa (1-based) de la carrera que se corre en `dayOfSeason`, o null si ninguna. */
export function scheduledStageIndex(race: CalendarRace, dayOfSeason: number): number | null {
  for (let i = 1; i <= race.stages.length; i++) {
    if (stageDayOfSeason(race, i) === dayOfSeason) return i
  }
  return null
}

/** Día de la temporada de la última etapa (fin de la carrera, contando descansos). */
export function raceLastDay(race: CalendarRace): number {
  return stageDayOfSeason(race, race.stages.length)
}

/**
 * ¿La carrera está EN CURSO en `dayOfSeason` habiendo empezado antes? (arrancó en un día previo y aún
 * no ha terminado). Sirve para saber qué corredores están ocupados y no pueden ir a otra carrera.
 */
export function raceOngoingBefore(race: CalendarRace, dayOfSeason: number): boolean {
  return race.startDay < dayOfSeason && dayOfSeason <= raceLastDay(race)
}
