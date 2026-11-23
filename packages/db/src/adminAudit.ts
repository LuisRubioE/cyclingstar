import type { AdminAuditDetail } from '@cyclingstar/shared'
import { and, desc, eq, lt, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { adminAudit, users } from './schema.js'

/**
 * EL REGISTRO DEL PANEL (docs/cuenta.md §8.5; 8-d, 8-i). Cada cambio que hace un administrador deja
 * una fila por campo, en la misma transacción que el cambio: si el cambio no se guarda, la fila
 * tampoco, y al revés. `actor` es el id de la cuenta que actúa, o `'token'` si entra por `ADMIN_TOKEN`.
 */

/** Las acciones que se apuntan (§15.1). */
export type AdminAuditAction =
  | 'user.status'
  | 'user.email'
  | 'user.email_verified'
  | 'user.is_admin'
  | 'user.premium'
  | 'user.birth_date'
  | 'user.delete'
  | 'team.name'
  | 'team.kit_revert'
  | 'blocklist.add'
  | 'blocklist.remove'
  | 'world.tick'
  | 'world.advance'

export interface AdminAuditEntry {
  readonly action: AdminAuditAction
  readonly targetUserId: string | null
  readonly detail: AdminAuditDetail
}

/** Escribe las filas con el mismo `actor`. `db` puede ser una transacción: así van juntas con el cambio. */
export async function writeAdminAudit(
  db: Database,
  actor: string,
  entries: readonly AdminAuditEntry[],
): Promise<void> {
  if (entries.length === 0) return
  await db.insert(adminAudit).values(
    entries.map((e) => ({
      actor,
      action: e.action,
      targetUserId: e.targetUserId,
      detail: e.detail,
    })),
  )
}

/**
 * Al borrar una cuenta, sus filas `user.email` se quedan sin los correos (§10.4): el registro dice
 * que hubo un cambio, no a qué dirección.
 */
export async function forgetAuditEmails(db: Database, userId: string): Promise<void> {
  await db
    .update(adminAudit)
    .set({ detail: sql`${adminAudit.detail} || '{"from": null, "to": null}'::jsonb` })
    .where(and(eq(adminAudit.targetUserId, userId), eq(adminAudit.action, 'user.email')))
}

/** Una fila tal como la lee el panel (`Recent changes`). */
export interface AdminAuditRow {
  id: string
  at: string
  actor: string
  /** El correo de la cuenta que actuó, si sigue existiendo; null con `'token'`. */
  actorEmail: string | null
  action: string
  targetUserId: string | null
  detail: AdminAuditDetail
}

/** Tope de filas por página (8-f). */
export const ADMIN_AUDIT_MAX_ROWS = 500

/** Las más nuevas primero; con `before`, solo las anteriores a ese instante (la página siguiente). */
export async function listAdminAudit(
  db: Database,
  opts: { limit: number; before?: Date | undefined },
): Promise<AdminAuditRow[]> {
  const limit = Math.min(ADMIN_AUDIT_MAX_ROWS, Math.max(1, Math.floor(opts.limit)))
  const rows = await db
    .select({
      id: adminAudit.id,
      at: adminAudit.at,
      actor: adminAudit.actor,
      actorEmail: users.email,
      action: adminAudit.action,
      targetUserId: adminAudit.targetUserId,
      detail: adminAudit.detail,
    })
    .from(adminAudit)
    .leftJoin(users, sql`${users.id}::text = ${adminAudit.actor}`)
    .where(opts.before ? lt(adminAudit.at, opts.before) : undefined)
    .orderBy(desc(adminAudit.at), desc(adminAudit.id))
    .limit(limit)
  return rows.map((r) => ({ ...r, at: r.at.toISOString(), actorEmail: r.actorEmail ?? null }))
}
