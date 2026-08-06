#!/usr/bin/env node
/**
 * Aplica las migraciones de Drizzle contra la base de datos de DATABASE_URL usando
 * exactamente el mismo camino que producción (packages/db/src/migrate.ts: advisory lock
 * + extensión citext + drizzle migrator). Pensado para CI: se ejecuta contra una base
 * vacía del servicio Postgres del workflow y verifica que el esquema aplica limpio.
 *
 * Requiere que packages/db esté compilado (`tsc -b packages/db`).
 *
 * Uso:  DATABASE_URL=postgres://… node scripts/ci-migrate.mjs
 */
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const migrateJs = new URL('../packages/db/dist/migrate.js', import.meta.url)

if (!existsSync(fileURLToPath(migrateJs))) {
  console.error(
    'No existe packages/db/dist/migrate.js. Compila primero: pnpm exec tsc -b packages/db',
  )
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Falta DATABASE_URL.')
  process.exit(1)
}

const { runMigrations } = await import(migrateJs.href)

const started = Date.now()
await runMigrations(databaseUrl)
console.log(`Migraciones aplicadas en ${Date.now() - started} ms.`)

// Segunda pasada: aplicar sobre una base ya migrada debe ser un no-op. Es la situación
// real de cada despliegue (el servicio arranca y vuelve a llamar a runMigrations).
await runMigrations(databaseUrl)
console.log('Segunda pasada idempotente: correcta.')
