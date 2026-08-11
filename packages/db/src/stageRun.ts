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
  gcPointsByClass,
  initialEnergy,
  injuryEndsRace,
  isDeepDepleted,
  matchCount,
  raceIllnessProbability,
  simulateStage,
  stagePointsByClass,
  stageSeed,
  stageTss,
} from '@cyclingstar/engine'
import { ATTRIBUTES, type Attribute, seededRng } from '@cyclingstar/shared'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { BATCH_ROWS, type BatchValue, inChunks, valuesList } from './batch.js'
import { awardRacePrizes } from './economy.js'
import { gcOrderBy } from './gcSort.js'
import { emitNews } from './news.js'
import { addSeasonPointsBatch, recordPalmares } from './ranking.js'
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
  stageTeamResults,
} from './schema.js'
import { teamStageScores } from './teamClassification.js'

/**
 * Motor de una etapa en la capa de datos (Paso 30/44). Genérico por carrera: construye el snapshot
 * de cada corredor del roster (eff0, cerillos, órdenes), ejecuta el motor con la semilla sellada, y
 * persiste resultados, general, snapshot, la carga real (TSS), premios, noticias, puntos y palmarés.
 * Todo con lecturas en lote para sostener campos grandes. Devuelve quién corrió (para omitir su
 * entrenamiento). El almacenamiento se indexa por `raceKey` (puede llevar temporada) y `stageDay`.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * La versión del motor entra en `stageSeed()` y se sella en `stage_runs`: DEBE venir del propio
 * motor. Estuvo cableada a 1, así que subir `ENGINE_VERSION` no cambiaba ninguna semilla real ni
 * sellaba los replays (un cambio de comportamiento reproducía las etapas viejas con la física nueva).
 */
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

/**
 * Una carrera de UN DÍA: su única etapa es también la final. La etapa ES el resultado, no hay general
 * separada que construir, y de ahí cuelgan sus reglas —sin bonificaciones de tiempo, un solo titular y
 * una sola entrada de palmarés—. Vive aquí para que la condición no se repita con matices distintos.
 */
