import { HEALTH, type RiderDayState, TRAINING, simulateRiderDay } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type Attribute,
  type CoachBlock,
  type Intensity,
  type Session,
  type TrainingChoice,
  type TrainingDayContext,
  type TrainingMode,
  SESSION_CATALOG,
  groupTrainingMultiplier,
  resolveTrainingDay,
  riderAge,
  seasonPosition,
  seededRng,
} from '@cyclingstar/shared'
import { and, eq, gte, inArray, lt, lte } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { ridersTravellingBack, ridersTravellingOutbound } from './riderSchedule.js'
import {
  riderAttrLog,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  teamTrainingOrders,
  teams,
  trainingOrders,
  trainingPlans,
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

/** Un corredor, como lo lee el tick. */
export type TrainingRiderRow = typeof riders.$inferSelect

/**
 * LO QUE EL TICK LEE PARA DECIDIR EL DÍA DE CADA CORREDOR (E3, docs/visual.md §11.4; PR 13a), en lote y
 * para el mundo entero: quién viaja, la orden del día, el plan de equipo, el plan vivo y los dos
 * guardarraíles del entrenador. Lo lee `trainWorldDay` y lo lee el diferencial del tick
 * (`trainingDay.diff.test.ts`), que compara sobre estas mismas lecturas la elección de
 * `resolveTrainingDay` con la de la cadena de antes.
 */
export interface TrainingDayInputs {
  readonly riderRows: readonly TrainingRiderRow[]
  /** quién viaja hoy, a qué carrera y en qué sentido (la ida pisa a la vuelta, como `getRiderTravelDays`) */
  readonly travelByRider: ReadonlyMap<
    string,
    { readonly raceKey: string; readonly direction: 'out' | 'back' }
  >
  readonly ordersByRider: ReadonlyMap<string, typeof trainingOrders.$inferSelect>
  readonly teamPlanByTeam: ReadonlyMap<string, typeof teamTrainingOrders.$inferSelect>
  /** el plan vivo de cada corredor: el de `start_day` mayor de la ventana de 28 días (§11.5) */
  readonly planByRider: ReadonlyMap<string, typeof trainingPlans.$inferSelect>
  /** qué hizo ayer cada uno */
  readonly ayerPorCorredor: ReadonlyMap<string, Session>
  /** cuántas veces apretó cada uno en los siete días anteriores */
  readonly fuertesRecientes: ReadonlyMap<string, number>
}

export async function readTrainingDayInputs(
  tx: Tx,
  worldId: string,
  gameDay: number,
  skip: ReadonlySet<string>,
): Promise<TrainingDayInputs> {
  const riderRows = await tx.select().from(riders).where(eq(riders.worldId, worldId))

  // Quien está de VIAJE hoy (vuelta de una carrera lejana) no ENTRENA —el viaje le cuesta días de
  // trabajo—, pero sí VIVE el día: el catálogo tiene una sesión `viaje` (TSS 15, sin ganancias) que
  // estaba definida y sin enchufar. Antes se le metía en el `skip` y se salía por `continue`, de
  // modo que `applyDailyLoad` no llegaba a ejecutarse nunca: su ATL no bajaba (viajar no descansaba
  // NADA, el corredor quedaba literalmente congelado) y no se escribía fila en `rider_daily_log`,
  // así que el gráfico de forma cosía dos puntos separados por días y la caída salía en vertical.
  // Era la causa de "hice descanso activo y no mejoró mi frescura": la sesión elegida ni corría.
  //
  // El viaje tiene DOS sentidos y los dos se deducen de la convocatoria, con la misma regla que pinta
  // el planificador (`getRiderTravelDays`): la IDA son los días anteriores a la salida
  // (`ridersTravellingOutbound`) y la VUELTA los posteriores al último día (`ridersTravellingBack`).
  // `travel_until_day` NO basta leída sola (`>= hoy`): se escribe al congelar la escuadra, ~2 semanas
  // antes de la salida, y marcaba de viaje al corredor durante todo ese tiempo.
  const homeByRider = new Map<string, string | null>()
  const travelUntilByRider = new Map<string, number | null>()
  for (const rider of riderRows) {
    if (skip.has(rider.id)) continue // ya ha corrido hoy: la carrera manda sobre el viaje
    homeByRider.set(rider.id, rider.residence ?? rider.country)
    travelUntilByRider.set(rider.id, rider.travelUntilDay)
  }
  const travelByRider = new Map<string, { raceKey: string; direction: 'out' | 'back' }>()
  for (const [id, raceKey] of await ridersTravellingBack(
    tx,
    homeByRider,
    travelUntilByRider,
    gameDay,
  )) {
    travelByRider.set(id, { raceKey, direction: 'back' })
  }
  for (const [id, raceKey] of await ridersTravellingOutbound(tx, homeByRider, gameDay)) {
    travelByRider.set(id, { raceKey, direction: 'out' })
  }

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
   * EL PLAN POR BLOQUES (D0-D4, docs/entrenamiento.md §5.3, paso 11), y UNO SOLO (E3, §11.5; PR 13a):
   * de dos planes de la misma ventana, el de `start_day` mayor, el mismo que lee la pantalla
   * (`getPlanForDay`). Hasta el 13a el `Map` se quedaba con la última fila que devolviera el SQL, sin
   * orden, y la pantalla con la primera: con un plan del 101 y otro del 111, el día 115 la escalera
   * enseñaba uno y el tick entrenaba el otro. Desde la `0051` no hay dos, pero la lectura no lo supone.
   */
  const planRows = await tx
    .select()
    .from(trainingPlans)
    .where(and(lte(trainingPlans.startDay, gameDay), gte(trainingPlans.startDay, gameDay - 27)))
  const planByRider = new Map<string, typeof trainingPlans.$inferSelect>()
  for (const p of planRows) {
    const antes = planByRider.get(p.riderId)
    if (antes === undefined || p.startDay > antes.startDay) planByRider.set(p.riderId, p)
  }

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

  return {
    riderRows,
    travelByRider,
    ordersByRider,
    teamPlanByTeam,
    planByRider,
    ayerPorCorredor,
    fuertesRecientes,
  }
}

/**
 * EL DÍA DE UN CORREDOR, en el contexto de `resolveTrainingDay`, de lo leído en lote. Sin la carrera:
 * quien corre hoy ya está en el `skip` del tick y no llega aquí.
 *
 * Lo que el contexto del entrenador todavía NO trae va dicho en vez de fingido: el calendario del
 * corredor. `daysToNextRace`, si esa carrera es su objetivo y el objetivo del equipo salen del roster
 * y del plan de carrera, y eso llega con la pantalla del plan. Sin ellos el entrenador cae en su
 * mesociclo de tres semanas (docs/entrenamiento.md §5.5): no empeora nada y mejora en lo que sí sabe.
 */
export function trainingDayContext(
  rider: TrainingRiderRow,
  inputs: TrainingDayInputs,
  gameDay: number,
): TrainingDayContext {
  const order = inputs.ordersByRider.get(rider.id)
  const team = rider.teamId === null ? undefined : inputs.teamPlanByTeam.get(rider.teamId)
  const fila = inputs.planByRider.get(rider.id)
  return {
    gameDay,
    mode: rider.trainingMode as TrainingMode,
    archetype: rider.archetype,
    race: null,
    travel: inputs.travelByRider.get(rider.id) ?? null,
    order: order === undefined ? null : { session: order.session, intensity: order.intensity },
    plan:
      fila === undefined
        ? null
        : {
            startDay: fila.startDay,
            blocks: [fila.block1, fila.block2, fila.block3, fila.block4] as [
              CoachBlock | null,
              CoachBlock | null,
              CoachBlock | null,
              CoachBlock | null,
            ],
            focusAttr: (fila.focusAttr as Attribute | null) ?? null,
            intensity: (fila.intensity as Intensity | null) ?? null,
          },
    teamPlan: team === undefined ? null : { session: team.session, intensity: team.intensity },
    coach: {
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
      hardLast7: inputs.fuertesRecientes.get(rider.id) ?? 0,
      yesterday: inputs.ayerPorCorredor.get(rider.id) ?? null,
    },
  }
}

export async function trainWorldDay(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
  skip: Set<string> = new Set(),
): Promise<void> {
  const currentSeason = seasonPosition(gameDay).season
  const inputs = await readTrainingDayInputs(tx, worldId, gameDay, skip)
  const { riderRows, travelByRider } = inputs

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

  /**
   * LA SESIÓN DE CADA CORREDOR QUE ENTRENA HOY, con la precedencia de `resolveTrainingDay` (E3, §11.4;
   * PR 13a): el viaje; en `entrenador`, el entrenador; la orden; el bloque de esa semana del plan vivo;
   * el plan de equipo en `mixto` (los del equipo se alinean y ganan el bonus de grupo); y el
   * entrenador, o en `manual` el descanso activo. Es la cadena que vivía aquí, escrita una vez para el
   * tick y la pantalla; `trainingDay.diff.test.ts` sella que elige lo mismo que la de antes.
   */
  const choiceByRider = new Map<string, TrainingChoice>()
  for (const rider of riderRows) {
    if (skip.has(rider.id)) continue
    const dia = resolveTrainingDay(trainingDayContext(rider, inputs, gameDay))
    // la carrera no entrena, y aquí no llega: quien corre hoy está en `skip`
    if (dia.session === null || dia.intensity === null) continue
    choiceByRider.set(rider.id, { session: dia.session, intensity: dia.intensity })
  }
  // Pre-paso de entrenamiento en grupo: por equipo y sesión, cuántos compañeros la entrenan hoy.
  // Un corredor gana bonus si varios del MISMO equipo hacen la MISMA sesión de grupo ese día.
  const teamSessionCount = new Map<string, number>()
  for (const rider of riderRows) {
    const choice = choiceByRider.get(rider.id)
    if (!choice || !rider.teamId) continue
    // Quien viaja no está entrenando con nadie: no cuenta para el bonus de grupo de su equipo.
    if (travelByRider.has(rider.id)) continue
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
