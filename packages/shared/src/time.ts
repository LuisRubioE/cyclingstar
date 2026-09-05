/**
 * Utilidades de tiempo del mundo (SPEC 2), puras y compartidas por api y web.
 * Temporada = 364 días de juego; 1 día de juego = TICK_INTERVAL_MINUTES reales (6h por defecto).
 */

import { seededRng } from './rng.js'

export const DAYS_PER_SEASON = 364

/** Temporada 0-indexada del día de juego (convención del backend: floor(gameDay/364)). */
export function currentSeason(gameDay: number): number {
  return Math.floor(Math.max(0, gameDay) / DAYS_PER_SEASON)
}

/**
 * LA ÉPOCA DE LAS EDADES. `birthSeason` no es un año: es un DESPLAZAMIENTO contra esta constante, de
 * forma que un corredor con `birthSeason` igual a la temporada en curso tiene 20 años. Estaba como
 * un 20 suelto dentro de `riderAge` —y repetido a mano en `packages/db/src/rollover.ts` y en
 * `browse.ts`— así que se le pone nombre y se deja dicho lo que significa: cambiarla RECALCULA la
 * edad de todos los corredores que ya existen, porque sus `birthSeason` se guardaron contra ella.
 */
export const RIDER_AGE_EPOCH = 20

/**
 * A QUÉ EDAD ENTRA UN JUGADOR NUEVO. **Dieciocho**, por decisión del dueño: «yo diría que empiecen
 * con 18 años… con stats casi a cero, sin equipo… y así para cuando cumplan 19 y 20 ya pueden tener
 * mejores stats, quizás un equipo».
 *
 * La v47 lo había puesto en 19 con un argumento de reglamento —un equipo UCI Continental se compone
 * de corredores élite y/o sub-23, y la categoría sub-23 empieza a los 19—, y el dueño lo corrigió
 * después: el arco que quiere empieza un año antes, en la edad a la que Pogačar andaba por el
 * Ljubljana. El reglamento describe cuándo te pueden FICHAR, no cuándo eres ciclista, y aquí se
 * empieza justamente sin equipo.
 */
export const PLAYER_START_AGE = 18

/** Edad del corredor: envejece una temporada por año (SPEC 3). */
export function riderAge(birthSeason: number, season: number): number {
  return RIDER_AGE_EPOCH - birthSeason + season
}

/** La `birthSeason` que hay que guardar para que un corredor tenga `age` años en `season`. */
export function birthSeasonForAge(age: number, season: number): number {
  return RIDER_AGE_EPOCH - age + season
}

/**
 * Día de la temporada [1,364] en que el corredor cumple años. Determinista a partir de su semilla
 * (id): solo cosmético (el envejecimiento sigue ocurriendo en el cierre de temporada).
 */
export function birthdayDayOfSeason(seed: string): number {
  return 1 + Math.floor(seededRng(`bday:${seed}`)() * DAYS_PER_SEASON)
}

export interface SeasonPosition {
  season: number
  dayOfSeason: number
}

/** Convierte el día de juego global (1-indexado) en temporada y día dentro de la temporada. */
export function seasonPosition(gameDay: number): SeasonPosition {
  if (gameDay < 1) {
    return { season: 1, dayOfSeason: 0 }
  }
  const zeroBased = gameDay - 1
  return {
    season: Math.floor(zeroBased / DAYS_PER_SEASON) + 1,
    dayOfSeason: (zeroBased % DAYS_PER_SEASON) + 1,
  }
}

/** Instante del próximo tick, alineado al intervalo desde el epoch (cron cada N minutos). */
export function nextTickAt(now: Date, intervalMinutes: number): Date {
  const ms = intervalMinutes * 60_000
  return new Date((Math.floor(now.getTime() / ms) + 1) * ms)
}

/** Formatea una cuenta atrás en milisegundos como "5h 23m 41s" (omite horas/minutos a cero). */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (hours > 0 || minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}
