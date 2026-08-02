import { and, eq, isNull } from 'drizzle-orm'
import type { Database } from './client.js'
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
