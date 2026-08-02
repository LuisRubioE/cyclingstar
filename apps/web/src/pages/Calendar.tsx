import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  type CalendarRaceSummary,
  type RaceLevel,
  fetchCalendar,
  formatLabel,
} from '../api/calendar'

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
            Day {race.startDay}
          </span>
          <span className="text-sm font-semibold text-slate-800">{race.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_BADGE[race.level]}`}
          >
            {race.level}
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
          <p className="mb-2 text-xs text-slate-400">
            {Math.round(totalKm)} km total · open to {race.openTo.join(', ')}
          </p>
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

/** El calendario de la temporada: las 28 carreras del MVP con sus etapas (Paso 34). */
export function Calendar() {
  const { data, isPending, isError } = useQuery({ queryKey: ['calendar'], queryFn: fetchCalendar })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the calendar.</p>

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Season calendar</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.races.length} races across the competition season — grand tours, stage races and
          one-day classics.
        </p>
      </div>
      <div className="space-y-2.5">
        {data.races.map((race) => (
          <RaceCard key={race.id} race={race} />
        ))}
      </div>
    </section>
  )
}
