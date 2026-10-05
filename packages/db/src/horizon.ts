/**
 * EL HORIZONTE Y EL VELO (E2, docs/retransmision.md §4.10 y §10.6; D-28 a D-33).
 *
 * Lo que un espectador conoce de cada carrera en guardia, calculado en el servidor en cada petición y
 * en un solo punto. Los tres tipos que viajan por la red (`GuardReason`, `SpoilerScope`, `StageGate`)
 * viven en `shared` (decisión 4-k); el resto, aquí, solo en el servidor.
 *
 * Nace en el PR 3a con los tipos y las funciones PURAS (decisión 17-g): `timelineForStage` recibe un
 * `Horizon` desde que existe (14-p). El 7a añade `computeHorizon` en la forma D (18-a) con su memo y el
 * mapa del día (`lastRunStages`), `horizonSummary`, `touchLastSeen`, `TtlMemo` y, solo para los tests,
 * `clearHorizonCaches`; `veilCast` llega en el 7b, `veilSql` en el 8a y `veilDelta` en el 8b. Qué
 * horizonte recibe cada petición lo decide `SPOILER_MODE` alrededor de `computeHorizon`, no dentro:
 * `request.horizon()`, en la API (§10.13, §14.5).
 */
import { SEASON_CALENDAR, stageDayOfSeason } from '@cyclingstar/engine'
import {
  DAYS_PER_SEASON,
  type GuardReason,
  type HealthState,
  type HorizonSummary,
  SPOILER,
  type SpoilerScope,
  type StageGate,
  currentSeason,
  parseRaceKey,
} from '@cyclingstar/shared'
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { users } from './schema.js'

/** Vista en directo, en resumen o digest, revelada, arrastrada, caducada (D-28): una por etapa en race_watch.how. */
export type KnowledgeLetter = 'W' | 'S' | 'R' | 'A' | 'X'

/** Una etapa corrida que el espectador no conoce. */
export interface VeiledStage {
  readonly raceKey: string
  readonly stageDay: number
  /** stage_timelines.game_day, o el calendario si no hay línea */
  readonly gameDay: number
  readonly reason: GuardReason
}

/** El del tick, la administración y los bancos; el visitante; un espectador. */
export type HorizonKind = 'world' | 'anon' | 'viewer'

/** Lo que un espectador conoce. No se serializa nunca: lo que viaja es `HorizonSummary` y `rev`. */
export interface Horizon {
  readonly kind: HorizonKind
  /** null en 'world' y 'anon' */
  readonly userId: string | null
  /** viene de la cookie cs_viewer sin sesión: no escribe progreso (D-34) */
  readonly readOnly: boolean
  /** `${currentDay}.${users.horizon_rev}`: va en las claves de React Query (D-35) */
  readonly rev: string
  /** raceKey → k: lo conocido es el prefijo 1..k (D-28); solo carreras en guardia */
  readonly knownThrough: ReadonlyMap<string, number>
  /** EL VELO: las etapas corridas que este espectador no conoce */
  readonly veil: readonly VeiledStage[]
  /** raceKey → la etapa a medias */
  readonly watching: ReadonlyMap<string, { readonly stageDay: number; readonly reachedS: number }>
}

/** Lo que las etapas veladas cambiaron en el mundo: lo que el mecanismo R resta (D-32). Llega en el 8b. */
export interface VeilDelta {
  /** riderId → rider_points de etapas veladas */
  readonly points: ReadonlyMap<string, { readonly season: number; readonly window: number }>
  /** riderId → premios de transactions veladas (race_key, stage_day, 0049) */
  readonly money: ReadonlyMap<string, number>
  /** teamId → stage_team_results.prize velados (0049, D-41) */
  readonly budget: ReadonlyMap<string, number>
  /** ids de filas de palmares veladas */
  readonly palmares: ReadonlySet<string>
  /** la salud de antes, de la noticia injury velada (prevHealth, prevUntilDay) */
  readonly health: ReadonlyMap<
    string,
    { readonly health: HealthState; readonly untilDay: number | null }
  >
  /** `${raceKey}|${riderId}` con race_rosters.abandoned_day velado */
  readonly abandons: ReadonlySet<string>
  /** riderId → días de juego de carrera velados (parte y aprendizaje, sup. H4 y X1) */
  readonly raceDays: ReadonlyMap<string, readonly number[]>
}