function isOneDayRace(spec: StageRunSpec): boolean {
  return spec.isFinal && spec.stageDay === 1
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
    // EL DORSAL viaja al motor desde aquí (v18), igual que el `gcDeficitSeconds`: la contrarreloj
    // reparte la rampa de salida por dorsales cuando no hay general que invertir, y el motor es puro
    // y no puede inventárselo (`packages/engine/src/stage/startOrder.ts`).
    .select({ riderId: raceRosters.riderId, bib: raceRosters.bib })
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
  const bibOf = new Map(roster.map((r) => [r.riderId, r.bib]))

  // Una carrera de UN DÍA no tiene general que construir, así que NO lleva bonificaciones de tiempo
  // (como en el ciclismo real). El motor las reparte siempre —es puro y no sabe de calendarios—, así
  // que se anulan aquí, tanto en lo que se guarda en `stage_results` como en el tiempo neto que
  // alimenta la general. Sin esto el ganador aparecía con 10 s menos que su propio tiempo de meta.
  const isOneDay = isOneDayRace(spec)

  // La general viene ORDENADA con el desempate del ciclismo (`gcSort.ts`: tiempo · suma de puestos ·
  // puesto en la última etapa), porque desde la v19 al motor no le viaja solo el tiempo sino también
  // el PUESTO: en una crono el orden inverso de salida se reparte por puesto, y con el tiempo a
  // secas los 112 empatados de una etapa 2 le llegaban indistinguibles.
  const gcRows = await tx
    .select()
    .from(raceGc)
    .where(eq(raceGc.raceId, spec.raceKey))
    .orderBy(...gcOrderBy())
  const gcTime = new Map(gcRows.map((r) => [r.riderId, r.tiempoTotalS]))
  const gcRank = new Map(gcRows.map((r, i) => [r.riderId, i + 1]))
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
    .select({
      riderId: riderHidden.riderId,
      ceilings: riderHidden.ceilings,
      fragility: riderHidden.fragility,
    })
    .from(riderHidden)
    .where(inArray(riderHidden.riderId, riderIds))
  const ceilingsByRider = new Map(
    hiddenRows.map((h) => [h.riderId, h.ceilings as Record<Attribute, number>]),
  )
  // Fragilidad oculta (SPEC 3.4): escala la probabilidad de enfermar en carrera (docs/motor.md
  // §VI.3). Por defecto 1 para los corredores antiguos sin fila en `rider_hidden`.
  const fragilityByRider = new Map(hiddenRows.map((h) => [h.riderId, h.fragility]))

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
      // EL PUESTO EN LA GENERAL (v19): lo necesita el orden inverso de salida de la contrarreloj,
      // porque el déficit es un tiempo y los empates son la norma. Sale del MISMO orden que la
      // general que ve el jugador (`gcOrderBy`), así que no puede discrepar de ella. `null` antes de
      // la primera etapa y en una carrera de un día, y entonces la rampa vuelve al dorsal.
      gcRank: gcRank.get(riderId) ?? null,
      // EL DORSAL (v18): lo necesita el orden de salida de la contrarreloj por dorsales. `null` en
      // un roster sin numerar, y la regla lo trata sin romperse.
      bib: bibOf.get(riderId) ?? null,
      // EL EQUIPO (docs/motor.md §V.1, v15). El motor lo pide desde la v15 para tener un plan
      // colectivo —quién persigue, quién se esconde, quién manda gente a la fuga— y la capa de
      // datos es la única que lo sabe. `null` = agente libre: corre de forma individual.
      teamId: rider.teamId ?? null,
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

  // Todo lo que sigue se ACUMULA en memoria y se escribe en lote al final: una etapa de gran vuelta
  // son 176 corredores y el bucle fila a fila hacía ~700-900 idas y vueltas dentro de la transacción
  // del día. Los valores se calculan exactamente igual que antes; solo cambia cómo se mandan.
  const dailyLogValues: (typeof riderDailyLog.$inferInsert)[] = []
  const attrLogValues: (typeof riderAttrLog.$inferInsert)[] = []
  const resultValues: (typeof stageResults.$inferInsert)[] = []
  const gcValues: (typeof raceGc.$inferInsert)[] = []
  const loadValues: BatchValue[][] = []
  const attrValues: BatchValue[][] = []
  const raced = new Set<string>()
  const gcByRider = new Map(gcRows.map((r) => [r.riderId, r]))

  /**
   * ABANDONOS DEL MOTOR (v14, docs/motor.md §VI.3). `estado` deja de ser siempre `'finish'`: el que
   * se bajó de la bici (`abandon`) y el que llegó fuera de control (`dnf`) NO están clasificados, así
   * que no tienen fila en `stage_results`, no suman en la general, no puntúan en la clasificación
   * por equipos y no reciben puntos de temporada. Lo único que sí reciben es la CARGA del día: han
   * corrido lo que han corrido y el Banister tiene que enterarse.
   */
  const nonFinishers = output.results.filter((r) => r.estado !== 'finish')

  for (const result of output.results) {
    raced.add(result.riderId)
    if (result.estado !== 'finish') {
      // Solo la carga del día; el resto de la contabilidad de la etapa no le corresponde.
      const state = riderState.get(result.riderId)
      if (state) {
        const tss = stageTss(output.workUnits.get(result.riderId) ?? 0)
        const load = applyDailyLoad({ ctl: state.ctl, atl: state.atl }, tss, state.attributes.REC)
        loadValues.push([result.riderId, load.ctl, load.atl])
        dailyLogValues.push({
          riderId: result.riderId,
          gameDay,
          tss,
          ctl: load.ctl,
          atl: load.atl,
          tsb: load.tsb,
          activity: `carrera:${spec.raceId}:e${spec.stageDay}`,
        })
      }
      continue
    }
    const bonificacionS = isOneDay ? 0 : result.bonificacionS
    resultValues.push({
      raceId: spec.raceKey,
      stageDay: spec.stageDay,
      riderId: result.riderId,
      puesto: result.puesto,
      tiempoS: result.tiempoS,
      bonificacionS,
      puntosVolante: result.puntosVolante,
      puntosMontana: result.puntosMontana,
    })

    const netTime = Math.max(0, result.tiempoS - bonificacionS)
    const prev = gcByRider.get(result.riderId)
    gcValues.push({
      raceId: spec.raceKey,
      riderId: result.riderId,
      tiempoTotalS: (prev?.tiempoTotalS ?? 0) + netTime,
      puntosVolante: (prev?.puntosVolante ?? 0) + result.puntosVolante,
      puntosMontana: (prev?.puntosMontana ?? 0) + result.puntosMontana,
      // Desempate de la general: se acumula igual que el tiempo (suma de puestos) y se guarda el
      // puesto de ESTA etapa, que es la última disputada mientras no corra otra.
      sumaPuestos: (prev?.sumaPuestos ?? 0) + result.puesto,
      ultimoPuesto: result.puesto,
    })

    const state = riderState.get(result.riderId)
    if (!state) continue
    const tss = stageTss(output.workUnits.get(result.riderId) ?? 0)
    const load = applyDailyLoad({ ctl: state.ctl, atl: state.atl }, tss, state.attributes.REC)
    loadValues.push([result.riderId, load.ctl, load.atl])
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
      attrValues.push([result.riderId, attr, after])
      attrLogValues.push({ riderId: result.riderId, gameDay, attr, delta: after - before })
    }
  }

  await inChunks(resultValues, BATCH_ROWS, (chunk) =>
    tx.insert(stageResults).values(chunk).onConflictDoNothing(),
  )
  // Upsert en lote: `excluded.*` son los totales ya calculados arriba (prev + delta), igual que el
  // `set` fila a fila de antes. Cada corredor aparece una sola vez por etapa, así que no hay
  // conflicto de dos filas nuevas contra la misma clave dentro del mismo lote.
  await inChunks(gcValues, BATCH_ROWS, (chunk) =>
    tx
      .insert(raceGc)
      .values(chunk)
      .onConflictDoUpdate({
        target: [raceGc.raceId, raceGc.riderId],
        set: {
          tiempoTotalS: sql`excluded.tiempo_total_s`,
          puntosVolante: sql`excluded.puntos_volante`,
          puntosMontana: sql`excluded.puntos_montana`,
          sumaPuestos: sql`excluded.suma_puestos`,
          ultimoPuesto: sql`excluded.ultimo_puesto`,
        },
      }),
  )
  await inChunks(loadValues, BATCH_ROWS, async (chunk) => {
    const v = valuesList(chunk, ['uuid', 'real', 'real'])
    await tx.execute(
      sql`update ${riders} set ctl = v.ctl, atl = v.atl
          from ${v} as v(id, ctl, atl) where ${riders.id} = v.id`,
    )
  })
  await inChunks(attrValues, BATCH_ROWS, async (chunk) => {
    const v = valuesList(chunk, ['uuid', 'rider_attribute', 'real'])
    await tx.execute(
      sql`update ${riderAttrs} set value = v.value
          from ${v} as v(rider_id, attr, value)
          where ${riderAttrs.riderId} = v.rider_id and ${riderAttrs.attr} = v.attr`,
    )
  })
  // Clasificación POR EQUIPOS de la etapa: los tres mejores de cada equipo por TIEMPO DE META (las
  // bonificaciones no cuentan aquí). La acumulada de la carrera es luego un `group by` sobre estas
  // filas, así que basta con escribir la etapa. Una sola sentencia en lote, como todo lo de arriba:
  // el tick no puede permitirse una consulta por equipo.
  const teamValues: (typeof stageTeamResults.$inferInsert)[] = teamStageScores(
    // Solo los CLASIFICADOS: el que abandonó no llegó a meta y su equipo puede quedarse corto, que
    // es exactamente la regla UCI que ya describe SPEC 6.15 («equipo incompleto»).
    output.results
      .filter((r) => r.estado === 'finish')
      .map((r) => ({
        riderId: r.riderId,
        // Los agentes libres (sin equipo) no entran en la agregación: `teamStageScores` los descarta.
        teamId: riderById.get(r.riderId)?.teamId ?? null,
        puesto: r.puesto,
        tiempoS: r.tiempoS,
      })),
  ).map((score) => ({
    raceId: spec.raceKey,
    stageDay: spec.stageDay,
    teamId: score.teamId,
    scored: score.scored,
    tiempoS: score.tiempoS,
    sumaPuestos: score.sumaPuestos,
    mejorPuesto: score.mejorPuesto,
  }))
  await inChunks(teamValues, BATCH_ROWS, (chunk) =>
    tx.insert(stageTeamResults).values(chunk).onConflictDoNothing(),
  )
  await inChunks(dailyLogValues, BATCH_ROWS, (chunk) =>
    tx.insert(riderDailyLog).values(chunk).onConflictDoNothing(),
  )
  await inChunks(attrLogValues, BATCH_ROWS, (chunk) =>
    tx.insert(riderAttrLog).values(chunk).onConflictDoNothing(),
  )

  // ABANDONOS DENTRO DE LA ETAPA (v14, docs/motor.md §VI.3). El motor decide quién se retira en
  // carretera y quién llega fuera de control; la capa de datos lo saca del resto de la carrera. En
  // una prueba de UN DÍA no hay «resto de la carrera» que abandonar: el corredor sencillamente no
  // figura en el resultado, y marcarlo lo pintaría como DNF de una general que no existe.
  if (!isOneDay && nonFinishers.length > 0) {
    await markAbandons(
      tx,
      worldId,
      gameDay,
      spec,
      nonFinishers.map((r) => ({
        riderId: r.riderId,
        reason: r.estado === 'abandon' ? 'colapso' : 'fuera_control',
      })),
      riderById,
    )
  }

  // Consecuencias de las caídas (SPEC 6.14): una caída con baja deja al corredor LESIONADO varios días
  // (rinde peor y puede perderse próximas carreras); las que dejan lesión obligan a ABANDONAR la vuelta.
  await applyIncidents(tx, worldId, gameDay, spec.raceKey, output.incidents, riderById)
  const injured = new Set(
    output.incidents.filter((i) => injuryEndsRace(i.severidad, i.diasBaja)).map((i) => i.riderId),
  )
  if (!isOneDay && injured.size > 0) {
    await markAbandons(
      tx,
      worldId,
      gameDay,
      spec,
      [...injured].map((riderId) => ({ riderId, reason: 'lesion' as const })),
      riderById,
      // La lesión ya emite su propio titular (`injury`) en `applyIncidents`: no se duplica.
      { silent: true },
    )
  }

  // ENFERMAR DURANTE LA CARRERA (docs/motor.md §VI.3, la otra mitad de «colapso / enfermedad»).
  // El dado de la enfermedad solo se tira los días de ENTRENAMIENTO (`simulateRiderDay`), y quien
  // corre no pasa por ahí: en una gran vuelta de tres semanas, con el pelotón hundido de TSB, no
  // enfermaba absolutamente nadie —el riesgo se acumulaba y estallaba el primer día de descanso, ya
  // fuera de la carrera—. Se tira aquí, con la misma curva escalada (`raceIllnessProbability`), y en
  // carrera enfermar significa no tomar la salida al día siguiente.
  if (!isOneDay && !spec.isFinal) {
    const sick: { riderId: string; days: number }[] = []
    for (const r of stageRiders) {
      if (nonFinishers.some((n) => n.riderId === r.riderId)) continue
      if (injured.has(r.riderId)) continue
      const rider = riderById.get(r.riderId)
      if (!rider || rider.health !== 'sano') continue
      const rng = seededRng(`ill:${worldSeed}:${spec.raceKey}:${spec.stageDay}:${r.riderId}`)
      if (rng() >= raceIllnessProbability(fragilityByRider.get(r.riderId) ?? 1, r.tsb)) continue
      sick.push({ riderId: r.riderId, days: ILLNESS_DAYS })
    }
    if (sick.length > 0) {
      await tx
        .update(riders)
        .set({ health: 'enfermo', healthUntilDay: gameDay + ILLNESS_DAYS })
        .where(
          inArray(
            riders.id,
            sick.map((s) => s.riderId),
          ),
        )
      await markAbandons(
        tx,
        worldId,
        gameDay,
        spec,
        sick.map((s) => ({ riderId: s.riderId, reason: 'enfermedad' as const })),
        riderById,
      )
    }
  }

  await awardOutcome(tx, worldId, gameDay, spec, output)
  return raced
}

