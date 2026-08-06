import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchForm } from '../api/form'
import { fetchHealth } from '../api/health'
import { fetchLastRace } from '../api/lastRace'
import { fetchMarket } from '../api/market'
import { fetchEnterableRaces } from '../api/raceEntry'
import { fetchRaceOrders } from '../api/raceOrders'
import { fetchMyRider, fetchMyUpcomingRaces, fetchRiderSummary } from '../api/rider'
import { fetchOrders } from '../api/training'
import { authClient } from '../auth/client'
import { Logo } from '../components/Logo'
import { InfoRow, Panel, SectionBar } from '../components/Panel'
import { StarRating } from '../components/StarRating'
import { TeamLink } from '../components/TeamLink'
import { WorldClock } from '../components/WorldClock'
import { type DashboardAction, buildDashboard } from '../domain/dashboard'
import { raceVerdict } from '../domain/narration'

function SystemStatus() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  return (
    <Panel title="System status">
      {health.isPending && <p className="text-slate-500">Checking…</p>}
      {health.isError && <p className="text-red-600">Could not reach the server.</p>}
      {health.data && (
        <div>
          <InfoRow label="Server">{health.data.ok ? 'Online' : 'Degraded'}</InfoRow>
          <InfoRow label="Engine version">{health.data.engineVersion}</InfoRow>
          <InfoRow label="Game day">
            {health.data.gameDay ?? 'the game has not started yet'}
          </InfoRow>
          <InfoRow label="Database">
            {health.data.migrationsApplied ? 'ready' : 'not migrated'}
          </InfoRow>
        </div>
      )}
    </Panel>
  )
}

/** Guest landing: hero + how-to-play + system status. */
function GuestHome() {
  return (
    <section className="space-y-4">
      <div className="space-y-4">
        <Logo size={96} className="mb-2" />
        <SectionBar>Race. Train. Rise.</SectionBar>
        <p className="max-w-xl text-slate-600">
          A persistent cycling world where your rider trains, gets called up, races a full season,
          signs contracts and builds a palmarès — and the world keeps moving without you.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/register"
            className="rounded-md bg-brand-cyan px-4 py-2.5 font-medium text-white transition hover:bg-brand-cyan-light"
          >
            Create account
          </Link>
          <Link
            to="/how-to-play"
            className="rounded-md border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            How to play
          </Link>
        </div>
      </div>
      <SystemStatus />
    </section>
  )
}

/** Logged in but no rider yet: a single clear next step. */
function NewPlayerHome() {
  return (
    <section className="space-y-4">
      <div className="space-y-4">
        <Logo size={80} className="mb-2" />
        <SectionBar>Welcome to Cycling Star</SectionBar>
        <p className="max-w-xl text-slate-600">
          You don't have a rider yet. Create one to enter the world — pick a specialty and a name,
          and you're on the start line.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/create"
            className="rounded-md bg-brand-cyan px-4 py-2.5 font-medium text-white transition hover:bg-brand-cyan-light"
          >
            Create your rider
          </Link>
          <Link
            to="/how-to-play"
            className="rounded-md border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            How to play
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: 'Stars', text: 'Your abilities are shown in stars, never raw numbers.' },
          { title: 'Matches', text: 'A limited stock of efforts to burn wisely in a race.' },
          { title: 'Form', text: 'Train to improve, ease off to peak fresh for a goal.' },
        ].map((c) => (
          <div key={c.title} className="rounded-md bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h3 className="text-sm font-semibold text-slate-800">{c.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const TONE_CLASS: Record<DashboardAction['tone'], string> = {
  urgent: 'border-l-4 border-l-rose-500 bg-rose-50/60',
  warn: 'border-l-4 border-l-amber-500 bg-amber-50/60',
  info: 'border-l-4 border-l-slate-300 bg-white',
}

/** Un aviso accionable: qué pasa, por qué importa y el único botón que lo resuelve. */
function ActionRow({ action }: { action: DashboardAction }) {
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md px-4 py-3 ring-1 ring-black/5 ${TONE_CLASS[action.tone]}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{action.title}</p>
        {action.detail && <p className="text-xs text-slate-600">{action.detail}</p>}
      </div>
      <Link
        to={action.to}
        className="shrink-0 rounded-md bg-brand-cyan px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-cyan-light"
      >
        {action.cta} →
      </Link>
    </li>
  )
}

/** Crónica de la última carrera corrida, con enlace a la etapa completa. */
function LastRaceCard() {
  const { data } = useQuery({ queryKey: ['rider', 'last-race'], queryFn: fetchLastRace })
  if (!data) return null
  const gap =
    data.position === 1
      ? 'winner'
      : data.timeGapToWinnerS > 0
        ? `+${Math.floor(data.timeGapToWinnerS / 60)}'${String(data.timeGapToWinnerS % 60).padStart(2, '0')}"`
        : 'same time'
  const highlight = data.personalEvents[data.personalEvents.length - 1] ?? null

  return (
    <Panel
      title="Last race"
      action={
        <Link
          to={`/world/races/${data.raceId}/stages/${data.stageDay}`}
          className="text-xs font-medium text-white/90 hover:text-white hover:underline"
        >
          Full story →
        </Link>
      }
    >
      <p className="text-sm font-semibold text-slate-800">
        {data.raceName} — {data.stageName}
      </p>
      <p className="mt-0.5 text-sm text-slate-600">
        <span className="font-bold tabular-nums text-slate-800">{data.position}</span>
        {data.fieldSize > 0 && <span className="text-slate-400"> / {data.fieldSize}</span>}
        <span className="mx-1.5 text-slate-300">·</span>
        {gap}
        {highlight && (
          <>
            <span className="mx-1.5 text-slate-300">·</span>
            in the action at km {highlight.km}
          </>
        )}
      </p>
      <p className="mt-1 text-sm text-brand-cyan">{raceVerdict(data)}</p>
    </Panel>
  )
}

