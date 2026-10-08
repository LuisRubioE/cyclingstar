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
 * `clearHorizonCaches`; el 7b, `veilCast` (el reparto bajo el velo, §10.10); el 8a, `veilSql` (el
 * predicado, §10.6, punto 3), y el 8b, `veilDelta` (lo que el velo resta y enmascara, punto 4), su
 * memo y `DayShared`, la cuenta del día que comparten las peticiones (11-s). Qué horizonte recibe cada
 * petición lo decide `SPOILER_MODE` alrededor de `computeHorizon`, no dentro: `request.horizon()`, en
 * la API (§10.13, §14.5).
 */
import { SEASON_CALENDAR, stageDayOfSeason } from '@cyclingstar/engine'
import {
  type CastRider,
  DAYS_PER_SEASON,
  type Distinction,
  type GuardReason,
  type HealthState,
  type HorizonSummary,
  SPOILER,
  type SpoilerScope,
  type StageGate,
  type StageRef,
  type TimelineCast,
  type WornJersey,
  currentSeason,
  parseRaceKey,
} from '@cyclingstar/shared'
import { type SQL, type SQLWrapper, and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import {
  news,
  palmares,
  raceRosters,
  riderPoints,
  stageTeamResults,
  transactions,
  users,
} from './schema.js'

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

/** Lo que las etapas veladas cambiaron en el mundo: lo que R resta y M enmascara (D-32; `veilDelta`, 8b). */
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

  /** Quita una entrada: la promesa de `veilDelta` que falló no se queda como lo velado del minuto. */
  delete(key: string): void {
    this.entries.delete(key)
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
 * Lo que las etapas veladas cambiaron, con la clave y la vida del horizonte (18-c, §10.7): la PROMESA,
 * para que las lecturas de una misma petición (la ficha de un equipo resta puntos y presupuesto y
 * enmascara la salud) esperen la misma cuenta; se quita si falla.
 */
const veilDeltaMemo = new TtlMemo<Promise<VeilDelta>>(
  SPOILER.horizonMemoS * 1000,
  SPOILER.horizonMemoEntries,
)

/** Las cuentas del día que viven en el proceso, vivan en el fichero que vivan: `clearHorizonCaches` las vacía todas. */
const dayCaches = new Set<{ clear(): void }>()

/**
 * UNA CUENTA DEL DÍA PARA TODOS (decisión 11-s): una promesa por (mundo, día de juego) que comparten
 * las peticiones que llegan a la vez tras el tick, en lugar de pagar cada una la suya, y que se borra
 * si falla, para que la siguiente la repita. Exacta porque lo que cuenta solo lo escribe el tick, que
 * sube `currentDay` en la misma transacción (`tick.ts`): una clave de otro día ya no se pide. Guarda
 * UNA clave, la del día de la última petición. Son dos: el mapa de `lastRunStages` (18-a) y el total
 * del ranking que resta R (`ranking.ts`, §11.5).
 */
export class DayShared<V> {
  private entry: { readonly key: string; readonly value: Promise<V> } | null = null

  constructor() {
    dayCaches.add(this)
  }

  get(key: string, make: () => Promise<V>): Promise<V> {
    if (this.entry?.key === key) return this.entry.value
    const entry = { key, value: make() }
    this.entry = entry
    entry.value.catch(() => {
      if (this.entry === entry) this.entry = null // un fallo no se queda como la cuenta del día
    })
    return entry.value
  }

  clear(): void {
    this.entry = null
  }
}

/**
 * La última etapa corrida de cada carrera de la temporada actual y la anterior, por (mundo, día de
 * juego): UNA consulta para todos los espectadores (18-a), en una promesa que comparten las peticiones
 * que llegan a la vez tras el tick y que se borra si falla (11-s).
 */
const lastRun = new DayShared<ReadonlyMap<string, number>>()

/**
 * Solo para los tests, como `clearStageTimelineCache` (§5.6): vacía el memo del horizonte, el de
 * `veilDelta`, el de `touchLastSeen` y las cuentas del día (el mapa de `lastRunStages` y el total del
 * ranking que resta R, 11-s). En el mundo de B1 el día de juego no cambia al correr la etapa velada y
 * todo esto va por el día: sin vaciarlo, el barrido de después recibiría el horizonte de antes, con el
 * velo vacío, o restaría la etapa velada a un total de antes (§16.3).
 */
export function clearHorizonCaches(): void {
  horizonMemo.clear()
  lastSeenMemo.clear()
  veilDeltaMemo.clear()
  for (const c of dayCaches) c.clear()
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
  const season = currentSeason(world.currentDay)
  return lastRun.get(`${world.worldId}|${world.currentDay}`, () =>
    db
      .execute(
        sql`
      select race_id as race_key, max(stage_day) as last_run from stage_snapshots
      where race_id like ${`%:s${season}`} or race_id like ${`%:s${season - 1}`}
      group by race_id`,
      )
      .then(
        (rs): ReadonlyMap<string, number> =>
          new Map(rs.map((r) => [String(r.race_key), Number(r.last_run)])),
      ),
  )
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

// ---------------------------------------------------------- el predicado (§10.6, punto 3; 8a)

/**
 * EL PREDICADO DEL VELO (D-32, decisión 10-d): la fila pertenece a una etapa del velo de `h`. Es la
 * ÚNICA forma de escribir el corte en SQL. `(raceKey, gameDay)` identifica una etapa porque ninguna
 * carrera declara `doubleAfter`; donde la tabla tiene `stage_day` (`news` desde la 0046; `rider_points`,
 * `palmares` y `transactions` desde la 0049; `stage_team_results` siempre) se pasa, y una fila con
 * `stage_day` casa por su etapa, mientras que una vieja, con `stage_day` nulo, cae al día de juego.
 * `gameDay` null es la segunda firma, para la tabla que no tiene día de juego (`stage_team_results`).
 * Con el velo vacío, `false`.
 *
 * Las tres listas del velo van enlazadas como UN parámetro de tipo array cada una (`sql.param`): una
 * lista tal cual dentro de `sql`, drizzle-orm 0.45.2 la expande a `($1, $2, …)` y el `::text[]` falla
 * (medido en PGlite y con postgres-js, `l6/veilsql.mjs`). En SQL:
 *
 *   exists (select 1 from unnest($1::text[], $2::int[], $3::int[]) as w(k, d, s)
 *           where w.k = <raceKey> and (w.s = <stageDay> or (<stageDay> is null and w.d = <gameDay>)))
 *
 * En una tabla grande va DETRÁS de un filtro que use un índice (el velo tiene como mucho unas cincuenta
 * entradas, §10.4). `palmares` lleva la clave sin temporada: se compone con
 * ``sql`${palmares.raceId} || ':s' || ${palmares.season}` ``.
 */
export function veilSql(
  h: Horizon,
  raceKey: SQLWrapper,
  gameDay: SQLWrapper,
  stageDay?: SQLWrapper,
): SQL
export function veilSql(h: Horizon, raceKey: SQLWrapper, gameDay: null, stageDay: SQLWrapper): SQL
export function veilSql(
  h: Horizon,
  raceKey: SQLWrapper,
  gameDay: SQLWrapper | null,
  stageDay?: SQLWrapper,
): SQL {
  if (h.veil.length === 0) return sql`false`
  const keys = sql.param(h.veil.map((v) => v.raceKey))
  const days = sql.param(h.veil.map((v) => v.gameDay))
  const stages = sql.param(h.veil.map((v) => v.stageDay))
  const match =
    stageDay === undefined
      ? sql`w.d = ${gameDay}`
      : gameDay === null
        ? sql`w.s = ${stageDay}`
        : sql`(w.s = ${stageDay} or (${stageDay} is null and w.d = ${gameDay}))`
  return sql`exists (select 1 from unnest(${keys}::text[], ${days}::int[], ${stages}::int[]) as w(k, d, s) where w.k = ${raceKey} and ${match})`
}

/**
 * LA ETAPA DE UNA FILA DEL PALMARÉS, para el predicado del velo (§10.6, punto 3): `race_id` va SIN
 * temporada, que está en `season`, así que la clave se compone en SQL; `stage_day` desde la 0049, y las
 * filas de antes caen al día de juego. Nace en `ranking.ts` en el 8a y vive aquí desde el 8b, junto al
 * predicado, porque también la usa `veilDelta`.
 */
export function palmaresVeil(h: Horizon): SQL {
  return veilSql(
    h,
    sql`${palmares.raceId} || ':s' || ${palmares.season}`,
    palmares.gameDay,
    palmares.stageDay,
  )
}

// ------------------------------------------------------ lo que el velo resta (§10.6, punto 4; 8b)

/** El de un velo vacío, sin una consulta: el de `worldHorizon`, el del visitante y el de quien no tiene nada por ver. */
const NO_DELTA: VeilDelta = {
  points: new Map(),
  money: new Map(),
  budget: new Map(),
  palmares: new Set(),
  health: new Map(),
  abandons: new Set(),
  raceDays: new Map(),
}

/**
 * El día de juego al que se calculó un horizonte con velo: la primera mitad de su `rev`
 * (`${currentDay}.${horizon_rev}`, que escribe `buildHorizon` aquí mismo; §4.10, D-35), y nunca menos
 * que el de su última etapa velada, que ya se corrió (un horizonte armado a mano en un test puede traer
 * otro `rev`). Solo lo usa `veilDelta`, para separar de los puntos velados los de la temporada actual.
 */
function dayOfHorizon(h: Horizon): number {
  const lastVeiled = Math.max(...h.veil.map((v) => v.gameDay))
  const fromRev = Number.parseInt(h.rev.split('.')[0] ?? '', 10)
  return Number.isFinite(fromRev) ? Math.max(fromRev, lastVeiled) : lastVeiled
}

/** Las filas de un `json_agg`, como las entregue el conductor: un array, o nada. */
function jsonRows(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : []
}

const HEALTH: readonly HealthState[] = ['sano', 'molestias', 'enfermo', 'lesionado']

/**
 * LO QUE LAS ETAPAS VELADAS CAMBIARON EN EL MUNDO (§10.6, punto 4; §21.6 F.2): lo que el mecanismo R
 * resta (los puntos, el dinero, el presupuesto y el palmarés) y lo que M enmascara (la salud y el
 * abandono), y los días de carrera velados del parte y del informe (F, 11-e). Con el velo vacío no
 * consulta nada. Se pide perezoso, como mucho una vez por petición, y se memoriza con la clave y la vida
 * del horizonte (18-c): sale del velo, que solo cambia con `horizon_rev`, y de filas que solo escribe el
 * tick, que solo cambian con el día; la clave lleva además el velo mismo, para que dos horizontes con el
 * mismo usuario y el mismo `rev` y otro velo (dos mundos en un proceso de tests) no compartan entrada.
 */
export function veilDelta(db: Database, h: Horizon): Promise<VeilDelta> {
  if (h.veil.length === 0) return Promise.resolve(NO_DELTA)
  const key = `${h.userId ?? '-'}|${h.rev}|${h.veil.map((v) => `${v.raceKey}#${v.stageDay}`).join(',')}`
  const nowMs = Date.now()
  const hit = veilDeltaMemo.get(key, nowMs)
  if (hit !== undefined) return hit
  const delta = computeVeilDelta(db, h)
  veilDeltaMemo.set(key, delta, nowMs)
  delta.catch(() => {
    if (veilDeltaMemo.get(key, Date.now()) === delta) veilDeltaMemo.delete(key)
  })
  return delta
}

/**
 * Las siete fuentes de `VeilDelta` (la tabla de §10.6, punto 4) en UNA sentencia, cada una como un
 * `json_agg` en su subconsulta, como la consulta 2 y la 3 del horizonte: un viaje a la base, que con
 * siete consultas en paralelo serían siete conexiones del grupo por petición. Cada una lleva `veilSql`
 * detrás de un filtro por las carreras del velo que usa un índice: la clave de `race_rosters` y de
 * `stage_team_results` (que empiezan por la carrera), y los índices de la 0049 (`rider_points` y
 * `transactions`) y de la 0046 (`news`). Las cuatro diferencias con la tabla de §10.6, cada una con su
 * porqué:
 *  - `points` filtra por la carrera y no por el día (`rider_points_race_stage_idx`, 0049): es el mismo
 *    conjunto, porque el predicado exige la carrera, y no pierde una fila cuya etapa casa con otro día.
 *  - `health` toma la caída velada MÁS ANTIGUA de cada corredor, no la más reciente: con dos veladas, la
 *    salud de antes de la segunda es la que dejó la primera, y enseñarla destriparía la primera.
 *  - `health` cuenta también la enfermedad en carrera (`abandoned_reason = 'enfermedad'`, `stageRun.ts`):
 *    no deja noticia `injury`, solo el abandono, y el dado solo se tira a los sanos, así que su salud de
 *    antes es `sano` sin fecha.
 *  - `abandons` compara el motivo con `is distinct from`: un abandono anterior a la v14 no tiene motivo
 *    (null), y con `<>` no saldría nunca.
 */
async function computeVeilDelta(db: Database, h: Horizon): Promise<VeilDelta> {
  const keys = sql.param([...new Set(h.veil.map((v) => v.raceKey))])
  const raceIds = sql.param([...new Set(h.veil.map((v) => parseRaceKey(v.raceKey).raceId))])
  const seasonStart = currentSeason(dayOfHorizon(h)) * DAYS_PER_SEASON
  // raceDays solo para el corredor del espectador y la plantilla del equipo que posee (18-b): son los
  // únicos que lo usan (el parte y el informe del corredor propio, sups. H4 y X1).
  const u = h.userId === null ? null : await viewerRowOf(db, h.userId)
  const ids =
    u === null ? [] : [u.riderId, ...u.teamRiders].filter((id): id is string => id !== null)
  const agg = (q: SQL): SQL => sql`(select coalesce(json_agg(x), '[]'::json) from (${q}) x)`
  const [row] = await db.execute(sql`
    select
      ${agg(sql`
        select ${riderPoints.riderId} as id,
               coalesce(sum(${riderPoints.points}) filter (where ${riderPoints.gameDay} >= ${seasonStart}), 0) as season,
               sum(${riderPoints.points}) as win
        from ${riderPoints}
        where ${riderPoints.raceId} = any(${keys}::text[])
          and ${veilSql(h, riderPoints.raceId, riderPoints.gameDay, riderPoints.stageDay)}
        group by ${riderPoints.riderId}`)} as points,
      ${agg(sql`
        select ${transactions.riderId} as id, sum(${transactions.amount}) as amount
        from ${transactions}
        where ${transactions.raceKey} = any(${keys}::text[]) and ${transactions.kind} = 'premio'
          and ${veilSql(h, transactions.raceKey, transactions.gameDay, transactions.stageDay)}
        group by ${transactions.riderId}`)} as money,
      ${agg(sql`
        select ${stageTeamResults.teamId} as id, sum(${stageTeamResults.prize}) as prize
        from ${stageTeamResults}
        where ${stageTeamResults.raceId} = any(${keys}::text[])
          and ${veilSql(h, stageTeamResults.raceId, null, stageTeamResults.stageDay)}
        group by ${stageTeamResults.teamId}`)} as budget,
      ${agg(sql`
        select ${palmares.id} as id from ${palmares}
        where ${palmares.raceId} = any(${raceIds}::text[]) and ${palmaresVeil(h)}`)} as palmares,
      ${agg(sql`
        select ${news.riderId} as id, ${news.gameDay} as day,
               ${news.data}->>'prevHealth' as prev, (${news.data}->>'prevUntilDay')::int as until
        from ${news}
        where ${news.raceKey} = any(${keys}::text[]) and ${news.kind} = 'injury'
          and ${news.riderId} is not null
          and ${veilSql(h, news.raceKey, news.gameDay, news.stageDay)}`)} as injuries,
      ${agg(sql`
        select ${raceRosters.raceId} as race, ${raceRosters.riderId} as id,
               ${raceRosters.abandonedDay} as day, ${raceRosters.abandonedReason} as reason
        from ${raceRosters}
        where ${raceRosters.raceId} = any(${keys}::text[]) and ${raceRosters.abandonedDay} is not null
          and ${raceRosters.abandonedReason} is distinct from 'voluntario'
          and ${veilSql(h, raceRosters.raceId, raceRosters.abandonedDay)}`)} as abandons,
      ${
        ids.length === 0
          ? sql`'[]'::json`
          : agg(sql`
        select ${raceRosters.raceId} as race, ${raceRosters.riderId} as id
        from ${raceRosters}
        where ${raceRosters.raceId} = any(${keys}::text[])
          and ${raceRosters.riderId} = any(${sql.param(ids)}::uuid[])`)
      } as rosters`)

  const points = new Map<string, { readonly season: number; readonly window: number }>()
  for (const r of jsonRows(row?.['points']))
    points.set(String(r['id']), { season: Number(r['season']), window: Number(r['win']) })
  const money = new Map<string, number>()
  for (const r of jsonRows(row?.['money'])) money.set(String(r['id']), Number(r['amount']))
  const budget = new Map<string, number>()
  for (const r of jsonRows(row?.['budget']))
    if (Number(r['prize']) !== 0) budget.set(String(r['id']), Number(r['prize']))
  const palmaresIds = new Set(jsonRows(row?.['palmares']).map((r) => String(r['id'])))

  const abandonRows = jsonRows(row?.['abandons'])
  const abandons = new Set(abandonRows.map((r) => `${String(r['race'])}|${String(r['id'])}`))
  // La salud de antes del primer suceso velado de cada corredor: la caída (con lo que guardó su
  // noticia) o la enfermedad (sano, sin fecha).
  const events: { readonly id: string; readonly day: number; readonly before: HealthBefore }[] = []
  for (const r of jsonRows(row?.['injuries'])) {
    const prev = HEALTH.find((s) => s === r['prev'])
    if (prev !== undefined)
      events.push({
        id: String(r['id']),
        day: Number(r['day']),
        before: { health: prev, untilDay: r['until'] == null ? null : Number(r['until']) },
      })
  }
  for (const r of abandonRows)
    if (r['reason'] === 'enfermedad')
      events.push({
        id: String(r['id']),
        day: Number(r['day']),
        before: { health: 'sano', untilDay: null },
      })
  events.sort((a, b) => a.day - b.day)
  const health = new Map<string, HealthBefore>()
  for (const e of events) if (!health.has(e.id)) health.set(e.id, e.before)

  const raceDays = new Map<string, number[]>()
  for (const r of jsonRows(row?.['rosters'])) {
    const id = String(r['id'])
    const days = h.veil.filter((v) => v.raceKey === String(r['race'])).map((v) => v.gameDay)
    raceDays.set(id, [...(raceDays.get(id) ?? []), ...days])
  }
  for (const [id, days] of raceDays)
    raceDays.set(
      id,
      [...new Set(days)].sort((a, b) => a - b),
    )

  return { points, money, budget, palmares: palmaresIds, health, abandons, raceDays }
}

/** La salud que la máscara M enseña: la de antes del primer suceso velado. */
type HealthBefore = { readonly health: HealthState; readonly untilDay: number | null }

/*
 * LOS GEMELOS DEL PREDICADO (§10.6, punto 3), para lo que va por número de etapa.
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

// ------------------------------------------------------------ el reparto bajo el velo (§10.10; 7b)

/**
 * EL REPARTO QUE PUEDE VER `h` (§10.10, §7.8; I-11, D-15, D-37): ningún dato cuya procedencia esté en
 * su velo viaja. Un maillot de líder cuyo `from` está velado, o uno de campeón cuyo campeonato lo está,
 * pasa a la equipación: nadie lo lleva en la pantalla de ese espectador, porque reasignarlo delataría la
 * clasificación con que se calculó la delegación. Las líneas `leads`, `wears_for` y `gc` con `from`
 * velado y la de un título velado se van; `stage_wins` se filtra etapa a etapa y, sin ninguna, se va. La
 * salida de la general (`start`) velada pasa a null, y con ella las filas de `StartState` que salen de
 * ella. `knownWins`, los equipos y los favoritos no llevan procedencia y se copian tal cual (D-26, 8-f).
 * Pura; con el velo vacío devuelve el mismo objeto. La aplica `serveCast` antes de cortar las líneas y
 * de calcular la notoriedad (§7.8), y la ruta de la cabecera arma `StartState` con su resultado.
 */
export function veilCast(cast: TimelineCast, h: Horizon): TimelineCast {
  if (h.veil.length === 0) return cast
  const seen = (r: StageRef | null): boolean => r === null || !isVeiled(h, r.raceKey, r.stageDay)
  const worn = (w: WornJersey): WornJersey =>
    (w.kind === 'leader' && !seen(w.from)) || (w.kind === 'champion' && !seen(w.title.source))
      ? { kind: 'team' }
      : w
  const line = (d: Distinction): Distinction | null => {
    switch (d.kind) {
      case 'leads':
      case 'wears_for':
      case 'gc':
        return seen(d.from) ? d : null
      case 'champion':
        return seen(d.title.source) ? d : null
      case 'stage_wins': {
        const stages = d.stages.filter(seen)
        return stages.length === d.stages.length ? d : stages.length > 0 ? { ...d, stages } : null
      }
    }
  }
  const riders = cast.riders.map((c): CastRider => ({
    ...c,
    worn: worn(c.worn),
    distinctions: c.distinctions.map(line).filter((d): d is Distinction => d !== null),
    start: seen(c.start.from) ? c.start : { gcRank: null, gcDeficitS: null, from: null },
  }))
  return { riders, teams: cast.teams, favourites: cast.favourites }
}
