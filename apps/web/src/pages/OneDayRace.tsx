import type { StageGate, StageReplay as StageReplayData } from '@cyclingstar/shared'
import { type ReactNode, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PaintedRaceRadio } from '../components/PaintedRaceRadio'
import { RaceRadioPanel } from '../components/RaceRadioPanel'
import { ShareStage } from '../components/ShareStage'
import { StageGateCard, TwoDeviceNotice } from '../components/StageGate'
import { StageStory } from '../components/StageStory'
import { TabPanel, Tabs, useTabParam } from '../components/Tabs'
import { type RaceTabId, raceTabLabel, raceTabOf, raceTabs } from '../domain/raceTabs'
import type { ReadyRace } from '../domain/veil'
import { useRevealActions } from '../queryClient'
import {
  RESULT_TABS,
  StageReportView,
  paintedRadioWanted,
  paintedReachedOf,
  raceKeyOf,
  usePinnedHead,
  useStageFacts,
  useStageResult,
} from './stageView'
// `StageWatch`, sin diferir: así la página de etapa y esta ficha comparten sus ficheros y la de etapa no
// pide uno más (las cargas completas cuentan para el límite de peticiones). El precio: abrir una carrera
// de un día terminada descarga el reproductor también con `Watch` apagado (unos 58 kB, 19 con gzip).
import { StageWatch } from './StageWatch'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const head = 'mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400'
/** El panel de la tira de pestañas de la ficha (`RACE_PANEL` de `Race.tsx`). */
const RACE_PANEL = 'race-section'

/**
 * LA CARRERA DE UN DÍA TERMINADA (E2, docs/retransmision.md §11.17; 11-o, sup. C3 y E9; paso 9b), con la
 * decisión 1 del dueño durante la implementación. Su ficha ES la de su etapa 1: con `Watch` encendido para
 * quien mira lleva `Watch`, `Report` (el acta: el resultado y la crónica) y `Race Radio`, con la misma puerta
 * que la página de una etapa y sus mismas piezas (`useStageFacts`, `useStageResult`, `StageGateCard`,
 * `StageWatch`, `PaintedRaceRadio`), y abre en `Watch` si no la ha visto y en `Report` si la vio o la reveló.
 * Por eso, con `Watch` encendido, la ficha pide la ruta de su etapa al abrirse y no al tocar la pestaña:
 * de ella depende la pestaña por defecto; mientras llega, la cabecera sin pestañas.
 *
 * Con `Watch` apagado (el jugador hasta el encendido, §20.5), las de hoy: `Result` primero, el acta al lado
 * con el nombre `Story` y la radio, y la ruta de la etapa se sigue pidiendo solo al abrir una de las dos
 * (la primera carga no pide nada más que hoy). Lo que enseña el resultado de una carrera que quien mira
 * tiene en su velo pinta la puerta, también con `Watch` apagado.
 *
 * Arregla de paso la `Race Radio` de una carrera sin ver (nota 6 del 11a): decía `This race was run before
 * the race radio was recorded`, que no era verdad; ahora pinta la puerta o, con `Watch` y línea grabada, la
 * radio hasta lo pintado.
 *
 * Vive en su propio fichero, que la ficha carga diferido (`lazy`) solo para una carrera de un día terminada:
 * así la de una vuelta no se descarga la etapa (`stageView.tsx`, su cliente y la crónica), y una carga
 * completa de la ficha no pide más ficheros que antes del 9b (cuentan para el límite de 300 peticiones por
 * minuto e IP). Las pestañas que son de la ficha (`Result`, `Route` y `Roll of honour`) se las pasa
 * `Race.tsx` ya hechas.
 */
