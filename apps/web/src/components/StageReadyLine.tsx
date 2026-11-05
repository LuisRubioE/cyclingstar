import { newsLabel } from '../domain/labels'
import { type FeedEntry, type FeedItem, readyTarget } from '../domain/newsFeed'
import { ActionRow } from './ui/ActionRow'
import { TextLink } from './ui/TextLink'

/**
 * LA LÍNEA DE UN MARCADOR EN UN FEED (E2, docs/retransmision.md §11.7; sup. N1, N2 y N4; paso 9b). En lugar
 * de las noticias de una etapa que quien mira no ha visto, una línea neutra con la familia `Watch`: suelta,
 * `Stage 7 of Race France is ready to watch`, o, con más de `SPOILER.newsGroupAbove` etapas veladas de la
 * carrera, `Race France · 4 stages ready to watch`. Lleva a la etapa (la primera de las juntas), que abre
 * en `Watch`. No dice nada de lo que pasó: solo cuántas etapas tiene por ver.
 *
 * Con el sistema (E3, docs/visual.md §17.21; PR 21l): en el feed, una `ActionRow` como los titulares, con su
 * familia en `meta`; en las listas de un equipo, un `TextLink`. Iba con la familia a 11 px en `brand-cyan` y el
 * texto en `slate-700`.
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
      <TextLink to={to} inline>
        {text}
      </TextLink>
    )
  return <ActionRow href={to} title={text} meta={newsLabel('stage_ready')} />
}
