import { type ChampionTitle, KIT_PX } from '@cyclingstar/shared'
import { useId, useState } from 'react'
import { Chip } from './Chip'
import { ErrorState } from './ErrorState'
import { Flag } from './Flag'
import { Kit } from './Kit'
import { KIT_VIEW_TABS, SHOW_FULL_SCREEN } from './KitShowcase'
import {
  ChosenJersey,
  type RiderJerseyChoice,
  type RiderLabelProps,
  riderJerseyOf,
} from './RiderLabel'
import { Sheet } from './Sheet'
import { Skeleton } from './Skeleton'
import { Tabs, tabId } from './Tabs'
import type { WornTeam } from './TeamJersey'
import { FOCUS, withLayout } from './styles'
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
 * El maillot es un botón de 44 × 44 (PR 17c; §8.10): abre la `Sheet` con `Front`, el mismo a 320, y, si es
 * el de su equipo, `Back`, el `Kit` de su equipo por detrás con su dorsal si corre ese día (`#214`).
 */

export const RIDER_NOT_FOUND = "This rider doesn't exist."

interface RiderHeaderReady {
  readonly state?: 'ready'
  readonly rider: RiderLabelProps['rider']
  /** el equipo de hoy; null, un agente libre */
  readonly team: WornTeam | null
  /** su título vigente, si lo tiene (desde el 17a) */
  readonly champion?: ChampionTitle | null
  /** un corredor de un jugador: el `Chip` `Player` */
  readonly player: boolean
  /** la salud, solo si no está sano: `Injured` en `bad` */
  readonly health?: { readonly text: string; readonly tone: Tone } | null
  /** el papel: `Climber` */
  readonly role: string
  /** su dorsal, si corre ese día: en la espalda de la `Sheet` */
  readonly bib?: number | null
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

/** Las pestañas de la hoja del corredor: la espalda, solo con el maillot de su equipo (§8.10). */
export const FRONT_BACK = [KIT_VIEW_TABS[0], KIT_VIEW_TABS[1]] as const
export type FrontBack = (typeof FRONT_BACK)[number]['key']

/**
 * La hoja del maillot que lleva, a 320: `Front` y, si es el `Kit` de su equipo, `Back` con su dorsal. Un
 * dibujo de antes de la traducción, un líder o un campeón, solo por delante y sin pestañas.
 */
export function RiderJerseySheet({
  choice,
  bib,
  title,
  view,
  onView,
  open,
  onClose,
}: {
  readonly choice: RiderJerseyChoice
  readonly bib: number | null
  readonly title: string
  readonly view: FrontBack
  readonly onView: (view: FrontBack) => void
  readonly open: boolean
  readonly onClose: () => void
}) {
  const panelId = useId()
  const team = choice.kind === 'team' && 'kit' in choice.team ? choice.team : null
  const vista =
    team !== null && view === 'back' ? (
      <Kit
        code={team.kit}
        teamName={team.name}
        view="back"
        size={KIT_PX.poster}
        {...(bib === null ? {} : { number: bib })}
      />
    ) : (
      <ChosenJersey choice={choice} size={KIT_PX.poster} />
    )
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {team === null ? (
        <div className="flex justify-center">{vista}</div>
      ) : (
        <>
          <Tabs
            label="Kit views"
            options={FRONT_BACK}
            value={view}
            onChange={onView}
            panelId={panelId}
            layout="mx-3"
          />
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId(panelId, view)}
            className="flex justify-center pt-3"
          >
            {vista}
          </div>
        </>
      )}
    </Sheet>
  )
}

/** El maillot de 40 en un botón de 44 × 44 que abre su hoja; sin maillot que enseñar, el de siempre. */
function JerseyButton({
  choice,
  bib,
  title,
}: {
  readonly choice: RiderJerseyChoice
  readonly bib: number | null
  readonly title: string
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<FrontBack>('front')
  if (choice.kind === 'none' || choice.kind === 'unknown')
    return <ChosenJersey choice={choice} size={KIT_PX.card} />
  return (
    <>
      <button
        type="button"
        aria-label={SHOW_FULL_SCREEN}
        onClick={() => setOpen(true)}
        className={`-my-1 inline-flex size-11 items-center justify-center rounded-ui ${FOCUS}`}
      >
        <ChosenJersey choice={choice} size={KIT_PX.card} />
      </button>
      <RiderJerseySheet
        choice={choice}
        bib={bib}
        title={title}
        view={view}
        onView={setView}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
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

  const { rider, team, champion, player, health, role, bib } = props
  const choice = riderJerseyOf({ team, champion: champion ?? null })
  return (
    <header {...raiz('ready', player ? 'player' : 'rider')}>
      <div className="text-page whitespace-nowrap text-ink">
        <Flag country={rider.country} height={24} layout="mr-2" />
        <h1 className="inline">{gluedLastWord(rider.name)}</h1>
        <span className="ml-2 inline-flex align-middle">
          <JerseyButton choice={choice} bib={bib ?? null} title={rider.name} />
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
