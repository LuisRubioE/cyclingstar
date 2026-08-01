import { COUNTRIES } from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  type PointsEntry,
  type StageReplay,
  advanceWorld,
  fetchResults,
  fetchStageReplay,
  formatTime,
  narrate,
} from '../api/results'

function flag(country: string): string {
  return COUNTRIES.find((c) => c.code === country)?.flag ?? '🏳️'
}

/** Tiempo del líder en absoluto; el resto relativo a él (+gap). */
function relTime(seconds: number, leader: number, isLeader: boolean): string {
  return isLeader ? formatTime(seconds) : `+${formatTime(seconds - leader)}`
}

const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const headClass = 'mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400'

/** Tabla de una clasificación por tiempo (general de la carrera o de una etapa). */
function TimeTable({
  rows,
  limit = 10,
}: {
  rows: { riderId: string; name: string; country: string; tiempoTotalS: number }[]
  limit?: number
}) {
  const leader = rows[0]?.tiempoTotalS ?? 0
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.slice(0, limit).map((r, i) => (
          <tr key={r.riderId} className="border-b border-slate-100">
            <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
            <td className="w-6 py-1" aria-hidden>
              {flag(r.country)}
            </td>
            <td className="py-1 text-slate-700">{r.name}</td>
            <td className="py-1 text-right tabular-nums text-slate-500">
              {relTime(r.tiempoTotalS, leader, i === 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Tabla de una clasificación por puntos (regularidad o montaña). */
function PointsTable({ rows }: { rows: PointsEntry[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.slice(0, 8).map((r, i) => (
          <tr key={r.riderId} className="border-b border-slate-100">
            <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
            <td className="w-6 py-1" aria-hidden>
              {flag(r.country)}
            </td>
            <td className="py-1 text-slate-700">{r.name}</td>
            <td className="py-1 text-right tabular-nums font-medium text-slate-600">{r.puntos}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function StageReplayView({ day }: { day: number }) {
  const { data, isPending, isError } = useQuery<StageReplay>({
    queryKey: ['replay', day],
    queryFn: () => fetchStageReplay(day),
  })
  if (isPending) return <p className="text-sm text-slate-500">Loading stage…</p>
  if (isError) return <p className="text-sm text-red-600">Could not load the stage.</p>

  const leader = data.results?.[0]?.tiempoS ?? 0

  return (
    <div className="space-y-4">
      <div
        className="w-full overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: data.altimetry }}
      />
      {!data.run ? (
        <p className="text-sm text-slate-500">Not raced yet — advance the world to this day.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <h3 className={headClass}>Chronicle</h3>
            <ol className="space-y-1.5">
              {data.chronicle?.map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-14 shrink-0 text-right tabular-nums text-slate-400">
                    km {e.km}
                  </span>
                  <span className="text-slate-700">{narrate(e.plantilla, e.protagonists)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className={headClass}>Stage result</h3>
            <table className="w-full text-sm">
              <tbody>
                {data.results?.slice(0, 10).map((r, i) => (
                  <tr key={r.riderId} className="border-b border-slate-100">
                    <td className="w-7 py-1 text-slate-400 tabular-nums">{r.puesto}</td>
                    <td className="w-6 py-1" aria-hidden>
                      {flag(r.country)}
                    </td>
                    <td className="py-1 text-slate-700">{r.name}</td>
                    <td className="py-1 text-right tabular-nums text-slate-500">
                      {relTime(r.tiempoS, leader, i === 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className={headClass}>GC after stage {day}</h3>
            <TimeTable rows={data.gc ?? []} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Resultados y replay de la vuelta de prueba: general, clasificaciones y crónica (Paso 31). */
export function Results() {
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({ queryKey: ['results'], queryFn: fetchResults })
  const [openDay, setOpenDay] = useState<number | null>(null)

  const advance = useMutation({
    mutationFn: (days: number) => advanceWorld(days),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['results'] })
      void queryClient.invalidateQueries({ queryKey: ['replay'] })
      void queryClient.invalidateQueries({ queryKey: ['health'] })
    },
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load results.</p>

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Results · Test tour</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => advance.mutate(1)}
            disabled={advance.isPending}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            +1 day
          </button>
          <button
            onClick={() => advance.mutate(5)}
            disabled={advance.isPending}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {advance.isPending ? 'Advancing…' : 'Run the tour (+5 days)'}
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Alpha testing tool: advances the game clock so stages run now instead of waiting real time.
      </p>

      {data.gc.length > 0 && (
        <div className={cardClass}>
          <h2 className={headClass}>General classification</h2>
          <TimeTable rows={data.gc} limit={15} />
        </div>
      )}

      {(data.points.length > 0 || data.kom.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.points.length > 0 && (
            <div className={cardClass}>
              <h2 className={headClass}>Points · sprints</h2>
              <PointsTable rows={data.points} />
            </div>
          )}
          {data.kom.length > 0 && (
            <div className={cardClass}>
              <h2 className={headClass}>Mountains · KOM</h2>
              <PointsTable rows={data.kom} />
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {data.stages.map((stage) => (
          <article
            key={stage.day}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              onClick={() => setOpenDay(openDay === stage.day ? null : stage.day)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-slate-800">{stage.name}</span>
              <span className="flex items-center gap-3 text-xs text-slate-500">
                {stage.km} km
                <span
                  className={
                    stage.run
                      ? 'rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700'
                      : 'rounded-full bg-slate-100 px-2 py-0.5 text-slate-500'
                  }
                >
                  {stage.run ? 'raced' : 'pending'}
                </span>
              </span>
            </button>
            {openDay === stage.day && (
              <div className="border-t border-slate-100 p-4">
                <StageReplayView day={stage.day} />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
