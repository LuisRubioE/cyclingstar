/**
 * Informe personal de la última carrera (qué ordené vs qué pasó). El servidor manda los momentos del
 * corredor como líneas del acta (`moments`, E2 paso 12); aquí solo hablamos HTTP: esas líneas las
 * redacta `domain/stageJournal` (como el acta), el veredicto está en `domain/narration` y las
 * traducciones de rol/mentalidad en `domain/labels`.
 */

import {
  type PreStageInfo,
  type RaceReportEvent,
  type RaceReportOrders,
  type RiderRaceReport,
  lastRaceResponseSchema,
} from '@cyclingstar/shared'
import { horizonKey } from '../queryClient'
import { requestOptionalAuth } from './request'

export type { RaceReportEvent, RaceReportOrders, RiderRaceReport }

/**
 * La última carrera bajo el velo (E2, docs/retransmision.md §11.4 y §12.9; D-47; la API desde el 8a, la web
 * desde el 9b): `report`, el informe de la última etapa CONOCIDA; `ready`, si la última que corrió su
 * corredor está velada, lo único que se sabe de ella (`PreStageInfo`, D-42), para `Your last race · Race
 * France, Stage 8 · Ready to watch`.
 */
export interface LastRace {
  readonly report: RiderRaceReport | null
  readonly ready: PreStageInfo | null
}

/** Sin sesión (401) no hay informe: null. Cualquier otro fallo se propaga. */
export async function fetchLastRace(): Promise<LastRace | null> {
  const data = await requestOptionalAuth('/api/riders/me/last-race', lastRaceResponseSchema, {
    errorMessage: 'Could not load your last race.',
  })
  return data === null ? null : { report: data.report, ready: data.ready ?? null }
}

/** La clave (§10.9): con el `rev` del horizonte al final (9b). */
export function lastRaceKey(rev: string | undefined): readonly unknown[] {
  return horizonKey(['rider', 'last-race'], rev)
}
