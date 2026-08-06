import { useQuery } from '@tanstack/react-query'
import { fetchLastRace } from '../api/lastRace'
import { mentalityLabel, roleLabel } from '../domain/labels'
import { personalNarration, raceVerdict } from '../domain/narration'

/**
 * Panel "Your last race" (backlog extra): compara lo que el corredor ordenó con lo que ocurrió,
 * con su crónica personal (solo los momentos en los que fue protagonista) y un veredicto.
 */
export function LastRaceReport() {
  const { data, isPending } = useQuery({ queryKey: ['rider', 'last-race'], queryFn: fetchLastRace })
  if (isPending || !data) return null

  // Solo el 1º es "winner". El resto ve su diferencia; si llegó en el mismo grupo que el ganador la
  // diferencia es 0 (mismo tiempo), lo normal en un esprint — eso NO es haber ganado.
  const gap =
    data.position === 1
      ? 'winner'
      : data.timeGapToWinnerS > 0
        ? `+${Math.floor(data.timeGapToWinnerS / 60)}:${String(data.timeGapToWinnerS % 60).padStart(2, '0')}`
        : '+0:00'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Your last race
        </h2>
        <span className="text-xs text-slate-400">{data.raceName}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-800">{data.stageName}</p>
      <p className="mt-0.5 text-sm text-indigo-700">{raceVerdict(data)}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Placing',
            value: `${data.position}${data.fieldSize ? ` / ${data.fieldSize}` : ''}`,
          },
          { label: 'Gap to winner', value: gap },
          { label: 'Sprint pts', value: String(data.sprintPoints) },
          { label: 'Mountain pts', value: String(data.komPoints) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-50 p-2.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {s.label}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <h3 className="text-xs font-semibold text-slate-500">How the stage unfolded</h3>
        <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
          {data.story.map((e, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-12 shrink-0 tabular-nums text-slate-400">km {e.km}</span>
              <span>{e.plantilla}</span>
            </li>
          ))}
          {data.story.length === 0 && (
            <li className="text-slate-400">The bunch stayed together for a sprint finish.</li>
          )}
          {data.winnerName && (
            <li className="flex gap-2">
              <span className="w-12 shrink-0 tabular-nums text-slate-400">🏁</span>
              <span>
                <span className="font-medium text-slate-700">{data.winnerName}</span> took the win.
              </span>
            </li>
          )}
        </ul>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-500">Your orders</h3>
          {data.orders ? (
            <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
              <li>Role: {roleLabel(data.orders.role)}</li>
              <li>Approach: {mentalityLabel(data.orders.mentality)}</li>
              <li>Contest sprints: {data.orders.contestSprints ? 'yes' : 'no'}</li>
              <li>Contest climbs: {data.orders.contestClimbs ? 'yes' : 'no'}</li>
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-400">Coach's default plan.</p>
          )}
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-500">What happened to you</h3>
          {data.personalEvents.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
              {data.personalEvents.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-12 shrink-0 tabular-nums text-slate-400">km {e.km}</span>
                  <span>{personalNarration(e.plantilla)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-400">
              You rode in the bunch without a decisive move.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
