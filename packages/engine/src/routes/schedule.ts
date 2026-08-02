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