/** De la sesión, o de cs_viewer; null sin nada. */
export type Viewer = { readonly userId: string; readonly readOnly: boolean } | null

/** game_state (schema.ts). */
export interface WorldRef {
  readonly worldId: string
  readonly currentDay: number
}

/**
 * Los dos horizontes sin espectador (10-h): el del tick, la administración y los bancos, y el del
 * visitante. Velo vacío: es lo que hace que un visitante vea resultados fuera de la etapa ([DUEÑO 8],
 * D-36). `worldHorizon` es una constante; `anonHorizon()`, una función, como la escribe §10.6.
 */
export const worldHorizon: Horizon = {
  kind: 'world',
  userId: null,
  readOnly: true,
  rev: 'world',
  knownThrough: new Map(),
  veil: [],
  watching: new Map(),
}
export function anonHorizon(): Horizon {
  return { ...worldHorizon, kind: 'anon', rev: 'anon' }
}

// ---------------------------------------------------------- los memos del proceso (§10.7, 10-m)

/**
 * MEMO DE VIDA FIJA (decisión 10-m). Todas las entradas viven lo mismo, así que el orden de inserción
 * del `Map` es el de caducidad: una entrada caducada se borra al leerla, cada `set` barre desde el
 * principio las caducadas y un tope borra la más antigua cuando un pico lo pasa. Así el memo guarda
 * solo a quien pidió algo en el último `lifeMs` y no crece con cada día de juego ni con cada subida de
 * `horizon_rev`, cuya clave vieja ya no se vuelve a pedir (Rcoste-011).
 */
export class TtlMemo<V> {
  private readonly entries = new Map<string, { readonly v: V; readonly untilMs: number }>()

  constructor(
    private readonly lifeMs: number,
    private readonly maxEntries: number,
  ) {}

  get(key: string, nowMs: number): V | undefined {
    const hit = this.entries.get(key)
    if (hit === undefined) return undefined
    if (hit.untilMs > nowMs) return hit.v
    this.entries.delete(key) // caducada: fuera al leerla
    return undefined
  }

  set(key: string, v: V, nowMs: number): void {
    for (const [k, e] of this.entries) {
      if (e.untilMs > nowMs) break
      this.entries.delete(k)
    } // las caducadas, desde el principio
    this.entries.delete(key) // al final, con su vida nueva
    this.entries.set(key, { v, untilMs: nowMs + this.lifeMs })
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next()
      if (oldest.done !== true) this.entries.delete(oldest.value) // el tope: fuera la más antigua
    }
  }

  /** Para B12 (el memo con tope). */
  get size(): number {
    return this.entries.size
  }

  /** Solo `clearHorizonCaches`, para los tests (§10.6). */
  clear(): void {
    this.entries.clear()
  }
}

/** El horizonte de cada espectador, por (mundo, usuario, día de juego, horizon_rev), 60 s (D-33, I-33). */
const horizonMemo = new TtlMemo<Horizon>(SPOILER.horizonMemoS * 1000, SPOILER.horizonMemoEntries)
/** Quién escribió `last_seen_at` en la última hora en este proceso: ni la consulta (§10.7). */
const lastSeenMemo = new TtlMemo<true>(
  SPOILER.lastSeenEveryMin * 60_000,
  SPOILER.horizonMemoEntries,
)

/**
 * La última etapa corrida de cada carrera de la temporada actual y la anterior, por (mundo, día de
 * juego): UNA consulta para todos los espectadores (18-a). Es una promesa, para que las peticiones que
 * llegan a la vez tras el tick esperen la misma, y se borra si falla (11-s).
 */
