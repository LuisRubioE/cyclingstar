import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { gcOrderBy } from './gcSort.js'
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
 */

/** Puesto del corredor en una etapa concreta. */
export interface RiderStagePlacing {
  stageDay: number
  puesto: number
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
): RiderRaceResult[] {
  const byRace = new Map<string, { sortKey: number; result: RiderRaceResult }>()
  for (const row of stageRows) {
    const m = /^(.*):s(\d+)$/.exec(row.raceId)
    if (!m) continue // la vuelta de prueba no cuenta como carrera del calendario
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
      byRace.set(row.raceId, entry)
    }
    entry.result.stages.push({ stageDay: row.stageDay, puesto: row.puesto })
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
  riderId: string,
  raceKeys: readonly string[],
): Promise<Map<string, RiderGcStanding>> {
  if (raceKeys.length === 0) return new Map()
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
    .where(inArray(raceGc.raceId, [...raceKeys]))
    .as('ranked')

  const rows = await db
    .select({ raceId: ranked.raceId, puesto: ranked.puesto, dnf: ranked.dnf })
    .from(ranked)
    .where(eq(ranked.riderId, riderId))
  return new Map(rows.map((r) => [r.raceId, { puesto: r.puesto, dnf: r.dnf }]))
}

/** Última etapa disputada de cada carrera, para saber si ya terminó. */
export async function getLastStageRun(
  db: Database,
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
  return new Map(rows.map((r) => [r.raceId, r.lastStage]))
}

/**
 * Últimas carreras del corredor con su resultado: la general de titular y las etapas como desglose,
 * de la más reciente a la más antigua. Es lo que pinta "Recent results" en su ficha.
 */
export async function getRiderRaceResults(
  db: Database,
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
    .where(eq(stageResults.riderId, riderId))

  // Primero se decide QUÉ carreras entran (agrupar y recortar es barato y no toca la base), y solo
  // para esas se piden la general y la última etapa corrida.
  const shortlist = buildRiderRaceResults(stageRows, new Map(), new Map(), limit)
  const raceKeys = shortlist.map((r) => `${r.raceId}:s${r.season}`)
  const [gcByRace, lastStageRunByRace] = await Promise.all([
    getRiderGcStandings(db, riderId, raceKeys),
    getLastStageRun(db, raceKeys),
  ])
  return buildRiderRaceResults(stageRows, gcByRace, lastStageRunByRace, limit)
}
