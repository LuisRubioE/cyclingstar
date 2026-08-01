import type { Intensity, Session } from '@cyclingstar/shared'
import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import type { Database } from './client.js'
import { trainingOrders } from './schema.js'

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

/** Reemplaza las órdenes de los días indicados (upsert por borrado + inserción). */
export async function setTrainingOrders(
  db: Database,
  riderId: string,
  orders: TrainingOrderRow[],
): Promise<void> {
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
