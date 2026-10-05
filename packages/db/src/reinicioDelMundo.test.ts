import { readFileSync } from 'node:fs'
import { ENGINE_VERSION } from '@cyclingstar/engine'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { LOCK_CLASS } from './locks.js'
import { countRidersForUser, getCurrentWorld, getRiderForUser } from './riders.js'
import { type TestDb, startTestDb } from './testDb.js'
import { GENESIS_WORLD_SEED, TICK_LOCK_KEY, runTick } from './tick.js'
import { WORLD_REPAIR_VERSION } from './worldRepair.js'

/**
 * La migración 0044: el reinicio del mundo de producción por decisión del dueño (02/10/2026), con la
 * copia de seguridad hecha dentro de la base y antes de borrar.
 *
 * Se comprueba, sobre una base real (PGlite) con un mundo que tiene filas en TODAS las tablas del
 * mundo, un jugador con cuenta, sesión, corredor y equipo propio:
 *  - que la copia `respaldo_mundo_1` guarda exactamente lo que había, tabla a tabla;
 *  - que las tablas del mundo quedan vacías y las cuentas siguen ahí;
 *  - que el siguiente tick hace la génesis de un mundo nuevo con la semilla 'cyclingstar-2';
 *  - y que el procedimiento de restauración de docs/ops.md devuelve el mundo 1 tal cual.
 *
 * Y, sin base, que las tres listas de tablas del SQL (candado, copia y borrado) son la misma y que
 * entre lo que se borra y lo que se conserva están todas las tablas del esquema.
 */

const SQL = readFileSync(new URL('../drizzle/0044_reinicio_del_mundo.sql', import.meta.url), 'utf8')
const SENTENCIAS = SQL.split('--> statement-breakpoint')
/** El SQL sin la cabecera ni los comentarios, que también hablan de LOCK TABLE y de TRUNCATE. */
const CODIGO = SQL.split('\n')
  .filter((linea) => !/^--(?!>)/.test(linea))
  .join('\n')

/** Las 29 tablas del mundo: se copian a `respaldo_mundo_1` y se vacían. */
const DEL_MUNDO = [
  'worlds',
  'game_state',
  'tick_log',
  'teams',
  'riders',
  'rider_attrs',
  'rider_hidden',
  'rider_attr_log',
  'rider_daily_log',
  'rider_points',
  'rider_race_prefs',
  'training_plans',
  'training_orders',
  'team_training_orders',
  'race_routes',
  'race_rosters',
  'race_entries',
  'race_callups',
  'team_race_plan',
  'stage_orders',
  'stage_results',
  'race_gc',
  'stage_team_results',
  'stage_snapshots',
  'palmares',
  'news',
  'transactions',
  'contracts',
  'offers',
] as const

/** Lo que sobrevive: las cuentas (better-auth) y la lista de bloqueo de nombres de los admins. */
const SE_CONSERVAN = ['users', 'accounts', 'sessions', 'verifications', 'blocked_names'] as const

/**
 * Tablas creadas por migraciones POSTERIORES a la 0044. La 0044 ya aplicada no se reescribe: una
 * tabla nueva se apunta aquí (y el TRUNCATE ... CASCADE de la 0044 la vacía en este test si cuelga
 * de una tabla del mundo, que es lo único que le hace falta para seguir corriendo).
 */
const POSTERIORES: readonly string[] = [
  // 0047_linea_temporal (E2, paso 5): no cuelga de ninguna tabla del mundo (va por race_key, sin
  // world_id), así que la 0044 no la vaciaría; la restauración de abajo y todo reinicio posterior la
  // vacían con stage_snapshots (docs/ops.md, «Migración 0047»; docs/retransmision.md §13.9).
  'stage_timelines',
  // 0048_lo_visto (E2, paso 7a): lo visto de cada jugador, por mundo. Cuelga de `worlds` (y de
  // `users`) con borrado en cascada, así que el TRUNCATE … CASCADE de la 0044 ya la vaciaría; la
  // restauración y todo reinicio la borran además a la vista (docs/ops.md, §13.9, 17-y).
  'race_watch',
]

/**
 * El procedimiento de restauración de docs/ops.md («Migración 0044»), tal cual. El segundo TRUNCATE es
 * de la 0047 (E2, paso 5) y del 7a: el mundo 1 no grabó líneas, y las del mundo nuevo llevan sus mismas
 * claves; y lo visto en el mundo nuevo no es lo visto en el viejo.
 */
