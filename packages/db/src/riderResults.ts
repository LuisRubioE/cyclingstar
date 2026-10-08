import { SEASON_CALENDAR, stageCities } from '@cyclingstar/engine'
import { and, eq, inArray, not, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { gcOrderBy } from './gcSort.js'
import { type Horizon, throughStage, veilSql } from './horizon.js'
import { getRaceGc } from './results.js'
import { raceGc, raceRosters, stageResults } from './schema.js'

/**
 * Los resultados de un corredor, AGRUPADOS POR CARRERA (docs/navegacion.md §3.6).
 *
 * En una carrera por etapas el resultado del corredor ES la general; las etapas son el desglose.
 * Antes esta lectura devolvía una fila por etapa y la general no aparecía por ningún lado: un 3.º
 * en la general de una gran vuelta era invisible en la ficha, porque el palmarés solo registra la
 * general si se GANA. Aquí la general va siempre, se gane o no.
 *
 * De dónde sale el puesto de la general: de `race_gc`, la tabla que el tick acumula etapa a etapa y
 * que NO se borra nunca (su clave lleva la temporada: `${raceId}:s${season}`), así que sirve igual
 * para lo de hoy y para el histórico. No se añade persistencia nueva, y el puesto que ve el jugador
 * en su ficha es EL MISMO que ve en la clasificación de la carrera: misma tabla y mismo desempate
 * (`gcSort.ts`), con los abandonos al final. Recalcularlo desde `stage_results` (`getGcThroughStage`)
 * daría un orden que podría no coincidir con el de la página de carrera, y además cuenta como
 * clasificado a quien abandonó (menos etapas = menos tiempo = falso líder).
 *
 * BAJO EL VELO (E2, docs/retransmision.md §10.6 y §11.6; sups. P4 y H7; paso 8a), F y P: las etapas
 * que `h` tiene en el velo no salen, la general de una carrera con etapas veladas es la de tras la
 * última que deja ver (la de la ficha de carrera, `getRaceGc` con el mismo horizonte), y cada carrera
 * en guardia con etapas veladas lleva su cuenta, `stagesToWatch`, para TODOS los de su lista de
 * salida, abandonaran o no: la fila «Race France · 3 stages to watch» depende solo del horizonte y de
 * la lista de salida, que es pública y se congela antes de salir.
 */

/** Puesto del corredor en una etapa concreta. */
export interface RiderStagePlacing {
  stageDay: number
  puesto: number
  /** Salida y llegada de la etapa en SU temporada (`stageCities`): el historial también la sitúa. */
  from: string | null
  to: string | null
}

/** El paso del corredor por una carrera: su general y, debajo, sus etapas. */
export interface RiderRaceResult {
  /** Identificador de la carrera SIN temporada, listo para la URL. */
  raceId: string
  raceName: string
  raceClass: string
  season: number
  /** Etapas que tiene la carrera (1 en una de un día). */
  stageCount: number
  isOneDay: boolean
  /**
   * Puesto en la general al día de hoy (en una carrera de un día, el puesto de su única etapa).
   * Null si no hay general calculada para el corredor.
   */
  gcPuesto: number | null
  /** Abandonó: ya no está clasificado en la general. */
  dnf: boolean
  /** La carrera ya se corrió entera (se han disputado todas sus etapas). */
  finished: boolean
  /** Etapas ya corridas por el corredor, de la primera a la última. */
  stages: RiderStagePlacing[]
  /**
   * Las etapas de esta carrera que el espectador tiene en el velo (E2, §11.6, punto 2): la fila
   * «Race France · 3 stages to watch». Solo en las carreras con etapas veladas.
   */
  stagesToWatch?: number
}

/** Fila cruda de `stage_results` del corredor (la clave de carrera lleva la temporada pegada). */
export interface RiderStageRow {
  raceId: string
  stageDay: number
  puesto: number
}

/** Lo que aporta `race_gc` sobre una carrera: dónde va el corredor y si abandonó. */
export interface RiderGcStanding {
  puesto: number
  dnf: boolean
}

/**
 * Agrupa las etapas del corredor por carrera y les cuelga la general. Función PURA: recibe ya
 * resueltas las tres lecturas (etapas del corredor, su puesto de general por carrera y la última
 * etapa disputada de cada carrera) para poder probarse sin base de datos.
 *
 * Ordena de lo más reciente a lo más antiguo por temporada y día de salida, y devuelve como mucho
 * `limit` carreras.
 */
export function buildRiderRaceResults(
  stageRows: readonly RiderStageRow[],
  gcByRace: ReadonlyMap<string, RiderGcStanding>,
  lastStageRunByRace: ReadonlyMap<string, number>,
  limit: number,
  /** raceKey → etapas en el velo del espectador, de las carreras en cuya lista de salida está (E2, §11.6). */
  toWatchByRace: ReadonlyMap<string, number> = new Map(),
): RiderRaceResult[] {
  const byRace = new Map<string, { sortKey: number; result: RiderRaceResult }>()
  // Una carrera con etapas por ver entra aunque el corredor no tenga ninguna conocida (§11.6).
  const rows: readonly (RiderStageRow | { readonly raceId: string; readonly stageDay: null })[] = [
    ...[...toWatchByRace.keys()].map((raceId) => ({ raceId, stageDay: null })),
    ...stageRows,
  ]
  for (const row of rows) {
    const m = /^(.*):s(\d+)$/.exec(row.raceId)
    if (!m) continue // una clave sin temporada no es del calendario
    const baseId = m[1]!
    const season = Number(m[2])
    const race = SEASON_CALENDAR.find((rc) => rc.id === baseId)
    if (!race) continue
    let entry = byRace.get(row.raceId)
    if (!entry) {
      const standing = gcByRace.get(row.raceId) ?? null
      const lastRun = lastStageRunByRace.get(row.raceId) ?? 0
      entry = {
        // Orden de recencia: primero la temporada, luego el día de salida de la carrera.
        sortKey: season * 1_000_000 + race.startDay,
        result: {
          raceId: baseId,
          raceName: race.name,
          raceClass: race.raceClass,
          season,
          stageCount: race.stages.length,
          isOneDay: race.stages.length === 1,
          gcPuesto: standing?.puesto ?? null,
          dnf: standing?.dnf ?? false,
          finished: lastRun >= race.stages.length,
          stages: [],
        },
      }
      const toWatch = toWatchByRace.get(row.raceId)
      if (toWatch !== undefined) entry.result.stagesToWatch = toWatch
      byRace.set(row.raceId, entry)
    }
    if (row.stageDay === null) continue
    const ciudades = stageCities(baseId, season, row.stageDay)
    entry.result.stages.push({
      stageDay: row.stageDay,
      puesto: row.puesto,
      from: ciudades?.from ?? null,
      to: ciudades?.to ?? null,
    })
  }

  const out = [...byRace.values()].sort((a, b) => b.sortKey - a.sortKey).slice(0, limit)
  for (const { result } of out) {
    result.stages.sort((a, b) => a.stageDay - b.stageDay)
    // En una carrera de un día la etapa ES la general: el puesto de la ficha es el de esa etapa,
    // sin depender de que `race_gc` tenga fila (y sin poder contradecirla).
    if (result.isOneDay) result.gcPuesto = result.stages[0]?.puesto ?? result.gcPuesto
  }
  return out.map((o) => o.result)
}

/**
 * Puesto del corredor en la general de cada una de esas carreras, con el MISMO orden que la página
 * de carrera: los que abandonaron al final y, entre los clasificados, el desempate de `gcSort.ts`.
 */
export async function getRiderGcStandings(
  db: Database,
  h: Horizon,
  riderId: string,
  raceKeys: readonly string[],
): Promise<Map<string, RiderGcStanding>> {
  if (raceKeys.length === 0) return new Map()
  // P (E2, §10.6): la de una carrera con etapas en el velo es la de su ficha, tras la última que `h`
  // deja ver: su puesto en `getRaceGc` con el mismo horizonte. El resto, como siempre.
  const cortadas = raceKeys.filter((k) => h.veil.some((v) => v.raceKey === k))
  const out = new Map<string, RiderGcStanding>()
  for (const raceKey of cortadas) {
    const gc = await getRaceGc(db, h, raceKey)
    const i = gc.findIndex((r) => r.riderId === riderId)
    if (i >= 0) out.set(raceKey, { puesto: i + 1, dnf: gc[i]!.dnf })
  }
  const enteras = raceKeys.filter((k) => !cortadas.includes(k))
  if (enteras.length === 0) return out
  // Se numera la general entera de cada carrera (una sola pasada con `row_number`) y después se
  // busca la fila del corredor: su puesto es el número que le toca en ese orden.
  const dnfLast = sql`case when ${raceRosters.abandonedDay} is null then 0 else 1 end`
  const orden = sql.join([dnfLast, ...gcOrderBy()], sql`, `)
  const ranked = db
    .select({
      raceId: raceGc.raceId,
      riderId: raceGc.riderId,
      puesto:
        sql<number>`row_number() over (partition by ${raceGc.raceId} order by ${orden})::int`.as(
          'puesto',
        ),
      dnf: sql<boolean>`${raceRosters.abandonedDay} is not null`.as('dnf'),
    })
    .from(raceGc)
    .leftJoin(
      raceRosters,
      and(eq(raceRosters.raceId, raceGc.raceId), eq(raceRosters.riderId, raceGc.riderId)),
    )
    .where(inArray(raceGc.raceId, enteras))
    .as('ranked')

  const rows = await db
    .select({ raceId: ranked.raceId, puesto: ranked.puesto, dnf: ranked.dnf })
    .from(ranked)
    .where(eq(ranked.riderId, riderId))
  for (const r of rows) out.set(r.raceId, { puesto: r.puesto, dnf: r.dnf })
  return out
}

/**
 * Última etapa disputada de cada carrera, para saber si ya terminó. Con P (E2, §10.6), la última que
 * `h` deja ver: una carrera con su final en el velo no está terminada para quien no lo ha visto.
 */
export async function getLastStageRun(
  db: Database,
  h: Horizon,
  raceKeys: readonly string[],
): Promise<Map<string, number>> {
  if (raceKeys.length === 0) return new Map()
  const rows = await db
    .select({
      raceId: stageResults.raceId,
      lastStage: sql<number>`max(${stageResults.stageDay})::int`,
    })
    .from(stageResults)
    .where(inArray(stageResults.raceId, [...raceKeys]))
    .groupBy(stageResults.raceId)
  return new Map(rows.map((r) => [r.raceId, throughStage(h, r.raceId, r.lastStage)]))
}

/**
 * Últimas carreras del corredor con su resultado: la general de titular y las etapas como desglose,
 * de la más reciente a la más antigua. Es lo que pinta "Recent results" en su ficha.
 */
export async function getRiderRaceResults(
  db: Database,
  h: Horizon,
  riderId: string,
  // 40 carreras son más de una temporada completa de un corredor: la ficha enseña 20 y deja ver el
  // resto ("Show all", §7.3) sin volver a pedir nada.
  limit = 40,
): Promise<RiderRaceResult[]> {
  const stageRows = await db
    .select({
      raceId: stageResults.raceId,
      stageDay: stageResults.stageDay,
      puesto: stageResults.puesto,
    })
    .from(stageResults)
    .where(
      and(
        eq(stageResults.riderId, riderId),
        // F (E2, §10.6): las etapas del velo no salen. stage_results no tiene día de juego.
        h.veil.length === 0
          ? undefined
          : not(veilSql(h, stageResults.raceId, null, stageResults.stageDay)),
      ),
    )
  // Las carreras con etapas veladas en cuya lista de salida está, con cuántas (§11.6, punto 2).
  const toWatchByRace = new Map<string, number>()
  if (h.veil.length > 0) {
    const veladas = [...new Set(h.veil.map((v) => v.raceKey))]
    const enLista = await db
      .select({ raceKey: raceRosters.raceId })
      .from(raceRosters)
      .where(and(eq(raceRosters.riderId, riderId), inArray(raceRosters.raceId, veladas)))
    for (const { raceKey } of enLista)
      toWatchByRace.set(raceKey, h.veil.filter((v) => v.raceKey === raceKey).length)
  }

  // Primero se decide QUÉ carreras entran (agrupar y recortar es barato y no toca la base), y solo
  // para esas se piden la general y la última etapa corrida.
  const shortlist = buildRiderRaceResults(stageRows, new Map(), new Map(), limit, toWatchByRace)
  const raceKeys = shortlist.map((r) => `${r.raceId}:s${r.season}`)
  const [gcByRace, lastStageRunByRace] = await Promise.all([
    getRiderGcStandings(db, h, riderId, raceKeys),
    getLastStageRun(db, h, raceKeys),
  ])
  return buildRiderRaceResults(stageRows, gcByRace, lastStageRunByRace, limit, toWatchByRace)
}
