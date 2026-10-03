import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { LOCK_CLASS, TICK_LOCK_KEY } from './locks.js'
import { hasPendingMigrations, runMigrations } from './migrate.js'
import { getGlobalNews } from './news.js'
import {
  type TestDb,
  realTestDatabaseUrl,
  realTestDbFor,
  startEmptyTestDb,
  startTestDb,
} from './testDb.js'

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
      // 0047_linea_temporal (docs/retransmision.md §13.3): la línea temporal de cada etapa.
      'stage_timelines',
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
      // 0046_noticias_con_datos (docs/retransmision.md §13.2): el velo corta por carrera y etapa.
      'news_race_stage_idx',
      // 0047_linea_temporal (§13.3): el horizonte, el correo de etapa lista y B6 leen por día de juego.
      'stage_timelines_day_idx',
    ]) {
      expect(names.has(idx), `falta el índice ${idx}`).toBe(true)
    }
  })

  it('stage_timelines: el bytea vuelve igual byte a byte, la clave es la etapa y tpl_rev no tiene defecto (0047)', async () => {
    // Bytes que no son texto (un gzip lo es todo menos texto): el bytea vuelve como Buffer, igual.
    const body = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0xff, 0x00, 0x7f, 0x80, 0x0a, 0x0d])
    const fila = {
      race_id: 'race-bytea:s0',
      stage_day: 3,
      game_day: 190,
      format: 1,
      engine_version: 91,
      tpl_rev: 0,
      finish_s: 15_123,
      bytes: body.length,
      body,
    }
    await t.client`insert into stage_timelines ${t.client(fila)}`
    const [leida] = await t.client<{ body: Buffer; tpl_rev: number }[]>`
      select body, tpl_rev from stage_timelines where race_id = 'race-bytea:s0' and stage_day = 3`
    expect(Buffer.isBuffer(leida!.body)).toBe(true)
    expect(leida!.body.equals(body)).toBe(true)
    expect(leida!.tpl_rev).toBe(0)
    // Una fila por etapa (la clave primaria, como stage_snapshots).
    await expect(t.client`insert into stage_timelines ${t.client(fila)}`).rejects.toMatchObject({
      code: '23505',
    })
    // Sin tpl_rev no entra: no tiene defecto, para que un escritor que lo olvide no deje todas las
    // etapas en la revisión 0 sin que nada falle (13-j).
    const sinRevision = {
      race_id: fila.race_id,
      stage_day: 4,
      game_day: fila.game_day,
      format: fila.format,
      engine_version: fila.engine_version,
      finish_s: fila.finish_s,
      bytes: fila.bytes,
      body,
    }
    await expect(
      t.client`insert into stage_timelines ${t.client(sinRevision)}`,
    ).rejects.toMatchObject({ code: '23502' })
  })

  it('news_text_or_data: un titular sin texto ni datos no entra; solo con datos, sí (0046)', async () => {
    const [world] = await t.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('semilla-noticias', 1) returning id`
    await expect(
      t.client`insert into news (world_id, game_day, scope, kind)
               values (${world!.id}, 1, 'global', 'stage_win')`,
    ).rejects.toMatchObject({ code: '23514' })
    const data = {
      kind: 'gc_win',
      raceId: 'race-france',
      season: 0,
      stageDay: 21,
      riderId: '00000000-0000-4000-8000-000000000001',
      teamId: null,
    }
    await t.client`insert into news (world_id, game_day, scope, kind, data, seed, race_key, stage_day, tpl_rev)
                   values (${world!.id}, 2, 'global', 'gc_win', ${JSON.stringify(data)}::jsonb, 'gc:x',
                           'race-france:s0', 21, 0)`
    const [fila] = await t.client<{ text: string | null; data: unknown }[]>`
      select text, data from news where world_id = ${world!.id}`
    expect(fila).toEqual({ text: null, data })
  })
})

// --- La migración y el tick (docs/retransmision.md §13.10 punto 8, regla 9 de §17.1, 17-w) ---------

/** La carpeta de migraciones del repositorio, la que aplica `runMigrations` por defecto. */
const DRIZZLE = fileURLToPath(new URL('../drizzle', import.meta.url))

interface JournalEntry {
  idx: number
  version: string
  when: number
  tag: string
  breakpoints: boolean
}
interface Journal {
  version: string
  dialect: string
  entries: JournalEntry[]
}

function journalOf(folder: string): Journal {
  return JSON.parse(readFileSync(join(folder, 'meta', '_journal.json'), 'utf8')) as Journal
}

/** Las copias temporales de `drizzle/` que hace este fichero, para borrarlas al acabar. */
const copias: string[] = []
afterAll(() => {
  for (const c of copias) rmSync(c, { recursive: true, force: true })
})

/** Una copia de `drizzle/` con el journal cortado detrás de `hasta` (incluida): lo que veía la base ayer. */
function copiaCortada(hasta: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'drizzle-cortada-'))
  copias.push(dir)
  cpSync(DRIZZLE, dir, { recursive: true })
  const journal = journalOf(DRIZZLE)
  const corte = journal.entries.findIndex((e) => e.tag === hasta)
  if (corte < 0) throw new Error(`no hay migración ${hasta}`)
  journal.entries = journal.entries.slice(0, corte + 1)
  writeFileSync(join(dir, 'meta', '_journal.json'), JSON.stringify(journal, null, 2))
  return dir
}

/**
 * Una copia de `drizzle/` con UNA MIGRACIÓN MÁS al final, escrita aquí y solo aquí: la «pendiente» de
 * los casos de dos sesiones. Con una de mentira lo que se prueba es `runMigrations`, y no depende de
 * qué hace la última migración de verdad (la 0045 borra filas, y una lectura no la frena).
 */
function copiaConUnaMas(tag: string, sentencia: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'drizzle-una-mas-'))
  copias.push(dir)
  cpSync(DRIZZLE, dir, { recursive: true })
  const journal = journalOf(DRIZZLE)
  const ultima = journal.entries[journal.entries.length - 1]!
  journal.entries.push({ ...ultima, idx: ultima.idx + 1, when: ultima.when + 1, tag })
  writeFileSync(join(dir, 'meta', '_journal.json'), JSON.stringify(journal, null, 2))
  writeFileSync(join(dir, `${tag}.sql`), sentencia)
  return dir
}

describe('db: el ayudante que dice si hay migraciones pendientes', () => {
  let t: TestDb

  beforeAll(async () => {
    t = await startEmptyTestDb()
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  it('en una base vacía están todas pendientes', async () => {
    expect(await hasPendingMigrations(t.client)).toBe(true)
  })

  it('con el journal cortado hay pendientes hasta migrar la carpeta entera, y después ninguna', async () => {
    const entries = journalOf(DRIZZLE).entries
    const ayer = copiaCortada(entries[entries.length - 2]!.tag)
    await t.detached((url) => runMigrations(url, ayer))
    expect(await hasPendingMigrations(t.client, ayer)).toBe(false)
    expect(await hasPendingMigrations(t.client)).toBe(true)
    await t.detached((url) => runMigrations(url))
    expect(await hasPendingMigrations(t.client)).toBe(false)
    expect(await hasPendingMigrations(t.client, ayer)).toBe(false)
  })
})

/**
 * EL MUNDO VIVO (docs/retransmision.md §13.10, punto 2): las migraciones de E2 caen sobre una base
 * con datos, no vacía. Se migra una copia de `drizzle/` con el journal cortado en la última de antes
 * de E2, se escribe una fila en cada tabla que tocan las de E2, se migra la carpeta entera y se leen
 * las filas viejas. El diseño cortaba en `0042_transicion_e1`; producción ocupó después la 0043, la
 * 0044 y la 0045, y la 0044 (el reinicio del mundo) VACÍA las tablas del mundo, así que con ese corte
 * las filas viejas no llegarían vivas a la 0046: se corta en la 0045. El 5, el 7a y el 8a amplían
 * este caso con las tablas de sus migraciones.
 */
describe('db: el mundo vivo, migrado con las migraciones de E2 encima', () => {
  let t: TestDb

  beforeAll(async () => {
    t = await startEmptyTestDb()
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  it('las filas de antes de E2 se siguen leyendo, con las columnas nuevas a null', async () => {
    await t.detached((url) => runMigrations(url, copiaCortada('0045_sin_vuelta_de_prueba')))
    const vieja = 'Ana Ruiz signs for Equipo Alfa , relocating to Spain.'
    // Con las columnas de ayer, que son las únicas que había (SQL a pelo: el esquema de hoy ya es otro).
    const [world] = await t.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('mundo-vivo', 91) returning id`
    const [rider] = await t.client<{ id: string }[]>`
      insert into riders (world_id, name, country, gender, birth_season, archetype, face_seed)
      values (${world!.id}, 'Ana Ruiz', 'ES', 'F', -25, 'fondo', 'f1') returning id`
    await t.client`
      insert into news (world_id, game_day, scope, rider_id, kind, text)
      values (${world!.id}, 120, 'global', ${rider!.id}, 'contract', ${vieja})`
    // Una etapa corrida antes de la 0047 (paso 5): su snapshot, con la radio de hoy.
    const radioVieja = { starters: 1, kms: [] }
    await t.client`
      insert into stage_snapshots (race_id, stage_day, seed, engine_version, input, events, radio)
      values ('race-vivo:s0', 3, 'semilla-vieja', 91, '{"riders":[]}'::jsonb, '[]'::jsonb,
              ${JSON.stringify(radioVieja)}::jsonb)`

    await t.detached((url) => runMigrations(url))

    // stage_timelines (0047) nace vacía: la etapa de antes no tiene fila y se seguirá sirviendo con el
    // adaptador de la radio (D-07); su snapshot no cambia (stage_snapshots no gana columnas, D-10).
    const lineas = await t.client`select count(*)::int as n from stage_timelines`
    expect(lineas[0]?.n).toBe(0)
    const [snap] = await t.client`
      select seed, engine_version, radio from stage_snapshots
      where race_id = 'race-vivo:s0' and stage_day = 3`
    expect(snap).toEqual({ seed: 'semilla-vieja', engine_version: 91, radio: radioVieja })

    // news (0046): el texto se queda y los datos nuevos, a null; nada se rellena hacia atrás.
    const [noticia] = await t.client`
      select text, seed, data, race_key, stage_day, tpl_rev from news where world_id = ${world!.id}`
    expect(noticia).toEqual({
      text: vieja,
      seed: null,
      data: null,
      race_key: null,
      stage_day: null,
      tpl_rev: null,
    })
    const feed = await getGlobalNews(t.db, world!.id)
    expect(feed).toHaveLength(1)
    expect(feed[0]).toMatchObject({
      kind: 'contract',
      text: vieja,
      payload: null,
      riderId: rider!.id,
    })
  })
})

