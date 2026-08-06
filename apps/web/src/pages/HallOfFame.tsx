import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { type RecordEntry, fetchHallOfFame, fetchRecords } from '../api/rankings'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { RiderName } from '../components/RiderName'

function RecordCard({
  title,
  entry,
  unit,
}: {
  title: string
  entry: RecordEntry | null
  unit: string
}) {
  return (
    <Panel title={title}>
      {entry ? (
        <>
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-slate-800">{entry.value}</span>
            <span className="text-xs text-slate-400">{unit}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
            <Flag code={entry.country} size={14} />
            <Link to={`/world/riders/${entry.riderId}`} className="hover:underline">
              <RiderName riderId={entry.riderId} name={entry.name} isBot={entry.isBot} />
            </Link>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">{entry.note}</p>
        </>
      ) : (
        <p className="text-sm text-slate-400">—</p>
      )}
    </Panel>
  )
}

/** Salón de la fama (#58/#62): corredores por palmarés total de todas las temporadas. */
export function HallOfFame() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['hall-of-fame'],
    queryFn: fetchHallOfFame,
  })
  const records = useQuery({ queryKey: ['records'], queryFn: fetchRecords })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the hall of fame.</p>

  const rec = records.data
  const hasRecords = rec && (rec.mostWins || rec.mostGcWins || rec.youngestWinner)

  return (
    <section className="space-y-4">
      <SectionBar>Hall of Fame</SectionBar>
      <p className="text-sm text-slate-500">
        The most decorated riders of the world, by all-time wins across every season.
      </p>

      {hasRecords && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            All-time records
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <RecordCard title="Most wins" entry={rec.mostWins} unit="wins" />
            <RecordCard title="Most overall wins" entry={rec.mostGcWins} unit="GC" />
            <RecordCard title="Youngest overall winner" entry={rec.youngestWinner} unit="yrs" />
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <Panel>
          <p className="text-center text-sm text-slate-500">
            No honours yet — win a race and you'll be the first name here.
          </p>
        </Panel>
      ) : (
        <Panel title="All-time honours" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="py-2 pl-4 text-left font-semibold">
                    #
                  </th>
                  <th scope="col" className="py-2 text-left font-semibold">
                    Rider
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Overall
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Stages
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Mtn
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Pts
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                    <td className="w-8 py-1.5 pl-4 tabular-nums text-slate-400">{i + 1}</td>
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        <Flag code={r.country} size={16} />
                        <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">{r.gc || '—'}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">
                      {r.stage || '—'}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">
                      {r.kom || '—'}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">
                      {r.points || '—'}
                    </td>
                    <td className="py-1.5 pr-4 text-right font-bold tabular-nums text-slate-800">
                      {r.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </section>
  )
}
