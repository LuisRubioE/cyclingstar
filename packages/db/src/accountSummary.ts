import { and, count, eq, gt } from 'drizzle-orm'
import type { Database } from './client.js'
import { accounts, sessions, users } from './schema.js'

/**
 * LOS VALORES DE LA LISTA DE `Account` (docs/cuenta.md §12.1; 12-b): lo que lee `GET /api/me/account`.
 * `passwordChangedAt` es `accounts.updated_at` de la fila `credential` (null si la cuenta no tiene
 * contraseña); `devices`, las sesiones sin caducar. Null si la cuenta no existe.
 */
export interface AccountSummary {
  readonly email: string
  readonly joinedAt: Date
  readonly birthDateSet: boolean
  readonly passwordChangedAt: Date | null
  readonly devices: number
  readonly emailUndeliverableAt: Date | null
}

export async function accountSummary(
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<AccountSummary | null> {
  const [u] = await db
    .select({
      email: users.email,
      createdAt: users.createdAt,
      birthDate: users.birthDate,
      emailUndeliverableAt: users.emailUndeliverableAt,
    })
    .from(users)
    .where(eq(users.id, userId))
  if (u === undefined) return null
  const [cred] = await db
    .select({ updatedAt: accounts.updatedAt })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential')))
    .limit(1)
  const [vivas] = await db
    .select({ n: count() })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, now)))
  return {
    email: u.email,
    joinedAt: u.createdAt,
    birthDateSet: u.birthDate !== null,
    passwordChangedAt: cred?.updatedAt ?? null,
    devices: vivas?.n ?? 0,
    emailUndeliverableAt: u.emailUndeliverableAt,
  }
}