export function OneDaySections({
  raceId,
  watchOn,
  watchSettled,
  veil,
  classifications,
  route,
  honours,
}: {
  raceId: string
  watchOn: boolean
  watchSettled: boolean
  veil: ReadyRace | null
  /** `Result` con `Watch` apagado: las clasificaciones de la ficha (`ClassificationsTab` de `Race.tsx`) */
  classifications: ReactNode
  /** `Route` y `Roll of honour`, los de la ficha */
  route: ReactNode
  honours: ReactNode
}) {
  const [params] = useSearchParams()
  // Con `Watch` apagado las pestañas no dependen de la etapa: la de la URL decide si hace falta pedirla.
  const offTabs = raceTabs('finished', 1, true, false)
  const offActive = raceTabOf(params.get('tab'), offTabs) ?? offTabs[0]
  // la carrera en el velo de quien mira: con `Watch` apagado, `Result` pinta la puerta sin pedir nada
  const veiled = veil !== null && veil.stages.includes(1)
  const needStage = watchSettled && (watchOn || offActive === 'report' || offActive === 'radio')
  const f = useStageFacts(raceId, 1, { oneDay: true, enabled: needStage })
  const tabsKnown = watchSettled && (!watchOn || f.settled)
  const tabIds = raceTabs('finished', 1, f.seen, watchOn, f.watchable)
  // La pestaña por defecto, fijada la primera vez que se sabe: la carrera que pasa a vista mientras se
  // mira (la meta, o el otro dispositivo) no saca a nadie de `Watch`.
  const [start, setStart] = useState<{ readonly tab: RaceTabId; readonly seen: boolean }>()
  if (start === undefined && tabsKnown) setStart({ tab: tabIds[0] ?? 'route', seen: f.seen })
  const pinned = start !== undefined && tabIds.includes(start.tab) ? start.tab : tabIds[0]
  const [active, setActive] = useTabParam(
    tabIds,
    raceTabOf(params.get('tab'), tabIds) ?? pinned ?? 'route',
  )

  const [finishedHere, setFinishedHere] = useState(false)
  const [revealedHere, setRevealedHere] = useState(false)
  const [otherDeviceSeen, setOtherDeviceSeen] = useState(false)
  const [reachedHere, setReachedHere] = useState(0)
  const actions = useRevealActions(
    f.readingWithCookie ? null : raceKeyOf(raceId, f.broadcastHead.data, f.gameDay),
    () => setRevealedHere(true),
  )
  const { full, gate, actaError } = useStageResult(f, raceId, 1, RESULT_TABS.has(active))
  const watchHead = usePinnedHead(f.broadcastHead.data)

  if (!tabsKnown) return <p className="text-slate-500">Loading…</p>

  const options = tabIds.map((id) => ({ key: id, label: raceTabLabel(id, watchOn) }))
  const pagePath = `/world/races/${raceId}`
  const diagHref = f.isAdmin ? `${pagePath}?diag=1` : null
  const otherDevice =
    start !== undefined &&
    !start.seen &&
    f.seen &&
    !finishedHere &&
    !revealedHere &&
    !otherDeviceSeen &&
    active === 'watch' &&
    !f.diagOn
  const gateCard = (g: StageGate): ReactNode => (
    <StageGateCard
      gate={g}
      stageDay={1}
      place="result"
      raceId={raceId}
      watchOn={watchOn}
      watchable={f.watchable}
      onWatch={() => setActive('watch')}
      actions={actions}
      signIn={f.readingWithCookie}
      diagHref={diagHref}
    />
  )
  /** Lo que enseña el resultado: la puerta, o lo que trae la ruta de la etapa o el acta. */
  const withResult = (render: (d: StageReplayData) => ReactNode): ReactNode => {
    if (gate !== null) return gateCard(gate)
    if (full !== null) return render(full)
    if (actaError || f.isError)
      return (
        <div className={card}>
          <p className="text-sm text-red-600">Could not load the race.</p>
        </div>
      )
    return <p className="text-slate-500">Loading…</p>
  }
  const radioHead = f.broadcastHead.data
  const paintedRadio = paintedRadioWanted(gate, f.watchable, radioHead)

  return (
    <>
      {watchOn && (
        <ShareStage
          raceId={raceId}
          day={1}
          report={full !== null || (f.data?.watch?.known ?? true)}
        />
      )}
      <Tabs
        options={options}
        value={active}
        onChange={setActive}
        label="Race"
        variant="underline"
        panelId={RACE_PANEL}
      />
      {otherDevice && (
        <TwoDeviceNotice
          onWatchAnyway={() => setOtherDeviceSeen(true)}
          onShowReport={() => {
            setOtherDeviceSeen(true)
            setActive('report')
          }}
        />
      )}
      <TabPanel panelId={RACE_PANEL} active={active}>
        {active === 'watch' &&
          (watchHead !== undefined ? (
            <StageWatch
              head={watchHead}
              raceId={raceId}
              day={1}
              diag={f.diagOn}
              onReport={() => setActive('report')}
              onFinished={() => setFinishedHere(true)}
              onReached={(s) => setReachedHere((x) => Math.max(x, s))}
            />
          ) : (
            <p className="text-slate-500">Loading…</p>
          ))}

        {active === 'report' && (
          <>
            {/* Sin `Watch` para su etapa (§17.19): una crono sin línea, una lápida (D-12). */}
            {watchOn && f.unavailable && (
              <p className="text-sm text-slate-500">Broadcast unavailable for this race</p>
            )}
            {withResult((d) =>
              watchOn ? (
                <StageReportView
                  data={d}
                  onWatchAnyway={f.watchable && f.seen ? () => setActive('watch') : undefined}
                />
              ) : (
                <StageStory data={d} onFullResult={() => setActive('result')} />
              ),
            )}
          </>
        )}

        {/* `Result`, solo con `Watch` apagado: el de la ficha de carrera, o la puerta si está en el velo. */}
        {active === 'result' && (veiled ? gateCard({ k: 'not_seen' }) : classifications)}

        {active === 'radio' && paintedRadio && (
          <PaintedRaceRadio
            head={radioHead}
            raceId={raceId}
            day={1}
            reachedS={paintedReachedOf(radioHead, 1, reachedHere)}
            onWatch={() => setActive('watch')}
          />
        )}
        {active === 'radio' &&
          !paintedRadio &&
          withResult((d) =>
            d.radio ? (
              <RaceRadioPanel radio={d.radio} />
            ) : (
              <div className={card}>
                <h2 className={head}>Race Radio</h2>
                <p className="text-sm text-slate-500">
                  This race was run before the race radio was recorded, so there is nothing to
                  replay.
                </p>
              </div>
            ),
          )}

        {active === 'route' && route}
        {active === 'honours' && honours}
      </TabPanel>
    </>
  )
}
