import { desc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { gameState, tickLog, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { POISON_PILL_ATTEMPTS, runTick } from './tick.js'
import { WORLD_REPAIR_VERSION } from './worldRepair.js'

/**
 * Integración real de `runTick` contra Postgres (PGlite): que los FALLOS se registren en `tick_log`
 * (antes solo se escribía el camino feliz y el panel de admin era ciego), que el "poison pill" —un
 * día que falla siempre— deje rastro contable, y que el tope de días por ejecución se respete.
 */

const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const NOW = new Date('2026-01-01T00:00:00.000Z')

describe('db: runTick registra fallos y respeta el tope de días', () => {
  let t: TestDb

  beforeAll(async () => {
    t = await startTestDb()
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  const tick = (forceDays: number, maxDaysPerRun?: number) =>
    t.detached((url) =>
      runTick(url, {
        now: NOW,
        msPerGameDay: SIX_HOURS_MS,
        worldSeed: 'semilla-tick',
        engineVersion: 1,
        forceDays,
        ...(maxDaysPerRun != null ? { maxDaysPerRun } : {}),
      }),
    )

  const lastTicks = (n: number) =>
    t.db
      .select({
        ok: tickLog.ok,
        notes: tickLog.notes,
        failedDay: tickLog.failedDay,
        failedAttempts: tickLog.failedAttempts,
        daysProcessed: tickLog.daysProcessed,
      })
      .from(tickLog)
      .orderBy(desc(tickLog.startedAt))
      .limit(n)

  it('un mundo nuevo nace ya reparado (no arrastra los backfills de mundos viejos)', async () => {
    const summary = await tick(0)
    expect(summary.ran).toBe(true)
    expect(summary.daysProcessed).toBe(0)
    const w = await t.db.select({ v: worlds.repairVersion }).from(worlds).limit(1)
    expect(w[0]?.v).toBe(WORLD_REPAIR_VERSION)
    const [log] = await lastTicks(1)
    expect(log?.ok).toBe(true)
    expect(log?.notes).toBe('sin días pendientes')
  }, 180_000)

  it('registra el fallo con el día que reventó y cuenta los intentos seguidos (poison pill)', async () => {
    // Un día que falla SIEMPRE: una constraint que prohíbe que el reloj avance. Es determinista, así
    // que el bucle reintentaría ese mismo día para siempre; eso es justo lo que hay que poder ver.
    await t.client`alter table game_state add constraint dia_envenenado check (current_day = 0)`
    try {
      for (let attempt = 1; attempt <= POISON_PILL_ATTEMPTS; attempt++) {
        await expect(tick(1)).rejects.toThrow()
        const [log] = await lastTicks(1)
        expect(log?.ok).toBe(false)
        expect(log?.failedDay).toBe(1)
        expect(log?.failedAttempts).toBe(attempt)
        expect(log?.daysProcessed).toBe(0)
        expect(log?.notes).toContain('falló en día 1')
      }
      // Al llegar al umbral, las notas gritan que el mundo está atascado (consultable desde admin).
      const [log] = await lastTicks(1)
      expect(log?.notes).toContain('ATASCADO')
    } finally {
      await t.client`alter table game_state drop constraint dia_envenenado`
    }
    // El día no se ha saltado: el reloj sigue donde estaba (la integridad manda sobre el avance).
    const clock = await t.db.select({ d: gameState.currentDay }).from(gameState).limit(1)
    expect(clock[0]?.d).toBe(0)
  }, 300_000)

  it('quitado el obstáculo, el tick avanza y vuelve a registrar ok', async () => {
    const summary = await tick(1)
    expect(summary.daysProcessed).toBe(1)
    const clock = await t.db.select({ d: gameState.currentDay }).from(gameState).limit(1)
    expect(clock[0]?.d).toBe(1)
    const [log] = await lastTicks(1)
    expect(log?.ok).toBe(true)
    expect(log?.failedDay).toBeNull()
  }, 300_000)

  it('respeta maxDaysPerRun y deja constancia de los días que quedan', async () => {
    const before = (await t.db.select({ d: gameState.currentDay }).from(gameState).limit(1))[0]!.d
    const summary = await tick(4, 2)
    expect(summary.daysProcessed).toBe(2)
    const after = (await t.db.select({ d: gameState.currentDay }).from(gameState).limit(1))[0]!.d
    expect(after).toBe(before + 2)
    const [log] = await lastTicks(1)
    expect(log?.ok).toBe(true)
    expect(log?.notes).toContain('tope de 2 días')
    expect(log?.notes).toContain('quedan 2 días')
  }, 300_000)

  it('el mundo ya reparado no vuelve a bajar de versión', async () => {
    const rows = await t.db
      .select({ v: worlds.repairVersion })
      .from(worlds)
      .where(eq(worlds.repairVersion, WORLD_REPAIR_VERSION))
    expect(rows).toHaveLength(1)
  })
})
