import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { LOCK_CLASS } from './locks.js'

/**
 * Clave del advisory lock de migración, en la CLASE `migration` (ver locks.ts): fija y compartida
 * por todos los servicios (web y tick), de modo que si arrancan a la vez, uno migra y el otro espera.
 * Al ir en su propia clase ya no puede colisionar con la clave del tick ni con el hash de una carrera.
 */
const MIGRATION_LOCK_KEY = 1

/** Carpeta de migraciones generadas por drizzle-kit (packages/db/drizzle). */
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

/**
 * Aplica las migraciones pendientes al arrancar el servicio, antes de escuchar (SPEC 12).
 * Protegida con un advisory lock a nivel de sesión para que dos procesos no colisionen.
 */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1 })
  try {
    await client`SELECT pg_advisory_lock(${LOCK_CLASS.migration}, ${MIGRATION_LOCK_KEY})`
    try {
      // La extensión citext debe existir antes de aplicar el esquema (users.email es citext).
      await client`CREATE EXTENSION IF NOT EXISTS citext`
      const db = drizzle(client)
      await migrate(db, { migrationsFolder })
    } finally {
      await client`SELECT pg_advisory_unlock(${LOCK_CLASS.migration}, ${MIGRATION_LOCK_KEY})`
    }
  } finally {
    await client.end({ timeout: 5 })
  }
}
