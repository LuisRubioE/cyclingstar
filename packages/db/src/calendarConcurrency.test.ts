import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { asc, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ENROLL_LOCK_DAYS, ensureRaceRosterFrozen, runCalendarDay } from './calendarRun.js'
import { type Database, type DbClient, createDb } from './client.js'
import { LOCK_CLASS, raceLockKey } from './locks.js'
import { raceRosters, teams, worlds } from './schema.js'
import { realTestDatabaseUrl, resetRealTestDb } from './testDb.js'
import { seedWorld } from './world.js'

/**
 * El doble cobro tick↔web (el bug de concurrencia real).
 *
 * `ensureRaceRosterFrozen` (web) ya tomaba un advisory lock por carrera, pero el tick NO: bajo READ
 * COMMITTED, la web no ve las filas aún sin confirmar del tick, cree que la escuadra no está
 * congelada, la congela otra vez y DESCUENTA DOS VECES el viaje del presupuesto de cada equipo.
 * Aquí se comprueba que ya no pasa: con el tick dentro de su transacción, la web se queda esperando
 * el candado y, al entrar, ve el roster ya congelado y no cobra nada.
 *
 * Necesita un Postgres DE VERDAD (dos sesiones a la vez): PGlite tiene un solo backend y no puede
 * reproducir la contención. Sin `TEST_DATABASE_URL` el bloque se salta.
 */

const REAL_URL = realTestDatabaseUrl()
const SEASON_DAYS = 364
const WORLD_SEED = 'semilla-concurrencia'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Primera carrera POR EQUIPOS del calendario que quepa en la ventana de cierre de inscripciones. Se
 * excluyen los campeonatos nacionales: no traen equipos y por tanto no cobran viajes, que es
 * justamente lo que aquí se quiere ver cobrado una sola vez.
 */
const byTeamsRaces = [...SEASON_CALENDAR]
  .filter((r) => r.startDay > ENROLL_LOCK_DAYS && r.championshipCountry == null)
  .sort((a, b) => a.startDay - b.startDay)
const targetRace = byTeamsRaces[0]!
/** Día de juego en el que faltan exactamente ENROLL_LOCK_DAYS para la salida (temporada 0). */
const GAME_DAY = targetRace.startDay - ENROLL_LOCK_DAYS
/** Otra carrera (y su día) para el caso inverso, con la escuadra aún sin congelar. */
const otherRace = byTeamsRaces[1]!
const OTHER_DAY = otherRace.startDay - ENROLL_LOCK_DAYS

describe.skipIf(REAL_URL == null)('db: congelar escuadra no cobra el viaje dos veces', () => {
  let a: DbClient
  let b: DbClient
  let worldId: string

  const budgets = (db: Database) =>
    db.select({ id: teams.id, budget: teams.budget }).from(teams).orderBy(asc(teams.id))

  beforeAll(async () => {
    await resetRealTestDb(REAL_URL!)
    a = createDb(REAL_URL!)
    b = createDb(REAL_URL!)
    const [world] = await a.db
      .insert(worlds)
      .values({ worldSeed: WORLD_SEED, engineVersion: 1, repairVersion: 0 })
      .returning({ id: worlds.id })
    worldId = world!.id
    await a.db.transaction((tx) => seedWorld(tx, worldId, WORLD_SEED))
  }, 300_000)

  afterAll(async () => {
    await a?.client.end({ timeout: 5 })
    await b?.client.end({ timeout: 5 })
  })

  it('la web espera al tick y no vuelve a congelar (presupuestos intactos)', async () => {
    let webDone = false
    let webStarted: Promise<void> | null = null

    // Conexión A = el tick. Congela las escuadras de la ventana y MANTIENE la transacción abierta.
    const afterTick = await a.db.transaction(async (tx) => {
      await runCalendarDay(tx, worldId, GAME_DAY, WORLD_SEED)
      const snapshot = await tx
        .select({ id: teams.id, budget: teams.budget })
        .from(teams)
        .orderBy(asc(teams.id))

      // Conexión B = una petición web sobre la MISMA carrera, mientras el tick sigue sin confirmar.
      webStarted = ensureRaceRosterFrozen(b.db, worldId, WORLD_SEED, targetRace, GAME_DAY).then(
        () => {
          webDone = true
        },
      )
      await sleep(750)
      // Si no se serializara, la web ya habría terminado (y cobrado los viajes por segunda vez).
      expect(webDone, 'la web debería quedarse esperando el candado del tick').toBe(false)
      return snapshot
    })

    await webStarted!
    expect(webDone).toBe(true)

    // El presupuesto de cada equipo es EXACTAMENTE el que dejó el tick: la web no cobró nada.
    expect(await budgets(a.db)).toEqual(afterTick)

    // Y la escuadra congelada es una sola (ni duplicados ni corredores de más).
    const raceKey = `${targetRace.id}:s${Math.floor(GAME_DAY / SEASON_DAYS)}`
    const roster = await a.db
      .select({ riderId: raceRosters.riderId })
      .from(raceRosters)
      .where(eq(raceRosters.raceId, raceKey))
    expect(roster.length).toBeGreaterThan(0)
    expect(new Set(roster.map((r) => r.riderId)).size).toBe(roster.length)
  }, 300_000)

  it('al revés (la web primero) el tick espera y termina sin error de abrazo mortal', async () => {
    // La web toma el candado de una carrera y DESPUÉS bloquea filas de teams (así cobra el viaje).
    // Si el tick hiciera lo contrario —bloquear filas y pedir el candado después— podrían esperarse
    // mutuamente; por eso el tick reserva los candados del día ANTES de tocar nada (lockCalendarDay).
    // Este test cubre el sentido inverso de la carrera: el tick espera y acaba limpio (sin 40P01).
    const raceKey = `${otherRace.id}:s${Math.floor(OTHER_DAY / SEASON_DAYS)}`
    let tickDone = false
    let tickError: unknown = null
    let tickRun: Promise<unknown> | null = null

    await b.db.transaction(async (tx) => {
      // Imita a la web: candado de la carrera y, con él en la mano, una fila de teams bloqueada.
      await tx.execute(
        sql`select pg_advisory_xact_lock(${LOCK_CLASS.raceRoster}, ${raceLockKey(raceKey)})`,
      )
      const [victim] = await tx.select({ id: teams.id }).from(teams).orderBy(asc(teams.id)).limit(1)
      await tx
        .update(teams)
        .set({ budget: sql`${teams.budget} - 1` })
        .where(eq(teams.id, victim!.id))

      tickRun = a.db
        .transaction((tx2) => runCalendarDay(tx2, worldId, OTHER_DAY, WORLD_SEED))
        .then(
          () => {
            tickDone = true
          },
          (err: unknown) => {
            tickError = err
            tickDone = true
          },
        )
      await sleep(750)
      // El tick sigue esperando el candado, no ha reventado por deadlock ni ha seguido adelante.
      expect(tickDone).toBe(false)
    })

    await tickRun!
    expect(tickError).toBeNull()
    expect(tickDone).toBe(true)
  }, 300_000)
})
