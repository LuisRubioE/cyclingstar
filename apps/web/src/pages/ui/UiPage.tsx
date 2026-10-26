import { legacyJerseyStyle } from '@cyclingstar/shared/legacyJersey'
import { type ReactNode, useId, useState } from 'react'
import { ActionBarView, type ActionBarState } from '../../components/ui/ActionBar'
import { ActionRow } from '../../components/ui/ActionRow'
import { AppHeader } from '../../components/ui/AppHeader'
import { BottomNav, type BottomNavItem } from '../../components/ui/BottomNav'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Disclosure } from '../../components/ui/Disclosure'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field } from '../../components/ui/Field'
import { Flag } from '../../components/ui/Flag'
import { Icon } from '../../components/ui/Icon'
import { ICONS } from '../../components/ui/icons'
import { InfoButton } from '../../components/ui/InfoButton'
import { LegacyJersey } from '../../components/ui/LegacyJersey'
import { Meter } from '../../components/ui/Meter'
import { Notice } from '../../components/ui/Notice'
import { OfflineBannerView } from '../../components/ui/OfflineBanner'
import { OfflineState } from '../../components/ui/OfflineState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Panel } from '../../components/ui/Panel'
import { QueryView } from '../../components/ui/QueryView'
import { RankTable, type RankTableColumn } from '../../components/ui/RankTable'
import { RiderHeader } from '../../components/ui/RiderHeader'
import { type LegacyTeam, RiderLabel } from '../../components/ui/RiderLabel'
import { Scale5 } from '../../components/ui/Scale5'
import { Segmented } from '../../components/ui/Segmented'
import { Skeleton } from '../../components/ui/Skeleton'
import { StarRating } from '../../components/ui/StarRating'
import { Stat } from '../../components/ui/Stat'
import { Tabs } from '../../components/ui/Tabs'
import { TextLink, gluedLastWord } from '../../components/ui/TextLink'
import { TripRow } from '../../components/ui/TripRow'
import type { IconName, Tone } from '../../components/ui/types'
import { formatTime } from '../../domain/format'
import {
  DASHBOARD,
  HOW_TO_PLAY,
  type MainLink,
  MY_RIDER,
  MY_TEAM,
  NEWS,
  WORLD,
} from '../../domain/nav'
import { worldClock } from '../../domain/words'
import { NO_TEAM_LABEL } from '../../domain/labels'
import {
  GC_ROWS,
  GC_WITH_DNF,
  ITALY_TITLE,
  LONG_CONSEQUENCE,
  LONGEST_TITLE,
  MANY_TABS,
  OWN_RIDER_ID,
  PLAN_MODES,
  SEEN_AT,
  SHORT_CONSEQUENCE,
  TEAM_ROWS,
  UI_TEAMS,
  UI_QUERIES,
  type UiGcRow,
} from './fixtures'

/**
 * `/_ui` (E3, docs/visual.md §5.4; PR 9a, I-03 y D-10). Cada componente del catálogo en cada uno de sus
 * estados, con datos fijos y sin llamar a la API: primero sobre `canvas` y después, los que viven allí,
 * dentro del ámbito oscuro. Sin enlace desde ningún sitio, con `noindex` y en su propio trozo; fuera del
 * marco de la web, para que su cabecera y su barra de hoy no se midan con el catálogo. Lo fijo (la
 * `ActionBar`) y lo que depende de su sitio (`OfflineBanner`) van en un marco de 360 × 160 que les hace
 * de bloque contenedor (`transform-gpu`), uno por estado (5-g). Es la primera página de la prueba del
 * teléfono (§7.4), que la quiere a cero; desde el 23, también con `?theme=dark` (5-h).
 *
 * Cómo se añade un componente: su `ui/<Nombre>.tsx`, su test por estado y su sección aquí (§5.4). Los
 * bloques son columnas flexibles y no rejillas: una rejilla crece con lo más ancho que lleve dentro, y el
 * carril de las pestañas, que se desplaza, ensanchaba la página entera (598 px a 360).
 */

/** Una sección por componente. */
function Demo({ name, children }: { readonly name: string; readonly children: ReactNode }) {
  const id = useId()
  return (
    <section data-ui-demo={name} aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-title text-ink">
        {name}
      </h2>
      {children}
    </section>
  )
}

