/**
 * Qué pestañas tiene la ficha de una carrera y cuál abre por defecto (docs/navegacion.md §7.1, con lo que
 * cambia E2 en docs/retransmision.md §11.17).
 *
 * Depende del momento de la carrera y de si tiene una etapa o muchas; y la de un día terminada, desde el
 * 9b, también de si quien mira la ha visto y de si tiene `Watch` encendido (11-o).
 *
 * En una carrera de UN DÍA la carrera y la etapa son la misma cosa, así que la ficha de carrera
 * contiene directamente lo que en una vuelta vive en la ficha de etapa: `Watch` y el acta. No hay
 * pestaña `Stages` —sería una lista de un solo elemento— y por tanto no hay salto intermedio.
 *
 * Sin `Race Radio` ni la crónica desde W4 (la revisión de `Watch` del dueño, su punto 8: «ya los puedes
 * tirar a la basura»; D-16 revocada): con `Watch` apagado, `Story` era la crónica con el podio, así que
 * en ese modo la ficha abre en `Result`.
 *
 * Lógica pura, sin React: se prueba sin DOM.
 */

import type { RaceStatus } from '@cyclingstar/shared'

/**
 * Las pestañas de la ficha de carrera y de la página de etapa (E2, docs/retransmision.md §11.17, D-48): `story`
 * pasó a `report` en el 9b (los enlaces viejos con `?tab=story` la abren por `ACTA`), y `watch` y `report`
 * llegaron en el 9a. `radio` se fue en W4.
 */
export type RaceTabId =
  'watch' | 'classifications' | 'result' | 'report' | 'stages' | 'route' | 'startlist' | 'honours'

export const RACE_TAB_LABEL: Record<RaceTabId, string> = {
  watch: 'Watch',
  classifications: 'Classifications',
  result: 'Result',
  report: 'Report',
  stages: 'Stages',
  route: 'Route',
  startlist: 'Startlist',
  honours: 'Roll of honour',
}

/**
 * El nombre de cada pestaña. Hasta W4, `report` se llamaba `Story` con `Watch` apagado, porque ahí era la
 * crónica; sin ella, `report` solo existe con `Watch` encendido y tiene un solo nombre.
 */
export function raceTabLabel(id: RaceTabId): string {
  return RACE_TAB_LABEL[id]
}

/** Pestañas de una carrera POR ETAPAS: antes de correrse manda el recorrido, en cuanto rueda las clasificaciones. */
const STAGE_RACE_TABS: Record<RaceStatus, readonly RaceTabId[]> = {
  upcoming: ['route', 'startlist', 'honours'],
  racing: ['classifications', 'stages', 'route', 'startlist'],
  finished: ['classifications', 'stages', 'route', 'honours'],
}

/**
 * Pestañas de una carrera de UN DÍA sin terminar: lo previo, como una vuelta el día de su salida. La
 * entrada `finished` de hoy (`Result` delante, «el desenlace es lo primero que se busca») pasó en el 9b a
 * `ONE_DAY_FINISHED`, que mira si quien mira la ha visto.
 */
const ONE_DAY_TABS: Record<Exclude<RaceStatus, 'finished'>, readonly RaceTabId[]> = {
  upcoming: ['route', 'startlist', 'honours'],
  racing: ['route', 'startlist'],
}

/**
 * LA CARRERA DE UN DÍA TERMINADA (11-o; sup. C3; 9b). Su ficha ES la de su etapa: lleva `Watch` y el acta
 * con la misma puerta que la página de una etapa (§6.10). Con la decisión 1 del dueño durante la
 * implementación (8 de octubre de 2026), con `Watch` encendido `Story` y `Result` son una sola pestaña,
 * `Report` (el acta con el resultado), como en la página de etapa desde el 9a; §11.17 las tenía aparte.
 *
 * - `unseen`: no la ha visto (sin letra, `A` o `X`; 6-r, 10-e): `Watch` delante, el recorrido detrás, y lo
 *   que enseña el resultado a un toque (con la puerta si está en su velo).
 * - `seen`: la vio o la reveló (`W`, `S` o `R`): `Report` delante y `Watch` al final (`Watch anyway`).
 * - `unwatchable`: sin `Watch` para su etapa (una crono sin línea, una lápida; §17.19): `Report` delante.
 * - `off`: `Watch` apagado para quien mira (el interruptor de §20.5): `Result` primero. Hasta W4 llevaba
 *   al lado el acta con el nombre `Story`, que era la crónica con el podio.
 *
 * W4 quitó `Race Radio` de todas (D-16 revocada).
 */
