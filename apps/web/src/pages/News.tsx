import { COUNTRIES, seasonPosition } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCalendar } from '../api/calendar'
import { type NewsItem, fetchNews } from '../api/news'
import { Flag } from '../components/Flag'
import { SectionBar } from '../components/Panel'
import { newsLabel } from '../domain/labels'
import {
  NO_FILTER,
  type NewsFilter,
  groupByGameDay,
  matchesFilter,
  raceOfHeadline,
} from '../domain/newsFeed'

const selectClass =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-brand-cyan focus:outline-none'

/** Un desplegable de filtro, con su etiqueta asociada. `''` significa "sin filtrar". */
function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string | null
  options: { value: string; label: string }[]
  onChange: (value: string | null) => void
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs font-medium text-slate-500">
        {label}
      </label>
      <select
        id={id}
        className={selectClass}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        disabled={options.length === 0}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Un titular: familia a la izquierda, hecho en el cuerpo. Sin iconos, con jerarquía tipográfica. */
function Headline({ item }: { item: NewsItem }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
      <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {newsLabel(item.kind)}
      </span>
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-700">
        {item.country && <Flag code={item.country} size={13} className="mr-1.5" />}
        {item.riderId ? (
          <Link to={`/riders/${item.riderId}`} className="hover:text-brand-cyan hover:underline">
            {item.text}
          </Link>
        ) : (
          item.text
        )}
        {item.personal && <span className="ml-2 text-xs text-slate-400">· you</span>}
      </p>
    </li>
  )
}

/**
 * News (navegación §3.5): el MISMO feed global para todo el mundo, sin personalizar, agrupado por
 * día de juego y con filtros por equipo, corredor, nación y carrera para poder preguntarle cosas
 * concretas ("¿qué ha hecho mi equipo?", "¿quién ganó en la Volta?").
 */
export function News() {
  const { data, isPending, isError } = useQuery({ queryKey: ['news'], queryFn: fetchNews })
  const calendar = useQuery({ queryKey: ['calendar'], queryFn: fetchCalendar })
  // El filtro es estado de la vista: nunca se deriva de la respuesta del servidor.
  const [filter, setFilter] = useState<NewsFilter>(NO_FILTER)

  const races = useMemo(
    () => (calendar.data?.races ?? []).map((r) => ({ id: r.id, name: r.name })),
    [calendar.data],
  )

  // Carrera de cada titular: se resuelve una vez por lista, no por render de fila.
  const withRace = useMemo(
    () => (data ?? []).map((item) => ({ item, raceId: raceOfHeadline(item.text, races) })),
    [data, races],
  )

  const options = useMemo(() => {
    const teams = new Map<string, string>()
    const riders = new Map<string, string>()
    const nations = new Set<string>()
    const raceIds = new Set<string>()
    for (const { item, raceId } of withRace) {
      if (item.teamId && item.teamName) teams.set(item.teamId, item.teamName)
      if (item.riderId && item.riderName) riders.set(item.riderId, item.riderName)
      if (item.country) nations.add(item.country)
      if (raceId) raceIds.add(raceId)
    }
    const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)
    return {
      teams: [...teams].map(([value, label]) => ({ value, label })).sort(byLabel),
      riders: [...riders].map(([value, label]) => ({ value, label })).sort(byLabel),
      nations: [...nations]
        .map((code) => ({
          value: code,
          label: COUNTRIES.find((c) => c.code === code)?.name ?? code,
        }))
        .sort(byLabel),
      races: races
        .filter((r) => raceIds.has(r.id))
        .map((r) => ({ value: r.id, label: r.name }))
        .sort(byLabel),
    }
  }, [withRace, races])

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the news feed.</p>

  const visible = withRace
    .filter(({ item, raceId }) => matchesFilter(item, filter, raceId))
    .map(({ item }) => item)
  const days = groupByGameDay(visible)
  const filtered = Object.values(filter).some((v) => v !== null)

  return (
    <section className="space-y-4">
      <SectionBar>News</SectionBar>

      {/* Los filtros van en una caja neutra, sin cabecera de color: son una herramienta, no una
          sección con contenido propio. */}
      <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FilterSelect
            id="news-team"
            label="Team"
            value={filter.teamId}
            options={options.teams}
            onChange={(teamId) => setFilter({ ...filter, teamId })}
          />
          <FilterSelect
            id="news-rider"
            label="Rider"
            value={filter.riderId}
            options={options.riders}
            onChange={(riderId) => setFilter({ ...filter, riderId })}
          />
          <FilterSelect
            id="news-nation"
            label="Nation"
            value={filter.country}
            options={options.nations}
            onChange={(country) => setFilter({ ...filter, country })}
          />
          <FilterSelect
            id="news-race"
            label="Race"
            value={filter.raceId}
            options={options.races}
            onChange={(raceId) => setFilter({ ...filter, raceId })}
          />
        </div>
        {filtered && (
          <button
            type="button"
            onClick={() => setFilter(NO_FILTER)}
            className="mt-3 text-xs font-medium text-brand-cyan hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {days.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          {filtered
            ? 'No headlines match these filters.'
            : 'Nothing has happened yet. Advance the world and the headlines will roll in.'}
        </p>
      ) : (
        <div className="space-y-4">
          {days.map((day) => {
            const position = seasonPosition(day.gameDay)
            return (
              <section key={day.gameDay}>
                <h2 className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Game day {position.dayOfSeason}
                  <span className="mx-1.5 text-slate-300">·</span>
                  Season {position.season}
                </h2>
                <div className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5">
                  <ol className="divide-y divide-slate-100">
                    {day.items.map((item, i) => (
                      <Headline key={`${day.gameDay}-${i}`} item={item} />
                    ))}
                  </ol>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