/** Un estado, con su nombre encima. */
function Estado({ name, children }: { readonly name: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{name}</p>
      {children}
    </div>
  )
}

/** El ámbito oscuro (§3.3): lo que vive bajo la cabecera, con sus tokens. */
function Oscuro({ children }: { readonly children: ReactNode }) {
  return (
    <div data-surface="dark" className="flex flex-col gap-4 rounded-ui bg-surface p-3">
      {children}
    </div>
  )
}

/** El marco de lo fijo: 360 × 160, que hace de bloque contenedor (5-g). */
function Marco({ children }: { readonly children: ReactNode }) {
  return (
    <div className="relative h-40 w-full max-w-90 transform-gpu overflow-hidden rounded-ui border border-line bg-canvas">
      {children}
    </div>
  )
}

const VARIANTES = ['primary', 'secondary', 'quiet', 'danger'] as const
const TONOS: readonly Tone[] = ['neutral', 'accent', 'good', 'warn', 'bad', 'info']
const CHAPAS: Readonly<Record<Tone, string>> = {
  neutral: 'Real route (source cited)',
  accent: 'Your edit',
  good: 'Called up',
  warn: 'Tired',
  bad: 'Injured',
  info: 'Home race',
}
const BARRAS: readonly ActionBarState[] = [
  'dirty',
  'saving',
  'saved',
  'failed',
  'offline',
  'disabled',
]
const nada = () => undefined

function Botones() {
  return (
    <Demo name="Button">
      {VARIANTES.map((v) => (
        <Estado key={v} name={`${v} · ready`}>
          <div className="flex flex-wrap items-start gap-3">
            <Button variant={v}>Save plan</Button>
            <Button variant={v} icon="retry">
              Try again
            </Button>
            <Button variant={v} icon="close" ariaLabel="Close" />
          </div>
        </Estado>
      ))}
      <Estado name="busy">
        <div className="flex flex-wrap items-start gap-3">
          <Button variant="primary" busy busyLabel="Saving…">
            Save plan
          </Button>
          <Button busy busyLabel="Trying again…" icon="retry">
            Try again
          </Button>
        </div>
      </Estado>
      <Estado name="disabled">
        <Button variant="primary" disabledReason="Nothing to save yet. Change a day first.">
          Save plan
        </Button>
      </Estado>
      <Estado name="sm (32 px only with a mouse) · link">
        <div className="flex flex-wrap items-start gap-3">
          <Button size="sm">Add</Button>
          <Button to="/_ui" variant="quiet" icon="chevron-right">
            Open the plan
          </Button>
        </div>
      </Estado>
    </Demo>
  )
}

function Enlaces() {
  return (
    <Demo name="TextLink">
      <Estado name="default · rider">
        <p className="flex flex-wrap gap-4 text-body text-ink">
          <TextLink to="/_ui">Race Sardegna</TextLink>
          <TextLink to="/_ui" variant="rider">
            José Quintáns
          </TextLink>
        </p>
      </Estado>
      <Estado name="inline, in a sentence">
        <p className="text-body text-ink">
          Your plan runs to Day 78. Open{' '}
          <TextLink to="/_ui" inline>
            the training plan
          </TextLink>{' '}
          to change a day.
        </p>
      </Estado>
    </Demo>
  )
}

function Campos() {
  const [nombre, setNombre] = useState('Mistral Racing')
  const [semana, setSemana] = useState('build')
  const [nota, setNota] = useState('')
  const semanas = [
    { value: 'build', label: 'Build' },
    { value: 'peak', label: 'Peak' },
    { value: 'rest', label: 'Rest' },
  ]
  return (
    <Demo name="Field">
      <Estado name="input · ready, with help">
        <Field
          kind="input"
          id="ui-name"
          label="Name"
          value={nombre}
          onChange={setNombre}
          help="Up to 40 characters."
        />
      </Estado>
      <Estado name="input · error">
        <Field
          kind="input"
          id="ui-name-error"
          label="Name"
          value="M"
          onChange={nada}
          error="Must be 2 to 40 characters."
        />
      </Estado>
      <Estado name="input · disabled">
        <Field
          kind="input"
          id="ui-name-disabled"
          label="Name"
          value="Mistral Racing"
          onChange={nada}
          disabledReason="Only the manager can rename the team."
        />
      </Estado>
      <Estado name="select">
        <Field
          kind="select"
          id="ui-week"
          label="Week 1"
          value={semana}
          onChange={setSemana}
          options={semanas}
        />
      </Estado>
      <Estado name="select · inline">
        <Field
          kind="select"
          id="ui-week-inline"
          label="Emphasis"
          inline
          value={semana}
          onChange={setSemana}
          options={semanas}
        />
      </Estado>
      <Estado name="textarea">
        <Field kind="textarea" id="ui-note" label="Note" value={nota} onChange={setNota} rows={3} />
      </Estado>
    </Demo>
  )
}

