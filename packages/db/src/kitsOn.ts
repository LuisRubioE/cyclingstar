import type { KitCode } from '@cyclingstar/shared'
import { and, desc, inArray, lte } from 'drizzle-orm'
import { teamKits } from './schema.js'
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
