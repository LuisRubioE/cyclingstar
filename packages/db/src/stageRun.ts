import {
  ENGINE_VERSION,
  STAGE,
  type AutoOrderRider,
  type RaceClass,
  type RaceLevel,
  type StageInput,
  type StageOrders,
  type StageRider,
  applyDailyLoad,
  autoStageOrders,
  eff0,
  initialEnergy,
  isDeepDepleted,
  matchCount,
  simulateStage,
  stageSeed,
  stageTss,
} from '@cyclingstar/engine'
import { ATTRIBUTES, type Attribute } from '@cyclingstar/shared'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { awardRacePrizes } from './economy.js'
import { emitNews } from './news.js'
import { addGcPoints, addStagePoints, recordPalmares } from './ranking.js'
import {
  raceGc,
  raceRosters,
  riderAttrLog,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  stageOrders,
  stageResults,
  stageSnapshots,
} from './schema.js'

/**
 * Motor de una etapa en la capa de datos (Paso 30/44). Genérico por carrera: construye el snapshot
 * de cada corredor del roster (eff0, cerillos, órdenes), ejecuta el motor con la semilla sellada, y
 * persiste resultados, general, snapshot, la carga real (TSS), premios, noticias, puntos y palmarés.
 * Todo con lecturas en lote para sostener campos grandes. Devuelve quién corrió (para omitir su
 * entrenamiento). El almacenamiento se indexa por `raceKey` (puede llevar temporada) y `stageDay`.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const ENGINE_VERSION_NUM: number = ENGINE_VERSION
const RACE_XP_BASE = 0.5
/** El maillot de líder da alas: el líder de la general rinde ~4% por encima de su nivel efectivo. */
const LEADER_JERSEY_BOOST = 1.04
const STAGE_XP_ATTRS: Record<string, Attribute[]> = {
  llana: ['LLA', 'SPR'],
  media: ['MON', 'LLA'],
  reina: ['MON', 'COL'],
  cri: ['CRI'],
  clasica: ['COL', 'PAV'],
}

export interface StageRunSpec {
  /** Clave de almacenamiento (results/gc/snapshots/rosters). Puede incluir la temporada. */
  raceKey: string
  /** Id estable de la carrera entre temporadas, para el palmarés y el historial. */
  raceId: string
  raceName: string
  level: RaceLevel
  /** Clase de la carrera (.WT/.Pro/.1/.2/.NC): escala los puntos de ranking. */
  raceClass: RaceClass
  season: number
  /** Número de etapa (1-based), usado como stageDay en el almacenamiento y para mostrar. */
  stageDay: number
  kind: string
  profile: StageInput['profile']
  timeTrial: boolean
  isFinal: boolean
}

