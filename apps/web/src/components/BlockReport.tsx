import {
  ATTRIBUTE_LABELS,
  type AttrLogSource,
  SESSION_CATALOG,
  type Session,
  SESSIONS,
} from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { fetchBlockReport } from '../api/sheet'
import { type RaceNames, raceDayTitle } from '../domain/raceDay'
import { horizonKey, useHorizonRev } from '../queryClient'
import { Panel } from './ui/Panel'

/**
 * WHERE EACH POINT CAME FROM, over the last 28 days (docs/entrenamiento.md §4.6).
 *
 * This panel exists to answer the two questions a player actually asks and the game had no way of
 * answering: "I did X and it didn't improve" and "why did I improve?". It shows deltas and sessions
 * and never the attribute's value — the number stays internal.
 *
 * Con el sistema desde el 21h de E3 (docs/visual.md §4.6): su `Panel`, el total de cada atributo en su tono
 * (`good` o `bad`) y las sesiones con su nombre, también las de carrera, que decían su clave cruda
 * (`carrera:race-jaen:e1`) y ahora la carrera por su nombre, el de los resultados del corredor (`Race Jaén ·
 * Stage 1`). El `0 race days` de la cabecera es el DD-24 de E2, que E3 no toca.
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

function activityLabel(activity: string, raceNames: RaceNames | undefined): string {
  if (activity === 'carrera') return 'Race days'
  if (isSession(activity)) return SESSION_CATALOG[activity].label
  return raceDayTitle(activity, raceNames) ?? activity
}

const signed = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`

export function BlockReport({
  raceNames,
}: {
  /** el nombre de cada carrera, de los resultados del corredor; sin él, el de su clave */
  raceNames?: RaceNames | undefined
}) {
  const rev = useHorizonRev()
  const report = useQuery({
    queryKey: horizonKey(['block-report'], rev),
    queryFn: fetchBlockReport,
    enabled: rev !== undefined,
  })
  const data = report.data
  if (!data) return null

  return (
    <Panel title="Last 4 weeks">
      <div className="grid gap-3">
        <p className="text-meta text-ink-2">
          {data.trainingDays} training {data.trainingDays === 1 ? 'day' : 'days'} · {data.raceDays}{' '}
          race {data.raceDays === 1 ? 'day' : 'days'}
        </p>

        {data.rows.length === 0 ? (
          <p className="text-meta text-ink-2">
            Nothing moved in the last four weeks. Attributes take time — and the right sessions.
          </p>
        ) : (
          <ul className="grid gap-2">
            {data.rows.map((row) => (
              <li key={row.attr}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-row font-semibold text-ink">
                    {ATTRIBUTE_LABELS[row.attr]}
                  </span>
                  <span
                    className={`text-row font-semibold tabular-nums ${
                      row.total >= 0 ? 'text-good' : 'text-bad'
                    }`}
                  >
                    {signed(row.total)}
                  </span>
                </div>
                <p className="text-meta text-ink-2">
                  {row.bySource
                    .map((s) => `${signed(s.delta)} ${SOURCE_LABEL[s.source]}`)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}

        {data.sessions.length > 0 && (
          <p className="border-t border-line pt-3 text-meta text-ink-2">
            {data.sessions
              .map((s) => `${activityLabel(s.activity, raceNames)} ×${s.days}`)
              .join(' · ')}
          </p>
        )}
      </div>
    </Panel>
  )
}
