import { and, eq, isNull, lt, lte, notExists, or, sql } from 'drizzle-orm'
import { deleteAccount } from './adminUsers.js'
import type { Database } from './client.js'
import { authLimits, emailLog, noticeLog, riders, teams, users, verifications } from './schema.js'

/**
 * LA PURGA (docs/cuenta.md §15.4 y §16.1; D-34, DD-17 A, 9-g, 15-c). La lanza `runTick` una vez por pasada
 * que procese días, después del último. Los plazos se miden en tiempo real, no en días de juego.
 */

/** `auth_limits`: ninguna ventana pasa de 24 horas. */
export const AUTH_LIMITS_RETENTION_DAYS = 2
/** `email_log`: los rebotes se miran por semanas (§19.4). */
export const EMAIL_LOG_RETENTION_DAYS = 90
/** `notice_log`: ninguna `ref` de aviso vive más de 28 días (15-e). */
export const NOTICE_LOG_RETENTION_DAYS = 90
/** Una cuenta aprobada que no confirma en 7 días desde `approved_at` no se queda (DD-17 A). */
export const PURGE_UNCONFIRMED_DAYS = 7

export interface PurgeSummary {
  authLimits: number
  emailLog: number
  noticeLog: number
  verifications: number
  /** Cuentas aprobadas sin confirmar borradas con `deleteAccount`. */
  accounts: number
}

const DIA_MS = 86_400_000
const antesDe = (now: Date, dias: number): Date => new Date(now.getTime() - dias * DIA_MS)

/**
 * Borra, con `DELETE` idempotentes: `auth_limits` con `window_start` y `day_start` de más de 2 días y sin
 * cierre vivo; `email_log` de más de 90; las `verifications` caducadas; y las cuentas aprobadas y sin
 * confirmar con `approved_at` de más de 7 días, sin corredor ni equipo, una a una por `deleteAccount` (§10.4).
 * Las `pending` no se purgan: las decide un administrador (§4.9, 9-g). Y `notice_log` de más de 90 días.
 */
export async function purgeAccounts(db: Database, now: Date): Promise<PurgeSummary> {
  const limites = antesDe(now, AUTH_LIMITS_RETENTION_DAYS)
  const fueraLimites = await db
    .delete(authLimits)
    .where(
      and(
        lt(authLimits.windowStart, limites),
        lt(authLimits.dayStart, limites),
        or(isNull(authLimits.lockedUntil), lte(authLimits.lockedUntil, now)),
      ),
    )
    .returning({ key: authLimits.key })
  const fueraCorreos = await db
    .delete(emailLog)
    .where(lt(emailLog.createdAt, antesDe(now, EMAIL_LOG_RETENTION_DAYS)))
    .returning({ id: emailLog.id })
  const fueraAvisos = await db
    .delete(noticeLog)
    .where(lt(noticeLog.sentAt, antesDe(now, NOTICE_LOG_RETENTION_DAYS)))
    .returning({ kind: noticeLog.kind })
  const fueraEnlaces = await db
    .delete(verifications)
    .where(lt(verifications.expiresAt, now))
    .returning({ id: verifications.id })

  const sinConfirmar = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.status, 'approved'),
        eq(users.emailVerified, false),
        lt(users.approvedAt, antesDe(now, PURGE_UNCONFIRMED_DAYS)),
        notExists(
          db
            .select({ x: sql`1` })
            .from(riders)
            .where(eq(riders.userId, users.id)),
        ),
        notExists(
          db
            .select({ x: sql`1` })
            .from(teams)
            .where(eq(teams.ownerUserId, users.id)),
        ),
      ),
    )
  let cuentas = 0
  for (const { id } of sinConfirmar) if (await deleteAccount(db, id)) cuentas += 1

  return {
    authLimits: fueraLimites.length,
    emailLog: fueraCorreos.length,
    noticeLog: fueraAvisos.length,
    verifications: fueraEnlaces.length,
    accounts: cuentas,
  }
}
