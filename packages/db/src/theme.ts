import type { Theme } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { users } from './schema.js'

/**
 * EL MODO DEL JUGADOR (E3, docs/visual.md §3.3, D-00i; paso 23): en `users.theme` (la 0054), para que
 * siga al jugador de un aparato a otro. Lo leen y lo escriben `GET` y `PUT /api/me/theme`; no toca
 * `horizon_rev`, porque no cambia nada de lo que se conoce.
 */

/** El modo de un jugador, o null si la cuenta no existe. */
export async function readTheme(db: Database, userId: string): Promise<Theme | null> {
  const [u] = await db.select({ theme: users.theme }).from(users).where(eq(users.id, userId))
  return u?.theme ?? null
}

/** Guarda el modo de un jugador y da el que queda, o null si la cuenta no existe. */
export async function setTheme(db: Database, userId: string, theme: Theme): Promise<Theme | null> {
  const [u] = await db
    .update(users)
    .set({ theme, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ theme: users.theme })
  return u?.theme ?? null
}
