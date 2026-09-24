/**
 * Cliente de la base de admins (cuentas, lista de bloqueo, salud del mundo, premium).
 *
 * DOS FORMAS DE ENTRAR. Un administrador con sesión (columna `is_admin` o `ADMIN_EMAIL`) ya no
 * necesita token: la cookie de sesión viaja sola y la API lo reconoce. Por eso cada función recibe
 * una `AdminKey`: `null` es «con mi sesión», una cadena es el ADMIN_TOKEN de siempre.
 *
 * SEGURIDAD: el ADMIN_TOKEN es el secreto de mayor privilegio del juego (premium, blocklist, salud
 * del mundo). Antes vivía en `localStorage`, donde cualquier XSS podía leerlo y donde además
 * sobrevivía a cierres del navegador. Ahora NO se persiste en ningún sitio: viaja como argumento
 * explícito desde el estado de React de la página de admin y desaparece al recargar, así que hay
 * que introducirlo en cada sesión de administración. La cabecera sigue siendo `x-admin-token`
 * porque la API no cambia.
 */

import {
  type AdminUser,
  type AdminWhoami,
  type BlockedKind,
  type BlockedName,
  type TickLogRow,
  type WorldHealth,
  blocklistAddResponseSchema,
  blocklistResponseSchema,
  adminUsersResponseSchema,
  adminWhoamiResponseSchema,
  okResponseSchema,
  worldHealthResponseSchema,
} from '@cyclingstar/shared'
import type { ZodType } from 'zod'
import { ApiError, type RequestOptions, request, requestOptionalAuth } from './request'

export type { AdminUser, AdminWhoami, BlockedKind, BlockedName, TickLogRow, WorldHealth }

/** Cómo se identifica el admin: `null` con su sesión, o el ADMIN_TOKEN pegado a mano. */
export type AdminKey = string | null

/** Error con marca de "no autorizado" para que la página pida el token de nuevo. */
export class AdminAuthError extends Error {}

/** Petición de admin: añade el token si lo hay y traduce el 401 a `AdminAuthError`. */
async function adminRequest<T>(
  token: AdminKey,
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await request(path, schema, {
      ...options,
      headers: { ...(options.headers ?? {}), ...(token ? { 'x-admin-token': token } : {}) },
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new AdminAuthError('Invalid admin token.')
    }
    throw error
  }
}

export async function fetchBlocklist(token: AdminKey, kind: BlockedKind): Promise<BlockedName[]> {
  const data = await adminRequest(
    token,
    `/api/admin/blocklist?kind=${kind}`,
    blocklistResponseSchema,
  )
  return data.items
}

export async function addBlocked(
  token: AdminKey,
  kind: BlockedKind,
  value: string,
  note?: string,
): Promise<{ inserted: boolean }> {
  const data = await adminRequest(token, '/api/admin/blocklist', blocklistAddResponseSchema, {
    method: 'POST',
    json: { kind, value, note: note?.trim() || undefined },
  })
  return { inserted: data.inserted }
}

export async function removeBlocked(token: AdminKey, id: string): Promise<void> {
  await adminRequest(token, `/api/admin/blocklist/${id}`, okResponseSchema, { method: 'DELETE' })
}

export async function fetchWorldHealth(token: AdminKey): Promise<WorldHealth> {
  const data = await adminRequest(token, '/api/admin/health', worldHealthResponseSchema)
  return data.health
}

/** Concede o retira premium a una cuenta por email (habilita tomar el control de equipos bot). */
export async function setPremium(token: AdminKey, email: string, premium: boolean): Promise<void> {
  await adminRequest(token, '/api/admin/premium', okResponseSchema, {
    method: 'POST',
    json: { email: email.trim(), premium },
  })
}

/**
 * ¿Soy admin con mi sesión? `null` si no. Usa la variante que NO propaga el 401: un jugador que
 * no es admin no ha perdido la sesión, y el manejador global lo mandaría al login.
 */
export async function fetchAdminWhoami(): Promise<AdminWhoami | null> {
  return requestOptionalAuth('/api/admin/whoami', adminWhoamiResponseSchema)
}

/** Cuentas del juego, las más nuevas primero, filtradas por un trozo del correo. */
export async function fetchAdminUsers(token: AdminKey, search: string): Promise<AdminUser[]> {
  const q = search.trim()
  const data = await adminRequest(
    token,
    `/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    adminUsersResponseSchema,
  )
  return data.users
}

/** Lo que el panel puede cambiar de una cuenta. */
export interface AdminUserPatch {
  emailVerified?: boolean
  isAdmin?: boolean
  premium?: boolean
}

export async function updateAdminUser(
  token: AdminKey,
  id: string,
  patch: AdminUserPatch,
): Promise<void> {
  await adminRequest(token, `/api/admin/users/${id}`, okResponseSchema, {
    method: 'PATCH',
    json: patch,
  })
}

/** Borra la cuenta: su corredor y su equipo se quedan en el mundo como NPC. */
export async function deleteAdminUser(token: AdminKey, id: string): Promise<void> {
  await adminRequest(token, `/api/admin/users/${id}`, okResponseSchema, { method: 'DELETE' })
}