let lastRun: {
  readonly key: string
  readonly runs: Promise<ReadonlyMap<string, number>>
} | null = null

/**
 * Solo para los tests, como `clearStageTimelineCache` (§5.6): vacía el memo del horizonte, el mapa de
 * `lastRunStages` y el de `touchLastSeen`. En el mundo de B1 el día de juego no cambia al correr la
 * etapa velada y las cachés van por el día: sin vaciarlas, el barrido de después recibiría el horizonte
 * de antes, con el velo vacío (§16.3). El 8b le añade el memo de `veilDelta` y el total del día de R.
 */
export function clearHorizonCaches(): void {
  horizonMemo.clear()
  lastSeenMemo.clear()
  lastRun = null
}

// --------------------------------------------------- el horizonte en un solo punto (§10.6, D-33)

/** La primera fila de un `db.execute` (postgres.js devuelve un RowList, que es un array), o null. */
function first<T>(rows: readonly unknown[]): T | null {
  return (rows[0] as T | undefined) ?? null
}

/** Un `uuid[]` de Postgres como lo entregue el conductor: un array, o su texto `{a,b}` si no lo parsea. */
function uuidList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string' && v.startsWith('{') && v.endsWith('}'))
    return v
      .slice(1, -1)
      .split(',')
      .filter((s) => s !== '')
  return []
}

/** La consulta 1: el alcance, el `horizon_rev`, el corredor activo y la plantilla del equipo que posee. */
interface ViewerRow {
  readonly scope: SpoilerScope
  readonly rev: number
  readonly riderId: string | null
  readonly teamRiders: readonly string[]
}

/** La consulta 2: las carreras de las listas de salida de sus corredores. */
interface OwnRaceRow {
  readonly raceKey: string
  readonly ownRider: boolean
}

/** La consulta 3: sus filas de `race_watch` en este mundo. */
interface WatchStateRow {
  readonly raceKey: string
  readonly follow: number
  readonly knownThrough: number
  readonly watchingStage: number | null
  readonly reachedS: number | null
}

const SCOPES: readonly SpoilerScope[] = ['guarded', 'own_only', 'off']

/** La consulta 1, por clave primaria. null si la cuenta ya no existe (cookie viva de una cuenta borrada). */
async function viewerRowOf(db: Database, userId: string): Promise<ViewerRow | null> {
  // Los ids de la plantilla van por delante para que la consulta 2 use race_rosters_rider_idx (18-a).
  const r = first<Record<string, unknown>>(
    await db.execute(sql`
      select u.spoiler_scope as scope, u.horizon_rev as rev,
             (select r.id from riders r where r.user_id = u.id and r.retired_at is null limit 1) as rider_id,
             array(select r2.id from riders r2
                   where r2.team_id = (select t.id from teams t where t.owner_user_id = u.id limit 1)) as team_riders
      from users u where u.id = ${userId}`),
  )
  if (r === null) return null
  const scope = SCOPES.find((s) => s === r.scope) ?? 'guarded'
  return {
    scope,
    rev: Number(r.rev),
    riderId: r.rider_id == null ? null : String(r.rider_id),
    teamRiders: uuidList(r.team_riders),
  }
}