function Elecciones() {
  const [modo, setModo] = useState<(typeof PLAN_MODES)[number]['key']>('mixed')
  return (
    <Demo name="Segmented">
      <Estado name="ready">
        <Segmented
          label="Who decides your training"
          options={PLAN_MODES}
          value={modo}
          onChange={setModo}
        />
      </Estado>
      <Estado name="disabled">
        <Segmented
          label="Who decides your training"
          options={PLAN_MODES}
          value="coach"
          onChange={nada}
          disabledReason="Your team plan decides this month."
        />
      </Estado>
    </Demo>
  )
}

function Porques() {
  return (
    <>
      <Demo name="InfoButton">
        <Estado name="closed">
          <div className="flex flex-wrap items-center gap-x-1 text-body text-ink">
            <span>2 travel days</span>
            <InfoButton label="About travel days">
              You don&apos;t train on travel days: 1 out, 1 back.
            </InfoButton>
          </div>
        </Estado>
        <Estado name="open">
          <div className="flex flex-wrap items-center gap-x-1 text-body text-ink">
            <span>2 travel days</span>
            <InfoButton label="About travel days (open)" defaultOpen>
              You don&apos;t train on travel days: 1 out, 1 back.
            </InfoButton>
          </div>
        </Estado>
      </Demo>
      <Demo name="Disclosure">
        <Estado name="closed">
          <Disclosure showLabel="Show the 28 days" hideLabel="Hide the 28 days">
            <p className="px-3 py-2 text-meta text-ink-2">Day 51 · Build · Load: steady</p>
          </Disclosure>
        </Estado>
        <Estado name="open">
          <Disclosure showLabel="Show the 28 days" hideLabel="Hide the 28 days" defaultOpen>
            <p className="px-3 py-2 text-meta text-ink-2">Day 51 · Build · Load: steady</p>
          </Disclosure>
        </Estado>
      </Demo>
    </>
  )
}

function Barras() {
  return (
    <Demo name="ActionBar">
      {BARRAS.map((estado) => (
        <Estado key={estado} name={estado}>
          <Marco>
            <ActionBarView
              state={estado}
              changes={estado === 'dirty' ? 3 : 2}
              consequence={estado === 'dirty' ? LONG_CONSEQUENCE : SHORT_CONSEQUENCE}
              actionLabel="Save plan"
              onSave={nada}
              disabledReason="This kit is already worn by Mistral Racing."
            />
          </Marco>
        </Estado>
      ))}
    </Demo>
  )
}

function Estructura() {
  const [pestana, setPestana] = useState<(typeof MANY_TABS)[number]['key']>('training')
  return (
    <>
      <Demo name="Panel">
        <Estado name="default, with an action">
          <Panel title="Your month" action={<Button variant="quiet">All races</Button>}>
            <p className="text-body text-ink-2">Three races and two travel days.</p>
          </Panel>
        </Estado>
        <Estado name="bleed, for tables · without a title">
          <Panel ariaLabel="Standings" variant="bleed">
            <p className="px-3 text-body text-ink-2">A table goes edge to edge.</p>
          </Panel>
        </Estado>
      </Demo>
      <Demo name="PageHeader">
        <Estado name="ready, with its status line">
          <PageHeader title="Training" status="Mixed · your plan runs Day 51 to Day 78" />
        </Estado>
        <Estado name="second level, with the way back">
          <PageHeader title="Race Valencia" back={{ to: '/_ui', label: 'Races' }} />
        </Estado>
        <Estado name="loading">
          <PageHeader title="Training" loading />
        </Estado>
      </Demo>
      <Demo name="Tabs">
        <Estado name="page">
          <Tabs label="Rider sections" options={MANY_TABS} value={pestana} onChange={setPestana} />
        </Estado>
        <Estado name="nav, under the header">
          <Tabs
            label="Rider sections (nav)"
            variant="nav"
            options={MANY_TABS}
            value={pestana}
            onChange={setPestana}
          />
        </Estado>
      </Demo>
      <Demo name="Stat">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Balance" value={6173210} />
          <Stat label="Weekly net" value={780} signed />
          <Stat label="Weekly net" value={-80} signed />
          <Stat label="Weekly net" value={0} signed />
          <Stat label="Balance" value={0} loading />
        </div>
      </Demo>
    </>
  )
}

