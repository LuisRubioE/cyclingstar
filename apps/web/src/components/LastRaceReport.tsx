import { useQuery } from '@tanstack/react-query'
import { fetchLastRace, lastRaceKey } from '../api/lastRace'
import { mentalityLabel, roleLabel } from '../domain/labels'
import { raceVerdict } from '../domain/narration'
import { useHorizonRev } from '../queryClient'
import { ChronicleSentence } from './ChronicleSentence'
import { LastRaceReady } from './LastRaceReady'
import { StageRoute } from './StageRoute'

/**
 * La revisión de plantillas con que se redactan los momentos (E2, §12.7; paso 12). El informe no la
 * lleva, como la ruta de etapa: vale 0, la de toda etapa corrida hasta hoy. Antes de que `TEMPLATE_REV`
 * pase de 0, el informe y la ruta de etapa tienen que servir la de su etapa (`readStageTemplateRev`).
 */
const MOMENTS_REV = 0

/**
 * Panel "Your last race" (backlog extra): compara lo que el corredor ordenó con lo que ocurrió,
 * con su crónica personal y un veredicto. La crónica personal son sus MOMENTOS (E2, §12.9, 12-k; paso
 * 12): las líneas del acta de la etapa en que es protagonista o destinatario, redactadas como el acta y
 * con la identidad del día. Antes eran `personalEvents` de la etapa re-simulada, con una frase en segunda
 * persona para siete plantillas (`personalNarration`) y la clave cruda en las demás.
 *
 * Bajo el velo (E2, §11.4; sup. H5; 9b): el informe es el de la última etapa CONOCIDA, y si la última que
 * corrió está velada, la tarjeta lo dice (`Your last race · Race France, Stage 8 · Ready to watch`) con
 * `Watch`, sin el informe de una etapa anterior debajo, que no es «la última».
 */
export function LastRaceReport() {
  const rev = useHorizonRev()
  const last = useQuery({
    queryKey: lastRaceKey(rev),
    queryFn: fetchLastRace,
    enabled: rev !== undefined,
  })
  if (last.isPending || !last.data) return null
  if (last.data.ready !== null)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <LastRaceReady ready={last.data.ready} />
      </div>
    )
  const data = last.data.report
  if (!data) return null
  const moments = data.moments ?? []

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
      <p className="mt-1 text-sm font-semibold text-slate-800">
        {data.stageName}
        <StageRoute from={data.from} to={data.to} className="ml-2 font-normal text-slate-500" />
      </p>
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
          {moments.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
              {moments.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-12 shrink-0 tabular-nums text-slate-400">km {e.km}</span>
                  <span>
                    <ChronicleSentence e={e} rev={MOMENTS_REV} />
                  </span>
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