/** Espera a que `paso` devuelva algo que no sea null, preguntando cada 50 ms; lanza pasado `plazoMs`. */
async function esperaA<T>(paso: () => Promise<T | null>, plazoMs = 15_000): Promise<T> {
  const fin = Date.now() + plazoMs
  for (;;) {
    const v = await paso()
    if (v !== null) return v
    if (Date.now() > fin) throw new Error('esperaA: se acabó el plazo')
    await new Promise((r) => setTimeout(r, 50))
  }
}

/** La promesa, o un error si no acaba en `ms`. */
async function conPlazo<T>(p: Promise<T>, ms: number): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined
  const tarde = new Promise<never>((_, reject) => {
    reloj = setTimeout(() => reject(new Error(`no acabó en ${ms} ms`)), ms)
  })
  try {
    return await Promise.race([p, tarde])
  } finally {
    clearTimeout(reloj)
  }
}

/** Los mensajes y códigos de un error y de sus causas (drizzle envuelve el de Postgres en `cause`). */
function cadenaDe(err: unknown): string {
  const partes: string[] = []
  let e: unknown = err
  while (e instanceof Error) {
    const code = (e as Error & { code?: unknown }).code
    partes.push(`${e.message}${typeof code === 'string' ? ` [${code}]` : ''}`)
    e = e.cause
  }
  return partes.join(' <- ')
}

