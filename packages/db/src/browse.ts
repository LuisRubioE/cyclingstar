import { ATTRIBUTES, type Attribute, type Vocation } from '@cyclingstar/shared'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { getSeasonRank } from './riders.js'
import { riderAttrs, riders, teams } from './schema.js'

/**
 * Consultas de exploración del mundo (feedback #13/#14/#15): lista de equipos, ficha de equipo y
 * ficha pública de un corredor. Los corredores NPC se marcan como bots (userId nulo).
 */

export interface TeamListRow {
  id: string
  name: string
  country: string | null
  division: string
  budget: number
  pointsSeason: number
  jerseySeed: string
  riderCount: number
}

/** Todos los equipos del mundo, por categoría (división) y, dentro de cada una, por puntos (#13). */
export async function getTeams(db: Database, worldId: string): Promise<TeamListRow[]> {
  // Los puntos del equipo se calculan EN VIVO como la suma de los puntos de su plantilla (la columna
  // teams.points_season no se mantenía: siempre estaba a 0). Así se reflejan de verdad y se resetean
  // solos al reiniciar los puntos de los corredores en el rollover.
  const teamPoints = sql<number>`coalesce(sum(${riders.seasonPoints}), 0)::int`
  const divisionRank = sql`case ${teams.division} when 'WT' then 0 when 'PRS' then 1 else 2 end`
  return db
    .select({
      id: teams.id,
      name: teams.name,
      country: teams.country,
      division: teams.division,
      budget: teams.budget,
      pointsSeason: teamPoints,
      jerseySeed: teams.jerseySeed,
      riderCount: sql<number>`count(${riders.id})::int`,
    })
    .from(teams)
    .leftJoin(riders, and(eq(riders.teamId, teams.id), isNull(riders.retiredAt)))
    .where(eq(teams.worldId, worldId))
    .groupBy(teams.id)
    .orderBy(divisionRank, desc(teamPoints), desc(teams.budget))
}

export interface TeamRiderRow {
  id: string
  name: string
  country: string
  archetype: string
  isBot: boolean
  seasonPoints: number
  /** Extranjero en el equipo: su nacionalidad no es la del equipo (vive fuera de casa, paga alquiler). */
  foreign: boolean
}

export interface TeamDetail {
  id: string
  name: string
  country: string | null
  division: string
  budget: number
  pointsSeason: number
  jerseySeed: string
  /** true si lo gestiona un jugador (tiene dueño); false si sigue siendo NPC. */
  human: boolean
  roster: TeamRiderRow[]
}

/** Ficha de un equipo con su plantilla (#15). */
export async function getTeamDetail(db: Database, teamId: string): Promise<TeamDetail | null> {
  const teamRows = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1)
  const team = teamRows[0]
  if (!team) return null
  const roster = await db
    .select({
      id: riders.id,
      name: riders.name,
      country: riders.country,
      archetype: riders.archetype,
      userId: riders.userId,
      seasonPoints: riders.seasonPoints,
    })
    .from(riders)
    .where(and(eq(riders.teamId, teamId), isNull(riders.retiredAt)))
    .orderBy(desc(riders.seasonPoints))
  // Puntos del equipo = suma en vivo de los de su plantilla (la columna almacenada no se mantiene).
  const pointsSeason = roster.reduce((sum, r) => sum + r.seasonPoints, 0)
  return {
    id: team.id,
    name: team.name,
    country: team.country,
    division: team.division,
    budget: team.budget,
    pointsSeason,
    jerseySeed: team.jerseySeed,
    human: team.ownerUserId !== null,
    roster: roster.map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      archetype: r.archetype,
      isBot: r.userId === null,
      seasonPoints: r.seasonPoints,
      foreign: team.country != null && r.country !== team.country,
    })),
  }
}

export interface CountrySummaryRow {
  country: string
  riderCount: number
  totalPoints: number
}

/** Países con corredores en activo, con cuántos y su total de puntos de temporada (ranking, #7). */
export async function getCountriesSummary(
  db: Database,
  worldId: string,
): Promise<CountrySummaryRow[]> {
  const totalPoints = sql<number>`coalesce(sum(${riders.seasonPoints}), 0)::int`
  const rows = await db
    .select({
      country: riders.country,
      riderCount: sql<number>`count(${riders.id})::int`,
      totalPoints,
    })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNull(riders.retiredAt)))
    .groupBy(riders.country)
    .orderBy(desc(totalPoints), desc(sql`count(${riders.id})`))
  return rows.map((r) => ({
    country: r.country,
    riderCount: r.riderCount,
    totalPoints: r.totalPoints,
  }))
}

