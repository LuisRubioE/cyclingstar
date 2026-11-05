import { type TeamNewsItem, seasonPosition } from '@cyclingstar/shared'
import { feedEntries } from '../domain/newsFeed'
import { formatGameDay } from '../domain/words'
import { StageReadyLine } from './StageReadyLine'

/**
 * EL FEED DE UN EQUIPO (`Recent news` y `History`; E2, docs/retransmision.md §11.7; sup. N4; paso 9b). Como el
 * global: un marcador por etapa velada de cada carrera en cuya lista de salida está el equipo (la API los
 * manda por la lista, nunca por noticia, 11-g), y con más de `SPOILER.newsGroupAbove` de una carrera, una
 * línea. Cada uno lleva a su etapa, que abre en `Watch`. Con los tokens desde el 21k (E3, docs/visual.md §17.21): el día en
 * `meta` `ink-2` y la noticia en `body`, donde iban en la paleta, el día en `slate-400`, que no se leía. El día,
 * el de la temporada (§4.10; PR 21l), y no el del mundo, que desde la segunda decía `Day 380`.
 */
export function TeamFeed({ items, padding }: { items: readonly TeamNewsItem[]; padding: string }) {
  return (
    <ul className="divide-y divide-line">
      {feedEntries(items).map((entry, i) => (
        <li key={i} className={`flex gap-3 ${padding} py-2.5 text-body`}>
          <span className="w-16 shrink-0 text-meta text-ink-2 tabular-nums">
            {formatGameDay(seasonPosition(entry.gameDay).dayOfSeason, null)}
          </span>
          {entry.kind === 'news' ? (
            <span className="text-ink">{entry.item.text}</span>
          ) : (
            <StageReadyLine entry={entry} compact />
          )}
        </li>
      ))}
    </ul>
  )
}
