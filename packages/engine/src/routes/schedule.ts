/**
 * Calendario a días de juego (Paso 44 previo). Mapea el número de etapa de una carrera al día de la
 * temporada en que se corre, contando los descansos de las grandes vueltas (SPEC 8). Puro.
 */
import type { CalendarRace } from './calendar.js'

/**
 * Día de la temporada en que se corre una etapa (1-based) de la carrera, contando descansos **y
 * semietapas**: un descanso mete un día entre dos etapas y una semietapa lo quita, así que van a los
 * dos lados de la misma suma (R28.6, S-431).
 */
export function stageDayOfSeason(race: CalendarRace, stageIndex: number): number {
  const rest = race.restAfter ?? []
  const restBefore = rest.filter((r) => r < stageIndex).length
  const dobles = race.doubleAfter ?? []
  const doblesBefore = dobles.filter((d) => d < stageIndex).length
  return race.startDay + (stageIndex - 1) + restBefore - doblesBefore
}

/**
 * DÓNDE Y CUÁNDO SE CORRE UNA ETAPA, para el clima (v44). Existe para que solo haya UN sitio donde se
 * calcula: `packages/db` lo usa para correr la etapa y la API para dar el parte meteorológico de
 * antes, y si las dos cuentas se separaran el parte anunciaría el tiempo de otra carrera. Es
 * exactamente la clase de duplicado del que este motor ya ha sacado tres defectos.
 *
 * ANOTADO, Y A PROPÓSITO: el día NO descuenta las jornadas de descanso de una gran vuelta, así que
 * la etapa 20 usa el clima de una fecha dos días anterior a la que se corre. Sobre el coseno anual
 * del clima eso es menos de una décima de grado —ruido— y corregirlo movería resultados de etapas de
 * producción, así que se deja dicho aquí en vez de arreglarse de paso. Para la DISTANCIA en el
 * calendario (a cuántos días está la etapa) sí hay que usar `stageDayOfSeason`, que sí los cuenta.
 */
export function stagePlace(race: CalendarRace, stageIndex: number): { pais?: string; dia: number } {
  return {
    ...(race.country != null ? { pais: race.country } : {}),
    dia: race.startDay + (stageIndex - 1),
  }
}

/**
 * LAS ETAPAS que se corren en `dayOfSeason`, en orden. Normalmente cero o una; **dos cuando hay
 * semietapa** (R28.6, S-431), que es justo lo que `scheduledStageIndex` no podía decir.
 */
export function scheduledStageIndices(race: CalendarRace, dayOfSeason: number): number[] {
  const out: number[] = []
  for (let i = 1; i <= race.stages.length; i++) {
    if (stageDayOfSeason(race, i) === dayOfSeason) out.push(i)
  }
  return out
}

/**
 * Número de etapa (1-based) de la carrera que se corre en `dayOfSeason`, o null si ninguna.
 *
 * **La PRIMERA, si hay semietapa.** Sirve para preguntar «¿corre hoy esta carrera?»; quien vaya a
 * correrlas necesita `scheduledStageIndices`, porque con este de aquí la segunda mitad de una
 * jornada partida no se correría nunca y nadie se enteraría.
 */
export function scheduledStageIndex(race: CalendarRace, dayOfSeason: number): number | null {
  return scheduledStageIndices(race, dayOfSeason)[0] ?? null
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

/**
 * LAS CARRERAS QUE SE SOLAPAN CON ÉSTA (R28.6, S-470 · paso 18b).
 *
 * «Dos carreras la misma semana: la convocatoria de una RESTA de la otra; un cambio de última hora
 * en la grande deja a la pequeña sin ningún hombre para el frente.» La resta ya la hacía
 * `packages/db` al congelar las escuadras —al que está apuntado a una carrera solapada no se le
 * convoca en la otra—, pero **la cuenta de qué se solapa con qué vivía dentro de una consulta y no
 * la comprobaba nadie**. Aquí sale a función pura para poder sellarla.
 *
 * Dos carreras se solapan si sus ventanas —de la salida al último día, **contando los descansos**—
 * se tocan. Una carrera no se solapa consigo misma.
 */
export function overlappingRaces(
  race: CalendarRace,
  calendar: readonly CalendarRace[],
): CalendarRace[] {
  const start = race.startDay
  const end = raceLastDay(race)
  return calendar.filter((r) => r.id !== race.id && r.startDay <= end && start <= raceLastDay(r))
}
