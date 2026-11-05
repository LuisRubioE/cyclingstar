import {
  BROADCAST,
  type GroupNow,
  type Instant,
  type RiderCard,
  groupLabelText,
  mainGapText,
  nameOf,
  pullingLineOf,
  pullingText,
  shownGroupsOf,
} from '@cyclingstar/shared'
import { Fragment, memo, useId, useLayoutEffect, useRef, useState } from 'react'
import { isQuietFinal, mobileRowsOf, transitOf, yourRiderText } from '../../domain/broadcast/screen'
import { type LineChip, fitTeamChips, teamLineOf } from '../../domain/broadcast/teamChips'
import { Button } from '../ui/Button'
import { Expander } from '../ui/Expander'
import { Icon } from '../ui/Icon'
import { Flag } from '../ui/Flag'
import { LeaderJersey } from '../ui/LeaderJersey'
import { RiderLabel } from '../ui/RiderLabel'
import { TeamJersey } from '../ui/TeamJersey'
import { WornJerseyIcon, wornTeamOf } from './WornJerseyIcon'

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
 * del grupo que dejan (`3 bridging across`, con el icono `trend` hacia arriba). Y la identidad de cada fila es la de pantalla
 * (`screenKeysOf`, D-03): un cambio de etiqueta no la cambia.
 *
 * Desde el 6b, la línea de quién tira bajo cada fila que tira (`Pulling: Team Beta (for 11 Sam Carter)`,
 * §6.4, 6-d; en el móvil, solo bajo la del pelotón y las del espectador, con un equipo y `+N teams`), y
 * debajo de la barra, si el espectador corre, `Your rider · in the bunch · +2:14` con sus variantes
 * (6-l).
 *
 * Desde el 17a (E3, docs/visual.md §14.4; D-00b, D-00c, 14-d, 14-g), ningún maillot por debajo de 28 px.
 * Cada fila es un botón de 44 que abre debajo, en el flujo, la lista de sus corredores, una fila de 44
 * con su `RiderLabel` cada uno; otro toque la cierra, y abrir otra cierra la anterior. Un grupo de tres o
 * menos se nombra en su fila con el dorsal, la bandera, el nombre y el maillot, y parte de línea en lugar
 * de cortar. Uno de cuatro a `nameWholeGroupUpTo` lleva la línea de equipos (`teamLineOf`): delante, los
 * de líder y campeón (el nacional, con las letras de su país), y un `Kit` por equipo con su cuenta, los
 * que caben en dos renglones con el ancho medido (`fitTeamChips`) y `+N teams`, que abre la lista.
 */
interface GroupBarProps {
  instant: Instant
  cast: readonly RiderCard[]
  clock: 'exact' | 'estimated'
  /** las filas plegadas del móvil, abiertas */
  expanded?: boolean
  onExpand?: () => void
  /** la identidad en pantalla de cada `GroupIx` (`screenKeysOf`); sin ella, el `GroupIx` */
  keys?: readonly string[]
}

/**
 * Sin cambios en lo que pinta, la barra no se pinta otra vez (10b, los arreglos; §18.5): cambia a
 * `barHz`, y la pantalla se pinta a `overlayHz`. `onExpand` no cuenta: siempre abre las filas plegadas.
 */
export const sameBar = (a: GroupBarProps, b: GroupBarProps): boolean =>
  a.instant === b.instant &&
  a.cast === b.cast &&
  a.clock === b.clock &&
  a.expanded === b.expanded &&
  a.keys === b.keys

