import { useQuery } from '@tanstack/react-query'
import { Fragment, type ReactElement, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  type CalendarRaceSummary,
  type RaceLevel,
  fetchCalendar,
  formatLabel,
  raceClassLabel,
} from '../api/calendar'
import { Flag } from '../components/Flag'
import { Panel, SectionBar } from '../components/Panel'

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

function RaceCard({ race }: { race: CalendarRaceSummary }) {
  const [open, setOpen] = useState(false)
  const totalKm = race.stages.reduce((sum, s) => sum + s.km, 0)
  return (
    <article className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs tabular-nums text-slate-400">
            GD {race.startDay}
          </span>
          {race.country && <Flag code={race.country} size={16} />}
          <span className="text-sm font-semibold text-slate-800">{race.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_BADGE[race.level]}`}
          >
            {race.level}
          </span>
          <span
            className="rounded-full bg-slate-900/5 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-500"
            title="Race class"
          >
            {raceClassLabel(race.raceClass)}
          </span>
        </div>
        <span className="flex items-center gap-3 text-xs text-slate-500">
          {race.winner && (
            <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 sm:inline-flex">
              🏆 {race.winner}
            </span>
          )}
          {formatLabel(race.format)}
          <span className="tabular-nums">
            {race.stages.length === 1 ? '1 stage' : `${race.stages.length} stages`}
          </span>
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {Math.round(totalKm)} km total · open to {race.openTo.join(', ')}
            </p>
            <Link
              to={`/races/${race.id}`}
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
                  <span className="text-slate-700">{stage.name}</span>
                  {stage.from && stage.to && (
                    <span className="truncate text-slate-500">
                      {stage.from === stage.to ? stage.from : `${stage.from} → ${stage.to}`}
                    </span>
                  )}
                  <span className="ml-auto tabular-nums text-slate-400">{stage.km} km</span>
                </li>
                {/* Día de descanso tras esta etapa (grandes vueltas y alguna vuelta por etapas). */}
                {race.restAfter?.includes(stage.index) && (
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

/** Etiqueta corta de cada prueba del campeonato (Crono/Ruta, Elite/Sub-23). */
function champEventLabel(r: CalendarRaceSummary): string {
  const itt = r.stages[0]?.timeTrial ?? r.name.includes('ITT')
  const u23 = r.championshipCategory === 'u23'
  const discipline = itt ? 'ITT' : 'Road'
  return u23 ? `U23 ${discipline}` : discipline
}

/** Nombre del país tal como aparece en el título de la carrera, sin el sufijo de la prueba. */
function champCountryName(r: CalendarRaceSummary): string {
  return r.name.replace(/ (U23 )?(ITT|Road) Championship$/, '')
}

const CHAMP_EVENT_ORDER = ['ITT', 'Road', 'U23 ITT', 'U23 Road']

/** Día de temporada del campeonato de una nación (la prueba de RUTA élite, la última de su semana). */
function nationDay(races: CalendarRaceSummary[]): number {
  return Math.max(...races.map((r) => r.startDay))
}

/**
 * Una nación con sus 4 pruebas (Crono/Ruta × Elite/Sub-23). No todas caen el mismo día: la crono va
 * entre semana y la ruta el fin de semana, y según el país la Elite y el Sub-23 coinciden o no. Por
 * eso se AGRUPAN por día (cada grupo con su GD), y así se ve de un vistazo qué pruebas comparten fecha.
 */
function NationRow({ code, races }: { code: string; races: CalendarRaceSummary[] }) {
  const name = champCountryName(races[0]!)
  const sorted = [...races].sort(
    (a, b) =>
      a.startDay - b.startDay ||
      CHAMP_EVENT_ORDER.indexOf(champEventLabel(a)) - CHAMP_EVENT_ORDER.indexOf(champEventLabel(b)),
  )
  const byDay = new Map<number, CalendarRaceSummary[]>()
  for (const r of sorted) {
    const list = byDay.get(r.startDay)
    if (list) list.push(r)
    else byDay.set(r.startDay, [r])
  }
  const days = [...byDay.keys()].sort((a, b) => a - b)
  const span = days.length === 1 ? `GD ${days[0]}` : `GD ${days[0]}–${days[days.length - 1]}`
  return (
    <div className="flex items-start gap-2 rounded px-1 py-1 hover:bg-slate-50">
      <span className="w-16 shrink-0 text-xs tabular-nums text-slate-400">{span}</span>
      <Flag code={code} size={16} />
      <span className="w-24 shrink-0 truncate text-sm font-medium text-slate-700">{name}</span>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {days.map((d) => (
          <div key={d} className="flex items-center gap-1">
            <span className="text-[10px] tabular-nums text-slate-300">GD {d}</span>
            {byDay.get(d)!.map((r) => (
              <Link
                key={r.id}
                to={`/races/${r.id}`}
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

/** Grupo plegable con los campeonatos nacionales (misma semana): 4 pruebas por país, agrupadas. */
function NationalChampsCard({ races }: { races: CalendarRaceSummary[] }) {
  const [open, setOpen] = useState(false)
  const byCountry = new Map<string, CalendarRaceSummary[]>()
  for (const r of races) {
    const code = r.championshipCountry!
    const list = byCountry.get(code)
    if (list) list.push(r)
    else byCountry.set(code, [r])
  }
  // Ordenadas por FECHA (no todas caen el mismo día: la mayoría a final de junio, y las del hemisferio
  // sur en enero-febrero), así se ve que están repartidas y no amontonadas en una sola fecha.
  const nations = [...byCountry.entries()].sort(
    ([, a], [, b]) =>
      nationDay(a) - nationDay(b) || champCountryName(a[0]!).localeCompare(champCountryName(b[0]!)),
  )
  const days = nations.map(([, l]) => nationDay(l))
  const range = `GD ${Math.min(...days)}–${Math.max(...days)}`
  return (
    <article className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-xs tabular-nums text-slate-400">{range}</span>
          <span className="text-sm font-semibold text-slate-800">National Championships</span>
          <span
            className="rounded-full bg-slate-900/5 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-500"
            title="Race class"
          >
            .NC
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {nations.length} nations · most late June, southern hemisphere in Jan–Feb
        </span>
      </button>
      {open && (
        <div className="grid gap-x-4 gap-y-0.5 border-t border-slate-100 px-4 py-3 sm:grid-cols-2">
          {nations.map(([code, list]) => (
            <NationRow key={code} code={code} races={list} />
          ))}
        </div>
      )}
    </article>
  )
}

type CalFilter = 'all' | 'WT' | 'Pro' | 'CON' | 'NC'
const FILTERS: { key: CalFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'WT', label: 'WorldTour' },
  { key: 'Pro', label: 'ProSeries' },
  { key: 'CON', label: 'Continental' },
  { key: 'NC', label: 'Championships' },
]
/** ¿Encaja la carrera en el filtro elegido? (los campeonatos van en su propio filtro). */
function matchesFilter(race: CalendarRaceSummary, f: CalFilter): boolean {
  if (f === 'all') return true
  if (f === 'WT') return race.raceClass === 'WT'
  if (f === 'Pro') return race.raceClass === 'Pro'
  if (f === 'CON') return race.raceClass === '1' || race.raceClass === '2'
  return false
}

/** El calendario de la temporada: carreras base + los campeonatos nacionales, filtrables (Paso 34). */
export function Calendar() {
  const { data, isPending, isError } = useQuery({ queryKey: ['calendar'], queryFn: fetchCalendar })
  const [filter, setFilter] = useState<CalFilter>('all')

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the calendar.</p>

  const nationals = data.races.filter((r) => r.championshipCountry)
  const others = data.races
    .filter((r) => !r.championshipCountry && matchesFilter(r, filter))
    .sort((a, b) => a.startDay - b.startDay)
  const nationCount = new Set(nationals.map((r) => r.championshipCountry)).size

  // Carreras ya disputadas (antes de hoy) atenuadas; un marcador "hoy" (por día de juego, no mes real)
  // separa lo corrido de lo que viene. Los campeonatos nacionales tienen su propio filtro y NO se
  // inyectan en la línea temporal (así no aparecen todos amontonados en su primera fecha).
  const today = data.dayOfSeason
  const rows: ReactElement[] = []
  let todayMarked = false
  for (const race of others) {
    if (today != null && !todayMarked && race.startDay > today) {
      rows.push(
        <div
          key="today"
          className="flex items-center gap-2 border-y border-brand-cyan/40 bg-brand-cyan/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-brand-cyan" aria-hidden />
          Today · GD {today}
        </div>,
      )
      todayMarked = true
    }
    const past = today != null && race.startDay < today
    rows.push(
      past ? (
        <div key={race.id} className="opacity-55">
          <RaceCard race={race} />
        </div>
      ) : (
        <RaceCard key={race.id} race={race} />
      ),
    )
  }

  return (
    <section className="space-y-4">
      <SectionBar>Season calendar</SectionBar>
      <p className="text-sm text-slate-500">
        {data.races.length - nationals.length} races plus national championships for {nationCount}{' '}
        nations — grand tours, stage races, one-day classics and every nation's Elite &amp; U23
        titles.
      </p>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              filter === f.key
                ? 'bg-brand-navy text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'NC' ? (
        <Panel title="National championships" bodyClassName="p-0">
          <NationalChampsCard races={nationals} />
        </Panel>
      ) : (
        <Panel title="Races" bodyClassName="p-0">
          {rows.length > 0 ? (
            rows
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No races in this filter.</p>
          )}
        </Panel>
      )}
    </section>
  )
}
