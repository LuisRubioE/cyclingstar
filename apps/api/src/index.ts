import { runMigrations } from '@cyclingstar/db'
import { buildApp } from './app.js'
import { loadEnv } from './env.js'

/**
 * Arranque del servicio `web` de Railway: `node apps/api/dist/index.js` (SPEC 12).
 * Aplica las migraciones (con advisory lock) ANTES de escuchar, y luego levanta Fastify
 * en el puerto que inyecta la plataforma (PORT) y en 0.0.0.0.
 */
async function main(): Promise<void> {
  const env = loadEnv()

  await runMigrations(env.DATABASE_URL)

  const app = buildApp({ logger: true })
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
