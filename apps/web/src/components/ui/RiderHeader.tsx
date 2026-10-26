import { type ChampionTitle, KIT_PX } from '@cyclingstar/shared'
import { Chip } from './Chip'
import { ErrorState } from './ErrorState'
import { Flag } from './Flag'
import { ChosenJersey, type LegacyTeam, type RiderLabelProps, riderJerseyOf } from './RiderLabel'
import { Skeleton } from './Skeleton'
import { withLayout } from './styles'
import { gluedLastWord } from './TextLink'
import type { Layout, Tone } from './types'

/**
 * LA CABECERA DE LA FICHA DE UN CORREDOR (E3, docs/visual.md §4.6; PR 9b; D-00c). En el primer renglón,
 * contiguos y en este orden, la `Flag` a 24 de alto, el nombre en `text-page` como `h1` y el maillot que
 * lleva a 40 (`KIT_PX.card`): el de campeón si tiene un título vigente (`champion` de `GET
 * /api/riders/:id`, desde el 17a; decisión 4-l), si no la equipación; pegado a la última palabra del
 * nombre si parte de línea. Debajo, un `Chip` de jugador, otro de salud si no está sano y el papel en
 * `meta` `ink-2`: `José Quintáns · Player · Climber`. Cargando, el `Skeleton` `header`, un `h1` de 32 y una
 * línea de 20 (PR 10); no encontrado, `This rider doesn't exist.`; con un fallo, `ErrorState` con
 * `Try again`. El maillot se pega a la última palabra como en `RiderLabel`.
 *
 * El maillot no se pulsa todavía: abre la `Sheet` con `Front` y `Back` desde el 17c (§8.10), que la trae.
 */

export const RIDER_NOT_FOUND = "This rider doesn't exist."

interface RiderHeaderReady {
  readonly state?: 'ready'
  readonly rider: RiderLabelProps['rider']
  /** el equipo de hoy; null, un agente libre */
  readonly team: LegacyTeam | null
  /** su título vigente, si lo tiene (desde el 17a) */
  readonly champion?: ChampionTitle | null
  /** un corredor de un jugador: el `Chip` `Player` */
  readonly player: boolean
  /** la salud, solo si no está sano: `Injured` en `bad` */
  readonly health?: { readonly text: string; readonly tone: Tone } | null
  /** el papel: `Climber` */
  readonly role: string
  readonly layout?: Layout
}

export type RiderHeaderProps =
  | RiderHeaderReady
  | { readonly state: 'loading'; readonly layout?: Layout }
  | { readonly state: 'notFound'; readonly layout?: Layout }
  | {
      readonly state: 'error'
      readonly onRetry: () => void
      readonly retrying?: boolean
      readonly layout?: Layout
    }

export function RiderHeader(props: RiderHeaderProps) {
  const raiz = (state: string, variant = 'default') => ({
    'data-ui': 'RiderHeader',
    'data-variant': variant,
    'data-state': state,
    className: withLayout('grid gap-2', props.layout),
  })

  if (props.state === 'loading')
    return (
      <header {...raiz('loading')} role="status" aria-label="Loading the rider">
        <Skeleton shape={{ kind: 'header' }} />
      </header>
    )
  if (props.state === 'notFound')
    return (
      <header {...raiz('error', 'notFound')}>
        <ErrorState kind="notFound" message={RIDER_NOT_FOUND} />
      </header>
    )
  if (props.state === 'error')
    return (
      <header {...raiz('error')}>
        <ErrorState
          kind="server"
          label="this rider"
          onRetry={props.onRetry}
          retrying={props.retrying ?? false}
        />
      </header>
    )

  const { rider, team, champion, player, health, role } = props
  const choice = riderJerseyOf({ team, champion: champion ?? null })
  return (
    <header {...raiz('ready', player ? 'player' : 'rider')}>
      <div className="text-page whitespace-nowrap text-ink">
        <Flag country={rider.country} height={24} layout="mr-2" />
        <h1 className="inline">{gluedLastWord(rider.name)}</h1>
        <span className="ml-2 inline-flex align-middle">
          <ChosenJersey choice={choice} size={KIT_PX.card} />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {player && <Chip tone="accent">Player</Chip>}
        {health !== undefined && health !== null && <Chip tone={health.tone}>{health.text}</Chip>}
        <span className="text-meta text-ink-2">{role}</span>
      </div>
    </header>
  )
}
