import { and, eq, lt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { worlds } from './schema.js'

/**
 * Reparaciones de datos de un mundo: correcciones de mundos ANTIGUOS, no trabajo del día a día.
 *
 * El backfill del calendario (palmarés de carreras de un día, dorsales que faltaban, recálculo de
 * puntos, dobles inscripciones) y las reconciliaciones del tick (nacionalidades, residencias,
 * nombres duplicados) se escribieron para arreglar mundos creados antes de tal o cual regla. Son
 * idempotentes, sí, pero barrían TODAS las tablas en CADA tick para siempre, aun sabiendo ya que no
 * hay nada que arreglar. Ahora se ejecutan una sola vez y `worlds.repair_version` lo recuerda.
 *
 * Para añadir una reparación nueva: súbele uno a `WORLD_REPAIR_VERSION` y todos los mundos volverán
 * a pasar por ellas una vez.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Versión de reparaciones que conoce este código. Un mundo por debajo aún tiene que pasarlas. */
export const WORLD_REPAIR_VERSION = 1

/** ¿Este mundo tiene reparaciones pendientes? (barato: una fila por PK). */
export async function worldNeedsRepair(tx: Tx | Db, worldId: string): Promise<boolean> {
  const rows = await tx
    .select({ v: worlds.repairVersion })
    .from(worlds)
    .where(eq(worlds.id, worldId))
    .limit(1)
  return (rows[0]?.v ?? 0) < WORLD_REPAIR_VERSION
}

/** Marca el mundo como reparado. Nunca baja la versión (por si otro proceso ya la subió). */
export async function markWorldRepaired(tx: Tx | Db, worldId: string): Promise<void> {
  await tx
    .update(worlds)
    .set({ repairVersion: WORLD_REPAIR_VERSION })
    .where(and(eq(worlds.id, worldId), lt(worlds.repairVersion, WORLD_REPAIR_VERSION)))
}
