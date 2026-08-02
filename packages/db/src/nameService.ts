import type { Gender } from '@cyclingstar/shared'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { getBlockedSet, normalizeBlocked } from './blocklist.js'
import type { Database } from './client.js'
import { type GeneratedName, generateName, regenerateName, isBlockedName } from './names.js'
import { riders } from './schema.js'

/**
 * Nombres únicos frente al mundo real (base de datos), para la creación de un corredor humano.
 * Complementa la unicidad determinista de la génesis: aquí comprobamos contra los corredores en
 * activo ya existentes para no chocar con bots ni con otros humanos.
 */

/** ¿Ya existe un corredor en activo con este nombre completo (sin distinción de mayúsculas)? */
export async function isRiderNameTaken(
  db: Database,
  worldId: string,
  fullName: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: riders.id })
    .from(riders)
    .where(
      and(
        eq(riders.worldId, worldId),
        isNull(riders.retiredAt),
        sql`lower(${riders.name}) = ${fullName.trim().toLowerCase()}`,
      ),
    )
    .limit(1)
  return rows.length > 0
}

/**
 * Genera un nombre para una semilla que además no colisione con ningún corredor en activo del
 * mundo. Reintenta con variantes de la semilla; el espacio de nombres por país es enorme.
 */
export async function generateUniqueRiderName(
  db: Database,
  worldId: string,
  seed: string,
  opts: { country: string; gender: Gender },
): Promise<GeneratedName> {
  // Lista de bloqueo de admins (ciclistas/famosos reales), además del bloqueo estático de pros.
  const blocked = await getBlockedSet(db, 'rider')
  for (let iteration = 0; iteration < 40; iteration++) {
    const generated =
      iteration === 0 ? generateName(seed, opts) : regenerateName(seed, opts, iteration)
    if (isBlockedName(generated.fullName)) continue
    if (blocked.has(normalizeBlocked(generated.fullName))) continue
    if (!(await isRiderNameTaken(db, worldId, generated.fullName))) return generated
  }
  throw new Error('no se pudo generar un nombre único para el corredor')
}
