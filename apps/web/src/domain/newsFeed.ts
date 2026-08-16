/**
 * Lógica pura del feed de noticias (docs/navegacion.md §3.5): a qué carrera se refiere un titular,
 * si pasa los filtros activos y cómo se agrupa por día de juego.
 *
 * Vive fuera de la página y fuera de `api/` a propósito: `api/` es solo HTTP + validación, y esto
 * son decisiones de dominio que se pueden probar sin montar nada.
 */

import type { NewsItem } from '@cyclingstar/shared'

/**
 * Carrera de la que habla un titular. Las plantillas del motor incrustan el NOMBRE de la carrera
 * tal cual está en el calendario (`packages/engine/src/world/news.ts`), así que se resuelve
 * buscando el nombre más largo que aparezca en el texto — el más largo para que "Race France" gane
 * a "Race" si un día conviven los dos.
 */
export function raceOfHeadline(text: string, races: { id: string; name: string }[]): string | null {
  let best: { id: string; length: number } | null = null
  for (const race of races) {
    if (race.name.length === 0 || !text.includes(race.name)) continue
    if (!best || race.name.length > best.length) best = { id: race.id, length: race.name.length }
  }
  return best?.id ?? null
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

/** Titulares agrupados por día de juego, del más reciente al más antiguo. */
export function groupByGameDay(items: NewsItem[]): { gameDay: number; items: NewsItem[] }[] {
  const days = new Map<number, NewsItem[]>()
  for (const item of items) {
    const bucket = days.get(item.gameDay)
    if (bucket) bucket.push(item)
    else days.set(item.gameDay, [item])
  }
  return [...days.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([gameDay, dayItems]) => ({ gameDay, items: dayItems }))
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
