import type { StageReplay } from '@cyclingstar/shared'
import { Flag } from './Flag'
import { RiderName } from './RiderName'
import { chronicleLine, timeTrialStory } from '../domain/stageJournal'

/**
 * El journal de una etapa: cómo se desarrolló y quién ganó. Es el contenido con más carga emocional
 * del juego, y por eso lo pintan dos sitios:
 *
 * - `StageReplay`, en la pestaña `Story` de una etapa de una carrera por etapas;
 * - `Race`, en la pestaña `Story` de una carrera de UN DÍA, donde la carrera y la etapa son la
 *   misma cosa y llegar aquí costaba tres clics (docs/navegacion.md §7.1).
 *
 * `onFullResult` es opcional: si la página tiene una pestaña de resultado completo, el podio ofrece
 * el atajo; si no, no se pinta el botón.
 */
export function StageStory({
  data,
  onFullResult,
}: {
  data: StageReplay
  onFullResult?: () => void
}) {
  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
  const head = 'text-xs font-semibold uppercase tracking-wide text-slate-400'
  const results = data.results ?? []
  // En una carrera de un día la etapa ES la carrera: el rótulo lo dice como lo diría un periódico.
  const oneDay = data.race?.stageCount === 1
  return (
    <>
      {data.journalUnavailable && (
        <div className={card}>
          <p className="text-sm text-slate-500">
            The detailed journal wasn't recorded for this stage — it was raced before the chronicle
            was saved. The result is still the official one.
          </p>
        </div>
      )}
      {/* Crono: sin fuga ni sprint que narrar, se cuenta la historia del reloj desde los tiempos. */}
      {data.timeTrial && results.length > 0 && (
        <div className={card}>
          <h2 className={head}>Against the clock</h2>
          <ul className="mt-3 space-y-2">
            {timeTrialStory(results).map((line, i) => (
              <li key={i} className="text-sm text-slate-700">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!data.timeTrial && data.chronicle && data.chronicle.length > 0 && (
        <div className={card}>
          <h2 className={head}>How the {oneDay ? 'race' : 'stage'} unfolded</h2>
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
      {/* El desenlace, sin cambiar de pestaña: los tres primeros y la salida al resultado completo. */}
      {results.length > 0 && (
        <div className={card}>
          <h2 className={head}>Podium</h2>
          <ol className="mt-2 space-y-1.5">
            {results.slice(0, 3).map((r) => (
              <li key={r.riderId} className="flex items-center gap-3 text-sm">
                <span className="w-5 shrink-0 tabular-nums text-slate-400">{r.puesto}</span>
                <Flag code={r.country} size={16} />
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                {r.teamName && <span className="text-xs text-slate-400">{r.teamName}</span>}
              </li>
            ))}
          </ol>
          {onFullResult && (
            <button
              type="button"
              onClick={onFullResult}
              className="mt-2 text-sm font-medium text-brand-cyan hover:underline"
            >
              Full result →
            </button>
          )}
        </div>
      )}
    </>
  )
}
