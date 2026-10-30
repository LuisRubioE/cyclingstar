import {
  type ChampionTitleView,
  type RaceLeaders,
  type StageGate,
  type StageReplay as StageReplayData,
} from '@cyclingstar/shared'
import { type ReactNode, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { StageClassEntry, StageGcEntry, TeamClassEntry } from '../api/results'
import { PaintedRaceRadio } from '../components/PaintedRaceRadio'
import { GcRankTable, PointsRankTable } from '../components/RaceRankTables'
import { RaceRadioPanel } from '../components/RaceRadioPanel'
import { ShareStage, ShareStageIcon } from '../components/ShareStage'
import { DiagnosticStrip, StageGateCard, TwoDeviceNotice } from '../components/StageGate'
import { StageHead } from '../components/StageHead'
import { StageStory } from '../components/StageStory'
import { TabPanel, useTabParam } from '../components/Tabs'
import { type TabOption, Tabs } from '../components/ui/Tabs'
import { TeamClassNote, TeamClassTable } from '../components/TeamClassTable'
import { useOwnIds, useRaceIdentity } from '../components/useTableIdentity'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState, QueryView } from '../components/ui/QueryView'
import { stageTitleInfo, usePageTitle } from '../domain/pageTitle'
import {
  type StagePageTabId,
  oneDayStageTarget,
  stagePageTabOf,
  stagePageTabs,
  stageTabLabel,
} from '../domain/raceTabs'
import type { GatePlace } from '../domain/stageGate'
import type { TableIdentity } from '../domain/tableIdentity'
import { diagOf, useRevealActions } from '../queryClient'
import {
  RESULT_TABS,
  ResultTable,
  StageReportView,
  paintedRadioWanted,
  paintedReachedOf,
  raceKeyOf,
  usePinnedHead,
  useStageFacts,
  useStageResult,
} from './stageView'
import { type DigestRun, StageWatch, watchViewOf } from './StageWatch'

// Las piezas que la página compartía con el acta y que el 9b sacó a `stageView.tsx` y `queryClient.ts` (la
// ficha de una carrera de un día también las usa): se reexportan para quien las importa de aquí.
export { ResultTable, StageReportView, hasResult, raceKeyOf } from './stageView'
export { useRevealActions } from '../queryClient'

const card = 'rounded-ui border border-line bg-surface p-4 shadow-card'
const head = 'text-caption font-semibold uppercase tracking-caps text-ink-2'

const STAGE_PANEL = 'stage-section'

type StageClassTabId = 'gc' | 'points' | 'kom' | 'teams'

const STAGE_CLASS_TAB_IDS: readonly StageClassTabId[] = ['gc', 'points', 'kom', 'teams']
const STAGE_CLASS_PANEL = 'stage-classification'
const STAGE_CLASS_TABS: readonly TabOption<StageClassTabId>[] = [
  { key: 'gc', label: 'General' },
  { key: 'points', label: 'Points' },
  { key: 'kom', label: 'Mountains' },
  { key: 'teams', label: 'Teams' },
]

/**
 * La general, los puntos y la montaña tal como quedaron tras esta etapa, en `RankTable` desde el PR 12b
 * (E3, docs/visual.md §6.1; `components/RaceRankTables.tsx`), con la misma regla de top 20 y `Show all`.
 * Se exportan con su nombre de siempre para probarlas sueltas (`stageTables.test.tsx`).
 */
export {
  GcRankTable as GcTable,
  PointsRankTable as PointsTable,
} from '../components/RaceRankTables'

/**
 * Sub-pestañas de clasificación de la etapa: general, puntos y montaña tras correrla. Desde el PR 21a (E3,
 * §17.21), las del catálogo, de 44, como las de la ficha de carrera, y no las píldoras de 28.
 *
 * Solo aparece en carreras POR ETAPAS: en una de un día la etapa ES la carrera y su ficha ya enseña
 * el resultado (esta página redirige allí), así que aquí no hay caso especial que atender.
 *
 * LOS MAILLOTS QUE SE PINTAN AQUÍ SON LOS DE DESPUÉS DE LA ETAPA (`leaders.afterStage`), porque es
 * el estado que estas tablas están mostrando: si el amarillo cambió de dueño en la meta de hoy, la
 * general de hoy tiene que enseñar al dueño nuevo. La crónica de la pestaña `Story` y el orden de
 * llegada de `Result` llevan los de ANTES —los que se llevaban puestos en la carretera ese día— y
 * la crónica lo dice además en su propia línea, para que la diferencia se lea como lo que es y no
 * como una contradicción.
 */
