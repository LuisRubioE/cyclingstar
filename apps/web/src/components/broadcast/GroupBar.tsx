import {
  BROADCAST,
  type GroupNow,
  type Instant,
  type RiderCard,
  groupLabelText,
} from '@cyclingstar/shared'
import { Fragment } from 'react'
import {
  gapText,
  isQuietFinal,
  mobileRowsOf,
  nameOf,
  shownGroupsOf,
  transitOf,
} from '../../domain/broadcast/screen'
import { LeaderJersey } from '../Jersey'
import { WornJerseyIcon } from './WornJerseyIcon'

/**
 * LA BARRA DE GRUPOS (docs/retransmision.md §6.2, §6.3, 6-c y 6-e; D-17, D-18). Una fila por grupo
 * del instante, en orden de carretera: su número (que renumera y no es identidad), su nombre con las
 * palabras de `GROUP_WORDS` (las mayúsculas son presentación) y su tamaño detrás si el nombre es una
 * palabra, los maillots de líder que van dentro, la marca del espectador, el km en que se pinta y el
 * hueco a la cabeza en su último km de foto (la fila 1 no lleva; `s.t.` por debajo de `sameTimeS`).
 *
 * Quién va y con qué maillot: un grupo de tres o menos se nombra en la propia fila; uno de cuatro a
 * `nameWholeGroupUpTo` lleva debajo sus corredores por dorsal, cada uno con su `WornJerseyIcon` (en
 * escritorio, con su nombre; en el móvil, solo los iconos y solo bajo la fila 1 y las del
 * espectador). Es, provisional hasta las palabras de la barra y las cartas del 6b (§6.3, §7.7), la
 * parte permanente del requisito del dueño: «cuando se escapan cinco, que se vean sus maillots».
 *
 * En el móvil caben `mobileGroupRows` filas, elegidas por prioridad y pintadas en orden de carretera;
 * el resto se pliega en `+3 groups · 41 riders`, que se abre al tocarlo (6-c). Con el reloj estimado
 * del adaptador de la radio, el km de todo grupo que no es la cabeza se escribe con `~` (§3.8). En los
 * últimos `quietFinalM`, sin huecos (§6.9). Se repinta a `barHz` y no es una región viva (§18.8).
 *
 * Desde el 6a, una fila por grupo con alguien dentro, con el número de lo pintado (`shownGroupsOf`): un
 * grupo recién nacido que aún no lleva a nadie no tiene fila, y los que van hacia él se cuentan bajo la
 * del grupo que dejan (`↑ 3 bridging across`). Y la identidad de cada fila es la de pantalla
 * (`screenKeysOf`, D-03): un cambio de etiqueta no la cambia.
 */
