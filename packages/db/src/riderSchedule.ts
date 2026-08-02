import { SEASON_CALENDAR, TEST_TOUR, stageDayOfSeason } from '@cyclingstar/engine'
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
