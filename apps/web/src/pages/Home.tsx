import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { authClient } from '../auth/client'
import { fetchHealth } from '../api/health'
import { Logo } from '../components/Logo'

export function Home() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const { data: session } = authClient.useSession()

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
          {session ? (
            <Link
              to="/rider"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
            >
              My rider
            </Link>
          ) : (
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
            >
              Create account
            </Link>
          )}
          <Link
            to="/how-to-play"
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            How to play
          </Link>
        </div>
      </div>

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
    </section>
  )
}
