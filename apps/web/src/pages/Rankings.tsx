import { VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  type AwardWinner,
  type RaceHonour,
  type RankingRow,
  type SeasonAwards,
  fetchRaceHistory,
  fetchRankings,
  fetchSeasonAwards,
  fetchYoungRankings,
} from '../api/rankings'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { RiderName } from '../components/RiderName'
import { TeamLink } from '../components/TeamLink'

function RankingTable({ rows }: { rows: RankingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-slate-500">
        No points yet — they start rolling in once races are run.
      </p>
    )
  }
  return (
    <table className="w-full text-sm">
      {/* Sin cabecera visible (el diseño es una lista): la leyenda la anuncian los lectores. */}
      <caption className="sr-only">Ranking: position, country, rider, team and points</caption>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
            <td className="w-8 py-1.5 pl-4 text-slate-400 tabular-nums">{i + 1}</td>
            <td className="w-6 py-1.5">
              <Flag code={r.country} size={16} />
            </td>
            <td className="py-1.5 text-slate-700">
              <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
              {r.teamName && (
                <TeamLink
                  teamId={r.teamId}
                  name={r.teamName}
                  className="ml-2 text-xs text-slate-400"
                />
              )}
            </td>
            <td className="py-1.5 pr-4 text-right font-medium tabular-nums text-slate-600">
              {r.points}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

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
            <Link to={`/world/riders/${winner.riderId}`} className="hover:underline">
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
    <Panel title="Season awards">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AWARD_META.map((m) => (
          <AwardCard key={m.key} title={m.title} hint={m.hint} winner={awards[m.key]} />
        ))}
      </div>
    </Panel>
  )
}

function RollOfHonour({ history }: { history: RaceHonour[] }) {
  if (history.length === 0) return null
  return (
    <Panel title="Test tour · roll of honour">
      <ol className="space-y-1.5">
        {history.map((h) => (
          <li key={h.season} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 text-slate-400">Season {h.season + 1}</span>
            <Flag code={h.winnerCountry} size={16} />
            <span className="font-medium text-slate-700">{h.winnerName}</span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

export function Rankings() {
  const [tab, setTab] = useState<'overall' | 'young'>('overall')
  const ranking = useQuery({ queryKey: ['rankings'], queryFn: fetchRankings })
  const young = useQuery({
    queryKey: ['rankings-young'],
    queryFn: fetchYoungRankings,
    enabled: tab === 'young',
  })
  const history = useQuery({ queryKey: ['race-history'], queryFn: fetchRaceHistory })
  const awards = useQuery({ queryKey: ['season-awards'], queryFn: fetchSeasonAwards })

  if (ranking.isPending) return <p className="text-slate-500">Loading…</p>
  if (ranking.isError) return <p className="text-red-600">Could not load the rankings.</p>

  const active = tab === 'young' ? young.data : ranking.data
  const tabClass = (t: 'overall' | 'young') =>
    `rounded px-2.5 py-1 text-sm font-medium transition ${
      tab === t ? 'bg-white text-brand-cyan' : 'text-white/80 hover:bg-white/15'
    }`

  const rankingTabs = (
    <div className="flex items-center gap-1.5">
      <button type="button" className={tabClass('overall')} onClick={() => setTab('overall')}>
        Season points
      </button>
      <button type="button" className={tabClass('young')} onClick={() => setTab('young')}>
        Young riders (U23)
      </button>
    </div>
  )

  return (
    <section className="space-y-4">
      <SectionBar>Rankings</SectionBar>
      <p className="text-sm text-slate-500">
        Individual points for the current season, and the roll of honour of past winners.
      </p>

      {awards.data && <AwardsPanel awards={awards.data} />}

      {history.data && <RollOfHonour history={history.data} />}

      <Panel title="Ranking" action={rankingTabs} bodyClassName="p-0">
        {tab === 'young' && young.isPending ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading…</p>
        ) : (
          <RankingTable rows={active ?? []} />
        )}
      </Panel>
    </section>
  )
}
