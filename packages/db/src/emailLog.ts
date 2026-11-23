import { and, count, eq, gt, gte, sql } from 'drizzle-orm'
import { type AttemptRule, reserveAttempt } from './authLimits.js'
import type { Database } from './client.js'
import { emailLog, users } from './schema.js'

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]

/**
 * EL REGISTRO DE LOS CORREOS, L5 Y EL PRESUPUESTO DEL DÍA (docs/cuenta.md §7.4, §7.6 y §9.2; D-24, D-26,
 * D-33; 7-f, 7-m). El juego manda solo dos correos; cada envío deja una fila en `email_log`, que es a la vez
 * lo que cuenta L5 (por `recipient_hash`, en la última hora) y L6 (las filas del día UTC).
 */
export const EMAIL_KINDS = ['verify_signup', 'reset_password'] as const
export type EmailKind = (typeof EMAIL_KINDS)[number]

export const EMAIL_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'bounced',
  'complained',
  'suppressed',
  'failed',
] as const
export type EmailStatus = (typeof EMAIL_STATUSES)[number]

/** Los estados que llegan por el webhook de Resend (§9.2). */
export type EmailEventStatus = Extract<
  EmailStatus,
  'delivered' | 'bounced' | 'complained' | 'suppressed' | 'failed'
>

/** Los que dicen que al buzón no se le puede escribir: marcan `users.email_undeliverable_at` (§9.3). */
const UNDELIVERABLE: ReadonlySet<EmailStatus> = new Set(['bounced', 'complained', 'suppressed'])

/** Las cifras de L5 y L6 (`apps/api/src/security.ts` y `MAIL_DAILY_BUDGET`). */
export interface MailBudgetRule {
  /** Envíos del día UTC (`MAIL_DAILY_BUDGET`, 90). */
  dailyBudget: number
  /** Lo que queda solo para `reset_password` (`MAIL_RESET_RESERVE`, 30). */
  resetReserve: number
  /** L5: correos a un mismo buzón por hora (`MAIL_PER_RECIPIENT_HOUR`, 3). */
  perRecipientHour: number
  /** La reserva, una vez por destinatario y día (`rsv:`, 7-m). */
  reservePerRecipient: AttemptRule
}

/** El principio del día UTC de `now`. */
function dayStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** Cuántos correos lleva el día UTC: toda fila cuenta, también la que no llegó a salir. */
export async function emailsToday(db: Database | Tx, now: Date): Promise<number> {
  const [fila] = await db
    .select({ n: count() })
    .from(emailLog)
    .where(gte(emailLog.createdAt, dayStartUtc(now)))
  return Number(fila?.n ?? 0)
}

/**
 * El tope del día para un `kind`: `verify_signup` para a `dailyBudget - resetReserve` (60) y
 * `reset_password` a `dailyBudget` (90). Es un estado global, el mismo para cualquier correo: no delata
 * cuentas (§7.6).
 */
export function dailyCapFor(kind: EmailKind, dailyBudget: number, resetReserve: number): number {
  return kind === 'verify_signup' ? dailyBudget - resetReserve : dailyBudget
}

export type QueueEmailResult =
  { ok: true; id: string } | { ok: false; reason: 'recipient' | 'budget' }

/**
 * Apunta un envío `queued` si cabe en L5 y en el presupuesto; si no, no apunta nada y dice por qué. En una
 * transacción con un cerrojo consultivo: dos envíos a la vez no pasan los dos del último hueco. La reserva
 * de recuperar se gasta solo cuando el cupo general (60) ya no llega, y una sola vez por destinatario y día
 * (`reserveKey`, la clave `rsv:` de `auth_limits`).
 */
export async function queueEmail(
  db: Database,
  entry: {
    kind: EmailKind
    recipientHash: string
    userId: string | null
    reserveKey: string
  },
  rule: MailBudgetRule,
  now: Date,
): Promise<QueueEmailResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('email_log'))`)
    const [porBuzon] = await tx
      .select({ n: count() })
      .from(emailLog)
      .where(
        and(
          eq(emailLog.recipientHash, entry.recipientHash),
          gt(emailLog.createdAt, new Date(now.getTime() - 3_600_000)),
        ),
      )
    if (Number(porBuzon?.n ?? 0) >= rule.perRecipientHour) {
      return { ok: false, reason: 'recipient' } as const
    }
    const hoy = await emailsToday(tx, now)
    const general = rule.dailyBudget - rule.resetReserve
    if (hoy >= dailyCapFor(entry.kind, rule.dailyBudget, rule.resetReserve)) {
      return { ok: false, reason: 'budget' } as const
    }
    if (entry.kind === 'reset_password' && hoy >= general) {
      const r = await reserveAttempt(tx, entry.reserveKey, rule.reservePerRecipient, now)
      if (!r.allowed) return { ok: false, reason: 'budget' } as const
    }
    const [fila] = await tx
      .insert(emailLog)
      .values({
        kind: entry.kind,
        recipientHash: entry.recipientHash,
        userId: entry.userId,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: emailLog.id })
    if (fila === undefined) throw new Error('queueEmail: sin fila')
    return { ok: true, id: fila.id } as const
  })
}

/** Lo que contestó Resend: `sent` con su id, o `failed`. */
export async function settleEmail(
  db: Database,
  id: string,
  outcome: { status: 'sent'; resendId: string | null } | { status: 'failed' },
  now: Date,
): Promise<void> {
  await db
    .update(emailLog)
    .set({
      status: outcome.status,
      ...(outcome.status === 'sent' && outcome.resendId !== null
        ? { resendId: outcome.resendId }
        : {}),
      updatedAt: now,
    })
    .where(eq(emailLog.id, id))
}

/**
 * El orden de los estados: `status` nunca retrocede (9-e). Un `delivered` no pisa a `bounced`,
 * `complained`, `suppressed` ni `failed`, y aplicar dos veces el mismo estado no cambia nada, así que el
 * webhook no necesita guardar `svix-id`.
 */
const RANGO = sql`CASE ${emailLog.status} WHEN 'queued' THEN 0 WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2 ELSE 3 END`
const rangoDe = (s: EmailStatus): number =>
  s === 'queued' ? 0 : s === 'sent' ? 1 : s === 'delivered' ? 2 : 3

/**
 * Un evento del webhook de Resend sobre el correo `resendId` (§9.2). Rebote, queja y supresión ponen
 * `users.email_undeliverable_at`; un `delivered` de un correo creado después de la marca la quita (9-d).
 * Devuelve si cambió algo: un correo que no está o un estado que retrocedería no cambian nada.
 */
export async function applyEmailEvent(
  db: Database,
  resendId: string,
  status: EmailEventStatus,
  now: Date,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [fila] = await tx
      .update(emailLog)
      .set({ status, updatedAt: now })
      .where(and(eq(emailLog.resendId, resendId), sql`${RANGO} < ${rangoDe(status)}`))
      .returning({ userId: emailLog.userId, createdAt: emailLog.createdAt })
    if (fila === undefined) return false
    if (fila.userId !== null) {
      if (UNDELIVERABLE.has(status)) {
        await tx.update(users).set({ emailUndeliverableAt: now }).where(eq(users.id, fila.userId))
      } else if (status === 'delivered') {
        await tx
          .update(users)
          .set({ emailUndeliverableAt: null })
          .where(
            and(
              eq(users.id, fila.userId),
              sql`${users.emailUndeliverableAt} < ${fila.createdAt.toISOString()}::timestamptz`,
            ),
          )
      }
    }
    return true
  })
}
