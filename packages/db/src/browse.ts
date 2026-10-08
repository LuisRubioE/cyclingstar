import { ATTRIBUTES, type Attribute, type Vocation } from '@cyclingstar/shared'
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { type Horizon, type VeilDelta, veilDelta } from './horizon.js'
import { compareIds, seasonMinus, topAtHorizon } from './ranking.js'
import { type HealthState, getSeasonRank } from './riders.js'
import { riderAttrs, riders, teams } from './schema.js'

/**
 * Consultas de exploración del mundo (feedback #13/#14/#15): lista de equipos, ficha de equipo y
 * ficha pública de un corredor. Los corredores NPC se marcan como bots (userId nulo).
 *
 * BAJO EL VELO (E2, docs/retransmision.md §10.6, §11.5 y §11.13; paso 8b): los puntos de la temporada,
 * el presupuesto y la salud se sirven al horizonte de quien pide. R resta lo que sus etapas veladas
 * dieron (`VeilDelta.points` y `.budget`, este con `stage_team_results.prize`, DD-26) y reordena con lo
 * restado; M enseña la salud de antes de la caída velada (`VeilDelta.health`). Los atributos de la
 * ficha de un corredor son L (DD-08, sup. X11).
 */

/**
 * Lo velado de los puntos de la temporada, sumado por lo que diga `keyOf` de cada corredor en activo
 * del mundo (su equipo de hoy, su país): la resta de un agregado (sups. P6 y W5). Sin nada velado, sin
 * consulta.
 */
async function seasonMinusBy(
  db: Database,
  d: VeilDelta,
  worldId: string,
  keyOf: (r: { readonly teamId: string | null; readonly country: string }) => string | null,
): Promise<ReadonlyMap<string, number>> {
  const out = new Map<string, number>()
  if (d.points.size === 0) return out
  const rows = await db
    .select({ id: riders.id, teamId: riders.teamId, country: riders.country })
    .from(riders)
    .where(
      and(
        eq(riders.worldId, worldId),
        isNull(riders.retiredAt),
        sql`${riders.id} = any(${sql.param([...d.points.keys()])}::uuid[])`,
      ),
    )
  for (const r of rows) {
    const key = keyOf(r)
    const m = seasonMinus(d, r.id)
    if (key !== null && m !== 0) out.set(key, (out.get(key) ?? 0) + m)
  }
  return out
}

/** La salud que `h` puede ver de un corredor: la suya, o la de antes de su caída velada (M, sup. P5). */
function healthAt(
  d: VeilDelta,
  riderId: string,
  health: string,
  untilDay: number | null,
): { state: HealthState; untilDay: number | null } {
  const before = d.health.get(riderId)
  return before === undefined
    ? { state: health as HealthState, untilDay }
    : { state: before.health, untilDay: before.untilDay }
}

/** El orden de la categoría de un equipo: WorldTour, ProSeries y el resto. */
const divisionRank = (division: string): number =>
  division === 'WT' ? 0 : division === 'PRS' ? 1 : 2

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

/**
 * Todos los equipos del mundo, por categoría (división) y, dentro de cada una, por puntos (#13), por
 * presupuesto y por id. R (E2, §10.6; sups. P6 y W5; 8b): los puntos y el presupuesto a horizonte, y el
 * orden rehecho con ellos.
 */
export async function getTeams(db: Database, h: Horizon, worldId: string): Promise<TeamListRow[]> {
  // Los puntos del equipo se calculan EN VIVO como la suma de los puntos de su plantilla (la columna
  // teams.points_season no se mantenía: siempre estaba a 0). Así se reflejan de verdad y se resetean
  // solos al reiniciar los puntos de los corredores en el rollover.
  const teamPoints = sql<number>`coalesce(sum(${riders.seasonPoints}), 0)::int`
  const d = await veilDelta(db, h)
  const rows = await db
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
  const minus = await seasonMinusBy(db, d, worldId, (r) => r.teamId)
  return rows
    .map((r) => ({
      ...r,
      pointsSeason: r.pointsSeason - (minus.get(r.id) ?? 0),
      budget: r.budget - (d.budget.get(r.id) ?? 0),
    }))
    .sort(
      (a, b) =>
        divisionRank(a.division) - divisionRank(b.division) ||
        b.pointsSeason - a.pointsSeason ||
        b.budget - a.budget ||
        compareIds(a.id, b.id),
    )
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
  /** Estado de salud (sano / molestias / enfermo / lesionado): el mánager ve quién no está disponible. */
  health: string
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

/**
 * Ficha de un equipo con su plantilla (#15), por puntos y por id. R y M (E2, §10.6; sups. P5 y P6; 8b):
 * los puntos y el presupuesto a horizonte, y la salud de antes de una caída velada. El presupuesto
 * velado es una cota inferior del real, que no bloquea ninguna decisión (DD-26, 11-t).
 */
export async function getTeamDetail(
  db: Database,
  h: Horizon,
  teamId: string,
): Promise<TeamDetail | null> {
  const teamRows = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1)
  const team = teamRows[0]
  if (!team) return null
  const d = await veilDelta(db, h)
  const rows = await db
    .select({
      id: riders.id,
      name: riders.name,
      country: riders.country,
      archetype: riders.archetype,
      userId: riders.userId,
      seasonPoints: riders.seasonPoints,
      health: riders.health,
      healthUntilDay: riders.healthUntilDay,
    })
    .from(riders)
    .where(and(eq(riders.teamId, teamId), isNull(riders.retiredAt)))
  const roster = rows
    .map((r) => ({ ...r, seasonPoints: r.seasonPoints - seasonMinus(d, r.id) }))
    .sort((a, b) => b.seasonPoints - a.seasonPoints || compareIds(a.id, b.id))
  // Puntos del equipo = suma en vivo de los de su plantilla (la columna almacenada no se mantiene).
  const pointsSeason = roster.reduce((sum, r) => sum + r.seasonPoints, 0)
  return {
    id: team.id,
    name: team.name,
    country: team.country,
    division: team.division,
    budget: team.budget - (d.budget.get(team.id) ?? 0),
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
      health: healthAt(d, r.id, r.health, r.healthUntilDay).state,
    })),
  }
}

