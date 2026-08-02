import type { Gender } from '@cyclingstar/shared'
import { and, eq, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { generateUniqueName } from './names.js'
import { riders, teams } from './schema.js'
import { makeUniqueTeamName } from './teamNames.js'

/**
 * Reparación de nombres duplicados (equipos y corredores, bots o humanos). Idempotente: recorre
 * el mundo, conserva la primera aparición de cada nombre y renombra las demás con un nombre único
 * y determinista. Se ejecuta en el tick; una vez limpio, no hace ningún cambio.
 *
 * Prioridad al conservar: primero los gestionados por un humano (equipos con dueño, corredores de
 * un usuario), luego por antigüedad — así un choque humano/bot renombra al bot, no al humano.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

export interface DedupeResult {
  teamsRenamed: number
  ridersRenamed: number
}

export async function dedupeWorldNames(tx: Tx, worldId: string): Promise<DedupeResult> {
  const teamsRenamed = await dedupeTeams(tx, worldId)
  const ridersRenamed = await dedupeRiders(tx, worldId)
  return { teamsRenamed, ridersRenamed }
}

async function dedupeTeams(tx: Tx, worldId: string): Promise<number> {
  const rows = await tx
    .select({ id: teams.id, name: teams.name, ownerUserId: teams.ownerUserId })
    .from(teams)
    .where(eq(teams.worldId, worldId))

  // Los equipos con dueño humano conservan su nombre; el resto por id (estable).
  rows.sort((a, b) => {
    const ah = a.ownerUserId ? 0 : 1
    const bh = b.ownerUserId ? 0 : 1
    if (ah !== bh) return ah - bh
    return a.id < b.id ? -1 : 1
  })

  // Primera pasada: la primera aparición de cada nombre se conserva; las demás se renombran.
  const kept = new Set<string>()
  const toRename: typeof rows = []
  for (const row of rows) {
    const key = normalize(row.name)
    if (kept.has(key)) toRename.push(row)
    else kept.add(key)
  }
  // El conjunto en uso arranca con TODOS los nombres conservados, para no chocar con ninguno.
  const used = new Set(kept)
  for (const row of toRename) {
    const newName = makeUniqueTeamName(`${worldId}:dedupe:team:${row.id}`, used)
    await tx.update(teams).set({ name: newName }).where(eq(teams.id, row.id))
  }
  return toRename.length
}

async function dedupeRiders(tx: Tx, worldId: string): Promise<number> {
  // Solo corredores en activo: los retirados son historia y no se muestran en plantillas/rankings.
  const rows = await tx
    .select({
      id: riders.id,
      name: riders.name,
      country: riders.country,
      gender: riders.gender,
      userId: riders.userId,
    })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNull(riders.retiredAt)))

  // Los corredores humanos conservan su nombre; el resto por id (estable).
  rows.sort((a, b) => {
    const ah = a.userId ? 0 : 1
    const bh = b.userId ? 0 : 1
    if (ah !== bh) return ah - bh
    return a.id < b.id ? -1 : 1
  })

  // Primera pasada: la primera aparición de cada nombre se conserva; las demás se renombran.
  const kept = new Set<string>()
  const toRename: typeof rows = []
  for (const row of rows) {
    const key = normalize(row.name)
    if (kept.has(key)) toRename.push(row)
    else kept.add(key)
  }
  // El conjunto en uso arranca con TODOS los nombres conservados, para no chocar con ninguno.
  const used = new Set(kept)
  for (const row of toRename) {
    const generated = generateUniqueName(
      `${worldId}:dedupe:rider:${row.id}`,
      { country: row.country.toLowerCase(), gender: row.gender as Gender },
      used,
    )
    await tx.update(riders).set({ name: generated.fullName }).where(eq(riders.id, row.id))
  }
  return toRename.length
}
