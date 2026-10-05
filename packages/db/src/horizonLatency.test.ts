import { SEASON_CALENDAR, stageDayOfSeason } from '@cyclingstar/engine'
import { DAYS_PER_SEASON, SPOILER } from '@cyclingstar/shared'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type Database, createDb } from './client.js'
import { type WorldRef, computeHorizon } from './horizon.js'
import { realTestDatabaseUrl, realTestDbFor, startTestDb } from './testDb.js'
import { recordProgress } from './watch.js'

/**
 * B14 · LA LATENCIA DEL HORIZONTE (docs/retransmision.md §16.4, §18.2; D-33, O-17, H-10, X-11;
 * decisiones 16-k y 18-j; paso 7a).
 *
 * `computeHorizon` corre en cada petición con horizonte y `recordProgress` cada vez que se escribe lo
 * alcanzado: los dos tienen que caber en `SPOILER.horizonBudgetMs` (5 ms) de p95 con un año de listas
 * de salida en `race_rosters`. Se llena la tabla con 249.232 filas (la cota de C12: 1.684 carreras de
 * dos temporadas, 148 corredores cada una, de 3.900) con `generate_series`, se calienta con 20 llamadas
 * y se miden por separado, 200 veces cada una: `computeHorizon` sin memo (cada llamada con otro
 * `horizon_rev`), en la forma D de §18.2, para el jugador de un corredor y para el mánager que además
 * posee un equipo de 30; y `recordProgress`.
 *
 * Dónde y con qué umbral (18-j). Contra el Postgres de servicio del job `test` del CI, en su propia
 * base (`realTestDbFor('cyclingstar_b14')`, 16-r), el jugador y `recordProgress` son puerta a 5 ms y el
 * mánager se imprime: su puerta es la medida a mano desde el servicio `web` de Railway contra una copia
 * de producción (§18.9, DD-21). Sin `TEST_DATABASE_URL`, en local, corre en PGlite por su socket, que
 * da de 2,55 a 4,97 ms de p95 al jugador entre corridas (§18.2): imprime los tres y falla solo por
 * encima de 15 ms, tres veces el presupuesto, que caza la pérdida del índice (sin él, más de 23 ms) y
 * no el ruido. Además, en los dos, el plan de la consulta 2 tiene que usar `race_rosters_rider_idx`.
 */
const REAL_URL = realTestDatabaseUrl()
const RIDERS = 3_900
const PER_RACE = 148
const WARMUP = 20
const SAMPLES = 200
/**
 * Rondas de cada medida; cuenta la de menor p95, como el tramo denso de B8 (6a). Contra el Postgres
 * de servicio el job de tests corre el resto de la suite en paralelo, y con el mismo código el p95 del
 * jugador dio 3,75 ms en una corrida y 5,05 en otra (con el p50 de 2,40 a 4,08): esa carga mide el
 * runner, no la consulta. Una regresión de verdad (perder el índice, una consulta de más) sube las tres
 * rondas, y el umbral sigue siendo el de D-33.
 */
const ROUNDS = 3
const TEAM = 30
/** Un día de la temporada 1 con la Vuelta de Italia por caducar y la de Francia en curso. */
const CURRENT_DAY = DAYS_PER_SEASON + 200
const LIMIT_MS = REAL_URL == null ? 3 * SPOILER.horizonBudgetMs : SPOILER.horizonBudgetMs

const PLAYER = '00000000-0000-4000-8000-00000000b141'
const MANAGER = '00000000-0000-4000-8000-00000000b142'

/** El p-ésimo percentil de una muestra, por el rango (sin interpolar). */
function percentile(xs: readonly number[], p: number): number {
  const s = [...xs].sort((x, y) => x - y)
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]!
}
const ms = (x: number): string => x.toFixed(2)

