import { and, asc, eq, lte, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { gcFinishersWhere, gcOrderBy, gcRosterOn } from './gcSort.js'
import { raceGc, raceRosters, riders, stageResults, stageTeamResults, teams } from './schema.js'

/**
 * CLASIFICACIÓN POR EQUIPOS (SPEC, regla del ciclismo real).
 *
 * Por ETAPA: se suman los tiempos de meta de los TRES MEJORES corredores de cada equipo. Se usan
 * los tiempos de meta, NO los netos: las bonificaciones no cuentan para la clasificación por
 * equipos (y en una carrera de un día no existen en absoluto, ver `isOneDayRace` en stageRun.ts).
 *
 * ACUMULADA: se suman las sumas POR ETAPA a lo largo de la carrera. Ojo, no es la suma de los tres
 * mejores de la general: los tres que puntúan cambian cada día, y ahí está toda la diferencia.
 *
 * DESEMPATE (misma doctrina que `gcSort.ts`: orden TOTAL y DETERMINISTA, nunca a merced de lo que
 * devuelva Postgres):
 *  - de etapa:    tiempo → suma de los puestos de los tres que puntúan → mejor puesto → id.
 *  - acumulada:   tiempo → suma de puestos acumulada → puesto del mejor corredor del equipo en la
 *                 general individual → id.
 * El id del equipo no es deportivo: es lo que cierra el orden. En una etapa llana el pelotón entra
 * con el mismo tiempo y TODOS los equipos empatan al segundo, así que los desempates no son un caso
 * raro aquí, son el caso normal.
 *
 * AGENTES LIBRES: no tienen equipo y no entran en la agregación (ni suman ni estorban).
 *
 * ABANDONOS: quien abandona en la etapa N sí llegó a meta ese día y puntúa en esa etapa; a partir
 * de N+1 no figura en `stage_results` (el roster lo excluye), así que su equipo puede quedarse con
 * menos de tres. Un equipo con menos de tres clasificados NO puntúa esa etapa y queda FUERA de la
 * acumulada desde ese día (regla UCI). Se sigue mostrando, al final y sin puesto, como los DNF de
 * la general: es información, no un agujero.
 */

/** Corredores que hacen falta para que un equipo puntúe. */
export const TEAM_SCORING_RIDERS = 3

/** Un corredor en el resultado de una etapa, con su equipo (null = agente libre). */
export interface TeamStageEntry {
  riderId: string
  teamId: string | null
  puesto: number
  tiempoS: number
}

/** Lo que un equipo hizo en UNA etapa. Es exactamente la fila de `stage_team_results`. */
export interface TeamStageScore {
  teamId: string
  /** Puntuó: tenía al menos tres corredores clasificados. */
  scored: boolean
  /** Suma de los tiempos de meta de sus tres mejores (0 si no puntuó). */
  tiempoS: number
  /** Suma de los puestos de esos tres (0 si no puntuó). */
  sumaPuestos: number
  /** Mejor puesto de esos tres (0 si no puntuó). */
  mejorPuesto: number
}

/**
 * Los tres mejores de cada equipo en una etapa. Devuelve una entrada por equipo PRESENTE en la
 * etapa (aunque no puntúe), en orden de id para que la escritura en lote sea determinista.
 */
export function teamStageScores(rows: readonly TeamStageEntry[]): TeamStageScore[] {
  const byTeam = new Map<string, TeamStageEntry[]>()
  for (const row of rows) {
    if (!row.teamId) continue // agente libre: no puntúa para nadie
    const list = byTeam.get(row.teamId)
    if (list) list.push(row)
    else byTeam.set(row.teamId, [row])
  }
  const scores: TeamStageScore[] = []
  for (const [teamId, list] of byTeam) {
    if (list.length < TEAM_SCORING_RIDERS) {
      scores.push({ teamId, scored: false, tiempoS: 0, sumaPuestos: 0, mejorPuesto: 0 })
      continue
    }
    // Los tres mejores por tiempo; a igualdad de tiempo (lo normal en una llegada masiva) manda el
    // puesto, y el id cierra el orden para que la selección no dependa del orden de lectura.
    const best = [...list]
      .sort(
        (a, b) => a.tiempoS - b.tiempoS || a.puesto - b.puesto || (a.riderId < b.riderId ? -1 : 1),
      )
      .slice(0, TEAM_SCORING_RIDERS)
    scores.push({
      teamId,
      scored: true,
      tiempoS: best.reduce((sum, r) => sum + r.tiempoS, 0),
      sumaPuestos: best.reduce((sum, r) => sum + r.puesto, 0),
      mejorPuesto: Math.min(...best.map((r) => r.puesto)),
    })
  }
  return scores.sort((a, b) => (a.teamId < b.teamId ? -1 : 1))
}

/** Una fila de clasificación por equipos, de etapa o acumulada, ya lista para mostrar. */
export interface TeamClassRow {
  teamId: string
  teamName: string
  /** País del equipo (ISO alpha-2); null si no lo tiene asignado. */
  country: string | null
  /** Suma de tiempos: de la etapa, o acumulada por etapas. */
  tiempoS: number
  /** Suma de los puestos de los corredores que puntúan (primer desempate). */
  sumaPuestos: number
  /** Etapas puntuadas (1 en la clasificación de una etapa). */
  stagesScored: number
  /** Fuera de la clasificación: se quedó sin tres clasificados en alguna etapa. */
  out: boolean
}

export interface TeamClassifications {
  /** Clasificación por equipos de la etapa pedida. Vacía si no se pidió etapa o no se corrió. */
  stage: TeamClassRow[]
  /** Clasificación acumulada de la carrera (hasta `throughStage` si se indicó). */
  overall: TeamClassRow[]
}

/** Identidad del equipo, para poder nombrarlo en la tabla. */
interface TeamIdentity {
  teamName: string
  country: string | null
}

/** Lo que un equipo hizo en una etapa concreta, ya con su identidad resuelta. */
interface StageScoreRow extends TeamStageScore {
  stageDay: number
}

/**
 * Clasificación por equipos de una carrera: la de una etapa concreta y la acumulada.
 *
 * Se sirve de lo que el tick dejó escrito en `stage_team_results`. Si no hay nada —carreras
 * corridas ANTES de que existiera la clasificación por equipos— se deriva al vuelo desde
 * `stage_results`, igual que `getGcThroughStage` reconstruye la general: así el histórico no queda
 * con agujeros y no hace falta reescribir datos ya guardados.
 */
export async function getTeamClassifications(
  db: Database,
  raceId: string,
  throughStage?: number,
): Promise<TeamClassifications> {
  const upTo = throughStage != null ? lte(stageTeamResults.stageDay, throughStage) : undefined
  const storedRows = await db
    .select({
      stageDay: stageTeamResults.stageDay,
      teamId: stageTeamResults.teamId,
      scored: stageTeamResults.scored,
      tiempoS: stageTeamResults.tiempoS,
      sumaPuestos: stageTeamResults.sumaPuestos,
      mejorPuesto: stageTeamResults.mejorPuesto,
      teamName: teams.name,
      country: teams.country,
    })
    .from(stageTeamResults)
    .innerJoin(teams, eq(teams.id, stageTeamResults.teamId))
    .where(and(eq(stageTeamResults.raceId, raceId), upTo))

  const identity = new Map<string, TeamIdentity>()
  let scores: StageScoreRow[]
  if (await storedIsComplete(db, raceId, throughStage, storedRows)) {
    scores = storedRows.map((r) => {
      identity.set(r.teamId, { teamName: r.teamName, country: r.country })
      return {
        stageDay: r.stageDay,
        teamId: r.teamId,
        scored: r.scored,
        tiempoS: r.tiempoS,
        sumaPuestos: r.sumaPuestos,
        mejorPuesto: r.mejorPuesto,
      }
    })
  } else {
    scores = await deriveScores(db, raceId, throughStage, identity)
  }
  if (scores.length === 0) return { stage: [], overall: [] }

  const bestGc = await teamBestGcRank(db, raceId, throughStage)
  const stage =
    throughStage != null
      ? buildRows(
          scores.filter((s) => s.stageDay === throughStage),
          identity,
          stageCompare,
        )
      : []
  const overall = buildRows(scores, identity, (a, b) => overallCompare(a, b, bestGc))
  return { stage, overall }
}

/**
 * ¿Lo persistido cubre TODAS las etapas ya corridas? Si no, no sirve y hay que derivarlo entero.
 *
 * No basta con "hay filas": una carrera que estaba EN CURSO al desplegar esto tiene las etapas
 * anteriores sin escribir y las siguientes sí. Sumar solo las segundas daría una clasificación
 * silenciosamente falsa —el peor fallo posible aquí—, así que en ese caso se deriva todo desde
 * `stage_results`, que sí está completo.
 */
async function storedIsComplete(
  db: Database,
  raceId: string,
  throughStage: number | undefined,
  storedRows: readonly { stageDay: number }[],
): Promise<boolean> {
  if (storedRows.length === 0) return false
  const run = await db
    .selectDistinct({ stageDay: stageResults.stageDay })
    .from(stageResults)
    .where(
      and(
        eq(stageResults.raceId, raceId),
        throughStage != null ? lte(stageResults.stageDay, throughStage) : undefined,
      ),
    )
  const stored = new Set(storedRows.map((r) => r.stageDay))
  return run.every((r) => stored.has(r.stageDay))
}

/**
 * Reconstruye la clasificación por equipos de cada etapa desde `stage_results` (histórico sin
 * `stage_team_results`). Aplica exactamente la misma regla: es la MISMA función, no una copia.
 */
async function deriveScores(
  db: Database,
  raceId: string,
  throughStage: number | undefined,
  identity: Map<string, TeamIdentity>,
): Promise<StageScoreRow[]> {
  const rows = await db
    .select({
      stageDay: stageResults.stageDay,
      riderId: stageResults.riderId,
      puesto: stageResults.puesto,
      tiempoS: stageResults.tiempoS,
      teamId: riders.teamId,
      teamName: teams.name,
      teamCountry: teams.country,
    })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(
      and(
        eq(stageResults.raceId, raceId),
        throughStage != null ? lte(stageResults.stageDay, throughStage) : undefined,
      ),
    )

  const byStage = new Map<number, TeamStageEntry[]>()
  for (const row of rows) {
    if (row.teamId && row.teamName) {
      identity.set(row.teamId, { teamName: row.teamName, country: row.teamCountry })
    }
    const list = byStage.get(row.stageDay)
    const entry: TeamStageEntry = {
      riderId: row.riderId,
      teamId: row.teamId,
      puesto: row.puesto,
      tiempoS: row.tiempoS,
    }
    if (list) list.push(entry)
    else byStage.set(row.stageDay, [entry])
  }
  const scores: StageScoreRow[] = []
  for (const [stageDay, entries] of byStage) {
    for (const score of teamStageScores(entries)) scores.push({ stageDay, ...score })
  }
  return scores
}

/**
 * Fila en construcción: lleva además el mejor puesto del equipo, que desempata la clasificación de
 * una etapa pero no significa nada en la acumulada, así que no sale de aquí.
 */
interface WorkRow extends TeamClassRow {
  mejorPuesto: number
}

/** Agrega las filas por equipo y las ordena con el criterio que se le pase. */
function buildRows(
  scores: readonly StageScoreRow[],
  identity: ReadonlyMap<string, TeamIdentity>,
  compare: (a: WorkRow, b: WorkRow) => number,
): TeamClassRow[] {
  const byTeam = new Map<string, WorkRow>()
  for (const score of scores) {
    const who = identity.get(score.teamId)
    if (!who) continue // equipo borrado (poda de NPC): no hay nada que nombrar
    let row = byTeam.get(score.teamId)
    if (!row) {
      row = {
        teamId: score.teamId,
        teamName: who.teamName,
        country: who.country,
        tiempoS: 0,
        sumaPuestos: 0,
        stagesScored: 0,
        out: false,
        mejorPuesto: Number.MAX_SAFE_INTEGER,
      }
      byTeam.set(score.teamId, row)
    }
    if (!score.scored) {
      // Se quedó sin tres clasificados: fuera de la clasificación desde esa etapa.
      row.out = true
      continue
    }
    row.tiempoS += score.tiempoS
    row.sumaPuestos += score.sumaPuestos
    row.stagesScored += 1
    row.mejorPuesto = Math.min(row.mejorPuesto, score.mejorPuesto)
  }
  // Ya ordenadas, se deja fuera `mejorPuesto`: desempata la etapa, pero en la acumulada sería un
  // número sin significado y no tiene por qué salir en la respuesta.
  return [...byTeam.values()].sort(compare).map((row) => ({
    teamId: row.teamId,
    teamName: row.teamName,
    country: row.country,
    tiempoS: row.tiempoS,
    sumaPuestos: row.sumaPuestos,
    stagesScored: row.stagesScored,
    out: row.out,
  }))
}

/** Los equipos fuera de clasificación van siempre al final, como los DNF de la general. */
function outLast(a: WorkRow, b: WorkRow): number {
  return a.out === b.out ? 0 : a.out ? 1 : -1
}

/** Id del equipo: no es deportivo, es lo que hace el orden TOTAL. */
function byId(a: WorkRow, b: WorkRow): number {
  return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0
}

/** Orden de la clasificación de una etapa: tiempo → suma de puestos → mejor puesto → id. */
function stageCompare(a: WorkRow, b: WorkRow): number {
  return (
    outLast(a, b) ||
    a.tiempoS - b.tiempoS ||
    a.sumaPuestos - b.sumaPuestos ||
    a.mejorPuesto - b.mejorPuesto ||
    byId(a, b)
  )
}

/**
 * Orden de la acumulada: tiempo → suma de puestos → puesto del mejor corredor del equipo en la
 * general individual → id. Los equipos fuera de clasificación van al final, como los DNF.
 */
function overallCompare(a: WorkRow, b: WorkRow, bestGc: ReadonlyMap<string, number>): number {
  const gcA = bestGc.get(a.teamId) ?? Number.MAX_SAFE_INTEGER
  const gcB = bestGc.get(b.teamId) ?? Number.MAX_SAFE_INTEGER
  return (
    outLast(a, b) ||
    a.tiempoS - b.tiempoS ||
    a.sumaPuestos - b.sumaPuestos ||
    gcA - gcB ||
    byId(a, b)
  )
}

/**
 * Puesto del mejor corredor de cada equipo en la general individual (tercer desempate de la
 * acumulada). Con `throughStage` se recalcula la general hasta esa etapa desde `stage_results`,
 * con el mismo orden total que `gcOrderBy()`; sin él se lee la general almacenada.
 */
async function teamBestGcRank(
  db: Database,
  raceId: string,
  throughStage?: number,
): Promise<Map<string, number>> {
  const ordered =
    throughStage != null
      ? await gcThroughStageTeams(db, raceId, throughStage)
      : await db
          .select({ teamId: riders.teamId })
          .from(raceGc)
          .innerJoin(riders, eq(riders.id, raceGc.riderId))
          // Sin los abandonados (v31): un retirado conserva su fila con menos tiempo que nadie y
          // colocaba a su equipo el primero de la general por equipos.
          .leftJoin(raceRosters, gcRosterOn())
          .where(gcFinishersWhere(raceId))
          .orderBy(...gcOrderBy())
  const best = new Map<string, number>()
  ordered.forEach((row, i) => {
    if (row.teamId && !best.has(row.teamId)) best.set(row.teamId, i + 1)
  })
  return best
}

/** La general hasta una etapa, solo con el equipo de cada corredor y en su orden total. */
async function gcThroughStageTeams(
  db: Database,
  raceId: string,
  throughStage: number,
): Promise<{ teamId: string | null }[]> {
  const net = sql<number>`sum(${stageResults.tiempoS} - ${stageResults.bonificacionS})::int`
  const sumaPuestos = sql<number>`sum(${stageResults.puesto})::int`
  const ultimoPuesto = sql<number>`(array_agg(${stageResults.puesto} order by ${stageResults.stageDay} desc))[1]`
  return db
    .select({ teamId: riders.teamId })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .where(and(eq(stageResults.raceId, raceId), lte(stageResults.stageDay, throughStage)))
    .groupBy(stageResults.riderId, riders.teamId)
    .orderBy(asc(net), asc(sumaPuestos), asc(ultimoPuesto), asc(stageResults.riderId))
}
