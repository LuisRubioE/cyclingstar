import { SEASON_CALENDAR, stageCities } from '@cyclingstar/engine'
import {
  COUNTRIES,
  type NameResolver,
  type NewsPayload,
  TEMPLATE_REV,
  newsPayloadSchema,
  parseRaceKey,
  renderNews,
  stageRouteText,
} from '@cyclingstar/shared'
import { and, asc, desc, eq, inArray, notInArray, or, type SQL, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { news, riders, teams } from './schema.js'
import type { Queryable } from './titles.js'

/**
 * Feed de noticias (SPEC, Paso 39), con DATOS desde la migración 0046 (docs/retransmision.md §12.8 y
 * §13.2, D-45; E2, paso 1a). Una noticia se guarda como lo que pasó —`NewsPayload`: ids, códigos y
 * números, nunca nombres ni inglés— con su semilla, la carrera y la etapa de las que sale y la
 * revisión de las plantillas; el titular se redacta al LEER con `renderNews` (`@cyclingstar/shared`)
 * y los nombres de ese momento. Las filas de antes de la 0046 solo tienen el `text` que se redactó al
 * escribirlas, y así se siguen leyendo.
 *
 * `text` se sigue escribiendo, ya redactado, de COMPATIBILIDAD (DD-19, §12.8): la web que está cargada
 * valida `text: z.string()` y se rompería si llegara null. Se deja de escribir y de mandar una versión
 * de la web después del reinicio, cuando todas lo lean `.nullish()`.
 */

/**
 * Quien escribe la noticia. Casi siempre es la transacción del tick, pero la retirada voluntaria de
 * §V.5 la dispara el jugador desde la API y no vive dentro de ninguna transacción: las dos valen.
 */
type NewsWriter = Queryable

/** Los dos titulares que cuentan quién pasa a liderar, que solo se sirven con `leaderNews` (17-x). */
const LEADER_KINDS = ['gc_lead_taken', 'jersey_taken'] as const

/**
 * Guarda una noticia. `riderId` es el PROTAGONISTA (siempre que lo haya): permite pintar su bandera,
 * enlazarlo y resaltar en tu feed las noticias sobre TU corredor. `personal` marca las que van
 * dirigidas al jugador (mensajes suyos); una victoria/fichaje/lesión es un titular GLOBAL aunque lleve
 * protagonista, así que se ve en el feed de todos.
 *
 * `seed` es la que ya calculaba quien llama (la columna Semilla de la tabla de §12.8); `payload`, los
 * datos, cuyo `kind` es el de la fila; `raceKey`, la `spec.raceKey` de quien llama, sin rehacerla, y
 * null en `contract` y `retirement`. La etapa sale del payload.
 */
export async function emitNews(
  tx: NewsWriter,
  opts: {
    worldId: string
    gameDay: number
    seed: string
    payload: NewsPayload
    raceKey?: string | null
    riderId?: string | null
    personal?: boolean
  },
): Promise<void> {
  const p = opts.payload
  // El texto de compatibilidad, hasta DD-19: el mismo render que hace la lectura, con los nombres de hoy.
  const text = renderNews('en', p, opts.seed, TEMPLATE_REV, await newsNames(tx, [p]))
  await tx.insert(news).values({
    worldId: opts.worldId,
    gameDay: opts.gameDay,
    scope: opts.personal ? 'personal' : 'global',
    riderId: opts.riderId ?? null,
    kind: p.kind,
    text,
    seed: opts.seed,
    data: p,
    raceKey: opts.raceKey ?? null,
    stageDay: 'stageDay' in p ? p.stageDay : null,
    tplRev: TEMPLATE_REV,
  })
}

/** Los nombres de las carreras, por id: son los del calendario, iguales en todas las temporadas. */
const RACE_NAMES: ReadonlyMap<string, string> = new Map(SEASON_CALENDAR.map((r) => [r.id, r.name]))

/** Un uuid: lo que se puede preguntar a `riders.id` y `teams.id` sin que Postgres rechace la consulta. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * EL RESOLUTOR DE UNA PÁGINA DE NOTICIAS (§12.8): los nombres que piden sus titulares, en dos
 * consultas (corredores y equipos), y lo demás sin base: las carreras por el calendario, los países
 * por `COUNTRIES` (como hacía `contracts.ts` al redactar el fichaje) y el «de dónde a dónde» de cada
 * etapa con `stageCities`, que es lo que leen las demás pantallas de historia. Lo que no se encuentra
 * no rompe el titular: un corredor que ya no está es «A rider», como decía el tick; un equipo, «a
 * team»; una carrera fuera del calendario, su id; una etapa sin ciudades, sin ruta.
 */
export async function newsNames(
  q: Queryable,
  payloads: readonly NewsPayload[],
): Promise<NameResolver> {
  const riderIds = new Set<string>()
  const teamIds = new Set<string>()
  for (const p of payloads) {
    if (UUID.test(p.riderId)) riderIds.add(p.riderId)
    if (p.kind === 'contract' && UUID.test(p.toTeamId)) teamIds.add(p.toTeamId)
  }
  const riderRows =
    riderIds.size === 0
      ? []
      : await q
          .select({ id: riders.id, name: riders.name })
          .from(riders)
          .where(inArray(riders.id, [...riderIds]))
  const teamRows =
    teamIds.size === 0
      ? []
      : await q
          .select({ id: teams.id, name: teams.name })
          .from(teams)
          .where(inArray(teams.id, [...teamIds]))
  const riderName = new Map(riderRows.map((r) => [r.id, r.name]))
  const teamName = new Map(teamRows.map((r) => [r.id, r.name]))
  return {
    rider: (id) => riderName.get(id) ?? 'A rider',
    team: (id) => teamName.get(id) ?? 'a team',
    race: (raceId) => RACE_NAMES.get(raceId) ?? raceId,
    country: (iso2) => COUNTRIES.find((c) => c.code === iso2)?.name ?? iso2,
    route: (raceId, season, stageDay) => {
      const c = stageCities(raceId, season, stageDay)
      return c ? stageRouteText(c.from, c.to) : null
    },
  }
}

export interface NewsItem {
  gameDay: number
  kind: string
  /** El titular: redactado al leer desde `payload`, o el que se guardó si la fila es de antes de la 0046. */
  text: string
  /** Va sobre el corredor del jugador (o es un mensaje suyo): se resalta en su feed. */
  personal: boolean
  /** Protagonista, para pintar su bandera y enlazarlo (null si el titular no tiene corredor). */
  riderId: string | null
  riderName: string | null
  country: string | null
  /** Equipo ACTUAL del protagonista: es lo que permite filtrar el feed por equipo (§3.5). */
  teamId: string | null
  teamName: string | null
  /** Los datos del titular (news.data) si validan; null en las filas viejas y en las que no validan. */
  payload: NewsPayload | null
  seed: string | null
  tplRev: number | null
  /** La carrera del titular, sacada de su clave: con ella enlaza la web, sin adivinarla del texto. */
  raceId: string | null
  raceKey: string | null
  stageDay: number | null
}

/** Qué más puede pedir una lectura del feed. */
export interface NewsReadOptions {
  /**
   * Devolver también `gc_lead_taken` y `jersey_taken` (decisión 17-x). Se escriben desde el 1a, pero
   * cuentan quién pasa a liderar y el feed no puede destripar: ninguna ruta los pide hasta el 8a, que
   * los da a quien le aplica el velo, con el filtro F como a los demás.
   */
  leaderNews?: boolean
}

/** Las columnas que lee el feed de la propia noticia y de su protagonista. */
const NEWS_COLUMNS = {
  gameDay: news.gameDay,
  kind: news.kind,
  text: news.text,
  seed: news.seed,
  data: news.data,
  tplRev: news.tplRev,
  raceKey: news.raceKey,
  stageDay: news.stageDay,
  riderId: news.riderId,
  riderName: riders.name,
  country: riders.country,
  teamId: riders.teamId,
  teamName: teams.name,
}

/**
 * EL ORDEN DE UN DÍA (§12.8, decisión 12-i): por carrera, de la última etapa a la primera y, dentro
 * de una etapa, por lo que importa: la general final, quién pasa a mandar, la etapa, la montaña final,
 * quién se va, quién se hace daño, y lo de fuera de carrera al final. El `id` deja el orden fijo
 * entre dos del mismo kind; hasta la 0046 todo un día compartía `created_at` y el orden era el que
 * devolviera Postgres.
 */
const NEWS_ORDER: SQL[] = [
  desc(news.gameDay),
  sql`${news.raceKey} asc nulls last`,
  sql`${news.stageDay} desc nulls last`,
  sql`case ${news.kind} when 'gc_win' then 1 when 'gc_lead_taken' then 2 when 'jersey_taken' then 2
    when 'stage_win' then 3 when 'tt_win' then 3 when 'breakaway_win' then 3 when 'one_day_win' then 3
    when 'one_day_tt_win' then 3 when 'kom' then 4 when 'abandon' then 5 when 'injury' then 6
    when 'contract' then 7 when 'retirement' then 8 else 9 end`,
  asc(news.id),
]

/** Sin `leaderNews`, fuera los dos titulares de líder (17-x); con él, nada. */
function leaderFilter(opts: NewsReadOptions): SQL | undefined {
  return opts.leaderNews ? undefined : notInArray(news.kind, [...LEADER_KINDS])
}

/** Una fila del feed tal como sale de la consulta, con `personal` ya decidido. */
interface NewsRow {
  gameDay: number
  kind: string
  text: string | null
  seed: string | null
  /** news.data: se valida con `newsPayloadSchema` antes de usarlo, que es lo que entra por el borde. */
  data: unknown
  tplRev: number | null
  raceKey: string | null
  stageDay: number | null
  riderId: string | null
  riderName: string | null
  country: string | null
  teamId: string | null
  teamName: string | null
  personal: boolean
}

/**
 * LAS FILAS, REDACTADAS AL LEER (§12.8). Con `data` válido, el titular sale de `renderNews` con la
 * semilla y la revisión de la fila y los nombres de ahora, que se cargan una vez para la página; sin
 * él, el `text` guardado, que es una fila de antes de la 0046 (o una que no valida); y una fila que no
 * se puede pintar de ninguna de las dos maneras no se devuelve.
 */
async function redacta(q: Queryable, rows: readonly NewsRow[]): Promise<NewsItem[]> {
  const parsed = rows.map((r) => {
    if (r.data === null || r.seed === null) return null
    const p = newsPayloadSchema.safeParse(r.data)
    return p.success ? p.data : null
  })
  const names = await newsNames(
    q,
    parsed.filter((p): p is NewsPayload => p !== null),
  )
  const out: NewsItem[] = []
  for (const [i, r] of rows.entries()) {
    const payload = parsed[i] ?? null
    const text =
      payload !== null && r.seed !== null
        ? renderNews('en', payload, r.seed, r.tplRev ?? 0, names)
        : r.text
    if (text === null) continue
    out.push({
      gameDay: r.gameDay,
      kind: r.kind,
      text,
      personal: r.personal,
      riderId: r.riderId,
      riderName: r.riderName,
      country: r.country,
      teamId: r.teamId,
      teamName: r.teamName,
      payload,
      seed: r.seed,
      tplRev: r.tplRev,
      raceId: r.raceKey === null ? null : parseRaceKey(r.raceKey).raceId,
      raceKey: r.raceKey,
      stageDay: r.stageDay,
    })
  }
  return out
}

/** Feed global del mundo, lo más reciente primero. */
export async function getGlobalNews(
  db: Database,
  worldId: string,
  limit = 40,
  opts: NewsReadOptions = {},
): Promise<NewsItem[]> {
  const rows = await db
    .select(NEWS_COLUMNS)
    .from(news)
    .leftJoin(riders, eq(riders.id, news.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(news.worldId, worldId), leaderFilter(opts)))
    .orderBy(...NEWS_ORDER)
    .limit(limit)
  return redacta(
    db,
    rows.map((r) => ({ ...r, personal: false })),
  )
}

/**
 * LAS NOTICIAS DE UNA ETAPA (E2, docs/retransmision.md §4.11): las que lleva el paquete de meta de la
 * retransmisión (`BroadcastFinish.news`), que se sirve cuando el espectador llega a la meta. Las de esa
 * carrera y esa etapa (`news.race_key` y `news.stage_day`, 0046), en el orden del feed y sin los dos
 * titulares de líder salvo que se pidan (17-x).
 */
export async function getStageNews(
  db: Database,
  worldId: string,
  raceKey: string,
  stageDay: number,
  opts: NewsReadOptions = {},
): Promise<NewsItem[]> {
  const rows = await db
    .select(NEWS_COLUMNS)
    .from(news)
    .leftJoin(riders, eq(riders.id, news.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(
      and(
        eq(news.worldId, worldId),
        eq(news.raceKey, raceKey),
        eq(news.stageDay, stageDay),
        leaderFilter(opts),
      ),
    )
    .orderBy(...NEWS_ORDER)
  return redacta(
    db,
    rows.map((r) => ({ ...r, personal: false })),
  )
}

/**
 * Noticias de un equipo (#16): titulares cuyo protagonista corre hoy en el equipo (victorias de
 * etapa, generales, fugas de sus corredores…). Sin columna nueva: se deriva del enlace corredor.
 */
export async function getTeamNews(
  db: Database,
  teamId: string,
  limit = 15,
  opts: NewsReadOptions = {},
): Promise<NewsItem[]> {
  const rows = await db
    .select(NEWS_COLUMNS)
    .from(news)
    .innerJoin(riders, eq(riders.id, news.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(riders.teamId, teamId), leaderFilter(opts)))
    .orderBy(...NEWS_ORDER)
    .limit(limit)
  return redacta(
    db,
    rows.map((r) => ({ ...r, personal: false })),
  )
}

/** Feed personal de un corredor: las globales del mundo más las que van sobre él (resaltadas). */
export async function getRiderNews(
  db: Database,
  worldId: string,
  riderId: string,
  limit = 40,
  opts: NewsReadOptions = {},
): Promise<NewsItem[]> {
  const rows = await db
    .select({ ...NEWS_COLUMNS, scope: news.scope })
    .from(news)
    .leftJoin(riders, eq(riders.id, news.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(
      and(
        eq(news.worldId, worldId),
        or(eq(news.riderId, riderId), eq(news.scope, 'global')),
        leaderFilter(opts),
      ),
    )
    .orderBy(...NEWS_ORDER)
    .limit(limit)
  return redacta(
    db,
    rows.map(({ scope, ...r }) => ({
      ...r,
      personal: r.riderId === riderId || scope === 'personal',
    })),
  )
}
