import { COUNTRIES, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchTeam } from '../api/browse'
import { Jersey } from '../components/Jersey'
import { RiderName } from '../components/RiderName'
import { RiderPortrait } from '../components/RiderPortrait'

function flag(country: string): string {
  return COUNTRIES.find((c) => c.code === country)?.flag ?? '🏳️'
}
const DIVISION_LABEL: Record<string, string> = {
  WT: 'World Tour',
  PRS: 'Pro Series',
  CON: 'Continental',
}

export function Team() {
  const { id = '' } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['team', id],
    queryFn: () => fetchTeam(id),
  })
  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the team.</p>

  return (
    <section className="space-y-6">
      <div>
        <Link to="/teams" className="text-xs text-slate-400 hover:text-slate-600">
          ← Teams
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <Jersey seed={data.jerseySeed} size={44} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {DIVISION_LABEL[data.division] ?? data.division} · {data.pointsSeason} season points ·
              budget {data.budget.toLocaleString('en-US')}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Roster ({data.roster.length})
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {data.roster.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="w-9 py-1.5 pl-4">
                  <RiderPortrait seed={r.id} size={28} />
                </td>
                <td className="w-6 py-1.5" aria-hidden>
                  {flag(r.country)}
                </td>
                <td className="py-1.5">
                  <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                </td>
                <td className="py-1.5 text-slate-500">
                  {VOCATION_LABELS[r.archetype as Vocation] ?? r.archetype}
                </td>
                <td className="py-1.5 pr-4 text-right tabular-nums text-slate-400">
                  {r.seasonPoints} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
