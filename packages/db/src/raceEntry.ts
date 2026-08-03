import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { raceAttendanceCost } from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { raceEntries, riders } from './schema.js'

/**
 * Auto-inscripción del agente libre a carreras (economía de viajes). Un corredor humano SIN equipo
 * puede apuntarse a carreras del circuito continental (.1/.2) que se pueda permitir; paga su propio
 * viaje al convocarse la carrera. Aquí van el listado de carreras inscribibles y el alta/baja.
 */

const SEASON_DAYS = 364

export interface EnterableRace {
  raceId: string
  name: string
  country: string | null
  startDay: number
  raceClass: string
  /** Coste en dinero del viaje (transporte + hotel) desde la residencia del corredor. */
  travelMoney: number
  /** Días de viaje (no entrena) del desplazamiento. */
  travelDays: number
  /** El corredor ya está inscrito. */
  entered: boolean
  /** El corredor ya fue convocado y pagó (metido en el pelotón). */
  enrolled: boolean
  /** Al corredor le llega el dinero para el viaje. */
  affordable: boolean
}

/** ¿Es una carrera a la que un agente libre puede auto-inscribirse? Circuito continental, no campeonato. */
function isEnterable(raceLevel: string, isChampionship: boolean): boolean {
  return raceLevel === 'CON' && !isChampionship
}

/**
 * Carreras que un agente libre puede correr esta temporada: las continentales aún por empezar, con el
 * coste de viaje desde su residencia y si le llega el dinero. Vacío si el corredor tiene equipo (los
 * de equipo los convoca el equipo) o no existe.
 */
export async function getEnterableRaces(
  db: Database,
  riderId: string,
  currentDay: number,
): Promise<EnterableRace[]> {
  const rows = await db
    .select({
      teamId: riders.teamId,
      residence: riders.residence,
      country: riders.country,
      money: riders.money,
    })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  const me = rows[0]
  if (!me || me.teamId) return [] // solo agentes libres

  const season = Math.floor(currentDay / SEASON_DAYS)
  const dayOfSeason = currentDay % SEASON_DAYS
  const entries = await db
    .select({ raceId: raceEntries.raceId, enrolled: raceEntries.enrolled })
    .from(raceEntries)
    .where(and(eq(raceEntries.riderId, riderId), eq(raceEntries.season, season)))
  const entryByRace = new Map(entries.map((e) => [e.raceId, e.enrolled]))

  const from = me.residence ?? me.country
  return SEASON_CALENDAR.filter(
    (r) => isEnterable(r.level, !!r.championshipCountry) && r.startDay > dayOfSeason,
  )
    .map((r) => {
      const cost = raceAttendanceCost(from, r.country ?? null, r.stages.length)
      return {
        raceId: r.id,
        name: r.name,
        country: r.country ?? null,
        startDay: r.startDay,
        raceClass: r.raceClass,
        travelMoney: cost.money,
        travelDays: cost.days,
        entered: entryByRace.has(r.id),
        enrolled: entryByRace.get(r.id) ?? false,
        affordable: me.money >= cost.money,
      }
    })
    .sort((a, b) => a.startDay - b.startDay)
}

/** Da de alta la inscripción de un agente libre a una carrera continental aún por empezar. */
export async function enterRace(
  db: Database,
  riderId: string,
  raceId: string,
  currentDay: number,
): Promise<{ ok: boolean; error?: string }> {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race || !isEnterable(race.level, !!race.championshipCountry)) {
    return { ok: false, error: 'no_inscribible' }
  }
  const season = Math.floor(currentDay / SEASON_DAYS)
  const dayOfSeason = currentDay % SEASON_DAYS
  if (race.startDay <= dayOfSeason) return { ok: false, error: 'ya_empezada' }

  const rows = await db
    .select({ teamId: riders.teamId, userId: riders.userId })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  const me = rows[0]
  if (!me || me.teamId || !me.userId) return { ok: false, error: 'no_agente_libre' }

  await db
    .insert(raceEntries)
    .values({ riderId, raceId, season, createdDay: currentDay })
    .onConflictDoNothing()
  return { ok: true }
}

/** Cancela la inscripción de un agente libre a una carrera, si aún no ha sido convocado (pagado). */
export async function withdrawRace(
  db: Database,
  riderId: string,
  raceId: string,
  currentDay: number,
): Promise<{ ok: boolean; error?: string }> {
  const season = Math.floor(currentDay / SEASON_DAYS)
  const existing = await db
    .select({ enrolled: raceEntries.enrolled })
    .from(raceEntries)
    .where(
      and(
        eq(raceEntries.riderId, riderId),
        eq(raceEntries.raceId, raceId),
        eq(raceEntries.season, season),
      ),
    )
    .limit(1)
  if (existing[0]?.enrolled) return { ok: false, error: 'ya_convocado' }
  await db
    .delete(raceEntries)
    .where(
      and(
        eq(raceEntries.riderId, riderId),
        eq(raceEntries.raceId, raceId),
        eq(raceEntries.season, season),
      ),
    )
  return { ok: true }
}
