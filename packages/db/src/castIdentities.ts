import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import type { Database } from './client.js'
import { riders, teams } from './schema.js'

/**
 * LAS IDENTIDADES DEL REPARTO PROVISIONAL (E2, docs/retransmision.md §3.8 y §7.8; decisión 17-k).
 *
 * El adaptador de la radio sirve un reparto aunque la etapa no tenga línea grabada, porque
 * `BroadcastHead.cast` es obligatorio desde el 3a: los corredores de `stage_snapshots.input` con su
 * país y su género, y el equipo CON EL QUE CORRIERON (`input.riders[].teamId`, no `riders.team_id`,
 * que es el de hoy) con su `jerseySeed` y su nombre de hoy. El reparto congelado del paso 5
 * (`buildTimelineCast`) guarda la semilla del día; este, la de hoy, y lo dice.
 *
 * Ninguna de estas columnas es una fuente de D-32 (§10.6, punto 1): no lleva `Horizon`.
 */
export interface CastIdentities {
  /** riderId → nombre, país (ISO-2 en mayúsculas) y género */
  readonly riders: ReadonlyMap<
    string,
    { readonly name: string; readonly country: string; readonly gender: 'M' | 'F' }
  >
  /** teamId → nombre y semilla de equipación de hoy */
  readonly teams: ReadonlyMap<string, { readonly name: string; readonly jerseySeed: string }>
}

/** Una consulta por tabla, solo de los ids pedidos; un id que no exista no sale. */
export async function getCastIdentities(
  db: Database,
  riderIds: readonly string[],
  teamIds: readonly string[],
): Promise<CastIdentities> {
  const [riderRows, teamRows] = await Promise.all([
    riderIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: riders.id,
            name: riders.name,
            country: riders.country,
            gender: riders.gender,
          })
          .from(riders)
          .where(inArray(riders.id, [...riderIds])),
    teamIds.length === 0
      ? Promise.resolve([])
      : db
          .select({ id: teams.id, name: teams.name, jerseySeed: teams.jerseySeed })
          .from(teams)
          .where(inArray(teams.id, [...teamIds])),
  ])
  return {
    riders: new Map(
      riderRows.map((r) => [
        r.id,
        { name: r.name, country: r.country.toUpperCase(), gender: r.gender },
      ]),
    ),
    teams: new Map(teamRows.map((t) => [t.id, { name: t.name, jerseySeed: t.jerseySeed }])),
  }
}

/**
 * LOS CORREDORES PROPIOS DE QUIEN MIRA (R23.7): su corredor activo y los de la plantilla del equipo que
 * posee. `RiderCard.own` y `GroupNow.own` los marcan en la retransmisión (§4.5, §7.8). Una consulta.
 */
export async function getOwnRiderIds(db: Database, userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: riders.id })
    .from(riders)
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(
      and(isNull(riders.retiredAt), or(eq(riders.userId, userId), eq(teams.ownerUserId, userId))),
    )
  return rows.map((r) => r.id)
}
