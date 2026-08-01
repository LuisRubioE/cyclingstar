import {
  type StageInput,
  type StageOrders,
  type StageRider,
  TEST_TOUR,
  applyDailyLoad,
  eff0,
  matchCount,
  simulateStage,
  stageSeed,
  stageTss,
} from '@cyclingstar/engine'
import { ATTRIBUTES, type Attribute, seasonPosition } from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { ensureTestTourField } from './npc.js'
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
 * El tick corre etapas (Paso 30, SPEC 6). En un día de juego con etapa, construye el snapshot de
 * entrada de cada corredor convocado (eff0 desde Banister, cerillos, órdenes), ejecuta el motor
 * con la semilla sellada, y persiste resultados, general, snapshot y la carga real (TSS) de la
 * jornada. Devuelve los corredores que corrieron para que el entrenamiento del día los omita.
 */

const TEST_TOUR_ID = 'test-tour'
const ENGINE_VERSION_NUM = 1
/** Tamaño del pelotón de la vuelta de prueba (humanos + NPC de relleno). */
const TEST_TOUR_FIELD = 30

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Atributos que una etapa entrena por su terreno (SPEC 5.3). TAC se aprende corriendo siempre. */
const STAGE_XP_ATTRS: Record<string, Attribute[]> = {
  llana: ['LLA', 'SPR'],
  media: ['MON', 'LLA'],
  reina: ['MON', 'COL'],
  cri: ['CRI'],
}
const RACE_XP_BASE = 0.5

/** La etapa de la vuelta de prueba que corre en este día de juego, o null. */
function stageForDay(gameDay: number): (typeof TEST_TOUR)[number] | null {
  return TEST_TOUR.find((s) => s.day === gameDay) ?? null
}

