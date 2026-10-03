/**
 * LA LÍNEA TEMPORAL DE LA ETAPA EN LA CAPA DE DATOS (E2, docs/retransmision.md §5.3, §5.5 y §5.6).
 *
 * Nace en el PR 4b con una sola pieza y sin llamador: `startStageTimeline`, el colector aparte de §5.3,
 * que engancha el grabador del motor (`timelineRecorder`) a la etapa sin cambiar lo que ven la radio
 * de hoy ni el aprendizaje (B10, `timelineCollector.test.ts`). El paso 5 lo conecta al tick
 * (`runOneStage`, con `TIMELINE_RECORD=on`) y completa este fichero con la escritura y la lectura de
 * `stage_timelines`: `recordStageTimeline`, `stageTimelineRow`, `tombstoneRow`, `writeStageTimelineRows`,
 * `readStageTimeline`, `readStageTemplateRev` y el diario del tick (`timelineTickLog`, con `flush`).
 */
import {
  STAGE,
  type StageProbe,
  type TimelineRecorder,
  timelineRecorder,
} from '@cyclingstar/engine'
import { type Block, photoBlocksOf } from '@cyclingstar/shared'

/** Una etapa que se está grabando: la sonda que se le pasa al motor y lo que queda para cerrarla. */
export interface StageTimelineRun {
  readonly probe: StageProbe
  readonly recorder: TimelineRecorder
  /** El primer error del grabador, si lo hubo: desde él el grabador no recibe nada más y la etapa se queda sin línea (§5.5). */
  readonly failure: () => unknown
}

/**
 * EL COLECTOR APARTE (D-08, §5.3; decisión 5-d). Pide la foto de CADA bloque y despacha por ÍNDICE de
 * bloque: la de un bloque de `radioKmPoints` va a `radioShot`, que es la radio y el aprendizaje de hoy
 * (`trabajaronParaOtro` en `stageRun.ts`), exactamente como hoy; todas van al grabador. El despacho es
 * por índice y no por km porque el motor no devuelve el km pedido sino el centro del bloque que le
 * corresponde (`probeAt` en `simulate.ts`), y `photoBlocksOf` hace la misma cuenta (§4.5, atada al motor
 * por `apps/api/src/broadcastConstants.test.ts`). Dos km de radio en el mismo bloque dan una sola foto,
 * como en el motor: `radioBlocks` es un conjunto de bloques.
 *
 * El grabador va envuelto: un fallo suyo lo apaga y se apunta en `failure`, y nunca llega al motor ni a
 * la transacción del día (D-12). La radio va fuera de la envoltura, como hoy: un fallo suyo es un fallo
 * de la etapa, igual que antes de E2.
 */
export function startStageTimeline(opts: {
  readonly lengthKm: number
  readonly timeTrial: boolean
  /** el orden de `stage_snapshots.input.riders` (dorsal y luego id, `stageRun.ts`) */
  readonly riderIds: readonly string[]
  readonly radioShot: StageProbe['onSnapshot']
}): StageTimelineRun {
  // los de sampleProfile: Math.round(lengthKm / dx)
  const blocks = Math.round(opts.lengthKm / STAGE.dx)
  const radioBlocks: ReadonlySet<Block> = new Set(photoBlocksOf(opts.lengthKm, STAGE.dx))
  /** El bloque cuyo centro es `km`, con la cuenta del motor (`probeAt`). */
  const blockOf = (km: number): Block =>
    Math.max(0, Math.min(blocks - 1, Math.round(km / STAGE.dx - 0.5)))
  const recorder = timelineRecorder({
    blocks,
    dx: STAGE.dx,
    lengthKm: opts.lengthKm,
    timeTrial: opts.timeTrial,
    radioBlocks,
    riderIds: opts.riderIds,
  })
  let failure: unknown
  const safe =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A): void => {
      if (failure !== undefined) return
      try {
        fn(...args)
      } catch (err) {
        failure = err ?? new Error('el grabador falló sin error')
      }
    }
  const snapshot = safe(recorder.onSnapshot)
  return {
    recorder,
    failure: () => failure,
    probe: {
      atKm: Array.from({ length: blocks }, (_, b) => (b + 0.5) * STAGE.dx),
      onSnapshot: (km, riders, mainId) => {
        if (radioBlocks.has(blockOf(km))) opts.radioShot(km, riders, mainId)
        snapshot(km, riders, mainId)
      },
      onEvent: safe(recorder.onEvent),
      onBanner: safe(recorder.onBanner),
      onTimeTrialRide: safe(recorder.onTimeTrialRide),
    },
  }
}
