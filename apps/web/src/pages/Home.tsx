import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { authClient } from '../auth/client'
import { fetchHealth } from '../api/health'
import { fetchMyRider, fetchRiderSummary } from '../api/rider'
import { Logo } from '../components/Logo'
import { WorldClock } from '../components/WorldClock'

/** Quick actions on the player dashboard (Paso 41): where a returning player goes next. */
const ACTIONS = [
  { to: '/training', label: 'Training', hint: 'Plan your week', icon: '🚴' },
  { to: '/objectives', label: 'Objectives', hint: 'Set your season goals', icon: '🎯' },
  { to: '/race-orders', label: 'Race orders', hint: 'How to ride the next race', icon: '📋' },
  { to: '/results', label: 'Results', hint: 'How the last races went', icon: '🏁' },
  { to: '/market', label: 'Market', hint: 'Offers and contracts', icon: '📝' },
  { to: '/finances', label: 'Finances', hint: 'Your money and ledger', icon: '💶' },
]

function SystemStatus() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        System status
      </h2>
      {health.isPending && <p className="mt-3 text-slate-500">Checking…</p>}
      {health.isError && <p className="mt-3 text-red-600">Could not reach the server.</p>}
      {health.data && (
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-slate-500">Server</dt>
          <dd className="font-medium text-slate-900">{health.data.ok ? 'Online' : 'Degraded'}</dd>
          <dt className="text-slate-500">Engine version</dt>
          <dd className="font-medium text-slate-900">{health.data.engineVersion}</dd>
          <dt className="text-slate-500">World day</dt>
          <dd className="font-medium text-slate-900">
            {health.data.gameDay ?? 'the world has not started yet'}
          </dd>
          <dt className="text-slate-500">Database</dt>
          <dd className="font-medium text-slate-900">
            {health.data.migrationsApplied ? 'ready' : 'not migrated'}
          </dd>
        </dl>
      )}
    </div>
  )
}

/** Guest landing: hero + how-to-play + system status. */
function GuestHome() {
  return (
    <section className="space-y-10">
      <div className="space-y-4">
        <Logo size={96} className="mb-2" />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Race. Train. Rise.
        </h1>
        <p className="max-w-xl text-slate-600">
          A persistent cycling world where your rider trains, gets called up, races a full season,
          signs contracts and builds a palmarès — and the world keeps moving without you.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
          >
            Create account
          </Link>
          <Link
            to="/how-to-play"
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
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
    <section className="space-y-8">
      <div className="space-y-4">
        <Logo size={80} className="mb-2" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome to Cycling Star
        </h1>
        <p className="max-w-xl text-slate-600">
          You don't have a rider yet. Create one to enter the world — pick a specialty and a name,
          and you're on the start line.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/create"
            className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
          >
            Create your rider
          </Link>
          <Link
            to="/how-to-play"
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            How to play
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: '⭐',
            title: 'Stars',
            text: 'Your abilities are shown in stars, never raw numbers.',
          },
          {
            icon: '🔥',
            title: 'Matches',
            text: 'A limited stock of efforts to burn wisely in a race.',
          },
          {
            icon: '📈',
            title: 'Form',
            text: 'Train to improve, ease off to peak fresh for a goal.',
          },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-2xl" aria-hidden>
              {c.icon}
            </div>
            <h3 className="mt-1 text-sm font-semibold text-slate-800">{c.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Returning player dashboard: greeting, stats and quick actions. */
function PlayerHome({ name }: { name: string }) {
  const summaryQuery = useQuery({ queryKey: ['rider', 'summary'], queryFn: fetchRiderSummary })
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const summary = summaryQuery.data

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {health.data?.gameDay != null ? `World day ${health.data.gameDay}` : 'Your world'}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{name}</h1>
        {summary?.teamName ? (
          <p className="text-sm text-slate-500">{summary.teamName}</p>
        ) : (
          <p className="text-sm text-slate-500">Free agent — waiting for an offer.</p>
        )}
        {health.data && (
          <div className="mt-2">
            <WorldClock
              gameDay={health.data.gameDay}
              tickIntervalMinutes={health.data.tickIntervalMinutes}
              nextTickAtMs={health.data.nextTickAtMs ?? null}
            />
          </div>
        )}
      </div>

      {summary && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Season points', value: summary.seasonPoints.toLocaleString('en-US') },
            { label: 'Money', value: summary.money.toLocaleString('en-US') },
            { label: 'Morale', value: Math.round(summary.morale) },
            { label: 'Fame', value: Math.round(summary.fame) },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {s.label}
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-800">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next steps</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              <span className="text-2xl" aria-hidden>
                {a.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-800">{a.label}</span>
                <span className="block text-xs text-slate-500">{a.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <Link
        to="/rider"
        className="inline-block rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
      >
        View my rider
      </Link>
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
