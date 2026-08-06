/**
 * Cliente de la base de admins (lista de bloqueo, salud del mundo, premium).
 *
 * SEGURIDAD: el ADMIN_TOKEN es el secreto de mayor privilegio del juego (premium, blocklist, salud
 * del mundo). Antes vivía en `localStorage`, donde cualquier XSS podía leerlo y donde además
 * sobrevivía a cierres del navegador. Ahora NO se persiste en ningún sitio: viaja como argumento
 * explícito desde el estado de React de la página de admin y desaparece al recargar, así que hay
 * que introducirlo en cada sesión de administración. La cabecera sigue siendo `x-admin-token`
 * porque la API no cambia.
 */

import {
  type BlockedKind,
  type BlockedName,
  type TickLogRow,
  type WorldHealth,
  blocklistAddResponseSchema,
  blocklistResponseSchema,
  okResponseSchema,
  worldHealthResponseSchema,
} from '@cyclingstar/shared'
import type { ZodType } from 'zod'
import { ApiError, type RequestOptions, request } from './request'

export type { BlockedKind, BlockedName, TickLogRow, WorldHealth }

/** Error con marca de "no autorizado" para que la página pida el token de nuevo. */
export class AdminAuthError extends Error {}

/** Petición de admin: añade la cabecera del token y traduce el 401 a `AdminAuthError`. */
async function adminRequest<T>(
  token: string,
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await request(path, schema, {
      ...options,
      headers: { ...(options.headers ?? {}), 'x-admin-token': token },
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new AdminAuthError('Invalid admin token.')
    }
    throw error
  }
}

export async function fetchBlocklist(token: string, kind: BlockedKind): Promise<BlockedName[]> {
  const data = await adminRequest(
    token,
    `/api/admin/blocklist?kind=${kind}`,
    blocklistResponseSchema,
  )
  return data.items
}

export async function addBlocked(
  token: string,
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

export async function removeBlocked(token: string, id: string): Promise<void> {
  await adminRequest(token, `/api/admin/blocklist/${id}`, okResponseSchema, { method: 'DELETE' })
}

export async function fetchWorldHealth(token: string): Promise<WorldHealth> {
  const data = await adminRequest(token, '/api/admin/health', worldHealthResponseSchema)
  return data.health
}

/** Concede o retira premium a una cuenta por email (habilita tomar el control de equipos bot). */
export async function setPremium(token: string, email: string, premium: boolean): Promise<void> {
  await adminRequest(token, '/api/admin/premium', okResponseSchema, {
    method: 'POST',
    json: { email: email.trim(), premium },
  })
}
