import { type RaceLevel, gcResultPoints, stageResultPoints } from '@cyclingstar/engine'
import { and, desc, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { palmares, riders, teams } from './schema.js'

/**
 * Ranking individual de puntos y palmarés permanente (SPEC, Paso 40). Los puntos de temporada se
 * suman al terminar etapas/carreras y se reinician en el rollover; el palmarés no se reinicia nunca.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Suma puntos de ranking al corredor por su puesto de etapa (0 = ganador). */
export async function addStagePoints(
  tx: Tx,
  riderId: string,
  level: RaceLevel,
  placing: number,
): Promise<void> {
  const pts = stageResultPoints(level, placing)
  if (pts > 0) {
    await tx
      .update(riders)
      .set({ seasonPoints: sql`${riders.seasonPoints} + ${pts}` })
      .where(eq(riders.id, riderId))
  }
}

/** Suma puntos de ranking al corredor por su puesto en la general (0 = ganador). */
export async function addGcPoints(
  tx: Tx,
  riderId: string,
  level: RaceLevel,
  placing: number,
): Promise<void> {
  const pts = gcResultPoints(level, placing)
  if (pts > 0) {
    await tx
      .update(riders)
      .set({ seasonPoints: sql`${riders.seasonPoints} + ${pts}` })
      .where(eq(riders.id, riderId))
  }
}

/** Inmortaliza un logro en el palmarés (no se reinicia). */
export async function recordPalmares(
  tx: Tx,
  opts: {
    worldId: string
    riderId: string
    season: number
    raceId: string
    raceName: string
    kind: 'gc' | 'stage' | 'kom' | 'points'
    detail?: string
    gameDay: number
  },
): Promise<void> {
  await tx.insert(palmares).values({
    worldId: opts.worldId,
    riderId: opts.riderId,
    season: opts.season,
    raceId: opts.raceId,
    raceName: opts.raceName,
    kind: opts.kind,
    detail: opts.detail ?? '',
    gameDay: opts.gameDay,
  })
}

export interface RankingRow {
  riderId: string
  name: string
  country: string
  teamName: string | null
  isBot: boolean
  points: number
}

/** Ranking individual de la temporada por puntos (SPEC, Paso 40). */
export async function getRanking(
  db: Database,
  worldId: string,
  limit = 100,
): Promise<RankingRow[]> {
  const rows = await db
    .select({
      riderId: riders.id,
      name: riders.name,
      country: riders.country,
      teamName: teams.name,
      userId: riders.userId,
      points: riders.seasonPoints,
    })
    .from(riders)
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(eq(riders.worldId, worldId))
    .orderBy(desc(riders.seasonPoints))
    .limit(limit)
  return rows.map((r) => ({
    riderId: r.riderId,
    name: r.name,
    country: r.country,
    teamName: r.teamName,
    isBot: r.userId === null,
    points: r.points,
  }))
}

export interface PalmaresRow {
  season: number
  raceId: string
  raceName: string
  kind: string
  detail: string
}

/** Palmarés de un corredor, lo más reciente primero. */
export async function getPalmares(db: Database, riderId: string): Promise<PalmaresRow[]> {
  return db
    .select({
      season: palmares.season,
      raceId: palmares.raceId,
      raceName: palmares.raceName,
      kind: palmares.kind,
      detail: palmares.detail,
    })
    .from(palmares)
    .where(eq(palmares.riderId, riderId))
    .orderBy(desc(palmares.season), desc(palmares.gameDay))
}

/** Ganadores de la general por carrera en una temporada: raceId -> nombre (SPEC, Paso 44). */
export async function getSeasonWinners(
  db: Database,
  worldId: string,
  season: number,
): Promise<Record<string, string>> {
  const rows = await db
    .select({ raceId: palmares.raceId, name: riders.name })
    .from(palmares)
    .innerJoin(riders, eq(riders.id, palmares.riderId))
    .where(and(eq(palmares.worldId, worldId), eq(palmares.season, season), eq(palmares.kind, 'gc')))
  const out: Record<string, string> = {}
  for (const r of rows) out[r.raceId] = r.name
  return out
}

export interface RaceHonour {
  season: number
  raceName: string
  winnerId: string
  winnerName: string
  winnerCountry: string
}

/** Historial de ganadores de la general de una carrera, temporada a temporada (SPEC, Paso 40). */
export async function getRaceHistory(
  db: Database,
  worldId: string,
  raceId: string,
): Promise<RaceHonour[]> {
  return db
    .select({
      season: palmares.season,
      raceName: palmares.raceName,
      winnerId: palmares.riderId,
      winnerName: riders.name,
      winnerCountry: riders.country,
    })
    .from(palmares)
    .innerJoin(riders, eq(riders.id, palmares.riderId))
    .where(and(eq(palmares.worldId, worldId), eq(palmares.raceId, raceId), eq(palmares.kind, 'gc')))
    .orderBy(desc(palmares.season))
}
