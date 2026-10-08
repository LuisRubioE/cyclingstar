/**
 * Lógica pura del feed de noticias (docs/navegacion.md §3.5): a qué carrera se refiere un titular,
 * si pasa los filtros activos y cómo se agrupa por día de juego.
 *
 * Vive fuera de la página y fuera de `api/` a propósito: `api/` es solo HTTP + validación, y esto
 * son decisiones de dominio que se pueden probar sin montar nada.
 */

import { type NewsItem, SPOILER, type StageReadyItem, parseRaceKey } from '@cyclingstar/shared'

/**
 * Carrera de la que habla un titular: la de sus datos (`raceId`), que la API manda desde la migración
 * 0046 (docs/retransmision.md §11.7 y §14.2, D-45; E2, paso 1b). Hasta aquí se adivinaba buscando el
 * NOMBRE de la carrera dentro del inglés del titular (`raceOfHeadline`), que fallaba en cuanto el
 * texto no lo llevaba tal cual y que no sobrevive a otra lengua. Un titular de antes de la 0046 no
 * trae carrera y no se le busca en el texto: lleva a su protagonista, como un fichaje.
 */
export function raceOfItem(item: NewsItem): string | null {
  return item.raceId ?? null
}

export interface NewsFilter {
  teamId: string | null
  riderId: string | null
  country: string | null
  raceId: string | null
}

export const NO_FILTER: NewsFilter = { teamId: null, riderId: null, country: null, raceId: null }

/** ¿Pasa el titular todos los filtros activos? Un filtro en `null` no filtra nada. */
export function matchesFilter(item: NewsItem, filter: NewsFilter, raceId: string | null): boolean {
  if (filter.teamId && item.teamId !== filter.teamId) return false
  if (filter.riderId && item.riderId !== filter.riderId) return false
  if (filter.country && item.country !== filter.country) return false
  if (filter.raceId && raceId !== filter.raceId) return false
  return true
}

/** Titulares (o líneas del feed) agrupados por día de juego, del más reciente al más antiguo. */
export function groupByGameDay<T extends { readonly gameDay: number }>(
  items: readonly T[],
): { gameDay: number; items: T[] }[] {
  const days = new Map<number, T[]>()
  for (const item of items) {
    const bucket = days.get(item.gameDay)
    if (bucket) bucket.push(item)
    else days.set(item.gameDay, [item])
  }
  return [...days.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([gameDay, dayItems]) => ({ gameDay, items: dayItems }))
}

// ------------------------------------- el marcador de una etapa velada (E2, §11.7 y §4.12; 9b)

/** Lo que el marcador mira de un titular: el del feed global y el del feed de un equipo. */
export interface FeedItem {
  readonly kind: string
  readonly gameDay: number
  readonly text: string
  readonly raceId?: string | null | undefined
  readonly raceKey?: string | null | undefined
  readonly stageDay?: number | null | undefined
}

/**
 * EL MARCADOR (D-45, I-39, 14-j): en lugar de las noticias de una etapa velada la API manda UN titular
 * `stage_ready`, con el texto neutro (`Stage 7 of Race France is ready to watch`) y la carrera y la etapa
 * como datos. Aquí se convierte en `StageReadyItem`; un titular normal, o uno sin sus datos, da null.
 */
export function stageReadyOf(item: FeedItem): StageReadyItem | null {
  if (item.kind !== 'stage_ready' || item.raceId == null || item.stageDay == null) return null
  return {
    kind: 'stage_ready',
    raceId: item.raceId,
    season: item.raceKey == null ? 0 : (parseRaceKey(item.raceKey).season ?? 0),
    stageDay: item.stageDay,
    gameDay: item.gameDay,
  }
}

/** A dónde lleva un marcador: a su etapa, que abre en `Watch` a quien no la ha visto (§11.7). */
export function readyTarget(r: Pick<StageReadyItem, 'raceId' | 'stageDay'>): string {
  return `/world/races/${r.raceId}/stages/${r.stageDay}`
}