const ONE_DAY_FINISHED: Record<'seen' | 'unseen' | 'unwatchable' | 'off', readonly RaceTabId[]> = {
  unseen: ['watch', 'route', 'report', 'honours'],
  seen: ['report', 'route', 'honours', 'watch'],
  unwatchable: ['report', 'route', 'honours'],
  off: ['result', 'route', 'honours'],
}

/**
 * `seen`: quien mira vio o reveló la etapa (`WatchState.seen`, `W`, `S` o `R`); una arrastrada (`A`) o una
 * caducada (`X`) no, y abren en `Watch` (6-r, 10-e). `watchOn`: `Watch` está encendido para él, lo mismo
 * que `request.broadcastOn()` en la API (§14.5). `watchable`: hay `Watch` para su etapa (la cabecera de la
 * retransmisión respondió). Los tres solo los mira una carrera de un día terminada; una vuelta pasa
 * `true` y el suyo.
 */
export function raceTabs(
  status: RaceStatus,
  stageCount: number,
  seen: boolean,
  watchOn: boolean,
  watchable = true,
): readonly RaceTabId[] {
  if (stageCount !== 1) return STAGE_RACE_TABS[status]
  if (status !== 'finished') return ONE_DAY_TABS[status]
  if (!watchOn) return ONE_DAY_FINISHED.off
  if (!watchable) return ONE_DAY_FINISHED.unwatchable
  return ONE_DAY_FINISHED[seen ? 'seen' : 'unseen']
}

/** La pestaña por defecto es la primera del conjunto, y por eso gana los mismos `seen`, `watchOn` y `watchable`. */
export function defaultRaceTab(
  status: RaceStatus,
  stageCount: number,
  seen: boolean,
  watchOn: boolean,
  watchable = true,
): RaceTabId {
  return raceTabs(status, stageCount, seen, watchOn, watchable)[0] as RaceTabId
}

/**
 * EL ACTA Y EL RESULTADO SON LA MISMA PESTAÑA con dos nombres: `report` con `Watch` encendido (decisión 1
 * del dueño) y `result` con él apagado (W4, que se llevó la crónica de `Story`). Los enlaces ya
 * compartidos con `?tab=story` (D-48), `?tab=report` y `?tab=result` abren la que haya: con la etapa
 * velada, la puerta (sup. E9). La aplican la ficha de carrera (`raceTabOf`) y la de etapa
 * (`stagePageTabOf`) antes de `useTabParam`.
 */
const ACTA: readonly string[] = ['story', 'report', 'result']

/**
 * Lo que pide `?tab=` en la ficha de carrera, contra sus pestañas: una que existe se respeta; `story`,
 * `report` y `result` abren la del acta que haya (`ACTA`). Una que no existe, como `radio` desde W4, da
 * null y la ficha abre en la suya por defecto. La pestaña pedida no salta la puerta.
 */
export function raceTabOf(raw: string | null, tabs: readonly RaceTabId[]): RaceTabId | null {
  if (raw === null) return null
  const exact = tabs.find((t) => t === raw)
  if (exact !== undefined) return exact
  return ACTA.includes(raw) ? (tabs.find((t) => t === 'report' || t === 'result') ?? null) : null
}

/**
 * A dónde va `/world/races/:raceId/stages/1` de una carrera de UN DÍA: a la ficha de carrera, que ya
 * contiene lo que había en la de etapa, en la pestaña equivalente a la que se pedía. Sin `?tab=`, ya no
 * elige (11-o; 9b): la ficha abre en su pestaña por defecto, `Watch` o `Report` según la haya visto, que es
 * lo que promete el enlace de un marcador del feed (§11.7), y `Result` con `Watch` apagado. Hasta el 9b
 * elegía `story`, que a quien no la había visto le enseñaba la puerta en lugar de la carrera; y hasta W4,
 * con `Watch` apagado, la crónica. `radio`, desde W4, no lleva a ninguna.
 */
