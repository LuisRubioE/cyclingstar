import { VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  type AwardWinner,
  type RaceHonour,
  type SeasonAwards,
  fetchRaceHistory,
  fetchRankings,
  fetchSeasonAwards,
} from '../api/rankings'
import { Flag } from '../components/Flag'
import { RiderName } from '../components/RiderName'

const AWARD_META: { key: keyof SeasonAwards; title: string; hint: string }[] = [
  { key: 'riderOfYear', title: 'Rider of the year', hint: 'Most season points' },
  { key: 'bestSprinter', title: 'Best sprinter', hint: 'Top points · sprinter' },
  { key: 'bestClimber', title: 'Best climber', hint: 'Top points · climber' },
  { key: 'revelation', title: 'Revelation', hint: 'Best rider aged 23 or under' },
]

function AwardCard({
  title,
  hint,
  winner,
}: {
  title: string
  hint: string
  winner: AwardWinner | null
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {winner ? (
        <>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Flag code={winner.country} size={16} />
            <Link to={`/riders/${winner.riderId}`} className="hover:underline">
              <RiderName riderId={winner.riderId} name={winner.name} isBot={winner.isBot} />
            </Link>
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {VOCATION_LABELS[winner.archetype as Vocation] ?? winner.archetype} ·{' '}
            {winner.points.toLocaleString('en-US')} pts
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-slate-400">—</p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">{hint}</p>
    </div>
  )
}

function AwardsPanel({ awards }: { awards: SeasonAwards }) {
  if (AWARD_META.every((m) => awards[m.key] === null)) return null
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Season awards
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AWARD_META.map((m) => (
          <AwardCard key={m.key} title={m.title} hint={m.hint} winner={awards[m.key]} />
        ))}
      </div>
    </div>
  )
}

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
  const awards = useQuery({ queryKey: ['season-awards'], queryFn: fetchSeasonAwards })

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

      {awards.data && <AwardsPanel awards={awards.data} />}

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
