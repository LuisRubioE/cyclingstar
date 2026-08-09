import { type RiderDayState, simulateRiderDay } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  type TrainingChoice,
  defaultCoachPlan,
  groupTrainingMultiplier,
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
  teamTrainingOrders,
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

  // Quien está de VIAJE hoy (vuelta de una carrera lejana) no ENTRENA —el viaje le cuesta días de
  // trabajo—, pero sí VIVE el día: el catálogo tiene una sesión `viaje` (TSS 15, sin ganancias) que
  // estaba definida y sin enchufar. Antes se le metía en el `skip` y se salía por `continue`, de
  // modo que `applyDailyLoad` no llegaba a ejecutarse nunca: su ATL no bajaba (viajar no descansaba
  // NADA, el corredor quedaba literalmente congelado) y no se escribía fila en `rider_daily_log`,
  // así que el gráfico de forma cosía dos puntos separados por días y la caída salía en vertical.
  // Era la causa de "hice descanso activo y no mejoró mi frescura": la sesión elegida ni corría.
  const travelling = new Set<string>()
  for (const rider of riderRows) {
    if (skip.has(rider.id)) continue // ya ha corrido hoy: la carrera manda sobre el viaje
    if (rider.travelUntilDay != null && rider.travelUntilDay >= gameDay) travelling.add(rider.id)
  }

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

  // Plan de entrenamiento sugerido por cada equipo hoy (lo fija el mánager para que la plantilla
  // entrene junta). Se usa como fallback si el corredor no dejó una orden propia.
  const teamOrderRows = await tx
    .select()
    .from(teamTrainingOrders)
    .where(eq(teamTrainingOrders.gameDay, gameDay))
  const teamPlanByTeam = new Map(teamOrderRows.map((o) => [o.teamId, o]))

  // La elección de sesión de cada corredor que entrena hoy: su ORDEN propia, si no el PLAN DE EQUIPO
  // (los del equipo se alinean y ganan el bonus de grupo) y, si no hay ninguno, el plan del entrenador.
  const choiceByRider = new Map<string, TrainingChoice>()
  for (const rider of riderRows) {
    if (skip.has(rider.id)) continue
    // De viaje: la sesión del día es el viaje, gane quien gane la orden. Cuesta el día de trabajo
    // (no da atributos) pero deja al Banister hacer su cuenta, que es lo que faltaba.
    if (travelling.has(rider.id)) {
      choiceByRider.set(rider.id, { session: 'viaje', intensity: 'normal' })
      continue
    }
    const order = ordersByRider.get(rider.id)
    const teamPlan = rider.teamId ? teamPlanByTeam.get(rider.teamId) : undefined
    choiceByRider.set(
      rider.id,
      order
        ? { session: order.session, intensity: order.intensity }
        : teamPlan
          ? { session: teamPlan.session, intensity: teamPlan.intensity }
          : defaultCoachPlan(gameDay),
    )
  }
  // Pre-paso de entrenamiento en grupo: por equipo y sesión, cuántos compañeros la entrenan hoy.
  // Un corredor gana bonus si varios del MISMO equipo hacen la MISMA sesión de grupo ese día.
  const teamSessionCount = new Map<string, number>()
  for (const rider of riderRows) {
    const choice = choiceByRider.get(rider.id)
    if (!choice || !rider.teamId) continue
    // Quien viaja no está entrenando con nadie: no cuenta para el bonus de grupo de su equipo.
    if (travelling.has(rider.id)) continue
    const key = `${rider.teamId}:${choice.session}`
    teamSessionCount.set(key, (teamSessionCount.get(key) ?? 0) + 1)
  }

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

    const choice = choiceByRider.get(rider.id) ?? defaultCoachPlan(gameDay)
    // Compañeros (sin contarse) haciendo la misma sesión hoy → bonus de grupo.
    const mates = rider.teamId
      ? (teamSessionCount.get(`${rider.teamId}:${choice.session}`) ?? 1) - 1
      : 0
    const kGroup = groupTrainingMultiplier(choice.session, mates)

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
      kGroup,
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
