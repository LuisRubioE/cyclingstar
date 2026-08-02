import { COUNTRIES } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchRace } from '../api/race'
import { RiderName } from '../components/RiderName'

function flag(country: string): string {
  return COUNTRIES.find((c) => c.code === country)?.flag ?? '🏳️'
}

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

export function Race() {
  const { raceId = '' } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => fetchRace(raceId),
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
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{data.race.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.race.level}
          {data.race.stageCount ? ` · ${data.race.stageCount} stages` : ''}
        </p>
      </div>

      {notRun && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Not raced this season yet. Advance the world to its start day.
        </p>
      )}

      {data.gc.length > 0 && (
        <div className={card}>
          <h2 className={head}>General classification</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.gc.map((r, i) => (
                <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                  <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="w-6 py-1" aria-hidden>
                    {flag(r.country)}
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
                <span aria-hidden>{flag(w.country)}</span>
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
                <span aria-hidden>{flag(h.winnerCountry)}</span>
                <span className="font-medium text-slate-700">{h.winnerName}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
