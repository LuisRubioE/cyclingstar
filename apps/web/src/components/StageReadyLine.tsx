import { Link } from 'react-router-dom'
import { newsLabel } from '../domain/labels'
import { type FeedEntry, type FeedItem, readyTarget } from '../domain/newsFeed'

/**
 * LA LÍNEA DE UN MARCADOR EN UN FEED (E2, docs/retransmision.md §11.7; sup. N1, N2 y N4; paso 9b). En lugar
 * de las noticias de una etapa que quien mira no ha visto, una línea neutra con la familia `Watch`: suelta,
 * `Stage 7 of Race France is ready to watch`, o, con más de `SPOILER.newsGroupAbove` etapas veladas de la
 * carrera, `Race France · 4 stages ready to watch`. Lleva a la etapa (la primera de las juntas), que abre
 * en `Watch`. No dice nada de lo que pasó: solo cuántas etapas tiene por ver.
 */
export function StageReadyLine({
  entry,
  compact = false,
}: {
  entry: Extract<FeedEntry<FeedItem>, { kind: 'ready' | 'ready-group' }>
  /** la versión de las listas de un equipo, sin columna de familia */
  compact?: boolean
}) {
  const n = entry.kind === 'ready-group' ? entry.stages.length : 1
  const text =
    entry.kind === 'ready-group'
      ? `${entry.raceName} · ${n} stages ready to watch`
      : entry.item.text
  const to =
    entry.kind === 'ready-group'
      ? readyTarget({ raceId: entry.raceId, stageDay: entry.stages[0] ?? 1 })
      : readyTarget(entry.ready)
  if (compact)
    return (
      <Link to={to} className="text-brand-cyan hover:underline">
        {text}
      </Link>
    )
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
      <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-brand-cyan">
        {newsLabel('stage_ready')}
      </span>
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-700">
        <Link to={to} className="hover:text-brand-cyan hover:underline">
          {text}
        </Link>
      </p>
    </li>
  )
}