describe('B14 · la latencia del horizonte (§16.4)', () => {
  let db: Database
  let close: () => Promise<void> = async () => {}
  let world: WorldRef
  const where = REAL_URL == null ? 'PGlite' : 'Postgres'

  beforeAll(async () => {
    if (REAL_URL != null) {
      const c = createDb(await realTestDbFor('cyclingstar_b14'))
      db = c.db
      close = () => c.client.end({ timeout: 5 })
    } else {
      const t = await startTestDb()
      db = t.db
      close = t.close
    }
    world = await fill(db)
  }, 120_000)

  afterAll(async () => {
    await close()
  })

  it(`computeHorizon (jugador y mánager) y recordProgress: p95 ≤ ${LIMIT_MS} ms en ${where}`, async () => {
    const viewers = {
      jugador: { userId: PLAYER, readOnly: false },
      mánager: { userId: MANAGER, readOnly: false },
    } as const
    const horizonTimes = async (userId: string): Promise<number[]> => {
      const out: number[] = []
      for (let i = 0; i < WARMUP + SAMPLES; i++) {
        // Sin memo: cada llamada, con otro horizon_rev (fuera de la medida).
        await db.execute(sql`update users set horizon_rev = horizon_rev + 1 where id = ${userId}`)
        const t0 = performance.now()
        await computeHorizon(db, { userId, readOnly: false }, world)
        if (i >= WARMUP) out.push(performance.now() - t0)
      }
      return out
    }
    /** La ronda de menor p95 de ROUNDS (arriba). */
    const bestOf = async (round: (r: number) => Promise<number[]>): Promise<number[]> => {
      let best: number[] = []
      for (let r = 0; r < ROUNDS; r++) {
        const xs = await round(r)
        if (r === 0 || percentile(xs, 95) < percentile(best, 95)) best = xs
      }
      return best
    }
    const player = await bestOf(() => horizonTimes(PLAYER))
    const manager = await bestOf(() => horizonTimes(MANAGER))
    const k = { userId: PLAYER, worldId: world.worldId, raceKey: `race-france:s1` }
    const progress = await bestOf(async (r) => {
      const out: number[] = []
      for (let i = 0; i < WARMUP + SAMPLES; i++) {
        // Lo alcanzado sigue creciendo de una ronda a la siguiente: cada informe escribe.
        const reached = 30 + 15 * (r * (WARMUP + SAMPLES) + i)
        const t0 = performance.now()
        await recordProgress(db, k, 2, reached, 'play', 1_000_000)
        if (i >= WARMUP) out.push(performance.now() - t0)
      }
      return out
    })
    const hp = await computeHorizon(db, viewers.jugador, world)
    const hm = await computeHorizon(db, viewers.mánager, world)
    const p95 = {
      jugador: percentile(player, 95),
      mánager: percentile(manager, 95),
      recordProgress: percentile(progress, 95),
    }
    console.log(
      `B14 (${where}, 249.232 filas de race_rosters, la mejor de ${ROUNDS} rondas): jugador p50 ${ms(percentile(player, 50))} · p95 ` +
        `${ms(p95.jugador)} ms (${hp.knownThrough.size} carreras en guardia, velo de ${hp.veil.length}); ` +
        `mánager p50 ${ms(percentile(manager, 50))} · p95 ${ms(p95.mánager)} ms ` +
        `(${hm.knownThrough.size} carreras, velo de ${hm.veil.length}); recordProgress p50 ` +
        `${ms(percentile(progress, 50))} · p95 ${ms(p95.recordProgress)} ms`,
    )
    // No vacío: los dos tienen carreras en guardia y velo, y el mánager más que el jugador.
    expect(hp.veil.length).toBeGreaterThan(0)
    expect(hm.knownThrough.size).toBeGreaterThan(hp.knownThrough.size)
    // La puerta: el jugador y recordProgress; el mánager, impreso (DD-21).
    expect(p95.jugador).toBeLessThanOrEqual(LIMIT_MS)
    expect(p95.recordProgress).toBeLessThanOrEqual(LIMIT_MS)
  }, 120_000)

  it('la consulta 2 usa race_rosters_rider_idx: sin él, un recorrido secuencial (§13.4, 18-a)', async () => {
    const ids = (
      await db.execute(sql`select id from riders where team_id is not null limit ${TEAM}`)
    ).map((r) => String(r.id))
    const plan = (
      await db.execute(sql`
        explain select rr.race_id, bool_or(rr.rider_id = ${ids[0]}) from race_rosters rr
        where rr.rider_id = any(${sql.param(ids)}::uuid[])
          and (rr.race_id like '%:s1' or rr.race_id like '%:s0')
        group by rr.race_id`)
    )
      .map((r) => String(Object.values(r)[0]))
      .join('\n')
    expect(plan).toContain('race_rosters_rider_idx')
  })
})

