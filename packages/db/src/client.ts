import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

/**
 * Crea el cliente de base de datos (postgres.js) y el ORM Drizzle tipado con el esquema.
 * Devuelve también el cliente crudo para poder cerrarlo (`client.end()`).
 */
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl)
  const db = drizzle(client, { schema })
  return { db, client }
}

export type DbClient = ReturnType<typeof createDb>
export type Database = DbClient['db']
