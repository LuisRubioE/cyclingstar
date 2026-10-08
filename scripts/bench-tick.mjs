#!/usr/bin/env node
/**
 * B15 · EL COSTE DEL TICK (docs/retransmision.md §16.4, §18.3 y §18.9; E2, paso 5; decisión 16-l).
 *
 * Corre en una base de prueba los días 176 (las cronos nacionales) y 179 (los nacionales en línea)
 * ENTEROS, como el tick (`runTick` con `forceDays: 1`: calendario, entrenamiento, mercado y economía),
 * con `TIMELINE_RECORD=off` y `on`, con el grabador, el reparto congelado (`buildTimelineCast`) y la
 * escritura de verdad, en la misma máquina, y compara:
 *
 *   - el tiempo del día con y sin grabar (16-l: falla si la grabación suma a la vez más de un 25 % y más
 *     de 15 s);
 *   - las líneas y las lápidas que deja (falla con una sola lápida, §5.5);
 *   - las subtransacciones de la transacción del día, leídas con `pg_stat_get_backend_subxact` al final
 *     del día de calendario y de su `flush` (falla si se desborda la caché de 64, la que 5-l evita);
 *   - y LA IDENTIDAD: con la grabación encendida, todas las tablas de la base salvo `stage_timelines` y
 *     `tick_log` quedan fila a fila como con la grabación apagada (grabar no cambia ninguna carrera).
 *     Desde el 11b (DD-11), salvo `stage_snapshots.radio`, que se compara aparte: grabar la deja a null
 *     en toda etapa cuya línea entró y la conserva en las demás (falla si no), y entre corridas del mismo
 *     modo tiene que salir igual.
 *
 * La base es PGlite (PostgreSQL 18.3 en WASM, una sola sesión): el mundo se crea una vez con la génesis
 * del tick (`seedWorld`, el campo de producción), se lleva su reloj al día anterior y se CLONA para cada
 * corrida (`dumpDataDir` y `loadDataDir`), así que todas parten del mismo mundo, ids incluidos. Las
 * subtransacciones se leen en la propia sesión, porque PGlite no admite otra; el tiempo es el de PGlite,
 * más lento que un Postgres de verdad por la escritura, y lo que se compara es la diferencia.
 *
 * Uso (hacen falta los `dist`: `pnpm exec tsc -b`):
 *   node scripts/bench-tick.mjs                       los días 176 y 179, off y on
 *   node scripts/bench-tick.mjs --days 176            solo un día
 *   node scripts/bench-tick.mjs --reps 3              cada modo tres veces (dos por defecto)
 *   node scripts/bench-tick.mjs --out x.json          además, las cifras y las huellas en un JSON
 *   node scripts/bench-tick.mjs --worlds <dir>        guarda en <dir> el mundo de partida de cada día
 *        (`mundo-<día>.tar.gz`) y, si ya está, lo usa en vez de crearlo
 *   node scripts/bench-tick.mjs --root <dir> --off-only --worlds <dir> --compare x.json
 *        CONTRA ANTES DEL PASO: el mismo banco con el código de otra copia del repositorio (p. ej. la de
 *        antes del paso 5, con sus `dist`), solo con la grabación apagada, desde los mismos mundos (la
 *        génesis sortea ids, así que dos génesis no dan el mismo mundo), comparando sus huellas con
 *        TODAS las corridas de x.json, las de `off` y las de `on`. Los mundos los crea el código de
 *        este paso (llevan la 0047): el de antes no mira `stage_timelines`.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const arg = (name) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? null : (process.argv[i + 1] ?? null)
}
const ROOT = resolve(arg('--root') ?? new URL('..', import.meta.url).pathname)
const DAYS = (arg('--days') ?? '176,179').split(',').map(Number)
const OFF_ONLY = process.argv.includes('--off-only')
const OUT = arg('--out')
const COMPARE = arg('--compare')
const WORLDS = arg('--worlds') === null ? null : resolve(arg('--worlds'))
/** Corridas de cada modo por día (`--reps`): la cifra es la mediana. */
const REPS = Number(arg('--reps') ?? 2)
const WORLD_SEED = 'bench-tick'
const NOW = new Date('2026-10-03T00:00:00.000Z')
const MS_PER_GAME_DAY = 6 * 60 * 60 * 1000
/** 16-l: la grabación suspende un día si suma a la vez más de esto… */
const MAX_PCT = 25
/** …y más de esto, en segundos. */
const MAX_S = 15
/** La caché de subtransacciones de cada proceso de Postgres (`PGPROC_MAX_CACHED_SUBXIDS`). */
const SUBXID_CACHE = 64

