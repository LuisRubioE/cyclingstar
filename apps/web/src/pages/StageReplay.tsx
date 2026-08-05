import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  type ChronicleEntry,
  type StageResultEntry,
  fetchCalendarStage,
  formatTime,
} from '../api/results'
import { Flag } from '../components/Flag'
import { RiderName } from '../components/RiderName'

/** Convierte un evento del motor en una frase legible del journal de la etapa. */
function chronicleLine(e: ChronicleEntry): string {
  const who = e.protagonists.join(', ')
  switch (e.plantilla) {
    case 'breakaway_formed':
      return `${who || 'A group'} go clear in the break.`
    case 'peloton_concedes':
      return 'The peloton concedes — the break is given room to fight for the win.'
    case 'sprinters_give_up':
      return "The sprinters' teams give up the chase."
    case 'breakaway_caught':
      return 'The peloton reels the break back in.'
    case 'sprint_intermediate':
      return `${who} takes the intermediate sprint.`
    case 'climb_kom':
      return `${who} is first over the summit.`
    case 'stage_win':
      return `${who} wins the stage.`
    case 'stage_win_itt':
      return `${who} sets the fastest time.`
    default:
      return `${e.plantilla}${who ? `: ${who}` : ''}`
  }
}

/** Diferencia contra el mejor tiempo, formateada (+Ns o +m:ss). */
function gapToBest(seconds: number): string {
  if (seconds < 60) return `+${seconds}s`
  const m = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')
  return `+${m}:${ss}`
}

/**
 * Relato de una contrarreloj a partir de los tiempos reales: una crono no tiene fuga ni sprint que
 * narrar, así que el journal cuenta lo que importa —mejor tiempo, quién se acercó, y cuán apretada
 * quedó la clasificación contra el crono—.
 */
function timeTrialStory(results: StageResultEntry[]): string[] {
  if (results.length === 0) return []
  const winner = results[0]!
  const gap = (r: StageResultEntry) => r.tiempoS - winner.tiempoS
  const lines = [`Best time of the day: ${winner.name} — ${formatTime(winner.tiempoS)}.`]
  if (results[1]) lines.push(`${results[1].name} came closest, ${gapToBest(gap(results[1]))} down.`)
  if (results[2])
    lines.push(`${results[2].name} rounded out the podium at ${gapToBest(gap(results[2]))}.`)
  const within = results.filter((r) => gap(r) <= 60).length
  if (within >= 2)
    lines.push(`${within} riders finished within a minute of the best time — a tight one.`)
  return lines
}

/** Journal/crónica de una etapa de calendario ya corrida: lo que pasó, más resultado y general. */
export function StageReplay() {
  const { raceId = '', day = '' } = useParams()
  const dayNum = Number(day)
  const { data, isPending, isError } = useQuery({
    queryKey: ['stage-replay', raceId, dayNum],
    queryFn: () => fetchCalendarStage(raceId, dayNum),
  })
  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the stage.</p>

  const leader = data.gc?.[0]?.tiempoTotalS ?? 0
  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
  const head = 'text-xs font-semibold uppercase tracking-wide text-slate-400'

  return (
    <section className="space-y-4">
      <Link to={`/races/${raceId}`} className="text-xs text-slate-400 hover:text-slate-600">
        ← Back to the race
      </Link>
      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          Stage {data.day}
          {data.name ? ` · ${data.name}` : ''}
        </h1>
        <p className="text-sm text-slate-500">{data.km} km</p>
      </header>

      {data.altimetry && (
        <div className={card}>
          <div
            className="w-full overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: data.altimetry }}
          />
        </div>
      )}

      {!data.run && <p className="text-slate-500">This stage hasn't been raced yet.</p>}

      {/* Crono: sin fuga ni sprint que narrar, se cuenta la historia del reloj desde los tiempos. */}
      {data.run && data.timeTrial && data.results && data.results.length > 0 && (
        <div className={card}>
          <h2 className={head}>Against the clock</h2>
          <ul className="mt-3 space-y-2">
            {timeTrialStory(data.results).map((line, i) => (
              <li key={i} className="text-sm text-slate-700">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!data.timeTrial && data.chronicle && data.chronicle.length > 0 && (
        <div className={card}>
          <h2 className={head}>How the stage unfolded</h2>
          <ol className="mt-3 space-y-2">
            {data.chronicle.map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-14 shrink-0 text-right tabular-nums text-slate-400">
                  km {e.km}
                </span>
                <span className="text-slate-700">{chronicleLine(e)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {data.results && data.results.length > 0 && (
        <div className={card}>
          <h2 className={head}>Stage result</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {data.results.slice(0, 15).map((r) => (
                <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                  <td className="w-7 py-1 text-slate-400 tabular-nums">{r.puesto}</td>
                  <td className="w-6 py-1">
                    <Flag code={r.country} size={16} />
                  </td>
                  <td className="py-1 text-slate-700">
                    <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {formatTime(r.tiempoS)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.gc && data.gc.length > 0 && (
        <div className={card}>
          <h2 className={head}>General classification after the stage</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {data.gc.slice(0, 15).map((r, i) => (
                <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
                  <td className="w-7 py-1 text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="w-6 py-1">
                    <Flag code={r.country} size={16} />
                  </td>
                  <td className="py-1 text-slate-700">
                    <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                  </td>
                  <td className="py-1 text-right tabular-nums text-slate-500">
                    {i === 0
                      ? formatTime(r.tiempoTotalS)
                      : `+${formatTime(r.tiempoTotalS - leader)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
