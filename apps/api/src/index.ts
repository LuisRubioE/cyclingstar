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
    onAdminAdvance: (days) =>
      runTick(env.DATABASE_URL, {
        now: new Date(),
        msPerGameDay,
        worldSeed: 'cyclingstar',
        engineVersion: ENGINE_VERSION,
        forceDays: days,
      }),
    logger: { level: env.LOG_LEVEL },
  })
  await app.listen({ port: env.PORT, host: '0.0.0.0' })

  // Auto-tick: el propio servicio web avanza el mundo (SPEC 2). No depende de un cron externo,
  // que puede no estar configurado. runTick es idempotente y se pone al día según el tiempo real
  // transcurrido (targetGameDay), protegido por un advisory lock, así que sondear con frecuencia
  // es barato y seguro: si no hay días pendientes, no hace trabajo. El poll es una fracción de un
  // día de juego, acotado a [1, 5] minutos, para que el mundo nunca vaya muy por detrás del reloj.
  const pollMs = Math.min(5 * 60_000, Math.max(60_000, Math.floor(msPerGameDay / 4)))
  let ticking = false
  const autoTick = async (): Promise<void> => {
    if (ticking) return
    ticking = true
    try {
      const summary = await runTick(env.DATABASE_URL, {
        now: new Date(),
        msPerGameDay,
        worldSeed: 'cyclingstar',
        engineVersion: ENGINE_VERSION,
      })
      if (summary.daysProcessed > 0) {
        app.log.info({ summary }, 'auto-tick advanced the world')
      }
    } catch (err) {
      app.log.error({ err }, 'auto-tick failed')
    } finally {
      ticking = false
    }
  }
  const timer = setInterval(() => void autoTick(), pollMs)
  timer.unref?.()
  void autoTick() // ponerse al día al arrancar
  app.log.info({ pollMs, tickIntervalMinutes: env.TICK_INTERVAL_MINUTES }, 'auto-tick enabled')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
