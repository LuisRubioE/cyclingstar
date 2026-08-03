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
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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

/** Grupo plegable con los campeonatos nacionales (mismo día): banderas, ganador y enlace a cada uno. */
function NationalChampsCard({ races }: { races: CalendarRaceSummary[] }) {
  const [open, setOpen] = useState(false)
  const day = races[0]?.startDay ?? 0
  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
        <span className="text-xs text-slate-500">{races.length} nations</span>
      </button>
      {open && (
        <div className="grid gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-3 sm:grid-cols-2">
          {races.map((r) => (
            <Link
              key={r.id}
              to={`/races/${r.id}`}
              className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                {r.championshipCountry && <Flag code={r.championshipCountry} size={16} />}
                <span className="text-slate-700">
                  {r.name.replace(/ National Championship$/, '')}
                </span>
              </span>
              {r.winner && <span className="truncate text-xs text-amber-700">🏆 {r.winner}</span>}
            </Link>
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
      day: nationals[0]!.startDay,
      node: <NationalChampsCard key="nc-group" races={nationals} />,
    })
  }
  items.sort((a, b) => a.day - b.day)

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Season calendar</h1>
        <p className="mt-1 text-sm text-slate-500">
          {others.length} races plus {nationals.length} national championships — grand tours, stage
          races, one-day classics and every nation's title.
        </p>
      </div>
      <div className="space-y-2.5">{items.map((it) => it.node)}</div>
    </section>
  )
}
