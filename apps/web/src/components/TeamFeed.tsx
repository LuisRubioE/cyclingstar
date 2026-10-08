import type { TeamNewsItem } from '@cyclingstar/shared'
import { feedEntries } from '../domain/newsFeed'
import { StageReadyLine } from './StageReadyLine'

/**
 * EL FEED DE UN EQUIPO (`Recent news` y `History`; E2, docs/retransmision.md §11.7; sup. N4; paso 9b). Como el
 * global: un marcador por etapa velada de cada carrera en cuya lista de salida está el equipo (la API los
 * manda por la lista, nunca por noticia, 11-g), y con más de `SPOILER.newsGroupAbove` de una carrera, una
 * línea. Cada uno lleva a su etapa, que abre en `Watch`.
 */
export function TeamFeed({ items, padding }: { items: readonly TeamNewsItem[]; padding: string }) {
  return (
    <ul className="divide-y divide-slate-100">
      {feedEntries(items).map((entry, i) => (
        <li key={i} className={`flex gap-3 ${padding} py-2.5 text-sm`}>
          <span className="w-16 shrink-0 text-xs tabular-nums text-slate-400">
            Day {entry.gameDay}
          </span>
          {entry.kind === 'news' ? (
            <span className="text-slate-700">{entry.item.text}</span>
          ) : (
            <StageReadyLine entry={entry} compact />
          )}
        </li>
      ))}
    </ul>
  )
}