const fromRoot = (p) => pathToFileURL(resolve(ROOT, p)).href
const require = createRequire(resolve(ROOT, 'packages/db/package.json'))
const { PGlite } = await import(pathToFileURL(require.resolve('@electric-sql/pglite')).href)
const { citext } = await import(
  pathToFileURL(require.resolve('@electric-sql/pglite/contrib/citext')).href
)
const { PGLiteSocketServer } = await import(
  pathToFileURL(require.resolve('@electric-sql/pglite-socket')).href
)
const postgres = (await import(pathToFileURL(require.resolve('postgres')).href)).default
const { sql: drizzleSql } = await import(pathToFileURL(require.resolve('drizzle-orm')).href)
const dbModule = await import(fromRoot('packages/db/dist/index.js'))
const { ENGINE_VERSION } = await import(fromRoot('packages/engine/dist/index.js'))
const { runMigrations, runTick, runCalendarDay, createDb } = dbModule
const timelineTickLog = dbModule.timelineTickLog ?? null

/** Un puerto libre para el socket de PGlite. */
async function freePort() {
  return new Promise((ok, ko) => {
    const srv = createServer()
    srv.once('error', ko)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => ok(port))
    })
  })
}

/** Una base PGlite servida por socket (postgres.js habla el protocolo de verdad), vacía o clonada. */
async function openBase(dump) {
  const pg = await PGlite.create({
    extensions: { citext },
    ...(dump ? { loadDataDir: dump } : {}),
  })
  const port = await freePort()
  const server = new PGLiteSocketServer({ db: pg, port, host: '127.0.0.1' })
  await server.start()
  return {
    pg,
    url: `postgres://postgres@127.0.0.1:${port}/postgres`,
    close: async () => {
      await server.stop()
      await pg.close()
    },
  }
}

