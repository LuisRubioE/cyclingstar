import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { and, eq, isNotNull } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ensureRaceRosterFrozen, predictStartlist } from './calendarRun.js'
import { worldHorizon } from './horizon.js'
import { raceRosters, riders, worlds } from './schema.js'
import { rivalsOf, seasonFields, seasonRivals } from './seasonRivals.js'
import { type TestDb, startTestDb } from './testDb.js'
import { runTick } from './tick.js'

/**
 * LOS RIVALES DE TEMPORADA (E3, docs/visual.md §8.4 y §16.2; H-01; PR 16a), contra PGlite y el mundo de
 * la génesis entero. Los pelotones que construye `seasonFields` sin correr nada son los de la selección
 * del tick: los de la previsión de inscritos (`predictStartlist`) en cada carrera de la temporada y los
 * que congela el tick en las primeras. El mundo de los bancos vive en `apps/api`, que `packages/db` no
 * puede importar, así que el mundo es el de la génesis, el mismo de la puerta de `kits.test.ts`.
 */

const SEED = 'semilla-rivales'
const NOW = new Date('2026-01-01T00:00:00.000Z')

describe('db: los rivales de temporada (E3, §8.4)', () => {
  let t: TestDb
  let worldId: string

  beforeAll(async () => {
    t = await startTestDb()
    await t.detached((url) =>
      runTick(url, {
        now: NOW,
        msPerGameDay: 6 * 60 * 60 * 1000,
        worldSeed: SEED,
        engineVersion: 1,
        forceDays: 0,
        timelineRecord: 'off',
      }),
    )
    const [w] = await t.db.select({ id: worlds.id }).from(worlds)
    worldId = w!.id
  }, 300_000)

  afterAll(async () => {
    await t?.close()
  })

  it('cada pelotón es el de la previsión de inscritos, en las carreras que no son nacionales', async () => {
    const fields = await seasonFields(t.db, worldId, 0)
    const races = SEASON_CALENDAR.filter((r) => !r.championshipCountry)
    expect(fields.size).toBe(races.length)
    for (const race of races) {
      const predicted = await predictStartlist(t.db, worldHorizon, worldId, race, 0)
      expect([...fields.get(`${race.id}:s0`)!].sort(), race.id).toEqual(
        predicted.teams.map((team) => team.id).sort(),
      )
    }
  }, 120_000)

  /**
   * El tick congela un subconjunto: descarta el equipo que no puede alinear la escuadra mínima (por
   * lesionados, viajes o solapes), y su relleno regional entra sin equipo. Así que el pelotón previsto
   * nunca deja fuera a un equipo que acabe corriendo, que es lo que importa al maillot: prever de más solo
   * aparta maillots de un rival que quizá no venga.
   */
  it('y el que congela el tick en las primeras carreras es parte del previsto, nunca con uno de más', async () => {
    const fields = await seasonFields(t.db, worldId, 0)
    const first = SEASON_CALENDAR.filter((r) => !r.championshipCountry)
      .sort((a, b) => a.startDay - b.startDay)
      .slice(0, 6)
    let predicted = 0
    let raced = 0
    for (const race of first) {
      await ensureRaceRosterFrozen(t.db, worldHorizon, worldId, SEED, race, race.startDay - 1)
      const frozen = await t.db
        .selectDistinct({ teamId: riders.teamId })
        .from(raceRosters)
        .innerJoin(riders, eq(riders.id, raceRosters.riderId))
        .where(and(eq(raceRosters.raceId, `${race.id}:s0`), isNotNull(riders.teamId)))
      const field = new Set(fields.get(`${race.id}:s0`)!)
      expect(frozen.length, race.id).toBeGreaterThan(0)
      for (const { teamId } of frozen)
        expect(field.has(teamId!), `${race.id}: ${teamId}`).toBe(true)
      predicted += field.size
      raced += frozen.length
    }
    console.info(
      `seasonRivals: en las seis primeras, ${raced} de ${predicted} equipos previstos corren`,
    )
  }, 120_000)

  it('los rivales: simétricos, sin uno mismo, y cada pareja con las carreras que comparte', async () => {
    const fields = await seasonFields(t.db, worldId, 0)
    const rivals = rivalsOf(fields)
    for (const [team, of] of rivals) {
      expect(of.has(team)).toBe(false)
      for (const [rival, races] of of) expect(rivals.get(rival)!.get(team)).toBe(races)
    }
    const [a, b] = [...fields.values()][0]!
    const shared = [...fields.values()].filter((f) => f.includes(a!) && f.includes(b!)).length
    expect(rivals.get(a!)!.get(b!)).toBe(shared)
  })

  it('su coste en PGlite, para toda la temporada', async () => {
    await seasonRivals(t.db, worldId, 0) // en frío
    const started = performance.now()
    const rivals = await seasonRivals(t.db, worldId, 0)
    const ms = performance.now() - started
    const counts = [...rivals.values()].map((of) => of.size).sort((x, y) => x - y)
    console.info(
      `seasonRivals: ${ms.toFixed(0)} ms; ${rivals.size} equipos con rivales, de ${counts[0]} a ${counts.at(-1)} (mediana ${counts[Math.floor(counts.length / 2)]})`,
    )
    expect(rivals.size).toBeGreaterThan(200)
  })
})
