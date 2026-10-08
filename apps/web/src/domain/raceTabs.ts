/**
 * Qué pestañas tiene la ficha de una carrera y cuál abre por defecto (docs/navegacion.md §7.1).
 *
 * Depende de DOS cosas, no de una: el momento de la carrera y si tiene una etapa o muchas.
 *
 * En una carrera de UN DÍA la carrera y la etapa son la misma cosa, así que la ficha de carrera
 * contiene directamente lo que en una vuelta vive en la ficha de etapa: el journal (`Story`) y el
 * resultado. No hay pestaña `Stages` —sería una lista de un solo elemento— y por tanto no hay salto
 * intermedio: leer la crónica pasa de tres clics a uno.
 *
 * Lógica pura, sin React: se prueba sin DOM.
 */

import type { RaceStatus } from '@cyclingstar/shared'

/**
 * `watch` y `report` llegan en el 9a (E2, docs/retransmision.md §11.17, D-48): la página de etapa ya las
 * usa (`stagePageTabs`, abajo). `story` sigue en la ficha de una carrera de UN DÍA hasta el 9b, que la
 * cambia por `report` con `LEGACY_TAB` para los enlaces viejos.
 */
export type RaceTabId =
  | 'watch'
  | 'classifications'
  | 'result'
  | 'report'
  | 'story'
  | 'radio'
  | 'stages'
  | 'route'
  | 'startlist'
  | 'honours'

export const RACE_TAB_LABEL: Record<RaceTabId, string> = {
  watch: 'Watch',
  classifications: 'Classifications',
  result: 'Result',
  report: 'Report',
  story: 'Story',
  radio: 'Race Radio',
  stages: 'Stages',
  route: 'Route',
  startlist: 'Startlist',
  honours: 'Roll of honour',
}

/**
 * El nombre de cada pestaña: `report` se llama `Story`, como hoy, mientras `Watch` no esté encendido
 * para quien mira; el cambio llega con el encendido y no con el despliegue del 9a y el 9b (§20.5).
 */
export function raceTabLabel(id: RaceTabId, watchOn: boolean): string {
  return id === 'report' && !watchOn ? 'Story' : RACE_TAB_LABEL[id]
}

/** Pestañas de una carrera POR ETAPAS: antes de correrse manda el recorrido, en cuanto rueda las clasificaciones. */
const STAGE_RACE_TABS: Record<RaceStatus, readonly RaceTabId[]> = {
  upcoming: ['route', 'startlist', 'honours'],
  racing: ['classifications', 'stages', 'route', 'startlist'],
  finished: ['classifications', 'stages', 'route', 'honours'],
}

/**
 * Pestañas de una carrera de UN DÍA. Terminada abre en `Result` —el desenlace es lo primero que se
 * busca— y tiene `Story` al lado, a un clic. En curso no hay resultado todavía, así que se queda con
 * lo previo, igual que una vuelta el día de su salida.
 *
 * Y LLEVA `Race Radio`, que se había quedado fuera. En una vuelta la radio vive en la ficha de
 * ETAPA; como en una carrera de un día esa ficha redirige aquí —la carrera y la etapa son la misma
 * cosa—, sin pestaña propia la radio no era que estuviera escondida: **era inalcanzable**. Se pedía
 * `?tab=radio` y `oneDayStageTab` la mandaba a `story` por su rama por defecto.
 */
const ONE_DAY_TABS: Record<RaceStatus, readonly RaceTabId[]> = {
  upcoming: ['route', 'startlist', 'honours'],
  racing: ['route', 'startlist'],
  finished: ['result', 'story', 'radio', 'route', 'honours'],
}

export function raceTabs(status: RaceStatus, stageCount: number): readonly RaceTabId[] {
  return stageCount === 1 ? ONE_DAY_TABS[status] : STAGE_RACE_TABS[status]
}

/** La pestaña por defecto es la primera del conjunto: la que manda en ese momento de la carrera. */
export function defaultRaceTab(status: RaceStatus, stageCount: number): RaceTabId {
  return raceTabs(status, stageCount)[0] as RaceTabId
}

/**
 * A dónde va `/world/races/:raceId/stages/1` de una carrera de UN DÍA: a la ficha de carrera, que ya
 * contiene lo que había en la de etapa. Los enlaces compartidos y los de las noticias siguen
 * funcionando, y además caen en la pestaña equivalente a la que pedían.
 *
 * Sin `?tab=` se elige `story`: es lo que enseñaba por defecto la ficha de etapa, y a lo que apunta
 * el "Full story →" del panel de inicio. Si la carrera no se ha corrido, esa pestaña no existe y la
 * ficha cae sola en su pestaña por defecto (`Route`).
 */
export function oneDayStageTab(stageTab: string | null): RaceTabId {
  switch (stageTab) {
    case 'result':
    case 'classifications':
      return 'result'
    case 'radio':
      return 'radio'
    case 'profile':
      return 'route'
    default:
      return 'story'
  }
}

/** URL completa de esa redirección, conservando el resto de la query (p. ej. `?cls=`). */
export function oneDayStageTarget(raceId: string, search: URLSearchParams): string {
  const next = new URLSearchParams(search)
  next.set('tab', oneDayStageTab(search.get('tab')))
  return `/world/races/${raceId}?${next.toString()}`
}

// ------------------------------------------------- la página de una etapa (E2, §6.10 y §11.17; 9a)

/** Las pestañas de la página de una etapa CORRIDA de una carrera por etapas. La sin correr, `Profile`. */
export type StagePageTabId = 'watch' | 'report' | 'result' | 'classifications' | 'radio' | 'profile'

/**
 * LAS PESTAÑAS DE UNA ETAPA CORRIDA (§6.10, D-48; 6-r), en el mismo fichero para probarlas sin DOM, con
 * la decisión 1 del dueño durante la implementación (8 de octubre de 2026): con `Watch` encendido para
 * quien mira, `Story` y `Result` se funden en una sola pestaña, `Report`, el acta con el resultado y la
 * crónica (los nombres de DD-28).
 *
 * - `watchOn` falso (el jugador hasta el encendido, §20.5): las de hoy, en su orden (`StageReplay.tsx`
 *   hasta el 9a), con `report` llamada `Story`. Nada cambia para él.
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
  if (!watchOn) return ['report', 'result', 'radio', 'classifications', 'profile']
  if (!watchable) return ['report', 'classifications', 'radio', 'profile']
  return seen
    ? ['report', 'classifications', 'radio', 'profile', 'watch']
    : ['watch', 'profile', 'report', 'classifications', 'radio']
}

/** El nombre de cada pestaña de la página de etapa: los de la ficha de carrera y `Profile`. */
export function stageTabLabel(id: StagePageTabId, watchOn: boolean): string {
  return id === 'profile' ? 'Profile' : raceTabLabel(id, watchOn)
}

/**
 * Lo que pide `?tab=` en la página de etapa, contra sus pestañas: `story` (los enlaces de hoy, D-48)
 * abre `report`, y `result`, que con `Watch` encendido vive dentro de `Report`, también. Una pestaña que
 * no existe da null y la página abre en la suya por defecto. La pestaña pedida no salta la puerta: con
 * la etapa sin ver, `report`, `result`, `classifications` y `radio` la pintan (sup. E9).
 */
export function stagePageTabOf(
  raw: string | null,
  tabs: readonly StagePageTabId[],
): StagePageTabId | null {
  if (raw === null) return null
  const exact = tabs.find((t) => t === raw)
  if (exact !== undefined) return exact
  return (raw === 'story' || raw === 'result') && tabs.includes('report') ? 'report' : null
}