export async function raceWorldDay(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
): Promise<Set<string>> {
  const stage = stageForDay(gameDay)
  if (!stage) return new Set()

  // Rellena el pelotón con NPC si hace falta, para que la etapa sea una carrera de verdad (Paso 32).
  await ensureTestTourField(tx, worldId, worldSeed, TEST_TOUR_FIELD, seasonPosition(gameDay).season)

  // Corredores convocados a la vuelta que pertenecen a este mundo.
  const roster = await tx
    .select({ riderId: raceRosters.riderId })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .where(and(eq(raceRosters.raceId, TEST_TOUR_ID), eq(riders.worldId, worldId)))
  if (roster.length === 0) return new Set()

  // General previa, para el contexto de desventaja (SPEC 6.9).
  const gcRows = await tx.select().from(raceGc).where(eq(raceGc.raceId, TEST_TOUR_ID))
  const gcTime = new Map(gcRows.map((r) => [r.riderId, r.tiempoTotalS]))
  const gcLeader = gcRows.length > 0 ? Math.min(...gcRows.map((r) => r.tiempoTotalS)) : 0

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

  for (const { riderId } of roster) {
    const riderRows = await tx.select().from(riders).where(eq(riders.id, riderId)).limit(1)
    const rider = riderRows[0]
    if (!rider) continue

    const attrRows = await tx.select().from(riderAttrs).where(eq(riderAttrs.riderId, riderId))
    const attributes = {} as Record<Attribute, number>
    for (const attr of ATTRIBUTES) attributes[attr] = 0
    for (const row of attrRows) attributes[row.attr] = row.value

    const hiddenRows = await tx
      .select({ ceilings: riderHidden.ceilings })
      .from(riderHidden)
      .where(eq(riderHidden.riderId, riderId))
      .limit(1)
    const ceilings =
      (hiddenRows[0]?.ceilings as Record<Attribute, number>) ?? ({} as Record<Attribute, number>)

    const tsb = rider.ctl - rider.atl
    const effResolved = {} as Record<Attribute, number>
    for (const attr of ATTRIBUTES) {
      effResolved[attr] = eff0(attributes[attr], rider.ctl, tsb, rider.health, rider.morale)
    }

    const orderRows = await tx
      .select()
      .from(stageOrders)
      .where(
        and(
          eq(stageOrders.raceId, TEST_TOUR_ID),
          eq(stageOrders.riderId, riderId),
          eq(stageOrders.stageDay, stage.day),
        ),
      )
      .limit(1)
    const o = orderRows[0]
    const orders: StageOrders = {
      role: o?.role ?? 'libre',
      mentality: o?.mentality ?? 'reservon',
      contestSprints: o?.contestSprints ?? false,
      contestClimbs: o?.contestClimbs ?? false,
      ...(o?.targetRiderId ? { targetRiderId: o.targetRiderId } : {}),
    }

    stageRiders.push({
      riderId,
      eff0: effResolved,
      energy: 100,
      matches: matchCount(effResolved, tsb),
      tsb,
      orders,
      gcDeficitSeconds: (gcTime.get(riderId) ?? 0) - gcLeader,
    })
    riderState.set(riderId, { attributes, ctl: rider.ctl, atl: rider.atl, ceilings })
  }

  if (stageRiders.length === 0) return new Set()

  const seed = stageSeed({
    worldSeed,
    raceId: TEST_TOUR_ID,
    stageDay: stage.day,
    engineVersion: ENGINE_VERSION_NUM,
  })
  const input: StageInput = {
    profile: stage.profile,
    riders: stageRiders,
    ...(stage.timeTrial ? { timeTrial: true } : {}),
  }
  const output = simulateStage(input, seed)

  // Snapshot para replays regenerables (SPEC 6.1).
  await tx
    .insert(stageSnapshots)
    .values({
      raceId: TEST_TOUR_ID,
      stageDay: stage.day,
      seed,
      engineVersion: ENGINE_VERSION_NUM,
      input: input as unknown,
    })
    .onConflictDoNothing()

  const raced = new Set<string>()
  for (const result of output.results) {
    raced.add(result.riderId)
    // Resultado de la etapa.
    await tx
      .insert(stageResults)
      .values({
        raceId: TEST_TOUR_ID,
        stageDay: stage.day,
        riderId: result.riderId,
        puesto: result.puesto,
        tiempoS: result.tiempoS,
        bonificacionS: result.bonificacionS,
        puntosVolante: result.puntosVolante,
        puntosMontana: result.puntosMontana,
      })
      .onConflictDoNothing()

    // General acumulada: el tiempo neto (menos bonificaciones) y los puntos.
    const netTime = Math.max(0, result.tiempoS - result.bonificacionS)
    const prev = gcRows.find((r) => r.riderId === result.riderId)
    await tx
      .insert(raceGc)
      .values({
        raceId: TEST_TOUR_ID,
        riderId: result.riderId,
        tiempoTotalS: (prev?.tiempoTotalS ?? 0) + netTime,
        puntosVolante: (prev?.puntosVolante ?? 0) + result.puntosVolante,
        puntosMontana: (prev?.puntosMontana ?? 0) + result.puntosMontana,
      })
      .onConflictDoUpdate({
        target: [raceGc.raceId, raceGc.riderId],
        set: {
          tiempoTotalS: (prev?.tiempoTotalS ?? 0) + netTime,
          puntosVolante: (prev?.puntosVolante ?? 0) + result.puntosVolante,
          puntosMontana: (prev?.puntosMontana ?? 0) + result.puntosMontana,
        },
      })

    // Carga real de la jornada (TSS de la carrera) al Banister y a la gráfica de forma.
    const state = riderState.get(result.riderId)
    if (!state) continue
    const tss = stageTss(output.workUnits.get(result.riderId) ?? 0)
    const load = applyDailyLoad({ ctl: state.ctl, atl: state.atl }, tss, state.attributes.REC)
    await tx
      .update(riders)
      .set({ ctl: load.ctl, atl: load.atl })
      .where(eq(riders.id, result.riderId))
    await tx
      .insert(riderDailyLog)
      .values({
        riderId: result.riderId,
        gameDay,
        tss,
        ctl: load.ctl,
        atl: load.atl,
        tsb: load.tsb,
        activity: `carrera:${TEST_TOUR_ID}:e${stage.day}`,
      })
      .onConflictDoNothing()

    // Ganancias de atributos por correr (SPEC 5.3): terreno de la etapa + táctica siempre.
    const gainAttrs = new Set<Attribute>([...(STAGE_XP_ATTRS[stage.kind] ?? []), 'TAC'])
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
      await tx
        .insert(riderAttrLog)
        .values({ riderId: result.riderId, gameDay, attr, delta: after - before })
        .onConflictDoNothing()
    }
  }

  return raced
}
