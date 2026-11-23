import { eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { verifications } from './schema.js'

/**
 * Borra las filas de `verifications` que apuntan a un usuario (`value` = su id): los enlaces de
 * recuperación que le queden vivos. Tras recuperar la contraseña, otro enlace del mismo buzón no debe
 * servir para cambiarla otra vez (docs/cuenta.md §5.4). Devuelve cuántas borró.
 */
export async function deleteUserVerifications(db: Database, userId: string): Promise<number> {
  const borradas = await db
    .delete(verifications)
    .where(eq(verifications.value, userId))
    .returning({ id: verifications.id })
  return borradas.length
}
