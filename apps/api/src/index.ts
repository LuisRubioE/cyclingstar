import { GENESIS_WORLD_SEED, createDb, runMigrations, runTick } from '@cyclingstar/db'
import { ENGINE_VERSION } from '@cyclingstar/engine'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import { loadEnv } from './env.js'
import { createMailer } from './mailer.js'

/**
 * Arranque del servicio `web` de Railway: `node apps/api/dist/index.js` (SPEC 12).
 * Aplica las migraciones (con advisory lock) ANTES de escuchar, abre la conexión a la
 * base de datos, configura la autenticación y el tick manual, y levanta Fastify.
 */
async function main(): Promise<void> {
  const env = loadEnv()

  await runMigrations(env.DATABASE_URL)

  const { db } = createDb(env.DATABASE_URL)
  // Correo transaccional: con RESEND_API_KEY y MAIL_FROM sale por Resend; sin ellas queda
  // un mailer que sólo deja constancia, para que un entorno local arranque igual.
  const mailer = createMailer(env)
  const auth = createAuth(db, {
    secret: env.SESSION_SECRET,
    baseURL: env.APP_URL,
    mailer,
    ...(env.EXTRA_TRUSTED_ORIGINS ? { extraTrustedOrigins: env.EXTRA_TRUSTED_ORIGINS } : {}),
  })
  const msPerGameDay = env.TICK_INTERVAL_MINUTES * 60_000

  const app = buildApp({
    db,
    auth,
    migrationsApplied: true,
    tickIntervalMinutes: env.TICK_INTERVAL_MINUTES,
    adminToken: env.ADMIN_TOKEN,
    ...(env.ADMIN_EMAIL ? { adminEmail: env.ADMIN_EMAIL } : {}),
    // Los interruptores de E2 (§14.6). SPOILER_MODE, desde el 7a: `admins` lo enciende para el dueño.
    switches: { broadcastWatch: env.BROADCAST_WATCH, spoilerMode: env.SPOILER_MODE },
    // La cookie que solo restringe (§10.8): firmada con el secreto de sesión, Secure en https como la de
    // sesión (auth.ts).
    viewerSecret: env.SESSION_SECRET,
    secureCookies: env.APP_URL.startsWith('https://'),
    // El umbral de escritura del progreso (15-j): sin la variable, BROADCAST.progressMinDeltaS.
    ...(env.PROGRESS_MIN_DELTA_S !== undefined
      ? { progressMinDeltaS: env.PROGRESS_MIN_DELTA_S }
      : {}),
    onAdminTick: () =>
      runTick(env.DATABASE_URL, {
        now: new Date(),
        msPerGameDay,
        worldSeed: GENESIS_WORLD_SEED,
        engineVersion: ENGINE_VERSION,
        timelineRecord: env.TIMELINE_RECORD,
      }),
    onAdminAdvance: (days) =>
      runTick(env.DATABASE_URL, {
        now: new Date(),
        msPerGameDay,
        worldSeed: GENESIS_WORLD_SEED,
        engineVersion: ENGINE_VERSION,
        forceDays: days,
        timelineRecord: env.TIMELINE_RECORD,
      }),
    logger: { level: env.LOG_LEVEL },
  })
  await app.listen({ port: env.PORT, host: '0.0.0.0' })

  /*
   * AUTO_TICK=off (E2, docs/retransmision.md §18.3 y 18-k; paso 5): con el servicio `tick` del cron en
   * marcha, `web` no simula en su proceso. Simular es JavaScript síncrono: mientras corre una etapa la
   * web no contesta, y un tramo de la retransmisión pedido en ese momento saldría con `Loading`. Los
   * avances a mano de /admin siguen funcionando. Con `on` (por defecto), como hoy.
   */
  if (env.AUTO_TICK === 'off') {
    app.log.info('auto-tick disabled (AUTO_TICK=off): the tick service advances the world')
    return
  }

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
        worldSeed: GENESIS_WORLD_SEED,
        engineVersion: ENGINE_VERSION,
        timelineRecord: env.TIMELINE_RECORD,
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
