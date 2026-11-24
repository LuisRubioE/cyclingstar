import type { UserStatus } from '@cyclingstar/shared'
import { and, asc, desc, eq, ilike, inArray, isNull, ne, sql } from 'drizzle-orm'
import { type AdminAuditEntry, forgetAuditEmails, writeAdminAudit } from './adminAudit.js'
import { addBlocked, removeBlocked } from './blocklist.js'
import type { Database } from './client.js'
import { blockedNames, riders, sessions, teams, users, verifications } from './schema.js'
import { releaseUserToWorld, teamNameProblem } from './teamControl.js'

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
  /** `pending` hasta que un administrador la aprueba (docs/cuenta.md §4.9). */
  status: UserStatus
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
  opts: {
    search?: string | undefined
    rootEmail?: string | undefined
    /** Solo las de este estado; `pending` sale de la más vieja a la más nueva (la cola de §4.9). */
    status?: UserStatus | undefined
  } = {},
): Promise<AdminUserRow[]> {
  const search = opts.search?.trim()
  const filtros = [
    search ? ilike(users.email, `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`) : undefined,
    opts.status ? eq(users.status, opts.status) : undefined,
  ]
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      isAdmin: users.isAdmin,
      premium: users.premium,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...filtros))
    .orderBy(opts.status === 'pending' ? asc(users.createdAt) : desc(users.createdAt))
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
    status: r.status,
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
  /** El correo nuevo (docs/cuenta.md §5.5): se normaliza aquí, con `trim` y minúsculas. */
  email?: string | undefined
  /** Con un correo nuevo, cerrar todas las sesiones de la cuenta; por defecto, sí (§8.5). */
  signOutEverywhere?: boolean | undefined
  /**
   * La fecha de nacimiento rectificada (§4.5), ya validada con `birthDateSchema` por la ruta. Su fila de
   * `admin_audit` no guarda el valor: `Recent changes` dice `date of birth · changed`.
   */
  birthDate?: string | undefined
}

export type AdminUserPatchResult =
  | {
      ok: true
      /** El correo cambió: la ruta manda `email_changed` (§13.1). */ emailChanged?: true
    }
  | { ok: false; reason: 'no_existe' | 'admin_email_fijo' | 'correo_ocupado' }

/** ¿Es `email` el de `ADMIN_EMAIL`? Confirmado o no: aquí manda la dirección. */
function isAdminEmail(email: string, rootEmail: string | undefined): boolean {
  return rootEmail !== undefined && email.toLowerCase() === rootEmail.trim().toLowerCase()
}

/**
 * Aplica el cambio con una fila de `admin_audit` por campo que cambia, todo en una transacción
 * (docs/cuenta.md §8.5). El correo (§5.5): ni el viejo ni el nuevo pueden ser `ADMIN_EMAIL`, no puede
 * usarlo otra cuenta, queda confirmado porque el administrador responde de la dirección, no sale ningún
 * correo y, con `signOutEverywhere`, se cierran todas las sesiones. La cuenta raíz la frena la ruta.
 */
export async function updateUserAsAdmin(
  db: Database,
  userId: string,
  patch: AdminUserPatch,
  opts: { actor: string; rootEmail?: string | undefined },
): Promise<AdminUserPatchResult> {
  return db.transaction(async (tx) => {
    const [antes] = await tx
      .select({
        email: users.email,
        emailVerified: users.emailVerified,
        isAdmin: users.isAdmin,
        premium: users.premium,
        birthDate: users.birthDate,
      })
      .from(users)
      .where(eq(users.id, userId))
      .for('update')
    if (!antes) return { ok: false, reason: 'no_existe' }

    const set: {
      email?: string
      emailUndeliverableAt?: Date | null
      emailVerified?: boolean
      isAdmin?: boolean
      premium?: boolean
      birthDate?: string
    } = {}
    const filas: AdminAuditEntry[] = []
    const apunta = (
      action: AdminAuditEntry['action'],
      field: string,
      from: string | boolean | null,
      to: string | boolean | null,
    ) => filas.push({ action, targetUserId: userId, detail: { field, from, to } })

    const email = patch.email?.trim().toLowerCase()
    const cambiaCorreo = email !== undefined && email !== antes.email.toLowerCase()
    if (cambiaCorreo) {
      if (isAdminEmail(antes.email, opts.rootEmail) || isAdminEmail(email, opts.rootEmail)) {
        return { ok: false, reason: 'admin_email_fijo' }
      }
      const ocupado = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, userId)))
        .limit(1)
      if (ocupado.length > 0) return { ok: false, reason: 'correo_ocupado' }
      set.email = email
      // El correo nuevo no ha rebotado: la marca del buzón que no recibe se va con el viejo (§9.3; 9-d).
      set.emailUndeliverableAt = null
      apunta('user.email', 'email', antes.email, email)
    }
    const verificado = cambiaCorreo ? true : patch.emailVerified
    if (verificado !== undefined && verificado !== antes.emailVerified) {
      set.emailVerified = verificado
      apunta('user.email_verified', 'emailVerified', antes.emailVerified, verificado)
    }
    if (patch.isAdmin !== undefined && patch.isAdmin !== antes.isAdmin) {
      set.isAdmin = patch.isAdmin
      apunta('user.is_admin', 'isAdmin', antes.isAdmin, patch.isAdmin)
    }
    if (patch.premium !== undefined && patch.premium !== antes.premium) {
      set.premium = patch.premium
      apunta('user.premium', 'premium', antes.premium, patch.premium)
    }
    // La fecha, sin el valor en la fila: es un dato personal y el registro lo leen todos los administradores.
    if (patch.birthDate !== undefined && patch.birthDate !== antes.birthDate) {
      set.birthDate = patch.birthDate
      apunta('user.birth_date', 'birthDate', null, null)
    }
    if (filas.length === 0) return { ok: true }

    await tx
      .update(users)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(users.id, userId))
    // `Sign out everywhere` (§5.5): cierra las sesiones y, desde el PR 6, sube `device_epoch`, así que
    // ningún navegador sigue contando como aparato conocido de esa cuenta (§7.5).
    if (cambiaCorreo && patch.signOutEverywhere !== false) {
      await tx.delete(sessions).where(eq(sessions.userId, userId))
      await tx
        .update(users)
        .set({ deviceEpoch: sql`${users.deviceEpoch} + 1` })
        .where(eq(users.id, userId))
    }
    await writeAdminAudit(tx as unknown as Database, opts.actor, filas)
    return cambiaCorreo ? { ok: true, emailChanged: true } : { ok: true }
  })
}

