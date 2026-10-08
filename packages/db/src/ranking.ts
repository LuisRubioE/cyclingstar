import {
  type RaceClass,
  gcPointsByClass,
  stageCities,
  stagePointsByClass,
} from '@cyclingstar/engine'
import { DAYS_PER_SEASON } from '@cyclingstar/shared'
import { type SQL, and, asc, desc, eq, gte, isNull, not, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { BATCH_ROWS, type BatchValue, inChunks, valuesList } from './batch.js'
import type { Database } from './client.js'
import { DayShared, type Horizon, type VeilDelta, palmaresVeil, veilDelta } from './horizon.js'
import { palmares, riderPoints, riders, teams } from './schema.js'

/**
 * Ranking individual de puntos y palmarés permanente (SPEC, Paso 40). Los puntos de temporada se
 * suman al terminar etapas/carreras y se reinician en el rollover; el palmarés no se reinicia nunca.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Suma puntos de ranking al corredor por su puesto de etapa (0 = ganador), según la clase. */
export async function addStagePoints(
  tx: Tx,
  riderId: string,
  raceClass: RaceClass,
  placing: number,
  source?: { gameDay: number; raceId: string },
): Promise<void> {
  await addSeasonPointsBatch(
    tx,
    [{ riderId, points: stagePointsByClass(raceClass, placing) }],
    source ? { ...source, kind: 'stage' } : undefined,
  )
}

/** Suma puntos de ranking al corredor por su puesto en la general (0 = ganador), según la clase. */
export async function addGcPoints(
  tx: Tx,
  riderId: string,
  raceClass: RaceClass,
  placing: number,
  source?: { gameDay: number; raceId: string },
): Promise<void> {
  await addSeasonPointsBatch(
    tx,
    [{ riderId, points: gcPointsByClass(raceClass, placing) }],
    source ? { ...source, kind: 'gc' } : undefined,
  )
}

/**
 * DÓNDE Y CUÁNDO SE PUNTUÓ (docs/epics.md «G3»). Sin esto el ranking no puede ser rodante: hace falta
 * el día para poder sacar de la ventana lo de hace un año.
 */
export interface PointsEvent {
  riderId: string
  points: number
}

/**
 * Suma puntos a VARIOS corredores en una sola sentencia, y los DEJA FECHADOS.
 *
 * El incremento de `season_points` es atómico (`season_points + v.pts`), igual que la versión fila a
 * fila: no lee ni pisa el valor almacenado, así que convive sin problemas con cualquier otra
 * escritura concurrente. Los corredores repetidos se agregan antes (una fila por corredor) para que
 * el `UPDATE ... FROM (VALUES …)` no descarte ninguna suma: con varias filas del VALUES casando la
 * misma fila destino, Postgres aplicaría solo una. Ignora las entradas de 0 puntos.
 *
 * …Y ADEMÁS SE GUARDA CADA PUNTUACIÓN CON SU DÍA (`rider_points`), que es lo que la v48 añade y lo
 * que hace posible el ranking a 365 días. Los dos sitios conviven a propósito y no son redundantes:
 * `season_points` es de TEMPORADA —se pone a cero en el rollover y alimenta los premios del año y el
 * maillot blanco— y `rider_points` no se borra nunca, porque la ventana rodante necesita ver el año
 * anterior.
 */
export async function addSeasonPointsBatch(
  tx: Tx,
  entries: readonly PointsEvent[],
  /**
   * Cuándo y en qué se puntuó. Opcional solo para no romper a quien sume puntos fuera de una
   * carrera; sin ello la puntuación no entra en el ranking rodante, y eso tiene que ser una decisión
   * explícita de quien llama y no un olvido.
   *
   * `stageDay`, desde la 0049 (E2, docs/retransmision.md §13.5, decisión 13-g): el número de la etapa
   * que dio los puntos (la última en los de general), que es lo que el velo necesita para restarlos
   * (8b). Opcional para quien suma puntos fuera de una etapa; `stageRun.ts` lo pasa siempre.
   */
  source?: { gameDay: number; raceId: string; kind: 'stage' | 'gc'; stageDay?: number },
): Promise<void> {
  const totals = new Map<string, number>()
  for (const e of entries) {
    if (e.points === 0) continue
    totals.set(e.riderId, (totals.get(e.riderId) ?? 0) + e.points)
  }
  const rows: BatchValue[][] = [...totals]
    .filter(([, pts]) => pts !== 0)
    .map(([riderId, pts]) => [riderId, pts])
  await inChunks(rows, BATCH_ROWS, async (chunk) => {
    const v = valuesList(chunk, ['uuid', 'integer'])
    await tx.execute(
      sql`update ${riders} set season_points = ${riders.seasonPoints} + v.pts
          from ${v} as v(id, pts) where ${riders.id} = v.id`,
    )
  })
  if (source === undefined || rows.length === 0) return
  await inChunks([...totals], BATCH_ROWS, async (chunk) => {
    await tx.insert(riderPoints).values(
      chunk
        .filter(([, pts]) => pts !== 0)
        .map(([riderId, pts]) => ({
          riderId,
          gameDay: source.gameDay,
          points: pts,
          raceId: source.raceId,
          kind: source.kind,
          stageDay: source.stageDay ?? null,
        })),
    )
  })
}

/**
 * Inmortaliza un logro en el palmarés (no se reinicia). `stageDay`, desde la 0049 (E2, §13.5, 13-g):
 * el número de la etapa que lo dio, la última en `gc`; `stageRun.ts` lo pasa siempre.
 */
export async function recordPalmares(
  tx: Tx,
  opts: {
    worldId: string
    riderId: string
    season: number
    raceId: string
    raceName: string
    kind: 'gc' | 'stage' | 'kom' | 'points'
    detail?: string
    gameDay: number
    stageDay?: number
  },
): Promise<void> {
  await tx.insert(palmares).values({
    worldId: opts.worldId,
    riderId: opts.riderId,
    season: opts.season,
    raceId: opts.raceId,
    raceName: opts.raceName,
    kind: opts.kind,
    detail: opts.detail ?? '',
    gameDay: opts.gameDay,
    stageDay: opts.stageDay ?? null,
  })
}

export interface RankingRow {
  riderId: string
  name: string
  country: string
  teamId: string | null
  teamName: string | null
  isBot: boolean
  points: number
}

/**
 * LA VENTANA DEL RANKING, en días de juego (docs/epics.md «G3»).
 *
 * El dueño lo definió con un ejemplo, y el ejemplo fija el número exacto: «si llegamos al GD 25, hay
 * que sumar los que consigan ese día y **restar los que consiguieron el GD 25 del año anterior**».
 * O sea que el mismo día del año pasado ya está FUERA, y la ventana son los `DAYS_PER_SEASON` días
 * que acaban hoy —364 en este juego—, no 365 naturales. Se escribe contra `DAYS_PER_SEASON` y no como
 * un 364 suelto para que siga significando «un año» si la temporada cambia de largo.
 */
export const RANKING_WINDOW_DAYS = DAYS_PER_SEASON

/**
 * EL ORDEN DE TODA LISTA DE CORREDORES POR PUNTOS: de más a menos y, a igualdad, por id. El desempate
 * no es adorno (E2, 8b): la resta del velo (R) reordena en memoria lo que la base ordenó, y las dos
 * tienen que dar el mismo orden cuando no hay nada que restar; sin él, dos corredores empatados podían
 * salir en otro orden antes y después de correrse una etapa velada y B1b lo vería. La comparación de
 * cadenas es la de las unidades de código, la misma que el `uuid` de Postgres para la forma canónica
 * en minúsculas (hexadecimal y guiones fijos), y no `localeCompare`.
 */
export function byPointsThenId(
  a: { readonly riderId: string; readonly points: number },
  b: { readonly riderId: string; readonly points: number },
): number {
  return b.points - a.points || compareIds(a.riderId, b.riderId)
}

/** El orden de dos ids, el de la base (ver `byPointsThenId`). */
export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * EL RECORTE DE 11-f (E2, docs/retransmision.md §11.5): los `limit` primeros a horizonte de una lista
 * con tope. `head` son las `limit + d` primeras filas del orden REAL (`compare` sobre los puntos de
 * verdad), con `d` el número de corredores con puntos velados (`VeilDelta.points.size`); `adjust` les
 * resta lo velado, se reordenan con el mismo `compare` y se corta. Es exacto: un corredor que en el
 * orden real queda por debajo del puesto `limit + d` tiene por delante al menos `limit + d` corredores,
 * de los que a lo sumo `d` pierden algo con la resta, y a él la resta solo puede quitarle; así que al
 * menos `limit` le siguen ganando. Ordenar en SQL con el valor real y restar después dejaría que el
 * orden delatara lo que la cifra esconde. Con el velo vacío, `d` es 0 y sale la lista de siempre.
 */
export function topAtHorizon<T>(
  head: readonly T[],
  adjust: (row: T) => T,
  compare: (a: T, b: T) => number,
  limit: number,
): T[] {
  return head.map(adjust).sort(compare).slice(0, limit)
}

/** Lo velado de la temporada de un corredor: lo que R resta de `riders.season_points`. */
export function seasonMinus(d: VeilDelta, riderId: string): number {
  return d.points.get(riderId)?.season ?? 0
}

/** Los puntos de la ventana de un corredor, para el total del día del ranking. */
interface RankedPoints {
  readonly riderId: string
  readonly points: number
}

/**
 * EL TOTAL DEL DÍA DEL RANKING (R, §11.5; decisión 11-s): los puntos de la ventana de cada corredor del
 * mundo que tiene alguno, ordenados (`byPointsThenId`), una vez por (mundo, día de juego) para todas las
 * peticiones, en una promesa que comparten las que llegan a la vez tras el tick y que se borra si
 * falla. Guarda solo los puntos, que solo escribe el tick (`addSeasonPointsBatch`, en la transacción que
 * sube el día): el nombre y el equipo de cada corredor se leen en cada petición, porque un fichaje
 * (`acceptOffer`) los cambia a mitad de día.
 */
const rankingTotal = new DayShared<readonly RankedPoints[]>()

function rankingTotalOf(
  db: Database,
  worldId: string,
  currentDay: number,
): Promise<readonly RankedPoints[]> {
  return rankingTotal.get(`${worldId}|${currentDay}`, async () => {
    // `rider_points` no lleva mundo: la unión con `riders` lo pone, y el índice por día acota la ventana.
    const rows = await db.execute(sql`
      select ${riderPoints.riderId} as rider_id, sum(${riderPoints.points})::int as total
      from ${riderPoints} inner join ${riders} on ${riders.id} = ${riderPoints.riderId}
      where ${riders.worldId} = ${worldId}
        and ${riderPoints.gameDay} > ${currentDay - RANKING_WINDOW_DAYS}
      group by ${riderPoints.riderId}`)
    return rows
      .map((r) => ({ riderId: String(r.rider_id), points: Number(r.total) }))
      .filter((r) => r.points > 0)
      .sort(byPointsThenId)
  })
}

/**
 * RANKING INDIVIDUAL A 365 DÍAS RODANTES (docs/epics.md «G3»).
 *
 * Hasta la v48 esto sumaba `riders.season_points`, un contador que el rollover pone a cero: el 1 de
 * enero del juego el ranking entero valía cero y un corredor que acababa de ganar el Tour aparecía
 * detrás de cualquiera que puntuase en una .2 en enero. El ranking real no funciona así y el dueño
 * lo dijo con todas las letras.
 *
 * Ahora suma las puntuaciones FECHADAS de la ventana (`rider_points`). `season_points` no se retira:
 * sigue siendo el de la temporada, que es lo que de verdad quieren los premios del año y el maillot
 * blanco.
 *
 * Un corredor sin puntuaciones en el último año sale con 0, no desaparece del mundo: si los que puntúan
 * no llenan el tope, lo completan los de cero, por id.
 *
 * R (E2, docs/retransmision.md §10.6 y §11.5; sup. W1; 8b): el total del día (`rankingTotalOf`, 11-s)
 * menos lo que `h` tiene velado, reordenado, con el recorte de 11-f. Con el velo vacío, el ranking del
 * mundo.
 */
export async function getRanking(
  db: Database,
  h: Horizon,
  worldId: string,
  currentDay: number,
  limit = 100,
): Promise<RankingRow[]> {
  const total = await rankingTotalOf(db, worldId, currentDay)
  const d = await veilDelta(db, h)
  const top = topAtHorizon(
    total.slice(0, limit + d.points.size),
    (r) => {
      const m = d.points.get(r.riderId)?.window ?? 0
      return m === 0 ? r : { riderId: r.riderId, points: r.points - m }
    },
    byPointsThenId,
    limit,
  ).filter((r) => r.points > 0)
  const zeros =
    top.length >= limit
      ? []
      : await db
          .select({ id: riders.id })
          .from(riders)
          .where(
            and(
              eq(riders.worldId, worldId),
              top.length === 0
                ? undefined
                : sql`${riders.id} <> all(${sql.param(top.map((r) => r.riderId))}::uuid[])`,
            ),
          )
          .orderBy(asc(riders.id))
          .limit(limit - top.length)
  const ids = [...top.map((r) => r.riderId), ...zeros.map((z) => z.id)]
  if (ids.length === 0) return []
  const points = new Map(top.map((r) => [r.riderId, r.points]))
  const rows = await db
    .select({
      riderId: riders.id,
      name: riders.name,
      country: riders.country,
      teamId: riders.teamId,
      teamName: teams.name,
      userId: riders.userId,
    })
    .from(riders)
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(sql`${riders.id} = any(${sql.param(ids)}::uuid[])`)
  const byId = new Map(rows.map((r) => [r.riderId, r]))
  return ids.flatMap((id) => {
    const r = byId.get(id)
    return r === undefined
      ? []
      : [
          {
            riderId: r.riderId,
            name: r.name,
            country: r.country,
            teamId: r.teamId,
            teamName: r.teamName,
            isBot: r.userId === null,
            points: points.get(id) ?? 0,
          },
        ]
  })
}

/**
 * Clasificación de jóvenes de la temporada (#59, "maillot blanco"): corredores en activo de 23 años
 * o menos, por puntos. `season` (0-indexed): joven ⇒ birthSeason ≥ season − 3. R (E2, §10.6; sup. W1;
 * 8b): los puntos de la temporada menos los velados, con el recorte de 11-f.
 */
export async function getYoungRiders(
  db: Database,
  h: Horizon,
  worldId: string,
  season: number,
  limit = 30,
): Promise<RankingRow[]> {
  const d = await veilDelta(db, h)
  const rows = await db
    .select({
      riderId: riders.id,
      name: riders.name,
      country: riders.country,
      teamId: riders.teamId,
      teamName: teams.name,
      userId: riders.userId,
      points: riders.seasonPoints,
    })
    .from(riders)
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(
      and(
        eq(riders.worldId, worldId),
        isNull(riders.retiredAt),
        gte(riders.birthSeason, season - 3),
      ),
    )
    .orderBy(desc(riders.seasonPoints), asc(riders.id))
    .limit(limit + d.points.size)
  return topAtHorizon(
    rows.map((r): RankingRow => ({
      riderId: r.riderId,
      name: r.name,
      country: r.country,
      teamId: r.teamId,
      teamName: r.teamName,
      isBot: r.userId === null,
      points: r.points,
    })),
    (r) => ({ ...r, points: r.points - seasonMinus(d, r.riderId) }),
    byPointsThenId,
    limit,
  )
}

export interface AwardWinner {
  riderId: string
  name: string
  country: string
  isBot: boolean
  archetype: string
  points: number
}

export interface SeasonAwards {
  /** Mejor de la temporada por puntos. */
  riderOfYear: AwardWinner | null
  /** Mejor esprínter (vocación velocidad). */
  bestSprinter: AwardWinner | null
  /** Mejor escalador (vocación escalada). */
  bestClimber: AwardWinner | null
  /** Revelación: mejor joven (≤23 años). */
  revelation: AwardWinner | null
}

/**
 * Corredor en activo con más puntos de temporada que cumpla el filtro extra (o null). R (E2, §10.6;
 * sup. W2; 8b): los puntos menos los velados de `d`, con el recorte de 11-f (pide `1 + d` filas).
 */
async function topRider(
  db: Database,
  d: VeilDelta,
  worldId: string,
  extra?: SQL,
): Promise<AwardWinner | null> {
  const where = extra
    ? and(eq(riders.worldId, worldId), isNull(riders.retiredAt), extra)
    : and(eq(riders.worldId, worldId), isNull(riders.retiredAt))
  const rows = await db
    .select({
      riderId: riders.id,
      name: riders.name,
      country: riders.country,
      userId: riders.userId,
      archetype: riders.archetype,
      points: riders.seasonPoints,
      fame: riders.fame,
    })
    .from(riders)
    .where(where)
    .orderBy(desc(riders.seasonPoints), desc(riders.fame), asc(riders.id))
    .limit(1 + d.points.size)
  const [r] = topAtHorizon(
    rows,
    (x) => ({ ...x, points: x.points - seasonMinus(d, x.riderId) }),
    (a, b) => b.points - a.points || b.fame - a.fame || compareIds(a.riderId, b.riderId),
    1,
  )
  if (!r || r.points <= 0) return null
  return {
    riderId: r.riderId,
    name: r.name,
    country: r.country,
    isBot: r.userId === null,
    archetype: r.archetype,
    points: r.points,
  }
}

/**
 * Premios de la temporada (#60): líderes actuales de cada categoría por puntos. `season` (0-indexed)
 * define quién es joven para la revelación (≤23 años ⇒ birthSeason ≥ season − 3). R (E2, §10.6; sup.
 * W2; 8b): sobre los puntos a horizonte.
 */
export async function getSeasonAwards(
  db: Database,
  h: Horizon,
  worldId: string,
  season: number,
): Promise<SeasonAwards> {
  const d = await veilDelta(db, h)
  const [riderOfYear, bestSprinter, bestClimber, revelation] = await Promise.all([
    topRider(db, d, worldId),
    topRider(db, d, worldId, eq(riders.archetype, 'velocidad')),
    topRider(db, d, worldId, eq(riders.archetype, 'escalada')),
    topRider(db, d, worldId, gte(riders.birthSeason, season - 3)),
  ])
  return { riderOfYear, bestSprinter, bestClimber, revelation }
}

export interface PalmaresRow {
  season: number
  raceId: string
  raceName: string
  kind: string
  detail: string
  /** En una victoria de etapa, su salida y su llegada; `null` en lo demás. */
  from: string | null
  to: string | null
}

/**
 * La salida y la llegada de la etapa que cita una fila del palmarés: solo las victorias de etapa, cuyo
 * `detail` es «Stage N» (`stageRun.ts`). Se calcula al LEER, no se guarda: así la tienen también las
 * filas escritas antes de que las etapas tuvieran ciudades.
 */
export function palmaresCities(row: {
  season: number
  raceId: string
  kind: string
  detail: string
}): { from: string | null; to: string | null } {
  const m = row.kind === 'stage' ? /^Stage (\d+)$/.exec(row.detail) : null
  const c = m ? stageCities(row.raceId, row.season, Number(m[1])) : null
  return { from: c?.from ?? null, to: c?.to ?? null }
}

/**
 * Palmarés de un corredor, lo más reciente primero. F (E2, §10.6; sup. P3): sin las filas de las
 * etapas que `h` tiene en el velo. Sin aviso por fila: el aviso común de §11.6 depende solo del
 * horizonte, y lo pinta la web (9b).
 */
export async function getPalmares(
  db: Database,
  h: Horizon,
  riderId: string,
): Promise<PalmaresRow[]> {
  const rows = await db
    .select({
      season: palmares.season,
      raceId: palmares.raceId,
      raceName: palmares.raceName,
      kind: palmares.kind,
      detail: palmares.detail,
    })
    .from(palmares)
    .where(and(eq(palmares.riderId, riderId), not(palmaresVeil(h))))
    .orderBy(desc(palmares.season), desc(palmares.gameDay))
  return rows.map((r) => ({ ...r, ...palmaresCities(r) }))
}

export interface Badge {
  id: string
  label: string
  icon: string
  desc: string
}

/**
 * R SOBRE EL PALMARÉS (E2, §10.6; sups. P2 y W4; 8b): fuera las filas de `VeilDelta.palmares` ANTES de
 * contar, que es restarlas del total y reordenar sin el recorte de 11-f: la base cuenta y ordena ya sin
 * ellas. Con el velo vacío, ninguna condición.
 */
function notVeiledPalmares(d: VeilDelta): SQL | undefined {
  return d.palmares.size === 0
    ? undefined
    : sql`${palmares.id} <> all(${sql.param([...d.palmares])}::uuid[])`
}

/**
 * Logros de un corredor (#95), derivados de su palmarés permanente. Se devuelven solo los
 * conseguidos; cada uno tiene su umbral. Sin estado nuevo: se calculan al vuelo. R (E2, §10.6; sup.
 * P2; 8b): sobre el palmarés que `h` puede ver.
 */
export async function getRiderBadges(db: Database, h: Horizon, riderId: string): Promise<Badge[]> {
  const d = await veilDelta(db, h)
  const rows = await db
    .select({
      gc: sql<number>`count(*) filter (where ${palmares.kind} = 'gc')::int`,
      stage: sql<number>`count(*) filter (where ${palmares.kind} = 'stage')::int`,
      kom: sql<number>`count(*) filter (where ${palmares.kind} = 'kom')::int`,
      points: sql<number>`count(*) filter (where ${palmares.kind} = 'points')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(palmares)
    .where(and(eq(palmares.riderId, riderId), notVeiledPalmares(d)))
  const c = rows[0] ?? { gc: 0, stage: 0, kom: 0, points: 0, total: 0 }

  const defs: { when: boolean; badge: Badge }[] = [
    {
      when: c.total >= 1,
      badge: {
        id: 'first_win',
        label: 'First win',
        icon: '🎉',
        desc: 'Won your first race honour.',
      },
    },
    {
      when: c.stage >= 10,
      badge: { id: 'stage_hunter', label: 'Stage hunter', icon: '🏁', desc: '10+ stage wins.' },
    },
    {
      when: c.gc >= 1,
      badge: {
        id: 'overall_winner',
        label: 'Overall winner',
        icon: '🏆',
        desc: 'Won a race overall.',
      },
    },
    {
      when: c.gc >= 5,
      badge: {
        id: 'grand_champion',
        label: 'Grand champion',
        icon: '👑',
        desc: '5+ overall wins.',
      },
    },
    {
      when: c.kom >= 5,
      badge: {
        id: 'king_mountains',
        label: 'King of the Mountains',
        icon: '⛰️',
        desc: '5+ mountains classifications.',
      },
    },
    {
      when: c.points >= 5,
      badge: {
        id: 'points_machine',
        label: 'Points machine',
        icon: '🟢',
        desc: '5+ points classifications.',
      },
    },
    {
      when: c.total >= 25,
      badge: { id: 'prolific', label: 'Prolific', icon: '⭐', desc: '25+ career honours.' },
    },
    {
      when: c.total >= 50,
      badge: { id: 'legend', label: 'Legend', icon: '🐐', desc: '50+ career honours.' },
    },
  ]
  return defs.filter((d) => d.when).map((d) => d.badge)
}

export interface HallOfFameRow {
  riderId: string
  name: string
  country: string
  isBot: boolean
  gc: number
  stage: number
  kom: number
  points: number
  total: number
}

/**
 * Salón de la fama (#58): corredores por palmarés total de todas las temporadas, con desglose, y a
 * igualdad por id. R (E2, §10.6; sup. W4; 8b): sin las filas veladas de `h`.
 */
export async function getHallOfFame(
  db: Database,
  h: Horizon,
  worldId: string,
  limit = 30,
): Promise<HallOfFameRow[]> {
  const d = await veilDelta(db, h)
  return db
    .select({
      riderId: palmares.riderId,
      name: riders.name,
      country: riders.country,
      isBot: sql<boolean>`${riders.userId} is null`,
      gc: sql<number>`count(*) filter (where ${palmares.kind} = 'gc')::int`,
      stage: sql<number>`count(*) filter (where ${palmares.kind} = 'stage')::int`,
      kom: sql<number>`count(*) filter (where ${palmares.kind} = 'kom')::int`,
      points: sql<number>`count(*) filter (where ${palmares.kind} = 'points')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(palmares)
    .innerJoin(riders, eq(riders.id, palmares.riderId))
    .where(and(eq(palmares.worldId, worldId), notVeiledPalmares(d)))
    .groupBy(palmares.riderId, riders.name, riders.country, riders.userId)
    .orderBy(desc(sql`count(*)`), asc(palmares.riderId))
    .limit(limit)
}

export interface RecordEntry {
  riderId: string
  name: string
  country: string
  isBot: boolean
  value: number
  note: string
}

export interface AllTimeRecords {
  /** Más victorias en el palmarés (cualquier tipo). */
  mostWins: RecordEntry | null
  /** Más victorias de general (grandes citas). */
  mostGcWins: RecordEntry | null
  /** Ganador de general más joven de la historia del mundo. */
  youngestWinner: RecordEntry | null
}

/**
 * Récords de todos los tiempos del mundo (#62), derivados del palmarés permanente; a igualdad, el de
 * menor id (y en el más joven, el de la temporada y el día más tempranos). R (E2, §10.6; sup. W4; 8b):
 * sin las filas veladas de `h`.
 */
export async function getAllTimeRecords(
  db: Database,
  h: Horizon,
  worldId: string,
): Promise<AllTimeRecords> {
  const d = await veilDelta(db, h)
  const mostWinsRows = await db
    .select({
      riderId: palmares.riderId,
      name: riders.name,
      country: riders.country,
      userId: riders.userId,
      value: sql<number>`count(*)::int`,
    })
    .from(palmares)
    .innerJoin(riders, eq(riders.id, palmares.riderId))
    .where(and(eq(palmares.worldId, worldId), notVeiledPalmares(d)))
    .groupBy(palmares.riderId, riders.name, riders.country, riders.userId)
    .orderBy(desc(sql`count(*)`), asc(palmares.riderId))
    .limit(1)

  const mostGcRows = await db
    .select({
      riderId: palmares.riderId,
      name: riders.name,
      country: riders.country,
      userId: riders.userId,
      value: sql<number>`count(*)::int`,
    })
    .from(palmares)
    .innerJoin(riders, eq(riders.id, palmares.riderId))
    .where(and(eq(palmares.worldId, worldId), eq(palmares.kind, 'gc'), notVeiledPalmares(d)))
    .groupBy(palmares.riderId, riders.name, riders.country, riders.userId)
    .orderBy(desc(sql`count(*)`), asc(palmares.riderId))
    .limit(1)

  const youngRows = await db
    .select({
      riderId: palmares.riderId,
      name: riders.name,
      country: riders.country,
      userId: riders.userId,
      age: sql<number>`(20 - ${riders.birthSeason} + ${palmares.season})`,
      raceName: palmares.raceName,
      season: palmares.season,
    })
    .from(palmares)
    .innerJoin(riders, eq(riders.id, palmares.riderId))
    .where(and(eq(palmares.worldId, worldId), eq(palmares.kind, 'gc'), notVeiledPalmares(d)))
    .orderBy(
      asc(sql`(20 - ${riders.birthSeason} + ${palmares.season})`),
      asc(palmares.season),
      asc(palmares.gameDay),
      asc(palmares.riderId),
    )
    .limit(1)

  const entry = (
    r: { riderId: string; name: string; country: string; userId: string | null },
    value: number,
    note: string,
  ): RecordEntry => ({
    riderId: r.riderId,
    name: r.name,
    country: r.country,
    isBot: r.userId === null,
    value,
    note,
  })

  const mw = mostWinsRows[0]
  const gc = mostGcRows[0]
  const yw = youngRows[0]
  return {
    mostWins: mw ? entry(mw, mw.value, 'career wins') : null,
    mostGcWins: gc ? entry(gc, gc.value, 'overall wins') : null,
    youngestWinner: yw ? entry(yw, yw.age, `${yw.raceName}, season ${yw.season + 1}`) : null,
  }
}

/**
 * Ganadores de la general por carrera en una temporada: raceId -> nombre (SPEC, Paso 44). P (E2,
 * §10.6; sups. I1 a I4): el ganador solo sale si la última etapa de su carrera no está en el velo de
 * `h`, y la fila del índice de carreras se queda sin ganador hasta que el espectador la conozca.
 */
export async function getSeasonWinners(
  db: Database,
  h: Horizon,
  worldId: string,
  season: number,
): Promise<Record<string, string>> {
  const rows = await db
    .select({ raceId: palmares.raceId, name: riders.name })
    .from(palmares)
    .innerJoin(riders, eq(riders.id, palmares.riderId))
    .where(
      and(
        eq(palmares.worldId, worldId),
        eq(palmares.season, season),
        eq(palmares.kind, 'gc'),
        not(palmaresVeil(h)),
      ),
    )
  const out: Record<string, string> = {}
  for (const r of rows) out[r.raceId] = r.name
  return out
}

export interface RaceHonour {
  season: number
  raceName: string
  winnerId: string
  winnerName: string
  winnerCountry: string
}

/**
 * Historial de ganadores de la general de una carrera, temporada a temporada (SPEC, Paso 40). F (E2,
 * §10.6; sup. C5): la edición cuyo final está en el velo de `h` no sale.
 */
export async function getRaceHistory(
  db: Database,
  h: Horizon,
  worldId: string,
  raceId: string,
): Promise<RaceHonour[]> {
  return db
    .select({
      season: palmares.season,
      raceName: palmares.raceName,
      winnerId: palmares.riderId,
      winnerName: riders.name,
      winnerCountry: riders.country,
    })
    .from(palmares)
    .innerJoin(riders, eq(riders.id, palmares.riderId))
    .where(
      and(
        eq(palmares.worldId, worldId),
        eq(palmares.raceId, raceId),
        eq(palmares.kind, 'gc'),
        not(palmaresVeil(h)),
      ),
    )
    .orderBy(desc(palmares.season))
}
