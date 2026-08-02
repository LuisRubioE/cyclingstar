import { and, asc, eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { blockedNames } from './schema.js'

/**
 * Lista de bloqueo de nombres curada por admins (equipos reales, ciclistas reales, famosos).
 * Se consulta en la generación de nombres (creación humana) y en la reparación del mundo (tick),
 * de modo que un nombre bloqueado nunca se usa y los ya existentes se renombran.
 */

export type BlockedKind = 'team' | 'rider'

export interface BlockedNameRow {
  id: string
  kind: BlockedKind
  value: string
  note: string | null
  createdAt: Date
}

/** Normaliza un nombre para comparar (minúsculas, espacios colapsados). */
export function normalizeBlocked(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Conjunto de valores bloqueados (normalizados) de un tipo, para comprobación rápida. */
export async function getBlockedSet(db: Database, kind: BlockedKind): Promise<Set<string>> {
  const rows = await db
    .select({ valueNorm: blockedNames.valueNorm })
    .from(blockedNames)
    .where(eq(blockedNames.kind, kind))
  return new Set(rows.map((r) => r.valueNorm))
}

/** Lista curada de un tipo, orden alfabético. */
export async function listBlocked(db: Database, kind: BlockedKind): Promise<BlockedNameRow[]> {
  return db
    .select({
      id: blockedNames.id,
      kind: blockedNames.kind,
      value: blockedNames.value,
      note: blockedNames.note,
      createdAt: blockedNames.createdAt,
    })
    .from(blockedNames)
    .where(eq(blockedNames.kind, kind))
    .orderBy(asc(blockedNames.value))
}

/** Añade un nombre a la lista. Idempotente por (kind, value_norm). Devuelve si se insertó. */
export async function addBlocked(
  db: Database,
  kind: BlockedKind,
  value: string,
  note?: string | null,
): Promise<{ inserted: boolean }> {
  const trimmed = value.trim()
  if (!trimmed) return { inserted: false }
  const result = await db
    .insert(blockedNames)
    .values({ kind, value: trimmed, valueNorm: normalizeBlocked(trimmed), note: note ?? null })
    .onConflictDoNothing({ target: [blockedNames.kind, blockedNames.valueNorm] })
    .returning({ id: blockedNames.id })
  return { inserted: result.length > 0 }
}

/** Elimina una entrada por id. */
export async function removeBlocked(db: Database, id: string): Promise<void> {
  await db.delete(blockedNames).where(eq(blockedNames.id, id))
}

/** ¿Está este nombre bloqueado para el tipo dado? */
export async function isNameBlocked(
  db: Database,
  kind: BlockedKind,
  value: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: blockedNames.id })
    .from(blockedNames)
    .where(and(eq(blockedNames.kind, kind), eq(blockedNames.valueNorm, normalizeBlocked(value))))
    .limit(1)
  return rows.length > 0
}
