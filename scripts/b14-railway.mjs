#!/usr/bin/env node
/**
 * B14 DESDE RAILWAY · EL HORIZONTE DEL MÁNAGER CONTRA UNA COPIA DE PRODUCCIÓN (docs/retransmision.md §16.4,
 * §18.2 y §18.9; DD-21, 16-k y 18-j; E2, paso 10b).
 *
 * `computeHorizon` corre en cada petición con horizonte, y D-33 le pide un p95 de 5 ms
 * (`SPOILER.horizonBudgetMs`). La suite rápida lo mide con un mundo sintético (`horizonLatency.test.ts`);
 * lo que decide DD-21 es esta medida: desde el servicio `web` de Railway, con su red hasta la base, contra
 * una COPIA de la base de producción con `race_rosters` rellenada hasta 250.000 filas, el jugador y el
 * mánager de un equipo por separado. Contra la de producción no se puede: las filas sintéticas no se
 * escriben en la base del mundo.
 *
 * Qué hace, en orden:
 *   1. Abre ORIGEN_URL, la base de producción, EN SOLO LECTURA (`default_transaction_read_only`, una
 *      conexión) y comprueba que lo está: no escribe ahí nada.
 *   2. Migra COPIA_URL, una base NUEVA y VACÍA (con un mundo dentro se niega, salvo que sea una copia
 *      anterior de este script y se pida `--rehacer`).
 *   3. Copia el mundo actual con lo que lee el horizonte: el mundo y su reloj, las cuentas (sin correo,
 *      nombre ni contraseña), los equipos, los corredores, las listas de salida, las etapas corridas
 *      (solo carrera y día) y lo visto.
 *   4. Rellena `race_rosters` hasta 250.000 filas con listas sintéticas de las temporadas siguientes, con
 *      los corredores del mundo (no entran en la guardia de nadie, pero sí en la tabla y en el índice,
 *      como en B14).
 *   5. Los dos espectadores: el jugador (la cuenta de verdad cuyo corredor está en más listas de esta
 *      temporada y la anterior; si no hay ninguna, una sintética) y el mánager (una cuenta sintética con
 *      un corredor y el equipo de más corredores del mundo), los dos con el alcance por defecto.
 *   6. Mide como B14: la ida y vuelta a la base (`select 1`), `computeHorizon` sin memo (cada llamada con
 *      otro `horizon_rev`) 200 veces tras 20 de calentamiento, en tres rondas y con la de menor p95, para
 *      los dos, y `recordProgress`; e imprime el veredicto contra los 5 ms.
 *
 * La copia se queda como está: se borra el servicio cuando ya no haga falta.
 *
 * Uso, en la consola del servicio `web` de Railway (hacen falta los `dist`, que el despliegue ya tiene):
 *   ORIGEN_URL="$DATABASE_URL" COPIA_URL="postgresql://…la base nueva…" node scripts/b14-railway.mjs
 * Opciones: --filas 250000 · --muestras 200 · --rondas 3 · --rehacer (vacía antes una copia anterior).
 * Sale con 0 si el jugador, el mánager y `recordProgress` quedan dentro; con 1 si alguno no; con 2 si no
 * puede medir (las URL, la copia no vacía, el origen sin mundo).
 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const fromRoot = (p) => pathToFileURL(resolve(ROOT, p)).href
const require = createRequire(resolve(ROOT, 'packages/db/package.json'))
const postgres = (await import(pathToFileURL(require.resolve('postgres')).href)).default
const dbm = await import(fromRoot('packages/db/dist/index.js'))
const { SPOILER, DAYS_PER_SEASON } = await import(fromRoot('packages/shared/dist/index.js'))
const { SEASON_CALENDAR } = await import(fromRoot('packages/engine/dist/index.js'))

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const TARGET_ROWS = Number(arg('filas', 250_000))
const SAMPLES = Number(arg('muestras', 200))
const ROUNDS = Number(arg('rondas', 3))
const WARMUP = 20
const PER_RACE = 148
const REDO = process.argv.includes('--rehacer')
const ORIGEN_URL = process.env.ORIGEN_URL
const COPIA_URL = process.env.COPIA_URL
/** El prefijo de la semilla del mundo copiado: así la copia se reconoce como copia. */
const MARK = 'copia-b14:'
const MANAGER_EMAIL = 'manager@copia-b14.invalid'
const PLAYER_EMAIL = 'jugador@copia-b14.invalid'