/** Corre una etapa de una carrera cualquiera desde su roster. Devuelve los corredores que corrieron. */
export async function runOneStage(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
  spec: StageRunSpec,
): Promise<Set<string>> {
  const roster = await tx
    .select({ riderId: raceRosters.riderId })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .where(
      and(
        eq(raceRosters.raceId, spec.raceKey),
        eq(riders.worldId, worldId),
        // Un corredor que abandonó en una etapa anterior está fuera del resto de la vuelta (SPEC 6.14).
        isNull(raceRosters.abandonedDay),
      ),
    )
  const riderIds = roster.map((r) => r.riderId)
  if (riderIds.length === 0) return new Set()

  const gcRows = await tx.select().from(raceGc).where(eq(raceGc.raceId, spec.raceKey))
  const gcTime = new Map(gcRows.map((r) => [r.riderId, r.tiempoTotalS]))
  const gcLeader = gcRows.length > 0 ? Math.min(...gcRows.map((r) => r.tiempoTotalS)) : 0

  // Lecturas en lote: corredores, atributos, genoma y órdenes de la etapa.
  const riderRows = await tx.select().from(riders).where(inArray(riders.id, riderIds))
  const riderById = new Map(riderRows.map((r) => [r.id, r]))

  const attrRows = await tx
    .select({ riderId: riderAttrs.riderId, attr: riderAttrs.attr, value: riderAttrs.value })
    .from(riderAttrs)
    .where(inArray(riderAttrs.riderId, riderIds))
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
    .select({ riderId: riderHidden.riderId, ceilings: riderHidden.ceilings })
    .from(riderHidden)
    .where(inArray(riderHidden.riderId, riderIds))
  const ceilingsByRider = new Map(
    hiddenRows.map((h) => [h.riderId, h.ceilings as Record<Attribute, number>]),
  )

  const orderRows = await tx
    .select()
    .from(stageOrders)
    .where(and(eq(stageOrders.raceId, spec.raceKey), eq(stageOrders.stageDay, spec.stageDay)))
  const ordersByRider = new Map(orderRows.map((o) => [o.riderId, o]))

  // Vaciado profundo de AYER (SPEC 6.6): quien terminó la etapa anterior por debajo del 12% de su
  // depósito arranca hoy con un cerillo menos. No hay columna donde guardarlo, así que se reconstruye
  // del diario: `tss = gasto · tssPerWorkUnit`, y el depósito de aquel día se recalcula con su CTL/TSB
  // registrados. La aproximación es que el CTL del diario es el POSTERIOR a aplicar la carga (unos
  // pocos puntos por encima del que se usó): un desvío por debajo del 1% del tanque.
  const yesterdayRows = await tx
    .select({
      riderId: riderDailyLog.riderId,
      tss: riderDailyLog.tss,
      ctl: riderDailyLog.ctl,
      tsb: riderDailyLog.tsb,
      activity: riderDailyLog.activity,
    })
    .from(riderDailyLog)
    .where(and(inArray(riderDailyLog.riderId, riderIds), eq(riderDailyLog.gameDay, gameDay - 1)))
  const deepDepletedYesterday = new Set<string>()
  for (const row of yesterdayRows) {
    if (!row.activity.startsWith('carrera:')) continue
    const rider = riderById.get(row.riderId)
    if (!rider) continue
    const prevEnergy0 = initialEnergy(row.ctl, row.tsb, rider.health)
    const spent = row.tss / STAGE.tssPerWorkUnit
    if (isDeepDepleted(Math.max(0, prevEnergy0 - spent), prevEnergy0)) {
      deepDepletedYesterday.add(row.riderId)
    }
  }

  const stageRiders: StageRider[] = []
  const riderState = new Map<
    string,
    {
      attributes: Record<Attribute, number>
      ctl: number
      atl: number
      ceilings: Record<Attribute, number>
    }
  >()

  // Órdenes automáticas para quien no trae plan del jugador: sin ellas el pelotón NPC correría todo
  // "libre/reservón" y no se formarían fugas ni valdría el trabajo de equipo (SPEC 6.18). Se calcula
  // por atributos base (determinista) y solo se usa como respaldo: una orden explícita siempre manda.
  const zeroAttrs = (): Record<Attribute, number> =>
    Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Record<Attribute, number>
  const autoRiders: AutoOrderRider[] = riderIds
    .filter((id) => riderById.has(id))
    .map((id) => ({
      riderId: id,
      attrs: attrsByRider.get(id) ?? zeroAttrs(),
      teamId: riderById.get(id)!.teamId ?? null,
    }))
  const autoOrders = autoStageOrders(autoRiders, { kind: spec.kind, timeTrial: spec.timeTrial })

  for (const riderId of riderIds) {
    const rider = riderById.get(riderId)
    if (!rider) continue
    const attributes =
      attrsByRider.get(riderId) ??
      (Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Record<Attribute, number>)
    const ceilings = ceilingsByRider.get(riderId) ?? ({} as Record<Attribute, number>)

    const tsb = rider.ctl - rider.atl
    const effResolved = {} as Record<Attribute, number>
    for (const attr of ATTRIBUTES) {
      effResolved[attr] = eff0(attributes[attr], rider.ctl, tsb, rider.health, rider.morale)
    }
    const o = ordersByRider.get(riderId)
    const auto = autoOrders.get(riderId)
    const orders: StageOrders = o
      ? {
          role: o.role,
          mentality: o.mentality,
          contestSprints: o.contestSprints,
          contestClimbs: o.contestClimbs,
          ...(o.targetRiderId ? { targetRiderId: o.targetRiderId } : {}),
        }
      : (auto ?? {
          role: 'libre',
          mentality: 'reservon',
          contestSprints: false,
          contestClimbs: false,
        })
    // Depósito inicial dependiente del ESTADO (docs/motor.md §VI.1): forma (CTL), frescura (TSB) y
    // salud. Antes era `energy: 100` para todos, y por eso la erosión no se activaba jamás y la
    // etapa 18 de una gran vuelta se corría con el mismo tanque que la 1.ª. El arrastre entre etapas
    // sale gratis del Banister: `applyDailyLoad` sube el ATL con el TSS real de cada etapa, el TSB
    // baja solo y el depósito mengua con él, sin ningún estado paralelo de "fatiga de carrera".
    const energy0 = initialEnergy(rider.ctl, tsb, rider.health)
    stageRiders.push({
      riderId,
      eff0: effResolved,
      energy: energy0,
      // Vaciado profundo del día anterior: quien terminó por debajo del 12% de su depósito sale
      // hoy con un cerillo menos (SPEC 6.6). Hasta ahora el flag nunca se pasaba.
      matches: matchCount(effResolved, tsb, deepDepletedYesterday.has(riderId)),
      tsb,
      orders,
      gcDeficitSeconds: (gcTime.get(riderId) ?? 0) - gcLeader,
    })
    riderState.set(riderId, { attributes, ctl: rider.ctl, atl: rider.atl, ceilings })
  }
  if (stageRiders.length === 0) return new Set()

  // El maillot de líder "da alas": quien defiende la general (déficit 0) rinde un poco por encima de
  // su nivel, como en el ciclismo real. Solo cuando existe jersey de verdad (hay una brecha en la
  // general: alguien con déficit > 0), así que en la etapa 1 y en carreras de un día no aplica.
  const hasLeaderJersey = stageRiders.some((r) => r.gcDeficitSeconds > 0)
  if (hasLeaderJersey) {
    for (const r of stageRiders) {
      if (r.gcDeficitSeconds !== 0) continue
      for (const attr of ATTRIBUTES) {
        r.eff0[attr] = Math.min(100, r.eff0[attr] * LEADER_JERSEY_BOOST)
      }
    }
  }

  const seed = stageSeed({
    worldSeed,
    raceId: spec.raceKey,
    stageDay: spec.stageDay,
    engineVersion: ENGINE_VERSION_NUM,
  })
  const input: StageInput = {
    profile: spec.profile,
    riders: stageRiders,
    ...(spec.timeTrial ? { timeTrial: true } : {}),
  }
  const output = simulateStage(input, seed)

  await tx
    .insert(stageSnapshots)
    .values({
      raceId: spec.raceKey,
      stageDay: spec.stageDay,
      seed,
      engineVersion: ENGINE_VERSION_NUM,
      input: input as unknown,
      // Congela la crónica JUNTO al resultado: el journal se leerá de aquí, no se re-simula al vuelo,
      // así siempre cuadra con el resultado guardado aunque el motor cambie después.
      events: output.events as unknown,
    })
    .onConflictDoNothing()

  const dailyLogValues: (typeof riderDailyLog.$inferInsert)[] = []
  const attrLogValues: (typeof riderAttrLog.$inferInsert)[] = []
  const raced = new Set<string>()

  for (const result of output.results) {
    raced.add(result.riderId)
    await tx
      .insert(stageResults)
      .values({
        raceId: spec.raceKey,
        stageDay: spec.stageDay,
        riderId: result.riderId,
        puesto: result.puesto,
        tiempoS: result.tiempoS,
        bonificacionS: result.bonificacionS,
        puntosVolante: result.puntosVolante,
        puntosMontana: result.puntosMontana,
      })
      .onConflictDoNothing()

    const netTime = Math.max(0, result.tiempoS - result.bonificacionS)
    const prev = gcRows.find((r) => r.riderId === result.riderId)
    const totals = {
      tiempoTotalS: (prev?.tiempoTotalS ?? 0) + netTime,
      puntosVolante: (prev?.puntosVolante ?? 0) + result.puntosVolante,
      puntosMontana: (prev?.puntosMontana ?? 0) + result.puntosMontana,
    }
    await tx
      .insert(raceGc)
      .values({ raceId: spec.raceKey, riderId: result.riderId, ...totals })
      .onConflictDoUpdate({ target: [raceGc.raceId, raceGc.riderId], set: totals })

    const state = riderState.get(result.riderId)
    if (!state) continue
    const tss = stageTss(output.workUnits.get(result.riderId) ?? 0)
    const load = applyDailyLoad({ ctl: state.ctl, atl: state.atl }, tss, state.attributes.REC)
    await tx
      .update(riders)
      .set({ ctl: load.ctl, atl: load.atl })
      .where(eq(riders.id, result.riderId))
    dailyLogValues.push({
      riderId: result.riderId,
      gameDay,
      tss,
      ctl: load.ctl,
      atl: load.atl,
      tsb: load.tsb,
      activity: `carrera:${spec.raceId}:e${spec.stageDay}`,
    })

    const gainAttrs = new Set<Attribute>([...(STAGE_XP_ATTRS[spec.kind] ?? []), 'TAC'])
    for (const attr of gainAttrs) {
      const before = state.attributes[attr]
      const ceiling = state.ceilings[attr] ?? 100
      const gain = Math.max(0, RACE_XP_BASE * Math.max(0, (ceiling - before) / 30))
      if (gain <= 0) continue
      const after = Math.min(ceiling, before + gain)
      if (after === before) continue
      await tx
        .update(riderAttrs)
        .set({ value: after })
        .where(and(eq(riderAttrs.riderId, result.riderId), eq(riderAttrs.attr, attr)))
      attrLogValues.push({ riderId: result.riderId, gameDay, attr, delta: after - before })
    }
  }

  await insertChunked(dailyLogValues, 1000, (chunk) =>
    tx.insert(riderDailyLog).values(chunk).onConflictDoNothing(),
  )
  await insertChunked(attrLogValues, 2000, (chunk) =>
    tx.insert(riderAttrLog).values(chunk).onConflictDoNothing(),
  )

  // Consecuencias de las caídas (SPEC 6.14): una caída con baja deja al corredor LESIONADO varios días
  // (rinde peor y puede perderse próximas carreras); las más graves obligan a ABANDONAR la vuelta.
  await applyIncidents(tx, worldId, gameDay, spec.raceKey, output.incidents, riderById)

  await awardOutcome(tx, worldId, gameDay, spec, output)
  return raced
}

