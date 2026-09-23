import { and, desc, eq, ilike, inArray, isNull } from 'drizzle-orm'
import type { Database } from './client.js'
import { riders, teams, users } from './schema.js'
import { releaseUserToWorld } from './teamControl.js'

/**
 * Gestión de cuentas desde el panel de administración.
 *
 * QUIÉN ES ADMIN. Dos caminos, y ninguno es «saber un secreto»:
 *  - `users.is_admin`, que se concede desde el propio panel;
 *  - el ADMINISTRADOR RAÍZ, la cuenta cuyo correo CONFIRMADO coincide con `ADMIN_EMAIL`. Es cómo
 *    entra el primero: no hay nadie que le pueda dar el permiso, así que se lo da el despliegue.
 *
 * Lo de «confirmado» no es un adorno: sin esa condición, bastaría con registrarse con el correo del
 * dueño (o cambiarse a él) para ser admin. Con ella, hay que abrir un enlace que llega al buzón del
 * dueño. Y se evalúa EN CADA PETICIÓN, no se copia a la columna: si mañana cambia `ADMIN_EMAIL`, el
 * raíz anterior deja de serlo sin que nadie tenga que acordarse de quitárselo.
 */

/** ¿Es `email` (confirmado) el del administrador raíz? Sin `ADMIN_EMAIL` no hay raíz. */
export function isRootAdmin(
  user: { email: string; emailVerified: boolean },
  rootEmail: string | undefined,
): boolean {
  if (!rootEmail) return false
  return user.emailVerified && user.email.toLowerCase() === rootEmail.trim().toLowerCase()
}

/** Correo y confirmación de una cuenta, o null si no existe. */
async function emailOf(
  db: Database,
  userId: string,
): Promise<{ email: string; emailVerified: boolean; isAdmin: boolean } | null> {
  const rows = await db
    .select({ email: users.email, emailVerified: users.emailVerified, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return rows[0] ?? null
}

/** ¿Es esta cuenta la del administrador raíz? */
export async function isRootAdminUser(
  db: Database,
  userId: string,
  rootEmail: string | undefined,
): Promise<boolean> {
  const u = await emailOf(db, userId)
  return u !== null && isRootAdmin(u, rootEmail)
}

/** ¿Tiene permiso de administración este usuario? `false` si no existe. */
export async function isUserAdmin(
  db: Database,
  userId: string,
  rootEmail: string | undefined,
): Promise<boolean> {
  const u = await emailOf(db, userId)
  if (!u) return false
  return u.isAdmin || isRootAdmin(u, rootEmail)
}

/** Una cuenta tal como la ve el panel. */
export interface AdminUserRow {
  id: string
  email: string
  emailVerified: boolean
  /** La columna: lo que se concede y se quita desde el panel. */
  isAdmin: boolean
  /** Admin por `ADMIN_EMAIL`: no se le puede quitar desde el panel. */
  isRootAdmin: boolean
  premium: boolean
  createdAt: string
  /** Corredor en activo de la cuenta, si tiene. */
  rider: { id: string; name: string } | null
  /** Equipo que gestiona, si tiene. */
  team: { id: string; name: string } | null
}

/** Tope de filas: el panel busca por correo, no pagina un censo entero. */
const MAX_ROWS = 200

/**
 * Cuentas, las más nuevas primero, filtradas por un trozo del correo. Corredor y equipo se piden
 * aparte y se cruzan aquí: dos consultas pequeñas en vez de un JOIN que duplicaría filas cuando un
 * usuario tiene corredores retirados.
 */
export async function listUsersForAdmin(
  db: Database,
  opts: { search?: string | undefined; rootEmail?: string | undefined } = {},
): Promise<AdminUserRow[]> {
  const search = opts.search?.trim()
  const base = db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      isAdmin: users.isAdmin,
      premium: users.premium,
      createdAt: users.createdAt,
    })
    .from(users)
  const rows = await (
    search
      ? base.where(ilike(users.email, `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`))
      : base
  )
    .orderBy(desc(users.createdAt))
    .limit(MAX_ROWS)
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const riderRows = await db
    .select({ userId: riders.userId, id: riders.id, name: riders.name })
    .from(riders)
    .where(and(inArray(riders.userId, ids), isNull(riders.retiredAt)))
  const teamRows = await db
    .select({ userId: teams.ownerUserId, id: teams.id, name: teams.name })
    .from(teams)
    .where(inArray(teams.ownerUserId, ids))
  const riderOf = new Map(riderRows.map((r) => [r.userId, { id: r.id, name: r.name }]))
  const teamOf = new Map(teamRows.map((t) => [t.userId, { id: t.id, name: t.name }]))

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    emailVerified: r.emailVerified,
    isAdmin: r.isAdmin,
    isRootAdmin: isRootAdmin(r, opts.rootEmail),
    premium: r.premium,
    createdAt: r.createdAt.toISOString(),
    rider: riderOf.get(r.id) ?? null,
    team: teamOf.get(r.id) ?? null,
  }))
}

/** Lo que el panel puede cambiar de una cuenta. Lo que no venga, no se toca. */
export interface AdminUserPatch {
  emailVerified?: boolean | undefined
  isAdmin?: boolean | undefined
  premium?: boolean | undefined
}

/** Aplica el cambio. Devuelve `false` si la cuenta no existe. */
export async function updateUserAsAdmin(
  db: Database,
  userId: string,
  patch: AdminUserPatch,
): Promise<boolean> {
  const set: { emailVerified?: boolean; isAdmin?: boolean; premium?: boolean; updatedAt: Date } = {
    updatedAt: new Date(),
  }
  if (patch.emailVerified !== undefined) set.emailVerified = patch.emailVerified
  if (patch.isAdmin !== undefined) set.isAdmin = patch.isAdmin
  if (patch.premium !== undefined) set.premium = patch.premium
  const out = await db
    .update(users)
    .set(set)
    .where(eq(users.id, userId))
    .returning({ id: users.id })
  return out.length > 0
}

/**
 * Borra una cuenta desde el panel. Lo mismo que el borrado desde ajustes: corredor y equipo pasan
 * a NPC y la cuenta desaparece, con sus sesiones y credenciales (van en cascada). Todo en una
 * transacción: o se va entera, o no se toca nada. Devuelve `false` si la cuenta no existía.
 */
export async function deleteUserAsAdmin(db: Database, userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await releaseUserToWorld(tx as unknown as Database, userId)
    const out = await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id })
    return out.length > 0
  })
}
