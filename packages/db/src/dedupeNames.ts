import type { Gender } from '@cyclingstar/shared'
import { and, eq, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { normalizeBlocked } from './blocklist.js'
import { generateUniqueName } from './names.js'
import { blockedNames, riders, teams } from './schema.js'
import { makeUniqueTeamName } from './teamNames.js'

/**
 * Reconciliación de nombres (equipos y corredores, bots o humanos). Idempotente: recorre el
 * mundo y renombra los nombres duplicados y los que estén en la lista de bloqueo curada por
 * admins (equipos reales, ciclistas/famosos reales). Se ejecuta en el tick; una vez limpio, no
 * hace ningún cambio.
 *
 * Prioridad al conservar: primero los gestionados por un humano (equipos con dueño, corredores de
 * un usuario), luego por antigüedad — así un choque humano/bot renombra al bot, no al humano.
 * (Un nombre bloqueado se renombra igualmente, sea de quien sea.)
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export interface DedupeResult {
  teamsRenamed: number
  ridersRenamed: number
}

async function loadBlocked(tx: Tx, kind: 'team' | 'rider'): Promise<Set<string>> {
  const rows = await tx
    .select({ v: blockedNames.valueNorm })
    .from(blockedNames)
    .where(eq(blockedNames.kind, kind))
  return new Set(rows.map((r) => r.v))
}

export async function dedupeWorldNames(tx: Tx, worldId: string): Promise<DedupeResult> {
  const teamsRenamed = await dedupeTeams(tx, worldId)
  const ridersRenamed = await dedupeRiders(tx, worldId)
  return { teamsRenamed, ridersRenamed }
}

async function dedupeTeams(tx: Tx, worldId: string): Promise<number> {
  const blocked = await loadBlocked(tx, 'team')
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

  // Primera pasada: conservar la primera aparición de cada nombre; renombrar duplicados y bloqueados.
  const kept = new Set<string>()
  const toRename: typeof rows = []
  for (const row of rows) {
    const key = normalizeBlocked(row.name)
    if (blocked.has(key) || kept.has(key)) toRename.push(row)
    else kept.add(key)
  }
  // El conjunto en uso arranca con los conservados y los bloqueados, para no chocar con ninguno.
  const used = new Set([...kept, ...blocked])
  for (const row of toRename) {
    const newName = makeUniqueTeamName(`${worldId}:dedupe:team:${row.id}`, used)
    await tx.update(teams).set({ name: newName }).where(eq(teams.id, row.id))
  }
  return toRename.length
}

async function dedupeRiders(tx: Tx, worldId: string): Promise<number> {
  const blocked = await loadBlocked(tx, 'rider')
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

  // Primera pasada: conservar la primera aparición de cada nombre; renombrar duplicados y bloqueados.
  const kept = new Set<string>()
  const toRename: typeof rows = []
  for (const row of rows) {
    const key = normalizeBlocked(row.name)
    if (blocked.has(key) || kept.has(key)) toRename.push(row)
    else kept.add(key)
  }
  // El conjunto en uso arranca con los conservados y los bloqueados, para no chocar con ninguno.
  const used = new Set([...kept, ...blocked])
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
