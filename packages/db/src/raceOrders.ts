import { and, desc, eq, isNull, ne, or } from 'drizzle-orm'
import type { Database } from './client.js'
import { raceRosters, riders, stageOrders } from './schema.js'

/** Órdenes de etapa (Paso 29). Cola de las cinco capas por etapa de una carrera (SPEC 6.18). */

export type StageRole =
  'lider' | 'sprinter' | 'lanzador' | 'gregario' | 'cazaetapas' | 'marcador' | 'libre'
export type Mentality = 'reservon' | 'oportunista' | 'combativo' | 'supercombativo'
export type Effort = 'ahorrar' | 'normal' | 'a_tope'

export interface StageOrderRow {
  stageDay: number
  role: StageRole
  targetRiderId: string | null
  mentality: Mentality
  effort: Effort
  triggerKm: number | null
  contestSprints: boolean
  contestClimbs: boolean
}

/** Compañeros de EQUIPO del corredor que están en el roster de la carrera (posibles objetivos de orden). */
export async function getRosterTeammates(
  db: Database,
  raceId: string,
  riderId: string,
): Promise<{ id: string; name: string }[]> {
  const me = await db
    .select({ teamId: riders.teamId })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  const teamId = me[0]?.teamId
  if (!teamId) return [] // agente libre: corre sin equipo, sin compañeros a los que asignar
  return (
    db
      .select({ id: riders.id, name: riders.name })
      .from(raceRosters)
      .innerJoin(riders, eq(riders.id, raceRosters.riderId))
      // Excluye al propio corredor: no puede ser su propio objetivo (no te ayudas a ti mismo). Por fama
      // desc, así el líder del equipo (el corredor de más nivel) aparece primero en la lista.
      .where(and(eq(raceRosters.raceId, raceId), eq(riders.teamId, teamId), ne(riders.id, riderId)))
      .orderBy(desc(riders.fame))
  )
}

/** RIVALES del corredor en la carrera (los de OTROS equipos), por fama desc: a quién marcar/seguir. */
export async function getRaceRivals(
  db: Database,
  raceId: string,
  riderId: string,
  limit = 60,
): Promise<{ id: string; name: string }[]> {
  const me = await db
    .select({ teamId: riders.teamId })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  const teamId = me[0]?.teamId ?? null
  // Rival = corredor del roster que NO es de tu equipo (los agentes libres de team nulo cuentan) y no
  // eres tú. Si eres agente libre (sin equipo), rival es cualquier otro del pelotón.
  const notMine = teamId
    ? or(isNull(riders.teamId), ne(riders.teamId, teamId))!
    : ne(riders.id, riderId)
  return db
    .select({ id: riders.id, name: riders.name })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .where(and(eq(raceRosters.raceId, raceId), ne(riders.id, riderId), notMine))
    .orderBy(desc(riders.fame))
    .limit(limit)
}

/** ¿Está el corredor convocado a la carrera? (SPEC, Paso 29). */
export async function isOnRoster(db: Database, raceId: string, riderId: string): Promise<boolean> {
  const rows = await db
    .select({ riderId: raceRosters.riderId })
    .from(raceRosters)
    .where(and(eq(raceRosters.raceId, raceId), eq(raceRosters.riderId, riderId)))
    .limit(1)
  return rows.length > 0
}

/** Convoca a un corredor a una carrera (idempotente). */
export async function addToRoster(db: Database, raceId: string, riderId: string): Promise<void> {
  await db.insert(raceRosters).values({ raceId, riderId }).onConflictDoNothing()
}

export async function getStageOrders(
  db: Database,
  raceId: string,
  riderId: string,
): Promise<StageOrderRow[]> {
  return db
    .select({
      stageDay: stageOrders.stageDay,
      role: stageOrders.role,
      targetRiderId: stageOrders.targetRiderId,
      mentality: stageOrders.mentality,
      effort: stageOrders.effort,
      triggerKm: stageOrders.triggerKm,
      contestSprints: stageOrders.contestSprints,
      contestClimbs: stageOrders.contestClimbs,
    })
    .from(stageOrders)
    .where(and(eq(stageOrders.raceId, raceId), eq(stageOrders.riderId, riderId)))
}

/** Reemplaza todas las órdenes del corredor en esa carrera (borrado + inserción atómicos). */
export async function setStageOrders(
  db: Database,
  raceId: string,
  riderId: string,
  orders: StageOrderRow[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(stageOrders)
      .where(and(eq(stageOrders.raceId, raceId), eq(stageOrders.riderId, riderId)))
    if (orders.length > 0) {
      await tx.insert(stageOrders).values(
        orders.map((o) => ({
          riderId,
          raceId,
          stageDay: o.stageDay,
          role: o.role,
          targetRiderId: o.targetRiderId,
          mentality: o.mentality,
          effort: o.effort,
          triggerKm: o.triggerKm,
          contestSprints: o.contestSprints,
          contestClimbs: o.contestClimbs,
        })),
      )
    }
  })
}
