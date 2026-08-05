import { COUNTRIES, VOCATION_LABELS, type Vocation, birthdayDayOfSeason } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchPublicRider } from '../api/browse'
import { fetchRiderPalmares, fetchRiderResults, palmaresLabel } from '../api/rankings'
import { AttributeList } from '../components/AttributeList'
import { Badges } from '../components/Badges'
import { Flag } from '../components/Flag'

export function PublicRider() {
  const { id = '' } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['public-rider', id],
    queryFn: () => fetchPublicRider(id),
  })
  const palmaresQuery = useQuery({
    queryKey: ['public-rider', id, 'palmares'],
    queryFn: () => fetchRiderPalmares(id),
  })
  const resultsQuery = useQuery({
    queryKey: ['public-rider', id, 'results'],
    queryFn: () => fetchRiderResults(id),
  })
  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the rider.</p>

  const country = COUNTRIES.find((c) => c.code === data.country)
  const abroad = data.residence && data.residence !== data.country
  const residenceCountry = COUNTRIES.find((c) => c.code === data.residence)

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3">
        <Flag code={data.country} size={30} />
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
            <Link
              to={`/countries/${data.country}`}
              className="hover:text-indigo-600 hover:underline"
            >
              {country?.name ?? data.country}
            </Link>{' '}
            · age {data.age} · 🎂 day {birthdayDayOfSeason(id)}
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
            {abroad && (
              <span className="inline-flex items-center gap-1">
                {' · '}🏠 lives in <Flag code={data.residence} size={12} />
                {residenceCountry?.name ?? data.residence}
              </span>
            )}
          </p>
        </div>
      </header>

      <Badges riderId={id} />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Season points', value: data.seasonPoints.toLocaleString('en-US') },
          {
            label: 'Season rank',
            value: data.fieldSize ? `#${data.seasonRank.toLocaleString('en-US')}` : '—',
          },
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

      {resultsQuery.data && resultsQuery.data.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Recent results
          </h2>
          <ul className="mt-3 space-y-1.5">
            {resultsQuery.data.map((r, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-8 shrink-0 text-right font-bold tabular-nums ${
                    r.puesto === 1
                      ? 'text-amber-500'
                      : r.puesto <= 3
                        ? 'text-slate-600'
                        : 'text-slate-400'
                  }`}
                >
                  {r.puesto}
                </span>
                <Link to={`/races/${r.raceId}`} className="font-medium text-slate-700 hover:underline">
                  {r.raceName}
                </Link>
                {!r.isOneDay && <span className="text-xs text-slate-400">Stage {r.stageDay}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {palmaresQuery.data && palmaresQuery.data.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attributes</h2>
        <p className="mt-1 text-xs text-slate-400">Tap an attribute to see what it does.</p>
        <AttributeList attributes={data.attributes} />
      </div>
    </section>
  )
}
