import { and, asc, desc, eq, lte, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { raceGc, riders, stageResults, stageSnapshots, teams } from './schema.js'

/** Lecturas de resultados y clasificaciones para la web del replay (Paso 31, pulido). */

export interface GcRow {
  riderId: string
  name: string
  country: string
  teamName: string | null
  isBot: boolean
  tiempoTotalS: number
  puntosVolante: number
  puntosMontana: number
}

export async function getRaceGc(db: Database, raceId: string): Promise<GcRow[]> {
  const rows = await db
    .select({
      riderId: raceGc.riderId,
      name: riders.name,
      country: riders.country,
      teamName: teams.name,
      userId: riders.userId,
      tiempoTotalS: raceGc.tiempoTotalS,
      puntosVolante: raceGc.puntosVolante,
      puntosMontana: raceGc.puntosMontana,
    })
    .from(raceGc)
    .innerJoin(riders, eq(riders.id, raceGc.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(eq(raceGc.raceId, raceId))
    .orderBy(asc(raceGc.tiempoTotalS))
  return rows.map(({ userId, ...r }) => ({ ...r, isBot: userId === null }))
}

export interface TeamGcRow {
  teamName: string
  tiempoTotalS: number
  riderCount: number
}

/**
 * Clasificación por equipos (SPEC): suma de los tiempos de los 3 mejores corredores de cada equipo
 * en la general. Solo puntúan equipos con al menos 3 corredores clasificados. Se calcula desde la
 * general ya ordenada por tiempo, así que los 3 primeros de cada equipo son sus mejores.
 */
export function teamsClassification(gc: GcRow[]): TeamGcRow[] {
  const byTeam = new Map<string, number[]>()
  for (const row of gc) {
    if (!row.teamName) continue
    const times = byTeam.get(row.teamName) ?? []
    times.push(row.tiempoTotalS)
    byTeam.set(row.teamName, times)
  }
  const table: TeamGcRow[] = []
  for (const [teamName, times] of byTeam) {
    if (times.length < 3) continue
    // gc viene ordenada por tiempo, así que los 3 primeros del equipo son los mejores.
    const best3 = times.slice(0, 3)
    table.push({
      teamName,
      tiempoTotalS: best3.reduce((sum, t) => sum + t, 0),
      riderCount: times.length,
    })
  }
  return table.sort((a, b) => a.tiempoTotalS - b.tiempoTotalS)
}

export interface StageResultRow {
  riderId: string
  name: string
  country: string
  teamName: string | null
  puesto: number
  tiempoS: number
  bonificacionS: number
  puntosVolante: number
  puntosMontana: number
}

export async function getStageResults(
  db: Database,
  raceId: string,
  stageDay: number,
): Promise<StageResultRow[]> {
  return db
    .select({
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      teamName: teams.name,
      puesto: stageResults.puesto,
      tiempoS: stageResults.tiempoS,
      bonificacionS: stageResults.bonificacionS,
      puntosVolante: stageResults.puntosVolante,
      puntosMontana: stageResults.puntosMontana,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(stageResults.raceId, raceId), eq(stageResults.stageDay, stageDay)))
    .orderBy(asc(stageResults.puesto))
}

/** Clasificación general tal como estaba tras la etapa `stageDay` (tiempo neto acumulado). */
export async function getGcThroughStage(
  db: Database,
  raceId: string,
  stageDay: number,
): Promise<
  {
    riderId: string
    name: string
    country: string
    teamName: string | null
    tiempoTotalS: number
  }[]
> {
  const net = sql<number>`sum(${stageResults.tiempoS} - ${stageResults.bonificacionS})::int`
  return db
    .select({
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      teamName: teams.name,
      tiempoTotalS: net,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(stageResults.raceId, raceId), lte(stageResults.stageDay, stageDay)))
    .groupBy(stageResults.riderId, riders.name, riders.country, teams.name)
    .orderBy(asc(net))
}

export interface PointsRow {
  riderId: string
  name: string
  country: string
  puntos: number
}

/** Clasificación por puntos (metas volantes) acumulada en toda la carrera. */
export async function getPointsClassification(db: Database, raceId: string): Promise<PointsRow[]> {
  const total = sql<number>`sum(${stageResults.puntosVolante})::int`
  const rows = await db
    .select({
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      puntos: total,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .where(eq(stageResults.raceId, raceId))
    .groupBy(stageResults.riderId, riders.name, riders.country)
    .orderBy(desc(total))
  return rows.filter((r) => r.puntos > 0)
}

export interface StageWinnerRow {
  stageDay: number
  riderId: string
  name: string
  country: string
  teamName: string | null
  isBot: boolean
}

/** Ganadores de cada etapa de una carrera (puesto 1), en orden de etapa (Paso 44). */
export async function getStageWinners(db: Database, raceId: string): Promise<StageWinnerRow[]> {
  const rows = await db
    .select({
      stageDay: stageResults.stageDay,
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      teamName: teams.name,
      userId: riders.userId,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(stageResults.raceId, raceId), eq(stageResults.puesto, 1)))
    .orderBy(asc(stageResults.stageDay))
  return rows.map(({ userId, ...r }) => ({ ...r, isBot: userId === null }))
}

/** Clasificación de la montaña (cimas) acumulada en toda la carrera. */
export async function getKomClassification(db: Database, raceId: string): Promise<PointsRow[]> {
  const total = sql<number>`sum(${stageResults.puntosMontana})::int`
  const rows = await db
    .select({
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      puntos: total,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .where(eq(stageResults.raceId, raceId))
    .groupBy(stageResults.riderId, riders.name, riders.country)
    .orderBy(desc(total))
  return rows.filter((r) => r.puntos > 0)
}

export interface StageSnapshotRow {
  seed: string
  engineVersion: number
  input: unknown
}

export async function getStageSnapshot(
  db: Database,
  raceId: string,
  stageDay: number,
): Promise<StageSnapshotRow | null> {
  const rows = await db
    .select({
      seed: stageSnapshots.seed,
      engineVersion: stageSnapshots.engineVersion,
      input: stageSnapshots.input,
    })
    .from(stageSnapshots)
    .where(and(eq(stageSnapshots.raceId, raceId), eq(stageSnapshots.stageDay, stageDay)))
    .limit(1)
  return rows[0] ?? null
}

/** Días de etapa que ya se han corrido (tienen resultados), para listar el estado de la vuelta. */
export async function getRunStageDays(db: Database, raceId: string): Promise<number[]> {
  const rows = await db
    .selectDistinct({ stageDay: stageResults.stageDay })
    .from(stageResults)
    .where(eq(stageResults.raceId, raceId))
    .orderBy(asc(stageResults.stageDay))
  return rows.map((r) => r.stageDay)
}