/** El nombre de la carrera del texto neutro del marcador (`stageReadyText` de la API); si no casa, null. */
export function readyRaceName(text: string): string | null {
  return /^(?:Stage \d+ of )?(.+) is ready to watch$/.exec(text)?.[1] ?? null
}

/** Una línea del feed: un titular, un marcador suelto o los de una carrera juntos. */
export type FeedEntry<T extends FeedItem> =
  | { readonly kind: 'news'; readonly gameDay: number; readonly item: T }
  | {
      readonly kind: 'ready'
      readonly gameDay: number
      readonly item: T
      readonly ready: StageReadyItem
    }
  | {
      readonly kind: 'ready-group'
      readonly gameDay: number
      readonly raceId: string
      readonly raceName: string
      /** las etapas veladas de la carrera, en orden */
      readonly stages: readonly number[]
    }

/**
 * LAS LÍNEAS DEL FEED (§11.7): los titulares como llegan, los marcadores sueltos y, con más de `above`
 * (`SPOILER.newsGroupAbove`) etapas veladas de una carrera, una sola línea por carrera, `Race France · 4
 * stages ready to watch`, en el sitio de su marcador más reciente (el orden estable de D-45 los pone en el
 * de sus noticias, 11-g). Solo mira el horizonte: cuántas etapas veladas hay, no qué pasó en ellas.
 */
export function feedEntries<T extends FeedItem>(
  items: readonly T[],
  above: number = SPOILER.newsGroupAbove,
): FeedEntry<T>[] {
  const keyOf = (r: StageReadyItem): string => `${r.raceId}:s${r.season}`
  const perRace = new Map<string, StageReadyItem[]>()
  for (const item of items) {
    const r = stageReadyOf(item)
    if (r !== null) perRace.set(keyOf(r), [...(perRace.get(keyOf(r)) ?? []), r])
  }
  const out: FeedEntry<T>[] = []
  const grouped = new Set<string>()
  for (const item of items) {
    const r = stageReadyOf(item)
    if (r === null) {
      out.push({ kind: 'news', gameDay: item.gameDay, item })
      continue
    }
    const all = perRace.get(keyOf(r)) ?? [r]
    if (all.length <= above) {
      out.push({ kind: 'ready', gameDay: item.gameDay, item, ready: r })
      continue
    }
    if (grouped.has(keyOf(r))) continue
    grouped.add(keyOf(r))
    out.push({
      kind: 'ready-group',
      gameDay: item.gameDay,
      raceId: r.raceId,
      raceName: readyRaceName(item.text) ?? r.raceId,
      stages: all.map((x) => x.stageDay).sort((a, b) => a - b),
    })
  }
  return out
}

/**
 * LOS TITULARES QUE CUENTAN UN RESULTADO. Un «X gana la etapa 4 de la Volta» habla de una carrera,
 * y al hacerle clic lo que se quiere abrir es LA CARRERA —el resultado, la crónica, la radio— y no
 * la ficha del corredor, que es a donde iban TODOS los titulares por llevar protagonista.
 */
const RACE_RESULT_KINDS: ReadonlySet<string> = new Set([
  'stage_win',
  'tt_win',
  'breakaway_win',
  'one_day_win',
  'one_day_tt_win',
  'gc_win',
  'kom',
])

/**
 * A dónde lleva un titular. La carrera manda cuando el titular cuenta un resultado y se sabe cuál
 * es; si no —un fichaje, una lesión, una retirada— sigue llevando a su protagonista, que ahí sí es
 * de quien va la noticia. Y si no hay ni una cosa ni la otra, el titular no es un enlace.
 */
export function headlineTarget(item: NewsItem, raceId: string | null): string | null {
  if (raceId && RACE_RESULT_KINDS.has(item.kind)) return `/world/races/${raceId}`
  return item.riderId ? `/world/riders/${item.riderId}` : null
}
