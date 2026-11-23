import { and, eq, isNull } from 'drizzle-orm'
import type { Database } from './client.js'
import { users } from './schema.js'

/**
 * LA FECHA DE NACIMIENTO DE UNA CUENTA (docs/cuenta.md §4.3 y §4.5). La escribe el registro (better-auth, con
 * `birthDateSchema`), una vez `PUT /api/me/birth-date` en las cuentas anteriores al PR 9 de E4 y, para
 * rectificarla, un administrador desde el panel (`updateUserAsAdmin`). Nadie la enseña.
 */

/** Si la cuenta tiene fecha: true o false, o null si la cuenta no existe. */
export async function hasBirthDate(db: Database, userId: string): Promise<boolean | null> {
  const [u] = await db
    .select({ birthDate: users.birthDate })
    .from(users)
    .where(eq(users.id, userId))
  return u === undefined ? null : u.birthDate !== null
}

/**
 * Escribe la fecha si la cuenta no tenía (§4.5): `set`, `already_set` si ya tenía una (no la cambia) o
 * `no_existe`. La condición va en el mismo `UPDATE`, así que dos peticiones a la vez no escriben dos veces.
 */
export async function setBirthDateOnce(
  db: Database,
  userId: string,
  birthDate: string,
): Promise<'set' | 'already_set' | 'no_existe'> {
  const filas = await db
    .update(users)
    .set({ birthDate, updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.birthDate)))
    .returning({ id: users.id })
  if (filas.length > 0) return 'set'
  return (await hasBirthDate(db, userId)) === null ? 'no_existe' : 'already_set'
}