/** Las consultas 2 y 3 y el mapa del día: todo lo que la cuenta pura necesita. */
async function guardStateOf(
  db: Database,
  userId: string,
  world: WorldRef,
  u: ViewerRow,
): Promise<{
  readonly guard: ReadonlyMap<string, GuardReason>
  readonly rows: readonly WatchStateRow[]
  readonly runs: ReadonlyMap<string, number>
}> {
  const season = currentSeason(world.currentDay)
  // 2. Listas de su corredor y de su plantilla en la temporada actual y la anterior, por
  //    race_rosters_rider_idx (0048): `= any` con UN parámetro de tipo array (sql.param, 10-d). Con
  //    `or … in (select …)` el plan era un Seq Scan (18-a).
  const ids = [u.riderId, ...u.teamRiders].filter((id): id is string => id !== null)
  // 3. Sus filas de race_watch en este mundo: la clave (user_id, world_id, race_key).
  // La 2 y la 3 van en UNA sentencia, cada una como un `json_agg` en su subconsulta: el horizonte
  // paga un viaje a la base menos (B14, 16-k) y cada subconsulta conserva su plan (la 2, por el índice).
  const ownOn = u.scope !== 'off' && ids.length > 0
  const ownSql = ownOn
    ? sql`(select coalesce(json_agg(o), '[]'::json) from (
          select rr.race_id as race_key, bool_or(rr.rider_id = ${u.riderId}) as own_rider
          from race_rosters rr
          where rr.rider_id = any(${sql.param(ids)}::uuid[])
            and (rr.race_id like ${`%:s${season}`} or rr.race_id like ${`%:s${season - 1}`})
          group by rr.race_id) o)`
    : sql`'[]'::json`
  const [both] = await db.execute(sql`
    select ${ownSql} as own,
      (select coalesce(json_agg(w), '[]'::json) from (
         select race_key, follow, known_through, watching_stage, reached_s
         from race_watch where user_id = ${userId} and world_id = ${world.worldId}) w) as rows`)
  const ownJson: unknown = both?.['own']
  const rowsJson: unknown = both?.['rows']
  const own: OwnRaceRow[] = (Array.isArray(ownJson) ? ownJson : []).map(
    (r: Record<string, unknown>) => ({
      raceKey: String(r['race_key']),
      ownRider: r['own_rider'] === true,
    }),
  )
  const rows: WatchStateRow[] = (Array.isArray(rowsJson) ? rowsJson : []).map(
    (r: Record<string, unknown>) => ({
      raceKey: String(r['race_key']),
      follow: Number(r['follow']),
      knownThrough: Number(r['known_through']),
      watchingStage: r['watching_stage'] == null ? null : Number(r['watching_stage']),
      reachedS: r['reached_s'] == null ? null : Number(r['reached_s']),
    }),
  )
  const guard = guardCandidates(u.scope, own, rows, season)
  // 4. La última etapa corrida de cada candidata sale del mapa del día, el mismo para todos.
  const runs = guard.size === 0 ? new Map<string, number>() : await lastRunStages(db, world)
  return { guard, rows, runs }
}

/**
 * EL HORIZONTE DE UN ESPECTADOR (§10.6; D-33, en la forma D de 18-a): tres consultas por espectador y
 * el mapa del día, que es el mismo para todos; lo demás es cuenta en memoria (`buildHorizon`). El
 * resultado se memoriza en el proceso por (mundo, usuario, día de juego, horizon_rev) durante
 * `SPOILER.horizonMemoS`: una segunda petición del mismo espectador en el mismo minuto cuesta solo la
 * consulta 1, y revelar, llegar a meta, seguir o cambiar el alcance suben `horizon_rev` y la clave
 * cambia sola. Sin espectador, el del visitante; con la cuenta borrada y la cookie aún viva, también.
 */
export async function computeHorizon(
  db: Database,
  viewer: Viewer,
  world: WorldRef,
): Promise<Horizon> {
  if (viewer === null) return anonHorizon()
  const u = await viewerRowOf(db, viewer.userId)
  if (u === null) return anonHorizon() // cuenta borrada con la cookie aún viva: nada que proteger
  const memoKey = `${world.worldId}|${viewer.userId}|${world.currentDay}|${u.rev}`
  const hit = horizonMemo.get(memoKey, Date.now())
  if (hit !== undefined)
    return hit.readOnly === viewer.readOnly ? hit : { ...hit, readOnly: viewer.readOnly }
  const st = await guardStateOf(db, viewer.userId, world, u)
  const h = buildHorizon(viewer, world, u.rev, st.guard, st.rows, st.runs)
  horizonMemo.set(memoKey, h, Date.now())
  return h
}

