/**
 * packages/db: capa de datos con Drizzle (SPEC 11). Migraciones solo con drizzle-kit.
 * Paso 6: esquema fundacional (worlds, users, game_state, tick_log) y el arrancador de
 * migraciones con advisory lock.
 */
export * from './schema.js'
export { createDb, type Database, type DbClient } from './client.js'
export { runMigrations } from './migrate.js'