const fail = (msg) => {
  console.error(`B14 desde Railway: ${msg}`)
  process.exit(2)
}
if (!ORIGEN_URL || !COPIA_URL)
  fail('hacen falta ORIGEN_URL (la base de producción) y COPIA_URL (una base nueva y vacía).')
if (ORIGEN_URL === COPIA_URL)
  fail('ORIGEN_URL y COPIA_URL son la misma base: la copia tiene que ser otra.')
const hostOf = (u) => {
  try {
    const x = new URL(u)
    return `${x.hostname}:${x.port || 5432}${x.pathname}`
  } catch {
    return '(URL ilegible)'
  }
}
if (hostOf(ORIGEN_URL) === hostOf(COPIA_URL))
  fail(`ORIGEN_URL y COPIA_URL apuntan al mismo servidor y la misma base (${hostOf(COPIA_URL)}).`)

const percentile = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]
}
const ms = (x) => x.toFixed(2)
const t0 = performance.now()
const say = (msg) =>
  console.log(`[${((performance.now() - t0) / 1000).toFixed(0).padStart(4)} s] ${msg}`)

// ------------------------------------------------------------------------------ 1. el origen, en solo lectura
// Todo lo que se lee del origen va en UNA transacción de solo lectura (Postgres rechaza dentro cualquier
// escritura) y con una sola foto de la base; la sesión, además, en solo lectura por defecto.
const origin = postgres(ORIGEN_URL, {
  max: 1,
  onnotice: () => {},
  connection: {
    default_transaction_read_only: 'on',
    application_name: 'b14-railway (solo lectura)',
  },
})
await origin`set default_transaction_read_only = on`
const [ro] = await origin`show default_transaction_read_only`
if (ro?.default_transaction_read_only !== 'on') fail('el origen no quedó en solo lectura: no sigo.')
const snapshot = await origin.begin('isolation level repeatable read read only', async (tx) => {
  const [w] = await tx`
    select gs.world_id, gs.current_day, gs.last_processed_day, w.world_seed, w.engine_version
    from game_state gs join worlds w on w.id = gs.world_id limit 1`
  if (w === undefined) return null
  // Las cuentas que el mundo nombra, sin lo personal: el horizonte solo lee el alcance y la revisión.
  const users = await tx`
    select id, spoiler_scope, horizon_rev, reveal_confirm, is_admin, premium, locale, email_verified
    from users
    where id in (select user_id from riders where world_id = ${w.world_id} and user_id is not null
                 union select owner_user_id from teams where world_id = ${w.world_id} and owner_user_id is not null
                 union select user_id from race_watch where world_id = ${w.world_id})`
  const teams = await tx`select * from teams where world_id = ${w.world_id}`
  const riders = await tx`select * from riders where world_id = ${w.world_id}`
  const rosters = await tx`
    select rr.* from race_rosters rr join riders r on r.id = rr.rider_id where r.world_id = ${w.world_id}`
  const stages = await tx`select race_id, stage_day, seed, engine_version from stage_snapshots`
  const watch = await tx`select * from race_watch where world_id = ${w.world_id}`
  return { w, users, teams, riders, rosters, stages, watch }
})
await origin.end({ timeout: 5 })
if (snapshot === null) fail('el origen no tiene mundo (game_state vacío).')
const { w, users, teams, riders, rosters, stages, watch } = snapshot
say(
  `origen ${hostOf(ORIGEN_URL)}, leído en solo lectura: el mundo ${w.world_seed}, día de juego ${w.current_day}`,
)

// ------------------------------------------------------------------------------- 2. la copia, migrada y vacía
// Antes de escribir nada en ella: una base con un mundo que no sea una copia de este script no se toca
// (por ejemplo, la de producción puesta por error en COPIA_URL), ni siquiera para migrarla.
const peek = postgres(COPIA_URL, { max: 1, onnotice: () => {} })
const [{ t: worldsTable }] = await peek`select to_regclass('public.worlds')::text as t`
const there = worldsTable === null ? [] : await peek`select world_seed from worlds`
await peek.end({ timeout: 5 })
if (there.length > 0 && (!REDO || there.some((x) => !String(x.world_seed).startsWith(MARK))))
  fail(
    `la copia (${hostOf(COPIA_URL)}) ya tiene un mundo (${there.map((x) => x.world_seed).join(', ')}): ` +
      'usa una base nueva y vacía, o --rehacer si es una copia anterior de este script.',
  )
