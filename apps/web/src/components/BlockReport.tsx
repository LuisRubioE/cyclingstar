import {
  ATTRIBUTE_LABELS,
  type AttrLogSource,
  SESSION_CATALOG,
  type Session,
  SESSIONS,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { fetchBlockReport } from '../api/sheet'
import { Panel } from './Panel'

/**
 * WHERE EACH POINT CAME FROM, over the last 28 days (docs/entrenamiento.md §4.6).
 *
 * This panel exists to answer the two questions a player actually asks and the game had no way of
 * answering: "I did X and it didn't improve" and "why did I improve?". It shows deltas and sessions
 * and never the attribute's value — the number stays internal.
 */

const SOURCE_LABEL: Record<AttrLogSource, string> = {
  entrenamiento: 'training',
  carrera: 'racing',
  sobrecompensacion: 'post-race rebound',
  declive: 'age',
  detraining: 'lost condition',
}

function isSession(activity: string): activity is Session {
  return (SESSIONS as readonly string[]).includes(activity)
}

function activityLabel(activity: string): string {
  if (activity === 'carrera') return 'Race days'
  return isSession(activity) ? SESSION_CATALOG[activity].label : activity
}

const signed = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`

export function BlockReport() {
  const report = useQuery({ queryKey: ['block-report'], queryFn: fetchBlockReport })
  const data = report.data
  if (!data) return null

  return (
    <Panel title="Last 4 weeks">
      <p className="mb-3 text-xs text-slate-400">
        {data.trainingDays} training {data.trainingDays === 1 ? 'day' : 'days'} · {data.raceDays}{' '}
        race {data.raceDays === 1 ? 'day' : 'days'}
      </p>

      {data.rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nothing moved in the last four weeks. Attributes take time — and the right sessions.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.rows.map((row) => (
            <li key={row.attr} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-slate-700">{ATTRIBUTE_LABELS[row.attr]}</span>
                <span
                  className={`tabular-nums font-semibold ${
                    row.total >= 0 ? 'text-emerald-600' : 'text-rose-500'
                  }`}
                >
                  {signed(row.total)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {row.bySource
                  .map((s) => `${signed(s.delta)} ${SOURCE_LABEL[s.source]}`)
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data.sessions.length > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {data.sessions.map((s) => `${activityLabel(s.activity)} ×${s.days}`).join(' · ')}
        </p>
      )}
    </Panel>
  )
}