function Avisos() {
  return (
    <>
      <Demo name="Notice">
        <Notice
          tone="info"
          title="Coach mode: nothing you set here is used."
          action={{ label: 'Switch to Mixed', onClick: nada }}
        >
          Switch to Mixed to edit your days.
        </Notice>
        <Notice tone="good" title="Your plan is saved." role="status" onDismiss={nada}>
          It runs from Day 51 to Day 78.
        </Notice>
        <Notice
          tone="warn"
          title="Results from 3 stages you haven't watched are hidden"
          action={{ label: 'Manage', onClick: nada }}
        />
        <Notice tone="bad" title="Could not save your orders." role="alert">
          Nothing changed. Try again in a moment.
        </Notice>
      </Demo>
      <Demo name="Chip">
        <div className="flex flex-wrap gap-2">
          {TONOS.map((t) => (
            <Chip key={t} tone={t}>
              {CHAPAS[t]}
            </Chip>
          ))}
        </div>
      </Demo>
      <Demo name="OfflineBanner">
        <Estado name="offline, with what you saw">
          <Marco>
            <OfflineBannerView state={{ kind: 'offline', seenAt: SEEN_AT }} />
          </Marco>
        </Estado>
        <Estado name="offline, nothing seen yet">
          <Marco>
            <OfflineBannerView state={{ kind: 'offline', seenAt: null }} />
          </Marco>
        </Estado>
        <Estado name="ready (back online)">
          <Marco>
            <OfflineBannerView state={{ kind: 'ready' }} />
          </Marco>
        </Estado>
      </Demo>
      <Demo name="OfflineState">
        <OfflineState />
      </Demo>
      <Demo name="ErrorState">
        <Estado name="server">
          <ErrorState kind="server" label="your training plan" status={500} onRetry={nada} />
        </Estado>
        <Estado name="network · retrying">
          <ErrorState kind="network" label="the standings" onRetry={nada} retrying />
        </Estado>
        <Estado name="network, a page that never loaded">
          <ErrorState kind="network" chunk onRetry={nada} />
        </Estado>
        <Estado name="outdated">
          <ErrorState kind="outdated" />
        </Estado>
        <Estado name="notFound">
          <ErrorState
            kind="notFound"
            message="This rider doesn't exist."
            action={<TextLink to="/_ui">Go to Dashboard</TextLink>}
          />
        </Estado>
      </Demo>
    </>
  )
}

/* ── El 9b: la identidad, las tablas y las escalas ─────────────────────────────────────────────── */

const GANDIA = { from: 'Gandia', to: 'Alcoi' } as const
const PROPIA = GC_ROWS.find((r) => r.id === OWN_RIDER_ID) as UiGcRow
const LARGO = GC_ROWS[2] as UiGcRow
const PRIMERO = GC_ROWS[0] as UiGcRow
const MISTRAL = UI_TEAMS[1] as LegacyTeam

/** Una semilla de la génesis por patrón, para enseñar los cinco dibujos de hoy. */
const POR_PATRON = (() => {
  const vistos = new Map<string, string>()
  for (const div of ['WT', 'PRS', 'CON'] as const)
    for (let t = 0; t < 40; t++) {
      const seed = `cyclingstar-2:team:${div}:${t}:jersey`
      const { pattern } = legacyJerseyStyle(seed)
      if (!vistos.has(pattern)) vistos.set(pattern, seed)
    }
  return [...vistos.entries()]
})()