/**
 * La última etapa corrida de cada carrera de la temporada actual y la anterior: UNA consulta por
 * (worldId, currentDay) para todos (18-a; 6,5 ms de p50 con las 1.630 carreras de dos temporadas,
 * §18.2). Exacto porque el tick corre las etapas del día y sube currentDay en la misma transacción:
 * quien lee el día D ve todas las etapas hasta D y ninguna más. Un fallo no se queda como el mapa del día.
 */
export function lastRunStages(db: Database, world: WorldRef): Promise<ReadonlyMap<string, number>> {
  const key = `${world.worldId}|${world.currentDay}`
  if (lastRun?.key === key) return lastRun.runs
  const season = currentSeason(world.currentDay)
  const runs = db
    .execute(
      sql`
      select race_id as race_key, max(stage_day) as last_run from stage_snapshots
      where race_id like ${`%:s${season}`} or race_id like ${`%:s${season - 1}`}
      group by race_id`,
    )
    .then(
      (rs): ReadonlyMap<string, number> =>
        new Map(rs.map((r) => [String(r.race_key), Number(r.last_run)])),
    )
  lastRun = { key, runs }
  void runs.catch(() => {
    if (lastRun?.runs === runs) lastRun = null
  })
  return runs
}

/**
 * Las carreras en guardia y su motivo, sin las soltadas (§10.4, D-30): las propias (su corredor en la
 * lista de salida, o uno del equipo que posee), las seguidas y, en `guarded`, las ocho de cabecera de
 * esta temporada y la anterior. La prioridad del motivo es esa: own_rider, own_team, follow, headline.
 * Soltar (`follow` −1) gana a toda fuente; `off` no guarda nada.
 */
function guardCandidates(
  scope: SpoilerScope,
  own: readonly OwnRaceRow[],
  rows: readonly WatchStateRow[],
  season: number,
): Map<string, GuardReason> {
  const g = new Map<string, GuardReason>()
  if (scope === 'off') return g
  for (const o of own) g.set(o.raceKey, o.ownRider ? 'own_rider' : 'own_team')
  for (const r of rows) if (r.follow === 1 && !g.has(r.raceKey)) g.set(r.raceKey, 'follow')
  if (scope === 'guarded')
    for (const id of SPOILER.headlineRaces)
      for (const s of [season, season - 1]) {
        const key = `${id}:s${s}`
        if (!g.has(key)) g.set(key, 'headline')
      }
  for (const r of rows) if (r.follow === -1) g.delete(r.raceKey)
  return g
}

/** Cuántas etapas tiene la carrera de una clave, por el calendario; null si no está en él. */
export function stageCountOf(raceKey: string): number | null {
  const { raceId } = parseRaceKey(raceKey)
  return SEASON_CALENDAR.find((r) => r.id === raceId)?.stages.length ?? null
}

/**
 * Si la carrera ya caducó para todos (§10.5, D-31): su ÚLTIMA etapa está corrida y han pasado
 * `SPOILER.expiryGameDays` días de juego desde ella. Mientras está en curso no caduca nada.
 */
export function raceExpired(raceKey: string, lastRun: number, currentDay: number): boolean {
  const S = stageCountOf(raceKey)
  return (
    S !== null && lastRun >= S && currentDay >= stageGameDay(raceKey, S) + SPOILER.expiryGameDays
  )
}

/**
 * LA CUENTA PURA (§10.6): para cada carrera en guardia corrida, si no ha caducado, lo conocido es su
 * `known_through` y el velo, de la siguiente a la última corrida; lo que está a medias, de toda fila
 * con `watching_stage`. El `rev` lleva el día porque cada tick añade etapas al velo sin que cambie
 * `horizon_rev`: el mismo espectador tiene otro horizonte mañana.
 */
