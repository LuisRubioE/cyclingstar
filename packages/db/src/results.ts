import { and, asc, eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { raceGc, riders, stageResults, stageSnapshots } from './schema.js'

/** Lecturas de resultados y clasificaciones para la web del replay (Paso 31). */

export interface GcRow {
  riderId: string
  name: string
  tiempoTotalS: number
  puntosVolante: number
  puntosMontana: number
}

export async function getRaceGc(db: Database, raceId: string): Promise<GcRow[]> {
  return db
    .select({
      riderId: raceGc.riderId,
      name: riders.name,
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