function StageClassifications({
  gc,
  points,
  kom,
  teamStage,
  teamGc,
  leaders,
  champions,
  identity,
  own,
}: {
  gc: StageGcEntry[]
  points: StageClassEntry[]
  kom: StageClassEntry[]
  teamStage: TeamClassEntry[]
  teamGc: TeamClassEntry[]
  leaders: RaceLeaders | undefined
  /** el título que lleva cada corredor el día de la etapa (E3, §6.1; 4-l) */
  champions: Readonly<Record<string, ChampionTitleView>>
  /** lo que las filas no traen: el dorsal y el dibujo del equipo (PR 12b) */
  identity: TableIdentity
  /** el corredor y el equipo del jugador: sus filas (§6.2) */
  own: { readonly riderId: string | null; readonly teamId: string | null }
}) {
  const [active, setActive] = useTabParam(STAGE_CLASS_TAB_IDS, 'gc', 'cls')
  // la tabla a la vista contesta a la pantalla (§7.3; la 36)
  const ctx = { leaders, champions, identity, ownRiderId: own.riderId, answer: true } as const
  return (
    <div className={card}>
      <p className="mb-3 text-caption text-ink-2">Standings after this stage.</p>
      <Tabs
        options={STAGE_CLASS_TABS}
        value={active}
        onChange={setActive}
        label="Stage classification"
        panelId={STAGE_CLASS_PANEL}
      />
      {/* casi de borde a borde (`-mx-4`, como el `Panel` `bleed` de §6.1): a 320 el nombre cabe; el
          margen negativo, en el panel, hijo directo de la tarjeta, no se sale de su caja de relleno */}
      <TabPanel panelId={STAGE_CLASS_PANEL} active={active} className="mt-3 -mx-4">
        {active === 'gc' &&
          (gc.length > 0 ? (
            <GcRankTable rows={gc} caption="General classification after this stage" {...ctx} />
          ) : (
            <EmptyState text="No general classification yet." />
          ))}
        {active === 'points' &&
          (points.length > 0 ? (
            <PointsRankTable
              rows={points}
              caption="Points classification after this stage"
              {...ctx}
            />
          ) : (
            <EmptyState text="No sprint points awarded yet." />
          ))}
        {active === 'kom' &&
          (kom.length > 0 ? (
            <PointsRankTable
              rows={kom}
              caption="Mountains classification after this stage"
              {...ctx}
            />
          ) : (
            <EmptyState text="No mountain points awarded yet." />
          ))}
        {/* Equipos: la clasificación de ESTA etapa y la acumulada tras ella, una debajo de otra
            —son dos preguntas distintas ("¿quién ganó hoy?" y "¿quién va ganando?") y las dos se
            responden aquí, sin obligar a saltar entre páginas—. */}
        {active === 'teams' &&
          (teamStage.length > 0 || teamGc.length > 0 ? (
            <div className="space-y-4">
              {teamStage.length > 0 && (
                <div>
                  <h3 className={`${head} px-4`}>Stage</h3>
                  <TeamClassTable rows={teamStage} ownTeamId={own.teamId} answer />
                </div>
              )}
              {teamGc.length > 0 && (
                <div>
                  <h3 className={`${head} px-4`}>Overall after this stage</h3>
                  <TeamClassTable
                    rows={teamGc}
                    ownTeamId={own.teamId}
                    cumulative
                    {...(teamStage.length > 0 ? {} : { answer: true })}
                  />
                </div>
              )}
              <TeamClassNote />
            </div>
          ) : (
            <EmptyState text="No team classification for this stage." />
          ))}
      </TabPanel>
    </div>
  )
}