export const GroupBar = memo(function GroupBar({
  instant,
  cast,
  clock,
  expanded = false,
  onExpand,
  keys,
}: GroupBarProps) {
  const quiet = isQuietFinal(instant.toGoKm)
  const groups = shownGroupsOf(instant)
  const own = yourRiderText(
    instant,
    cast,
    cast.filter((c) => c.own).map((c) => c.ix),
  )
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
  // la fila abierta, por su identidad en pantalla: abrir otra cierra la anterior (14-g)
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div
      data-ui="GroupBar"
      data-variant={expanded ? 'expanded' : 'default'}
      data-state={open === null ? 'closed' : 'open'}
      className="divide-y divide-line"
      aria-live="off"
    >
      {groups.map((g) => {
        const key = rowKey(g)
        return (
          <GroupRow
            key={key}
            group={g}
            cast={cast}
            clock={clock}
            quiet={quiet}
            folded={folded.includes(g)}
            transit={transit.get(g.g)}
            open={open === key}
            onToggle={() => setOpen((o) => (o === key ? null : key))}
          />
        )
      })}
      {folded.length > 0 && (
        <div className="sm:hidden">
          <Button
            variant="quiet"
            layout="w-full"
            {...(onExpand === undefined ? {} : { onClick: onExpand })}
          >
            {`+${folded.length} ${folded.length === 1 ? 'group' : 'groups'} · ${foldedRiders} ${foldedRiders === 1 ? 'rider' : 'riders'}`}
          </Button>
        </div>
      )}
      {own !== null && (
        <p data-your-rider="" className="py-1.5 pl-6 text-caption font-semibold text-accent">
          {own}
        </p>
      )}
    </div>
  )
}, sameBar)

/** La línea de quién tira de una fila (§6.4): en escritorio, entera; en el móvil, la del pelotón y las del espectador, con un equipo. */
function PullingRow({
  group,
  cast,
  mobile,
}: {
  group: GroupNow
  cast: readonly RiderCard[]
  mobile: boolean
}) {
  const line = pullingLineOf(group.detail, group.members, cast)
  if (line === null) return null
  return (
    <>
      <p data-pulling="desktop" className="hidden pl-6 text-caption text-ink-2 sm:block">
        {pullingText(line, cast)}
      </p>
      {mobile && (
        <p data-pulling="mobile" className="pl-6 text-caption text-ink-2 sm:hidden">
          {pullingText(line, cast, true)}
        </p>
      )}
    </>
  )
}

