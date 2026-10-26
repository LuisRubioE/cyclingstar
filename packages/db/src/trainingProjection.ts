import {
  type ArrivalLabel,
  BANISTER,
  PREVIEW_RACE_DAY_SAMPLE,
  PREVIEW_RACE_DAY_TSS,
  PREVIEW_WORLD_WINDOW_DAYS,
  SEASON_CALENDAR,
  applyDailyLoad,
  arrivalLabel,
  raceLastDay,
} from '@cyclingstar/engine'
import {
  type CoachBlock,
  type Intensity,
  type ResolvedTrainingDay,
  SESSION_CATALOG,
  type Session,
  type TrainingChoice,
  type TrainingMode,
  resolveTrainingDay,
  seasonPosition,
  sessionTss,
} from '@cyclingstar/shared'
import { and, desc, eq, gt, like, lte, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import type { Horizon } from './horizon.js'
import { getRiderRaceDays, getRiderTravelDays, getRiderUpcomingRaces } from './riderSchedule.js'
import { getDailyLog, getRiderHealth } from './riders.js'
import { riderAttrs, riderDailyLog, riders } from './schema.js'
import {
  type LiveTrainingPlanInput,
  getPlanForDay,
  getTeamTrainingPlan,
  getTrainingOrders,
} from './training.js'

/**
 * LOS 28 DÍAS QUE HARÁ EL TICK (E3, docs/visual.md §11.2 a §11.4; D-34 a D-37; PR 13b). La vista previa
 * del plan y `GET /api/riders/me/orders` dicen, día a día, qué se entrenará, quién lo decide y con qué
 * carga, con la misma precedencia que el tick (`resolveTrainingDay`) y la curva que él escribe
 * (`applyDailyLoad`), compuesta desde el último diario. La vista previa le pasa lo de la pantalla (el modo,
 * el plan, la ventana de órdenes y `startFresh`); `GET /orders`, nada, y proyecta lo guardado.
 *
 * El TSS de cada día (§11.3): el de carrera, la mediana de los últimos `PREVIEW_RACE_DAY_SAMPLE` días de
 * carrera del corredor, o la de los del mundo en los últimos `PREVIEW_WORLD_WINDOW_DAYS`, o
 * `PREVIEW_RACE_DAY_TSS`; el de viaje, 15, la sesión `viaje` del tick; el de entrenamiento, el de la sesión
 * que elige `resolveTrainingDay`, por su intensidad. Y el entrenador decide cada día con el TSB proyectado
 * de ese día y la salud y la tensión de hoy, con los guardarraíles de la semana (lo apretado y lo de ayer)
 * sobre el diario y lo proyectado.
 *
 * Bajo el velo (DD-08): la carga y la tensión son la condición propia, que se enseña; la salud y los días de
 * carrera, con el horizonte de quien pide (`getRiderHealth`, `getRiderRaceDays`).
 */

export interface TrainingProjectionRequest {
  readonly riderId: string
  readonly currentDay: number
  readonly horizonDays: number
  /** el modo de la pantalla; sin él, el guardado */
  readonly mode?: TrainingMode
  /** el plan de la pantalla; sin él, el plan vivo guardado */
  readonly plan?: LiveTrainingPlanInput
  /** con el plan de la pantalla: sus semanas desde mañana, y no desde el `startDay` del plan vivo */
  readonly startFresh?: boolean
  /** la ventana de órdenes de la pantalla; sin ella, las guardadas */
  readonly orders?: readonly TrainingChoiceOnDay[]
}

export interface TrainingChoiceOnDay extends TrainingChoice {
  readonly gameDay: number
}

export interface ProjectedTrainingDay {
  readonly gameDay: number
  readonly day: ResolvedTrainingDay
  readonly kind: 'race' | 'travel' | 'train'
  readonly tss: number
}

export interface ProjectedRace {
  readonly raceKey: string
  readonly raceId: string
  readonly name: string
  readonly country: string | null
  readonly raceClass: string
  readonly stageCount: number
  readonly startDay: number
  readonly endDay: number
  readonly ongoing: boolean
  /** la llegada a la primera de sus etapas que cae en el horizonte; null en una carrera en curso */
  readonly arrival: ArrivalLabel | null
  readonly travelOut: readonly number[]
  readonly travelBack: readonly number[]
}

export interface TrainingProjection {
  readonly days: readonly ProjectedTrainingDay[]
  readonly races: readonly ProjectedRace[]
}

/** La mediana; null sin datos. */
function mediana(xs: readonly number[]): number | null {
  if (xs.length === 0) return null
  const o = [...xs].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 === 1 ? o[m]! : (o[m - 1]! + o[m]!) / 2
}

/**
 * La carga de un día de carrera (§11.3): la mediana de los días de carrera del corredor, si tiene; si no,
 * la del mundo; si tampoco, `PREVIEW_RACE_DAY_TSS`.
 */
export function raceDayTss(delCorredor: readonly number[], delMundo: number | null): number {
  return mediana(delCorredor) ?? delMundo ?? PREVIEW_RACE_DAY_TSS
}

/**
 * La mediana del mundo, una vez por mundo y día de juego y en memoria (§11.3): es un agregado de todas las
 * etapas de 28 días, que no destripa ninguna (11-d).
 */
const medianaDelMundo = new Map<string, { readonly day: number; readonly tss: number | null }>()

/** Para los tests que cambian el diario a mitad de un día. */
export function clearRaceDayTssCache(): void {
  medianaDelMundo.clear()
}

async function worldRaceDayTss(
  db: Database,
  worldId: string,
  currentDay: number,
): Promise<number | null> {
  const guardada = medianaDelMundo.get(worldId)
  if (guardada !== undefined && guardada.day === currentDay) return guardada.tss
  const [fila] = await db
    .select({
      tss: sql<number | null>`percentile_cont(0.5) within group (order by ${riderDailyLog.tss})`,
    })
    .from(riderDailyLog)
    .innerJoin(riders, eq(riders.id, riderDailyLog.riderId))
    .where(
      and(
        eq(riders.worldId, worldId),
        like(riderDailyLog.activity, 'carrera:%'),
        gt(riderDailyLog.gameDay, currentDay - PREVIEW_WORLD_WINDOW_DAYS),
        lte(riderDailyLog.gameDay, currentDay),
      ),
    )
  const tss = fila?.tss == null ? null : Number(fila.tss)
  medianaDelMundo.set(worldId, { day: currentDay, tss })
  return tss
}

/** Lo que tiene que leer un día del entrenador: qué se hizo y cuánto cargó. */
interface Hecho {
  readonly gameDay: number
  readonly activity: string
  readonly tss: number
}

/** Si apretó ese día, deducido del TSS, como el tick (`readTrainingDayInputs`). */
function apreto(h: Hecho): boolean {
  const cat = SESSION_CATALOG[h.activity as Session]
  return cat !== undefined && cat.variableIntensity && h.tss >= cat.tss.fuerte
}

export async function projectTraining(
  db: Database,
  h: Horizon,
  req: TrainingProjectionRequest,
): Promise<TrainingProjection> {
  const desde = req.currentDay + 1
  const hasta = req.currentDay + req.horizonDays
  const [rider] = await db
    .select({
      worldId: riders.worldId,
      archetype: riders.archetype,
      teamId: riders.teamId,
      strainDays: riders.strainDays,
      trainingMode: riders.trainingMode,
    })
    .from(riders)
    .where(eq(riders.id, req.riderId))
    .limit(1)
  if (!rider) return { days: [], races: [] }
  const [rec] = await db
    .select({ value: riderAttrs.value })
    .from(riderAttrs)
    .where(and(eq(riderAttrs.riderId, req.riderId), eq(riderAttrs.attr, 'REC')))
  const recovery = rec?.value ?? 0
  const salud = (await getRiderHealth(db, h, req.riderId))?.state ?? 'sano'

  // El diario: la última fila da el primer día (el TSB de mañana es su ctl − atl, no 0), y la semana,
  // los guardarraíles del entrenador. Los días de carrera del corredor, su carga de carrera.
  const diario = await getDailyLog(db, h, req.riderId, 7)
  const ultimo = diario[diario.length - 1]
  const propias = await db
    .select({ tss: riderDailyLog.tss })
    .from(riderDailyLog)
    .where(and(eq(riderDailyLog.riderId, req.riderId), like(riderDailyLog.activity, 'carrera:%')))
    .orderBy(desc(riderDailyLog.gameDay))
    .limit(PREVIEW_RACE_DAY_SAMPLE)
  const tssDeCarrera = raceDayTss(
    propias.map((p) => p.tss),
    propias.length > 0 ? null : await worldRaceDayTss(db, rider.worldId, req.currentDay),
  )

  const carrera = new Map(
    (await getRiderRaceDays(db, h, req.riderId, desde, hasta)).map((d) => [d.gameDay, d]),
  )
  const viajes = await getRiderTravelDays(db, req.riderId, desde, hasta)
  const viaje = new Map(viajes.map((v) => [v.gameDay, v]))
  const ordenes = new Map(
    (req.orders ?? (await getTrainingOrders(db, req.riderId, desde, hasta))).map((o) => [
      o.gameDay,
      o,
    ]),
  )
  const equipo = new Map(
    rider.teamId === null
      ? []
      : (await getTeamTrainingPlan(db, rider.teamId, desde, hasta)).map((o) => [o.gameDay, o]),
  )
  const mode = req.mode ?? (rider.trainingMode as TrainingMode)

  // El plan vivo: sus semanas cuentan desde su `startDay`, o desde mañana sin plan o con `startFresh`.
  const vivo = await getPlanForDay(db, req.riderId, desde)
  const bloques = req.plan ?? vivo?.plan
  const plan =
    bloques === undefined
      ? null
      : {
          startDay: (req.startFresh === true ? undefined : vivo?.plan.startDay) ?? desde,
          blocks: [
            bloques.blocks[0] ?? null,
            bloques.blocks[1] ?? null,
            bloques.blocks[2] ?? null,
            bloques.blocks[3] ?? null,
          ] as [CoachBlock | null, CoachBlock | null, CoachBlock | null, CoachBlock | null],
          focusAttr: bloques.focusAttr,
          intensity: bloques.intensity as Intensity | null,
        }

  const hechos: Hecho[] = diario.map((r) => ({
    gameDay: r.gameDay,
    activity: r.activity,
    tss: r.tss,
  }))
  let carga = {
    ctl: ultimo?.ctl ?? BANISTER.initialCtl,
    atl: ultimo?.atl ?? BANISTER.initialAtl,
  }
  const amanecer = new Map<number, number>()
  const days: ProjectedTrainingDay[] = []
  for (let gameDay = desde; gameDay <= hasta; gameDay++) {
    const enCarrera = carrera.get(gameDay)
    const deViaje = viaje.get(gameDay)
    const semana = hechos.filter((x) => x.gameDay >= gameDay - 7 && x.gameDay < gameDay)
    const ayer = hechos.find((x) => x.gameDay === gameDay - 1)
    const tsb = carga.ctl - carga.atl
    const day = resolveTrainingDay({
      gameDay,
      mode,
      archetype: rider.archetype,
      race: enCarrera === undefined ? null : { raceKey: enCarrera.raceKey },
      travel:
        enCarrera !== undefined || deViaje === undefined
          ? null
          : { raceKey: deViaje.raceKey, direction: deViaje.direction },
      order: ordenes.get(gameDay) ?? null,
      plan,
      teamPlan: equipo.get(gameDay) ?? null,
      coach: {
        gameDay,
        seasonDay: seasonPosition(gameDay).dayOfSeason,
        archetype: rider.archetype,
        tsb,
        health: salud,
        strainDays: rider.strainDays,
        daysToNextRace: null,
        nextRaceIsGoal: false,
        nextRaceStages: 1,
        teamGoalInDays: null,
        daysSinceBlockEnd: null,
        lastBlockDays: 0,
        hardLast7: semana.filter(apreto).length,
        yesterday: (ayer?.activity as Session | undefined) ?? null,
      },
    })
    const kind = day.source === 'carrera' ? 'race' : day.source === 'viaje' ? 'travel' : 'train'
    const tss =
      kind === 'race'
        ? tssDeCarrera
        : sessionTss({
            session: day.session ?? 'descanso_total',
            intensity: day.intensity ?? 'normal',
          })
    amanecer.set(gameDay, tsb)
    const tras = applyDailyLoad(carga, tss, recovery)
    carga = { ctl: tras.ctl, atl: tras.atl }
    hechos.push({
      gameDay,
      activity:
        enCarrera === undefined ? (day.session ?? 'descanso_total') : `carrera:${enCarrera.raceId}`,
      tss,
    })
    days.push({ gameDay, day, kind, tss })
  }

  // Las carreras: una por carrera con días en el horizonte, o en curso; la llegada, la de su primera etapa
  // en el horizonte, la única de fiar (mapa 02 §3); en curso, ninguna.
  const races: ProjectedRace[] = []
  for (const r of await getRiderUpcomingRaces(db, h, req.riderId, req.currentDay)) {
    const calendario = SEASON_CALENDAR.find((c) => c.id === r.raceId)
    if (!calendario) continue
    const endDay = r.startGameDay + (raceLastDay(calendario) - calendario.startDay)
    const primera = [...carrera.values()].find((d) => d.raceKey === r.raceKey)
    if (primera === undefined && !r.ongoing) continue
    const tsbDeSalida = primera === undefined ? undefined : amanecer.get(primera.gameDay)
    races.push({
      raceKey: r.raceKey,
      raceId: r.raceId,
      name: r.raceName,
      country: r.country,
      raceClass: r.raceClass,
      stageCount: r.stageCount,
      startDay: r.startGameDay,
      endDay,
      ongoing: r.ongoing,
      arrival: r.ongoing || tsbDeSalida === undefined ? null : arrivalLabel(tsbDeSalida),
      travelOut: viajes
        .filter((v) => v.raceKey === r.raceKey && v.direction === 'out')
        .map((v) => v.gameDay),
      travelBack: viajes
        .filter((v) => v.raceKey === r.raceKey && v.direction === 'back')
        .map((v) => v.gameDay),
    })
  }
  return { days, races }
}