/** Las columnas de la general: el equipo debajo hasta 640, el total desde 1.024 y la diferencia. */
const GC_COLUMNS: readonly RankTableColumn<UiGcRow>[] = [
  {
    key: 'team',
    header: 'Team',
    priority: 'secondary',
    clip: true,
    render: (r) => r.team?.name ?? NO_TEAM_LABEL,
  },
  {
    key: 'total',
    header: 'Total',
    priority: 'optional',
    numeric: true,
    render: (r) => formatTime(r.total + r.gap),
  },
  {
    key: 'time',
    header: 'Time',
    priority: 'primary',
    numeric: true,
    render: (r) => (r.gap === 0 ? formatTime(r.total) : `+${formatTime(r.gap)}`),
  },
]

function GcTable({ rows }: { readonly rows: readonly UiGcRow[] }) {
  return (
    <RankTable
      caption="General classification after stage 3, Gandia → Alcoi"
      rows={rows}
      rowKey={(r) => r.id}
      rank={(r) => r.rank}
      identity={(r) => (
        <RiderLabel
          rider={r.rider}
          bib={r.bib}
          team={r.team}
          leader={r.leader}
          link={false}
          teamLine={false}
        />
      )}
      href={() => '/_ui'}
      columns={GC_COLUMNS}
      isOwn={(r) => r.id === OWN_RIDER_ID}
    />
  )
}

function Banderas() {
  return (
    <Demo name="Flag">
      <Estado name="ready · 21 × 16 in a row, and 12 and 24 high">
        <div className="flex flex-wrap items-center gap-3">
          <Flag country="ES" />
          <Flag country="VC" />
          <Flag country="JP" height={12} />
          <Flag country="IT" height={24} />
        </div>
      </Estado>
      <Estado name="empty · no country: a gap of its width">
        <p className="flex items-center gap-2 text-meta text-ink-2">
          <Flag country={null} />
          No nation yet
        </p>
      </Estado>
    </Demo>
  )
}

function Estrellas() {
  return (
    <Demo name="StarRating">
      <Estado name="in a row, 16">
        <div className="flex flex-wrap items-center gap-4">
          <StarRating value={3.5} />
          <StarRating value={0} />
          <StarRating value={5} />
        </div>
      </Estado>
      <Estado name="on the rider page, 20">
        <StarRating value={2} size={20} />
      </Estado>
    </Demo>
  )
}

function Etiquetas() {
  return (
    <Demo name="RiderLabel">
      <Estado name="a player · bib, flag, name, kit · the team below">
        <RiderLabel rider={PROPIA.rider} bib={214} team={PROPIA.team} />
      </Estado>
      <Estado name="a bot · the leader of the classification">
        <RiderLabel rider={PRIMERO.rider} bib={PRIMERO.bib} team={PRIMERO.team} leader="gc" />
      </Estado>
      <Estado name="the longest name, 28 · the kit stays with its last word">
        <RiderLabel rider={LARGO.rider} bib={LARGO.bib} team={MISTRAL} />
      </Estado>
      <Estado name="a free agent · Individual">
        <RiderLabel
          rider={{ id: 'r-free', name: 'Iker Zubizarreta', human: true, country: 'ES' }}
          team={null}
        />
      </Estado>
      <Estado name="a champion · the longest title, 59, in its name">
        <RiderLabel
          rider={{ id: 'r-vc', name: 'Kemar Ollivierre', human: false, country: 'VC' }}
          team={MISTRAL}
          champion={LONGEST_TITLE}
        />
      </Estado>
      <Estado name="in a sentence">
        <p className="text-body text-ink">
          The attack came from{' '}
          <RiderLabel rider={PROPIA.rider} bib={214} team={PROPIA.team} inline /> on the last climb.
        </p>
      </Estado>
    </Demo>
  )
}

