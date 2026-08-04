import { useQuery } from '@tanstack/react-query'
import { Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import { type RaceClass, raceClassLabel } from '../api/calendar'
import { type RaceStartlist, fetchRace, fetchStartlist } from '../api/race'
import { Flag } from '../components/Flag'
import { RiderName } from '../components/RiderName'
import { TeamLink } from '../components/TeamLink'

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function relTime(seconds: number, leader: number, isLeader: boolean): string {
  return isLeader ? fmtTime(seconds) : `+${fmtTime(seconds - leader)}`
}

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const head = 'mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400'

const KIND_DOT: Record<string, string> = {
  llana: 'bg-emerald-400',
  media: 'bg-amber-400',
  reina: 'bg-rose-500',
  cri: 'bg-violet-400',
  clasica: 'bg-orange-500',
}

const DIVISION_LABEL: Record<string, string> = {
  WT: 'WorldTour',
  PRS: 'ProTeams',
  CON: 'Continental',
}
const DIVISION_ORDER = ['WT', 'PRS', 'CON']

/**
 * Lista provisional de inscritos de una carrera a punto de empezar: los equipos que se espera que
 * acudan (agrupados por división) y los agentes libres ya apuntados. Las escuadras se nombran el día de
 * salida, así que aquí van los equipos, no aún sus 7-8 corredores.
 */
function Startlist({ data }: { data: RaceStartlist }) {
  const frozen = data.frozen ?? false
  const byDivision = DIVISION_ORDER.map((div) => ({
    div,
    teams: data.teams.filter((t) => t.division === div),
  })).filter((g) => g.teams.length > 0)
  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {frozen ? 'Startlist' : 'Provisional startlist'}
        </h2>
        {data.daysUntil != null && (
          <span className="text-xs text-slate-400">
            starts in {data.daysUntil} {data.daysUntil === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>
      {data.teams.length === 0 && data.freeAgents.length === 0 ? (
        <p className="text-sm text-slate-400">No entries yet.</p>
      ) : (
        <div className="space-y-3">
          {byDivision.map((g) => (
            <div key={g.div}>
              <h3 className="text-xs font-semibold text-slate-500">
                {DIVISION_LABEL[g.div] ?? g.div}{' '}
                <span className="font-normal text-slate-400">({g.teams.length})</span>
              </h3>
              {frozen ? (
                // Escuadra congelada: cada equipo con sus corredores reales.
                <div className="mt-1 space-y-2">
                  {g.teams.map((t) => (
                    <div key={t.id}>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        {t.country && <Flag code={t.country} size={14} />}
                        <TeamLink teamId={t.id} name={t.name} className="text-slate-700" />
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
                        {t.riders.map((r) => (
                          <span key={r.id} className="flex items-center gap-1 text-sm">
                            {r.bib != null && (
                              <span className="tabular-nums text-xs text-slate-400">{r.bib}</span>
                            )}
                            <Flag code={r.country} size={12} />
                            <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Aún por congelar: solo los equipos previstos, sin nombrar corredores.
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {g.teams.map((t) => (
                    <span key={t.id} className="flex items-center gap-1.5 text-sm">
                      {t.country && <Flag code={t.country} size={14} />}
                      <TeamLink teamId={t.id} name={t.name} className="text-slate-700" />
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {data.freeAgents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500">
                Free agents{frozen ? '' : ' signed up'}{' '}
                <span className="font-normal text-slate-400">({data.freeAgents.length})</span>
              </h3>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {data.freeAgents.map((r) => (
                  <span key={r.id} className="flex items-center gap-1.5 text-sm">
                    <Flag code={r.country} size={14} />
                    <RiderName riderId={r.id} name={r.name} isBot={r.isBot} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        {frozen
          ? 'Entries closed — these are the confirmed squads for the race.'
          : 'Provisional — each team names its squad of riders when entries close, about two weeks out.'}
      </p>
    </div>
  )
}

export function Race() {
  const { raceId = '' } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => fetchRace(raceId),
  })
  // Lista provisional de inscritos (solo devuelve algo si la carrera está próxima y no se ha corrido).
  const { data: startlist } = useQuery({
    queryKey: ['race', raceId, 'startlist'],
    queryFn: () => fetchStartlist(raceId),
  })

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the race.</p>

  const leader = data.gc[0]?.tiempoTotalS ?? 0
  const notRun = data.gc.length === 0 && data.stageWinners.length === 0

  return (
    <section className="space-y-6">
      <div>
        <Link to="/calendar" className="text-xs text-slate-400 hover:text-slate-600">
          ← Calendar
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
          {data.race.country && <Flag code={data.race.country} size={22} />}
          {data.race.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.race.level}
          {data.race.raceClass ? ` · ${raceClassLabel(data.race.raceClass as RaceClass)}` : ''}
          {data.race.stageCount ? ` · ${data.race.stageCount} stages` : ''}
        </p>
      </div>

      {notRun && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Not raced this season yet. It runs on its start GD.
        </p>
      )}

      {startlist?.upcoming && <Startlist data={startlist} />}

      {data.stages.length > 0 && (
        <div className={card}>
          <h2 className={head}>Stage profiles</h2>
          <ol className="space-y-4">
            {data.stages.map((stage) => (
              <Fragment key={stage.index}>
                <li>
                  <div className="mb-1 flex items-center gap-3 text-sm">
                    <span className="font-medium text-slate-700">
                      {data.stages.length === 1 ? stage.name : `Stage ${stage.index}`}
                    </span>
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${KIND_DOT[stage.kind] ?? 'bg-slate-300'}`}
                      aria-hidden
                    />
                    {stage.from && stage.to && (
                      <span className="text-slate-500">
                        {stage.from === stage.to ? stage.from : `${stage.from} → ${stage.to}`}
                      </span>
                    )}
                    {stage.timeTrial && <span className="text-xs text-violet-500">ITT</span>}
                    <span className="ml-auto tabular-nums text-slate-400">{stage.km} km</span>
                  </div>
                  {/* Altimetría real de autoría de la carrera (relieve + puertos). SVG del backend. */}
                  <div
                    className="w-full overflow-x-auto rounded-lg bg-slate-50 p-1"
                    dangerouslySetInnerHTML={{ __html: stage.altimetry }}
                  />
                </li>
                {/* Día de descanso tras esta etapa (grandes vueltas y alguna vuelta por etapas). */}
                {data.restAfter.includes(stage.index) && (
                  <li className="flex items-center gap-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />
                    Rest day
                    <span className="h-px flex-1 bg-slate-200" />
                  </li>
                )}
              </Fragment>
            ))}
          </ol>
        </div>
      )}

      {data.gc.length > 0 && (
        <div className={card}>
          <h2 className={head}>General classification</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.gc.map((r, i) => (
                <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                  <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="w-6 py-1">
                    <Flag code={r.country} size={16} />
                  </td>
                  <td className="py-1 text-slate-700">
                    <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                    {r.teamName && (
                      <span className="ml-2 text-xs text-slate-400">{r.teamName}</span>
                    )}
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {relTime(r.tiempoTotalS, leader, i === 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.stageWinners.length > 0 && (
        <div className={card}>
          <h2 className={head}>Stage winners</h2>
          <ol className="space-y-1.5">
            {data.stageWinners.map((w) => (
              <li key={w.stageDay} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-slate-400">Stage {w.stageDay}</span>
                <Flag code={w.country} size={16} />
                <RiderName riderId={w.riderId} name={w.name} isBot={w.isBot} />
                {w.teamName && <span className="text-xs text-slate-400">{w.teamName}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {data.history.length > 0 && (
        <div className={card}>
          <h2 className={head}>Roll of honour</h2>
          <ol className="space-y-1.5">
            {data.history.map((h) => (
              <li key={h.season} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-slate-400">Season {h.season + 1}</span>
                <Flag code={h.winnerCountry} size={16} />
                <span className="font-medium text-slate-700">{h.winnerName}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