/** Días de baja de una enfermedad contraída en carrera (mismo rango que SPEC 4.3 para el training). */
const ILLNESS_DAYS = 4

/** Por qué un corredor se ha ido de la carrera. Se guarda en `race_rosters.abandoned_reason`. */
export type AbandonReason = 'colapso' | 'fuera_control' | 'lesion' | 'enfermedad' | 'voluntario'

/** Cómo se cuenta cada abandono en el feed. Textos de interfaz, así que en inglés. */
const ABANDON_DETAIL: Record<AbandonReason, string> = {
  colapso: 'climbs off, out of energy',
  fuera_control: 'eliminated on time',
  lesion: 'injured',
  enfermedad: 'ill',
  voluntario: 'withdraws',
}

/**
 * Saca a unos corredores del resto de la carrera: `abandoned_day` los deja fuera del roster efectivo
 * (`runOneStage` filtra por él), así que no toman la salida en las etapas siguientes y las
 * clasificaciones —general, puntos, montaña y equipos— dejan de contarlos desde ese día
 * (`gcSort.ts`, `results.ts`, `teamClassification.ts` ya ordenaban los DNF al final).
 *
 * Es IDEMPOTENTE: solo escribe sobre los que aún no habían abandonado, de modo que el tick puede
 * reintentar un día sin duplicar titulares ni cambiar el día del abandono.
 */