function buildHorizon(
  viewer: NonNullable<Viewer>,
  world: WorldRef,
  rev: number,
  guard: ReadonlyMap<string, GuardReason>,
  rows: readonly WatchStateRow[],
  runs: ReadonlyMap<string, number>,
): Horizon {
  const rowOf = new Map(rows.map((r) => [r.raceKey, r]))
  const knownThrough = new Map<string, number>()
  const veil: VeiledStage[] = []
  for (const [raceKey, reason] of guard) {
    const last = runs.get(raceKey)
    if (last === undefined || raceExpired(raceKey, last, world.currentDay)) continue
    const k = rowOf.get(raceKey)?.knownThrough ?? 0
    knownThrough.set(raceKey, k)
    for (let s = k + 1; s <= last; s++)
      veil.push({ raceKey, stageDay: s, gameDay: stageGameDay(raceKey, s), reason })
  }
  const watching = new Map<string, { readonly stageDay: number; readonly reachedS: number }>()
  for (const r of rows)
    if (r.watchingStage !== null && r.reachedS !== null)
      watching.set(r.raceKey, { stageDay: r.watchingStage, reachedS: r.reachedS })
  return {
    kind: 'viewer',
    userId: viewer.userId,
    readOnly: viewer.readOnly,
    rev: `${world.currentDay}.${rev}`,
    knownThrough,
    veil,
    watching,
  }
}

/**
 * El día de juego de una etapa por el calendario, la cuenta de `raceReport.ts` (`absoluteDay`) y
 * `riderSchedule.ts`, con `stageDayOfSeason` del motor: el mismo día en que el tick corre la etapa. Una
 * clave sin temporada o fuera del calendario da el número de etapa, como allí: esas carreras no entran
 * nunca en guardia (la vuelta de prueba). Una sola cuenta del día de juego de una etapa: la caducidad
 * (§10.5) y el `gameDay` del velo. El calendario de otra temporada no cambia el número de etapas ni sus
 * días (comprobado en las temporadas 1 y 2 al escribir el 7a).
 */
export function stageGameDay(raceKey: string, stageDay: number): number {
  const { raceId, season } = parseRaceKey(raceKey)
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  return race === undefined || season === null
    ? stageDay
    : season * DAYS_PER_SEASON + stageDayOfSeason(race, stageDay)
}

/** Los km que le quedan a la cabeza de una etapa en lo alcanzado: la API los saca de la línea (§11.4). */
export type ToGoKmOf = (raceKey: string, stageDay: number, reachedS: number) => Promise<number>

/**
 * LO QUE EL ESPECTADOR TIENE POR VER (`GET /api/me/horizon`, §4.11 y §11.4): comparte con
 * `computeHorizon` las consultas y la cuenta (así no pueden discrepar), sin el memo. `ready` lleva una
 * entrada por carrera en guardia con etapas en el velo, la más antigua primero (por el día de su primera
 * etapa velada); `watching`, las etapas a medias, con los km que le quedan a la cabeza en lo alcanzado,
 * que da `toGoKmOf` desde la línea de la etapa (en la API, `timelineForStage`, que sabe también del
 * adaptador de la radio); y `expiredSinceLastVisit`, las carreras en guardia que ya caducaron sin
 * conocerse enteras, que la web acusa con `POST /api/me/reveal` sobre su última etapa (10-f).
 */
