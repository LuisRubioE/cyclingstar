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
): Promise<void> {
  const currentSeason = seasonPosition(gameDay).season
  const riderRows = await tx.select().from(riders).where(eq(riders.worldId, worldId))

  for (const rider of riderRows) {
    const hiddenRows = await tx
      .select()
      .from(riderHidden)
      .where(eq(riderHidden.riderId, rider.id))
      .limit(1)
    const hidden = hiddenRows[0]
    if (!hidden) continue

    const attrRows = await tx.select().from(riderAttrs).where(eq(riderAttrs.riderId, rider.id))
    const attributes = {} as Record<Attribute, number>
    for (const attr of ATTRIBUTES) attributes[attr] = 0
    for (const row of attrRows) attributes[row.attr] = row.value

    const orderRows = await tx
      .select()
      .from(trainingOrders)
      .where(and(eq(trainingOrders.riderId, rider.id), eq(trainingOrders.gameDay, gameDay)))
      .limit(1)
    const order = orderRows[0]
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
        await tx
          .insert(riderAttrLog)
          .values({ riderId: rider.id, gameDay, attr, delta: after - before })
          .onConflictDoNothing()
      }
    }

    await tx
      .insert(riderDailyLog)
      .values({
        riderId: rider.id,
        gameDay,
        tss: result.log.tss,
        ctl: result.log.ctl,
        atl: result.log.atl,
        tsb: result.log.tsb,
        activity: result.log.activity,
      })
      .onConflictDoNothing()
  }
}