async function markAbandons<R extends { name: string }>(
  tx: Tx,
  worldId: string,
  gameDay: number,
  spec: StageRunSpec,
  entries: readonly { riderId: string; reason: AbandonReason }[],
  riderById: Map<string, R>,
  opts: { silent?: boolean } = {},
): Promise<void> {
  if (entries.length === 0) return
  const already = await tx
    .select({ riderId: raceRosters.riderId })
    .from(raceRosters)
    .where(
      and(
        eq(raceRosters.raceId, spec.raceKey),
        inArray(
          raceRosters.riderId,
          entries.map((e) => e.riderId),
        ),
        isNull(raceRosters.abandonedDay),
      ),
    )
  const pending = new Set(already.map((r) => r.riderId))
  const todo = entries.filter((e) => pending.has(e.riderId))
  if (todo.length === 0) return
  for (const entry of todo) {
    await tx
      .update(raceRosters)
      .set({ abandonedDay: gameDay, abandonedReason: entry.reason })
      .where(and(eq(raceRosters.raceId, spec.raceKey), eq(raceRosters.riderId, entry.riderId)))
    if (opts.silent) continue
    await emitNews(tx, {
      worldId,
      gameDay,
      kind: 'abandon',
      seed: `abandon:${spec.raceKey}:${gameDay}:${entry.riderId}`,
      data: {
        rider: riderById.get(entry.riderId)?.name ?? 'A rider',
        race: spec.raceName,
        stage: spec.stageDay,
        detail: ABANDON_DETAIL[entry.reason],
      },
      riderId: entry.riderId,
    })
  }
}