function Cabeceras() {
  return (
    <Demo name="RiderHeader">
      <Estado name="ready · a player">
        <RiderHeader rider={PROPIA.rider} team={PROPIA.team} player role="Climber" />
      </Estado>
      <Estado name="ready · a champion, injured">
        <RiderHeader
          rider={{ id: 'r-it', name: 'Marco Rossi', human: false, country: 'IT' }}
          team={MISTRAL}
          champion={ITALY_TITLE}
          player={false}
          health={{ text: 'Injured', tone: 'bad' }}
          role="Sprinter"
        />
      </Estado>
      <Estado name="ready · the longest name, a free agent">
        <RiderHeader rider={LARGO.rider} team={null} player={false} role="All-rounder" />
      </Estado>
      <Estado name="loading">
        <RiderHeader state="loading" />
      </Estado>
      <Estado name="not found">
        <RiderHeader state="notFound" />
      </Estado>
      <Estado name="error">
        <RiderHeader state="error" onRetry={nada} />
      </Estado>
    </Demo>
  )
}

function Maillots() {
  return (
    <Demo name="LegacyJersey">
      <Estado name="the five drawings of today, at 28 and 40">
        <div className="flex flex-wrap items-center gap-3">
          {POR_PATRON.map(([pattern, seed]) => (
            <span key={pattern} className="flex items-center gap-1">
              <LegacyJersey seed={seed} size={28} />
              <LegacyJersey seed={seed} size={40} />
            </span>
          ))}
        </div>
      </Estado>
    </Demo>
  )
}

function Clasificaciones() {
  return (
    <Demo name="RankTable">
      <Estado name="ready · 140 rows, yours at 34">
        <Panel title="General classification" variant="bleed">
          <GcTable rows={GC_ROWS} />
        </Panel>
      </Estado>
      <Estado name="DNF · at the end, without a place">
        <Panel title="General classification" variant="bleed">
          <GcTable rows={GC_WITH_DNF} />
        </Panel>
      </Estado>
      <Estado name="teams · the name and its kit">
        <Panel title="Teams" variant="bleed">
          <RankTable
            caption="Teams classification after stage 3, Gandia → Alcoi"
            rows={TEAM_ROWS}
            rowKey={(r) => r.team.name}
            rank={(r) => r.rank}
            identityHeader="Team"
            identity={(r) => (
              <span className="text-row whitespace-nowrap text-ink">
                {gluedLastWord(r.team.name)}
                <span className="ml-1 inline-flex align-middle">
                  <LegacyJersey seed={r.team.legacySeed} size={28} team={r.team.name} />
                </span>
              </span>
            )}
            href={() => '/_ui'}
            columns={[
              {
                key: 'time',
                header: 'Time',
                priority: 'primary',
                numeric: true,
                render: (r) => (r.gap === 0 ? formatTime(155_175) : `+${formatTime(r.gap)}`),
              },
            ]}
            isOwn={(r) => r.team.name === PROPIA.team?.name}
          />
        </Panel>
      </Estado>
      <Estado name="veiled">
        <Panel title="General classification" variant="bleed">
          <RankTable
            caption="General classification after stage 3, Gandia → Alcoi"
            rows={GC_ROWS}
            rowKey={(r) => r.id}
            rank={(r) => r.rank}
            identity={(r) => r.rider.name}
            href={() => '/_ui'}
            columns={GC_COLUMNS}
            veil={{ stage: 3, route: GANDIA, href: '/_ui' }}
          />
        </Panel>
      </Estado>
    </Demo>
  )
}