/** Panel del jugador: qué hago hoy, cómo estoy y qué pasó en mi última carrera. */
function PlayerHome({ name }: { name: string }) {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const summary = useQuery({ queryKey: ['rider', 'summary'], queryFn: fetchRiderSummary })
  const training = useQuery({ queryKey: ['orders'], queryFn: fetchOrders })
  const upcoming = useQuery({ queryKey: ['rider', 'upcoming'], queryFn: fetchMyUpcomingRaces })
  const market = useQuery({ queryKey: ['market'], queryFn: fetchMarket })
  const form = useQuery({ queryKey: ['rider', 'form'], queryFn: fetchForm })

  // La carrera que toca: la que está en marcha o la más próxima. Sus órdenes deciden si hay aviso.
  const nextRace = upcoming.data?.find((r) => r.ongoing) ?? upcoming.data?.[0] ?? null
  const raceOrders = useQuery({
    queryKey: ['race-orders', nextRace?.raceKey],
    queryFn: () => fetchRaceOrders(nextRace!.raceKey),
    enabled: !!nextRace,
    // Si aún no estoy en la lista de salida el servidor responde 403: no hay nada que reintentar.
    retry: false,
  })

  const freeAgent = summary.data != null && summary.data.teamId == null
  const entries = useQuery({
    queryKey: ['race-entries'],
    queryFn: fetchEnterableRaces,
    enabled: freeAgent,
  })

  const planned = training.data?.orders ?? []
  const currentDay = training.data?.currentDay ?? 0
  const trainingPlannedDays = planned.reduce(
    (max, order) => Math.max(max, order.gameDay - currentDay),
    0,
  )
  const pendingEntries = (entries.data ?? []).filter((r) => r.entered).length

  const actions = buildDashboard({
    nextRace: nextRace
      ? {
          raceKey: nextRace.raceKey,
          raceName: nextRace.raceName,
          daysUntil: nextRace.daysUntil,
          ongoing: nextRace.ongoing,
          // Mientras no sepamos qué órdenes hay, no metemos ruido: se asume que están puestas.
          hasOrders: raceOrders.data ? raceOrders.data.orders.length > 0 : true,
        }
      : null,
    trainingPlannedDays: training.data ? trainingPlannedDays : 99,
    offers: market.data?.offers.length ?? 0,
    freeAgent,
    affordableEntries: (entries.data ?? []).filter((r) => !r.entered && r.affordable).length,
    bookedRaces: (upcoming.data?.length ?? 0) + pendingEntries,
  })

  const stats = summary.data
    ? [
        { label: 'Season points', value: summary.data.seasonPoints.toLocaleString('en-US') },
        { label: 'Money', value: summary.data.money.toLocaleString('en-US') },
        { label: 'Morale', value: `${Math.round(summary.data.morale)}%` },
        { label: 'Fame', value: String(Math.round(summary.data.fame)) },
      ]
    : []

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <SectionBar>{name}</SectionBar>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
          <p className="text-sm text-slate-500">
            {summary.data?.teamName ? (
              <TeamLink teamId={summary.data.teamId} name={summary.data.teamName} />
            ) : (
              'Free agent'
            )}
          </p>
          {health.data && (
            <WorldClock
              gameDay={health.data.gameDay}
              tickIntervalMinutes={health.data.tickIntervalMinutes}
              nextTickAtMs={health.data.nextTickAtMs ?? null}
            />
          )}
        </div>
      </div>

      {/* Solo lo accionable: si no hay nada que decidir, este bloque no existe. */}
      {actions.length > 0 && (
        <ul className="space-y-2">
          {actions.map((action) => (
            <ActionRow key={action.id} action={action} />
          ))}
        </ul>
      )}

      <Panel
        title="Condition"
        action={form.data?.form && <StarRating value={form.data.form.stars} />}
      >
        {form.data?.form ? (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Freshness</span>
              <span className="tabular-nums">{Math.round(form.data.form.freshness)} / 100</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${form.data.form.freshness}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No training data yet.</p>
        )}
        {stats.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-md bg-slate-50 p-2.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {s.label}
                </dt>
                <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-3 text-xs">
          <Link to="/me/profile" className="font-medium text-brand-cyan hover:underline">
            See the full profile →
          </Link>
        </p>
      </Panel>

      <LastRaceCard />
    </section>
  )
}

export function Home() {
  const { data: session } = authClient.useSession()
  const riderQuery = useQuery({
    queryKey: ['rider', 'me'],
    queryFn: fetchMyRider,
    enabled: !!session,
  })

  if (!session) return <GuestHome />
  if (riderQuery.isPending) return <p className="text-slate-500">Loading…</p>
  if (!riderQuery.data) return <NewPlayerHome />
  return <PlayerHome name={riderQuery.data.name} />
}