/** Una fila de la barra: un botón de 44 con el grupo, su línea, sus tránsitos, quién tira y su lista. */
export function GroupRow({
  group: g,
  cast,
  clock,
  quiet,
  folded,
  transit: t,
  open,
  onToggle,
}: {
  group: GroupNow
  cast: readonly RiderCard[]
  clock: 'exact' | 'estimated'
  quiet: boolean
  folded: boolean
  transit: { readonly back: number; readonly across: number } | undefined
  open: boolean
  onToggle: () => void
}) {
  const listId = useId()
  return (
    <div
      data-group-row={g.number}
      data-mobile={folded ? 'folded' : undefined}
      className={folded ? 'hidden sm:block' : 'block'}
    >
      {/* la fila entera se pulsa (Ruso-036), un `Expander` del catálogo (PR 21n), que lleva lo suyo dentro */}
      <Expander expanded={open} controls={listId} onToggle={onToggle}>
        <span className="w-4 shrink-0 text-right text-caption font-semibold tabular-nums text-ink-3">
          {g.number}
        </span>
        {/* el rótulo y los maillots de líder parten de línea en vez de cortar ([DUEÑO 17]; §6.4): a 28,
            los tres del grueso no caben con su rótulo en un renglón a 360 */}
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <RowName group={g} cast={cast} />
          {g.label.k !== 'names' &&
            g.jerseys.map((j) => <LeaderJersey key={j} kind={j} size={28} />)}
          {g.own && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-accent"
              role="img"
              aria-label="Your rider"
            />
          )}
        </span>
        {/* el km y la diferencia, uno sobre otro en el teléfono y lado a lado desde 640 (PR 21n): lado a
            lado, a 320 y a 360 no dejaban sitio a los nombres de un grupo nombrado, que se montaban en el km */}
        <span className="ml-auto flex shrink-0 flex-col items-end sm:flex-row sm:items-baseline sm:gap-2">
          <span className="text-caption tabular-nums text-ink-3">
            km {clock === 'estimated' && g.number > 1 ? '~' : ''}
            {g.km.toFixed(1)}
          </span>
          {/* la fila 1 no lleva hueco: es la cabeza de la pantalla; salvo unos segundos, si la que
              iba delante acaba de morir con los suyos en carrera y aún no tienen grupo (10a) */}
          {(g.number > 1 || g.gap.toHeadS >= BROADCAST.sameTimeS) && !quiet && (
            <span className="min-w-14 text-right text-meta font-semibold tabular-nums text-ink">
              {mainGapText(g.gap.toHeadS)}
            </span>
          )}
        </span>
      </Expander>
      {g.label.k !== 'names' && g.size <= BROADCAST.nameWholeGroupUpTo && (
        <TeamLine
          group={g}
          cast={cast}
          mobile={g.number === 1 || g.own}
          open={open}
          controls={listId}
          onMore={onToggle}
        />
      )}
      {t !== undefined && (t.back > 0 || t.across > 0) && (
        <p className="pl-6 text-caption text-ink-2">
          {/* la flecha, el icono `trend` girado y para el ojo: las palabras ya lo dicen (ui/10; PR 21n) */}
          {t.back > 0 && (
            <span className="inline-flex items-center gap-1">
              <Icon name="trend" size={16} turn={90} />
              {t.back} dropping back
            </span>
          )}
          {t.back > 0 && t.across > 0 && ' · '}
          {t.across > 0 && (
            <span className="inline-flex items-center gap-1">
              <Icon name="trend" size={16} turn={-90} />
              {t.across} bridging across
            </span>
          )}
        </p>
      )}
      <PullingRow group={g} cast={cast} mobile={g.kind === 'peloton' || g.own} />
      {/* la lista se pinta al abrir, no a cada barHz; cerrada, queda su sitio para aria-controls */}
      <ul id={listId} data-group-list={g.number} hidden={!open}>
        {open &&
          g.members.map((r) => {
            const card = cast[r]
            if (card === undefined) return null
            return (
              <li key={r} className="flex min-h-11 items-center">
                <RiderLabel
                  rider={{ id: card.id, name: card.name, human: true, country: card.country }}
                  bib={card.bib}
                  team={wornTeamOf(card)}
                  worn={card.worn}
                  link={false}
                />
              </li>
            )
          })}
      </ul>
    </div>
  )
}

/** Un corredor nombrado en su fila (D-00c): el dorsal, la bandera, el nombre y el maillot que lleva. */
function NamedRider({ card }: { card: RiderCard }) {
  return (
    <span className="inline-flex items-center gap-1">
      {card.bib !== null && <span className="tabular-nums text-ink-2">#{card.bib}</span>}
      <Flag country={card.country} />
      {/* un apellido que no cabe en su renglón parte dentro de su caja antes que montarse en el km */}
      <span className="wrap-anywhere">{card.name}</span>
      <WornJerseyIcon worn={card.worn} team={wornTeamOf(card)} size={28} />
    </span>
  )
}

/** El nombre de la fila: los corredores con su maillot (tres o menos) o la palabra con el tamaño. */
function RowName({ group, cast }: { group: GroupNow; cast: readonly RiderCard[] }) {
  if (group.label.k === 'names')
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-x-1 font-semibold text-ink">
        {group.label.riders.map((r, i) => {
          const card = cast[r]
          return (
            <Fragment key={r}>
              {i > 0 && <span className="text-ink-3"> · </span>}
              {card === undefined ? <span>{nameOf(cast)(r)}</span> : <NamedRider card={card} />}
            </Fragment>
          )
        })}
      </span>
    )
  const word = groupLabelText('en', group.label, group.role, 'bar', nameOf(cast))
  return (
    <span className="min-w-0 break-words text-caption text-ink">
      <span data-caps="" className="font-semibold uppercase tracking-caps">
        {word}
      </span>
      <span className="tabular-nums text-ink-2"> · {group.size}</span>
    </span>
  )
}

