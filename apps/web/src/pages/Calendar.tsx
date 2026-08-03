import { useQuery } from '@tanstack/react-query'
import { type ReactElement, useState } from 'react'
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
              <li key={stage.index} className="flex items-center gap-3 text-sm">
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${KIND_DOT[stage.kind] ?? 'bg-slate-300'}`}
                  aria-hidden
                />
                <span className="text-slate-700">{stage.name}</span>
                <span className="ml-auto tabular-nums text-slate-400">{stage.km} km</span>
              </li>
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

/** Una nación con sus 4 pruebas (Crono/Ruta × Elite/Sub-23), ordenadas y enlazadas. */
function NationRow({ code, races }: { code: string; races: CalendarRaceSummary[] }) {
  const name = champCountryName(races[0]!)
  const events = [...races].sort(
    (a, b) =>
      CHAMP_EVENT_ORDER.indexOf(champEventLabel(a)) - CHAMP_EVENT_ORDER.indexOf(champEventLabel(b)),
  )
  return (
    <div className="flex items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
      <Flag code={code} size={16} />
      <span className="w-32 shrink-0 truncate text-sm font-medium text-slate-700">{name}</span>
      <div className="flex flex-wrap gap-1">
        {events.map((r) => (
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
    </div>
  )
}

/** Grupo plegable con los campeonatos nacionales (misma semana): 4 pruebas por país, agrupadas. */
function NationalChampsCard({ races }: { races: CalendarRaceSummary[] }) {
  const [open, setOpen] = useState(false)
  const day = Math.min(...races.map((r) => r.startDay))
  const byCountry = new Map<string, CalendarRaceSummary[]>()
  for (const r of races) {
    const code = r.championshipCountry!
    const list = byCountry.get(code)
    if (list) list.push(r)
    else byCountry.set(code, [r])
  }
  const nations = [...byCountry.entries()].sort(([, a], [, b]) =>
    champCountryName(a[0]!).localeCompare(champCountryName(b[0]!)),
  )
  return (
    <article className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs tabular-nums text-slate-400">GD {day}</span>
          <span className="text-sm font-semibold text-slate-800">National Championships</span>
          <span
            className="rounded-full bg-slate-900/5 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-500"
            title="Race class"
          >
            .NC
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {nations.length} nations · Elite &amp; U23, ITT &amp; Road
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

/** El calendario de la temporada: carreras base + los campeonatos nacionales, por día (Paso 34). */
export function Calendar() {
  const { data, isPending, isError } = useQuery({ queryKey: ['calendar'], queryFn: fetchCalendar })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the calendar.</p>

  const nationals = data.races.filter((r) => r.championshipCountry)
  const others = data.races.filter((r) => !r.championshipCountry)

  // Insertamos el grupo de campeonatos nacionales en su día dentro del orden cronológico.
  const items: { day: number; node: ReactElement }[] = others.map((race) => ({
    day: race.startDay,
    node: <RaceCard key={race.id} race={race} />,
  }))
  if (nationals.length > 0) {
    items.push({
      day: Math.min(...nationals.map((r) => r.startDay)),
      node: <NationalChampsCard key="nc-group" races={nationals} />,
    })
  }
  items.sort((a, b) => a.day - b.day)

  const nationCount = new Set(nationals.map((r) => r.championshipCountry)).size

  return (
    <section className="space-y-4">
      <SectionBar>Season calendar</SectionBar>
      <p className="text-sm text-slate-500">
        {others.length} races plus national championships for {nationCount} nations — grand tours,
        stage races, one-day classics and every nation's Elite &amp; U23 titles.
      </p>
      <Panel title="Races" bodyClassName="p-0">
        {items.map((it) => it.node)}
      </Panel>
    </section>
  )
}