export type DecideResult =
  { ok: true; email: string } | { ok: false; reason: 'no_existe' | 'no_pendiente' }

/** La fila de la cuenta, bloqueada para la transacción, y si sigue pendiente. */
async function pendiente(
  tx: Database,
  userId: string,
): Promise<{ ok: true; email: string } | { ok: false; reason: 'no_existe' | 'no_pendiente' }> {
  const [fila] = await tx
    .select({ email: users.email, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .for('update')
  if (!fila) return { ok: false, reason: 'no_existe' }
  if (fila.status !== 'pending') return { ok: false, reason: 'no_pendiente' }
  return { ok: true, email: fila.email }
}

/**
 * Aprueba una cuenta pendiente (docs/cuenta.md §4.9): `approved`, `approved_at` y su fila de
 * `admin_audit`, juntas. El correo para terminar el registro lo manda la ruta después, con
 * better-auth, que encuentra la cuenta sin confirmar.
 */
export async function approvePendingUser(
  db: Database,
  userId: string,
  actor: string,
): Promise<DecideResult> {
  return db.transaction(async (tx) => {
    const fila = await pendiente(tx as unknown as Database, userId)
    if (!fila.ok) return fila
    await tx
      .update(users)
      .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
    await writeAdminAudit(tx as unknown as Database, actor, [
      {
        action: 'user.status',
        targetUserId: userId,
        detail: { field: 'status', from: 'pending', to: 'approved' },
      },
    ])
    return fila
  })
}

/**
 * Rechaza una cuenta pendiente (docs/cuenta.md §4.9): la borra entera (sus credenciales y sesiones
 * caen en cascada; no tiene corredor ni equipo porque no ha podido entrar) y apunta el rechazo sin el
 * correo. No se guarda nada de quien no entra, así que puede volver a pedir cuenta con el mismo.
 */
export async function rejectPendingUser(
  db: Database,
  userId: string,
  actor: string,
): Promise<DecideResult> {
  return db.transaction(async (tx) => {
    const fila = await pendiente(tx as unknown as Database, userId)
    if (!fila.ok) return fila
    await tx.delete(users).where(eq(users.id, userId))
    await writeAdminAudit(tx as unknown as Database, actor, [
      {
        action: 'user.status',
        targetUserId: userId,
        detail: { field: 'status', from: 'pending', to: 'rejected' },
      },
    ])
    return fila
  })
}

/**
 * BORRAR UNA CUENTA (docs/cuenta.md §10.4; D-38, 10-b, 10-d): lo que hacen el borrado de ajustes
 * (`user.deleteUser.beforeDelete` de better-auth), el del panel y la purga de las cuentas sin confirmar, en
 * UNA transacción: corredor y equipo pasan a la máquina (`releaseUserToWorld`), se borran sus enlaces de
 * `verifications` (`value` = id), sus filas `user.email` de `admin_audit` se quedan sin correos y se borra la
 * fila de `users`. Caen en cascada `sessions`, `accounts` y `race_watch` (y `push_targets` y `notice_log`
 * cuando existan); `email_log.user_id` pasa a nulo. El equipo conserva el nombre que puso el jugador (10-b):
 * si es inapropiado, lo cambia un administrador. O se va entera, o no se toca nada. Devuelve `false` si la
 * cuenta no existía. Dentro de otra transacción, Drizzle la abre como punto de guardado.
 */
export async function deleteAccount(db: Database, userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database
    await releaseUserToWorld(t, userId)
    await tx.delete(verifications).where(eq(verifications.value, userId))
    await forgetAuditEmails(t, userId)
    const out = await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id })
    return out.length > 0
  })
}

