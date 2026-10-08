/**
 * LAS FILAS DE LA PESTAÑA `Stages` (E2, docs/retransmision.md §11.17; sup. C4; paso 9b). Cada fila enseña
 * lo que el servidor manda: el ganador de las etapas que su velo deja pasar (P: de 1 a k en una carrera en
 * guardia, todas fuera de ella), `Ready to watch` en las corridas sin ganador servido y `Not raced yet` en
 * las demás. Ninguna mira lo que pasó en la etapa: la primera depende de lo que el velo deja pasar y las
 * otras dos, del calendario (`runDays`, L: cuántas etapas se han corrido, no quién las ganó; sup. C6).
 * Hasta el 9b la fila decidía por el ganador solo, y una etapa corrida y velada decía `Not raced yet`, que
 * es falso. Lógica pura: se prueba sin DOM.
 */
import type { RaceStagePlan, StageWinner } from '@cyclingstar/shared'

export type StageRowState = 'report' | 'watch' | 'not_raced'

/** `report`: con ganador servido (de 1 a k, o todas si la carrera no está en guardia); `watch`: corrida y sin ganador servido. */
export function stageRowState(
  stage: Pick<RaceStagePlan, 'index'>,
  winnerOf: ReadonlyMap<number, StageWinner>,
  runDays: readonly number[],
): StageRowState {
  if (winnerOf.has(stage.index)) return 'report'
  return runDays.includes(stage.index) ? 'watch' : 'not_raced' // `runDays` es calendario (L, sup. C6)
}

/**
 * El enlace de cada fila. `report`: el acta (`/stages/:day/report`, §11.10) con `Watch` encendido, y con él
 * apagado el de hoy, la ficha de la etapa en su pestaña `Story` (que desde el 9a se llama `report`): el
 * jugador no nota nada hasta el encendido (§20.5). `watch`: la página de la etapa, que abre en `Watch`.
 * `not_raced`: sin enlace.
 */
export function stageRowLink(
  raceId: string,
  day: number,
  state: StageRowState,
  watchOn: boolean,
): { readonly to: string; readonly label: string } | null {
  const stage = `/world/races/${raceId}/stages/${day}`
  switch (state) {
    case 'report':
      return watchOn
        ? { to: `${stage}/report`, label: 'Report →' }
        : { to: `${stage}?tab=report`, label: 'Read the story →' }
    case 'watch':
      return { to: stage, label: watchOn ? 'Watch →' : 'Open stage →' }
    case 'not_raced':
      return null
  }
}
