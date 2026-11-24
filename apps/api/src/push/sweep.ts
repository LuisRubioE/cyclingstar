import { type Database, type SweepSummary, noticeSweep } from '@cyclingstar/db'
import { parseRaceKey } from '@cyclingstar/shared'
import { preStageInfoFor } from '../spaShell.js'
import type { Notifier } from './deliver.js'

/**
 * EL BARRIDO DESDE LOS DOS PROCESOS (docs/cuenta.md §13.7; D-47, X-04): `tick/main.ts` lo llama al final de
 * cada pasada del cron (procese o no días) y lo espera antes de salir; `index.ts`, después de cada `runTick`
 * de `web`, en segundo plano. Solo corre con las tres VAPID. La `PreStageInfo` de cada etapa sale como la de
 * la ruta de etapa (`preStageInfoFor`), con la temporada de su clave.
 */
export async function runNoticeSweep(
  db: Database,
  notifier: Notifier,
  msPerGameDay: number,
  now: Date = new Date(),
): Promise<SweepSummary | null> {
  if (!notifier.enabled) return null
  return noticeSweep(db, now, {
    send: notifier.send,
    msPerGameDay,
    stageInfo: (raceKey, stageDay) => {
      const { raceId, season } = parseRaceKey(raceKey)
      return preStageInfoFor(db, raceId, stageDay, season ?? undefined)
    },
  })
}