const RESTAURAR = `
UPDATE respaldo_mundo_1.riders SET user_id = NULL
  WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
UPDATE respaldo_mundo_1.teams SET owner_user_id = NULL
  WHERE owner_user_id IS NOT NULL AND owner_user_id NOT IN (SELECT id FROM public.users);
TRUNCATE TABLE ${DEL_MUNDO.join(', ')} CASCADE;
TRUNCATE TABLE stage_timelines, race_watch;
${DEL_MUNDO.map((t) => `INSERT INTO public.${t} SELECT * FROM respaldo_mundo_1.${t};`).join('\n')}
`

/** Las tablas que nombra una sentencia del SQL, entre comillas dobles y sin esquema. */
function tablasDe(sentencia: string): string[] {
  return [...sentencia.matchAll(/"(\w+)"/g)].map((m) => m[1]!)
}

describe('migración 0044: reinicio del mundo', () => {
  it('el candado, la copia y el borrado nombran las mismas 29 tablas, y el candado es el del tick', () => {
    const sentencias = CODIGO.split('--> statement-breakpoint')
    const lock = sentencias.find((s) => s.includes('LOCK TABLE'))!
    const truncate = sentencias.find((s) => s.includes('TRUNCATE TABLE'))!
    const copias = sentencias
      .filter((s) => /CREATE TABLE "respaldo_mundo_1"\."\w+" AS TABLE/.test(s))
      .map((s) => /AS TABLE "public"\."(\w+)"/.exec(s)![1]!)
      .sort()
    const esperadas = [...DEL_MUNDO].sort()
    expect(tablasDe(lock).sort()).toEqual(esperadas)
    expect(tablasDe(truncate).sort()).toEqual(esperadas)
    expect(copias).toEqual(esperadas)
    // El candado del tick, escrito a mano en el SQL: tiene que seguir siendo el de `runTick`.
    expect(CODIGO).toContain(`pg_advisory_xact_lock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY})`)
    // Primero el candado del tick, luego el de las tablas, luego la copia y lo último el borrado.
    const pos = (s: string) => CODIGO.indexOf(s)
    expect(pos('pg_advisory_xact_lock')).toBeLessThan(pos('LOCK TABLE'))
    expect(pos('LOCK TABLE')).toBeLessThan(pos('CREATE SCHEMA'))
    expect(pos('CREATE SCHEMA')).toBeLessThan(pos('AS TABLE'))
    expect(CODIGO.lastIndexOf('AS TABLE')).toBeLessThan(pos('TRUNCATE TABLE'))
  })

  describe('sobre una base real', () => {
    let t: TestDb
    /** La 0044 aplicada sobre una base recién creada (el camino de CI «Migraciones (base vacía)»). */
    const vacia = { leeme: [] as { mundo: string | null; motor: number }[], filas: 0 }
    const antes: Record<string, number> = {}
    const conservadasAntes: Record<string, number> = {}
    const ids = { mundo: '', jugador: '' }

    const contar = async (esquema: string, tabla: string): Promise<number> => {
      const [r] = await t.client.unsafe<{ n: number }[]>(
        `select count(*)::int as n from "${esquema}"."${tabla}"`,
      )
      return r!.n
    }

    beforeAll(async () => {
      t = await startTestDb()

      // 1. La base vacía: la 0044 ya ha corrido dentro de `startTestDb` y ha dejado una copia vacía.
      vacia.leeme = await t.client<{ mundo: string | null; motor: number }[]>`
        select mundo_id as mundo, engine_version as motor from respaldo_mundo_1.leeme`
      for (const tabla of DEL_MUNDO) vacia.filas += await contar('respaldo_mundo_1', tabla)
      // En producción el esquema no existe todavía: se quita para correr la 0044 como allí.
      await t.client.unsafe('drop schema respaldo_mundo_1 cascade')

      // 2. Un mundo 1 con una fila al menos en cada tabla del mundo, y un jugador con todo.
      const c = t.client
      const [mundo] = await c<{ id: string }[]>`
        insert into worlds (world_seed, engine_version) values ('cyclingstar', 89) returning id`
      ids.mundo = mundo!.id
      const w = ids.mundo
      await c`insert into game_state (id, world_id, current_day, last_processed_day)
        values (1, ${w}, 40, 40)`
      await c`insert into tick_log (days_processed, duration_ms, ok) values (1, 120, true)`

      const [jugador] = await c<{ id: string }[]>`
        insert into users (email, name, premium) values ('jugador@example.com', 'Jugador', true)
        returning id`
      ids.jugador = jugador!.id
      const u = ids.jugador
      await c`insert into accounts (account_id, provider_id, user_id, password)
        values (${u}, 'credential', ${u}, 'hash')`
      await c`insert into sessions (token, expires_at, user_id)
        values ('token-de-sesion', now() + interval '7 days', ${u})`
      await c`insert into verifications (identifier, value, expires_at)
        values ('jugador@example.com', 'codigo', now() + interval '1 day')`
      await c`insert into blocked_names (kind, value, value_norm)
        values ('team', 'Equipo Real', 'equipo real')`

      const [bot] = await c<{ id: string }[]>`
        insert into teams (world_id, name, division, philosophy, jersey_seed, country)
        values (${w}, 'Equipo Bot', 'WT', 'general', 'j-bot', 'ES') returning id`
      const [suyo] = await c<{ id: string }[]>`
        insert into teams (world_id, name, division, philosophy, jersey_seed, country, owner_user_id)
        values (${w}, 'Equipo del Jugador', 'PRS', 'sprints', 'j-humano', 'FR', ${u}) returning id`
      const [npc] = await c<{ id: string }[]>`
        insert into riders (world_id, team_id, name, country, gender, birth_season, archetype, face_seed)
        values (${w}, ${bot!.id}, 'Corredor Bot', 'ES', 'M', -5, 'escalada', 'f-bot') returning id`
      const [humano] = await c<{ id: string }[]>`
        insert into riders (world_id, team_id, user_id, name, country, gender, birth_season, archetype, face_seed)
        values (${w}, ${suyo!.id}, ${u}, 'Corredor Humano', 'FR', 'M', -2, 'velocidad', 'f-humano')
        returning id`
      const r = humano!.id
      const tm = suyo!.id
      const raza = 'race-germany:s0'
      await c`insert into rider_attrs (rider_id, attr, value) values (${r}, 'SPR', 70), (${npc!.id}, 'MON', 75)`
      await c`insert into rider_hidden (rider_id, talent, ceilings, fragility, peak_age, decline_age)
        values (${r}, 60, '{"SPR": 85}'::jsonb, 1, 28, 33)`
      await c`insert into rider_attr_log (rider_id, game_day, attr, delta) values (${r}, 39, 'SPR', 0.2)`
      await c`insert into rider_daily_log (rider_id, game_day, tss, ctl, atl, tsb, activity)
        values (${r}, 39, 80, 50, 60, -10, 'fondo')`
      await c`insert into rider_points (rider_id, game_day, points, race_id, kind)
        values (${r}, 38, 20, ${raza}, 'stage')`
      await c`insert into rider_race_prefs (rider_id, race_id) values (${r}, 'race-germany')`
      await c`insert into training_plans (rider_id, start_day, block_1) values (${r}, 40, 'base')`
      await c`insert into training_orders (rider_id, game_day, session, intensity)
        values (${r}, 41, 'fondo', 'normal')`
      await c`insert into team_training_orders (team_id, game_day, session, intensity)
        values (${tm}, 41, 'sprint', 'fuerte')`
      await c`insert into race_routes (world_id, race_key, stage_day, profile)
        values (${w}, ${raza}, 1, '{"km": 180}'::jsonb)`
      await c`insert into race_rosters (race_id, rider_id, bib) values (${raza}, ${r}, 11)`
      await c`insert into race_entries (rider_id, race_id, season, created_day)
        values (${r}, 'race-germany', 0, 30)`
      await c`insert into race_callups (rider_id, race_id, season, decided_day, selected)
        values (${r}, 'race-germany', 0, 32, true)`
      await c`insert into team_race_plan (team_id, race_id, season, created_day)
        values (${tm}, 'race-germany', 0, 30)`
      await c`insert into stage_orders (rider_id, race_id, stage_day, role, mentality, effort)
        values (${r}, ${raza}, 1, 'sprinter', 'oportunista', 'normal')`
      await c`insert into stage_results (race_id, stage_day, rider_id, puesto, tiempo_s)
        values (${raza}, 1, ${r}, 1, 15000)`
      await c`insert into race_gc (race_id, rider_id, tiempo_total_s) values (${raza}, ${r}, 14990)`
      await c`insert into stage_team_results (race_id, stage_day, team_id, tiempo_s)
        values (${raza}, 1, ${tm}, 45000)`
      await c`insert into stage_snapshots (race_id, stage_day, seed, engine_version, input, radio)
        values (${raza}, 1, 'semilla', 89, '{}'::jsonb, '[]'::jsonb)`
      await c`insert into palmares (world_id, rider_id, season, race_id, race_name, kind, game_day)
        values (${w}, ${r}, 0, ${raza}, 'Race Germany', 'stage', 38)`
      await c`insert into news (world_id, game_day, scope, rider_id, kind, text)
        values (${w}, 38, 'personal', ${r}, 'victoria', 'Gana la etapa')`
      await c`insert into transactions (rider_id, game_day, kind, amount) values (${r}, 35, 'salario', 900)`
      await c`insert into contracts (rider_id, team_id, salary, start_season, end_season)
        values (${r}, ${tm}, 900, 0, 1)`
      await c`insert into offers (rider_id, team_id, season, role, salary, seasons, created_day)
        values (${r}, ${bot!.id}, 0, 'gregario', 1200, 2, 39)`

      for (const tabla of DEL_MUNDO) antes[tabla] = await contar('public', tabla)
      for (const tabla of SE_CONSERVAN) conservadasAntes[tabla] = await contar('public', tabla)

      // 3. La 0044, sentencia a sentencia y en UNA transacción, como la aplica el migrador.
      await t.client.begin(async (tx) => {
        for (const sentencia of SENTENCIAS) await tx.unsafe(sentencia)
      })
    }, 180_000)

    afterAll(async () => {
      await t?.close()
    })

    it('sobre una base vacía deja una copia vacía con su leeme (camino de CI «Migraciones (base vacía)»)', () => {
      expect(vacia.leeme).toEqual([{ mundo: null, motor: 90 }])
      expect(vacia.filas).toBe(0)
    })

    it('el fixture tiene filas en todas las tablas del mundo, y el esquema no tiene otras tablas', async () => {
      for (const tabla of DEL_MUNDO) expect(antes[tabla], tabla).toBeGreaterThan(0)
      const filas = await t.client<{ table_name: string }[]>`
        select table_name from information_schema.tables where table_schema = 'public'`
      const todas = filas.map((f) => f.table_name).sort()
      expect(todas).toEqual([...DEL_MUNDO, ...SE_CONSERVAN, ...POSTERIORES].sort())
    })

    it('la copia guarda exactamente lo que había, tabla a tabla, y el leeme dice qué mundo era', async () => {
      for (const tabla of DEL_MUNDO) {
        expect(await contar('respaldo_mundo_1', tabla), tabla).toBe(antes[tabla])
      }
      const leeme = await t.client<
        { motivo: string; motor: number; mundo: string; semilla: string; dia: number }[]
      >`select motivo, engine_version as motor, mundo_id as mundo, semilla, dia_de_juego as dia
        from respaldo_mundo_1.leeme`
      expect(leeme).toEqual([
        {
          motivo: 'reset del mundo por decisión del dueño, 02/10/2026',
          motor: 90,
          mundo: ids.mundo,
          semilla: 'cyclingstar',
          dia: 40,
        },
      ])
      const [humano] = await t.client<{ user_id: string }[]>`
        select user_id from respaldo_mundo_1.riders where user_id is not null`
      expect(humano?.user_id).toBe(ids.jugador)
    })

    it('las tablas del mundo quedan vacías y las cuentas siguen intactas', async () => {
      for (const tabla of DEL_MUNDO) expect(await contar('public', tabla), tabla).toBe(0)
      for (const tabla of SE_CONSERVAN) {
        expect(await contar('public', tabla), tabla).toBe(conservadasAntes[tabla])
      }
      const [u] = await t.client<{ email: string; premium: boolean }[]>`
        select email, premium from users where id = ${ids.jugador}`
      expect(u).toEqual({ email: 'jugador@example.com', premium: true })
      // Sin mundo, la API ve «mundo sin inicializar» y el jugador, que no tiene ciclista.
      expect(await getCurrentWorld(t.db)).toBeNull()
      expect(await getRiderForUser(t.db, ids.jugador)).toBeNull()
      expect(await countRidersForUser(t.db, ids.jugador)).toBe(0)
    })

    it('el siguiente tick hace la génesis de un mundo nuevo con la semilla cyclingstar-2', async () => {
      const resumen = await t.detached((url) =>
        runTick(url, {
          now: new Date(),
          msPerGameDay: 6 * 60 * 60 * 1000,
          worldSeed: GENESIS_WORLD_SEED,
          engineVersion: ENGINE_VERSION,
          forceDays: 0,
          // E2, paso 5: el campo es obligatorio; la génesis no corre ningún día ni etapa.
          timelineRecord: 'off',
        }),
      )
      expect(resumen.ran).toBe(true)
      expect(resumen.currentDay).toBe(0)
      const mundos = await t.client<
        { id: string; semilla: string; motor: number; reparado: number; e1: number | null }[]
      >`select id, world_seed as semilla, engine_version as motor, repair_version as reparado,
          e1_transicion_hasta as e1 from worlds`
      expect(mundos).toHaveLength(1)
      expect(mundos[0]).toMatchObject({
        semilla: 'cyclingstar-2',
        motor: ENGINE_VERSION,
        reparado: WORLD_REPAIR_VERSION,
        e1: -1,
      })
      expect(mundos[0]!.id).not.toBe(ids.mundo)
      expect(await getCurrentWorld(t.db)).toMatchObject({
        worldId: mundos[0]!.id,
        currentDay: 0,
        worldSeed: 'cyclingstar-2',
      })
      expect(await contar('public', 'teams')).toBeGreaterThan(0)
      expect(await contar('public', 'riders')).toBeGreaterThan(0)
      const [humanos] = await t.client<{ n: number }[]>`
        select count(*)::int as n from riders where user_id is not null`
      expect(humanos!.n).toBe(0)
      // El jugador entra sin ciclista y crea uno nuevo; la copia no se toca.
      expect(await getRiderForUser(t.db, ids.jugador)).toBeNull()
      expect(await contar('respaldo_mundo_1', 'riders')).toBe(antes.riders)
    }, 180_000)

    it('la restauración de docs/ops.md devuelve el mundo 1 tal cual', async () => {
      // Una línea que el mundo nuevo grabó con la clave de una etapa del viejo (E2, paso 5): si se
      // quedara, el mundo 1 restaurado serviría la línea del nuevo (docs/ops.md, «Migración 0047»).
      await t.client`insert into stage_timelines
        (race_id, stage_day, game_day, format, engine_version, tpl_rev, finish_s, bytes, body)
        values ('race-germany:s0', 1, 1, 0, ${ENGINE_VERSION}, 0, 0, 2, ${Buffer.from('{}')})`
      // Y lo que el jugador vio en el mundo nuevo (E2, paso 7a): no es lo visto en el viejo.
      const [nuevo] = await t.client<{ id: string }[]>`select id from worlds`
      await t.client`insert into race_watch (user_id, world_id, race_key, known_through, how)
        values (${ids.jugador}, ${nuevo!.id}, 'race-germany:s0', 1, 'W')`
      await t.client.begin(async (tx) => {
        await tx.unsafe(RESTAURAR)
      })
      expect(await contar('public', 'stage_timelines')).toBe(0)
      expect(await contar('public', 'race_watch')).toBe(0)
      for (const tabla of DEL_MUNDO) expect(await contar('public', tabla), tabla).toBe(antes[tabla])
      expect(await getCurrentWorld(t.db)).toMatchObject({ worldId: ids.mundo, currentDay: 40 })
      expect((await getRiderForUser(t.db, ids.jugador))?.name).toBe('Corredor Humano')
    })

    it('si la copia ya existe, la migración falla entera y no borra nada', async () => {
      await expect(
        t.client.begin(async (tx) => {
          for (const sentencia of SENTENCIAS) await tx.unsafe(sentencia)
        }),
      ).rejects.toThrow(/respaldo_mundo_1/)
      for (const tabla of DEL_MUNDO) expect(await contar('public', tabla), tabla).toBe(antes[tabla])
    })
  })
})