const REAL_URL = realTestDatabaseUrl()

/**
 * DOS SESIONES A LA VEZ, QUE PGLITE NO TIENE (una sola, `testDb.ts`): contra el Postgres de servicio
 * del CI (`TEST_DATABASE_URL`, desde el 1a) y en una base solo de este fichero, porque vitest corre los
 * ficheros en paralelo y `resetRealTestDb` vacía el esquema entero. Sin la variable, en local, se saltan.
 */
describe.skipIf(REAL_URL == null)('db: la migración nunca coincide con un día del tick', () => {
  let url: string
  let conUnaMas: string
  const sesiones: postgres.Sql[] = []
  const sesion = (): postgres.Sql => {
    const s = postgres(url, { max: 1, onnotice: () => {} })
    sesiones.push(s)
    return s
  }
  const aplicadas = async (s: postgres.Sql): Promise<number> =>
    (await s<{ n: number }[]>`select count(*)::int as n from drizzle.__drizzle_migrations`)[0]!.n
  const columna = async (s: postgres.Sql): Promise<boolean> =>
    (
      await s<{ n: number }[]>`
        select count(*)::int as n from information_schema.columns
        where table_name = 'news' and column_name = 'prueba_del_candado'`
    )[0]!.n === 1
  /** Quién espera un candado sin tenerlo todavía: el del tick, o uno de `news`. */
  const esperando = async (s: postgres.Sql, que: 'tick' | 'news'): Promise<number[]> =>
    (que === 'tick'
      ? await s<{ pid: number }[]>`
          select pid from pg_locks where locktype = 'advisory' and not granted
            and classid = ${LOCK_CLASS.tick} and objid = ${TICK_LOCK_KEY}`
      : await s<{ pid: number }[]>`
          select l.pid from pg_locks l join pg_class c on c.oid = l.relation
          where c.relname = 'news' and not l.granted`
    ).map((r) => r.pid)

  beforeAll(() => {
    conUnaMas = copiaConUnaMas(
      '9999_prueba_del_candado',
      'ALTER TABLE "news" ADD COLUMN "prueba_del_candado" integer;',
    )
  })

  beforeEach(async () => {
    url = await realTestDbFor('cyclingstar_migrate')
  }, 120_000)

  afterEach(async () => {
    for (const s of sesiones.splice(0)) await s.end({ timeout: 5 })
  })

  it('con el tick en marcha, la pendiente espera sin tocar ninguna tabla; sin pendientes, no espera', async () => {
    const tick = sesion()
    const espia = sesion()
    await tick`select pg_advisory_lock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY})`
    const antes = await aplicadas(espia)
    let acabada = false
    const migracion = runMigrations(url, conUnaMas).then(() => {
      acabada = true
    })
    const [pid] = await esperaA(async () => {
      const pids = await esperando(espia, 'tick')
      return pids.length > 0 ? pids : null
    })
    // Espera al tick con las manos vacías: nada aplicado y ninguna tabla tomada.
    expect(acabada).toBe(false)
    expect(await aplicadas(espia)).toBe(antes)
    expect(await columna(espia)).toBe(false)
    const tablas = await espia<{ n: number }[]>`
      select count(*)::int as n from pg_locks where pid = ${pid!} and locktype = 'relation'`
    expect(tablas[0]!.n).toBe(0)

    // Acaba el día del tick: la migración entra y se aplica.
    await tick`select pg_advisory_unlock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY})`
    await conPlazo(migracion, 15_000)
    expect(await aplicadas(espia)).toBe(antes + 1)
    expect(await columna(espia)).toBe(true)

    // Sin nada pendiente, el arranque no espera a un tick en marcha.
    await tick`select pg_advisory_lock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY})`
    await expect(conPlazo(runMigrations(url, conUnaMas), 5_000)).resolves.toBeUndefined()
    await tick`select pg_advisory_unlock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY})`
  }, 60_000)

  it('con una lectura larga sobre la tabla que altera, falla por lock_timeout y deshace la cola', async () => {
    const lector = sesion()
    const otro = sesion()
    const espia = sesion()
    let soltar: () => void = () => {}
    const suelta = new Promise<void>((resolve) => {
      soltar = resolve
    })
    // La lectura larga: una transacción abierta que ya ha leído `news` (ACCESS SHARE hasta el COMMIT).
    let leida: () => void = () => {}
    const yaLeyo = new Promise<void>((resolve) => {
      leida = resolve
    })
    const larga = lector.begin(async (tx) => {
      await tx`select count(*) from news`
      leida()
      await suelta
    })
    await yaLeyo
    const antes = await aplicadas(espia)

    const inicio = Date.now()
    const migracion = runMigrations(url, conUnaMas).then(
      () => null,
      (err: unknown) => err,
    )
    // El ALTER TABLE se pone a la cola de `news`, y una lectura que llega después, detrás de él.
    await esperaA(async () => ((await esperando(espia, 'news')).length === 1 ? true : null))
    const lectura = otro<{ n: number }[]>`select count(*)::int as n from news`.execute()
    await esperaA(async () => ((await esperando(espia, 'news')).length === 2 ? true : null))

    // A los 10 s de lock_timeout la migración falla en vez de dejar la cola detrás hasta el COMMIT…
    const error = await conPlazo(migracion, 30_000)
    expect(cadenaDe(error)).toMatch(/lock timeout|55P03/)
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(9_000)
    // …y la lectura de detrás entra aunque la larga siga abierta.
    expect((await conPlazo(lectura, 5_000))[0]!.n).toBeGreaterThanOrEqual(0)

    // No ha aplicado nada y ha soltado sus dos candados.
    expect(await aplicadas(espia)).toBe(antes)
    expect(await columna(espia)).toBe(false)
    const [libres] = await espia<{ tick: boolean; migracion: boolean }[]>`
      select pg_try_advisory_lock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY}) as tick,
             pg_try_advisory_lock(${LOCK_CLASS.migration}, 1) as migracion`
    expect(libres).toEqual({ tick: true, migracion: true })
    await espia`select pg_advisory_unlock(${LOCK_CLASS.tick}, ${TICK_LOCK_KEY}),
                       pg_advisory_unlock(${LOCK_CLASS.migration}, 1)`

    soltar()
    await larga
  }, 60_000)
})
