import type { StageGate, StageReplay as StageReplayData } from '@cyclingstar/shared'
import { type ReactNode, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShareStage } from '../components/ShareStage'
import { StageGateCard, TwoDeviceNotice } from '../components/StageGate'
import { TabPanel, useTabParam } from '../components/Tabs'
import { Tabs } from '../components/ui/Tabs'
import { LoadingState, QueryView } from '../components/ui/QueryView'
import { type RaceTabId, raceTabLabel, raceTabOf, raceTabs } from '../domain/raceTabs'
import type { TableIdentity } from '../domain/tableIdentity'
import type { ReadyRace } from '../domain/veil'
import { useRevealActions } from '../queryClient'
import {
  RESULT_TABS,
  StageReportView,
  raceKeyOf,
  usePinnedHead,
  useStageFacts,
  useStageResult,
} from './stageView'
// `StageWatch`, sin diferir: así la página de etapa y esta ficha comparten sus ficheros y la de etapa no
// pide uno más (las cargas completas cuentan para el límite de peticiones). El precio: abrir una carrera
// de un día terminada descarga el reproductor también con `Watch` apagado (unos 58 kB, 19 con gzip).
import { StageWatch, watchViewOf } from './StageWatch'

/** El panel de la tira de pestañas de la ficha (`RACE_PANEL` de `Race.tsx`). */
const RACE_PANEL = 'race-section'

/**
 * LA CARRERA DE UN DÍA TERMINADA (E2, docs/retransmision.md §11.17; 11-o, sup. C3 y E9; paso 9b), con la
 * decisión 1 del dueño durante la implementación. Su ficha ES la de su etapa 1: con `Watch` encendido para
 * quien mira lleva `Watch` y `Report` (el acta con el resultado), con la misma puerta que la página de una
 * etapa y sus mismas piezas (`useStageFacts`, `useStageResult`, `StageGateCard`, `StageWatch`), y abre en
 * `Watch` si no la ha visto y en `Report` si la vio o la reveló. Por eso, con `Watch` encendido, la ficha
 * pide la ruta de su etapa al abrirse y no al tocar la pestaña: de ella depende la pestaña por defecto;
 * mientras llega, la cabecera sin pestañas.
 *
 * Con `Watch` apagado (el interruptor de §20.5), `Result` primero, el de la ficha de carrera, sin pedir la
 * ruta de la etapa. Lo que enseña el resultado de una carrera que quien mira tiene en su velo pinta la
 * puerta, también con `Watch` apagado. Hasta W4 llevaba además el acta con el nombre `Story`, que era la
 * crónica con el podio, y `Race Radio`; el dueño las retiró (su revisión de `Watch`, punto 8; D-16
 * revocada).
 *
 * Vive en su propio fichero, que la ficha carga diferido (`lazy`) solo para una carrera de un día terminada:
 * así la de una vuelta no se descarga la etapa (`stageView.tsx` y su cliente), y una carga
 * completa de la ficha no pide más ficheros que antes del 9b (cuentan para el límite de 300 peticiones por
 * minuto e IP). Las pestañas que son de la ficha (`Result`, `Route` y `Roll of honour`) se las pasa
 * `Race.tsx` ya hechas.
 *
 * Desde el PR 20 (E3, docs/visual.md §14.2), compartir va como en la página de una etapa: `Share to watch`
 * sobre las pestañas y `Share the report` en `Report`, donde está el acta. Con los dos encima, en `Button`
 * de 44, partían en dos renglones a 360 px y bajaban la capa fija, la respuesta de la pantalla (§7.3).
 */
