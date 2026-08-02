import { useQuery } from '@tanstack/react-query'
import {
  fetchLastRace,
  mentalityLabel,
  personalNarration,
  raceVerdict,
  roleLabel,
} from '../api/lastRace'

/**
 * Panel "Your last race" (backlog extra): compara lo que el corredor ordenó con lo que ocurrió,
 * con su crónica personal (solo los momentos en los que fue protagonista) y un veredicto.
 */
export function LastRaceReport() {
  const { data, isPending } = useQuery({ queryKey: ['rider', 'last-race'], queryFn: fetchLastRace })
  if (isPending || !data) return null

  const gap =
    data.timeGapToWinnerS > 0
      ? `+${Math.floor(data.timeGapToWinnerS / 60)}:${String(data.timeGapToWinnerS % 60).padStart(2, '0')}`
      : 'winner'

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
