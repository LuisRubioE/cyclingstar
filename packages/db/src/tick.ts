import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { runCalendarDay } from './calendarRun.js'
import { runCallups } from './callups.js'
import { dedupeWorldNames } from './dedupeNames.js'
import { runMarket } from './contracts.js'
import { runPayroll, runTeamFinances } from './economy.js'
import { raceWorldDay } from './race.js'
import { backfillRosters, runRollover } from './rollover.js'
import { gameState, tickLog, worlds } from './schema.js'
import { trainWorldDay } from './train.js'
import {
  clusterTeamNationalities,
  reconcileBotResidences,
  reconcileTeams,
  renationalizeBotRosters,
  seedWorld,
} from './world.js'

/**
 * El tick: el reloj del mundo (SPEC 2). 1 día de juego = 6 horas reales por defecto
 * (parametrizable con TICK_INTERVAL_MINUTES para staging acelerado, Paso 43).
 *
 * Idempotente: candado no bloqueante (pg_try_advisory_lock) para que dos ejecuciones
 * simultáneas no dupliquen días, y cálculo de días pendientes contra la hora real para
 * recuperar ticks perdidos. Una transacción por día de juego.
 *
 * Paso 10: el tick solo avanza la fecha y registra en tick_log. La fisiología, las
 * carreras y la economía por día se añaden en pasos posteriores (SPEC 11). Vive en
 * packages/db (capa de datos) mientras solo orquesta datos; recibe worldSeed y
 * engineVersion como parámetros para no depender de packages/engine.
 */

/** Clave del advisory lock del tick (distinta de la de migración). */
const TICK_LOCK_KEY = 4785220

export interface TickSummary {
  /** false si otro tick estaba en curso (candado no adquirido). */
  ran: boolean
  daysProcessed: number
  currentDay: number | null
  durationMs: number
}

export interface RunTickOptions {
  now: Date
  msPerGameDay: number
  worldSeed: string
  engineVersion: number
  /**
   * Fuerza avanzar exactamente estos días de juego, ignorando el tiempo real (pruebas y staging
   * acelerado, SPEC Paso 43). Sin él, el mundo avanza según el tiempo transcurrido.
   */
  forceDays?: number
}

/** Día objetivo del mundo según el tiempo real transcurrido desde su creación. */
export function targetGameDay(worldCreatedAt: Date, now: Date, msPerGameDay: number): number {
  const elapsed = now.getTime() - worldCreatedAt.getTime()
  if (elapsed <= 0) return 0
  return Math.floor(elapsed / msPerGameDay)
}

/**
 * Re-anclaje del reloj (SPEC 2): decide el nuevo `worlds.createdAt`, o null si no hace falta.
 *
 * El tick automático es puramente temporal (`targetGameDay = floor(transcurrido/msPerGameDay)`),
 * así que un avance manual (`forceDays`) empuja `currentDay` por delante del tiempo real y deja el
 * mundo "parado" hasta que el reloj de pared lo alcanza: la cuenta atrás al próximo tick pasaría de
 * un intervalo (p. ej. 13 h en vez de 6 h). Re-anclamos `createdAt` a `ahora - día*msPerGameDay`
 * para que el mundo quede justo en su día actual a día de hoy y la cadencia de 6 h se reanude desde
 * aquí. Solo re-anclamos cuando algo desincronizó la cadencia:
 *  - tras un avance forzado, o
 *  - cuando el mundo arrancó el tick ya por delante del tiempo real (avances manuales previos).
 * En un tick normal (ponerse al día con el tiempo real) NO tocamos el ancla, para no acumular
 * deriva por el intervalo de sondeo.
 */
export function reanchorClock(params: {
  forced: boolean
  currentDayAtStart: number
  target: number
  finalDay: number
  now: Date
  msPerGameDay: number
}): Date | null {
  const { forced, currentDayAtStart, target, finalDay, now, msPerGameDay } = params
  const aheadOfRealTime = !forced && currentDayAtStart > target
  if (!forced && !aheadOfRealTime) return null
  return new Date(now.getTime() - finalDay * msPerGameDay)
}

type Db = ReturnType<typeof drizzle>

/** Génesis mínima: crea el mundo (ancla temporal) y el reloj en día 0 si aún no existen. */
async function ensureGenesis(
  db: Db,
  opts: RunTickOptions,
): Promise<{ worldId: string; worldCreatedAt: Date; currentDay: number }> {
  const state = await db.select().from(gameState).limit(1)
  const existing = state[0]
  if (existing) {
    const world = await db.select().from(worlds).where(eq(worlds.id, existing.worldId)).limit(1)
    const w = world[0]
    if (!w) {
      throw new Error('game_state referencia un mundo inexistente')
    }
    return { worldId: w.id, worldCreatedAt: w.createdAt, currentDay: existing.currentDay }
  }

  const inserted = await db
    .insert(worlds)
    .values({ worldSeed: opts.worldSeed, engineVersion: opts.engineVersion })
    .returning()
  const world = inserted[0]
  if (!world) {
    throw new Error('no se pudo crear el mundo (génesis)')
  }
  await db.insert(gameState).values({
    id: 1,
    worldId: world.id,
    currentDay: 0,
    lastProcessedDay: 0,
  })
  return { worldId: world.id, worldCreatedAt: world.createdAt, currentDay: 0 }
}