/**
 * Aplica las incidencias de la etapa (SPEC 6.14): marca al corredor LESIONADO hasta
 * `gameDay+diasBaja` (sin acortar una baja mayor ya vigente) y emite un titular de lesión por
 * corredor afectado.
 *
 * Quién queda además FUERA del resto de la vuelta ya no se decide aquí: lo dice `injuryEndsRace`
 * (motor, docs/motor.md §VI.3) y lo escribe `markAbandons`, junto a las otras tres causas de
 * abandono, con la misma regla de idempotencia y guardando el motivo. Antes vivía suelto en este
 * bucle con su propio umbral (15 días), y por eso un corredor con una lesión de 10 días quedaba
 * marcado `lesionado` —fuera de los rosters de las demás carreras— y seguía corriendo esta.
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

  // Orden de la general con desempate real (ver `gcSort.ts`). Es el que reparte premios y puntos UCI,
  // así que tiene que ser total y determinista: antes, con todo el pelotón empatado a tiempo, los
  // puntos se repartían por el orden arbitrario que devolviera Postgres.
  const gcOrder = (
    await tx
      .select({ riderId: raceGc.riderId })
      .from(raceGc)
      .where(eq(raceGc.raceId, spec.raceKey))
      .orderBy(...gcOrderBy())
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
  const isOneDay = isOneDayRace(spec)
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
    await addSeasonPointsBatch(
      tx,
      // Solo los CLASIFICADOS (v14): quien abandonó o llegó fuera de control tiene `puesto: 0`, y
      // aunque la tabla de puntos ya devolvería 0 para el índice -1, pedirlos sería decir que ese
      // corredor tiene un puesto en la etapa.
      output.results
        .filter((r) => r.estado === 'finish')
        .map((r) => ({
          riderId: r.riderId,
          points: stagePointsByClass(spec.raceClass, r.puesto - 1),
        })),
    )
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
    await addSeasonPointsBatch(
      tx,
      gcOrder.map((riderId, i) => ({ riderId, points: gcPointsByClass(spec.raceClass, i) })),
    )
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
