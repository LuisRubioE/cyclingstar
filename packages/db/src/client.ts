import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

/**
 * Límites del pool de conexiones. Sin ellos, postgres.js abre hasta 10 conexiones y no las cierra
 * nunca por inactividad, y una base que no responde deja las peticiones colgadas indefinidamente.
 * Ajustables por entorno: el servicio web y el del tick no necesitan lo mismo.
 */
function poolNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  const n = raw != null ? Number(raw) : Number.NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * Crea el cliente de base de datos (postgres.js) y el ORM Drizzle tipado con el esquema.
 * Devuelve también el cliente crudo para poder cerrarlo (`client.end()`).
 */
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    // Techo de conexiones del proceso: el Postgres gestionado tiene pocas y hay dos servicios
    // (web y tick) más las migraciones del arranque compitiendo por ellas.
    max: poolNumber('DB_POOL_MAX', 10),
    // Suelta las conexiones ociosas (segundos) en vez de acapararlas para siempre.
    idle_timeout: poolNumber('DB_IDLE_TIMEOUT_S', 30),
    // Falla rápido (segundos) si la base no acepta conexiones, en vez de colgar la petición.
    connect_timeout: poolNumber('DB_CONNECT_TIMEOUT_S', 10),
  })
  const db = drizzle(client, { schema })
  return { db, client }
}

export type DbClient = ReturnType<typeof createDb>
export type Database = DbClient['db']