/**
 * Ejecuta el tick sobre una conexión dedicada (max 1) para sostener el advisory lock a
 * nivel de sesión. Avanza los días pendientes, uno por transacción, y registra en tick_log.
 */
export async function runTick(databaseUrl: string, opts: RunTickOptions): Promise<TickSummary> {
  const startedAtMs = Date.now()
  const client = postgres(databaseUrl, { max: 1 })
  try {
    const db = drizzle(client)
    const locked = await client<
      { ok: boolean }[]
    >`SELECT pg_try_advisory_lock(${TICK_LOCK_KEY}) AS ok`
    if (!locked[0]?.ok) {
      return { ran: false, daysProcessed: 0, currentDay: null, durationMs: 0 }
    }
    try {
      const genesis = await ensureGenesis(db, opts)
      // Génesis del mundo NPC (SPEC 10, Paso 33): equipos y ~1.600 corredores. Idempotente, así
      // que rellena también un mundo creado antes de este paso; solo hace trabajo una vez.
      await db.transaction((tx) => seedWorld(tx, genesis.worldId, opts.worldSeed))
      const target =
        opts.forceDays != null
          ? genesis.currentDay + opts.forceDays
          : targetGameDay(genesis.worldCreatedAt, opts.now, opts.msPerGameDay)

      // Completa plantillas NPC bajo mínimos hasta el tamaño actual (p.ej. un mundo creado con WT a
      // 14 se sube a 28) sin regenerar el mundo. Idempotente: no hace nada cuando están al completo.
      await db.transaction(async (tx) => {
        await backfillRosters(
          tx,
          genesis.worldId,
          opts.worldSeed,
          Math.floor(genesis.currentDay / 364),
        )
      })

      let day = genesis.currentDay
      let daysProcessed = 0
      while (day < target) {
        const next = day + 1
        // Una transacción por día de juego (SPEC 2, 11): carreras, entrenamientos y avance de fecha.
        await db.transaction(async (tx) => {
          // Al cruzar a una temporada nueva, primero el rollover (retiros, neopros, ascensos).
          await runRollover(tx, genesis.worldId, next, opts.worldSeed)
          const racedTest = await raceWorldDay(tx, genesis.worldId, next, opts.worldSeed)
          const racedCal = await runCalendarDay(tx, genesis.worldId, next, opts.worldSeed)
          const raced = new Set([...racedTest, ...racedCal])
          await trainWorldDay(tx, genesis.worldId, next, opts.worldSeed, raced)
          await runCallups(tx, genesis.worldId, next, opts.worldSeed)
          await runMarket(tx, genesis.worldId, next, opts.worldSeed)
          await runPayroll(tx, genesis.worldId, next)
          await runTeamFinances(tx, genesis.worldId, next)
          await tx
            .update(gameState)
            .set({ currentDay: next, lastProcessedDay: next })
            .where(eq(gameState.id, 1))
        })
        day = next
        daysProcessed += 1
      }

      // Re-ancla el reloj si un avance manual (o avances previos) dejó el mundo desincronizado del
      // tiempo real, para que el próximo tick automático caiga a un intervalo justo y la cuenta
      // atrás nunca supere un intervalo (ver reanchorClock).
      const anchoredCreatedAt = reanchorClock({
        forced: opts.forceDays != null,
        currentDayAtStart: genesis.currentDay,
        target,
        finalDay: day,
        now: opts.now,
        msPerGameDay: opts.msPerGameDay,
      })
      if (anchoredCreatedAt) {
        await db
          .update(worlds)
          .set({ createdAt: anchoredCreatedAt })
          .where(eq(worlds.id, genesis.worldId))
      }

      // Reconcilia equipos NPC con el reparto real de nacionalidades y nombres por idioma. Idempotente.
      await db.transaction((tx) => reconcileTeams(tx, genesis.worldId))
      // Da a cada equipo bot un núcleo nacional (mayoría de su país) reubicando corredores bot dentro
      // de su división, sin cambiar nacionalidades ni tocar humanos. Idempotente (punto fijo).
      await db.transaction((tx) => clusterTeamNationalities(tx, genesis.worldId))
      // Rebautiza a los extranjeros sobrantes de cada equipo bot con su país (mundos antiguos o con
      // pocos paisanos donde reubicar no basta). Idempotente una vez alcanzada la cuota nacional.
      await db.transaction((tx) => renationalizeBotRosters(tx, genesis.worldId, opts.worldSeed))
      // Un bot vive en el país de SU equipo: repara residencias que quedaron obsoletas al reubicar o
      // renacionalizar plantillas (p.ej. un español que pasó de un equipo indonesio a uno español y
      // "seguía viviendo" en Indonesia). Idempotente.
      await db.transaction((tx) => reconcileBotResidences(tx, genesis.worldId))
      // Repara nombres duplicados de equipos y corredores (génesis, neopros del rollover y los
      // renacionalizados). Idempotente: una vez limpio no hace ningún cambio.
      await db.transaction((tx) => dedupeWorldNames(tx, genesis.worldId))

      const durationMs = Date.now() - startedAtMs
      await db.insert(tickLog).values({
        daysProcessed,
        durationMs,
        ok: true,
        notes: daysProcessed === 0 ? 'sin días pendientes' : null,
      })

      return { ran: true, daysProcessed, currentDay: day, durationMs }
    } finally {
      await client`SELECT pg_advisory_unlock(${TICK_LOCK_KEY})`
    }
  } finally {
    await client.end({ timeout: 5 })
  }
}