export interface CountryRiderRow {
  id: string
  name: string
  archetype: string
  isBot: boolean
  teamId: string | null
  teamName: string | null
  seasonPoints: number
  fame: number
}

/** Corredores en activo de un país, ordenados por puntos de temporada (ranking nacional, #7). */
export async function getCountryRiders(
  db: Database,
  worldId: string,
  country: string,
): Promise<CountryRiderRow[]> {
  const rows = await db
    .select({
      id: riders.id,
      name: riders.name,
      archetype: riders.archetype,
      userId: riders.userId,
      teamId: riders.teamId,
      teamName: teams.name,
      seasonPoints: riders.seasonPoints,
      fame: riders.fame,
    })
    .from(riders)
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(
      and(
        eq(riders.worldId, worldId),
        isNull(riders.retiredAt),
        eq(riders.country, country.toUpperCase()),
      ),
    )
    .orderBy(desc(riders.seasonPoints), desc(riders.fame))
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    archetype: r.archetype,
    isBot: r.userId === null,
    teamId: r.teamId,
    teamName: r.teamName,
    seasonPoints: r.seasonPoints,
    fame: r.fame,
  }))
}

export interface FreeAgentRow {
  id: string
  name: string
  country: string
  archetype: string
  age: number
  isBot: boolean
  seasonPoints: number
  fame: number
}

/**
 * Agentes libres (sin equipo, en activo): corredores fichables del mercado (#20). Filtrable por
 * país y vocación, ordenado por fama y puntos. `season` (0-indexed) para calcular la edad.
 */
export async function getFreeAgents(
  db: Database,
  worldId: string,
  season: number,
  opts: { country?: string; archetype?: string; limit?: number } = {},
): Promise<FreeAgentRow[]> {
  const conds = [eq(riders.worldId, worldId), isNull(riders.retiredAt), isNull(riders.teamId)]
  if (opts.country) conds.push(eq(riders.country, opts.country.toUpperCase()))
  if (opts.archetype) conds.push(eq(riders.archetype, opts.archetype as Vocation))
  const rows = await db
    .select({
      id: riders.id,
      name: riders.name,
      country: riders.country,
      archetype: riders.archetype,
      birthSeason: riders.birthSeason,
      userId: riders.userId,
      seasonPoints: riders.seasonPoints,
      fame: riders.fame,
    })
    .from(riders)
    .where(and(...conds))
    .orderBy(desc(riders.fame), desc(riders.seasonPoints))
    .limit(opts.limit ?? 120)
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    country: r.country,
    archetype: r.archetype,
    age: 20 - r.birthSeason + season,
    isBot: r.userId === null,
    seasonPoints: r.seasonPoints,
    fame: r.fame,
  }))
}

export interface PublicRiderDetail {
  id: string
  name: string
  country: string
  /** País de residencia (dónde vive/entrena). Igual a `country` si vive en su país. */
  residence: string
  archetype: string
  age: number
  isBot: boolean
  teamId: string | null
  teamName: string | null
  seasonPoints: number
  seasonRank: number
  fieldSize: number
  fame: number
  attributes: Record<Attribute, number>
}

/** Ficha pública de un corredor (#14). `season` para calcular la edad. */
export async function getPublicRider(
  db: Database,
  riderId: string,
  season: number,
): Promise<PublicRiderDetail | null> {
  const rows = await db
    .select({
      id: riders.id,
      name: riders.name,
      country: riders.country,
      residence: riders.residence,
      archetype: riders.archetype,
      birthSeason: riders.birthSeason,
      worldId: riders.worldId,
      userId: riders.userId,
      teamId: riders.teamId,
      teamName: teams.name,
      seasonPoints: riders.seasonPoints,
      fame: riders.fame,
    })
    .from(riders)
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(eq(riders.id, riderId))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  const attrRows = await db
    .select({ attr: riderAttrs.attr, value: riderAttrs.value })
    .from(riderAttrs)
    .where(eq(riderAttrs.riderId, riderId))
  const attributes = {} as Record<Attribute, number>
  for (const a of ATTRIBUTES) attributes[a] = 0
  for (const row of attrRows) attributes[row.attr] = row.value
  const rank = await getSeasonRank(db, r.worldId, r.seasonPoints)
  return {
    id: r.id,
    name: r.name,
    country: r.country,
    residence: r.residence ?? r.country,
    archetype: r.archetype,
    age: 20 - r.birthSeason + season,
    isBot: r.userId === null,
    teamId: r.teamId,
    teamName: r.teamName,
    seasonPoints: r.seasonPoints,
    seasonRank: rank.seasonRank,
    fieldSize: rank.fieldSize,
    fame: r.fame,
    attributes,
  }
}
