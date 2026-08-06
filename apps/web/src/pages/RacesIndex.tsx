import { useQuery } from '@tanstack/react-query'
import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type CalendarRaceSummary, type RaceLevel, fetchCalendar } from '../api/calendar'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'
import { Tabs } from '../components/Tabs'
import { formatLabel, raceClassLabel } from '../domain/labels'
import {
  type ClassFilter,
  type FormatFilter,
  type RaceTimelineStatus,
  RECENT_WINDOW,
  buildTimeline,
  champCountryName,
  champEventLabel,
  champEventsByDay,
  championshipsByNation,
  nationDay,
} from '../domain/raceTimeline'

/**
 * `World → Races`: la ÚNICA página de carreras del mundo (docs/navegacion.md §3.3).
 *
 * Fusiona el antiguo `World → Calendar` y el antiguo `World → Races`, que confundían porque
 * enseñaban casi lo mismo: los dos respondían a "¿qué viene?" y a "¿qué pasó?". De cada uno se
 * conserva lo que hacía mejor:
 *
 * - del calendario: la línea temporal cronológica con el marcador de "hoy", el pasado atenuado, el
 *   desplegable con las etapas de cada carrera y el bloque aparte de campeonatos nacionales;
 * - del índice: el buscador (nombre, país, ganador) y los filtros de clase y de formato.
 *
 * Y se añade lo que faltaba en ambos: lo recién corrido y lo que viene, juntos alrededor de "hoy"
 * sin desplazarse media temporada (el pasado lejano se pliega tras un botón).
 *
 * Es pública: se ve sin sesión, como el resto de `World`. La lógica —orden, marcador, filtros y
 * agrupación de campeonatos— vive en `domain/raceTimeline` y se prueba allí.
 */

const LEVEL_BADGE: Record<RaceLevel, string> = {
  WT: 'bg-indigo-100 text-indigo-700',
  PRS: 'bg-sky-100 text-sky-700',
  CON: 'bg-slate-100 text-slate-600',
}

/** Un tono por tipo de etapa, para leer el perfil de un vistazo. */
const KIND_DOT: Record<string, string> = {
  llana: 'bg-emerald-400',
  media: 'bg-amber-400',
  reina: 'bg-rose-500',
  cri: 'bg-violet-400',
  clasica: 'bg-orange-500',
}

const CLASS_FILTERS: { key: ClassFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'WT', label: 'WorldTour' },
  { key: 'Pro', label: 'ProSeries' },
  { key: 'CON', label: 'Continental' },
  { key: 'NC', label: 'Championships' },
]

const FORMAT_FILTERS: { key: FormatFilter; label: string }[] = [
  { key: 'all', label: 'Any format' },
  { key: 'gran-vuelta', label: 'Grand tours' },
  { key: 'una-semana', label: 'Stage races' },
  { key: 'un-dia', label: 'One-day' },
]

/**
 * Una carrera de la línea temporal: cabecera plegable con su día, su clase y quién ganó, y dentro
 * el recorrido etapa a etapa (lo que el índice viejo no tenía y el calendario sí).
 */
