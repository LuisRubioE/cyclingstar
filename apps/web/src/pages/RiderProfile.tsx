import {
  COUNTRIES,
  VOCATION_LABELS,
  birthdayDayOfSeason,
  currentSeason,
  riderAge,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchForm } from '../api/form'
import { fetchHealth } from '../api/health'
import { fetchPalmares, palmaresLabel } from '../api/rankings'
import { fetchMyRider, fetchRiderSummary } from '../api/rider'
import { AttributeList } from '../components/AttributeList'
import { Flag } from '../components/Flag'
import { FormChart } from '../components/FormChart'
import { LastRaceReport } from '../components/LastRaceReport'
import { RiderPortrait } from '../components/RiderPortrait'
import { RoleEditor } from '../components/RoleEditor'
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
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

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
        <RiderPortrait seed={rider.id} size={56} />
        <Flag code={rider.country} size={30} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{rider.name}</h1>
          <p className="text-sm text-slate-500">
            {VOCATION_LABELS[rider.archetype]} · {country?.name ?? rider.country}
            {summaryQuery.data?.teamName && <> · {summaryQuery.data.teamName}</>}
          </p>
          {summaryQuery.data && summaryQuery.data.fieldSize > 0 && (
            <p className="mt-0.5 text-xs font-medium text-indigo-600">
              Season rank #{summaryQuery.data.seasonRank.toLocaleString('en-US')} of{' '}
              {summaryQuery.data.fieldSize.toLocaleString('en-US')}
            </p>
          )}
          {healthQuery.data?.gameDay != null && (
            <p className="mt-0.5 text-xs text-slate-400">
              Age {riderAge(rider.birthSeason, currentSeason(healthQuery.data.gameDay))} · 🎂 born
              on day {birthdayDayOfSeason(rider.id)} of the season
            </p>
          )}
          <div className="mt-1.5">
            <RoleEditor current={rider.archetype} />
          </div>
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

      <LastRaceReport />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Form &amp; condition
          </h2>
          {formQuery.data?.form && <StarRating value={formQuery.data.form.stars} />}
        </div>
        {formQuery.data?.form && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Freshness — race readiness</span>
              <span className="tabular-nums">
                {Math.round(formQuery.data.form.freshness)} / 100
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${formQuery.data.form.freshness}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              How rested you are today. <span className="font-medium">High</span> = fresh and
              race-ready; <span className="font-medium">low</span> = fatigued from hard training.
              Training hard lowers it short-term; easing off (rest / easy days) before a goal raises
              it. Peaking = high fitness with high freshness.
            </p>
          </div>
        )}
        <div className="mt-4">
          <FormChart points={formQuery.data?.log ?? []} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attributes</h2>
        <p className="mt-1 text-xs text-slate-400">Tap an attribute to see what it does.</p>
        <AttributeList attributes={rider.attributes} />
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
