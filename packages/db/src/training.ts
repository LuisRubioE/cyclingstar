import type { Attribute, CoachBlock, Intensity, Session } from '@cyclingstar/shared'
import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import type { Database } from './client.js'
import { riders, teamTrainingOrders, trainingOrders, trainingPlans } from './schema.js'

/** Órdenes de entrenamiento (Paso 18). Cola de días futuros por corredor. */

export interface TrainingOrderRow {
  gameDay: number
  session: Session
  intensity: Intensity
}

export async function getTrainingOrders(
  db: Database,
  riderId: string,
  fromDay: number,
  toDay: number,
): Promise<TrainingOrderRow[]> {
  return db
    .select({
      gameDay: trainingOrders.gameDay,
      session: trainingOrders.session,
      intensity: trainingOrders.intensity,
    })
    .from(trainingOrders)
    .where(
      and(
        eq(trainingOrders.riderId, riderId),
        gte(trainingOrders.gameDay, fromDay),
        lte(trainingOrders.gameDay, toDay),
      ),
    )
}

/**
 * Reemplaza las órdenes de los días indicados, **y BORRA los que vuelven a ser del entrenador**
 * (docs/entrenamiento.md §5.3, paso 11).
 *
 * `days` dice qué ventana se está guardando y `orders` qué días de esa ventana tocó el jugador; los
 * demás días de la ventana se borran. Sin eso no había forma de deshacer: el cliente congelaba los
 * veintiocho días y los mandaba enteros, así que un plan guardado hace un mes seguía mandando sobre
 * el entrenador aunque el corredor se hubiera puesto enfermo en medio, y «volver a dejárselo al
 * entrenador» no era una operación que existiera.
 */
export async function setTrainingOrders(
  db: Database,
  riderId: string,
  orders: TrainingOrderRow[],
  window?: { fromDay: number; toDay: number },
): Promise<void> {
  if (window) {
    const tocados = new Set(orders.map((o) => o.gameDay))
    await db.transaction(async (tx) => {
      await tx
        .delete(trainingOrders)
        .where(
          and(
            eq(trainingOrders.riderId, riderId),
            gte(trainingOrders.gameDay, window.fromDay),
            lte(trainingOrders.gameDay, window.toDay),
          ),
        )
      const nuevos = orders.filter((o) => tocados.has(o.gameDay))
      if (nuevos.length > 0) {
        await tx.insert(trainingOrders).values(
          nuevos.map((order) => ({
            riderId,
            gameDay: order.gameDay,
            session: order.session,
            intensity: order.intensity,
          })),
        )
      }
    })
    return
  }
  if (orders.length === 0) return
  const days = orders.map((order) => order.gameDay)
  await db.transaction(async (tx) => {
    await tx
      .delete(trainingOrders)
      .where(and(eq(trainingOrders.riderId, riderId), inArray(trainingOrders.gameDay, days)))
    await tx.insert(trainingOrders).values(
      orders.map((order) => ({
        riderId,
        gameDay: order.gameDay,
        session: order.session,
        intensity: order.intensity,
      })),
    )
  })
}

/** Plan de entrenamiento SUGERIDO por el equipo (una sesión por día para la plantilla). */
export async function getTeamTrainingPlan(
  db: Database,
  teamId: string,
  fromDay: number,
  toDay: number,
): Promise<TrainingOrderRow[]> {
  return db
    .select({
      gameDay: teamTrainingOrders.gameDay,
      session: teamTrainingOrders.session,
      intensity: teamTrainingOrders.intensity,
    })
    .from(teamTrainingOrders)
    .where(
      and(
        eq(teamTrainingOrders.teamId, teamId),
        gte(teamTrainingOrders.gameDay, fromDay),
        lte(teamTrainingOrders.gameDay, toDay),
      ),
    )
}

