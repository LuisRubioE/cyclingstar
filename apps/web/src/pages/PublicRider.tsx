import {
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  COUNTRIES,
  VOCATION_LABELS,
  type Vocation,
  stars,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchPublicRider } from '../api/browse'
import { StarRating } from '../components/StarRating'

export function PublicRider() {
  const { id = '' } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['public-rider', id],
    queryFn: () => fetchPublicRider(id),
  })
  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the rider.</p>

  const country = COUNTRIES.find((c) => c.code === data.country)

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {country?.flag ?? '🏳️'}
        </span>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {data.name}
            {data.isBot ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                NPC
              </span>
            ) : (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Player
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            {VOCATION_LABELS[data.archetype as Vocation] ?? data.archetype} ·{' '}
            {country?.name ?? data.country} · age {data.age}
            {data.teamName && data.teamId && (
              <>
                {' · '}
                <Link
                  to={`/teams/${data.teamId}`}
                  className="hover:text-indigo-600 hover:underline"
                >
                  {data.teamName}
                </Link>
              </>
            )}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Season points', value: data.seasonPoints.toLocaleString('en-US') },
          { label: 'Fame', value: Math.round(data.fame) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {s.label}
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-800">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attributes</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {ATTRIBUTES.map((attr) => (
            <div key={attr} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-slate-600">{ATTRIBUTE_LABELS[attr]}</dt>
              <dd>
                <StarRating value={stars(data.attributes[attr] ?? 0)} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
