import { SEASON_CALENDAR, TEST_TOUR, raceLastDay, stageDayOfSeason } from '@cyclingstar/engine'
import { eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { raceRosters } from './schema.js'

/**
 * Días de juego en los que un corredor tiene carrera (#6): de sus convocatorias (race_rosters),
 * traducidas a días de juego absolutos según la vuelta de prueba o el calendario. Sirve para no
 * dejar entrenar un día de carrera en el planificador.
 */

const SEASON_DAYS = 364

/** Conjunto de días de juego con carrera para el corredor, dentro de [fromDay, toDay]. */
export async function getRiderRaceDays(
  db: Database,
  riderId: string,
  fromDay: number,
  toDay: number,
): Promise<number[]> {
  const rosters = await db
    .select({ raceId: raceRosters.raceId })
    .from(raceRosters)
    .where(eq(raceRosters.riderId, riderId))

  const days = new Set<number>()
  for (const { raceId } of rosters) {
    if (raceId === 'test-tour') {
      for (const stage of TEST_TOUR) {
        if (stage.day >= fromDay && stage.day <= toDay) days.add(stage.day)
      }
      continue
    }
    // Clave del calendario: `${raceId}:s${season}`.
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue
    const baseId = m[1]!
    const season = Number(m[2])
    const race = SEASON_CALENDAR.find((r) => r.id === baseId)
    if (!race) continue
    for (let idx = 1; idx <= race.stages.length; idx++) {
      const gameDay = season * SEASON_DAYS + stageDayOfSeason(race, idx)
      if (gameDay >= fromDay && gameDay <= toDay) days.add(gameDay)
    }
  }
  return [...days].sort((a, b) => a - b)
}

/** Una carrera próxima (o en curso) del corredor: nombre, clase, día de salida y cuánto falta. */
export interface RiderUpcomingRace {
  raceId: string
  /** Clave de almacenamiento de la carrera+temporada (`${raceId}:s${season}`), para órdenes/roster. */
  raceKey: string
  raceName: string
  raceClass: string
  country: string | null
  startGameDay: number
  daysUntil: number
  stageCount: number
  ongoing: boolean
}

/**
 * Carreras a las que el corredor está inscrito y aún no han terminado (su convocatoria ya congelada en
 * race_rosters ~2 semanas antes). Ordenadas por día de salida; incluye las que están en curso hoy.
 */
export async function getRiderUpcomingRaces(
  db: Database,
  riderId: string,
  currentDay: number,
): Promise<RiderUpcomingRace[]> {
  const rosters = await db
    .select({ raceId: raceRosters.raceId })
    .from(raceRosters)
    .where(eq(raceRosters.riderId, riderId))
  const out: RiderUpcomingRace[] = []
  for (const { raceId } of rosters) {
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue // la vuelta de prueba (test-tour) no cuenta como carrera del calendario
    const baseId = m[1]!
    const season = Number(m[2])
    const race = SEASON_CALENDAR.find((r) => r.id === baseId)
    if (!race) continue
    const startGameDay = season * SEASON_DAYS + race.startDay
    const lastGameDay = season * SEASON_DAYS + raceLastDay(race)
    if (lastGameDay < currentDay) continue // ya terminó
    out.push({
      raceId: baseId,
      raceKey: raceId,
      raceName: race.name,
      raceClass: race.raceClass,
      country: race.country ?? null,
      startGameDay,
      daysUntil: startGameDay - currentDay,
      stageCount: race.stages.length,
      ongoing: startGameDay <= currentDay && currentDay <= lastGameDay,
    })
  }
  return out.sort((a, b) => a.startGameDay - b.startGameDay)
}