/** Umbral de baja (días) a partir del cual una caída obliga a abandonar la carrera. */
const ABANDON_DAYS_THRESHOLD = 15

/**
 * Aplica las incidencias de la etapa (SPEC 6.14): marca al corredor LESIONADO hasta `gameDay+diasBaja`
 * (sin acortar una baja mayor ya vigente) y, si la caída es grave, lo hace ABANDONAR la carrera
 * (no toma la salida en las etapas siguientes). Emite una noticia de lesión por corredor afectado.
 */
async function applyIncidents<
  R extends { name: string; health: string; healthUntilDay: number | null },
>(
  tx: Tx,
  worldId: string,
  gameDay: number,
  raceKey: string,
  incidents: Awaited<ReturnType<typeof simulateStage>>['incidents'],
  riderById: Map<string, R>,
): Promise<void> {
  if (incidents.length === 0) return
  // Peor incidencia por corredor (la de más días de baja manda).
  const worst = new Map<string, (typeof incidents)[number]>()
  for (const inc of incidents) {
    const prev = worst.get(inc.riderId)
    if (!prev || inc.diasBaja > prev.diasBaja) worst.set(inc.riderId, inc)
  }
  for (const [riderId, inc] of worst) {
    if (inc.diasBaja <= 0) continue // un susto sin baja: solo pierde tiempo en la etapa, sin secuelas.
    const rider = riderById.get(riderId)
    const until = gameDay + inc.diasBaja
    const currentUntil =
      rider && (rider.health === 'lesionado' || rider.health === 'enfermo')
        ? (rider.healthUntilDay ?? 0)
        : 0
    await tx
      .update(riders)
      .set({ health: 'lesionado', healthUntilDay: Math.max(currentUntil, until) })
      .where(eq(riders.id, riderId))

    const abandons = inc.severidad === 'major' || inc.diasBaja >= ABANDON_DAYS_THRESHOLD
    if (abandons) {
      await tx
        .update(raceRosters)
        .set({ abandonedDay: gameDay })
        .where(and(eq(raceRosters.raceId, raceKey), eq(raceRosters.riderId, riderId)))
    }
    // Duración concreta de la baja para el titular: semanas si es larga, días si es corta.
    const outFor =
      inc.diasBaja >= 14
        ? `${Math.round(inc.diasBaja / 7)} weeks`
        : `${inc.diasBaja} day${inc.diasBaja === 1 ? '' : 's'}`
    await emitNews(tx, {
      worldId,
      gameDay,
      kind: 'injury',
      seed: `injury:${raceKey}:${gameDay}:${riderId}`,
      data: { rider: rider?.name ?? 'A rider', detail: outFor },
      riderId,
    })
  }
}

