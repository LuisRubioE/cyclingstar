import { eq, inArray, isNull } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { news, teamKits, teams, tickLog } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { reanchorClock, runTick, targetGameDay } from './tick.js'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

describe('tick: targetGameDay', () => {
  const start = new Date('2026-01-01T00:00:00.000Z')

  it('es 0 en el instante de la creación del mundo', () => {
    expect(targetGameDay(start, start, SIX_HOURS_MS)).toBe(0)
  })

  it('avanza un día de juego cada 6 horas reales', () => {
    const sixHoursLater = new Date(start.getTime() + SIX_HOURS_MS)
    expect(targetGameDay(start, sixHoursLater, SIX_HOURS_MS)).toBe(1)
  })

  it('trunca las fracciones (5h59 sigue siendo día 0)', () => {
    const almost = new Date(start.getTime() + SIX_HOURS_MS - 60_000)
    expect(targetGameDay(start, almost, SIX_HOURS_MS)).toBe(0)
  })

  it('recupera varios días si el cron falló (1 día real = 4 días de juego)', () => {
    const oneDayLater = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    expect(targetGameDay(start, oneDayLater, SIX_HOURS_MS)).toBe(4)
  })

  it('nunca retrocede con relojes hacia atrás', () => {
    const before = new Date(start.getTime() - SIX_HOURS_MS)
    expect(targetGameDay(start, before, SIX_HOURS_MS)).toBe(0)
  })
})

describe('tick: reanchorClock', () => {
  const now = new Date('2026-03-01T12:00:00.000Z')

  it('re-ancla tras un avance forzado para reanudar la cadencia desde ahora', () => {
    const anchor = reanchorClock({
      forced: true,
      currentDayAtStart: 40,
      target: 40,
      finalDay: 45,
      now,
      msPerGameDay: SIX_HOURS_MS,
    })
    expect(anchor).not.toBeNull()
    // El ancla deja el mundo justo en su día actual a día de hoy: target(ahora) == finalDay,
    // así que el próximo tick automático cae exactamente a un intervalo.
    expect(targetGameDay(anchor!, now, SIX_HOURS_MS)).toBe(45)
    const nextTickMs = anchor!.getTime() + (45 + 1) * SIX_HOURS_MS - now.getTime()
    expect(nextTickMs).toBe(SIX_HOURS_MS)
  })

  it('re-ancla un mundo que arrancó por delante del tiempo real (avances manuales previos)', () => {
    // El mundo está en el día 50 pero el tiempo real solo da para el 42: la cuenta atrás sería de
    // más de un intervalo hasta que reanclamos.
    const anchor = reanchorClock({
      forced: false,
      currentDayAtStart: 50,
      target: 42,
      finalDay: 50,
      now,
      msPerGameDay: SIX_HOURS_MS,
    })
    expect(anchor).not.toBeNull()
    expect(targetGameDay(anchor!, now, SIX_HOURS_MS)).toBe(50)
  })

  it('no re-ancla en un tick normal que se pone al día con el tiempo real', () => {
    expect(
      reanchorClock({
        forced: false,
        currentDayAtStart: 10,
        target: 12,
        finalDay: 12,
        now,
        msPerGameDay: SIX_HOURS_MS,
      }),
    ).toBeNull()
  })

  it('no re-ancla cuando el mundo ya está justo en el día objetivo', () => {
    expect(
      reanchorClock({
        forced: false,
        currentDayAtStart: 12,
        target: 12,
        finalDay: 12,
        now,
        msPerGameDay: SIX_HOURS_MS,
      }),
    ).toBeNull()
  })
})

/**
 * LOS MAILLOTS EN EL TICK (E3, docs/visual.md §8.6; PR 17b, 17-l): `ensureKits` corre tras `seedWorld` y
 * `backfillRosters`, en su propia transacción, así que el tick de la génesis ya deja a cada equipo con
 * su maillot desde mañana. Las noticias del maillot, en `kits.test.ts`: en el mundo que acaba de nacer,
 * ninguna.
 */
describe('tick: los maillots tras seedWorld (17b)', () => {
  let t: TestDb

  beforeAll(async () => {
    t = await startTestDb()
    await t.detached((url) =>
      runTick(url, {
        now: new Date('2026-01-01T00:00:00.000Z'),
        msPerGameDay: SIX_HOURS_MS,
        worldSeed: 'semilla-tick-maillots',
        engineVersion: 1,
        forceDays: 0,
        timelineRecord: 'off',
      }),
    )
  }, 300_000)

  afterAll(async () => {
    await t?.close()
  })

  it('la génesis da a cada equipo una fila system desde mañana, con su canónico, y ninguna noticia', async () => {
    const all = await t.db.select({ id: teams.id }).from(teams)
    expect(all.length).toBeGreaterThan(200)
    const rows = await t.db
      .select({ teamId: teamKits.teamId, from: teamKits.validFromDay, setBy: teamKits.setBy })
      .from(teamKits)
      .where(
        inArray(
          teamKits.teamId,
          all.map((r) => r.id),
        ),
      )
    expect(rows).toHaveLength(all.length)
    expect(new Set(rows.map((r) => r.teamId)).size).toBe(all.length)
    for (const r of rows) expect(r).toMatchObject({ from: 1, setBy: 'system' })
    expect(
      await t.db.select({ id: teams.id }).from(teams).where(isNull(teams.kitCanonical)),
    ).toEqual([])
    expect(
      await t.db
        .select({ id: news.id })
        .from(news)
        .where(inArray(news.kind, ['kit_new', 'kit_ceded'])),
    ).toEqual([])
    const [log] = await t.db
      .select({ notes: tickLog.notes })
      .from(tickLog)
      .where(eq(tickLog.ok, true))
    expect(log?.notes).toContain(`maillots: ${all.length} traducidos`)
  })
})
