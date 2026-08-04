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
import { type RaceClass, raceClassLabel } from '../api/calendar'
import { fetchMyRider, fetchMyUpcomingRaces, fetchRiderSummary } from '../api/rider'
import { AttributeList } from '../components/AttributeList'
import { Badges } from '../components/Badges'
import { Flag } from '../components/Flag'
import { FormChart } from '../components/FormChart'
import { LastRaceReport } from '../components/LastRaceReport'
import { Panel, SectionBar, InfoRow } from '../components/Panel'
import { RoleEditor } from '../components/RoleEditor'
import { TeamLink } from '../components/TeamLink'
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
  const upcomingQuery = useQuery({ queryKey: ['rider', 'upcoming'], queryFn: fetchMyUpcomingRaces })
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

  const age =
    healthQuery.data?.gameDay != null
      ? riderAge(rider.birthSeason, currentSeason(healthQuery.data.gameDay))
      : null

  return (
    <section className="space-y-4">
      <SectionBar>{rider.name}</SectionBar>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Información personal */}
        <Panel title="Personal information" className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-3">
            <Flag code={rider.country} size={34} />
            <div>
              <p className="text-xl font-bold tracking-tight">{rider.name}</p>
              <p className="text-sm text-slate-500">
                {VOCATION_LABELS[rider.archetype]}
                {summaryQuery.data?.teamName ? (
                  <>
                    {' · '}
                    <TeamLink
                      teamId={summaryQuery.data.teamId}
                      name={summaryQuery.data.teamName}
                      className="text-brand-cyan"
                    />
                  </>
                ) : (
                  ' · Free agent'
                )}
              </p>
            </div>
          </div>
          <InfoRow label="Nationality">{country?.name ?? rider.country}</InfoRow>
          {summaryQuery.data && summaryQuery.data.residence !== summaryQuery.data.nationality && (
            <InfoRow label="Lives in">
              <span className="inline-flex items-center gap-1.5">
                <Flag code={summaryQuery.data.residence} size={14} />
                {COUNTRIES.find((c) => c.code === summaryQuery.data!.residence)?.name ??
                  summaryQuery.data.residence}
                <span className="text-xs text-slate-400">
                  · {summaryQuery.data.housingCovered ? 'team covers rent' : 'you pay rent'}
                </span>
              </span>
            </InfoRow>
          )}
          <InfoRow label="Role">
            <RoleEditor current={rider.archetype} />
          </InfoRow>
          {age != null && (
            <InfoRow label="Age">
              {age} · born day {birthdayDayOfSeason(rider.id)} of the season
            </InfoRow>
          )}
          {summaryQuery.data && summaryQuery.data.fieldSize > 0 && (
            <InfoRow label="Season rank">
              #{summaryQuery.data.seasonRank.toLocaleString('en-US')} of{' '}
              {summaryQuery.data.fieldSize.toLocaleString('en-US')}
            </InfoRow>
          )}
        </Panel>

        {/* Resumen numérico */}
        <Panel title="Summary" bodyClassName="p-0">
          {summaryQuery.data ? (
            <dl>
              {[
                {
                  label: 'Season points',
                  value: summaryQuery.data.seasonPoints.toLocaleString('en-US'),
                },
                { label: 'Money', value: `${summaryQuery.data.money.toLocaleString('en-US')} €` },
                { label: 'Morale', value: `${Math.round(summaryQuery.data.morale)}%` },
                { label: 'Fame', value: Math.round(summaryQuery.data.fame) },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={`flex items-baseline justify-between px-4 py-2 ${
                    i % 2 === 0 ? 'bg-slate-50' : ''
                  }`}
                >
                  <dt className="text-sm font-semibold text-slate-600">{s.label}</dt>
                  <dd className="text-sm font-bold tabular-nums text-slate-800">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="p-4 text-sm text-slate-400">—</p>
          )}
        </Panel>
      </div>

      <Badges riderId={rider.id} />

      {upcomingQuery.data && upcomingQuery.data.length > 0 && (
        <Panel title="Upcoming races">
          <ul className="divide-y divide-slate-100">
            {upcomingQuery.data.map((r) => (
              <li key={r.raceId} className="flex items-center justify-between gap-2 py-2">
                <Link
                  to={`/races/${r.raceId}`}
                  className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
                >
                  {r.country && <Flag code={r.country} size={14} />}
                  <span className="truncate">{r.raceName}</span>
                  <span className="shrink-0 text-xs font-normal text-slate-400">
                    {raceClassLabel(r.raceClass as RaceClass)}
                    {r.stageCount > 1 ? ` · ${r.stageCount} stages` : ''}
                  </span>
                </Link>
                <span className="shrink-0 text-xs text-slate-500">
                  {r.ongoing
                    ? 'Racing now'
                    : r.daysUntil <= 0
                      ? 'Starts today'
                      : `in ${r.daysUntil} ${r.daysUntil === 1 ? 'day' : 'days'}`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <LastRaceReport />

      <Panel
        title="Form & condition"
        action={formQuery.data?.form && <StarRating value={formQuery.data.form.stars} />}
      >
        {formQuery.data?.form && (
          <div>
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
      </Panel>

      <Panel title="Attributes">
        <p className="mb-1 text-xs text-slate-400">Tap an attribute to see what it does.</p>
        <AttributeList attributes={rider.attributes} />
      </Panel>

      {palmaresQuery.data && palmaresQuery.data.length > 0 && (
        <Panel title="Palmarès">
          <ul className="space-y-1.5">
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
        </Panel>
      )}
    </section>
  )
}
