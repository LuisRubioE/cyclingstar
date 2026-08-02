import {
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  COUNTRIES,
  VOCATION_LABELS,
  stars,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchForm } from '../api/form'
import { fetchPalmares, palmaresLabel } from '../api/rankings'
import { fetchMyRider, fetchRiderSummary } from '../api/rider'
import { FormChart } from '../components/FormChart'
import { StarRating } from '../components/StarRating'

export function RiderProfile() {
  const {
    data: rider,
    isPending,
    isError,
  } = useQuery({ queryKey: ['rider', 'me'], queryFn: fetchMyRider })
  const formQuery = useQuery({ queryKey: ['rider', 'form'], queryFn: fetchForm })
  const palmaresQuery = useQuery({ queryKey: ['rider', 'palmares'], queryFn: fetchPalmares })
  const summaryQuery = useQuery({ queryKey: ['rider', 'summary'], queryFn: fetchRiderSummary })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load your rider.</p>

  if (!rider) {
    return (
      <section className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">No rider yet</h1>
        <p className="text-slate-600">Create your rider to enter the world.</p>
        <Link
          to="/create"
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
        >
          Create your rider
        </Link>
      </section>
    )
  }

  const country = COUNTRIES.find((c) => c.code === rider.country)

  return (
    <section className="space-y-8">
      <header className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {country?.flag ?? '🏳️'}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{rider.name}</h1>
          <p className="text-sm text-slate-500">
            {VOCATION_LABELS[rider.archetype]} · {country?.name ?? rider.country}
            {summaryQuery.data?.teamName && <> · {summaryQuery.data.teamName}</>}
          </p>
        </div>
      </header>

      {summaryQuery.data && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Season points',
              value: summaryQuery.data.seasonPoints.toLocaleString('en-US'),
            },
            { label: 'Money', value: summaryQuery.data.money.toLocaleString('en-US') },
            { label: 'Morale', value: Math.round(summaryQuery.data.morale) },
            { label: 'Fame', value: Math.round(summaryQuery.data.fame) },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {s.label}
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-800">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Form</h2>
          {formQuery.data?.form && <StarRating value={formQuery.data.form.stars} />}
        </div>
        {formQuery.data?.form && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Freshness</span>
              <span>{Math.round(formQuery.data.form.freshness)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${formQuery.data.form.freshness}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-4">
          <FormChart points={formQuery.data?.log ?? []} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attributes</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {ATTRIBUTES.map((attr) => (
            <div key={attr} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-slate-600">{ATTRIBUTE_LABELS[attr]}</dt>
              <dd>
                <StarRating value={stars(rider.attributes[attr] ?? 0)} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {palmaresQuery.data && palmaresQuery.data.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Palmarès</h2>
          <ul className="mt-3 space-y-1.5">
            {palmaresQuery.data.map((p, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-slate-400">Season {p.season + 1}</span>
                <span className="font-medium text-slate-700">{p.raceName}</span>
                <span className="text-slate-500">
                  {palmaresLabel(p.kind)}
                  {p.detail && ` · ${p.detail}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
