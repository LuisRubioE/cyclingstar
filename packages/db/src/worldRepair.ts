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

/**
 * Versión de reparaciones que conoce este código. Un mundo por debajo aún tiene que pasarlas.
 *
 * - **v2**: el que se retiraba el primer día GANABA la carrera. Su fila de `race_gc` se queda a
 *   propósito (la ficha lo enseña como DNF) pero con el tiempo de las etapas que corrió, o sea el
 *   más bajo de todos, y la general que repartía no lo filtraba. El dueño lo vio: «Iván García en su
 *   palmarés pone que ganó la vuelta a Andalucía; se retiró en la primera etapa». Arreglado el
 *   reparto, quedan por limpiar los honores de general ya escritos y los puntos ya sumados.
 */
export const WORLD_REPAIR_VERSION = 2

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