function RaceCard({ race, status }: { race: CalendarRaceSummary; status: RaceTimelineStatus }) {
  const [open, setOpen] = useState(false)
  const totalKm = race.stages.reduce((sum, s) => sum + s.km, 0)
  const oneDay = race.stages.length === 1
  return (
    <article className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="w-12 shrink-0 text-xs tabular-nums text-slate-400">
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
          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${LEVEL_BADGE[race.level]}`}
        >
          {race.level}
        </span>
        <span
          className="hidden shrink-0 rounded-full bg-slate-900/5 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-500 sm:inline"
          title="Race class"
        >
          {raceClassLabel(race.raceClass)}
        </span>
        <span className="hidden w-24 shrink-0 text-right text-xs text-slate-400 md:block">
          {formatLabel(race.format)}
          {!oneDay && <span className="ml-1 tabular-nums">· {race.stages.length}</span>}
        </span>
        <span className="w-28 shrink-0 truncate text-right text-xs sm:w-36">
          {race.winner ? (
            <span className="font-medium text-amber-700">🏆 {race.winner}</span>
          ) : status === 'ongoing' ? (
            <span className="font-medium text-emerald-600">Racing now</span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              {Math.round(totalKm)} km total · open to {race.openTo.join(', ')}
            </p>
            <Link
              to={`/world/races/${race.id}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              View full race →
            </Link>
          </div>
          <ol className="space-y-1">
            {race.stages.map((stage) => (
              <Fragment key={stage.index}>
                <li className="flex items-center gap-3 text-sm">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${KIND_DOT[stage.kind] ?? 'bg-slate-300'}`}
                    aria-hidden
                  />
                  <span className="shrink-0 text-slate-700">{stage.name}</span>
                  {stage.from && stage.to && (
                    <span className="truncate text-slate-500">
                      {stage.from === stage.to ? stage.from : `${stage.from} → ${stage.to}`}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 tabular-nums text-slate-400">
                    {stage.km} km
                  </span>
                </li>
                {/* Día de descanso tras esta etapa (grandes vueltas y alguna vuelta por etapas). */}
                {race.restAfter.includes(stage.index) && (
                  <li className="flex items-center gap-2 py-0.5 pl-5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <span className="h-px w-4 bg-slate-200" />
                    Rest day
                    <span className="h-px flex-1 bg-slate-200" />
                  </li>
                )}
              </Fragment>
            ))}
          </ol>
        </div>
      )}
    </article>
  )
}

/**
 * Una nación con sus pruebas (Crono/Ruta × Elite/Sub-23). No todas caen el mismo día: la crono va
 * entre semana y la ruta el fin de semana, y según el país la Elite y el Sub-23 coinciden o no. Por
 * eso se agrupan por día, y así se ve de un vistazo qué pruebas comparten fecha.
 */
function NationRow({ code, races }: { code: string; races: CalendarRaceSummary[] }) {
  const name = champCountryName(races[0]!)
  const days = champEventsByDay(races)
  const first = days[0]![0]
  const last = days[days.length - 1]![0]
  const span = days.length === 1 ? `GD ${first}` : `GD ${first}–${last}`
  return (
    <div className="flex items-start gap-2 rounded px-1 py-1 hover:bg-slate-50">
      <span className="w-16 shrink-0 text-xs tabular-nums text-slate-400">{span}</span>
      <Flag code={code} size={16} />
      <span className="w-24 shrink-0 truncate text-sm font-medium text-slate-700">{name}</span>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {days.map(([day, events]) => (
          <div key={day} className="flex items-center gap-1">
            <span className="text-[10px] tabular-nums text-slate-300">GD {day}</span>
            {events.map((r) => (
              <Link
                key={r.id}
                to={`/world/races/${r.id}`}
                title={r.winner ? `Winner: ${r.winner}` : champEventLabel(r)}
                className="rounded bg-slate-900/5 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-brand-cyan/15 hover:text-brand-navy"
              >
                {r.winner ? '🏆 ' : ''}
                {champEventLabel(r)}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Los campeonatos nacionales, aparte: son 532 carreras de un día y en la línea temporal la
 * sepultarían. Tienen su propio filtro, y aquí se agrupan por nación.
 */
function NationalChampsBlock({ races }: { races: CalendarRaceSummary[] }) {
  const nations = championshipsByNation(races)
  if (nations.length === 0) {
    return (
      <Panel title="National championships">
        <p className="text-sm text-slate-500">No national championships match that search.</p>
      </Panel>
    )
  }
  const days = nations.map(([, list]) => nationDay(list))
  const range = `GD ${Math.min(...days)}–${Math.max(...days)}`
  return (
    <Panel
      title={`National championships (${nations.length} nations)`}
      action={<span className="text-xs text-white/80">{range}</span>}
    >
      <p className="mb-2 text-xs text-slate-400">
        Elite &amp; U23, road and time trial — most in late June, southern hemisphere in Jan–Feb.
      </p>
      <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {nations.map(([code, list]) => (
          <NationRow key={code} code={code} races={list} />
        ))}
      </div>
    </Panel>
  )
}

export function RacesIndex() {
  const { data, isPending, isError } = useQuery({ queryKey: ['calendar'], queryFn: fetchCalendar })
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState<ClassFilter>('all')
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all')
  const [showEarlier, setShowEarlier] = useState(false)

  const today = data?.dayOfSeason ?? null
  const races = useMemo(() => data?.races ?? [], [data])

  const timeline = useMemo(
    () => buildTimeline(races, { today, query, classFilter, formatFilter, showEarlier }),
    [races, today, query, classFilter, formatFilter, showEarlier],
  )
  // El bloque de campeonatos usa el buscador y el formato, pero no la clase (ya está elegida).
  const champs = useMemo(
    () =>
      buildTimeline(races, { today, query, classFilter: 'NC', formatFilter, showEarlier: true })
        .rows.filter((row) => row.kind === 'race')
        .map((row) => row.race),
    [races, today, query, formatFilter],
  )
  const nationals = useMemo(() => races.filter((r) => r.championshipCountry != null), [races])
  const nationCount = useMemo(
    () => new Set(nationals.map((r) => r.championshipCountry)).size,
    [nationals],
  )

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the races.</p>

  const baseRaces = races.length - nationals.length
  const showingChamps = classFilter === 'NC'
  // Con el pasado desplegado se puede volver a plegar, siempre que hubiera algo que plegar.
  const canCollapse =
    timeline.rows.filter((row) => row.kind === 'race' && row.status === 'finished').length >
    RECENT_WINDOW

  return (
    <section className="space-y-4">
      <SectionBar>Races</SectionBar>
      <p className="text-sm text-slate-500">
        The season in order, with today marked: what has just been raced and what is coming next, in
        one timeline. {baseRaces} races plus national championships for {nationCount} nations —
        grand tours, stage races, one-day classics and every nation&apos;s Elite &amp; U23 titles.
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

      {showingChamps ? (
        <NationalChampsBlock races={champs} />
      ) : timeline.total === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No race matches that search.
        </p>
      ) : (
        <Panel title={`Season timeline (${timeline.total})`} bodyClassName="p-0">
          {/* El pasado lejano, plegado: así "hoy" y lo que viene entran en la primera pantalla. */}
          {timeline.earlierCount > 0 && (
            <button
              type="button"
              onClick={() => setShowEarlier(true)}
              className="w-full border-b border-slate-100 py-2 text-xs font-medium text-indigo-600 transition hover:bg-slate-50"
            >
              ↑ Show {timeline.earlierCount} earlier{' '}
              {timeline.earlierCount === 1 ? 'race' : 'races'}
            </button>
          )}
          {showEarlier && canCollapse && (
            <button
              type="button"
              onClick={() => setShowEarlier(false)}
              className="w-full border-b border-slate-100 py-2 text-xs font-medium text-indigo-600 transition hover:bg-slate-50"
            >
              ↓ Back to recent races
            </button>
          )}
          {timeline.rows.map((row) =>
            row.kind === 'today' ? (
              <div
                key="today"
                className="flex items-center gap-2 border-y border-brand-cyan/40 bg-brand-cyan/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-brand-cyan" aria-hidden />
                Today · GD {row.day}
              </div>
            ) : row.status === 'finished' ? (
              // Lo ya corrido, atenuado: sigue ahí, pero no compite con lo que viene.
              <div key={row.race.id} className="opacity-60">
                <RaceCard race={row.race} status={row.status} />
              </div>
            ) : (
              <RaceCard key={row.race.id} race={row.race} status={row.status} />
            ),
          )}
        </Panel>
      )}
    </section>
  )
}
