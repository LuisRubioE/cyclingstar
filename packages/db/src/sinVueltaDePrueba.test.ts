import { readFileSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { LOCK_CLASS } from './locks.js'
import {
  gameState,
  news,
  palmares,
  raceGc,
  raceRosters,
  riderDailyLog,
  riderPoints,
  riders,
  stageOrders,
  stageResults,
  stageSnapshots,
  stageTeamResults,
  teams,
  transactions,
  users,
  worlds,
} from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { TICK_LOCK_KEY } from './tick.js'

/**
 * La migración 0045: la vuelta de prueba (`test-tour`) desaparece del mundo vivo por decisión del
 * dueño (02/10/2026). El tick ya no la corre; esto borra lo que dejó escrito en el GD1 del mundo
 * nuevo para que no salga en ninguna pantalla.
 *
 * Sobre una base real (PGlite) con un mundo que tiene, en cada tabla que escribió la vuelta, una fila
 * de la vuelta y otra de una carrera del calendario, se comprueba:
 *  - que de la vuelta no queda nada (rosters, órdenes, resultados, general, equipos, snapshots,
 *    palmarés, puntos, premios, parte diario y titulares);
 *  - que lo del calendario queda intacto, fila a fila;
 *  - que los puntos y el dinero que la vuelta sumó se descuentan exactamente, y nada más;
 *  - que con el mundo ya en otra temporada no se restan puntos que el rollover ya puso a cero;
 *  - y que una segunda pasada no cambia nada.
 */

const SQL = readFileSync(
  new URL('../drizzle/0045_sin_vuelta_de_prueba.sql', import.meta.url),
  'utf8',
)
const SENTENCIAS = SQL.split('--> statement-breakpoint')
/** El SQL sin la cabecera ni los comentarios. */
const CODIGO = SQL.split('\n')
  .filter((linea) => !/^--(?!>)/.test(linea))
  .join('\n')

const VUELTA = 'test-tour'
/** Una carrera del calendario cualquiera, con su clave de temporada. */
const CAL_ID = 'race-down-under'
const CAL_KEY = `${CAL_ID}:s0`

describe('migración 0045: sin vuelta de prueba', () => {
  it('toma el candado del tick antes de tocar nada, y solo borra por la clave de la vuelta', () => {
    expect(CODIGO).toContain(`pg_advisory_xact_lock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY})`)
    expect(SENTENCIAS[0]).toContain('pg_advisory_xact_lock')
    // Cada DELETE lleva su filtro: ninguno vacía una tabla entera.
    const deletes = [...CODIGO.matchAll(/DELETE FROM "(\w+)"\s+WHERE ([^;]+?)(?:RETURNING|;|$)/g)]
    expect(deletes.length).toBe(11)
    for (const [, , where] of deletes) expect(where).toMatch(/test-tour|Test tour/)
  })

  describe('sobre una base real', () => {
    let t: TestDb
    const ids = { world: '', team: '', humano: '', bot: '' }

    /** Corre el SQL de la migración tal cual, sentencia a sentencia. */
    const correr = async (): Promise<void> => {
      for (const sentencia of SENTENCIAS) await t.client.unsafe(sentencia)
    }

    beforeAll(async () => {
      t = await startTestDb()
      const [world] = await t.db
        .insert(worlds)
        .values({ worldSeed: 'sin-vuelta', engineVersion: 1 })
        .returning({ id: worlds.id })
      ids.world = world!.id
      await t.db
        .insert(gameState)
        .values({ worldId: ids.world, currentDay: 6, lastProcessedDay: 6 })
      const [team] = await t.db
        .insert(teams)
        .values({
          worldId: ids.world,
          name: 'Equipo',
          division: 'WT',
          philosophy: 'general',
          jerseySeed: 'j',
          country: 'ES',
        })
        .returning({ id: teams.id })
      ids.team = team!.id
      const [user] = await t.db
        .insert(users)
        .values({ email: 'jugador@example.com' })
        .returning({ id: users.id })
      const base = {
        worldId: ids.world,
        teamId: ids.team,
        country: 'ES',
        gender: 'M' as const,
        birthSeason: -3,
        archetype: 'rodador' as const,
      }
      const creados = await t.db
        .insert(riders)
        .values([
          // Puntos: 50 de la vuelta + 20 del calendario. Dinero: 1.000 de la vuelta + 500 + 300.
          {
            ...base,
            name: 'Humano',
            faceSeed: 'a',
            userId: user!.id,
            seasonPoints: 70,
            money: 1800,
          },
          // Bot: 30 de la vuelta + 10 del calendario; los bots no cobran premios personales.
          { ...base, name: 'Bot', faceSeed: 'b', seasonPoints: 40 },
        ])
        .returning({ id: riders.id })
      ids.humano = creados[0]!.id
      ids.bot = creados[1]!.id

      for (const raceKey of [VUELTA, CAL_KEY]) {
        await t.db.insert(raceRosters).values([
          { raceId: raceKey, riderId: ids.humano },
          { raceId: raceKey, riderId: ids.bot },
        ])
        await t.db.insert(stageOrders).values({
          riderId: ids.humano,
          raceId: raceKey,
          stageDay: 1,
          role: 'libre',
          mentality: 'oportunista',
          effort: 'normal',
        })
        await t.db.insert(stageResults).values([
          { raceId: raceKey, stageDay: 1, riderId: ids.humano, puesto: 1, tiempoS: 1000 },
          { raceId: raceKey, stageDay: 1, riderId: ids.bot, puesto: 2, tiempoS: 1001 },
        ])
        await t.db.insert(raceGc).values([
          { raceId: raceKey, riderId: ids.humano, tiempoTotalS: 1000 },
          { raceId: raceKey, riderId: ids.bot, tiempoTotalS: 1001 },
        ])
        await t.db
          .insert(stageTeamResults)
          .values({ raceId: raceKey, stageDay: 1, teamId: ids.team })
        await t.db
          .insert(stageSnapshots)
          .values({ raceId: raceKey, stageDay: 1, seed: 's', engineVersion: 1, input: {} })
      }
      await t.db.insert(palmares).values([
        {
          worldId: ids.world,
          riderId: ids.humano,
          season: 0,
          raceId: VUELTA,
          raceName: 'Test tour',
          kind: 'stage',
          detail: 'Stage 1',
          gameDay: 1,
        },
        {
          worldId: ids.world,
          riderId: ids.humano,
          season: 0,
          raceId: CAL_ID,
          raceName: 'Race Down Under',
          kind: 'stage',
          detail: 'Stage 1',
          gameDay: 5,
        },
      ])
      await t.db.insert(riderPoints).values([
        { riderId: ids.humano, gameDay: 1, points: 50, raceId: VUELTA, kind: 'stage' },
        { riderId: ids.bot, gameDay: 1, points: 30, raceId: VUELTA, kind: 'stage' },
        { riderId: ids.humano, gameDay: 5, points: 20, raceId: CAL_KEY, kind: 'stage' },
        { riderId: ids.bot, gameDay: 5, points: 10, raceId: CAL_KEY, kind: 'stage' },
      ])
      await t.db.insert(transactions).values([
        {
          riderId: ids.humano,
          gameDay: 1,
          kind: 'premio',
          amount: 600,
          note: 'Test tour · stage win',
        },
        { riderId: ids.humano, gameDay: 5, kind: 'premio', amount: 400, note: 'Test tour · GC #1' },
        {
          riderId: ids.humano,
          gameDay: 5,
          kind: 'premio',
          amount: 500,
          note: 'Race Down Under · stage win',
        },
        { riderId: ids.humano, gameDay: 3, kind: 'salario', amount: 300, note: 'Salary' },
      ])
      const dia = { tss: 100, ctl: 40, atl: 50, tsb: -10 }
      await t.db.insert(riderDailyLog).values([
        { riderId: ids.humano, gameDay: 1, activity: 'carrera:test-tour:e1', ...dia },
        { riderId: ids.humano, gameDay: 2, activity: 'gimnasio', ...dia },
        { riderId: ids.humano, gameDay: 5, activity: `carrera:${CAL_ID}:e1`, ...dia },
      ])
      await t.db.insert(news).values([
        {
          worldId: ids.world,
          gameDay: 1,
          kind: 'stage_win',
          riderId: ids.humano,
          text: 'Humano wins stage 1 of the Test tour.',
        },
        {
          worldId: ids.world,
          gameDay: 5,
          kind: 'gc_win',
          riderId: ids.humano,
          text: 'Humano wins the Test tour overall.',
        },
        {
          worldId: ids.world,
          gameDay: 5,
          kind: 'stage_win',
          riderId: ids.humano,
          text: 'Humano wins stage 1 (Adelaide → Tanunda) of the Race Down Under.',
        },
        { worldId: ids.world, gameDay: 2, kind: 'injury', riderId: ids.bot, text: 'Bot injured.' },
      ])

      await correr()
    }, 180_000)

    afterAll(async () => {
      await t?.close()
    })

    /** Claves de carrera que quedan en una tabla con columna `race_id`. */
    const claves = async (tabla: string): Promise<string[]> => {
      const filas = await t.client.unsafe<{ race_id: string }[]>(
        `select distinct race_id from ${tabla} order by race_id`,
      )
      return filas.map((f) => f.race_id)
    }

    it('de la vuelta no queda ni una fila; del calendario, todas', async () => {
      for (const tabla of [
        'race_rosters',
        'stage_orders',
        'stage_results',
        'race_gc',
        'stage_team_results',
        'stage_snapshots',
        'rider_points',
      ]) {
        expect(await claves(tabla), tabla).toEqual([CAL_KEY])
      }
      expect(await claves('palmares')).toEqual([CAL_ID])
      expect(await t.db.select().from(raceRosters)).toHaveLength(2)
      expect(await t.db.select().from(stageResults)).toHaveLength(2)
      expect(await t.db.select().from(riderPoints)).toHaveLength(2)
    })

    it('descuenta exactamente los puntos y el dinero que sumó la vuelta', async () => {
      const filas = await t.db
        .select({ id: riders.id, seasonPoints: riders.seasonPoints, money: riders.money })
        .from(riders)
      const de = (id: string) => filas.find((f) => f.id === id)!
      expect(de(ids.humano)).toMatchObject({ seasonPoints: 20, money: 800 })
      expect(de(ids.bot)).toMatchObject({ seasonPoints: 10, money: 0 })
      // El libro casa con el saldo: solo quedan el premio del calendario y el salario.
      const libro = await t.db
        .select({ note: transactions.note, amount: transactions.amount })
        .from(transactions)
        .where(eq(transactions.riderId, ids.humano))
      expect(libro.map((l) => l.note).sort()).toEqual(['Race Down Under · stage win', 'Salary'])
      expect(libro.reduce((a, l) => a + l.amount, 0)).toBe(800)
    })

    it('borra el parte de los días de la vuelta y sus titulares, y nada más', async () => {
      const log = await t.db
        .select({ activity: riderDailyLog.activity })
        .from(riderDailyLog)
        .orderBy(riderDailyLog.gameDay)
      expect(log.map((l) => l.activity)).toEqual(['gimnasio', `carrera:${CAL_ID}:e1`])
      const titulares = await t.db.select({ text: news.text }).from(news)
      expect(titulares.map((n) => n.text).sort()).toEqual([
        'Bot injured.',
        'Humano wins stage 1 (Adelaide → Tanunda) of the Race Down Under.',
      ])
    })

    it('una segunda pasada no cambia nada', async () => {
      const antes = await t.db.select().from(riders).orderBy(riders.name)
      await correr()
      expect(await t.db.select().from(riders).orderBy(riders.name)).toEqual(antes)
      expect(await t.db.select().from(transactions)).toHaveLength(2)
    })

    it('en otra temporada borra los puntos de la vuelta sin restarlos (el rollover ya los puso a cero)', async () => {
      await t.db
        .insert(riderPoints)
        .values({ riderId: ids.bot, gameDay: 2, points: 30, raceId: VUELTA, kind: 'gc' })
      await t.db.update(gameState).set({ currentDay: 370, lastProcessedDay: 370 })
      await t.db.update(riders).set({ seasonPoints: 0 }).where(eq(riders.id, ids.bot))
      await correr()
      const [bot] = await t.db
        .select({ seasonPoints: riders.seasonPoints })
        .from(riders)
        .where(eq(riders.id, ids.bot))
      expect(bot!.seasonPoints).toBe(0)
      expect(await claves('rider_points')).toEqual([CAL_KEY])
    })
  })
})
