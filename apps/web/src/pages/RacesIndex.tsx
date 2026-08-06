import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type CalendarRaceSummary, type RaceFormat, fetchCalendar } from '../api/calendar'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { Tabs } from '../components/Tabs'
import { formatLabel, raceClassLabel } from '../domain/labels'

/**
 * `World → Races` (docs/navegacion.md §6.1): el índice de carreras, con lo último corrido arriba.
 *
 * Hasta ahora el calendario era la ÚNICA puerta para llegar a un resultado: había que buscar la
 * carrera por día de juego, desplegarla y entrar. Eso no es trabajo del calendario, que responde a
 * "¿qué viene?". Esta página responde a la otra pregunta, "¿qué ha pasado?", y además deja buscar
 * una carrera por nombre en vez de rastrearla por fecha.
 *
 * Es pública: se ve sin sesión, como el resto de `World`.
 */

/** Estado de una carrera respecto al día de juego actual. */
type RaceStatus = 'ongoing' | 'finished' | 'upcoming'

/** Último día de juego que ocupa la carrera (etapas + días de descanso). */
function endDay(race: CalendarRaceSummary): number {
  return race.startDay + Math.max(1, race.stages.length) - 1 + race.restAfter.length
}

function statusOf(race: CalendarRaceSummary, today: number | null): RaceStatus {
  if (today == null) return 'upcoming'
  if (today > endDay(race)) return 'finished'
  if (today >= race.startDay) return 'ongoing'
  return 'upcoming'
}

type ClassFilter = 'all' | 'WT' | 'Pro' | 'CON' | 'NC'
const CLASS_FILTERS: { key: ClassFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'WT', label: 'WorldTour' },
  { key: 'Pro', label: 'ProSeries' },
  { key: 'CON', label: 'Continental' },
  { key: 'NC', label: 'Championships' },
]

function matchesClass(race: CalendarRaceSummary, filter: ClassFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'NC') return race.championshipCountry != null
  if (race.championshipCountry != null) return false
  if (filter === 'CON') return race.raceClass === '1' || race.raceClass === '2'
  return race.raceClass === filter
}

type FormatFilter = 'all' | RaceFormat
const FORMAT_FILTERS: { key: FormatFilter; label: string }[] = [
  { key: 'all', label: 'Any format' },
  { key: 'gran-vuelta', label: 'Grand tours' },
  { key: 'una-semana', label: 'Stage races' },
  { key: 'un-dia', label: 'One-day' },
]

/** Cuántas filas se ven antes de "Show all": la convención de tablas del juego (§7.3). */
const PREVIEW_ROWS = 20

/** Una carrera en el índice: día, bandera, nombre, clase, formato y quién ganó. */
function RaceRow({ race, status }: { race: CalendarRaceSummary; status: RaceStatus }) {
  return (
    <li>
      <Link
        to={`/world/races/${race.id}`}
        className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50"
      >
        <span className="w-14 shrink-0 text-xs tabular-nums text-slate-400">
          GD {race.startDay}
        </span>
        {race.country ? (
          <Flag code={race.country} size={16} />
        ) : (
          <span className="inline-block w-4 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
          {race.name}
        </span>
        <span
          className="hidden shrink-0 rounded-full bg-slate-900/5 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-500 sm:inline"
          title="Race class"
        >
          {raceClassLabel(race.raceClass)}
        </span>
        <span className="hidden w-24 shrink-0 text-right text-xs text-slate-400 md:block">
          {formatLabel(race.format)}
        </span>
        <span className="w-40 shrink-0 truncate text-right text-xs">
          {race.winner ? (
            <span className="font-medium text-amber-700">🏆 {race.winner}</span>
          ) : status === 'ongoing' ? (
            <span className="font-medium text-emerald-600">Racing now</span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </span>
      </Link>
    </li>
  )
}

/** Un bloque del índice, con la regla común de tablas: 20 visibles y "Show all". */
function RaceGroup({
  title,
  hint,
  races,
  status,
}: {
  title: string
  hint?: string
  races: CalendarRaceSummary[]
  status: RaceStatus
}) {
  const [expanded, setExpanded] = useState(false)
  if (races.length === 0) return null
  const shown = expanded ? races : races.slice(0, PREVIEW_ROWS)
  return (
    <Panel
      title={`${title} (${races.length})`}
      action={hint ? <span className="text-xs text-white/80">{hint}</span> : undefined}
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-slate-100">
        {shown.map((race) => (
          <RaceRow key={race.id} race={race} status={status} />
        ))}
      </ul>
      {races.length > PREVIEW_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full border-t border-slate-100 py-2 text-xs font-medium text-indigo-600 transition hover:bg-slate-50"
        >
          {expanded ? 'Show fewer' : `Show all ${races.length}`}
        </button>
      )}
    </Panel>
  )
}

export function RacesIndex() {
  const { data, isPending, isError } = useQuery({ queryKey: ['calendar'], queryFn: fetchCalendar })
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState<ClassFilter>('all')
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all')

  const today = data?.dayOfSeason ?? null
  const races = useMemo(() => data?.races ?? [], [data])

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matching = races.filter((race) => {
      if (!matchesClass(race, classFilter)) return false
      if (formatFilter !== 'all' && race.format !== formatFilter) return false
      if (!needle) return true
      return (
        race.name.toLowerCase().includes(needle) ||
        (race.country ?? '').toLowerCase().includes(needle) ||
        (race.winner ?? '').toLowerCase().includes(needle)
      )
    })

    const ongoing: CalendarRaceSummary[] = []
    const finished: CalendarRaceSummary[] = []
    const upcoming: CalendarRaceSummary[] = []
    for (const race of matching) {
      const status = statusOf(race, today)
      if (status === 'ongoing') ongoing.push(race)
      else if (status === 'finished') finished.push(race)
      else upcoming.push(race)
    }
    // Lo último corrido arriba: las terminadas van de la más reciente a la más antigua.
    finished.sort((a, b) => endDay(b) - endDay(a))
    ongoing.sort((a, b) => a.startDay - b.startDay)
    upcoming.sort((a, b) => a.startDay - b.startDay)
    return { ongoing, finished, upcoming, total: matching.length }
  }, [races, query, classFilter, formatFilter, today])

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the races.</p>

  return (
    <section className="space-y-4">
      <SectionBar>Races</SectionBar>
      <p className="text-sm text-slate-500">
        Every race of the season, most recently raced first. Looking for what is still to come in
        order?{' '}
        <Link to="/world/calendar" className="font-medium text-indigo-600 hover:underline">
          The calendar
        </Link>{' '}
        is the season timeline.
      </p>

      <div className="space-y-3">
        <label className="block">
          <span className="sr-only">Search races</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by race, country code or winner…"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Tabs
            label="Race class"
            options={CLASS_FILTERS.map((f) => ({ key: f.key, label: f.label }))}
            value={classFilter}
            onChange={setClassFilter}
          />
          <Tabs
            label="Race format"
            options={FORMAT_FILTERS.map((f) => ({ key: f.key, label: f.label }))}
            value={formatFilter}
            onChange={setFormatFilter}
          />
        </div>
      </div>

      {groups.total === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No race matches that search.
        </p>
      ) : (
        <div className="space-y-4">
          <RaceGroup title="Racing now" races={groups.ongoing} status="ongoing" />
          <RaceGroup
            title="Results"
            hint="Latest first"
            races={groups.finished}
            status="finished"
          />
          <RaceGroup title="Coming up" races={groups.upcoming} status="upcoming" />
        </div>
      )}
    </section>
  )
}
