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

export type RaceTabId =
  'classifications' | 'result' | 'story' | 'radio' | 'stages' | 'route' | 'startlist' | 'honours'

export const RACE_TAB_LABEL: Record<RaceTabId, string> = {
  classifications: 'Classifications',
  result: 'Result',
  story: 'Story',
  radio: 'Race Radio',
  stages: 'Stages',
  route: 'Route',
  startlist: 'Startlist',
  honours: 'Roll of honour',
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
