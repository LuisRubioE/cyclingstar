import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runMigrations } from './migrate.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * Integración real contra una Postgres efímera (PGlite): que las migraciones de drizzle-kit apliquen
 * limpio DESDE CERO y dejen el esquema con las constraints e índices que el código da por hechos.
 */
describe('db: migraciones desde cero', () => {
  let t: TestDb

  beforeAll(async () => {
    t = await startTestDb()
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  it('aplica todas las migraciones y crea las tablas del esquema', async () => {
    const rows = await t.client<{ table_name: string }[]>`
      select table_name from information_schema.tables where table_schema = 'public'`
    const names = new Set(rows.map((r) => r.table_name))
    for (const table of [
      'worlds',
      'users',
      'game_state',
      'tick_log',
      'teams',
      'riders',
      'rider_attrs',
      'contracts',
      'offers',
      'race_rosters',
      'stage_results',
      'race_gc',
      'stage_team_results',
    ]) {
      expect(names.has(table), `falta la tabla ${table}`).toBe(true)
    }
  })

  it('es idempotente: volver a migrar no cambia nada', async () => {
    await expect(t.detached((url) => runMigrations(url))).resolves.toBeUndefined()
  })

  it('riders.team_id tiene FK a teams con on delete set null', async () => {
    const rows = await t.client<{ delete_rule: string }[]>`
      select rc.delete_rule
      from information_schema.referential_constraints rc
      join information_schema.table_constraints tc on tc.constraint_name = rc.constraint_name
      where tc.table_name = 'riders' and tc.constraint_name = 'riders_team_id_teams_id_fk'`
    expect(rows[0]?.delete_rule).toBe('SET NULL')
  })

  it('borrar un equipo deja a sus corredores como agentes libres (no rompe la FK)', async () => {
    const [world] = await t.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('semilla', 1) returning id`
    const [team] = await t.client<{ id: string }[]>`
      insert into teams (world_id, name, division, philosophy, jersey_seed)
      values (${world!.id}, 'Equipo', 'WT', 'general', 'j1') returning id`
    const [rider] = await t.client<{ id: string }[]>`
      insert into riders (world_id, team_id, name, country, gender, birth_season, archetype, face_seed)
      values (${world!.id}, ${team!.id}, 'Corredor', 'ES', 'M', 0, 'fondo', 'f1') returning id`
    await t.client`delete from teams where id = ${team!.id}`
    const after = await t.client<{ team_id: string | null }[]>`
      select team_id from riders where id = ${rider!.id}`
    expect(after[0]?.team_id).toBeNull()
  })

  it('contracts impone un único contrato por corredor', async () => {
    const [world] = await t.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('semilla2', 1) returning id`
    const [team] = await t.client<{ id: string }[]>`
      insert into teams (world_id, name, division, philosophy, jersey_seed)
      values (${world!.id}, 'Equipo2', 'WT', 'general', 'j2') returning id`
    const [rider] = await t.client<{ id: string }[]>`
      insert into riders (world_id, name, country, gender, birth_season, archetype, face_seed)
      values (${world!.id}, 'Corredor2', 'ES', 'M', 0, 'fondo', 'f2') returning id`
    const insertContract = () => t.client`
      insert into contracts (rider_id, team_id, salary, start_season, end_season)
      values (${rider!.id}, ${team!.id}, 100, 0, 1)`
    await insertContract()
    await expect(insertContract()).rejects.toThrow(/contracts_rider_uidx|duplicate key/)
  })

  it('crea los índices que faltaban para los filtros calientes', async () => {
    const rows = await t.db.execute<{ indexname: string }>(
      sql`select indexname from pg_indexes where schemaname = 'public'`,
    )
    const names = new Set([...rows].map((r) => r.indexname))
    for (const idx of [
      'riders_world_points_idx',
      'offers_team_idx',
      'rider_race_prefs_race_idx',
      'race_entries_race_season_idx',
      'team_race_plan_season_race_idx',
      'contracts_rider_uidx',
    ]) {
      expect(names.has(idx), `falta el índice ${idx}`).toBe(true)
    }
  })
})
