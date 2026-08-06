#!/usr/bin/env node
/**
 * Aplica las migraciones de Drizzle contra DATABASE_URL usando exactamente el mismo camino
 * que el arranque del servicio web (packages/db/src/migrate.ts: advisory lock + extensión
 * citext + migrador de Drizzle). Nunca SQL manual (CLAUDE.md).
 *
 * Dos usos:
 *  - Servicio `tick` de Railway: se ejecuta antes del proceso de tick, que por sí solo NO
 *    migra (ver railway.tick.json y README.md § Migraciones). El advisory lock hace que sea
 *    seguro aunque el servicio web esté migrando a la vez.
 *  - CI: contra una base vacía, con `--verify-idempotent` para comprobar que una segunda
 *    pasada no hace nada (que es lo que ocurre en cada despliegue).
 *
 * Requiere packages/db compilado (`pnpm build` o `pnpm exec tsc -b packages/db`).
 *
 * Uso:  DATABASE_URL=postgres://… node scripts/migrate.mjs [--verify-idempotent]
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
console.log(`migrate: migraciones aplicadas en ${Date.now() - started} ms`)

if (process.argv.includes('--verify-idempotent')) {
  // Aplicar sobre una base ya migrada debe ser un no-op: es la situación real de cada
  // despliegue (el servicio arranca y vuelve a llamar a runMigrations).
  await runMigrations(databaseUrl)
  console.log('migrate: segunda pasada idempotente, correcta')
}
