import { COUNTRIES } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchCountryRiders } from '../api/browse'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { RiderName } from '../components/RiderName'
import { archetypeLabel } from './Countries'

/** Ranking nacional (#7): corredores de un país por puntos de temporada. */
export function Country() {
  const { code = '' } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['country', code],
    queryFn: () => fetchCountryRiders(code),
  })
  const info = COUNTRIES.find((c) => c.code === code.toUpperCase())

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load this country.</p>

  return (
    <section className="space-y-4">
      <Link to="/countries" className="text-sm text-slate-400 hover:text-indigo-600">
        ← All nations
      </Link>
      <SectionBar>
        <span className="flex items-center gap-2">
          <Flag code={code.toUpperCase()} size={28} />
          {info?.name ?? code.toUpperCase()}
        </span>
      </SectionBar>
      <p className="text-sm text-slate-500">
        {data.length} active {data.length === 1 ? 'rider' : 'riders'} · national ranking by season
        points
      </p>

      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No active riders from this country yet.</p>
      ) : (
        <Panel title="National ranking" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Rider</th>
                  <th className="px-3 py-2 font-medium">Team</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-2 tabular-nums text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {r.teamId && r.teamName ? (
                        <Link
                          to={`/teams/${r.teamId}`}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {r.teamName}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{archetypeLabel(r.archetype)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-700">
                      {r.seasonPoints.toLocaleString('en-US')}
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