await dbm.runMigrations(COPIA_URL)
const copy = postgres(COPIA_URL, { max: 1, onnotice: () => {} })
if (there.length > 0) {
  await copy`truncate table race_watch, stage_snapshots, race_rosters, riders, teams, game_state, worlds, users cascade`
  say('la copia anterior, vaciada (--rehacer)')
}
say(`copia ${hostOf(COPIA_URL)}: migrada y vacía`)

// ------------------------------------------------------------------- 3. el mundo actual, lo que lee el horizonte
const worldId = w.world_id
/** Copia por lotes: `select` en el origen, `insert` de las mismas columnas en la copia. */
async function copyRows(table, rows, transform = (r) => r) {
  const BATCH = 2_000
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map(transform)
    if (chunk.length > 0) await copy`insert into ${copy(table)} ${copy(chunk)}`
  }
  return rows.length
}
await copy`insert into worlds (id, world_seed, engine_version)
           values (${worldId}, ${MARK + w.world_seed}, ${w.engine_version})`
await copy`insert into game_state (world_id, current_day, last_processed_day)
           values (${worldId}, ${w.current_day}, ${w.last_processed_day})`
await copyRows('users', users, (u) => ({ ...u, email: `u-${u.id}@copia-b14.invalid`, name: '' }))
await copyRows('teams', teams)
await copyRows('riders', riders)
await copyRows('race_rosters', rosters)
await copyRows('stage_snapshots', stages, (s) => ({ ...s, input: {} }))
await copyRows('race_watch', watch)
say(
  `copiado: ${users.length} cuentas, ${teams.length} equipos, ${riders.length} corredores, ` +
    `${rosters.length} filas de race_rosters, ${stages.length} etapas corridas y ${watch.length} filas de lo visto`,
)

// ------------------------------------------------------------------------ 4. race_rosters, hasta 250.000 filas
const season = Math.floor(w.current_day / DAYS_PER_SEASON)
const need = Math.max(0, TARGET_ROWS - rosters.length)
const keys = []
for (let s = season + 1; keys.length * PER_RACE < need; s++)
  for (const race of SEASON_CALENDAR) {
    if (keys.length * PER_RACE >= need) break
    keys.push(`${race.id}:s${s}`)
  }
if (keys.length > 0)
  await copy`
    insert into race_rosters (race_id, rider_id)
    select k.key, r.ids[1 + ((k.i * 37 + j) % r.n)]
    from unnest(${keys}::text[]) with ordinality as k(key, i)
    cross join generate_series(0, ${PER_RACE - 1}) as j
    cross join (select array_agg(id order by id) as ids, count(*)::int as n
                from riders where world_id = ${worldId}) r
    on conflict do nothing`
await copy`analyze race_rosters`
await copy`analyze riders`
await copy`analyze teams`
const [{ n: rosterRows }] = await copy`select count(*)::int as n from race_rosters`
say(
  `race_rosters: ${rosterRows} filas (${keys.length} listas sintéticas de la temporada ${season + 1} en adelante)`,
)

// ------------------------------------------------------------------------------------ 5. los dos espectadores
const [best] = await copy`
  select r.user_id as user_id, count(*)::int as lists
  from riders r join race_rosters rr on rr.rider_id = r.id
  where r.user_id is not null and r.retired_at is null and r.world_id = ${worldId}
    and (rr.race_id like ${`%:s${season}`} or rr.race_id like ${`%:s${season - 1}`})
  group by r.user_id order by lists desc limit 1`
let player = best?.user_id ?? null
if (player === null) {
  const [u] =
    await copy`insert into users (email, name, email_verified) values (${PLAYER_EMAIL}, '', true) returning id`
  player = u.id
  await copy`update riders set user_id = ${player}
             where id = (select id from riders where world_id = ${worldId} and user_id is null
                         and retired_at is null order by id limit 1)`
}
const [mu] =
  await copy`insert into users (email, name, email_verified) values (${MANAGER_EMAIL}, '', true) returning id`
const manager = mu.id
const [team] = await copy`
  select t.id, count(r.id)::int as size from teams t join riders r on r.team_id = t.id
  where t.world_id = ${worldId} group by t.id order by size desc, t.id limit 1`
