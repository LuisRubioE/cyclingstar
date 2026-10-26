import type { KitCode, RaceStartlist, TeamListItem } from '@cyclingstar/shared'
import { type WornTeam, wornTeam } from '../components/ui/TeamJersey'

/**
 * LO QUE UNA FILA DE CLASIFICACIÓN NO TRAE (E3, docs/visual.md §6.1; PR 12b; 17-q). El dorsal, de la
 * lista de salida de su carrera por `riderId`; y el maillot de su equipo, por `teamId`, de esa lista (el
 * del día de la salida) o, fuera de una carrera, de `GET /api/teams` (el de mañana): desde el 17a su
 * `kit`, y mientras sea nulo (hasta el 17b) la semilla de su dibujo de hoy. Sin la lista, la fila sale sin
 * dorsal; sin el equipo, sin maillot: nunca con uno equivocado. Y mientras llega (`pending`), nada se
 * pinta que luego se mueva: las tablas de carrera esperan, y las demás guardan el hueco del maillot.
 */

/** Lo que una respuesta dice del maillot de un equipo: su código, o null y la semilla de hoy. */
export interface TeamDrawing {
  readonly kit: KitCode | null
  readonly jerseySeed: string
}

export interface TableIdentity {
  /** el dorsal en esta carrera; null fuera de una carrera o sin lista */
  readonly bibOf: (riderId: string) => number | null
  /** el maillot de un equipo; null si no se sabe */
  readonly drawingOf: (teamId: string) => TeamDrawing | null
  /** la lista aún no ha llegado */
  readonly pending: boolean
}

export const NO_TABLE_IDENTITY: TableIdentity = {
  bibOf: () => null,
  drawingOf: () => null,
  pending: false,
}

const ESPERANDO: TableIdentity = { ...NO_TABLE_IDENTITY, pending: true }

/** De la lista de salida de la carrera, que tras la salida sirve la escuadra congelada (PR 12b). */
export function identityFromStartlist(
  startlist: RaceStartlist | undefined,
  pending = false,
): TableIdentity {
  if (startlist === undefined) return pending ? ESPERANDO : NO_TABLE_IDENTITY
  const bibs = new Map<string, number>()
  const drawings = new Map<string, TeamDrawing>()
  for (const t of startlist.teams) {
    drawings.set(t.id, { kit: t.kit, jerseySeed: t.jerseySeed })
    for (const r of t.riders) if (r.bib !== null) bibs.set(r.id, r.bib)
  }
  for (const r of startlist.freeAgents) if (r.bib !== null) bibs.set(r.id, r.bib)
  return {
    bibOf: (id) => bibs.get(id) ?? null,
    drawingOf: (id) => drawings.get(id) ?? null,
    pending: false,
  }
}

/** De `GET /api/teams`, fuera de una carrera: el equipo de hoy, sin dorsal. */
export function identityFromTeams(
  teams: readonly TeamListItem[] | undefined,
  pending = false,
): TableIdentity {
  if (teams === undefined) return pending ? ESPERANDO : NO_TABLE_IDENTITY
  const drawings = new Map(
    teams.map((t): [string, TeamDrawing] => [t.id, { kit: t.kit, jerseySeed: t.jerseySeed }]),
  )
  return { bibOf: () => null, drawingOf: (id) => drawings.get(id) ?? null, pending: false }
}

/**
 * El `team` de `RiderLabel` para una fila: null, un agente libre (`Individual`, con el hueco del maillot),
 * o la lista aún sin llegar (el hueco, para que al llegar la fila no se mueva); undefined, sin el maillot
 * de su equipo (ni maillot ni hueco).
 */
export function rowTeam(
  teamId: string | null | undefined,
  teamName: string | null,
  identity: TableIdentity,
): WornTeam | null | undefined {
  if (teamName === null) return null
  if (teamId === null || teamId === undefined) return undefined
  const drawing = identity.drawingOf(teamId)
  if (drawing === null) return identity.pending ? null : undefined
  return wornTeam(teamName, drawing.kit, drawing.jerseySeed)
}
