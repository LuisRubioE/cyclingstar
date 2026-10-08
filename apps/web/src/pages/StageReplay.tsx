import {
  type BroadcastHead,
  type HorizonSummary,
  type RaceLeaders,
  type StageGate,
  type StageReplay as StageReplayData,
  currentSeason,
  stageRouteText,
} from '@cyclingstar/shared'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { fetchAdminWhoami } from '../api/admin'
import {
  broadcastHeadKey,
  fetchBroadcastHead,
  fetchStageReport,
  stageReportKey,
} from '../api/broadcast'
import { fetchHealth } from '../api/health'
import { ApiError, GateError } from '../api/request'
import {
  type StageClassEntry,
  type StageGcEntry,
  type StageResultEntry,
  type TeamClassEntry,
  diagOf,
  fetchCalendarStage,
  stageReplayKey,
} from '../api/results'
import { postReveal, putSpoilerScope, readLocalProgress } from '../api/watch'
import { authClient } from '../auth/client'
import { Flag } from '../components/Flag'
import { RiderJersey } from '../components/Jersey'
import { RiderName } from '../components/RiderName'
import { ShowAllButton, TOP_ROWS } from '../components/ShowAll'
import { PaintedRaceRadio } from '../components/PaintedRaceRadio'
import { RaceRadioPanel } from '../components/RaceRadioPanel'
import { ShareStage } from '../components/ShareStage'
import {
  DiagnosticStrip,
  type RevealActions,
  StageGateCard,
  TwoDeviceNotice,
} from '../components/StageGate'
import { StageRoute } from '../components/StageRoute'
import { StageStory } from '../components/StageStory'
import { type TabOption, TabPanel, Tabs, useTabParam } from '../components/Tabs'
import { TeamClassNote, TeamClassTable } from '../components/TeamClassTable'
import { formatTime } from '../domain/format'
import { raceTeamLabel } from '../domain/labels'
import { stageTitleInfo, usePageTitle } from '../domain/pageTitle'
import {
  type StagePageTabId,
  oneDayStageTarget,
  stagePageTabOf,
  stagePageTabs,
  stageTabLabel,
} from '../domain/raceTabs'
import type { GatePlace } from '../domain/stageGate'
import { useHorizon, useHorizonRev } from '../queryClient'
import { StageWatch } from './StageWatch'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const head = 'text-xs font-semibold uppercase tracking-wide text-slate-400'

const STAGE_PANEL = 'stage-section'

type StageClassTabId = 'gc' | 'points' | 'kom' | 'teams'

const STAGE_CLASS_TAB_IDS: readonly StageClassTabId[] = ['gc', 'points', 'kom', 'teams']
const STAGE_CLASS_TABS: readonly TabOption<StageClassTabId>[] = [
  { key: 'gc', label: 'General' },
  { key: 'points', label: 'Points' },
  { key: 'kom', label: 'Mountains' },
  { key: 'teams', label: 'Teams' },
]
const STAGE_CLASS_PANEL = 'stage-classification'

/**
 * Resultado de la etapa: top 20 y "Show all" (antes se truncaba a 15 sin forma de ver el resto).
 *
 * LOS MAILLOTS DE ESTA TABLA SON LOS DE LA CARRETERA (`leaders.onRoad`), no los de después. Es la
 * única tabla de la página en la que es así, y tiene su razón: esta tabla no es una clasificación,
 * es el ORDEN DE LLEGADA de una tarde concreta. El corredor que cruzó la meta el segundo día de la
 * Vuelta a Andalucía llevaba puesto el amarillo de la etapa 1, y ese es el que se vio en la
 * televisión; pintarle el de la etapa 2 —que se lo acaba de quitar en esa misma meta— era el fallo
 * que se reportó: «sale ya con maillot amarillo el que va líder después de la etapa 2, no el que
 * iba líder después de la etapa 1, que es lo que debería mostrar».
 *
 * La pestaña `Classifications` sigue llevando los de DESPUÉS, porque ahí sí se está mostrando el
 * estado nuevo. Son dos preguntas distintas y cada tabla contesta la suya.
 *
 * Las tres tablas de esta página se exportan para poder probarlas sueltas (`stageTables.test.tsx`):
 * lo que hay que verificar de ellas es qué fila lleva qué maillot, y montar la página entera con su
 * `react-query` y su router para eso no prueba nada más y sí puede fallar por otra cosa.
 */
