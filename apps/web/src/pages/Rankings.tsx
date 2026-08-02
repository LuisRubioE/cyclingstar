import { useQuery } from '@tanstack/react-query'
import { type RaceHonour, fetchRaceHistory, fetchRankings } from '../api/rankings'
import { Flag } from '../components/Flag'
import { RiderName } from '../components/RiderName'

function RollOfHonour({ history }: { history: RaceHonour[] }) {
  if (history.length === 0) return null
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Test tour · roll of honour
      </h2>
      <ol className="space-y-1.5">
        {history.map((h) => (
          <li key={h.season} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 text-slate-400">Season {h.season + 1}</span>
            <Flag code={h.winnerCountry} size={16} />
            <span className="font-medium text-slate-700">{h.winnerName}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Rankings() {
  const ranking = useQuery({ queryKey: ['rankings'], queryFn: fetchRankings })
  const history = useQuery({ queryKey: ['race-history'], queryFn: fetchRaceHistory })

  if (ranking.isPending) return <p className="text-slate-500">Loading…</p>
  if (ranking.isError) return <p className="text-red-600">Could not load the rankings.</p>

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rankings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Individual points for the current season, and the roll of honour of past winners.
        </p>
      </div>

      {history.data && <RollOfHonour history={history.data} />}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Season points
        </h2>
        {ranking.data.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            No points yet — they start rolling in once races are run.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {ranking.data.map((r, i) => (
                <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                  <td className="w-8 py-1.5 pl-4 text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="w-6 py-1.5">
                    <Flag code={r.country} size={16} />
                  </td>
                  <td className="py-1.5 text-slate-700">
                    <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                    {r.teamName && (
                      <span className="ml-2 text-xs text-slate-400">{r.teamName}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4 text-right font-medium tabular-nums text-slate-600">
                    {r.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