/** La URL de la página con unos parámetros cambiados (null quita el parámetro). */
function hrefWith(path: string, params: URLSearchParams, patch: Record<string, string | null>) {
  const next = new URLSearchParams(params)
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) next.delete(k)
    else next.set(k, v)
  }
  const q = next.toString()
  return q === '' ? path : `${path}?${q}`
}

/**
 * Página de una etapa de una carrera POR ETAPAS. Ya no es un callejón sin salida: la cabecera dice a
 * qué carrera pertenece y qué etapa es de cuántas, hay anterior/siguiente para leer las 21 crónicas
 * seguidas, y el contenido va en pestañas.
 *
 * En una carrera de UN DÍA esta página ya no existe: la carrera y la etapa son la misma cosa y su
 * contenido vive en la ficha de carrera. La URL sigue funcionando —hay enlaces compartidos y en las
 * noticias—, pero redirige allí, a la pestaña equivalente.
 *
 * Una página por etapa y por modo (`key`): al cambiar de etapa o al entrar en el modo diagnóstico, la
 * pestaña fijada, la cabecera de `Watch` y lo que se vio aquí empiezan de cero.
 */
export function StageReplay() {
  const { raceId = '', day = '' } = useParams()
  const [params] = useSearchParams()
  return (
    <StagePage
      key={`${raceId}/${day}/${diagOf(params) ? 'diag' : ''}`}
      raceId={raceId}
      day={Number(day)}
    />
  )
}

/**
 * LA ETAPA SIN DESTRIPE (E2, docs/retransmision.md §6.10, §10.9, §11.10 a §11.12, §11.15 y §14.11;
 * D-36 a D-40, D-48, D-57; paso 9a), con la decisión 1 del dueño durante la implementación.
 *
 * - Las pestañas (`stagePageTabs`): con `Watch` encendido para quien mira, `Watch` delante si no ha visto
 *   la etapa y `Report` (el acta, `Story` y `Result` juntas) si la vio o la reveló; sin `Watch` para esta
 *   etapa (una crono sin línea, una lápida), `Report` con `Broadcast unavailable for this stage`. Con
 *   `Watch` apagado (el jugador hasta el encendido), las de hoy, con `report` llamada `Story`. La pestaña
 *   por defecto se fija la primera vez: que la etapa pase a vista mientras se mira no cambia de pestaña.
 * - La puerta (`StageGateCard`): con la etapa sin ver y en el velo (`watch.gate` de la ficha, o el 403 del
 *   acta), lo que enseñaría el resultado la pinta; `?tab=` no la salta (sup. E9). En `Watch`, la de la
 *   anterior sin ver (`previous_unseen`, D-37). Fuera del velo, lo que no sirvió la ficha lo trae el acta
 *   (`GET …/report`), a un toque y sin confirmación (10-e).
 * - La caché (§10.9): las claves de la ficha, la cabecera y el acta llevan el `rev` del horizonte y
 *   esperan a tenerlo; al llegar a la meta o al revelar, el `rev` cambia y todo se pide otra vez.
 * - Dos dispositivos (D-57): si la etapa que se estaba viendo pasa a vista por otro lado, `You finished
 *   this stage on another device · Watch anyway · Show report`.
 * - El modo diagnóstico (§11.15): `?diag=1` de un administrador, con su franja, la etapa entera y nada
 *   escrito: la ficha, la cabecera, los tramos y el acta lo llevan, y `Watch` no informa.
 * - La `Race Radio` de una etapa sin ver (§11.16, 11-i; paso 11a): en el velo y con línea grabada, la
 *   radio hasta lo pintado (`PaintedRaceRadio`) en lugar de la puerta; la de una conocida la trae la
 *   ficha, desde el 11a sacada de la línea en el servidor.
 * - Los modos (§8.1; paso 10a): `?view=highlights` abre `Watch` en `Highlights` y
 *   `?view=digest&from=5&to=21`, en el digest de la carrera de la 5 a la 21, que encadena navegando a la
 *   siguiente sin dejar rastro en el historial (8-c); `Show result` de los mandos revela con las mismas
 *   acciones que la puerta.
 */
