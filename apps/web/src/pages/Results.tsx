import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  type StageReplay,
  fetchResults,
  fetchStageReplay,
  formatTime,
  narrate,
} from '../api/results'

function StageReplayView({ day }: { day: number }) {
  const { data, isPending, isError } = useQuery<StageReplay>({
    queryKey: ['replay', day],
    queryFn: () => fetchStageReplay(day),
  })
  if (isPending) return <p className="text-sm text-slate-500">Loading stage…</p>
  if (isError) return <p className="text-sm text-red-600">Could not load the stage.</p>

  return (
    <div className="space-y-4">
      <div
        className="w-full overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: data.altimetry }}
      />
      {!data.run ? (
        <p className="text-sm text-slate-500">Not raced yet — advance the world to this day.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Chronicle
            </h3>
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
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Result
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {data.results?.slice(0, 10).map((r) => (
                  <tr key={r.riderId} className="border-b border-slate-100">
                    <td className="w-8 py-1 text-slate-400 tabular-nums">{r.puesto}</td>
                    <td className="py-1 text-slate-700">{r.name}</td>
                    <td className="py-1 text-right tabular-nums text-slate-500">
                      {formatTime(r.tiempoS)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/** Resultados y replay de la vuelta de prueba: general, etapas y crónica (Paso 31). */
export function Results() {
  const { data, isPending, isError } = useQuery({ queryKey: ['results'], queryFn: fetchResults })
  const [openDay, setOpenDay] = useState<number | null>(null)

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load results.</p>

  const leader = data.gc[0]?.tiempoTotalS ?? 0

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Results · Test tour</h1>

      {data.gc.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            General classification
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {data.gc.map((g, i) => (
                <tr key={g.riderId} className="border-b border-slate-100">
                  <td className="w-8 py-1 text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="py-1 text-slate-700">{g.name}</td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {i === 0
                      ? formatTime(g.tiempoTotalS)
                      : `+${formatTime(g.tiempoTotalS - leader)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
