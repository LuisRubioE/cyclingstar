import { createDb, runMigrations, runTick } from '@cyclingstar/db'
import { ENGINE_VERSION } from '@cyclingstar/engine'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import { loadEnv } from './env.js'

/**
 * Arranque del servicio `web` de Railway: `node apps/api/dist/index.js` (SPEC 12).
 * Aplica las migraciones (con advisory lock) ANTES de escuchar, abre la conexión a la
 * base de datos, configura la autenticación y el tick manual, y levanta Fastify.
 */
async function main(): Promise<void> {
  const env = loadEnv()

  await runMigrations(env.DATABASE_URL)

  const { db } = createDb(env.DATABASE_URL)
  const auth = createAuth(db, { secret: env.SESSION_SECRET, baseURL: env.APP_URL })
  const msPerGameDay = env.TICK_INTERVAL_MINUTES * 60_000

  const app = buildApp({
    db,
    auth,
    migrationsApplied: true,
    tickIntervalMinutes: env.TICK_INTERVAL_MINUTES,
    adminToken: env.ADMIN_TOKEN,
    onAdminTick: () =>
      runTick(env.DATABASE_URL, {
        now: new Date(),
        msPerGameDay,
        worldSeed: 'cyclingstar',
        engineVersion: ENGINE_VERSION,
      }),
    logger: { level: env.LOG_LEVEL },
  })
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