export function GroupBar({
  instant,
  cast,
  clock,
  expanded = false,
  onExpand,
  keys,
}: {
  instant: Instant
  cast: readonly RiderCard[]
  clock: 'exact' | 'estimated'
  /** las filas plegadas del móvil, abiertas */
  expanded?: boolean
  onExpand?: () => void
  /** la identidad en pantalla de cada `GroupIx` (`screenKeysOf`); sin ella, el `GroupIx` */
  keys?: readonly string[]
}) {
  const quiet = isQuietFinal(instant.toGoKm)
  const groups = shownGroupsOf(instant)
  const chosen = mobileRowsOf(groups)
  const transit = transitOf(instant)
  const folded = expanded ? [] : groups.filter((g) => !chosen.has(g.g))
  const foldedRiders = folded.reduce((s, g) => s + g.size, 0)
  // un eslabón y el siguiente casi nunca se pintan a la vez; si pasa, el segundo lleva su GroupIx
  const used = new Set<string>()
  const rowKey = (g: GroupNow): string => {
    const k = keys?.[g.g] ?? String(g.g)
    const key = used.has(k) ? `${k}~${g.g}` : k
    used.add(key)
    return key
  }
  return (
    <div className="divide-y divide-slate-100" aria-live="off">
      {groups.map((g) => {
        const fold = folded.includes(g)
        const t = transit.get(g.g)
        return (
          <div
            key={rowKey(g)}
            data-group-row={g.number}
            data-mobile={fold ? 'folded' : undefined}
            className={`${fold ? 'hidden sm:block' : 'block'} py-1.5`}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-400">
                {g.number}
              </span>
              <RowName group={g} cast={cast} />
              {g.label.k !== 'names' &&
                g.jerseys.map((j) => <LeaderJersey key={j} kind={j} size={14} />)}
              {g.own && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-cyan-500"
                  role="img"
                  aria-label="Your rider"
                  title="Your rider"
                />
              )}
              <span className="ml-auto shrink-0 text-xs tabular-nums text-slate-400">
                km {clock === 'estimated' && g.number > 1 ? '~' : ''}
                {g.km.toFixed(1)}
              </span>
              {g.number > 1 && !quiet && (
                <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
                  {gapText(g.gap.toHeadS)}
                </span>
              )}
            </div>
            {g.label.k !== 'names' && g.size <= BROADCAST.nameWholeGroupUpTo && (
              <RidersLine group={g} cast={cast} mobile={g.number === 1 || g.own} />
            )}
            {t !== undefined && (t.back > 0 || t.across > 0) && (
              <p className="pl-7 text-xs text-slate-500">
                {t.back > 0 && <span>↓ {t.back} dropping back</span>}
                {t.back > 0 && t.across > 0 && ' · '}
                {t.across > 0 && <span>↑ {t.across} bridging across</span>}
              </p>
            )}
          </div>
        )
      })}
      {folded.length > 0 && (
        <button
          type="button"
          onClick={onExpand}
          className="w-full py-1.5 pl-7 text-left text-xs font-medium text-slate-500 sm:hidden"
        >
          +{folded.length} {folded.length === 1 ? 'group' : 'groups'} · {foldedRiders}{' '}
          {foldedRiders === 1 ? 'rider' : 'riders'} ▾
        </button>
      )}
    </div>
  )
}

/** El nombre de la fila: los corredores con su maillot (tres o menos) o la palabra con el tamaño. */
function RowName({ group, cast }: { group: GroupNow; cast: readonly RiderCard[] }) {
  if (group.label.k === 'names')
    return (
      <span className="flex min-w-0 items-center gap-1 truncate font-medium text-slate-800">
        {group.label.riders.map((r, i) => {
          const card = cast[r]
          return (
            <Fragment key={r}>
              {i > 0 && <span className="text-slate-300"> · </span>}
              <span className="inline-flex min-w-0 items-center gap-1">
                {card !== undefined && <WornJerseyIcon card={card} />}
                <span className="truncate">{nameOf(cast)(r)}</span>
              </span>
            </Fragment>
          )
        })}
      </span>
    )
  const word = groupLabelText('en', group.label, group.role, 'bar', nameOf(cast))
  return (
    <span className="min-w-0 truncate text-slate-800">
      <span className="font-semibold uppercase tracking-wide">{word}</span>
      <span className="text-slate-500"> · {group.size}</span>
    </span>
  )
}

/** La línea de un grupo de cuatro a doce: sus corredores por dorsal, cada uno con su maillot (6-c). */
function RidersLine({
  group,
  cast,
  mobile,
}: {
  group: GroupNow
  cast: readonly RiderCard[]
  /** también en el móvil: la fila 1 y las del espectador */
  mobile: boolean
}) {
  return (
    <div
      data-riders-line={mobile ? 'mobile' : 'desktop'}
      className={`${mobile ? 'flex' : 'hidden sm:flex'} flex-wrap items-center gap-x-2 gap-y-0.5 pl-7 pt-0.5`}
    >
      {group.members.map((r) => {
        const card = cast[r]
        if (card === undefined) return null
        return (
          <span key={r} className="inline-flex items-center gap-1">
            <WornJerseyIcon card={card} size={13} />
            <span className="hidden sm:inline text-xs text-slate-600">{card.name}</span>
          </span>
        )
      })}
    </div>
  )
}