/**
 * El mundo de B14: 3.900 corredores; el del jugador y un equipo de 30 del mánager; 249.232 filas de
 * `race_rosters` (cada carrera de las dos temporadas con 148 corredores, repartidos con un paso de 37);
 * y las etapas corridas hasta `CURRENT_DAY` en `stage_snapshots`, que es lo que lee el mapa del día.
 */
async function fill(db: Database): Promise<WorldRef> {
  const [w] = await db.execute(sql`
    insert into worlds (world_seed, engine_version) values ('b14', 91) returning id`)
  const worldId = String(w!.id)
  await db.execute(sql`
    insert into users (id, email, name) values (${PLAYER}, 'jugador-b14@example.com', 'J'),
                                               (${MANAGER}, 'manager-b14@example.com', 'M')`)
  const [team] = await db.execute(sql`
    insert into teams (world_id, name, division, philosophy, jersey_seed, owner_user_id)
    values (${worldId}, 'Equipo B14', 'WT', 'general', 'b14', ${MANAGER}) returning id`)
  // El corredor n tiene el id md5('b14-n'): así las listas de salida se escriben sin cruzar tablas.
  await db.execute(sql`
    insert into riders (id, world_id, name, country, gender, birth_season, archetype, face_seed)
    select md5('b14-' || g)::uuid, ${worldId}, 'R' || g, 'ES', 'M', -25, 'fondo', 'f' || g
    from generate_series(0, ${RIDERS - 1}) g`)
  await db.execute(sql`
    update riders set user_id = ${PLAYER} where id = md5('b14-0')::uuid`)
  await db.execute(sql`
    update riders set team_id = ${String(team!.id)}
    where id in (select md5('b14-' || (1000 + 15 * k))::uuid from generate_series(0, ${TEAM - 1}) k)`)
  const keys = [0, 1].flatMap((s) => SEASON_CALENDAR.map((r) => `${r.id}:s${s}`))
  await db.execute(sql`
    insert into race_rosters (race_id, rider_id)
    select k.key, md5('b14-' || ((k.i * 37 + j) % ${RIDERS}))::uuid
    from unnest(${sql.param(keys)}::text[]) with ordinality as k(key, i)
    cross join generate_series(0, ${PER_RACE - 1}) as j`)
  // Las etapas corridas: la temporada 0 entera y la 1 hasta el día de hoy.
  const races: string[] = []
  const stages: number[] = []
  for (const s of [0, 1])
    for (const r of SEASON_CALENDAR)
      for (let st = 1; st <= r.stages.length; st++)
        if (s * DAYS_PER_SEASON + stageDayOfSeason(r, st) <= CURRENT_DAY) {
          races.push(`${r.id}:s${s}`)
          stages.push(st)
        }
  await db.execute(sql`
    insert into stage_snapshots (race_id, stage_day, seed, engine_version, input)
    select r, s, 'b14', 91, '{}'::jsonb
    from unnest(${sql.param(races)}::text[], ${sql.param(stages)}::int[]) as x(r, s)`)
  const [n] = await db.execute(sql`select count(*)::int as n from race_rosters`)
  expect(Number(n!.n)).toBe(keys.length * PER_RACE)
  expect(keys.length * PER_RACE).toBe(249_232)
  await db.execute(sql`analyze race_rosters`)
  await db.execute(sql`analyze riders`)
  return { worldId, currentDay: CURRENT_DAY }
}