export async function horizonSummary(
  db: Database,
  viewer: Viewer,
  world: WorldRef,
  toGoKmOf: ToGoKmOf,
): Promise<HorizonSummary> {
  const empty = { ready: [], watching: [], expiredSinceLastVisit: [] }
  if (viewer === null) return { rev: 'anon', scope: 'guarded', ...empty }
  const u = await viewerRowOf(db, viewer.userId)
  if (u === null) return { rev: 'anon', scope: 'guarded', ...empty }
  const st = await guardStateOf(db, viewer.userId, world, u)
  const h = buildHorizon(viewer, world, u.rev, st.guard, st.rows, st.runs)
  const byRace = new Map<string, VeiledStage[]>()
  for (const v of h.veil) byRace.set(v.raceKey, [...(byRace.get(v.raceKey) ?? []), v])
  const sinceOf = (vs: readonly VeiledStage[]): number => vs[0]?.gameDay ?? 0
  const ready = [...byRace.entries()]
    .sort(([ka, a], [kb, b]) => sinceOf(a) - sinceOf(b) || ka.localeCompare(kb))
    .map(([raceKey, vs]) => {
      const S = stageCountOf(raceKey) ?? Math.max(...vs.map((v) => v.stageDay))
      return {
        raceKey,
        raceName:
          SEASON_CALENDAR.find((r) => r.id === parseRaceKey(raceKey).raceId)?.name ?? raceKey,
        stages: vs.map((v) => v.stageDay),
        reason: vs[0]?.reason ?? 'follow',
        expiresOnDay: stageGameDay(raceKey, S) + SPOILER.expiryGameDays,
      }
    })
  const watching = await Promise.all(
    [...h.watching].map(async ([raceKey, w]) => ({
      raceKey,
      stageDay: w.stageDay,
      reachedS: w.reachedS,
      toGoKm: Math.max(0, await toGoKmOf(raceKey, w.stageDay, w.reachedS)),
    })),
  )
  const rowOf = new Map(st.rows.map((r) => [r.raceKey, r]))
  const expiredSinceLastVisit = [...st.guard.keys()].filter((raceKey) => {
    const last = st.runs.get(raceKey)
    const S = stageCountOf(raceKey)
    return (
      last !== undefined &&
      S !== null &&
      raceExpired(raceKey, last, world.currentDay) &&
      (rowOf.get(raceKey)?.knownThrough ?? 0) < S
    )
  })
  return { rev: h.rev, scope: u.scope, ready, watching, expiredSinceLastVisit }
}

/**
 * `users.last_seen_at`, como mucho una vez por hora (§10.7, D-33): la condición del `where` hace que
 * dos instancias no escriban dos veces, y el memo del proceso evita hasta la consulta dentro de la
 * hora. La lanza el registro de rutas sin esperarla; quien la lanza le pone su `.catch` (10-k: en
 * Node 22 un rechazo sin atender tumba el proceso). El dato no sirve al horizonte: lo pide E7.
 */
export async function touchLastSeen(
  db: Database,
  userId: string,
  nowMs: number = Date.now(),
): Promise<void> {
  if (lastSeenMemo.get(userId, nowMs) !== undefined) return
  lastSeenMemo.set(userId, true, nowMs)
  await db
    .update(users)
    .set({ lastSeenAt: sql`now()` })
    .where(
      and(
        eq(users.id, userId),
        or(
          isNull(users.lastSeenAt),
          lt(users.lastSeenAt, sql`now() - make_interval(mins => ${SPOILER.lastSeenEveryMin})`),
        ),
      ),
    )
}

/*
 * LOS GEMELOS DEL PREDICADO (§10.6, punto 3), para lo que va por número de etapa. `veilSql`, el
 * predicado en SQL, llega en el 8a.
 */

/** Hasta qué etapa se puede servir una carrera (mecanismo P): la anterior a su primera velada, o lastRun. */
export function throughStage(h: Horizon, raceKey: string, lastRun: number): number {
  let first = Number.POSITIVE_INFINITY
  for (const v of h.veil) if (v.raceKey === raceKey && v.stageDay < first) first = v.stageDay
  return first === Number.POSITIVE_INFINITY ? lastRun : Math.min(lastRun, first - 1)
}

/** Si la etapa está en el velo de quien mira. */
export function isVeiled(h: Horizon, raceKey: string, stageDay: number): boolean {
  return h.veil.some((v) => v.raceKey === raceKey && v.stageDay === stageDay)
}

/**
 * La puerta de una etapa (D-37): una anterior velada manda sobre la propia (10-j), porque la previa
 * de la N destripa la N−1. null si la etapa se puede servir.
 */
export function stageGateOf(h: Horizon, raceKey: string, stageDay: number): StageGate | null {
  const before = h.veil
    .filter((v) => v.raceKey === raceKey && v.stageDay < stageDay)
    .map((v) => v.stageDay)
  if (before.length > 0) return { k: 'previous_unseen', firstUnseen: Math.min(...before) }
  return isVeiled(h, raceKey, stageDay) ? { k: 'not_seen' } : null
}
