/**
 * Utilidades de tiempo del mundo (SPEC 2), puras y compartidas por api y web.
 * Temporada = 364 días de juego; 1 día de juego = TICK_INTERVAL_MINUTES reales (6h por defecto).
 */

export const DAYS_PER_SEASON = 364

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
