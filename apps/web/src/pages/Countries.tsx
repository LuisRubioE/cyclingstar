import {
  CONTINENTS,
  COUNTRIES,
  type Continent,
  VOCATION_LABELS,
  type Vocation,
  continentForCountry,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { type CountrySummary, fetchCountries } from '../api/browse'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'

const CONTINENT_LABEL: Record<Continent, string> = {
  Europe: 'Europe',
  Asia: 'Asia',
  Africa: 'Africa',
  America: 'Americas',
  Oceania: 'Oceania',
}

function NationCard({ c }: { c: CountrySummary }) {
  const info = COUNTRIES.find((x) => x.code === c.country)
  return (
    <Link
      to={`/countries/${c.country}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-300"
    >
      <span className="flex items-center gap-2">
        <Flag code={c.country} size={18} />
        <span className="text-sm font-semibold text-slate-800">{info?.name ?? c.country}</span>
      </span>
      <span className="text-right text-xs tabular-nums text-slate-400">
        <span className="font-medium text-slate-600">
          {c.totalPoints.toLocaleString('en-US')} pts
        </span>
        <span className="mx-1">·</span>
        {c.riderCount} riders
      </span>
    </Link>
  )
}

/** Naciones (#7): países con corredores en activo, agrupados por continente. */
export function Countries() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load countries.</p>

  const byContinent = new Map<Continent, CountrySummary[]>()
  for (const c of data) {
    const cont = continentForCountry(c.country)
    if (!cont) continue
    const list = byContinent.get(cont)
    if (list) list.push(c)
    else byContinent.set(cont, [c])
  }

  return (
    <section className="space-y-4">
      <SectionBar>Nations</SectionBar>
      <p className="text-sm text-slate-500">
        Every country with riders in the game, by continent. Tap one for its national ranking.
      </p>

      {CONTINENTS.filter((cont) => (byContinent.get(cont)?.length ?? 0) > 0).map((cont) => (
        <Panel key={cont} title={CONTINENT_LABEL[cont]}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byContinent.get(cont)!.map((c) => (
              <NationCard key={c.country} c={c} />
            ))}
          </div>
        </Panel>
      ))}
    </section>
  )
}

/** Etiqueta de la vocación de un corredor. */
export function archetypeLabel(archetype: string): string {
  return VOCATION_LABELS[archetype as Vocation] ?? archetype
}