export function oneDayStageTab(stageTab: string | null): RaceTabId | null {
  switch (stageTab) {
    case 'result':
    case 'classifications':
      return 'result'
    case 'profile':
      return 'route'
    case 'watch':
      return 'watch'
    case 'report':
    case 'story':
      return 'report'
    default:
      return null
  }
}

/**
 * URL completa de esa redirección, conservando el resto de la query (`?cls=`). Sin pestaña pedida, o con
 * una que ya no existe, sin `tab`.
 */
export function oneDayStageTarget(raceId: string, search: URLSearchParams): string {
  const next = new URLSearchParams(search)
  const tab = oneDayStageTab(search.get('tab'))
  if (tab === null) next.delete('tab')
  else next.set('tab', tab)
  const q = next.toString()
  return q === '' ? `/world/races/${raceId}` : `/world/races/${raceId}?${q}`
}

// ------------------------------------------------- la página de una etapa (E2, §6.10 y §11.17; 9a)

/** Las pestañas de la página de una etapa CORRIDA de una carrera por etapas. La sin correr, `Profile`. */
export type StagePageTabId = 'watch' | 'report' | 'result' | 'classifications' | 'profile'

/**
 * LAS PESTAÑAS DE UNA ETAPA CORRIDA (§6.10, D-48; 6-r), en el mismo fichero para probarlas sin DOM, con
 * la decisión 1 del dueño durante la implementación (8 de octubre de 2026): con `Watch` encendido para
 * quien mira, `Story` y `Result` se funden en una sola pestaña, `Report`, el acta con el resultado (los
 * nombres de DD-28). Sin `Race Radio` desde W4 (D-16 revocada).
 *
 * - `watchOn` falso (el interruptor de §20.5): `Result`, `Classifications` y `Profile`. Hasta W4 abría en
 *   `Story`, la crónica con el podio.
 * - `seen` falso (sin letra, `A` o `X`; 6-r, 10-e): `Watch` primero y el perfil, que no cuenta nada,
 *   detrás; lo que enseña el resultado, a un toque (con la puerta si la etapa está en el velo).
 * - `seen` (`W`, `S` o `R`): `Report` primero, el acta al terminar de verla o al revelarla, y `Watch` al
 *   final (`Watch anyway`).
 * - `watchable` falso (una crono sin línea, una lápida, `broadcast_unavailable`): sin `Watch`, `Report`
 *   primero con el acta, vista o no (§17.19).
 */
export function stagePageTabs(
  seen: boolean,
  watchOn: boolean,
  watchable = true,
): readonly StagePageTabId[] {
  if (!watchOn) return ['result', 'classifications', 'profile']
  if (!watchable) return ['report', 'classifications', 'profile']
  return seen
    ? ['report', 'classifications', 'profile', 'watch']
    : ['watch', 'profile', 'report', 'classifications']
}

/** El nombre de cada pestaña de la página de etapa: los de la ficha de carrera y `Profile`. */
export function stageTabLabel(id: StagePageTabId): string {
  return id === 'profile' ? 'Profile' : raceTabLabel(id)
}

/**
 * Lo que pide `?tab=` en la página de etapa, contra sus pestañas: `story`, `report` y `result` abren la
 * del acta que haya (`ACTA`). Una pestaña que no existe, como `radio` desde W4, da null y la página abre
 * en la suya por defecto. La pestaña pedida no salta la puerta: con la etapa sin ver, `report`, `result`
 * y `classifications` la pintan (sup. E9).
 */
export function stagePageTabOf(
  raw: string | null,
  tabs: readonly StagePageTabId[],
): StagePageTabId | null {
  if (raw === null) return null
  const exact = tabs.find((t) => t === raw)
  if (exact !== undefined) return exact
  return ACTA.includes(raw) ? (tabs.find((t) => t === 'report' || t === 'result') ?? null) : null
}
