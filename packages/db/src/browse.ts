import { ATTRIBUTES, type Attribute } from '@cyclingstar/shared'
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
  division: string
  budget: number
  pointsSeason: number
  jerseySeed: string
  riderCount: number
}

/** Todos los equipos del mundo, por división y puntos (#13). */
export async function getTeams(db: Database, worldId: string): Promise<TeamListRow[]> {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      division: teams.division,
      budget: teams.budget,
      pointsSeason: teams.pointsSeason,
      jerseySeed: teams.jerseySeed,
      riderCount: sql<number>`count(${riders.id})::int`,
    })
    .from(teams)
    .leftJoin(riders, and(eq(riders.teamId, teams.id), isNull(riders.retiredAt)))
    .where(eq(teams.worldId, worldId))
    .groupBy(teams.id)
    .orderBy(desc(teams.pointsSeason), desc(teams.budget))
}

export interface TeamRiderRow {
  id: string
  name: string
  country: string
  archetype: string
  isBot: boolean
  seasonPoints: number
}

export interface TeamDetail {
  id: string
  name: string
  division: string
  budget: number
  pointsSeason: number
  jerseySeed: string
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
  return {
    id: team.id,
    name: team.name,
    division: team.division,
    budget: team.budget,
    pointsSeason: team.pointsSeason,
    jerseySeed: team.jerseySeed,
    roster: roster.map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      archetype: r.archetype,
      isBot: r.userId === null,
      seasonPoints: r.seasonPoints,
    })),
  }
}

export interface CountrySummaryRow {
  country: string
  riderCount: number
}

/** Países con corredores en activo, con cuántos (para la lista de naciones, #7). */
export async function getCountriesSummary(
  db: Database,
  worldId: string,
): Promise<CountrySummaryRow[]> {
  const rows = await db
    .select({
      country: riders.country,
      riderCount: sql<number>`count(${riders.id})::int`,
    })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNull(riders.retiredAt)))
    .groupBy(riders.country)
    .orderBy(desc(sql`count(${riders.id})`))
  return rows.map((r) => ({ country: r.country, riderCount: r.riderCount }))
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

export interface PublicRiderDetail {
  id: string
  name: string
  country: string
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