/**
 * CÓMO SE DICE QUE ALGUIEN NO ACABÓ. `fuera_control` es su propia cosa —cruzó la meta, pero tarde— y
 * la hoja de una carrera de verdad no lo llama DNF; el resto se agrupa, porque para el lector «se
 * bajó de la bici» y «se cayó y no siguió» son la misma noticia y el porqué lo cuenta el journal.
 */
function dnfLabel(reason: string | null | undefined): string {
  return reason === 'fuera_control' ? 'OTL' : 'DNF'
}

export function ResultTable({
  rows,
  leaders,
}: {
  rows: StageResultEntry[]
  leaders: RaceLeaders | undefined
}) {
  const [showAll, setShowAll] = useState(false)
  const winnerTime = rows[0]?.tiempoS ?? 0
  /**
   * LOS QUE NO ACABARON SE VEN SIEMPRE, tampoco cuando la tabla está plegada (v50).
   *
   * Van al final, como en una hoja de verdad, pero esconderlos detrás de «Show all» sería repetir la
   * queja que esto viene a arreglar —«los DNF no salen en la clasificación de la etapa»—: son cuatro
   * o cinco filas y son justo las que se buscan cuando falta alguien.
   */
  const acabaron = rows.filter((r) => !r.dnf)
  const noAcabaron = rows.filter((r) => r.dnf)
  const visible = showAll ? rows : [...acabaron.slice(0, TOP_ROWS), ...noAcabaron]
  return (
    <>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">Stage result: position, country, rider and time</caption>
        <tbody>
          {visible.map((r) => (
            <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
              <td className="w-7 py-1 text-slate-400 tabular-nums">{r.dnf ? '' : r.puesto}</td>
              <td className="w-6 py-1">
                <Flag code={r.country} size={16} />
              </td>
              <td className={`py-1 ${r.dnf ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                <RiderJersey leaders={leaders} riderId={r.riderId} />
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                <span className="ml-2 text-xs text-slate-400">{raceTeamLabel(r.teamName)}</span>
              </td>
              <td className="py-1 text-right tabular-nums text-slate-500">
                {r.dnf ? (
                  <span className="text-amber-500">{dnfLabel(r.reason)}</span>
                ) : r.puesto === 1 ? (
                  formatTime(r.tiempoS)
                ) : (
                  `+${formatTime(r.tiempoS - winnerTime)}`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowAllButton
        total={acabaron.length}
        expanded={showAll}
        onToggle={() => setShowAll(!showAll)}
      />
    </>
  )
}

/** General tal como quedó tras esta etapa, con la misma regla de top 20 + "Show all". */
export function GcTable({
  rows,
  leaders,
}: {
  rows: StageGcEntry[]
  leaders: RaceLeaders | undefined
}) {
  const [showAll, setShowAll] = useState(false)
  // El líder es el primer CLASIFICADO, no la primera fila: los no clasificados van al final, pero si
  // la general entera fuera de abandonos el `?? 0` de antes daba diferencias contra cero.
  const leader = (rows.find((r) => !r.dnf) ?? rows[0])?.tiempoTotalS ?? 0
  const visible = showAll ? rows : rows.slice(0, TOP_ROWS)
  return (
    <>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">
          General classification: position, country, rider, team and time
        </caption>
        <tbody>
          {visible.map((r, i) => (
            // Quien no está clasificado —abandonó, o le falta una etapa— sale como DNF y sin
            // puesto. Su tiempo acumulado no significa nada: enseñarlo fue lo que puso a un
            // corredor líder por 4h36 por no haber corrido la etapa 8 (ver `getGcThroughStage`).
            <tr
              key={r.riderId}
              className={`border-b border-slate-100 last:border-0${r.dnf ? ' text-slate-300' : ''}`}
            >
              <td className="w-7 py-1 text-slate-400 tabular-nums">{r.dnf ? '' : i + 1}</td>
              <td className="w-6 py-1">
                <Flag code={r.country} size={16} />
              </td>
              <td className={`py-1 ${r.dnf ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                <RiderJersey leaders={leaders} riderId={r.riderId} />
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                <span className="ml-2 text-xs text-slate-400">{raceTeamLabel(r.teamName)}</span>
              </td>
              <td className="py-1 text-right tabular-nums text-slate-500">
                {r.dnf ? (
                  <span className="text-amber-500">DNF</span>
                ) : i === 0 ? (
                  formatTime(r.tiempoTotalS)
                ) : (
                  `+${formatTime(r.tiempoTotalS - leader)}`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowAllButton total={rows.length} expanded={showAll} onToggle={() => setShowAll(!showAll)} />
    </>
  )
}

/** Clasificación por puntos (montaña o metas volantes): puesto, bandera, nombre, puntos. */
export function PointsTable({
  rows,
  unit,
  leaders,
}: {
  rows: StageClassEntry[]
  unit: string
  leaders: RaceLeaders | undefined
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? rows : rows.slice(0, TOP_ROWS)
  return (
    <>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">Classification: position, country, rider and {unit}</caption>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.riderId} className="border-b border-slate-100 last:border-0">
              <td className="w-7 py-1 tabular-nums text-slate-400">{i + 1}</td>
              <td className="w-6 py-1">
                <Flag code={r.country} size={16} />
              </td>
              <td className="py-1 text-slate-700">
                <RiderJersey leaders={leaders} riderId={r.riderId} />
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
              </td>
              <td className="py-1 text-right font-medium tabular-nums text-slate-600">
                {r.puntos} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ShowAllButton total={rows.length} expanded={showAll} onToggle={() => setShowAll(!showAll)} />
    </>
  )
}

/**
 * Sub-pestañas de clasificación de la etapa: general, puntos y montaña tras correrla.
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
}: {
  gc: StageGcEntry[]
  points: StageClassEntry[]
  kom: StageClassEntry[]
  teamStage: TeamClassEntry[]
  teamGc: TeamClassEntry[]
  leaders: RaceLeaders | undefined
}) {
  const [active, setActive] = useTabParam(STAGE_CLASS_TAB_IDS, 'gc', 'cls')
  return (
    <div className={card}>
      <p className="mb-3 text-xs text-slate-400">Standings after this stage.</p>
      <Tabs
        options={STAGE_CLASS_TABS}
        value={active}
        onChange={setActive}
        label="Stage classification"
        variant="pill"
        panelId={STAGE_CLASS_PANEL}
      />
      <TabPanel panelId={STAGE_CLASS_PANEL} active={active} className="mt-3">
        {active === 'gc' &&
          (gc.length > 0 ? (
            <GcTable rows={gc} leaders={leaders} />
          ) : (
            <p className="text-sm text-slate-400">No general classification yet.</p>
          ))}
        {active === 'points' &&
          (points.length > 0 ? (
            <PointsTable rows={points} unit="pts" leaders={leaders} />
          ) : (
            <p className="text-sm text-slate-400">No sprint points awarded yet.</p>
          ))}
        {active === 'kom' &&
          (kom.length > 0 ? (
            <PointsTable rows={kom} unit="pts" leaders={leaders} />
          ) : (
            <p className="text-sm text-slate-400">No mountain points awarded yet.</p>
          ))}
        {/* Equipos: la clasificación de ESTA etapa y la acumulada tras ella, una debajo de otra
            —son dos preguntas distintas ("¿quién ganó hoy?" y "¿quién va ganando?") y las dos se
            responden aquí, sin obligar a saltar entre páginas—. */}
        {active === 'teams' &&
          (teamStage.length > 0 || teamGc.length > 0 ? (
            <div className="space-y-5">
              {teamStage.length > 0 && (
                <div>
                  <h3 className={head}>Stage</h3>
                  <TeamClassTable rows={teamStage} />
                </div>
              )}
              {teamGc.length > 0 && (
                <div>
                  <h3 className={head}>Overall after this stage</h3>
                  <TeamClassTable rows={teamGc} />
                </div>
              )}
              <TeamClassNote />
            </div>
          ) : (
            <p className="text-sm text-slate-400">No team classification for this stage.</p>
          ))}
      </TabPanel>
    </div>
  )
}

// ------------------------------------------------------- el acta y revelar (E2, §11.10 y §11.11; 9a)

/**
 * La ficha trae el resultado: la ruta de etapa lo sirve cuando la pantalla lo va a enseñar (§14.1, 14-e):
 * vista o revelada, o sin `Watch` y fuera del velo; y siempre con SPOILER_MODE apagado para quien pide o
 * en el modo diagnóstico. Si no, llega sin él (`stageShellOf`) y lo que lo enseña pide el acta.
 */
export function hasResult(data: StageReplayData): boolean {
  return data.run && data.results !== undefined
}

/** La clave de la carrera de la etapa, con la temporada de hoy: la de la cabecera si la hay. */
export function raceKeyOf(
  raceId: string,
  head: BroadcastHead | undefined,
  gameDay: number | null | undefined,
): string | null {
  if (head !== undefined) return head.stage.raceKey
  return gameDay == null ? null : `${raceId}:s${currentSeason(gameDay)}`
}

/**
 * REVELAR DESDE LA PUERTA (§10.3, §11.11; D-38, DD-17): `POST /api/me/reveal/:raceKey/:day`, que escribe
 * `R` en la etapa y `A` en las anteriores que faltaran, y el `rev` que devuelve en `['horizon']`: con él
 * cambian de una vez las claves de la ficha, la cabecera y el acta (regla 3 de §10.9), y la página se
 * pide otra vez ya conocida. `Don't ask again` guarda `users.reveal_confirm = false` con el alcance que
 * ya tenía (`PUT /api/me/spoiler-scope`). Null sin la clave de la carrera, o para quien lee con
 * `cs_viewer` sin sesión (pasa `null`): las escrituras piden sesión (§10.8).
 */
export function useRevealActions(
  raceKey: string | null,
  onRevealed: () => void,
): RevealActions | null {
  const queryClient = useQueryClient()
  const horizon = useHorizon()
  if (raceKey === null) return null
  const withRev = (rev: string, patch: Partial<HorizonSummary> = {}): void => {
    queryClient.setQueryData<HorizonSummary | null>(['horizon'], (old) =>
      old == null ? old : { ...old, ...patch, rev },
    )
  }
  return {
    askFirst: horizon.data?.revealConfirm ?? true,
    reveal: async (stageDay) => {
      const { rev } = await postReveal(raceKey, stageDay)
      onRevealed()
      withRev(rev)
      // las listas del horizonte (lo que queda por ver) también cambian: se piden otra vez
      void queryClient.invalidateQueries({ queryKey: ['horizon'] })
    },
    dontAskAgain: async () => {
      const { rev } = await putSpoilerScope(horizon.data?.scope ?? 'guarded', false)
      withRev(rev, { revealConfirm: false })
    },
  }
}

/**
 * `REPORT`, EL ACTA (decisión 1 del dueño durante la implementación, 8 de octubre de 2026; D-48, DD-28):
 * con `Watch` encendido, `Story` y `Result` son una sola pestaña, el resultado entero y la crónica debajo,
 * sin repetir el podio. Se abre al terminar de ver la etapa o al revelarla; `Watch anyway` la vuelve a
 * poner a un toque (§11.10). La pinta también el acta pública de `/report`.
 */
export function StageReportView({
  data,
  onWatchAnyway,
}: {
  data: StageReplayData
  onWatchAnyway?: (() => void) | undefined
}) {
  const results = data.results ?? []
  return (
    <>
      {onWatchAnyway !== undefined && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onWatchAnyway}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Watch anyway
          </button>
        </div>
      )}
      {results.length > 0 ? (
        <div className={card}>
          <h2 className={head}>Stage result</h2>
          {/* `onRoad`, no `afterStage`: ver la cabecera de `ResultTable`. */}
          <ResultTable rows={results} leaders={data.leaders?.onRoad} />
        </div>
      ) : (
        <div className={card}>
          <p className="text-sm text-slate-400">No result for this stage.</p>
        </div>
      )}
      <StageStory data={data} podium={false} />
    </>
  )
}

/** Las pestañas que enseñan lo que la etapa dejó: sin verla, la puerta (sup. E9) o el acta. */
const RESULT_TABS: ReadonlySet<StagePageTabId> = new Set([
  'report',
  'result',
  'classifications',
  'radio',
])

/** La puerta como texto estable: la cabecera que ve `Watch` solo se cambia si cambia la puerta. */
const gateKey = (g: StageGate | null): string =>
  g === null ? '' : g.k === 'previous_unseen' ? `previous_unseen:${g.firstUnseen}` : g.k

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
 */
function StagePage({ raceId, day }: { raceId: string; day: number }) {
  const [params] = useSearchParams()
  const diag = diagOf(params)
  const rev = useHorizonRev()
  const session = authClient.useSession()
  // Con otro `rev` (lo visto en otra pestaña, la meta, el día nuevo) la clave cambia: mientras llega la
  // ficha nueva se queda la de antes, para que la página no vuelva a «Loading…» y `Watch` siga montado.
  const { data, isPending, isError } = useQuery({
    queryKey: stageReplayKey(raceId, day, diag, rev),
    queryFn: () => fetchCalendarStage(raceId, day, { diag }),
    enabled: rev !== undefined,
    placeholderData: keepPreviousData,
  })
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const watchSwitch = health.data?.features?.broadcastWatch ?? 'off'
  const dataGate = data?.watch?.gate ?? null
  // ¿Es un administrador con sesión? Lo que decide `BROADCAST_WATCH=admins` y el modo diagnóstico.
  const whoami = useQuery({
    queryKey: ['admin-whoami'],
    queryFn: fetchAdminWhoami,
    retry: false,
    enabled: watchSwitch === 'admins' || diag || dataGate !== null,
  })
  const isAdmin = whoami.data?.via === 'session'
  // `Watch` encendido para quien mira: lo que decide `request.broadcastOn()` en la API (§14.6)
  const watchOn = watchSwitch === 'on' || (watchSwitch === 'admins' && isAdmin)
  // para quien no es administrador `?diag=1` no existe, en la API (11-h) y aquí
  const diagOn = diag && isAdmin
  const run = data?.run === true
  const isOneDay = (data?.race?.stageCount ?? 0) === 1
  // `Watch`: una carrera de un día redirige a su ficha y no lo tiene hasta el 9b (§11.17)
  const wantsHead = watchOn && run && !isOneDay
  const broadcastHead = useQuery({
    queryKey: broadcastHeadKey(raceId, day, undefined, diag, rev),
    queryFn: () => fetchBroadcastHead(raceId, day, undefined, { diag }),
    enabled: wantsHead && rev !== undefined,
    placeholderData: keepPreviousData,
  })
  const watchable = wantsHead && broadcastHead.isSuccess
  const unavailable =
    wantsHead &&
    broadcastHead.error instanceof ApiError &&
    broadcastHead.error.code === 'broadcast_unavailable'
  // sin `watch` (SPOILER_MODE apagado para quien pide, o el modo diagnóstico), la etapa es la de hoy: vista
  const seen = data?.watch?.seen ?? true
  // ya se sabe qué pestañas lleva: la ficha, el interruptor, quién mira y si hay cabecera
  const settled =
    data !== undefined &&
    !health.isPending &&
    (watchSwitch !== 'admins' && !diag ? true : !whoami.isPending) &&
    (!wantsHead || !broadcastHead.isPending)
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
  // quien lee con `cs_viewer` sin sesión: el horizonte es el de su cuenta y no puede escribir (§10.8)
  const readingWithCookie =
    !session.isPending &&
    session.data == null &&
    rev !== undefined &&
    !['anon', 'world', 'unavailable'].includes(rev)
  const actions = useRevealActions(
    readingWithCookie ? null : raceKeyOf(raceId, broadcastHead.data, health.data?.gameDay),
    () => setRevealedHere(true),
  )

  // Lo que enseña el resultado: la ficha si lo trae; si no, sin puerta, el acta, a un toque (10-e).
  const served = data !== undefined && hasResult(data)
  const needsActa = settled && run && !served && dataGate === null && RESULT_TABS.has(active)
  const acta = useQuery({
    queryKey: stageReportKey(raceId, day, undefined, diag, rev),
    queryFn: () => fetchStageReport(raceId, day, undefined, { diag }),
    enabled: needsActa && rev !== undefined,
    placeholderData: keepPreviousData,
  })
  const full: StageReplayData | null = served ? data : (acta.data ?? null)
  const gate: StageGate | null =
    dataGate ?? (acta.error instanceof GateError ? acta.error.gate : null)

  // La cabecera que ve `Watch`: la primera, y otra solo si cambia la puerta. Una cabecera nueva por el
  // `rev` (el día nuevo, lo visto en otra pestaña) reiniciaría el reproductor a mitad de etapa.
  const [watchHead, setWatchHead] = useState<BroadcastHead>()
  if (
    broadcastHead.data !== undefined &&
    (watchHead === undefined || gateKey(watchHead.gate) !== gateKey(broadcastHead.data.gate))
  )
    setWatchHead(broadcastHead.data)

  // El título de la etapa (§11.8): el mismo en todas sus pestañas y antes del JavaScript (11-c).
  usePageTitle(stageTitleInfo(data), 'watch')

  if (isPending) return <p className="text-slate-500">Loading…</p>
  if (isError) return <p className="text-red-600">Could not load the stage.</p>

  // Carrera de un día: la ficha de carrera ya contiene todo esto. Se redirige sin dejar rastro en el
  // historial, así que el botón "atrás" no rebota entre las dos páginas.
  if (isOneDay) return <Navigate to={oneDayStageTarget(raceId, params)} replace />

  const race = data.race
  const stageCount = race?.stageCount ?? 0
  const prevDay = data.day > 1 ? data.day - 1 : null
  const nextDay = stageCount > 0 && data.day < stageCount ? data.day + 1 : null
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
  // leyendo crónicas sigue leyendo crónicas.
  function stageHref(target: number): string {
    const suffix = params.toString()
    return `/world/races/${raceId}/stages/${target}${suffix ? `?${suffix}` : ''}`
  }

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
  /** Lo que enseña el resultado: la puerta, o lo que trae la ficha o el acta. */
  const withResult = (render: (d: StageReplayData) => ReactNode): ReactNode => {
    if (gate !== null) return gateCard(gate, 'result')
    if (full !== null) return render(full)
    if (acta.isError)
      return (
        <div className={card}>
          <p className="text-sm text-red-600">Could not load the report.</p>
        </div>
      )
    return <p className="text-slate-500">Loading…</p>
  }
  /**
   * LA RACE RADIO DE UNA ETAPA SIN VER (§11.16, 11-i; 11a): en el velo (la puerta `not_seen`) y con línea
   * grabada, la radio hasta lo pintado en lugar de la puerta, construida aquí con la cabecera y los tramos
   * de `Watch`. Lo alcanzado: el mayor de lo que dice la cabecera (con sesión) o el `localStorage` (sin
   * ella, 11-p) y lo visto en esta página. Sin línea (el adaptador, una lápida) o en una crono, que no
   * tiene radio, la puerta, como hasta ahora; con la anterior sin ver, también.
   */
  const radioHead = broadcastHead.data
  const paintedRadio =
    gate?.k === 'not_seen' &&
    watchable &&
    radioHead !== undefined &&
    radioHead.source === 'timeline' &&
    !radioHead.stage.timeTrial
  const paintedReachedS =
    radioHead === undefined
      ? 0
      : Math.max(
          reachedHere,
          radioHead.view?.reachedS ?? 0,
          radioHead.view === null ? (readLocalProgress(radioHead.stage.raceKey, data.day) ?? 0) : 0,
        )
  // `Watch` con la anterior sin ver: la puerta de §11.12, de la ficha o de la cabecera
  const watchGate =
    dataGate?.k === 'previous_unseen'
      ? dataGate
      : watchHead?.gate?.k === 'previous_unseen'
        ? watchHead.gate
        : null

  const navButton =
    'rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200'

  return (
    <section className="space-y-4">
      {/* Cabecera con contexto: de qué carrera es la etapa, y anterior/siguiente para no volver atrás. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/world/races/${raceId}`}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
        >
          <span aria-hidden>←</span>
          {race?.country && <Flag code={race.country} size={14} />}
          <span className="font-medium">{race?.name ?? 'Back to the race'}</span>
          {race && stageCount > 0 && (
            <span className="text-slate-400">
              · Stage {data.day} of {stageCount}
            </span>
          )}
        </Link>
        {stageCount > 0 && (
          <nav aria-label="Stages" className="flex items-center gap-2">
            {prevDay != null ? (
              <Link to={stageHref(prevDay)} className={navButton}>
                ‹ Stage {prevDay}
              </Link>
            ) : (
              <span className={`${navButton} pointer-events-none opacity-40`} aria-hidden>
                ‹ Prev
              </span>
            )}
            {nextDay != null ? (
              <Link to={stageHref(nextDay)} className={navButton}>
                Stage {nextDay} ›
              </Link>
            ) : (
              <span className={`${navButton} pointer-events-none opacity-40`} aria-hidden>
                Next ›
              </span>
            )}
          </nav>
        )}
      </div>

      <header>
        {/*
          El nombre que da la API YA es la cabecera entera: el calendario nombra cada etapa
          `Stage N · etiqueta` («Stage 3 · Hills», «Stage 2 · ITT», «Stage 3 · Summit finish»).
          Anteponerle otro `Stage N` lo decía dos veces —«Stage 3 · Stage 3 · Hills»— y repetir
          debajo el TIPO lo decía una tercera con otras palabras: «Summit finish» arriba y
          «Mountain» abajo, o el «Uphill finish · Hilly» que se vio en producción. La etiqueta del
          calendario es además la MÁS precisa de las dos (distingue el final en alto de la reina que
          baja a meta), así que es la que se queda; el tipo sigue vivo en el dato, que es de donde
          sale el color. Y el `· ITT` suelto sobraba por lo mismo: la etiqueta de una crono ya es ITT.
        */}
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          {data.name || `Stage ${data.day}`}
        </h1>
        <p className="text-sm text-slate-500">
          {/* De dónde a dónde, antes que los kilómetros: la etapa se reconoce por sus ciudades. */}
          <StageRoute from={data.from} to={data.to} className="font-medium text-slate-600" />
          {stageRouteText(data.from, data.to) !== null && ' · '}
          {data.km} km{!data.run ? ' · not raced yet' : ''}
        </p>
        {/* Compartir (§11.10): ver siempre; el acta, solo a quien la conoce o la tiene delante. */}
        {watchOn && run && (
          <div className="mt-2">
            <ShareStage
              raceId={raceId}
              day={data.day}
              report={full !== null || (data.watch?.known ?? true)}
            />
          </div>
        )}
      </header>

      {diagOn && <DiagnosticStrip exitHref={hrefWith(pagePath, params, { diag: null })} />}

      {!settled ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <Tabs
            options={options}
            value={active}
            onChange={setActive}
            label="Stage"
            variant="underline"
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
                  onReport={() => setActive('report')}
                  onFinished={() => setFinishedHere(true)}
                  onReached={(s) => setReachedHere((x) => Math.max(x, s))}
                />
              ) : (
                <p className="text-slate-500">Loading…</p>
              ))}

            {active === 'report' && (
              <>
                {/* Sin `Watch` para esta etapa (§17.19): una crono sin línea, una lápida (D-12). */}
                {watchOn && unavailable && (
                  <p className="text-sm text-slate-500">Broadcast unavailable for this stage</p>
                )}
                {withResult((d) =>
                  watchOn ? (
                    <StageReportView
                      data={d}
                      onWatchAnyway={watchable && seen ? () => setActive('watch') : undefined}
                    />
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
                    <ResultTable rows={d.results} leaders={d.leaders?.onRoad} />
                  </div>
                ) : (
                  <div className={card}>
                    <p className="text-sm text-slate-400">No result for this stage.</p>
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
                    <p className="mt-1 text-sm text-slate-500">
                      This stage was raced before the race radio was recorded, so there is nothing
                      to replay. We don&apos;t rebuild it from scratch: a re-run with today&apos;s
                      engine would tell a different race from the one on the result sheet.
                    </p>
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
                  <p className="text-sm text-slate-400">No profile available for this stage.</p>
                )}
                {!data.run && (
                  <p className="mt-3 text-sm text-slate-500">
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