if (team === undefined) fail('la copia no tiene ningún equipo con corredores.')
await copy`update teams set owner_user_id = ${manager} where id = ${team.id}`
await copy`update riders set user_id = ${manager}
           where id = (select id from riders where world_id = ${worldId} and user_id is null
                       and retired_at is null and team_id is distinct from ${team.id} order by id limit 1)`
await copy`update users set spoiler_scope = 'guarded' where id in (${player}, ${manager})`
await copy.end({ timeout: 5 })
say(`el jugador ${player}; el mánager ${manager}, dueño de un equipo de ${team.size} corredores`)

// -------------------------------------------------------------------------------------------- 6. la medida
const { db, client } = dbm.createDb(COPIA_URL)
const world = { worldId, currentDay: w.current_day }
const { sql } = await import(pathToFileURL(require.resolve('drizzle-orm')).href)
const rtt = []
for (let i = 0; i < WARMUP + SAMPLES; i++) {
  const t = performance.now()
  await db.execute(sql`select 1`)
  if (i >= WARMUP) rtt.push(performance.now() - t)
}
const horizonTimes = async (userId) => {
  const out = []
  for (let i = 0; i < WARMUP + SAMPLES; i++) {
    // sin memo: cada llamada con otro horizon_rev, fuera de la medida
    await db.execute(sql`update users set horizon_rev = horizon_rev + 1 where id = ${userId}`)
    const t = performance.now()
    await dbm.computeHorizon(db, { userId, readOnly: false }, world)
    if (i >= WARMUP) out.push(performance.now() - t)
  }
  return out
}
const bestOf = async (round) => {
  let bestRun = []
  for (let r = 0; r < ROUNDS; r++) {
    const xs = await round(r)
    if (r === 0 || percentile(xs, 95) < percentile(bestRun, 95)) bestRun = xs
  }
  return bestRun
}
const playerT = await bestOf(() => horizonTimes(player))
const managerT = await bestOf(() => horizonTimes(manager))
const raceKey = `${SEASON_CALENDAR[0].id}:s${season}`
const progressT = await bestOf(async (r) => {
  const out = []
  for (let i = 0; i < WARMUP + SAMPLES; i++) {
    const reached = 30 + 15 * (r * (WARMUP + SAMPLES) + i)
    const t = performance.now()
    await dbm.recordProgress(
      db,
      { userId: player, worldId, raceKey },
      2,
      reached,
      'play',
      1_000_000,
    )
    if (i >= WARMUP) out.push(performance.now() - t)
  }
  return out
})
dbm.clearHorizonCaches()
const hp = await dbm.computeHorizon(db, { userId: player, readOnly: true }, world)
const hm = await dbm.computeHorizon(db, { userId: manager, readOnly: true }, world)
await client.end({ timeout: 5 })

const budget = SPOILER.horizonBudgetMs
const rows = [
  ['ida y vuelta a la base (select 1)', rtt, null],
  [
    `computeHorizon, el jugador (${hp.knownThrough.size} carreras en guardia, velo de ${hp.veil.length})`,
    playerT,
    budget,
  ],
  [
    `computeHorizon, el mánager (${hm.knownThrough.size} carreras en guardia, velo de ${hm.veil.length})`,
    managerT,
    budget,
  ],
  ['recordProgress', progressT, budget],
]
console.log(
  `\nB14 desde Railway · ${rosterRows} filas de race_rosters · la mejor de ${ROUNDS} rondas de ${SAMPLES}\n`,
)
console.log('| Medida | p50 | p95 | Umbral (D-33) | |')
console.log('| --- | --- | --- | --- | --- |')
let ok = true
for (const [label, xs, limit] of rows) {
  const p95 = percentile(xs, 95)
  const pass = limit === null || p95 <= limit
  if (!pass) ok = false
  console.log(
    `| ${label} | ${ms(percentile(xs, 50))} ms | ${ms(p95)} ms | ${limit === null ? '—' : `≤ ${limit} ms`} | ${limit === null ? '' : pass ? 'dentro' : 'FUERA'} |`,
  )
}
console.log(
  ok
    ? '\nDentro: con la medida delante, SPOILER_MODE puede pasar a on (DD-21).'
    : '\nFUERA: SPOILER_MODE no pasa a on hasta que el mánager quepa, o hasta que el dueño decida otra cosa (DD-21).',
)
process.exitCode = ok ? 0 : 1