/** Premios, noticias, puntos y palmarés de la etapa (SPEC 9, Paso 38-40). */
async function awardOutcome(
  tx: Tx,
  worldId: string,
  gameDay: number,
  spec: StageRunSpec,
  output: Awaited<ReturnType<typeof simulateStage>>,
): Promise<void> {
  const stageWinner = output.results.find((r) => r.puesto === 1)
  if (!stageWinner) return

  const gcOrder = (
    await tx
      .select({ riderId: raceGc.riderId })
      .from(raceGc)
      .where(eq(raceGc.raceId, spec.raceKey))
      .orderBy(asc(raceGc.tiempoTotalS))
  ).map((r) => r.riderId)

  await awardRacePrizes(
    tx,
    gameDay,
    spec.level,
    spec.raceName,
    stageWinner.riderId,
    spec.isFinal,
    gcOrder,
  )

  const komLeader = [...output.results]
    .filter((r) => r.puntosMontana > 0)
    .sort((a, b) => b.puntosMontana - a.puntosMontana)[0]
  const brokeAway =
    output.events.some((e) => e.tipo === 'fuga_formada') &&
    !output.events.some((e) => e.tipo === 'fuga_cazada')
  const nameIds = [stageWinner.riderId, komLeader?.riderId, gcOrder[0]].filter((id): id is string =>
    Boolean(id),
  )
  const nameRows = await tx
    .select({ id: riders.id, name: riders.name })
    .from(riders)
    .where(inArray(riders.id, nameIds))
  const nameOf = (id: string): string => nameRows.find((r) => r.id === id)?.name ?? 'A rider'
  const seedBase = `${spec.raceKey}:${gameDay}:${spec.stageDay}`

  // En una carrera de UN DÍA (etapa única = final) la victoria de etapa y la general son la misma:
  // se emite UNA sola noticia (la victoria en la carrera), con lenguaje de contrarreloj si es CRI.
  const timeTrial = spec.timeTrial === true
  const isOneDay = spec.isFinal && spec.stageDay === 1
  const winKind = isOneDay
    ? timeTrial
      ? 'one_day_tt_win'
      : 'one_day_win'
    : brokeAway
      ? 'breakaway_win'
      : timeTrial
        ? 'tt_win'
        : 'stage_win'
  await emitNews(tx, {
    worldId,
    gameDay,
    kind: winKind,
    seed: `win:${seedBase}`,
    data: { rider: nameOf(stageWinner.riderId), race: spec.raceName, stage: spec.stageDay },
    riderId: stageWinner.riderId,
  })
  const gcWinnerId = gcOrder[0]
  // La general y la MONTAÑA son eventos aparte solo en carreras POR ETAPAS y solo al TERMINAR: un
  // único titular por carrera (el ganador global), no uno por etapa —eso inundaba el feed—.
  if (spec.isFinal && !isOneDay) {
    if (gcWinnerId) {
      await emitNews(tx, {
        worldId,
        gameDay,
        kind: 'gc_win',
        seed: `gc:${seedBase}`,
        data: { rider: nameOf(gcWinnerId), race: spec.raceName },
        riderId: gcWinnerId,
      })
    }
    // Ganador de la clasificación de la montaña (suma de puntos de cima de toda la carrera).
    const komRows = await tx
      .select({
        riderId: stageResults.riderId,
        name: riders.name,
        pts: sql<number>`sum(${stageResults.puntosMontana})::int`,
      })
      .from(stageResults)
      .innerJoin(riders, eq(riders.id, stageResults.riderId))
      .where(eq(stageResults.raceId, spec.raceKey))
      .groupBy(stageResults.riderId, riders.name)
      .orderBy(desc(sql`sum(${stageResults.puntosMontana})`))
      .limit(1)
    const komWinner = komRows[0]
    if (komWinner && komWinner.pts > 0) {
      await emitNews(tx, {
        worldId,
        gameDay,
        kind: 'kom',
        seed: `kom:${spec.raceKey}`,
        data: { rider: komWinner.name, race: spec.raceName },
        riderId: komWinner.riderId,
      })
    }
  }

  // En una carrera de UN DÍA la etapa ES la general: no se dan puntos de etapa (contarían doble con
  // los de general de abajo). El resultado reparte en la escala de general (más prestigio que una etapa).
  if (!isOneDay) {
    for (const r of output.results) {
      await addStagePoints(tx, r.riderId, spec.raceClass, r.puesto - 1)
    }
  }
  // En una carrera de UN DÍA (etapa única = final) la victoria de etapa y la general son la MISMA:
  // no se registra honor de etapa (contaría doble en el palmarés); solo cuenta como victoria de general.
  if (!isOneDay) {
    await recordPalmares(tx, {
      worldId,
      riderId: stageWinner.riderId,
      season: spec.season,
      raceId: spec.raceId,
      raceName: spec.raceName,
      kind: 'stage',
      detail: `Stage ${spec.stageDay}`,
      gameDay,
    })
  }
  if (spec.isFinal) {
    for (let i = 0; i < gcOrder.length; i++) {
      await addGcPoints(tx, gcOrder[i]!, spec.raceClass, i)
    }
    if (gcWinnerId) {
      await recordPalmares(tx, {
        worldId,
        riderId: gcWinnerId,
        season: spec.season,
        raceId: spec.raceId,
        raceName: spec.raceName,
        kind: 'gc',
        gameDay,
      })
    }
  }
}

async function insertChunked<T>(
  rows: T[],
  size: number,
  insert: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size))
  }
}
