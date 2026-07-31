import { runTick } from '@cyclingstar/db'
import { ENGINE_VERSION } from '@cyclingstar/engine'
import { loadTickEnv } from '../env.js'

/**
 * Punto de arranque del servicio `tick` (cron de Railway cada 6 horas):
 * `node apps/api/dist/tick/main.js`. Corre, procesa los días pendientes y termina (SPEC 12).
 */
async function main(): Promise<void> {
  const env = loadTickEnv()
  const summary = await runTick(env.DATABASE_URL, {
    now: new Date(),
    msPerGameDay: env.TICK_INTERVAL_MINUTES * 60_000,
    worldSeed: 'cyclingstar',
    engineVersion: ENGINE_VERSION,
  })
  console.log(`tick: ${JSON.stringify(summary)}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
