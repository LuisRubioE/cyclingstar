/**
 * Cliente de la lista de bloqueo de nombres (solo admins). Se autentica con el ADMIN_TOKEN
 * (el mismo que protege /admin/tick), guardado en localStorage y enviado como x-admin-token.
 */

export type BlockedKind = 'team' | 'rider'

export interface BlockedName {
  id: string
  kind: BlockedKind
  value: string
  note: string | null
  createdAt: string
}

const TOKEN_KEY = 'cs_admin_token'

export function getAdminToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim())
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/** Error con marca de "no autorizado" para que la página pida el token de nuevo. */
export class AdminAuthError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers ?? {}), 'x-admin-token': getAdminToken() },
  })
  if (res.status === 401) throw new AdminAuthError('Invalid admin token.')
  if (!res.ok) throw new Error('Request failed.')
  return (await res.json()) as T
}

export async function fetchBlocklist(kind: BlockedKind): Promise<BlockedName[]> {
  const data = await request<{ ok: boolean; items: BlockedName[] }>(
    `/api/admin/blocklist?kind=${kind}`,
  )
  return data.items
}

export async function addBlocked(
  kind: BlockedKind,
  value: string,
  note?: string,
): Promise<{ inserted: boolean }> {
  return request<{ ok: boolean; inserted: boolean }>('/api/admin/blocklist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, value, note: note?.trim() || undefined }),
  })
}

export async function removeBlocked(id: string): Promise<void> {
  await request(`/api/admin/blocklist/${id}`, { method: 'DELETE' })
}