function Filas() {
  const add = { label: 'Add', ariaLabel: 'Add Race Ardèche', onClick: nada } as const
  return (
    <>
      <Demo name="ActionRow">
        <ul className="divide-y divide-line rounded-ui border border-line bg-surface px-3">
          <ActionRow
            title={
              <>
                Race Ardèche <span className="text-caption font-semibold text-ink-3">.WT</span>
              </>
            }
            meta="Day 59 · FR · Travel 336 · 2 days out, 2 back"
            href="/_ui"
            action={add}
          />
          <ActionRow
            title="Race Sardegna"
            meta="Day 64 · IT · Travel 512 · 3 days out, 3 back"
            href="/_ui"
            action={{
              ...add,
              ariaLabel: 'Add Race Sardegna',
              disabledReason: 'Not enough money for the trip',
            }}
          />
          <ActionRow
            title="Race Var"
            meta="Day 51 · FR · Travel 180"
            action={{ ...add, ariaLabel: 'Add Race Var', busy: true }}
          />
          <ActionRow
            title="Race Murcia"
            meta="Day 44 · ES · at home"
            href="/_ui"
            done={{ text: 'Called up', tone: 'good' }}
          />
        </ul>
      </Demo>
      <Demo name="TripRow">
        <ul className="flex flex-col gap-3">
          <TripRow
            race="Race Sardegna (IT)"
            meta="Days 55 to 61 · 7 days off training"
            legs={[
              { key: 'out', days: 'Day 55', what: 'Out' },
              { key: 'race', days: 'Days 56 to 60', what: 'Race' },
              { key: 'back', days: 'Day 61', what: 'Back' },
            ]}
          />
          <TripRow
            race="Race Var (FR)"
            meta="Days 49 to 54 · 6 days off training"
            active
            legs={[
              { key: 'out', days: 'Day 49', what: 'Out' },
              { key: 'race', days: 'Days 50 to 51', what: 'Race' },
              {
                key: 'rest',
                days: 'Day 52',
                what: 'Rest (I decide)',
                action: (
                  <Button variant="quiet" size="sm">
                    Edit
                  </Button>
                ),
              },
              { key: 'race2', days: 'Day 53', what: 'Race' },
              { key: 'back', days: 'Day 54', what: 'Back' },
            ]}
          />
        </ul>
      </Demo>
    </>
  )
}

function Escalas() {
  return (
    <>
      <Demo name="Scale5">
        <Estado name="ready · Loaded">
          <Scale5 value="cargado" race="Race Var" />
        </Estado>
        <Estado name="ready · Spot on, the best">
          <Scale5 value="perfecto" race="Race Var" />
        </Estado>
        <Estado name="ready · Undertrained, in two lines">
          <Scale5 value="oxidado" race="Race Var" />
        </Estado>
        <Estado name="empty">
          <Scale5 value={null} race="Race Var" />
        </Estado>
        <Estado name="inactive · the race has started">
          <Scale5 value="bien" race="Race Var" racing={{ stage: 3, stages: 5, route: GANDIA }} />
        </Estado>
      </Demo>
      <Demo name="Meter">
        <Estado name="ready · four steps, a word">
          <Meter label="Freshness" value={1} valueText="low" />
          <Meter label="Load this month" value={3} valueText="hard" />
        </Estado>
        <Estado name="ready · the matches, five steps">
          <Meter label="Matches" value={3} steps={5} />
        </Estado>
        <Estado name="empty">
          <Meter label="Freshness" value={null} />
        </Estado>
      </Demo>
    </>
  )
}

/* ── El 10: los estados de una consulta ──────────────────────────────────────────────────────── */

function Consultas() {
  return (
    <>
      <Demo name="QueryView">
        {UI_QUERIES.map(([nombre, q]) => (
          <Estado key={nombre} name={nombre}>
            <QueryView
              query={q}
              label="your race calendar"
              skeleton={{ kind: 'rows', rows: 2, rowHeight: 64 }}
              isEmpty={(d) => d.length === 0}
              empty={{ text: 'No races in the next four weeks. This month is for building.' }}
            >
              {(d) => <p className="text-body text-ink">{d.join(' · ')}</p>}
            </QueryView>
          </Estado>
        ))}
      </Demo>
      <Demo name="Skeleton">
        <Estado name="rows · 56, a classification of riders">
          <Skeleton shape={{ kind: 'rows', rows: 2 }} />
        </Estado>
        <Estado name="panel">
          <Skeleton shape={{ kind: 'panel' }} />
        </Estado>
        <Estado name="stat">
          <Skeleton shape={{ kind: 'stat' }} />
        </Estado>
        <Estado name="header">
          <Skeleton shape={{ kind: 'header' }} />
        </Estado>
      </Demo>
      <Demo name="EmptyState">
        <Estado name="with its reason">
          <EmptyState text="No races in the next four weeks. This month is for building." />
        </Estado>
        <Estado name="with an action">
          <EmptyState
            icon="rider"
            text="You don't have a rider yet. Create one, and plan their training here."
            action={
              <Button to="/_ui" variant="primary">
                Create your rider
              </Button>
            }
          />
        </Estado>
      </Demo>
    </>
  )
}

/* ── El 11: el marco ─────────────────────────────────────────────────────────────────────────── */

