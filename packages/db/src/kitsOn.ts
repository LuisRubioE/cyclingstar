import { type KitCode, seededRng } from '@cyclingstar/shared'
import { and, asc, desc, inArray, lte } from 'drizzle-orm'
import { KIT_ALLOWED } from './kitConflicts.generated.js'
import { teamKits, teams } from './schema.js'
import type { Queryable } from './titles.js'

/**
 * LA LECTURA DEL MAILLOT DE UN DÍA (E3, docs/visual.md §8.5; PR 16a, aparte desde el 16b).
 * Vive fuera de `kits.ts` porque la leen las salidas, la general por equipos y la retransmisión, y
 * `kits.ts` importa `seasonRivals.ts`, que a su vez importa `calendarRun.ts`: con la lectura aquí,
 * `calendarRun.ts` no cierra ese ciclo.
 */

/** El maillot de cada equipo un día: la fila de mayor `valid_from_day` que no pase de ese día. */
export async function kitsOn(
  q: Queryable,
  teamIds: readonly string[],
  day: number,
): Promise<ReadonlyMap<string, KitCode>> {
  if (teamIds.length === 0) return new Map()
  const rows = await q
    .selectDistinctOn([teamKits.teamId], { teamId: teamKits.teamId, kit: teamKits.kit })
    .from(teamKits)
    .where(and(inArray(teamKits.teamId, [...teamIds]), lte(teamKits.validFromDay, day)))
    .orderBy(teamKits.teamId, desc(teamKits.validFromDay))
  return new Map(rows.map((r) => [r.teamId, r.kit as KitCode]))
}

/** El maillot de un equipo un día, o `null` si aún no tenía ninguno guardado y se dibuja con su semilla. */
export async function kitOn(q: Queryable, teamId: string, day: number): Promise<KitCode | null> {
  return (await kitsOn(q, [teamId], day)).get(teamId) ?? null
}

/**
 * Los permitidos barajados con la semilla del equipo (Fisher-Yates con `seededRng`, FNV-1a): el orden en que un
 * equipo que nace sin fila prueba los libres (8-d). Vive aquí, y no en `kits.ts`, para que `stateKitsOn` lo
 * use sin cerrar el ciclo de `calendarRun.ts`.
 */
export function kitsBySeed(seed: string): readonly KitCode[] {
  const rng = seededRng(`kit:${seed}`)
  const order = [...KIT_ALLOWED]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  return order
}

/**
 * EL MAILLOT DE LOS CUATRO DE ESTADO (E3, docs/visual.md §8.5; PR 19e): la lista de salida, la general por
 * equipos y la lista y la ficha de los equipos nunca van sin maillot. El de ese día (`kitsOn`); si el día es
 * anterior a la primera fila del equipo, la primera, la que le dio la traducción; y un equipo sin ninguna, que
 * la traducción del 17b hace imposible, el primero del orden de su semilla, el que probaría al nacer
 * (`kitsBySeed`). La retransmisión no lo usa: lo grabado antes de la traducción se dibuja con su semilla (D-23).
 */
export async function stateKitsOn(
  q: Queryable,
  teamIds: readonly string[],
  day: number,
): Promise<ReadonlyMap<string, KitCode>> {
  const kits = new Map(await kitsOn(q, teamIds, day))
  const before = teamIds.filter((id) => !kits.has(id))
  if (before.length === 0) return kits
  const first = await q
    .selectDistinctOn([teamKits.teamId], { teamId: teamKits.teamId, kit: teamKits.kit })
    .from(teamKits)
    .where(inArray(teamKits.teamId, before))
    .orderBy(teamKits.teamId, asc(teamKits.validFromDay))
  for (const r of first) kits.set(r.teamId, r.kit as KitCode)
  const bare = before.filter((id) => !kits.has(id))
  if (bare.length === 0) return kits
  const seeds = await q
    .select({ id: teams.id, seed: teams.jerseySeed })
    .from(teams)
    .where(inArray(teams.id, bare))
  for (const t of seeds) {
    const kit = kitsBySeed(t.seed)[0]
    if (kit !== undefined) kits.set(t.id, kit)
  }
  return kits
}