/** El mánager fija (o borra) la sesión sugerida del equipo por día (upsert por borrado + inserción). */
export async function setTeamTrainingPlan(
  db: Database,
  teamId: string,
  orders: TrainingOrderRow[],
): Promise<void> {
  if (orders.length === 0) return
  const days = orders.map((order) => order.gameDay)
  await db.transaction(async (tx) => {
    await tx
      .delete(teamTrainingOrders)
      .where(and(eq(teamTrainingOrders.teamId, teamId), inArray(teamTrainingOrders.gameDay, days)))
    await tx.insert(teamTrainingOrders).values(
      orders.map((order) => ({
        teamId,
        gameDay: order.gameDay,
        session: order.session,
        intensity: order.intensity,
      })),
    )
  })
}

/**
 * EL PLAN POR BLOQUES (D0-D4, docs/entrenamiento.md §5.3).
 *
 * Un bloque a `null` no es «sin decidir todavía»: es «de esta semana decide el entrenador», que es
 * una decisión distinta y la que el jugador toma por defecto.
 */

export type TrainingMode = 'entrenador' | 'mixto' | 'manual'

export interface TrainingPlanRow {
  startDay: number
  blocks: (CoachBlock | null)[]
  focusAttr: Attribute | null
  intensity: Intensity | null
  goalRaceId: string | null
}

export async function getTrainingMode(db: Database, riderId: string): Promise<TrainingMode> {
  const rows = await db
    .select({ mode: riders.trainingMode })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  return (rows[0]?.mode as TrainingMode) ?? 'mixto'
}

export async function setTrainingMode(
  db: Database,
  riderId: string,
  mode: TrainingMode,
): Promise<void> {
  await db.update(riders).set({ trainingMode: mode }).where(eq(riders.id, riderId))
}

export async function getTrainingPlan(
  db: Database,
  riderId: string,
  startDay: number,
): Promise<TrainingPlanRow | null> {
  const rows = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.riderId, riderId), eq(trainingPlans.startDay, startDay)))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    startDay: r.startDay,
    blocks: [r.block1, r.block2, r.block3, r.block4] as (CoachBlock | null)[],
    focusAttr: r.focusAttr as Attribute | null,
    intensity: r.intensity as Intensity | null,
    goalRaceId: r.goalRaceId,
  }
}

export async function setTrainingPlan(
  db: Database,
  riderId: string,
  plan: TrainingPlanRow,
): Promise<void> {
  const fila = {
    riderId,
    startDay: plan.startDay,
    block1: plan.blocks[0] ?? null,
    block2: plan.blocks[1] ?? null,
    block3: plan.blocks[2] ?? null,
    block4: plan.blocks[3] ?? null,
    focusAttr: plan.focusAttr,
    intensity: plan.intensity,
    goalRaceId: plan.goalRaceId,
  }
  await db
    .insert(trainingPlans)
    .values(fila)
    .onConflictDoUpdate({
      target: [trainingPlans.riderId, trainingPlans.startDay],
      set: {
        block1: fila.block1,
        block2: fila.block2,
        block3: fila.block3,
        block4: fila.block4,
        focusAttr: fila.focusAttr,
        intensity: fila.intensity,
        goalRaceId: fila.goalRaceId,
      },
    })
}

/**
 * El plan vigente para un día: el que empieza en la ventana de 28 días que lo contiene. Devuelve
 * también el ÍNDICE de semana dentro del plan, que es lo que dice qué bloque toca.
 */
export async function getPlanForDay(
  db: Database,
  riderId: string,
  gameDay: number,
): Promise<{ plan: TrainingPlanRow; week: number } | null> {
  const rows = await db
    .select()
    .from(trainingPlans)
    .where(
      and(
        eq(trainingPlans.riderId, riderId),
        lte(trainingPlans.startDay, gameDay),
        gte(trainingPlans.startDay, gameDay - 27),
      ),
    )
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return {
    plan: {
      startDay: r.startDay,
      blocks: [r.block1, r.block2, r.block3, r.block4] as (CoachBlock | null)[],
      focusAttr: r.focusAttr as Attribute | null,
      intensity: r.intensity as Intensity | null,
      goalRaceId: r.goalRaceId,
    },
    week: Math.floor((gameDay - r.startDay) / 7),
  }
}
