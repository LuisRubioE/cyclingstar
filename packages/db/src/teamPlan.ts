import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { raceAttendanceCost } from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { teamRacePlan, teams } from './schema.js'

/**
 * Draft de calendario del equipo (lo hace el manager humano). Lista las carreras a las que su equipo
 * puede acudir esta temporada, con el coste de viaje por corredor desde el país del equipo y si están
 * elegidas; y permite añadir/quitar carreras del plan. Un equipo con plan corre EXACTAMENTE sus
 * carreras elegidas (la convocatoria lo respeta); sin plan, va en automático.
 */

const SEASON_DAYS = 364
/** Corredores que un equipo lleva a una carrera (tamaño de escuadra por formato). */
const SQUAD_SIZE: Record<string, number> = { 'gran-vuelta': 8, 'una-semana': 7, 'un-dia': 7 }

export interface TeamCalendarRace {
  raceId: string
  name: string
  country: string | null
  startDay: number
  level: string
  raceClass: string
  format: string
  /** Coste de viaje por corredor (transporte + hotel) desde el país del equipo. */
  travelPerRider: number
  /** Escuadra estimada; el coste total del equipo ≈ travelPerRider × squad. */
  squad: number
  /** El equipo ya la tiene en su plan. */
  drafted: boolean
}

export interface TeamCalendar {
  teamId: string
  teamName: string
  teamCountry: string | null
  hasPlan: boolean
  races: TeamCalendarRace[]
}

/** El equipo del que `userId` es dueño, o null. */
async function ownedTeam(db: Database, userId: string) {
  const rows = await db
    .select({ id: teams.id, name: teams.name, country: teams.country })
    .from(teams)
    .where(eq(teams.ownerUserId, userId))
    .limit(1)
  return rows[0] ?? null
}

/** Una carrera del calendario a la que un equipo de esta división puede acudir (no campeonato). */
function isEligible(race: (typeof SEASON_CALENDAR)[number], division: string): boolean {
  return !race.championshipCountry && race.openTo.includes(division as never)
}

/**
 * Calendario del equipo del usuario: carreras elegibles de esta temporada aún por empezar, con el
 * coste de viaje y si están en el plan. Vacío si el usuario no gestiona ningún equipo.
 */
export async function getTeamCalendar(
  db: Database,
  userId: string,
  currentDay: number,
): Promise<TeamCalendar | null> {
  const team = await ownedTeam(db, userId)
  if (!team) return null
  const season = Math.floor(currentDay / SEASON_DAYS)
  const dayOfSeason = currentDay % SEASON_DAYS

  const divRows = await db
    .select({ division: teams.division })
    .from(teams)
    .where(eq(teams.id, team.id))
    .limit(1)
  const division = divRows[0]?.division ?? 'CON'

  const plan = await db
    .select({ raceId: teamRacePlan.raceId })
    .from(teamRacePlan)
    .where(and(eq(teamRacePlan.teamId, team.id), eq(teamRacePlan.season, season)))
  const drafted = new Set(plan.map((p) => p.raceId))

  const races: TeamCalendarRace[] = SEASON_CALENDAR.filter(
    (r) => isEligible(r, division) && r.startDay > dayOfSeason,
  )
    .map((r) => {
      const cost = raceAttendanceCost(team.country, r.country ?? null, r.stages.length)
      return {
        raceId: r.id,
        name: r.name,
        country: r.country ?? null,
        startDay: r.startDay,
        level: r.level,
        raceClass: r.raceClass,
        format: r.format,
        travelPerRider: cost.money,
        squad: SQUAD_SIZE[r.format] ?? 7,
        drafted: drafted.has(r.id),
      }
    })
    .sort((a, b) => a.startDay - b.startDay)

  return {
    teamId: team.id,
    teamName: team.name,
    teamCountry: team.country,
    hasPlan: drafted.size > 0,
    races,
  }
}

/** Añade una carrera al plan del equipo del usuario (si es elegible y aún no ha empezado). */
export async function draftRace(
  db: Database,
  userId: string,
  raceId: string,
  currentDay: number,
): Promise<{ ok: boolean; error?: string }> {
  const team = await ownedTeam(db, userId)
  if (!team) return { ok: false, error: 'sin_equipo' }
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  const season = Math.floor(currentDay / SEASON_DAYS)
  const dayOfSeason = currentDay % SEASON_DAYS
  if (!race || race.championshipCountry) return { ok: false, error: 'no_elegible' }
  if (race.startDay <= dayOfSeason) return { ok: false, error: 'ya_empezada' }
  const divRows = await db
    .select({ division: teams.division })
    .from(teams)
    .where(eq(teams.id, team.id))
    .limit(1)
  if (!race.openTo.includes((divRows[0]?.division ?? 'CON') as never)) {
    return { ok: false, error: 'division_no_admitida' }
  }
  await db
    .insert(teamRacePlan)
    .values({ teamId: team.id, raceId, season, createdDay: currentDay })
    .onConflictDoNothing()
  return { ok: true }
}

/** Quita una carrera del plan del equipo del usuario (si aún no ha empezado). */
export async function undraftRace(
  db: Database,
  userId: string,
  raceId: string,
  currentDay: number,
): Promise<{ ok: boolean; error?: string }> {
  const team = await ownedTeam(db, userId)
  if (!team) return { ok: false, error: 'sin_equipo' }
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  const season = Math.floor(currentDay / SEASON_DAYS)
  const dayOfSeason = currentDay % SEASON_DAYS
  if (race && race.startDay <= dayOfSeason) return { ok: false, error: 'ya_empezada' }
  await db
    .delete(teamRacePlan)
    .where(
      and(
        eq(teamRacePlan.teamId, team.id),
        eq(teamRacePlan.raceId, raceId),
        eq(teamRacePlan.season, season),
      ),
    )
  return { ok: true }
}
