import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { type TeamListItem, fetchTeams } from '../api/browse'
import { Flag } from '../components/Flag'
import { Jersey } from '../components/Jersey'

const DIVISION_BADGE: Record<string, string> = {
  WT: 'bg-indigo-100 text-indigo-700',
  PRS: 'bg-sky-100 text-sky-700',
  CON: 'bg-slate-100 text-slate-600',
}
const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
}

function DivisionBlock({ division, teams }: { division: string; teams: TeamListItem[] }) {
  if (teams.length === 0) return null
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {DIVISION_LABEL[division] ?? division}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {teams.map((t) => (
          <Link
            key={t.id}
            to={`/teams/${t.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-300"
          >
            <span className="flex items-center gap-2">
              <Jersey seed={t.jerseySeed} size={26} />
              <Flag code={t.country} size={16} />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIVISION_BADGE[t.division] ?? ''}`}
              >
                {t.division}
              </span>
              <span className="text-sm font-semibold text-slate-800">{t.name}</span>
            </span>
            <span className="text-xs tabular-nums text-slate-400">
              {t.pointsSeason} pts · {t.riderCount} riders
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Teams() {
  const { data, isPending, isError } = useQuery({ queryKey: ['teams'], queryFn: fetchTeams })
  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load teams.</p>

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.length} teams across the three divisions.
        </p>
      </div>
      {['WT', 'PRS', 'CON'].map((div) => (
        <DivisionBlock key={div} division={div} teams={data.filter((t) => t.division === div)} />
      ))}
    </section>
  )
}
