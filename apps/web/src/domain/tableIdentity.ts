import type { RaceStartlist, TeamListItem } from '@cyclingstar/shared'

/**
 * LO QUE UNA FILA DE CLASIFICACIÓN NO TRAE (E3, docs/visual.md §6.1; PR 12b; 17-q). El dorsal, de la
 * lista de salida de su carrera por `riderId`; y la semilla del dibujo de su equipo (el de hoy, hasta el
 * 17a), por `teamId`, de esa lista o, fuera de una carrera, de `GET /api/teams`. Sin la lista, la fila sale
 * sin dorsal; sin la semilla, sin maillot: nunca con uno equivocado. Y mientras llega (`pending`), nada se
 * pinta que luego se mueva: las tablas de carrera esperan, y las demás guardan el hueco del maillot.
 */
export interface TableIdentity {
  /** el dorsal en esta carrera; null fuera de una carrera o sin lista */
  readonly bibOf: (riderId: string) => number | null
  /** la semilla del dibujo de un equipo; null si no se sabe */
  readonly seedOf: (teamId: string) => string | null
  /** la lista aún no ha llegado */
  readonly pending: boolean
}

export const NO_TABLE_IDENTITY: TableIdentity = {
  bibOf: () => null,
  seedOf: () => null,
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
  const seeds = new Map<string, string>()
  for (const t of startlist.teams) {
    seeds.set(t.id, t.jerseySeed)
    for (const r of t.riders) if (r.bib !== null) bibs.set(r.id, r.bib)
  }
  for (const r of startlist.freeAgents) if (r.bib !== null) bibs.set(r.id, r.bib)
  return {
    bibOf: (id) => bibs.get(id) ?? null,
    seedOf: (id) => seeds.get(id) ?? null,
    pending: false,
  }
}

/** De `GET /api/teams`, fuera de una carrera: el equipo de hoy, sin dorsal. */
export function identityFromTeams(
  teams: readonly TeamListItem[] | undefined,
  pending = false,
): TableIdentity {
  if (teams === undefined) return pending ? ESPERANDO : NO_TABLE_IDENTITY
  const seeds = new Map(teams.map((t) => [t.id, t.jerseySeed]))
  return { bibOf: () => null, seedOf: (id) => seeds.get(id) ?? null, pending: false }
}

/**
 * El `team` de `RiderLabel` para una fila: null, un agente libre (`Individual`, con el hueco del maillot),
 * o la lista aún sin llegar (el hueco, para que al llegar la fila no se mueva); undefined, sin la semilla de
 * su equipo (ni maillot ni hueco).
 */
export function rowTeam(
  teamId: string | null | undefined,
  teamName: string | null,
  identity: TableIdentity,
): { readonly name: string; readonly legacySeed: string } | null | undefined {
  if (teamName === null) return null
  if (teamId === null || teamId === undefined) return undefined
  const seed = identity.seedOf(teamId)
  if (seed === null) return identity.pending ? null : undefined
  return { name: teamName, legacySeed: seed }
}
