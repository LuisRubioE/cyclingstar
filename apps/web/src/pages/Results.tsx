import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  type PointsEntry,
  type StageReplay,
  type TeamGcEntry,
  advanceWorld,
  fetchResults,
  fetchStageReplay,
  formatTime,
  narrate,
} from '../api/results'
import { Flag } from '../components/Flag'
import { RiderName } from '../components/RiderName'

/** Tiempo del líder en absoluto; el resto relativo a él (+gap). */
function relTime(seconds: number, leader: number, isLeader: boolean): string {
  return isLeader ? formatTime(seconds) : `+${formatTime(seconds - leader)}`
}

const headClass = 'mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400'

type TimeRow = {
  riderId: string
  name: string
  country: string
  teamName?: string | null
  isBot: boolean
  tiempoTotalS: number
}

/** Tabla de una clasificación por tiempo (general de la carrera o de una etapa). */
function TimeTable({ rows, limit = 20 }: { rows: TimeRow[]; limit?: number }) {
  const leader = rows[0]?.tiempoTotalS ?? 0
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.slice(0, limit).map((r, i) => (
          <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
            <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
            <td className="w-6 py-1" aria-hidden>
              <Flag code={r.country} size={16} />
            </td>
            <td className="py-1 text-slate-700">
              <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
              {r.teamName && <span className="ml-2 text-xs text-slate-400">{r.teamName}</span>}
            </td>
            <td className="py-1 text-right tabular-nums text-slate-500">
              {relTime(r.tiempoTotalS, leader, i === 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Clasificación por equipos: suma de los 3 mejores de cada equipo, relativa al primero. */
function TeamsTable({ rows }: { rows: TeamGcEntry[] }) {
  const leader = rows[0]?.tiempoTotalS ?? 0
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.slice(0, 15).map((r, i) => (
          <tr key={r.teamName} className="border-b border-slate-100 last:border-0">
            <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
            <td className="py-1 font-medium text-slate-700">{r.teamName}</td>
            <td className="py-1 text-right tabular-nums text-slate-500">
              {i === 0 ? formatTime(r.tiempoTotalS) : `+${formatTime(r.tiempoTotalS - leader)}`}
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
        {rows.slice(0, 15).map((r, i) => (
          <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
            <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
            <td className="w-6 py-1" aria-hidden>
              <Flag code={r.country} size={16} />
            </td>
            <td className="py-1 text-slate-700">
              <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
            </td>
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
                {data.results?.slice(0, 12).map((r, i) => (
                  <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                    <td className="w-7 py-1 text-slate-400 tabular-nums">{r.puesto}</td>
                    <td className="w-6 py-1" aria-hidden>
                      <Flag code={r.country} size={16} />
                    </td>
                    <td className="py-1 text-slate-700">
                      <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                    </td>
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
            <TimeTable rows={(data.gc ?? []) as TimeRow[]} limit={12} />
          </div>
        </div>
      )}
    </div>
  )
}

const TABS = ['Stages', 'GC', 'Points', 'Mountains', 'Teams'] as const
type Tab = (typeof TABS)[number]

/** Resultados de la vuelta de prueba con pestañas: etapas y clasificaciones (#12). */
export function Results() {
  const queryClient = useQueryClient()
  const { data, isPending, isError } = useQuery({ queryKey: ['results'], queryFn: fetchResults })
  const [openDay, setOpenDay] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('Stages')

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
    <section className="space-y-5">
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

      {/* Pestañas */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Stages' && (
        <div className="space-y-2.5">
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
      )}

      {tab === 'GC' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {data.gc.length > 0 ? (
            <TimeTable rows={data.gc as TimeRow[]} limit={30} />
          ) : (
            <p className="text-sm text-slate-500">No general classification yet.</p>
          )}
        </div>
      )}

      {tab === 'Points' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {data.points.length > 0 ? (
            <PointsTable rows={data.points} />
          ) : (
            <p className="text-sm text-slate-500">No points classification yet.</p>
          )}
        </div>
      )}

      {tab === 'Mountains' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {data.kom.length > 0 ? (
            <PointsTable rows={data.kom} />
          ) : (
            <p className="text-sm text-slate-500">No mountains classification yet.</p>
          )}
        </div>
      )}

      {tab === 'Teams' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {data.teamsGc.length > 0 ? (
            <TeamsTable rows={data.teamsGc} />
          ) : (
            <p className="text-sm text-slate-500">No teams classification yet.</p>
          )}
        </div>
      )}
    </section>
  )
}
