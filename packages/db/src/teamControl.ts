import { isKnownCountry } from '@cyclingstar/shared'
import { and, eq, isNull, ne, sql } from 'drizzle-orm'
import { isNameBlocked } from './blocklist.js'
import type { Database } from './client.js'
import { isBlockedName } from './names.js'
import { riders, teams, users } from './schema.js'

/**
 * Control de equipos por jugadores (SPEC 7). Un jugador con cuenta premium que corre en un equipo
 * bot puede tomar su control y convertirlo en un equipo humano (luego podrá editar nombre, país y
 * maillot, y gestionarlo). Aquí viven la concesión de premium (admin) y la toma de control.
 */

/** Estado de control de equipo del usuario, para decidir si mostrar el botón de "tomar control". */
export interface AccountControl {
  premium: boolean
  isAdmin: boolean
  /** Equipo del ciclista del usuario, si tiene, y si sigue siendo bot (reclamable). */
  team: { id: string; name: string; isBot: boolean; ownedByMe: boolean } | null
}

/** Flags de la cuenta y el equipo del ciclista del usuario (si lo tiene). */
export async function getAccountControl(
  db: Database,
  userId: string,
): Promise<AccountControl | null> {
  const userRows = await db
    .select({ premium: users.premium, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const u = userRows[0]
  if (!u) return null

  const teamRows = await db
    .select({ id: teams.id, name: teams.name, ownerUserId: teams.ownerUserId })
    .from(riders)
    .innerJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(riders.userId, userId), isNull(riders.retiredAt)))
    .limit(1)
  const t = teamRows[0]
  return {
    premium: u.premium,
    isAdmin: u.isAdmin,
    team: t
      ? {
          id: t.id,
          name: t.name,
          isBot: t.ownerUserId === null,
          ownedByMe: t.ownerUserId === userId,
        }
      : null,
  }
}

/** Concede o retira premium por email (acción de admin). Devuelve si encontró al usuario. */
export async function setUserPremium(
  db: Database,
  email: string,
  premium: boolean,
): Promise<{ updated: boolean }> {
  const res = await db
    .update(users)
    .set({ premium })
    .where(eq(users.email, email.trim().toLowerCase()))
    .returning({ id: users.id })
  return { updated: res.length > 0 }
}

export type TakeOverResult =
  | { ok: true; teamId: string; teamName: string }
  | { ok: false; reason: 'no_premium' | 'sin_ciclista' | 'sin_equipo' | 'equipo_ya_humano' }

/**
 * El usuario toma el control del equipo bot en el que corre su ciclista. Requisitos: cuenta
 * premium, tener ciclista, que esté en un equipo, y que ese equipo siga siendo bot (sin dueño).
 * Transacción con re-verificación para evitar carreras (dos jugadores del mismo equipo).
 */
export async function takeOverBotTeam(db: Database, userId: string): Promise<TakeOverResult> {
  return db.transaction(async (tx) => {
    const userRows = await tx
      .select({ premium: users.premium })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!userRows[0]?.premium) return { ok: false, reason: 'no_premium' as const }

    const riderRows = await tx
      .select({ teamId: riders.teamId })
      .from(riders)
      .where(and(eq(riders.userId, userId), isNull(riders.retiredAt)))
      .limit(1)
    const rider = riderRows[0]
    if (!rider) return { ok: false, reason: 'sin_ciclista' as const }
    if (!rider.teamId) return { ok: false, reason: 'sin_equipo' as const }

    // Solo reclama si sigue siendo bot (owner nulo): UPDATE condicional para cerrar la carrera.
    const claimed = await tx
      .update(teams)
      .set({ ownerUserId: userId })
      .where(and(eq(teams.id, rider.teamId), isNull(teams.ownerUserId)))
      .returning({ id: teams.id, name: teams.name })
    const team = claimed[0]
    if (!team) return { ok: false, reason: 'equipo_ya_humano' as const }
    return { ok: true, teamId: team.id, teamName: team.name }
  })
}

export interface TeamEdit {
  name?: string | undefined
  country?: string | undefined
  jerseySeed?: string | undefined
}
export type TeamEditResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'sin_equipo'
        | 'nombre_invalido'
        | 'nombre_bloqueado'
        | 'nombre_repetido'
        | 'pais_desconocido'
    }

/** ¿Otro equipo del mundo (no este) ya usa ese nombre? (sin distinción de mayúsculas). */
async function isTeamNameTaken(
  db: Database,
  worldId: string,
  name: string,
  exceptTeamId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        eq(teams.worldId, worldId),
        ne(teams.id, exceptTeamId),
        sql`lower(${teams.name}) = ${name.trim().toLowerCase()}`,
      ),
    )
    .limit(1)
  return rows.length > 0
}

/**
 * Edita el equipo que gestiona el usuario (dueño): nombre, país y maillot. El nombre se valida
 * como el de un corredor: no puede ser un nombre real bloqueado ni repetir el de otro equipo. El
 * país debe existir en el juego. Solo el dueño puede editar su equipo (SPEC 7).
 */
export async function updateOwnedTeam(
  db: Database,
  userId: string,
  edit: TeamEdit,
): Promise<TeamEditResult> {
  const owned = await db
    .select({ id: teams.id, worldId: teams.worldId })
    .from(teams)
    .where(eq(teams.ownerUserId, userId))
    .limit(1)
  const team = owned[0]
  if (!team) return { ok: false, reason: 'sin_equipo' }

  const patch: { name?: string; country?: string; jerseySeed?: string } = {}

  if (edit.name !== undefined) {
    const name = edit.name.trim()
    if (name.length < 2 || name.length > 40) return { ok: false, reason: 'nombre_invalido' }
    if (isBlockedName(name) || (await isNameBlocked(db, 'team', name)))
      return { ok: false, reason: 'nombre_bloqueado' }
    if (await isTeamNameTaken(db, team.worldId, name, team.id))
      return { ok: false, reason: 'nombre_repetido' }
    patch.name = name
  }

  if (edit.country !== undefined) {
    if (!isKnownCountry(edit.country)) return { ok: false, reason: 'pais_desconocido' }
    patch.country = edit.country.toUpperCase()
  }

  if (edit.jerseySeed !== undefined) {
    const seed = edit.jerseySeed.trim()
    if (seed.length < 1 || seed.length > 120) return { ok: false, reason: 'nombre_invalido' }
    patch.jerseySeed = seed
  }

  if (Object.keys(patch).length > 0) {
    await db.update(teams).set(patch).where(eq(teams.id, team.id))
  }
  return { ok: true }
}
