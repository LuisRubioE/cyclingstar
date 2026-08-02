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

/** Edad del corredor: debuta a los 20 y envejece una temporada por año (SPEC 3). */
export function riderAge(birthSeason: number, season: number): number {
  return 20 - birthSeason + season
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
