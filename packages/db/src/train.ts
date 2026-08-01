import { type RiderDayState, simulateRiderDay } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  defaultCoachPlan,
  seasonPosition,
  seededRng,
} from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import {
  riderAttrLog,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  trainingOrders,
} from './schema.js'

/**
 * El tick entrena (Paso 19, SPEC 5). Por cada día de juego y corredor del mundo aplica la
 * orden (o el plan del entrenador), el modelo de progresión puro del motor, y persiste
 * atributos, estado de forma/salud/moral, el log diario y las variaciones de atributos.
 */

// Edad de debut de un neoprofesional (SPEC 10 no fija la del creado por usuario). Envejece
// un año por temporada.
const DEBUT_AGE = 20

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export async function trainWorldDay(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
  skip: Set<string> = new Set(),
): Promise<void> {
  const currentSeason = seasonPosition(gameDay).season
  const riderRows = await tx.select().from(riders).where(eq(riders.worldId, worldId))

  // Lecturas en lote para no hacer O(corredores) consultas por día (Paso 41, rendimiento del tick):
  // atributos, genoma y órdenes del día del mundo entero en tres consultas.
  const attrRows = await tx
    .select({ riderId: riderAttrs.riderId, attr: riderAttrs.attr, value: riderAttrs.value })
    .from(riderAttrs)
    .innerJoin(riders, eq(riders.id, riderAttrs.riderId))
    .where(eq(riders.worldId, worldId))
  const attrsByRider = new Map<string, Record<Attribute, number>>()
  for (const row of attrRows) {
    let rec = attrsByRider.get(row.riderId)
    if (!rec) {
      rec = {} as Record<Attribute, number>
      for (const a of ATTRIBUTES) rec[a] = 0
      attrsByRider.set(row.riderId, rec)
    }
    rec[row.attr] = row.value
  }

  const hiddenRows = await tx
    .select({
      riderId: riderHidden.riderId,
      talent: riderHidden.talent,
      ceilings: riderHidden.ceilings,
      fragility: riderHidden.fragility,
      peakAge: riderHidden.peakAge,
      declineAge: riderHidden.declineAge,
    })
    .from(riderHidden)
    .innerJoin(riders, eq(riders.id, riderHidden.riderId))
    .where(eq(riders.worldId, worldId))
  const hiddenByRider = new Map(hiddenRows.map((h) => [h.riderId, h]))

  const orderRows = await tx
    .select()
    .from(trainingOrders)
    .where(eq(trainingOrders.gameDay, gameDay))
  const ordersByRider = new Map(orderRows.map((o) => [o.riderId, o]))

  // Los logs se acumulan y se insertan en lote al final.
  const dailyLogValues: (typeof riderDailyLog.$inferInsert)[] = []
  const attrLogValues: (typeof riderAttrLog.$inferInsert)[] = []

  for (const rider of riderRows) {
    // Quien ha corrido hoy no entrena: la carrera ya fue su carga (Paso 30).
    if (skip.has(rider.id)) continue
    const hidden = hiddenByRider.get(rider.id)
    if (!hidden) continue

    const attributes =
      attrsByRider.get(rider.id) ??
      (Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Record<Attribute, number>)

    const order = ordersByRider.get(rider.id)
    const choice = order
      ? { session: order.session, intensity: order.intensity }
      : defaultCoachPlan(gameDay)

    const state: RiderDayState = {
      attributes,
      ctl: rider.ctl,
      atl: rider.atl,
      morale: rider.morale,
      health: rider.health,
      healthUntilDay: rider.healthUntilDay,
    }

    const result = simulateRiderDay(state, {
      gameDay,
      age: DEBUT_AGE + (currentSeason - rider.birthSeason),
      ceilings: hidden.ceilings as Record<Attribute, number>,
      talent: hidden.talent,
      fragility: hidden.fragility,
      peakAge: hidden.peakAge,
      declineAge: hidden.declineAge,
      choice,
      kInst: 1,
      kStaff: 1,
      rng: seededRng(`${worldSeed}:${rider.id}:${gameDay}`),
    })

    await tx
      .update(riders)
      .set({
        ctl: result.state.ctl,
        atl: result.state.atl,
        morale: result.state.morale,
        health: result.state.health,
        healthUntilDay: result.state.healthUntilDay,
      })
      .where(eq(riders.id, rider.id))

    for (const attr of ATTRIBUTES) {
      const before = attributes[attr]
      const after = result.state.attributes[attr]
      if (after !== before) {
        await tx
          .update(riderAttrs)
          .set({ value: after })
          .where(and(eq(riderAttrs.riderId, rider.id), eq(riderAttrs.attr, attr)))
        attrLogValues.push({ riderId: rider.id, gameDay, attr, delta: after - before })
      }
    }

    dailyLogValues.push({
      riderId: rider.id,
      gameDay,
      tss: result.log.tss,
      ctl: result.log.ctl,
      atl: result.log.atl,
      tsb: result.log.tsb,
      activity: result.log.activity,
    })
  }

  // Inserción en lote de los logs (en trozos para no exceder el límite de parámetros de Postgres).
  await insertChunked(dailyLogValues, 1000, (chunk) =>
    tx.insert(riderDailyLog).values(chunk).onConflictDoNothing(),
  )
  await insertChunked(attrLogValues, 2000, (chunk) =>
    tx.insert(riderAttrLog).values(chunk).onConflictDoNothing(),
  )
}

/** Inserta un array en lotes para no exceder el límite de parámetros de Postgres. */
async function insertChunked<T>(
  rows: T[],
  size: number,
  insert: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size))
  }
}