export interface CountrySummaryRow {
  country: string
  riderCount: number
  totalPoints: number
}

/**
 * Países con corredores en activo, con cuántos y su total de puntos de temporada (ranking, #7), por
 * puntos, por cuántos y por código. R (E2, §10.6; sup. W5; 8b): las sumas a horizonte, reordenadas.
 */
export async function getCountriesSummary(
  db: Database,
  h: Horizon,
  worldId: string,
): Promise<CountrySummaryRow[]> {
  const totalPoints = sql<number>`coalesce(sum(${riders.seasonPoints}), 0)::int`
  const d = await veilDelta(db, h)
  const rows = await db
    .select({
      country: riders.country,
      riderCount: sql<number>`count(${riders.id})::int`,
      totalPoints,
    })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNull(riders.retiredAt)))
    .groupBy(riders.country)
  const minus = await seasonMinusBy(db, d, worldId, (r) => r.country)
  return rows
    .map((r) => ({
      country: r.country,
      riderCount: r.riderCount,
      totalPoints: r.totalPoints - (minus.get(r.country) ?? 0),
    }))
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.riderCount - a.riderCount ||
        compareIds(a.country, b.country),
    )
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

/**
 * Corredores en activo de un país, ordenados por puntos de temporada (ranking nacional, #7), fama e id.
 * R (E2, §10.6; sup. W5; 8b): los puntos a horizonte, y el orden rehecho con ellos.
 */
export async function getCountryRiders(
  db: Database,
  h: Horizon,
  worldId: string,
  country: string,
): Promise<CountryRiderRow[]> {
  const d = await veilDelta(db, h)
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
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      archetype: r.archetype,
      isBot: r.userId === null,
      teamId: r.teamId,
      teamName: r.teamName,
      seasonPoints: r.seasonPoints - seasonMinus(d, r.id),
      fame: r.fame,
    }))
    .sort((a, b) => b.seasonPoints - a.seasonPoints || b.fame - a.fame || compareIds(a.id, b.id))
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
 * país y vocación, ordenado por puntos y por id. `season` (0-indexed) para calcular la edad. R (E2,
 * §10.6; sup. X4; 8b): los puntos a horizonte, con el orden rehecho y el recorte de 11-f.
 */
export async function getFreeAgents(
  db: Database,
  h: Horizon,
  worldId: string,
  season: number,
  opts: { country?: string; archetype?: string; limit?: number } = {},
): Promise<FreeAgentRow[]> {
  const conds = [eq(riders.worldId, worldId), isNull(riders.retiredAt), isNull(riders.teamId)]
  if (opts.country) conds.push(eq(riders.country, opts.country.toUpperCase()))
  if (opts.archetype) conds.push(eq(riders.archetype, opts.archetype as Vocation))
  const limit = opts.limit ?? 120
  const d = await veilDelta(db, h)
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
    // Los agentes libres se ordenan por lo que han PUNTUADO. Era `fame` primero, que vale 0 para
    // todos, así que este orden lo decidía de hecho el desempate y no el mérito (v55).
    .orderBy(desc(riders.seasonPoints), asc(riders.id))
    .limit(limit + d.points.size)
  return topAtHorizon(
    rows.map((r): FreeAgentRow => ({
      id: r.id,
      name: r.name,
      country: r.country,
      archetype: r.archetype,
      age: 20 - r.birthSeason + season,
      isBot: r.userId === null,
      seasonPoints: r.seasonPoints,
      fame: r.fame,
    })),
    (r) => ({ ...r, seasonPoints: r.seasonPoints - seasonMinus(d, r.id) }),
    (a, b) => b.seasonPoints - a.seasonPoints || compareIds(a.id, b.id),
    limit,
  )
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
  /** Salud pública: estado y día de juego hasta el que dura la baja (null si está sano). */
  health: { state: HealthState; untilDay: number | null }
}

/**
 * Ficha pública de un corredor (#14). `season` para calcular la edad. R y M (E2, §10.6; sups. P1 y P5;
 * 8b): los puntos de la temporada y el puesto a horizonte (el puesto, su posición en el ranking de la
 * temporada a horizonte, 11-f) y la salud de antes de una caída velada; los atributos son L por DD-08
 * (sup. X11).
 */
export async function getPublicRider(
  db: Database,
  h: Horizon,
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
      health: riders.health,
      healthUntilDay: riders.healthUntilDay,
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
  const d = await veilDelta(db, h)
  const seasonPoints = r.seasonPoints - seasonMinus(d, r.id)
  const rank = await getSeasonRank(db, h, r.worldId, seasonPoints)
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
    seasonPoints,
    seasonRank: rank.seasonRank,
    fieldSize: rank.fieldSize,
    fame: r.fame,
    attributes,
    health: healthAt(d, r.id, r.health, r.healthUntilDay),
  }
}