/**
 * Borra una cuenta desde el panel: `deleteAccount` y su fila `user.delete`, en la misma transacción.
 * Devuelve `false` si la cuenta no existía.
 */
export async function deleteUserAsAdmin(
  db: Database,
  userId: string,
  actor: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    if (!(await deleteAccount(tx as unknown as Database, userId))) return false
    await writeAdminAudit(tx as unknown as Database, actor, [
      {
        action: 'user.delete',
        targetUserId: userId,
        detail: { field: 'account', from: null, to: null },
      },
    ])
    return true
  })
}

/** Premium por correo (`POST /api/admin/premium`), con su fila `user.premium` si cambia. */
export async function setUserPremiumAsAdmin(
  db: Database,
  email: string,
  premium: boolean,
  actor: string,
): Promise<{ updated: boolean }> {
  return db.transaction(async (tx) => {
    const [antes] = await tx
      .select({ id: users.id, premium: users.premium })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .for('update')
    if (!antes) return { updated: false }
    if (antes.premium === premium) return { updated: true }
    await tx.update(users).set({ premium }).where(eq(users.id, antes.id))
    await writeAdminAudit(tx as unknown as Database, actor, [
      {
        action: 'user.premium',
        targetUserId: antes.id,
        detail: { field: 'premium', from: antes.premium, to: premium },
      },
    ])
    return { updated: true }
  })
}

/** Añade un nombre a la lista de bloqueo con su fila `blocklist.add`, si entra. */
export async function addBlockedAsAdmin(
  db: Database,
  kind: 'team' | 'rider',
  value: string,
  note: string | null,
  actor: string,
): Promise<{ inserted: boolean }> {
  return db.transaction(async (tx) => {
    const out = await addBlocked(tx as unknown as Database, kind, value, note)
    if (out.inserted) {
      await writeAdminAudit(tx as unknown as Database, actor, [
        {
          action: 'blocklist.add',
          targetUserId: null,
          detail: { field: kind, from: null, to: value.trim() },
        },
      ])
    }
    return out
  })
}

/** Quita un nombre de la lista con su fila `blocklist.remove`, si estaba. */
export async function removeBlockedAsAdmin(db: Database, id: string, actor: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [fila] = await tx
      .select({ kind: blockedNames.kind, value: blockedNames.value })
      .from(blockedNames)
      .where(eq(blockedNames.id, id))
    await removeBlocked(tx as unknown as Database, id)
    if (fila) {
      await writeAdminAudit(tx as unknown as Database, actor, [
        {
          action: 'blocklist.remove',
          targetUserId: null,
          detail: { field: fila.kind, from: fila.value, to: null },
        },
      ])
    }
  })
}

export type TeamRenameResult =
  | { ok: true }
  | { ok: false; reason: 'no_existe' | 'nombre_invalido' | 'nombre_bloqueado' | 'nombre_repetido' }

/**
 * Un administrador cambia el nombre de cualquier equipo (docs/cuenta.md §8.5, 8-e), también el de una
 * cuenta borrada o el de un bot, con las reglas de su dueño (`teamNameProblem`) y su fila `team.name`.
 */
export async function renameTeamAsAdmin(
  db: Database,
  teamId: string,
  rawName: string,
  actor: string,
): Promise<TeamRenameResult> {
  return db.transaction(async (tx) => {
    const [team] = await tx
      .select({ name: teams.name, worldId: teams.worldId, owner: teams.ownerUserId })
      .from(teams)
      .where(eq(teams.id, teamId))
      .for('update')
    if (!team) return { ok: false, reason: 'no_existe' }
    const name = rawName.trim()
    if (name === team.name) return { ok: true }
    const problema = await teamNameProblem(tx as unknown as Database, team.worldId, name, teamId)
    if (problema !== null) return { ok: false, reason: problema }
    await tx.update(teams).set({ name }).where(eq(teams.id, teamId))
    await writeAdminAudit(tx as unknown as Database, actor, [
      {
        action: 'team.name',
        targetUserId: team.owner,
        detail: { field: 'name', from: team.name, to: name, teamId },
      },
    ])
    return { ok: true }
  })
}

/** El dueño humano de un equipo, para la fila de `admin_audit` de lo que se le hace a su equipo. */
export async function teamOwnerOf(db: Database, teamId: string): Promise<string | null> {
  const [fila] = await db
    .select({ owner: teams.ownerUserId })
    .from(teams)
    .where(eq(teams.id, teamId))
  return fila?.owner ?? null
}

/**
 * El estado de una cuenta por su id o por su correo, leído de la base (docs/cuenta.md §4.9): lo
 * miran las funciones de correo de `auth.ts`, sin fiarse del objeto que les pasa better-auth, y el
 * proxy en el 403 de `sign-in/email`. Null si no existe.
 */
export async function userStatusOf(
  db: Database,
  by: { id: string } | { email: string },
): Promise<UserStatus | null> {
  const [fila] = await db
    .select({ status: users.status })
    .from(users)
    .where('id' in by ? eq(users.id, by.id) : eq(users.email, by.email.trim().toLowerCase()))
    .limit(1)
  return fila?.status ?? null
}
