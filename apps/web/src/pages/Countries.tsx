import { COUNTRIES, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchCountries } from '../api/browse'
import { Flag } from '../components/Flag'

/** Naciones (#7): países con corredores en activo; enlaza al ranking nacional de cada uno. */
export function Countries() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load countries.</p>

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every country with riders in the world. Tap one for its national ranking.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((c) => {
          const info = COUNTRIES.find((x) => x.code === c.country)
          return (
            <Link
              key={c.country}
              to={`/countries/${c.country}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-300"
            >
              <span className="flex items-center gap-2">
                <Flag code={c.country} size={18} />
                <span className="text-sm font-semibold text-slate-800">
                  {info?.name ?? c.country}
                </span>
              </span>
              <span className="text-xs tabular-nums text-slate-400">{c.riderCount} riders</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/** Etiqueta de la vocación de un corredor. */
export function archetypeLabel(archetype: string): string {
  return VOCATION_LABELS[archetype as Vocation] ?? archetype
}
