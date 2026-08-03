import { type CalendarRace, SEASON_CALENDAR } from '@cyclingstar/engine'
import { type Continent, continentForCountry, raceAttendanceCost } from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { teamRacePlan, teams } from './schema.js'

/**
 * Draft de calendario del equipo (lo hace el manager humano). El equipo parte de su calendario
 * NATURAL —sus carreras de casa— y el manager solo guarda EXCEPCIONES: saltar una natural o añadir una
 * que no lo es (viajar fuera). Sin excepción, corre su calendario natural. La convocatoria respeta
 * esto para los equipos con dueño; los bots van en automático.
 */

const SEASON_DAYS = 364
/** Corredores que un equipo lleva a una carrera (tamaño de escuadra por formato). */
const SQUAD_SIZE: Record<string, number> = { 'gran-vuelta': 8, 'una-semana': 7, 'un-dia': 7 }

/**
 * ¿Es una carrera del calendario NATURAL de un equipo? Un continental corre las continentales de su
 * continente (su circuito de casa); un WorldTour corre las .WT; un ProTeam las .Pro. El resto (viajar
 * a otro continente, o que un WT/Pro baje a una continental) no es natural: el manager la AÑADE si
 * quiere. Los campeonatos nunca entran (pelotón individual).
 */
export function isNaturalRace(
  race: CalendarRace,
  division: string,
  teamContinent: Continent | null,
): boolean {
  if (race.championshipCountry) return false
  if (race.region) return division === 'CON' && race.region === teamContinent
  return (
    (race.raceClass === 'WT' && division === 'WT') ||
    (race.raceClass === 'Pro' && division === 'PRS')
  )
}

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
  /** Está en el calendario del equipo (natural o añadida, sin saltar). */
  drafted: boolean
  /** Es del calendario natural del equipo (viene marcada por defecto). */
  natural: boolean
}

export interface TeamCalendar {
  teamId: string
  teamName: string
  teamCountry: string | null
  races: TeamCalendarRace[]
}

/** El equipo del que `userId` es dueño, o null. */
async function ownedTeam(db: Database, userId: string) {
  const rows = await db
    .select({ id: teams.id, name: teams.name, country: teams.country, division: teams.division })
    .from(teams)
    .where(eq(teams.ownerUserId, userId))
    .limit(1)
  return rows[0] ?? null
}

/** Una carrera del calendario a la que un equipo de esta división puede acudir (no campeonato). */
function isEligible(race: CalendarRace, division: string): boolean {
  return !race.championshipCountry && race.openTo.includes(division as never)
}

/**
 * Calendario del equipo del usuario: carreras elegibles de esta temporada aún por empezar, marcando
 * las que están en su calendario (natural por defecto, salvo excepción) y cuáles son naturales. Vacío
 * si el usuario no gestiona ningún equipo.
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
  const continent = continentForCountry(team.country ?? '')

  const overrideRows = await db
    .select({ raceId: teamRacePlan.raceId, attend: teamRacePlan.attend })
    .from(teamRacePlan)
    .where(and(eq(teamRacePlan.teamId, team.id), eq(teamRacePlan.season, season)))
  const override = new Map(overrideRows.map((o) => [o.raceId, o.attend]))

  const races: TeamCalendarRace[] = SEASON_CALENDAR.filter(
    (r) => isEligible(r, team.division) && r.startDay > dayOfSeason,
  )
    .map((r) => {
      const natural = isNaturalRace(r, team.division, continent)
      const drafted = override.has(r.id) ? override.get(r.id)! : natural
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
        drafted,
        natural,
      }
    })
    .sort((a, b) => a.startDay - b.startDay)

  return { teamId: team.id, teamName: team.name, teamCountry: team.country, races }
}

/**
 * Fija si el equipo del usuario acude a una carrera. Guarda solo la EXCEPCIÓN frente a su calendario
 * natural: si `attend` coincide con lo natural, borra la fila (vuelve al comportamiento por defecto);
 * si difiere, la guarda. Así "quitar" una carrera natural o "añadir" una de fuera son overrides, y
 * deshacerlos vuelve al natural.
 */
async function setAttend(
  db: Database,
  userId: string,
  raceId: string,
  attend: boolean,
  currentDay: number,
): Promise<{ ok: boolean; error?: string }> {
  const team = await ownedTeam(db, userId)
  if (!team) return { ok: false, error: 'sin_equipo' }
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  const season = Math.floor(currentDay / SEASON_DAYS)
  const dayOfSeason = currentDay % SEASON_DAYS
  if (!race || !isEligible(race, team.division)) return { ok: false, error: 'no_elegible' }
  if (race.startDay <= dayOfSeason) return { ok: false, error: 'ya_empezada' }

  const natural = isNaturalRace(race, team.division, continentForCountry(team.country ?? ''))
  if (attend === natural) {
    // Vuelve al comportamiento natural: no hace falta excepción.
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
  await db
    .insert(teamRacePlan)
    .values({ teamId: team.id, raceId, season, createdDay: currentDay, attend })
    .onConflictDoUpdate({
      target: [teamRacePlan.teamId, teamRacePlan.raceId, teamRacePlan.season],
      set: { attend },
    })
  return { ok: true }
}

/** Añade una carrera al calendario del equipo (acude, aunque no sea natural). */
export function draftRace(
  db: Database,
  userId: string,
  raceId: string,
  currentDay: number,
): Promise<{ ok: boolean; error?: string }> {
  return setAttend(db, userId, raceId, true, currentDay)
}

/** Quita una carrera del calendario del equipo (la salta, aunque sea natural). */
export function undraftRace(
  db: Database,
  userId: string,
  raceId: string,
  currentDay: number,
): Promise<{ ok: boolean; error?: string }> {
  return setAttend(db, userId, raceId, false, currentDay)
}