function StagePage({ raceId, day }: { raceId: string; day: number }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const f = useStageFacts(raceId, day)
  const { data, diagOn, isAdmin, watchOn, run, isOneDay } = f
  const { watchable, unavailable, seen, settled, dataGate, readingWithCookie } = f
  const tabIds: readonly StagePageTabId[] = run
    ? stagePageTabs(seen, watchOn, watchable)
    : ['profile']
  // La pestaña por defecto, fijada la primera vez que se sabe: la etapa que pasa a vista mientras se
  // mira (la meta, o el otro dispositivo) no saca a nadie de `Watch`.
  const [start, setStart] = useState<{ readonly tab: StagePageTabId; readonly seen: boolean }>()
  if (start === undefined && settled) setStart({ tab: tabIds[0] ?? 'profile', seen })
  const pinned = start !== undefined && tabIds.includes(start.tab) ? start.tab : tabIds[0]
  const [active, setActive] = useTabParam(
    tabIds,
    stagePageTabOf(params.get('tab'), tabIds) ?? pinned ?? 'profile',
  )

  const [finishedHere, setFinishedHere] = useState(false)
  const [revealedHere, setRevealedHere] = useState(false)
  const [otherDeviceSeen, setOtherDeviceSeen] = useState(false)
  // lo alcanzado en `Watch` en esta página (11a): hasta ahí llega la radio de la etapa sin ver
  const [reachedHere, setReachedHere] = useState(0)
  const actions = useRevealActions(
    readingWithCookie ? null : raceKeyOf(raceId, f.broadcastHead.data, f.gameDay),
    () => setRevealedHere(true),
  )

  // Lo que enseña el resultado: la ficha si lo trae; si no, sin puerta, el acta, a un toque (10-e).
  const { full, gate, acta } = useStageResult(f, raceId, day, RESULT_TABS.has(active))
  const watchHead = usePinnedHead(f.broadcastHead.data)
  // Lo que las tablas no traen (E3, PR 12b): el dorsal y el dibujo del equipo, de la lista de salida, y
  // lo propio; solo en las pestañas que las pintan.
  const identidad = useRaceIdentity(raceId, RESULT_TABS.has(active))
  const propio = useOwnIds(RESULT_TABS.has(active))

  // El título de la etapa (§11.8): el mismo en todas sus pestañas y antes del JavaScript (11-c).
  usePageTitle(stageTitleInfo(data), 'watch')

  // Los estados de la ficha, con `QueryView` (E3, PR 10).
  if (data === undefined)
    return <QueryView query={f.stage} label="the stage" skeleton={{ kind: 'header' }} />

  // Carrera de un día: la ficha de carrera ya contiene todo esto. Se redirige sin dejar rastro en el
  // historial, así que el botón "atrás" no rebota entre las dos páginas; sin pestaña pedida, a donde
  // diga `Watch` para quien mira (9b), así que espera a saberlo (`settled`, que siempre llega).
  if (isOneDay) {
    if (!settled) return <LoadingState label="the race" skeleton={{ kind: 'header' }} />
    return <Navigate to={oneDayStageTarget(raceId, params, watchOn)} replace />
  }

  const race = data.race
  const stageCount = race?.stageCount ?? 0
  const options = tabIds.map((id) => ({ key: id, label: stageTabLabel(id, watchOn) }))
  const pagePath = `/world/races/${raceId}/stages/${data.day}`
  const diagHref = isAdmin ? hrefWith(pagePath, params, { diag: '1' }) : null
  // Dos dispositivos (D-57): sin verla al entrar, vista ahora, y no por la meta ni por revelar aquí.
  const otherDevice =
    start !== undefined &&
    !start.seen &&
    seen &&
    !finishedHere &&
    !revealedHere &&
    !otherDeviceSeen &&
    active === 'watch' &&
    !diagOn

  // La pestaña viaja en la URL (enlace compartido) y se conserva al saltar de etapa: quien está
  // leyendo crónicas sigue leyendo crónicas. El modo de `Watch` no: la otra etapa abre en el suyo.
  function stageHref(target: number): string {
    return hrefWith(`/world/races/${raceId}/stages/${target}`, params, { view: null, from: null })
  }
  // El modo con que se entra en `Watch` (§8.1) y, en el digest, de qué etapa a cuál (8-c)
  const watchView = watchViewOf(params.get('view'))
  const digestRun: DigestRun | null =
    watchView === 'digest' && stageCount > 0
      ? {
          from: Math.min(data.day, Number(params.get('from')) || data.day),
          last: Math.max(data.day, Math.min(stageCount, Number(params.get('to')) || stageCount)),
          raceName: race?.name ?? 'the race',
        }
      : null

  const gateCard = (g: StageGate, place: GatePlace): ReactNode => (
    <StageGateCard
      gate={g}
      stageDay={data.day}
      place={place}
      raceId={raceId}
      watchOn={watchOn}
      watchable={watchable}
      onWatch={() => setActive('watch')}
      actions={actions}
      signIn={readingWithCookie}
      diagHref={diagHref}
    />
  )
  /**
   * Lo que enseña el resultado: la puerta, o lo que trae la ficha o el acta. Mientras el acta no llega,
   * sus estados, con `QueryView` (E3, PR 10); su 403 ya es la puerta (`useStageResult`).
   */
  const withResult = (render: (d: StageReplayData) => ReactNode): ReactNode => {
    if (gate !== null) return gateCard(gate, 'result')
    if (full !== null) return render(full)
    return <QueryView query={acta} label="the report" skeleton={{ kind: 'panel' }} />
  }
  // La Race Radio de una etapa sin ver (§11.16, 11-i; 11a): la radio hasta lo pintado, construida aquí
  // con la cabecera y los tramos de `Watch`, en lugar de la puerta (`paintedRadioWanted`).
  const radioHead = f.broadcastHead.data
  const paintedRadio = paintedRadioWanted(gate, watchable, radioHead)
  const paintedReachedS = paintedReachedOf(radioHead, data.day, reachedHere)
  // `Watch` con la anterior sin ver: la puerta de §11.12, de la ficha o de la cabecera
  const watchGate =
    dataGate?.k === 'previous_unseen'
      ? dataGate
      : watchHead?.gate?.k === 'previous_unseen'
        ? watchHead.gate
        : null

  return (
    <section className="space-y-4">
      {/* La cabeza (E3, §14.2; PR 20): la fila de 44 con la carrera y sus flechas, el `h1` con compartir
          (§11.10: ver siempre; el acta, en `Report`) y la ruta debajo. */}
      <StageHead
        raceId={raceId}
        race={
          race === undefined || race === null
            ? null
            : { name: race.name, country: race.country ?? null }
        }
        day={data.day}
        stageCount={stageCount}
        stageHref={stageHref}
        title={data.name || `Stage ${data.day}`}
        from={data.from}
        to={data.to}
        km={data.km}
        run={data.run}
        share={watchOn && run ? <ShareStageIcon raceId={raceId} day={data.day} /> : null}
      />

      {diagOn && <DiagnosticStrip exitHref={hrefWith(pagePath, params, { diag: null })} />}

      {/* hasta saber las pestañas (`settled`, que siempre llega): la espera sin consulta (E3, PR 10) */}
      {!settled ? (
        <LoadingState label="the stage" />
      ) : (
        <>
          <Tabs
            options={options}
            value={active}
            onChange={setActive}
            label="Stage"
            variant="page"
            panelId={STAGE_PANEL}
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

          <TabPanel panelId={STAGE_PANEL} active={active}>
            {active === 'watch' &&
              (watchGate !== null ? (
                gateCard(watchGate, 'watch')
              ) : watchHead !== undefined ? (
                <StageWatch
                  head={watchHead}
                  raceId={raceId}
                  day={data.day}
                  diag={diagOn}
                  view={digestRun === null && watchView === 'digest' ? 'watch' : watchView}
                  digest={digestRun}
                  reveal={actions}
                  onReport={() => setActive('report')}
                  onFinished={() => setFinishedHere(true)}
                  onReached={(s) => setReachedHere((x) => Math.max(x, s))}
                  onChain={(next) =>
                    navigate(
                      `/world/races/${raceId}/stages/${next}?tab=watch&view=digest&from=${digestRun?.from ?? data.day}&to=${digestRun?.last ?? next}`,
                      { replace: true },
                    )
                  }
                />
              ) : (
                <QueryView
                  query={f.broadcastHead}
                  label="the broadcast"
                  skeleton={{ kind: 'panel' }}
                />
              ))}

            {active === 'report' && (
              <>
                {/* Sin `Watch` para esta etapa (§17.19): una crono sin línea, una lápida (D-12). */}
                {watchOn && unavailable && (
                  <p className="text-meta text-ink-2">Broadcast unavailable for this stage</p>
                )}
                {withResult((d) =>
                  watchOn ? (
                    <>
                      {/* el acta se comparte desde aquí, donde está; ver, desde la cabeza (§14.2) */}
                      {run && <ShareStage raceId={raceId} day={data.day} report watch={false} />}
                      <StageReportView
                        data={d}
                        onWatchAnyway={watchable && seen ? () => setActive('watch') : undefined}
                        identity={identidad}
                        ownRiderId={propio.riderId}
                        classificationsHref={
                          tabIds.includes('classifications')
                            ? hrefWith(pagePath, params, { tab: 'classifications' })
                            : undefined
                        }
                      />
                    </>
                  ) : (
                    <StageStory data={d} onFullResult={() => setActive('result')} />
                  ),
                )}
              </>
            )}

            {active === 'result' &&
              withResult((d) =>
                d.results && d.results.length > 0 ? (
                  <div className={card}>
                    <h2 className={head}>Stage result</h2>
                    {/* `onRoad`, no `afterStage`: ver la cabecera de `ResultTable`. */}
                    <ResultTable
                      rows={d.results}
                      leaders={d.leaders?.onRoad}
                      champions={d.champions}
                      identity={identidad}
                      ownRiderId={propio.riderId}
                      layout="-mx-4"
                    />
                  </div>
                ) : (
                  <div className={card}>
                    <EmptyState text="No result for this stage." />
                  </div>
                ),
              )}

            {active === 'radio' && paintedRadio && (
              <PaintedRaceRadio
                head={radioHead}
                raceId={raceId}
                day={data.day}
                reachedS={paintedReachedS}
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
                    <EmptyState text="This stage was raced before the race radio was recorded, so there is nothing to replay. We don't rebuild it from scratch: a re-run with today's engine would tell a different race from the one on the result sheet." />
                  </div>
                ),
              )}

            {active === 'classifications' &&
              withResult((d) => (
                <StageClassifications
                  gc={d.gc ?? []}
                  points={d.points ?? []}
                  kom={d.kom ?? []}
                  teamStage={d.teamStage ?? []}
                  teamGc={d.teamGc ?? []}
                  leaders={d.leaders?.afterStage}
                  champions={d.champions}
                  identity={identidad}
                  own={propio}
                />
              ))}

            {active === 'profile' && (
              <div className={card}>
                <h2 className={head}>Profile</h2>
                {/* sin ver la etapa, la de la ficha: sin las marcas de lo que pasó (sup. E7) */}
                {(full ?? data).altimetry ? (
                  <div
                    className="mt-2 w-full overflow-x-auto"
                    role="img"
                    aria-label={`Elevation profile of stage ${data.day}, ${data.km} km`}
                    dangerouslySetInnerHTML={{ __html: (full ?? data).altimetry }}
                  />
                ) : (
                  <EmptyState text="No profile available for this stage." />
                )}
                {!data.run && (
                  <p className="mt-3 text-meta text-ink-2">
                    This stage hasn&apos;t been raced yet.
                  </p>
                )}
              </div>
            )}
          </TabPanel>
        </>
      )}
    </section>
  )
}
