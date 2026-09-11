import { HEALTH, type RiderDayState, TRAINING, simulateRiderDay } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  type TrainingChoice,
  SESSION_CATALOG,
  type Session,
  coachPlan,
  groupTrainingMultiplier,
  riderAge,
  seasonPosition,
  seededRng,
} from '@cyclingstar/shared'
import { and, eq, gte, inArray, lt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { ridersTravellingOutbound } from './riderSchedule.js'
import {
  riderAttrLog,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  teamTrainingOrders,
  teams,
  trainingOrders,
} from './schema.js'

/**
 * El tick entrena (Paso 19, SPEC 5). Por cada día de juego y corredor del mundo aplica la
 * orden (o el plan del entrenador), el modelo de progresión puro del motor, y persiste
 * atributos, estado de forma/salud/moral, el log diario y las variaciones de atributos.
 */

/** La ventana de «esa semana» del SPEC: los siete días anteriores a hoy. */
const TRAINED_WINDOW_DAYS = 7
const VACIO: ReadonlySet<Attribute> = new Set()

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
  //
  // El viaje tiene DOS sentidos. La VUELTA la marca `travel_until_day`, que se escribe al terminar
  // la carrera. La IDA se deduce de la convocatoria (`ridersTravellingOutbound`): el corredor que
  // mañana sale en otro continente hoy está en un avión, no entrenando. Sin esto solo se cobraba
  // medio viaje, y el planificador enseñaba la víspera como un día de trabajo normal.
  const travelling = new Set<string>()
  const homeByRider = new Map<string, string | null>()
  for (const rider of riderRows) {
    if (skip.has(rider.id)) continue // ya ha corrido hoy: la carrera manda sobre el viaje
    if (rider.travelUntilDay != null && rider.travelUntilDay >= gameDay) travelling.add(rider.id)
    else homeByRider.set(rider.id, rider.residence ?? rider.country)
  }
  for (const id of await ridersTravellingOutbound(tx, homeByRider, gameDay)) travelling.add(id)

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

  /**
   * LAS INSTALACIONES Y EL STAFF DE CADA EQUIPO, que hasta aquí no leía nadie.
   *
   * `teams.facilities` se sorteaba al crear el mundo entre 0,90 y 1,20 y `train.ts` pasaba
   * `kInst: 1` a pelo: la columna se rellenaba, decidía cero cosas, y un equipo con instalaciones de
   * 1,20 entrenaba exactamente igual que uno con 0,90. Es el mismo defecto que la v55 encontró en
   * `fame`, y por eso existe la prueba que vigila las columnas con defecto numérico que nadie usa.
   */
  const teamRows = await tx
    .select({ id: teams.id, facilities: teams.facilities, staffLevel: teams.staffLevel })
    .from(teams)
    .where(eq(teams.worldId, worldId))
  const kInstByTeam = new Map(
    teamRows.map((t) => [
      t.id,
      Math.min(TRAINING.kInstMax, Math.max(TRAINING.kInstMin, t.facilities)),
    ]),
  )
  const kStaffByTeam = new Map(
    teamRows.map((t) => [
      t.id,
      Math.min(TRAINING.kStaffMax, 1 + TRAINING.kStaffPerLevel * t.staffLevel),
    ]),
  )

  // La elección de sesión de cada corredor que entrena hoy: su ORDEN propia, si no el PLAN DE EQUIPO
  // (los del equipo se alinean y ganan el bonus de grupo) y, si no hay ninguno, el plan del entrenador.
  /** Qué hizo ayer cada uno y cuántas veces apretó en la semana: los dos guardarraíles del bot. */
  const ayerPorCorredor = new Map<string, Session>()
  const fuertesRecientes = new Map<string, number>()
  for (const fila of await tx
    .select({
      riderId: riderDailyLog.riderId,
      gameDay: riderDailyLog.gameDay,
      activity: riderDailyLog.activity,
      tss: riderDailyLog.tss,
    })
    .from(riderDailyLog)
    .where(and(gte(riderDailyLog.gameDay, gameDay - 7), lt(riderDailyLog.gameDay, gameDay)))) {
    const sesion = fila.activity as Session
    if (fila.gameDay === gameDay - 1) ayerPorCorredor.set(fila.riderId, sesion)
    /**
     * SI APRETÓ ESE DÍA, DEDUCIDO DEL TSS. La bitácora no guarda la intensidad —solo la sesión y la
     * carga—, y sin esto el guardarraíl «nunca fuerte más de un día de cada siete» tendría siempre
     * un cero de entrada: existiría en el código y no dispararía jamás. El TSS es función pura de
     * (sesión, intensidad), así que la deducción es exacta y no una estimación.
     */
    const cat = SESSION_CATALOG[sesion]
    if (cat !== undefined && cat.variableIntensity && fila.tss >= cat.tss.fuerte) {
      fuertesRecientes.set(fila.riderId, (fuertesRecientes.get(fila.riderId) ?? 0) + 1)
    }
  }

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
          : /**
             * EL ENTRENADOR v2 (docs/entrenamiento.md §5.5): decide MIRANDO al corredor —salud,
             * frescura, tensión acumulada, qué hizo ayer, cuántas veces ha apretado esta semana— en
             * vez de recorrer un ciclo fijo de catorce días que no miraba nada.
             *
             * Lo que el contexto todavía NO trae va dicho en vez de fingido: el calendario del
             * corredor. `daysToNextRace`, si esa carrera es su objetivo y el objetivo del equipo
             * salen del roster y del plan de carrera, y eso llega con la pantalla del plan. Sin
             * ellos el entrenador cae en su mesociclo de tres semanas, que es lo que hacía antes:
             * no empeora nada y mejora en lo que sí sabe.
             */
            coachPlan({
              gameDay,
              seasonDay: seasonPosition(gameDay).dayOfSeason,
              archetype: rider.archetype,
              tsb: rider.ctl - rider.atl,
              health: rider.health,
              strainDays: rider.strainDays,
              daysToNextRace: null,
              nextRaceIsGoal: false,
              nextRaceStages: 1,
              teamGoalInDays: null,
              daysSinceBlockEnd: null,
              lastBlockDays: 0,
              hardLast7: fuertesRecientes.get(rider.id) ?? 0,
              yesterday: ayerPorCorredor.get(rider.id) ?? null,
            }),
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

  /**
   * QUÉ MOVIÓ CADA UNO EN LOS ÚLTIMOS SIETE DÍAS, entrenando o corriendo.
   *
   * Amortigua el declive por edad: el SPEC dice «lo que se entrenó esa semana» y el motor miraba
   * solo el día de hoy, así que un veterano que trabaja un atributo tres veces por semana lo veía
   * decaer entero los otros cuatro días. `rider_attr_log` ya tenía el dato y nadie lo leía.
   *
   * Una sola consulta para todo el mundo y no una por corredor: son 442 corredores por día.
   */
  const movidoReciente = new Map<string, Set<Attribute>>()
  for (const fila of await tx
    .select({ riderId: riderAttrLog.riderId, attr: riderAttrLog.attr })
    .from(riderAttrLog)
    .where(
      and(
        gte(riderAttrLog.gameDay, gameDay - TRAINED_WINDOW_DAYS),
        lt(riderAttrLog.gameDay, gameDay),
        inArray(riderAttrLog.source, ['entrenamiento', 'carrera']),
      ),
    )) {
    const set = movidoReciente.get(fila.riderId) ?? new Set<Attribute>()
    set.add(fila.attr)
    movidoReciente.set(fila.riderId, set)
  }

  /**
   * CUÁNTAS SESIONES DE GIMNASIO LLEVA CADA UNO EN DOS SEMANAS. Dos o más bajan su fragilidad
   * efectiva un 5 %, que es lo que el SPEC promete del gimnasio y hasta ahora no hacía nadie.
   * Sale de la bitácora diaria, que ya guarda qué hizo cada uno cada día.
   */
  const gimnasioReciente = new Map<string, number>()
  for (const fila of await tx
    .select({ riderId: riderDailyLog.riderId })
    .from(riderDailyLog)
    .where(
      and(
        gte(riderDailyLog.gameDay, gameDay - HEALTH.gymWindowDays),
        lt(riderDailyLog.gameDay, gameDay),
        eq(riderDailyLog.activity, 'gimnasio'),
      ),
    )) {
    gimnasioReciente.set(fila.riderId, (gimnasioReciente.get(fila.riderId) ?? 0) + 1)
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

    // Ya decidido arriba, en el pre-paso que cuenta cuántos entrenan lo mismo hoy.
    const choice = choiceByRider.get(rider.id) ?? {
      session: 'fondo' as const,
      intensity: 'normal' as const,
    }
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
      strainDays: rider.strainDays,
      illDays: rider.illDays,
    }

    const result = simulateRiderDay(state, {
      gameDay,
      age: riderAge(rider.birthSeason, currentSeason),
      ceilings: hidden.ceilings as Record<Attribute, number>,
      talent: hidden.talent,
      fragility: hidden.fragility,
      peakAge: hidden.peakAge,
      declineAge: hidden.declineAge,
      choice,
      kInst: rider.teamId ? (kInstByTeam.get(rider.teamId) ?? 1) : 1,
      kStaff: rider.teamId ? (kStaffByTeam.get(rider.teamId) ?? 1) : 1,
      kGroup,
      trainedLast7: movidoReciente.get(rider.id) ?? VACIO,
      gymSessionsLast14: gimnasioReciente.get(rider.id) ?? 0,
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
        strainDays: result.state.strainDays ?? 0,
        illDays: result.state.illDays ?? 0,
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
        /**
         * ORIGEN `entrenamiento`, y lo que eso quiere decir HOY con exactitud: este delta es el
         * NETO del día —ganancia menos declive menos detraining— porque `simulateRiderDay` devuelve
         * el estado final y no el desglose. El enum tiene `declive` y `detraining` porque los va a
         * necesitar, pero escribirlos ahora sería repartir un número que nadie ha separado.
         */
        attrLogValues.push({
          riderId: rider.id,
          gameDay,
          attr,
          delta: after - before,
          source: 'entrenamiento',
        })
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
