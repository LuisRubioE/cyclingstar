import { stageRouteText } from '@cyclingstar/shared'
import { useQuery } from '@tanstack/react-query'
import { fetchLastRace, lastRaceKey } from '../api/lastRace'
import { mentalityLabel, roleLabel } from '../domain/labels'
import { gapToWinnerText, raceVerdict } from '../domain/narration'
import { useHorizonRev } from '../queryClient'
import { ChronicleSentence } from './ChronicleSentence'
import { LastRaceReady } from './LastRaceReady'
import { StageRoute } from './StageRoute'
import { Icon } from './ui/Icon'
import { Panel } from './ui/Panel'
import { Stat } from './ui/Stat'

/**
 * La revisión de plantillas con que se redactan los momentos (E2, §12.7; paso 12). El informe no la
 * lleva: vale 0, la de toda etapa corrida hasta hoy. Antes de que `TEMPLATE_REV` pase de 0, el informe
 * tiene que servir la de su etapa (`readStageTemplateRev`), como la cabecera de `Watch`.
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
 * corrió está velada, la tarjeta lo dice (`Race France, Stage 8 · Ready to watch`, en su `Panel` `Your last race`) con
 * `Watch`, sin el informe de una etapa anterior debajo, que no es «la última».
 *
 * Con el sistema desde el 21h de E3 (docs/visual.md §4.6): su `Panel`; sus cuatro cifras en `Stat`, con el hueco
 * como toda diferencia (`+0:34`, `s.t.`; §4.10); la etapa contada con tokens; y el ganador con el icono
 * `race` y no con `🏁` (§3.7).
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
    return <LastRaceReady ready={last.data.ready} title="Your last race" />
  const data = last.data.report
  if (!data) return null
  const moments = data.moments ?? []

  return (
    <Panel title="Your last race">
      <div className="grid gap-4">
        <div className="grid gap-1">
          <p className="text-row font-semibold text-ink">
            {/* la etapa y su recorrido, como toda etapa (§4.10): `Stage 3 · Gandia → Alcoi` */}
            {data.raceName} · {data.stageName}
            {stageRouteText(data.from, data.to) !== null && ' · '}
            <StageRoute from={data.from} to={data.to} className="font-normal text-ink-2" />
          </p>
          <p className="text-meta text-accent">{raceVerdict(data)}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Stat
            label="Placing"
            value={`${data.position}${data.fieldSize ? ` / ${data.fieldSize}` : ''}`}
          />
          {/* Solo el 1º es «winner»: el que llega en el grupo del ganador, `s.t.`, no ha ganado */}
          <Stat label="Gap to winner" value={gapToWinnerText(data)} />
          <Stat label="Sprint pts" value={data.sprintPoints} />
          <Stat label="Mountain pts" value={data.komPoints} />
        </div>

        <div className="grid gap-1">
          <h3 className="text-row font-semibold text-ink">How the stage unfolded</h3>
          <ul className="grid gap-0.5 text-meta text-ink-2">
            {data.story.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-12 shrink-0 tabular-nums text-ink-3">km {e.km}</span>
                <span>{e.plantilla}</span>
              </li>
            ))}
            {data.story.length === 0 && <li>The bunch stayed together for a sprint finish.</li>}
            {data.winnerName && (
              <li className="flex gap-2">
                <span className="inline-flex w-12 shrink-0 text-ink-3">
                  <Icon name="race" size={16} label="Finish" />
                </span>
                <span>
                  <span className="font-semibold text-ink">{data.winnerName}</span> took the win.
                </span>
              </li>
            )}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <h3 className="text-row font-semibold text-ink">Your orders</h3>
            {data.orders ? (
              <ul className="grid gap-0.5 text-meta text-ink-2">
                <li>Role: {roleLabel(data.orders.role)}</li>
                <li>Approach: {mentalityLabel(data.orders.mentality)}</li>
                <li>Contest sprints: {data.orders.contestSprints ? 'yes' : 'no'}</li>
                <li>Contest climbs: {data.orders.contestClimbs ? 'yes' : 'no'}</li>
              </ul>
            ) : (
              <p className="text-meta text-ink-2">Coach&apos;s default plan.</p>
            )}
          </div>
          <div className="grid gap-1">
            <h3 className="text-row font-semibold text-ink">What happened to you</h3>
            {moments.length > 0 ? (
              <ul className="grid gap-0.5 text-meta text-ink-2">
                {moments.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-12 shrink-0 tabular-nums text-ink-3">km {e.km}</span>
                    <span>
                      <ChronicleSentence e={e} rev={MOMENTS_REV} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-ink-2">You rode in the bunch without a decisive move.</p>
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}
