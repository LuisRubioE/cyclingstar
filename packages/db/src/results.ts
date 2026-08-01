import { and, asc, desc, eq, lte, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { raceGc, riders, stageResults, stageSnapshots } from './schema.js'

/** Lecturas de resultados y clasificaciones para la web del replay (Paso 31, pulido). */

export interface GcRow {
  riderId: string
  name: string
  country: string
  tiempoTotalS: number
  puntosVolante: number
  puntosMontana: number
}

export async function getRaceGc(db: Database, raceId: string): Promise<GcRow[]> {
  return db
    .select({
      riderId: raceGc.riderId,
      name: riders.name,
      country: riders.country,
      tiempoTotalS: raceGc.tiempoTotalS,
      puntosVolante: raceGc.puntosVolante,
      puntosMontana: raceGc.puntosMontana,
    })
    .from(raceGc)
    .innerJoin(riders, eq(riders.id, raceGc.riderId))
    .where(eq(raceGc.raceId, raceId))
    .orderBy(asc(raceGc.tiempoTotalS))
}

export interface StageResultRow {
  riderId: string
  name: string
  country: string
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
      puesto: stageResults.puesto,
      tiempoS: stageResults.tiempoS,
      bonificacionS: stageResults.bonificacionS,
      puntosVolante: stageResults.puntosVolante,
      puntosMontana: stageResults.puntosMontana,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .where(and(eq(stageResults.raceId, raceId), eq(stageResults.stageDay, stageDay)))
    .orderBy(asc(stageResults.puesto))
}

/** Clasificación general tal como estaba tras la etapa `stageDay` (tiempo neto acumulado). */
export async function getGcThroughStage(
  db: Database,
  raceId: string,
  stageDay: number,
): Promise<{ riderId: string; name: string; country: string; tiempoTotalS: number }[]> {
  const net = sql<number>`sum(${stageResults.tiempoS} - ${stageResults.bonificacionS})::int`
  return db
    .select({
      riderId: stageResults.riderId,
      name: riders.name,
      country: riders.country,
      tiempoTotalS: net,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .where(and(eq(stageResults.raceId, raceId), lte(stageResults.stageDay, stageDay)))
    .groupBy(stageResults.riderId, riders.name, riders.country)
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
