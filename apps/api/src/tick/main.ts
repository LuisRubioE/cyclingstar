import { GENESIS_WORLD_SEED, createDb, runTick } from '@cyclingstar/db'
import { ENGINE_VERSION } from '@cyclingstar/engine'
import { loadTickEnv, vapidOf } from '../env.js'
import { mailQueue } from '../mailQueue.js'
import { createNotifier } from '../push/deliver.js'
import { runNoticeSweep } from '../push/sweep.js'

/**
 * Punto de arranque del servicio `tick` (cron de Railway cada 5 minutos, `railway.tick.json`):
 * `node apps/api/dist/tick/main.js`. Corre, procesa los días pendientes y termina (SPEC 12). Después, procese
 * o no días, el barrido de los avisos (docs/cuenta.md §13.7), que espera antes de salir; sin las tres VAPID no
 * abre ni la conexión.
 */
async function main(): Promise<void> {
  const env = loadTickEnv()
  const summary = await runTick(env.DATABASE_URL, {
    now: new Date(),
    msPerGameDay: env.TICK_INTERVAL_MINUTES * 60_000,
    worldSeed: GENESIS_WORLD_SEED,
    engineVersion: ENGINE_VERSION,
    // E2, paso 5: que el tick grabe la línea temporal de cada etapa (§5.5, §14.6).
    timelineRecord: env.TIMELINE_RECORD,
  })
  console.log(`tick: ${JSON.stringify(summary)}`)

  const vapid = vapidOf(env)
  if (vapid === null) return
  const { db, client } = createDb(env.DATABASE_URL)
  try {
    const notifier = createNotifier({
      db,
      vapid,
      queue: mailQueue,
      log: (msg, data) => console.warn(msg, JSON.stringify(data)),
    })
    const avisos = await runNoticeSweep(db, notifier, env.TICK_INTERVAL_MINUTES * 60_000)
    console.log(`notices: ${JSON.stringify(avisos)}`)
  } finally {
    await client.end()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
