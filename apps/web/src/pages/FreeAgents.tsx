import { COUNTRIES, VOCATION_LABELS, VOCATIONS, type Vocation } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFreeAgents } from '../api/browse'
import { Flag } from '../components/Flag'
import { RiderName } from '../components/RiderName'

/** Mercado de agentes libres (#20): corredores en activo sin equipo, con filtros por país y vocación. */
export function FreeAgents() {
  const [country, setCountry] = useState('')
  const [vocation, setVocation] = useState('')
  const { data, isPending, isError } = useQuery({
    queryKey: ['free-agents', country, vocation],
    queryFn: () => fetchFreeAgents({ country, vocation }),
  })

  const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Free agents</h1>
        <p className="mt-1 text-sm text-slate-500">
          Active riders without a team, ranked by fame. Filter by nation or specialty.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={selectClass}
        >
          <option value="">All nations</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={vocation}
          onChange={(e) => setVocation(e.target.value)}
          className={selectClass}
        >
          <option value="">All specialties</option>
          {VOCATIONS.map((v) => (
            <option key={v} value={v}>
              {VOCATION_LABELS[v]}
            </option>
          ))}
        </select>
        {(country || vocation) && (
          <button
            type="button"
            onClick={() => {
              setCountry('')
              setVocation('')
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>

      {isPending ? (
        <p className="text-slate-500">Loading…</p>
      ) : isError ? (
        <p className="text-red-600">Could not load free agents.</p>
      ) : data.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No free agents match those filters.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="w-6 py-1.5 pl-4">
                    <Flag code={r.country} size={16} />
                  </td>
                  <td className="py-1.5">
                    <Link to={`/riders/${r.id}`} className="hover:underline">
                      <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                    </Link>
                  </td>
                  <td className="py-1.5 text-slate-500">
                    {VOCATION_LABELS[r.archetype as Vocation] ?? r.archetype}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-400">age {r.age}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-slate-400">
                    {r.seasonPoints} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
