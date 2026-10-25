import { type ReactNode, useId, useState } from 'react'
import { ActionBarView, type ActionBarState } from '../../components/ui/ActionBar'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Disclosure } from '../../components/ui/Disclosure'
import { ErrorState } from '../../components/ui/ErrorState'
import { Field } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { ICONS } from '../../components/ui/icons'
import { InfoButton } from '../../components/ui/InfoButton'
import { Notice } from '../../components/ui/Notice'
import { OfflineBannerView } from '../../components/ui/OfflineBanner'
import { OfflineState } from '../../components/ui/OfflineState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Panel } from '../../components/ui/Panel'
import { Segmented } from '../../components/ui/Segmented'
import { Stat } from '../../components/ui/Stat'
import { Tabs } from '../../components/ui/Tabs'
import { TextLink } from '../../components/ui/TextLink'
import type { IconName, Tone } from '../../components/ui/types'
import {
  LONG_CONSEQUENCE,
  MANY_TABS,
  PLAN_MODES,
  SEEN_AT,
  SHORT_CONSEQUENCE,
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
 * Cómo se añade un componente: su `ui/<Nombre>.tsx`, su test por estado y su sección aquí (§5.4).
 */

/** Una sección por componente. */
function Demo({ name, children }: { readonly name: string; readonly children: ReactNode }) {
  const id = useId()
  return (
    <section data-ui-demo={name} aria-labelledby={id} className="grid gap-4">
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
    <div className="grid gap-2">
      <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{name}</p>
      {children}
    </div>
  )
}

/** El ámbito oscuro (§3.3): lo que vive bajo la cabecera, con sus tokens. */
function Oscuro({ children }: { readonly children: ReactNode }) {
  return (
    <div data-surface="dark" className="grid gap-4 rounded-ui bg-surface p-3">
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
          Your plan runs to Day 78. Open <TextLink to="/_ui" inline>the training plan</TextLink> to change
          a day.
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
        <Field kind="input" id="ui-name" label="Name" value={nombre} onChange={setNombre} help="Up to 40 characters." />
      </Estado>
      <Estado name="input · error">
        <Field kind="input" id="ui-name-error" label="Name" value="M" onChange={nada} error="Must be 2 to 40 characters." />
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
        <Field kind="select" id="ui-week" label="Week 1" value={semana} onChange={setSemana} options={semanas} />
      </Estado>
      <Estado name="select · inline">
        <Field kind="select" id="ui-week-inline" label="Emphasis" inline value={semana} onChange={setSemana} options={semanas} />
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
        <Segmented label="Who decides your training" options={PLAN_MODES} value={modo} onChange={setModo} />
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
            <InfoButton label="About travel days">You don&apos;t train on travel days: 1 out, 1 back.</InfoButton>
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
          <Tabs label="Rider sections (nav)" variant="nav" options={MANY_TABS} value={pestana} onChange={setPestana} />
        </Estado>
      </Demo>
      <Demo name="Stat">
        <div className="grid grid-cols-2 gap-4">
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
        <Notice tone="info" title="Coach mode: nothing you set here is used." action={{ label: 'Switch to Mixed', onClick: nada }}>
          Switch to Mixed to edit your days.
        </Notice>
        <Notice tone="good" title="Your plan is saved." role="status" onDismiss={nada}>
          It runs from Day 51 to Day 78.
        </Notice>
        <Notice tone="warn" title="Results from 3 stages you haven't watched are hidden" action={{ label: 'Manage', onClick: nada }} />
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
          <ErrorState kind="notFound" message="This rider doesn't exist." action={<TextLink to="/_ui">Go to Dashboard</TextLink>} />
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
        <Tabs label="Rider sections (dark scope)" variant="nav" options={MANY_TABS} value={pestana} onChange={setPestana} />
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
    <main className="mx-auto grid max-w-page gap-8 px-3 py-6 sm:px-4">
      <meta name="robots" content="noindex" />
      <title>UI catalog · Cycling Star</title>
      <PageHeader title="UI catalog" status="Every component of the system, in each of its states." />
      <Botones />
      <Enlaces />
      <Campos />
      <Elecciones />
      <Porques />
      <Barras />
      <Estructura />
      <Avisos />
      <Iconos />
      <AmbitoOscuro />
    </main>
  )
}