/** Una ficha de la línea: el de delante con su maillot (y las letras del nacional) o un equipo con su cuenta. */
function Chip({ chip, cast }: { chip: LineChip; cast: readonly RiderCard[] }) {
  if (chip.kind === 'front') {
    const card = cast[chip.rider]
    return (
      <span data-chip="front" className="inline-flex items-center gap-1">
        <WornJerseyIcon
          worn={chip.worn}
          team={card === undefined ? null : wornTeamOf(card)}
          size={28}
        />
        {chip.letters !== null && (
          <span aria-hidden="true" className="text-caption font-semibold text-ink-2">
            {chip.letters}
          </span>
        )}
      </span>
    )
  }
  const first = cast[chip.riders[0] ?? -1]
  const team = first === undefined ? null : wornTeamOf(first)
  const n = chip.riders.length
  return (
    <span
      data-chip="team"
      role="img"
      aria-label={`${team?.name ?? 'Individual'}, ${n} ${n === 1 ? 'rider' : 'riders'}`}
      className="inline-flex items-center gap-1"
    >
      {team === null ? (
        <span aria-hidden="true" className="inline-block h-7 w-7 shrink-0" />
      ) : (
        <TeamJersey team={team} size={28} />
      )}
      <span aria-hidden="true" className="text-caption font-semibold tabular-nums text-ink-2">
        ×{n}
      </span>
    </span>
  )
}

/**
 * La línea de equipos de un grupo de cuatro a doce (§14.4): las fichas que caben en dos renglones, con
 * lo medido (`ResizeObserver`), y `+N teams`, que abre la lista del grupo. Sin medir (en el servidor, o
 * antes de la primera pintura), todas.
 */
function TeamLine({
  group,
  cast,
  mobile,
  open,
  controls,
  onMore,
}: {
  group: GroupNow
  cast: readonly RiderCard[]
  /** también en el móvil: la fila 1 y las del espectador */
  mobile: boolean
  /** `+N teams` abre la misma lista que la fila: lo dice con `aria-expanded` y `aria-controls` */
  open: boolean
  controls: string
  onMore: () => void
}) {
  const chips = teamLineOf(group.members, cast)
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState<number | null>(null)
  useLayoutEffect(() => {
    const line = ref.current
    if (line === null || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const items = [...line.querySelectorAll<HTMLElement>('[data-chip]')]
      const more = line.querySelector<HTMLElement>('[data-chip-more]')
      const k = fitTeamChips(
        line.clientWidth,
        items.map((el) => el.offsetWidth),
        more === null ? {} : { moreWidthPx: more.offsetWidth },
      )
      setShown(k >= items.length ? null : k)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(line)
    return () => observer.disconnect()
  }, [chips.length, group.members])
  const hidden = shown === null ? 0 : chips.length - shown
  return (
    <div
      ref={ref}
      data-riders-line={mobile ? 'mobile' : 'desktop'}
      className={`${mobile ? 'flex' : 'hidden sm:flex'} relative flex-wrap items-center gap-x-1 gap-y-1 pb-1 sm:pl-6`}
    >
      {chips.map((chip, i) => (
        // la que no cabe sigue en el árbol, invisible y fuera del flujo, con su ancho para la próxima medida
        <span
          key={chip.kind === 'front' ? `f${chip.rider}` : `t${chip.teamId}`}
          data-chip-hidden={shown !== null && i >= shown ? '' : undefined}
          className={shown !== null && i >= shown ? 'invisible absolute' : 'inline-flex'}
        >
          <Chip chip={chip} cast={cast} />
        </span>
      ))}
      {/* solo si algo no cabe; hasta que se pinta, `fitTeamChips` estima su ancho */}
      {hidden > 0 && (
        // su ancho lo mide `fitTeamChips` en el `span`, que lleva la marca; el botón, el mando del catálogo
        // (PR 21n): `control`, de 91 px a 360, deja las fichas de §14.4 (cuatro y tres en el segundo renglón)
        <span data-chip-more="" className="inline-flex">
          <Button variant="control" expanded={open} controls={controls} onClick={onMore}>
            {`+${hidden} ${hidden === 1 ? 'team' : 'teams'}`}
          </Button>
        </span>
      )}
    </div>
  )
}
