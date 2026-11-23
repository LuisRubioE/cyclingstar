import { type InferSelectModel, asc, desc, eq, getTableColumns, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { watchRowsOfUser } from './watch.js'
import {
  contracts,
  emailLog,
  riderDailyLog,
  riders,
  teams,
  trainingPlans,
  transactions,
  users,
} from './schema.js'

type UserRow = InferSelectModel<typeof users>

/**
 * LO QUE SE EXPORTA DE LA BASE (docs/cuenta.md §10.5; D-39, 10-f). La ruta le añade los aparatos (§6.4) y
 * los aparatos con avisos (`[]` hasta el PR 14; 10-g). Sin la contraseña ni su hash, sin tokens ni IP, sin
 * claves de `auth_limits` ni `admin_audit`; de `users` quedan fuera `passwordHash`, `isAdmin`, `deviceEpoch`,
 * `name` e `image`, y de `email_log`, el HMAC del buzón y el id de Resend.
 */
export interface AccountExportData {
  account: Omit<UserRow, (typeof FUERA_DE_USERS)[number]>
  racesFollowed: Awaited<ReturnType<typeof watchRowsOfUser>>
  rider: {
    rider: InferSelectModel<typeof riders>
    plans: InferSelectModel<typeof trainingPlans>[]
    log: InferSelectModel<typeof riderDailyLog>[]
    transactions: InferSelectModel<typeof transactions>[]
    contract: InferSelectModel<typeof contracts> | null
  } | null
  /** Solo si el equipo es suyo. */
  team: InferSelectModel<typeof teams> | null
  emails: { kind: 'verify_signup' | 'reset_password'; status: string; createdAt: string }[]
}

/** Lo que no sale de `users` (10-f). */
const FUERA_DE_USERS = ['passwordHash', 'isAdmin', 'deviceEpoch', 'name', 'image'] as const

/** Los datos de la cuenta para la exportación, o null si no existe. */
export async function accountExportData(
  db: Database,
  userId: string,
): Promise<AccountExportData | null> {
  // Las columnas de `users` sin lo interno ni lo que no es suyo (10-f): ni se leen.
  const todas = getTableColumns(users)
  const columnas = Object.fromEntries(
    Object.entries(todas).filter(([k]) => !(FUERA_DE_USERS as readonly string[]).includes(k)),
  ) as Omit<typeof todas, (typeof FUERA_DE_USERS)[number]>
  const [account] = await db.select(columnas).from(users).where(eq(users.id, userId)).limit(1)
  if (!account) return null

  const racesFollowed = await watchRowsOfUser(db, userId)
  // El corredor en activo; si ya no tiene, el último que tuvo.
  const [corredor] = await db
    .select()
    .from(riders)
    .where(eq(riders.userId, userId))
    .orderBy(sql`${riders.retiredAt} is not null`, desc(riders.retiredAt))
    .limit(1)
  let rider: AccountExportData['rider'] = null
  if (corredor) {
    const id = corredor.id
    const [contrato] = await db.select().from(contracts).where(eq(contracts.riderId, id)).limit(1)
    rider = {
      rider: corredor,
      plans: await db
        .select()
        .from(trainingPlans)
        .where(eq(trainingPlans.riderId, id))
        .orderBy(asc(trainingPlans.startDay)),
      log: await db
        .select()
        .from(riderDailyLog)
        .where(eq(riderDailyLog.riderId, id))
        .orderBy(asc(riderDailyLog.gameDay)),
      transactions: await db
        .select()
        .from(transactions)
        .where(eq(transactions.riderId, id))
        .orderBy(asc(transactions.gameDay)),
      contract: contrato ?? null,
    }
  }
  const [team] = await db.select().from(teams).where(eq(teams.ownerUserId, userId)).limit(1)
  const correos = await db
    .select({ kind: emailLog.kind, status: emailLog.status, createdAt: emailLog.createdAt })
    .from(emailLog)
    .where(eq(emailLog.userId, userId))
    .orderBy(asc(emailLog.createdAt))

  return {
    account,
    racesFollowed,
    rider,
    team: team ?? null,
    emails: correos.map((c) => ({
      kind: c.kind as 'verify_signup' | 'reset_password',
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
  }
}