/** El reloj más ancho: el último día de la temporada 12, con 23 h 59 min por delante (Ruso-006). */
const RELOJ_ANCHO = worldClock(12 * 364, (23 * 60 + 59) * 60_000)

const destino = (l: MainLink): BottomNavItem => ({
  key: l.section,
  to: '/_ui',
  label: l.label,
  shortLabel: l.shortLabel,
  icon: l.icon,
})

function Marcos() {
  return (
    <>
      <Demo name="AppHeader">
        <Estado name="signed in · the widest clock">
          <AppHeader state="signed-in" clock={RELOJ_ANCHO} />
        </Estado>
        <Estado name="signed out · the clock only from 640">
          <AppHeader state="signed-out" clock={RELOJ_ANCHO} />
        </Estado>
        <Estado name="unknown · offline, the player's (D-47)">
          <AppHeader state="unknown" clock={null} />
        </Estado>
      </Demo>
      <Demo name="BottomNav">
        <Estado name="five · the short labels below 76 px a cell">
          <Marco>
            <BottomNav
              items={[DASHBOARD, MY_RIDER, MY_TEAM, WORLD, NEWS].map(destino)}
              activeKey="me"
            />
          </Marco>
        </Estado>
        <Estado name="four · a free agent">
          <Marco>
            <BottomNav items={[DASHBOARD, MY_RIDER, WORLD, NEWS].map(destino)} activeKey="world" />
          </Marco>
        </Estado>
        <Estado name="three · signed out">
          <Marco>
            <BottomNav items={[WORLD, HOW_TO_PLAY, NEWS].map(destino)} activeKey={null} />
          </Marco>
        </Estado>
      </Demo>
    </>
  )
}

function Iconos() {
  const nombres = Object.keys(ICONS) as IconName[]
  return (
    <Demo name="Icon">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {nombres.map((name) => (
          <li key={name} className="flex items-center gap-2 text-meta text-ink">
            <Icon name={name} size={16} />
            <Icon name={name} size={20} />
            <Icon name={name} size={24} />
            <span>{name}</span>
          </li>
        ))}
      </ul>
      <Estado name="trend, in its five turns">
        <div className="flex gap-3 text-ink">
          <Icon name="trend" label="Improving fast" turn={-90} />
          <Icon name="trend" label="Improving" turn={-45} />
          <Icon name="trend" label="Steady" />
          <Icon name="trend" label="Slipping" turn={45} />
          <Icon name="trend" label="Slipping fast" turn={90} />
        </div>
      </Estado>
    </Demo>
  )
}

function AmbitoOscuro() {
  const [pestana, setPestana] = useState<(typeof MANY_TABS)[number]['key']>('profile')
  return (
    <Demo name="In the dark scope">
      <Oscuro>
        <Tabs
          label="Rider sections (dark scope)"
          variant="nav"
          options={MANY_TABS}
          value={pestana}
          onChange={setPestana}
        />
        <div className="flex flex-wrap items-start gap-3">
          {VARIANTES.map((v) => (
            <Button key={v} variant={v}>
              Save plan
            </Button>
          ))}
          <Button icon="account" ariaLabel="Account" variant="quiet" />
        </div>
        <Button variant="primary" disabledReason="Nothing to save yet. Change a day first.">
          Save plan
        </Button>
        <p className="text-body text-ink">
          Day 50 · S1 · <TextLink to="/_ui">Race Sardegna</TextLink>
        </p>
      </Oscuro>
    </Demo>
  )
}

export function UiPage() {
  return (
    <main className="mx-auto flex max-w-page flex-col gap-8 px-3 py-6 sm:px-4">
      <meta name="robots" content="noindex" />
      <title>UI catalog · Cycling Star</title>
      <PageHeader
        title="UI catalog"
        status="Every component of the system, in each of its states."
      />
      <Botones />
      <Enlaces />
      <Campos />
      <Elecciones />
      <Porques />
      <Barras />
      <Estructura />
      <Avisos />
      <Banderas />
      <Estrellas />
      <Etiquetas />
      <Cabeceras />
      <Maillots />
      <Clasificaciones />
      <Filas />
      <Escalas />
      <Consultas />
      <Marcos />
      <Iconos />
      <AmbitoOscuro />
    </main>
  )
}