/** Con un cliente de una sola conexión, que se cierra al acabar (PGlite admite una sesión). */
async function withClient(url, fn) {
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    return await fn(sql)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/**
 * EL MUNDO DE PARTIDA: la génesis del tick y su reloj en el día anterior a `day`, volcado para clonarlo.
 * Con `--worlds`, el de la carpeta si ya está; si no, se crea y se deja allí.
 */
async function worldBefore(day) {
  const file = WORLDS === null ? null : resolve(WORLDS, `mundo-${day - 1}.tar.gz`)
  if (file !== null && existsSync(file)) {
    process.stderr.write(`  el mundo del día ${day - 1}: ${file}\n`)
    return new Blob([readFileSync(file)], { type: 'application/x-gzip' })
  }
  const base = await openBase(null)
  const t0 = performance.now()
  await runMigrations(base.url)
  await runTick(base.url, {
    now: NOW,
    msPerGameDay: MS_PER_GAME_DAY,
    worldSeed: WORLD_SEED,
    engineVersion: ENGINE_VERSION,
    forceDays: 0,
    timelineRecord: 'off',
  })
  const riders = await withClient(base.url, async (sql) => {
    await sql`update game_state set current_day = ${day - 1}, last_processed_day = ${day - 1}`
    return (await sql`select count(*)::int as n from riders`)[0].n
  })
  const dump = await base.pg.dumpDataDir('gzip')
  await base.close()
  process.stderr.write(
    `  el mundo del día ${day - 1}: ${riders} corredores, ${((performance.now() - t0) / 1000).toFixed(1)} s\n`,
  )
  if (file !== null) {
    mkdirSync(WORLDS, { recursive: true })
    writeFileSync(file, Buffer.from(await dump.arrayBuffer()))
  }
  return dump
}

/**
 * LA RADIO GUARDADA, APARTE (DD-11; E2, paso 11b). Con la grabación encendida, `flush` deja a null
 * `stage_snapshots.radio` de toda etapa cuya línea entró, así que esa columna no puede ser igual con
 * `off` y con `on`: la huella de `stage_snapshots` va sin ella y la radio lleva la suya, con este nombre.
 */
const RADIO = 'stage_snapshots.radio'

/** La huella de cada tabla: sus filas sin ids sorteados ni fechas de alta, ordenadas y con sha256. */
async function fingerprints(sql) {
  const tables = (
    await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`
  )
    .map((r) => r.table_name)
    .filter((t) => t !== 'stage_timelines' && t !== 'tick_log')
  const out = {}
  const sha256 = (lines) => createHash('sha256').update(lines.join('\n')).digest('hex')
  for (const table of tables) {
    const rows = await sql.unsafe(`select * from "${table}"`)
    const lines = rows
      .map((r) => {
        const copy = { ...r }
        delete copy.id
        delete copy.created_at
        delete copy.started_at
        if (table === 'stage_snapshots') delete copy.radio
        return JSON.stringify(copy, (_k, v) => (typeof v === 'bigint' ? String(v) : v))
      })
      .sort()
    out[table] = { rows: lines.length, sha256: sha256(lines) }
  }
  const radios = (await sql`select race_id, stage_day, radio from stage_snapshots`)
    .map((r) => JSON.stringify(r))
    .sort()
  out[RADIO] = { rows: radios.length, sha256: sha256(radios) }
  return out
}

/** UNA CORRIDA: el día `day` entero con el tick, desde el mundo volcado, con la grabación `mode`. */
async function runDay(dump, day, mode) {
  const base = await openBase(dump)
  const t0 = performance.now()
  const summary = await runTick(base.url, {
    now: NOW,
    msPerGameDay: MS_PER_GAME_DAY,
    worldSeed: WORLD_SEED,
    engineVersion: ENGINE_VERSION,
    forceDays: 1,
    timelineRecord: mode,
  })
  const seconds = (performance.now() - t0) / 1000
  if (summary.daysProcessed !== 1)
    throw new Error(`día ${day}, ${mode}: ${JSON.stringify(summary)}`)
  const result = await withClient(base.url, async (sql) => {
    const stages = (await sql`select count(*)::int as n from stage_snapshots`)[0].n
    const lines = await sql`
      select format, bytes, race_id from stage_timelines order by bytes`
    const notes = (await sql`select notes from tick_log order by started_at desc limit 1`)[0]?.notes
    // DD-11: la etapa con su línea dentro no guarda radio; la que no tiene línea servible, sí.
    const [dd11] = await sql`
      select
        count(*) filter (where t.format <> 0 and s.radio is null)::int as "lineNoRadio",
        count(*) filter (where t.format <> 0 and s.radio is not null)::int as "lineWithRadio",
        count(*) filter (where (t.format is null or t.format = 0) and s.radio is not null)::int as "noLineWithRadio",
        count(*) filter (where (t.format is null or t.format = 0) and s.radio is null)::int as "noLineNoRadio"
      from stage_snapshots s
      left join stage_timelines t on t.race_id = s.race_id and t.stage_day = s.stage_day`
    return { stages, lines, notes, dd11, fingerprints: await fingerprints(sql) }
  })
  await base.close()
  const recorded = result.lines.filter((l) => l.format !== 0)
  const bytes = recorded.map((l) => l.bytes).sort((a, b) => a - b)
  return {
    day,
    mode,
    seconds,
    stages: result.stages,
    lines: recorded.length,
    tombstones: result.lines.length - recorded.length,
    totalBytes: bytes.reduce((a, b) => a + b, 0),
    medianBytes: bytes.length ? bytes[Math.floor(bytes.length / 2)] : 0,
    maxBytes: bytes.length ? bytes[bytes.length - 1] : 0,
    notes: result.notes,
    dd11: result.dd11,
    fingerprints: result.fingerprints,
  }
}

/**
 * LAS SUBTRANSACCIONES DEL DÍA (5-l): el día de calendario con la grabación y su `flush`, en una
 * transacción, y antes de confirmarla, `pg_stat_get_backend_subxact` de la propia sesión. Los puntos de
 * guardado del reparto solo leen y no cuentan; el de `flush`, sí.
 */
async function subxactOfDay(dump, day) {
  const base = await openBase(dump)
  const { db, client } = createDb(base.url)
  const worldId = (await client`select world_id from game_state`)[0].world_id
  const log = timelineTickLog()
  const stats = await db.transaction(async (tx) => {
    await runCalendarDay(tx, worldId, day, WORLD_SEED, { timeline: log })
    await log.flush(tx)
    const rows = await tx.execute(
      drizzleSql.raw(`select s.subxact_count, s.subxact_overflowed
         from pg_stat_get_backend_idset() as b(id), lateral pg_stat_get_backend_subxact(b.id) s`),
    )
    return [...rows]
  })
  await client.end({ timeout: 5 })
  await base.close()
  return { day, summary: log.summary(), stats }
}

// --------------------------------------------------------------------------------------- el banco

const runs = []
const subxacts = []
for (const day of DAYS) {
  const dump = await worldBefore(day)
  // Cada modo REPS veces, alternando el orden, para que el calentamiento del proceso no caiga siempre
  // en el mismo: la cifra es la mediana de cada modo.
  for (let rep = 0; rep < REPS; rep++) {
    const modes = OFF_ONLY ? ['off'] : rep % 2 === 0 ? ['off', 'on'] : ['on', 'off']
    for (const mode of modes) {
      const r = await runDay(dump, day, mode)
      runs.push({ ...r, rep })
      process.stderr.write(
        `  día ${day}, ${mode} (${rep + 1}): ${r.seconds.toFixed(1)} s, ${r.stages} etapas, ${r.lines} líneas, ${r.tombstones} lápidas\n`,
      )
    }
  }
  if (!OFF_ONLY && timelineTickLog !== null) subxacts.push(await subxactOfDay(dump, day))
}

/** La mediana de los tiempos de un día y un modo. */
const medianSeconds = (day, mode) => {
  const xs = runs
    .filter((r) => r.day === day && r.mode === mode)
    .map((r) => r.seconds)
    .sort((a, b) => a - b)
  const m = Math.floor(xs.length / 2)
  return xs.length % 2 === 1 ? xs[m] : (xs[m - 1] + xs[m]) / 2
}

console.log(`\nB15 · el tick de los días ${DAYS.join(' y ')} · motor v${ENGINE_VERSION} · PGlite\n`)
console.log(
  '| Día | Grabación (corrida) | Etapas | Tiempo del día | Líneas · lápidas | bytea total · mediana · máx. | Notas del tick |',
)
console.log('| --- | --- | --- | --- | --- | --- | --- |')
for (const r of runs)
  console.log(
    `| ${r.day} | ${r.mode} (${r.rep + 1}) | ${r.stages} | ${r.seconds.toFixed(1)} s | ${r.lines} · ${r.tombstones} | ${(r.totalBytes / 1024).toFixed(0)} KB · ${(r.medianBytes / 1024).toFixed(1)} · ${(r.maxBytes / 1024).toFixed(1)} KB | ${(r.notes ?? '').slice(0, 120)} |`,
  )

let failed = false
if (!OFF_ONLY) {
  console.log(
    '\n| Día | off · on (mediana) | De más | Umbral (16-l) | Tablas iguales en todas las corridas | La radio guardada (DD-11) |',
  )
  console.log('| --- | --- | --- | --- | --- | --- |')
  for (const day of DAYS) {
    const off = runs.find((r) => r.day === day && r.mode === 'off')
    const extra = medianSeconds(day, 'on') - medianSeconds(day, 'off')
    const pct = (100 * extra) / medianSeconds(day, 'off')
    const over = pct > MAX_PCT && extra > MAX_S
    // La identidad, contra TODAS las corridas del día (las dos grabaciones y las repeticiones), salvo la
    // radio guardada (DD-11), que solo tiene que ser igual entre corridas del mismo modo.
    const tables = Object.keys(off.fingerprints).filter((t) => t !== RADIO)
    const dayRuns = runs.filter((r) => r.day === day)
    const others = dayRuns.filter((r) => r !== off)
    const same = tables.filter((t) =>
      others.every((o) => o.fingerprints[t]?.sha256 === off.fingerprints[t].sha256),
    )
    const different = tables.filter((t) => !same.includes(t))
    const radioSame = dayRuns.every(
      (r) =>
        r.fingerprints[RADIO]?.sha256 ===
        dayRuns.find((x) => x.mode === r.mode).fingerprints[RADIO]?.sha256,
    )
    // DD-11: ninguna etapa con línea guarda radio, y todas las que no la tienen la guardan.
    const dd11 = dayRuns.every((r) => r.dd11.lineWithRadio === 0 && r.dd11.noLineNoRadio === 0)
    const tombstones = Math.max(...dayRuns.map((r) => r.tombstones))
    if (over || tombstones > 0 || different.length > 0 || !radioSame || !dd11) failed = true
    const on = dayRuns.find((r) => r.mode === 'on')
    console.log(
      `| ${day} | ${medianSeconds(day, 'off').toFixed(1)} · ${medianSeconds(day, 'on').toFixed(1)} s | ${extra >= 0 ? '+' : ''}${extra.toFixed(1)} s (${pct >= 0 ? '+' : ''}${pct.toFixed(1)} %) | ${over ? 'FALLA' : 'pasa'} | ${same.length} de ${tables.length}${different.length ? ` (distintas: ${different.join(', ')})` : ''} | ${dd11 && radioSame ? 'pasa' : 'FALLA'}: con \`on\`, ${on.dd11.lineNoRadio} líneas sin radio y ${on.dd11.noLineWithRadio} sin línea con ella; con \`off\`, ${off.dd11.noLineWithRadio} con radio |`,
    )
  }
  for (const s of subxacts) {
    const overflow = s.stats.some((x) => x.subxact_overflowed === true)
    const max = Math.max(0, ...s.stats.map((x) => x.subxact_count))
    if (overflow || max >= SUBXID_CACHE) failed = true
    console.log(
      `\nSubtransacciones del día ${s.day} (calendario y flush): ${max}, desbordada: ${overflow ? 'sí' : 'no'} · ${s.summary}`,
    )
  }
}