export function OneDaySections({
  raceId,
  watchOn,
  watchSettled,
  veil,
  classifications,
  route,
  honours,
  identity,
  ownRiderId,
}: {
  raceId: string
  watchOn: boolean
  watchSettled: boolean
  veil: ReadyRace | null
  /** el dorsal y el dibujo del equipo de cada fila del acta, de la lista de salida de `Race` (PR 12b) */
  identity: TableIdentity
  /** el corredor del jugador: su fila del acta (§6.2) */
  ownRiderId: string | null
  /** `Result` con `Watch` apagado: las clasificaciones de la ficha (`ClassificationsTab` de `Race.tsx`) */
  classifications: ReactNode
  /** `Route` y `Roll of honour`, los de la ficha */
  route: ReactNode
  honours: ReactNode
}) {
  const [params] = useSearchParams()
  // la carrera en el velo de quien mira: con `Watch` apagado, `Result` pinta la puerta sin pedir nada
  const veiled = veil !== null && veil.stages.includes(1)
  // Con `Watch` apagado ninguna pestaña pinta la etapa (W4): solo con él encendido se pide su ruta.
  const needStage = watchSettled && watchOn
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
  const actions = useRevealActions(
    f.readingWithCookie ? null : raceKeyOf(raceId, f.broadcastHead.data, f.gameDay),
    () => setRevealedHere(true),
  )
  const { full, gate, acta } = useStageResult(f, raceId, 1, RESULT_TABS.has(active))
  const watchHead = usePinnedHead(f.broadcastHead.data)

  // Los estados, con `QueryView` (E3, PR 10): con `Watch` encendido las pestañas esperan a la ruta de la
  // etapa, y un fallo suyo ya no se queda cargando para siempre; lo demás que esperan (quién mira, la
  // cabecera) siempre llega.
  if (!tabsKnown)
    return watchSettled && watchOn && f.data === undefined ? (
      <QueryView query={f.stage} label="the race" skeleton={{ kind: 'panel' }} />
    ) : (
      <LoadingState label="the race" />
    )

  const options = tabIds.map((id) => ({ key: id, label: raceTabLabel(id) }))
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
  /**
   * Lo que enseña el resultado: la puerta, o lo que trae la ruta de la etapa o el acta. Mientras no llegan,
   * los estados de la que falta, con `QueryView` (E3, PR 10); el 403 del acta ya es la puerta.
   */
  const withResult = (render: (d: StageReplayData) => ReactNode): ReactNode => {
    if (gate !== null) return gateCard(gate)
    if (full !== null) return render(full)
    if (f.data === undefined)
      return <QueryView query={f.stage} label="the race" skeleton={{ kind: 'panel' }} />
    return <QueryView query={acta} label="the race" skeleton={{ kind: 'panel' }} />
  }
  // los modos (§8.1; 10a): `?view=highlights` y el digest, que en una carrera de un día es su etapa
  const watchView = watchViewOf(params.get('view'))

  return (
    <>
      {watchOn && <ShareStage raceId={raceId} day={1} report={false} />}
      <Tabs
        options={options}
        value={active}
        onChange={setActive}
        label="Race"
        variant="page"
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
              view={watchView}
              digest={
                watchView === 'digest'
                  ? { from: 1, last: 1, raceName: f.data?.race?.name ?? 'the race' }
                  : null
              }
              oneDay
              reveal={actions}
              onReport={() => setActive('report')}
              onFinished={() => setFinishedHere(true)}
            />
          ) : (
            <QueryView query={f.broadcastHead} label="the broadcast" skeleton={{ kind: 'panel' }} />
          ))}

        {active === 'report' && (
          <>
            {/* Sin `Watch` para su etapa (§17.19): una crono sin línea, una lápida (D-12). */}
            {watchOn && f.unavailable && (
              <p className="text-meta text-ink-2">Broadcast unavailable for this race</p>
            )}
            {/* `report` solo existe con `Watch` encendido: apagado, el resultado es `result` (W4) */}
            {withResult((d) => (
              <>
                {/* el acta se comparte desde aquí, donde está (§14.2) */}
                <ShareStage raceId={raceId} day={1} report watch={false} />
                <StageReportView
                  data={d}
                  onWatchAnyway={f.watchable && f.seen ? () => setActive('watch') : undefined}
                  identity={identity}
                  ownRiderId={ownRiderId}
                />
              </>
            ))}
          </>
        )}

        {/* `Result`, solo con `Watch` apagado: el de la ficha de carrera, o la puerta si está en el velo. */}
        {active === 'result' && (veiled ? gateCard({ k: 'not_seen' }) : classifications)}

        {active === 'route' && route}
        {active === 'honours' && honours}
      </TabPanel>
    </>
  )
}
