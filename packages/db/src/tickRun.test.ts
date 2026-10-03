import { gunzipSync } from 'node:zlib'
import { and, desc, eq, like } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { gameState, stageSnapshots, stageTimelines, tickLog, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { POISON_PILL_ATTEMPTS, runTick } from './tick.js'
import { WORLD_REPAIR_VERSION } from './worldRepair.js'

/**
 * Integración real de `runTick` contra Postgres (PGlite): que los FALLOS se registren en `tick_log`
 * (antes solo se escribía el camino feliz y el panel de admin era ciego), que el "poison pill" —un
 * día que falla siempre— deje rastro contable, y que el tope de días por ejecución se respete.
 *
 * Y la grabación de E2 (docs/retransmision.md §5.5 y §17.8; paso 5): los casos de hoy corren con
 * `timelineRecord: 'off'`, porque el campo es obligatorio; el último, con `on` y el grabador forzado a
 * fallar en la primera etapa del día (un `vi.mock` parcial del motor, como en `timelines.test.ts`):
 * el tick acaba bien, el día se confirma y `tick_log.notes` lleva el resumen y la nota.
 */

const grabador = vi.hoisted(() => ({ fallarNumero: 0, creados: 0 }))

vi.mock('@cyclingstar/engine', async (importOriginal) => {
  const real = await importOriginal<typeof import('@cyclingstar/engine')>()
  return {
    ...real,
    timelineRecorder: (opts: Parameters<typeof real.timelineRecorder>[0]) => {
      grabador.creados += 1
      const rec = real.timelineRecorder(opts)
      if (grabador.creados !== grabador.fallarNumero) return rec
      return {
        ...rec,
        finish: () => {
          throw new Error('el grabador forzado falla al cerrar')
        },
      }
    },
  }
})

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

  const tick = (forceDays: number, maxDaysPerRun?: number, timelineRecord: 'off' | 'on' = 'off') =>
    t.detached((url) =>
      runTick(url, {
        now: NOW,
        msPerGameDay: SIX_HOURS_MS,
        worldSeed: 'semilla-tick',
        engineVersion: 1,
        forceDays,
        ...(maxDaysPerRun != null ? { maxDaysPerRun } : {}),
        timelineRecord,
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

  it('transición E1: un mundo nuevo nace marcado; uno sin marca la corre una vez al principio del tick, y un fallo no rompe el tick', async () => {
    const marca = async () =>
      (await t.db.select({ m: worlds.e1TransicionHasta }).from(worlds).limit(1))[0]!.m
    expect(await marca()).toBe(-1)
    const dia = (await t.db.select({ d: gameState.currentDay }).from(gameState).limit(1))[0]!.d
    await t.db.update(worlds).set({ e1TransicionHasta: null })

    // Un fallo (la marca no se puede escribir) se registra y el tick sigue; la marca sigue sin poner.
    await t.client`alter table worlds add constraint e1_envenenado check (e1_transicion_hasta is null)`
    try {
      const summary = await tick(0)
      expect(summary.ran).toBe(true)
      const [log] = await lastTicks(1)
      expect(log?.ok).toBe(true)
      expect(log?.notes).toContain('transición E1 fallida')
      expect(await marca()).toBeNull()
      const filas = await t.client`select count(*)::int as n from race_routes`
      expect(filas[0]?.n).toBe(0)
    } finally {
      await t.client`alter table worlds drop constraint e1_envenenado`
    }

    // Quitado el obstáculo, el tick siguiente la corre y deja la marca.
    await tick(0)
    const [log] = await lastTicks(1)
    expect(log?.notes).toContain(`días ${dia}-${dia + 10}`)
    expect(await marca()).toBe(dia + 10)
    const filas = await t.client`select count(*)::int as n from race_routes`
    expect(filas[0]?.n).toBeGreaterThan(0)

    // Y no vuelve a correr.
    await tick(0)
    const [otro] = await lastTicks(1)
    expect(otro?.notes).toBe('sin días pendientes')
  }, 300_000)

  it('el mundo ya reparado no vuelve a bajar de versión', async () => {
    const rows = await t.db
      .select({ v: worlds.repairVersion })
      .from(worlds)
      .where(eq(worlds.repairVersion, WORLD_REPAIR_VERSION))
    expect(rows).toHaveLength(1)
  })

  it('TIMELINE_RECORD=on con el grabador que falla: el tick acaba bien, el día se confirma y tick_log lleva la nota', async () => {
    // El día 8 de la temporada es el primero con carreras: las cronos nacionales de Australia, élite
    // y sub-23. Se salta hasta el 7 (los días de en medio no corren nada) y se corre uno.
    await t.db
      .update(gameState)
      .set({ currentDay: 7, lastProcessedDay: 7 })
      .where(eq(gameState.id, 1))
    grabador.creados = 0
    grabador.fallarNumero = 1
    try {
      const summary = await tick(1, undefined, 'on')
      expect(summary.daysProcessed).toBe(1)
    } finally {
      grabador.fallarNumero = 0
    }
    const clock = await t.db.select({ d: gameState.currentDay }).from(gameState).limit(1)
    expect(clock[0]?.d).toBe(8)
    // Las etapas del día se corrieron y se guardaron (el día se confirmó con ellas)…
    const etapas = await t.db
      .select({ raceId: stageSnapshots.raceId })
      .from(stageSnapshots)
      .where(like(stageSnapshots.raceId, 'nc-au-%'))
    const corridas = etapas.map((e) => e.raceId).sort()
    expect(corridas.length).toBeGreaterThan(0)
    expect(grabador.creados).toBe(corridas.length)
    // …y cada una tiene su fila: la primera, una lápida; las demás, su línea.
    const filas = await t.db
      .select({
        raceId: stageTimelines.raceId,
        format: stageTimelines.format,
        body: stageTimelines.body,
      })
      .from(stageTimelines)
      .where(and(like(stageTimelines.raceId, 'nc-au-%'), eq(stageTimelines.stageDay, 1)))
    expect(filas.map((f) => f.raceId).sort()).toEqual(corridas)
    const lapidas = filas.filter((f) => f.format === 0)
    expect(lapidas).toHaveLength(1)
    expect(JSON.parse(gunzipSync(lapidas[0]!.body).toString('utf8'))).toMatchObject({
      reason: 'error',
      message: 'el grabador forzado falla al cerrar',
    })
    const [log] = await lastTicks(1)
    expect(log?.ok).toBe(true)
    expect(log?.notes).toContain(
      `timeline: ${corridas.length - 1} grabadas, 1 sin línea · timeline error: ${lapidas[0]!.raceId} e1 el grabador forzado falla al cerrar`,
    )
  }, 300_000)
})