if (COMPARE) {
  // Cada corrida de aquí contra cada una de las de allí, las de `off` y las de `on`, tabla a tabla (las
  // tablas de aquí y las de allí, juntas: una que falte en un lado cuenta como distinta).
  const other = JSON.parse(readFileSync(COMPARE, 'utf8'))
  console.log(`\nContra ${COMPARE}:`)
  console.log('\n| Día | Corridas de aquí · de allí | Tablas iguales en todas las parejas |')
  console.log('| --- | --- | --- |')
  for (const day of DAYS) {
    const mine = runs.filter((r) => r.day === day)
    const theirs = other.runs.filter((r) => r.day === day)
    if (theirs.length === 0) {
      failed = true
      console.log(`| ${day} | ${mine.length} · 0 | sin corridas allí |`)
      continue
    }
    const tables = [
      ...new Set([...mine, ...theirs].flatMap((r) => Object.keys(r.fingerprints))),
    ].sort()
    // La radio guardada (DD-11), solo entre corridas del mismo modo: con `on`, la de las etapas con
    // línea va a null.
    const different = tables.filter((t) =>
      mine.some((r) =>
        theirs.some(
          (o) =>
            (t !== RADIO || r.mode === o.mode) &&
            r.fingerprints[t]?.sha256 !== o.fingerprints[t]?.sha256,
        ),
      ),
    )
    if (different.length > 0) failed = true
    const modes = (rs) => rs.map((r) => `${r.mode} (${r.rep + 1})`).join(', ')
    console.log(
      `| ${day} | ${modes(mine)} · ${modes(theirs)} | ${tables.length - different.length} de ${tables.length}${different.length ? ` (distintas: ${different.join(', ')})` : ''} |`,
    )
  }
}

if (OUT) writeFileSync(OUT, `${JSON.stringify({ runs, subxacts }, null, 2)}\n`)
process.exit(failed ? 1 : 0)
