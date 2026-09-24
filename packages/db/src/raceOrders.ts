import { and, desc, eq, isNull, ne, or } from 'drizzle-orm'
import type { Database } from './client.js'
import { raceRosters, riders, stageOrders, teams } from './schema.js'

/** Órdenes de etapa (Paso 29). Cola de las cinco capas por etapa de una carrera (SPEC 6.18). */

export type StageRole =
  'lider' | 'sprinter' | 'lanzador' | 'gregario' | 'cazaetapas' | 'marcador' | 'libre'
export type Mentality = 'reservon' | 'oportunista' | 'combativo' | 'supercombativo'
export type Effort = 'ahorrar' | 'normal' | 'a_tope'

/** Cuándo lanza su movimiento este hombre (paso 17a). El caso `km` es el `triggerKm` de siempre. */
export type TriggerCond =
  | { at: 'km'; km: number }
  | { at: 'climb'; which: 'last' | 'penultimate'; part: 'pie' | 'duro' | 'cima' }
  | { at: 'attack'; byRiderId: string }
  | { at: 'gap'; overS: number }
  | { at: 'weather'; cond: 'lluvia' | 'viento' }
  | { at: 'sector'; index: number }
export type ChasePolicy = 'nunca' | 'si_amenaza' | 'siempre'
export type DayGoal = 'ganar' | 'general' | 'puntos' | 'montana' | 'grupeto' | 'ahorrar' | 'servir'

export interface StageOrderRow {
  stageDay: number
  role: StageRole
  targetRiderId: string | null
  mentality: Mentality
  effort: Effort
  triggerKm: number | null
  contestSprints: boolean
  contestClimbs: boolean
  /**
   * LAS CUATRO DEL PASO 17a. `null` = no hay preferencia y decide el motor, que es la conducta de las
   * hojas anteriores a la migración. Opcionales además de nullables porque un cliente sin desplegar
   * no las manda: si fueran obligatorias, desplegar la API antes que la web rompería la pantalla.
   */
  triggerOn?: TriggerCond | null | undefined
  chasePolicy?: ChasePolicy | null | undefined
  refuseRelayTeams?: string[] | null | undefined
  dayGoal?: DayGoal | null | undefined
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

/**
 * LOS EQUIPOS QUE CORREN LA CARRERA, menos el tuyo (paso 17a).
 *
 * Lo pide `refuseRelayTeams` —«con ésos no colaboro», S-256—, que toma identificadores de EQUIPO. Sin
 * esto la pantalla de órdenes no puede ofrecer la palanca: el endpoint mandaba `teammates` y
 * `rivals`, que son CORREDORES, y con una lista de corredores no se puede pintar un selector de
 * equipos. La columna existía, el motor la leía, y la pantalla no tenía con qué rellenarla.
 *
 * El propio equipo se excluye porque no puedes negarte a colaborar contigo mismo, y los agentes
 * libres tampoco salen: no son un equipo con el que se pacte o se deje de pactar.
 */
export async function getRaceTeams(
  db: Database,
  raceId: string,
  riderId: string,
): Promise<{ id: string; name: string }[]> {
  const me = await db
    .select({ teamId: riders.teamId })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  const myTeam = me[0]?.teamId ?? null
  const rows = await db
    .selectDistinct({ id: teams.id, name: teams.name })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .innerJoin(teams, eq(teams.id, riders.teamId))
    .where(
      myTeam
        ? and(eq(raceRosters.raceId, raceId), ne(teams.id, myTeam))
        : eq(raceRosters.raceId, raceId),
    )
    .orderBy(teams.name)
  return rows
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
      triggerOn: stageOrders.triggerOn,
      chasePolicy: stageOrders.chasePolicy,
      refuseRelayTeams: stageOrders.refuseRelayTeams,
      dayGoal: stageOrders.dayGoal,
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
          triggerOn: o.triggerOn ?? null,
          chasePolicy: o.chasePolicy ?? null,
          refuseRelayTeams: o.refuseRelayTeams ?? null,
          dayGoal: o.dayGoal ?? null,
        })),
      )
    }
  })
}
