/**
 * LO QUE LA PÁGINA DE UNA ETAPA Y LA FICHA DE UNA CARRERA DE UN DÍA COMPARTEN (E2, docs/retransmision.md
 * §6.10, §11.10, §11.16 y §11.17; nació en `StageReplay.tsx` con el 9a y el 9b lo saca aquí): los hechos de
 * la etapa antes de elegir pestaña, el acta a un toque, la cabecera de `Watch` fijada, la radio hasta lo
 * pintado y la tabla de llegada. No importa `StageWatch`, que montan la página de etapa y la ficha de un día
 * (`OneDayRace.tsx`): el acta (`StageReport.tsx`) importa de aquí y no se descarga el reproductor.
 */
import {
  type BroadcastHead,
  type RaceLeaders,
  type StageGate,
  type StageReplay as StageReplayData,
  currentSeason,
} from '@cyclingstar/shared'
import { type UseQueryResult, keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  broadcastHeadKey,
  fetchBroadcastHead,
  fetchStageReport,
  stageReportKey,
} from '../api/broadcast'
import { ApiError, GateError } from '../api/request'
import { type StageResultEntry, fetchCalendarStage, stageReplayKey } from '../api/results'
import { readLocalProgress } from '../api/watch'
import { authClient } from '../auth/client'
import { Flag } from '../components/Flag'
import { RiderJersey } from '../components/Jersey'
import { RiderName } from '../components/RiderName'
import { ShowAllButton, TOP_ROWS } from '../components/ShowAll'
import { StageStory } from '../components/StageStory'
import { formatTime } from '../domain/format'
import { raceTeamLabel } from '../domain/labels'
import { diagOf, useHealth, useHorizonRev, useWatchOn } from '../queryClient'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
const head = 'text-xs font-semibold uppercase tracking-wide text-slate-400'

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
export const RESULT_TABS: ReadonlySet<string> = new Set([
  'report',
  'result',
  'classifications',
  'radio',
])

/** La puerta como texto estable: la cabecera que ve `Watch` solo se cambia si cambia la puerta. */
const gateKey = (g: StageGate | null): string =>
  g === null ? '' : g.k === 'previous_unseen' ? `previous_unseen:${g.firstUnseen}` : g.k

// --------------------------------- lo que la etapa sabe antes de elegir pestaña (9a; compartido en el 9b)

/**
 * LO QUE LA PÁGINA SABE DE UNA ETAPA ANTES DE ELEGIR PESTAÑAS (9a). El 9b lo saca de la página para la
 * ficha de una carrera de un día, que es la de su etapa 1 y lleva desde el 9b `Watch`, `Report` y `Race
 * Radio` con la misma puerta (§11.17): la ficha de la etapa con su `watch`, si `Watch` está encendido para
 * quien mira, la cabecera de la retransmisión y si quien mira lee con `cs_viewer` sin sesión.
 */
export interface StageFacts {
  readonly data: StageReplayData | undefined
  readonly isPending: boolean
  readonly isError: boolean
  /** `?diag=1` en la URL */
  readonly diag: boolean
  /** el modo diagnóstico de verdad: `?diag=1` de un administrador (11-h) */
  readonly diagOn: boolean
  readonly isAdmin: boolean
  readonly watchOn: boolean
  readonly run: boolean
  readonly isOneDay: boolean
  readonly broadcastHead: UseQueryResult<BroadcastHead>
  /** hay `Watch` para esta etapa: la cabecera respondió */
  readonly watchable: boolean
  /** `broadcast_unavailable`: una crono sin línea, una lápida (§17.19) */
  readonly unavailable: boolean
  /** sin `watch` (SPOILER_MODE apagado para quien pide, o el modo diagnóstico), la etapa es la de hoy: vista */
  readonly seen: boolean
  /** ya se sabe qué pestañas lleva: la ficha, el interruptor, quién mira y si hay cabecera */
  readonly settled: boolean
  readonly dataGate: StageGate | null
  /** quien lee con `cs_viewer` sin sesión: el horizonte es el de su cuenta y no puede escribir (§10.8) */
  readonly readingWithCookie: boolean
  /** el día de juego de `/health`, para la clave de la carrera */
  readonly gameDay: number | null | undefined
}

/** Lo que la página de etapa sabe de la ficha para decidir la cabecera (`stageHeadQuery`). */
interface StageCard {
  readonly run: boolean
  readonly race?: { readonly stageCount: number } | null | undefined
}

/**
 * LA CABECERA DE `Watch` (`GET …/broadcast`; E2, paso 10b, los arreglos, §18.5): si la página la quiere (`wants`: con la ficha, la etapa se
 * ha corrido y es de una carrera por etapas, o la pide la ficha de una carrera de un día, que es donde vive
 * su `Watch`, §11.17) y si se pide ya (`fetch`). Mientras la ficha no ha llegado, se pide A LA VEZ que ella
 * si `Watch` está encendido para quien mira: iban una detrás de otra, y eran un viaje entero de la primera
 * pintura. Pedirla antes de saber solo cuesta una petición de más en dos casos raros (una etapa sin correr,
 * que da 404, y la página de etapa de una carrera de un día, que redirige a su ficha, que la reutiliza), y
 * con `Watch` apagado no cambia nada: no se pide, como antes.
 */
export function stageHeadQuery(f: {
  readonly watchOn: boolean
  readonly enabled: boolean
  readonly oneDay: boolean
  readonly data: StageCard | undefined
}): { readonly wants: boolean; readonly fetch: boolean } {
  if (!f.watchOn) return { wants: false, fetch: false }
  const wants =
    f.data !== undefined && f.data.run && (f.oneDay || (f.data.race?.stageCount ?? 0) !== 1)
  return { wants, fetch: wants || (f.enabled && f.data === undefined) }
}

/**
 * `enabled`: pedir ya la ficha (la de una carrera de un día con `Watch` apagado no se pide hasta que se
 * abre una pestaña que la enseña, como hoy). `oneDay`: la cabecera de `Watch` también para una carrera
 * de un día, que la página de etapa no pide porque redirige a la ficha de carrera.
 */
export function useStageFacts(
  raceId: string,
  day: number,
  opts: { readonly enabled?: boolean; readonly oneDay?: boolean } = {},
): StageFacts {
  const [params] = useSearchParams()
  const diag = diagOf(params)
  const rev = useHorizonRev()
  const session = authClient.useSession()
  const enabled = opts.enabled ?? true
  // Con otro `rev` (lo visto en otra pestaña, la meta, el día nuevo) la clave cambia: mientras llega la
  // ficha nueva se queda la de antes, para que la página no vuelva a «Loading…» y `Watch` siga montado.
  const { data, isPending, isError } = useQuery({
    queryKey: stageReplayKey(raceId, day, diag, rev),
    queryFn: () => fetchCalendarStage(raceId, day, { diag }),
    enabled: enabled && rev !== undefined,
    placeholderData: keepPreviousData,
  })
  const health = useHealth()
  const dataGate = data?.watch?.gate ?? null
  // ¿Es un administrador con sesión? Lo que decide `BROADCAST_WATCH=admins` y el modo diagnóstico.
  const sw = useWatchOn(diag || dataGate !== null)
  const run = data?.run === true
  const isOneDay = (data?.race?.stageCount ?? 0) === 1
  // `Watch` de una carrera de un día vive en su ficha de carrera desde el 9b (§11.17); y la cabecera sale a la
  // vez que la ficha, no detrás de ella, si `Watch` está encendido para quien mira (10b, §18.5)
  const headQuery = stageHeadQuery({
    watchOn: sw.watchOn,
    enabled,
    oneDay: opts.oneDay === true,
    data,
  })
  const wantsHead = headQuery.wants
  const broadcastHead = useQuery({
    queryKey: broadcastHeadKey(raceId, day, undefined, diag, rev),
    queryFn: () => fetchBroadcastHead(raceId, day, undefined, { diag }),
    enabled: headQuery.fetch && rev !== undefined,
    placeholderData: keepPreviousData,
  })
  const watchable = wantsHead && broadcastHead.isSuccess
  const unavailable =
    wantsHead &&
    broadcastHead.error instanceof ApiError &&
    broadcastHead.error.code === 'broadcast_unavailable'
  return {
    data,
    isPending,
    isError,
    diag,
    // para quien no es administrador `?diag=1` no existe, en la API (11-h) y aquí
    diagOn: diag && sw.isAdmin,
    isAdmin: sw.isAdmin,
    watchOn: sw.watchOn,
    run,
    isOneDay,
    broadcastHead,
    watchable,
    unavailable,
    seen: data?.watch?.seen ?? true,
    settled:
      data !== undefined &&
      sw.settled &&
      (!diag || sw.adminSettled) &&
      (!wantsHead || !broadcastHead.isPending),
    dataGate,
    readingWithCookie:
      !session.isPending &&
      session.data == null &&
      rev !== undefined &&
      !['anon', 'world', 'unavailable'].includes(rev),
    gameDay: health.data?.gameDay,
  }
}

/** Lo que enseña el resultado de una etapa: el acta entera, de la ficha o de `GET …/report`, o la puerta. */
export interface StageResult {
  readonly full: StageReplayData | null
  readonly gate: StageGate | null
  readonly actaError: boolean
}

/**
 * EL ACTA A UN TOQUE (9a): la ficha la trae si la pantalla la va a enseñar; si no, sin puerta, el acta
 * (`GET …/report`), pedida solo cuando se abre una pestaña que la enseña (`wanted`) (10-e). La puerta: la
 * de la ficha, o el 403 del acta (`GateError`).
 */
export function useStageResult(
  f: StageFacts,
  raceId: string,
  day: number,
  wanted: boolean,
): StageResult {
  const rev = useHorizonRev()
  const served = f.data !== undefined && hasResult(f.data)
  const needsActa = f.settled && f.run && !served && f.dataGate === null && wanted
  const acta = useQuery({
    queryKey: stageReportKey(raceId, day, undefined, f.diag, rev),
    queryFn: () => fetchStageReport(raceId, day, undefined, { diag: f.diag }),
    enabled: needsActa && rev !== undefined,
    placeholderData: keepPreviousData,
  })
  return {
    full: served && f.data !== undefined ? f.data : (acta.data ?? null),
    gate: f.dataGate ?? (acta.error instanceof GateError ? acta.error.gate : null),
    actaError: acta.isError,
  }
}

/**
 * La cabecera que ve `Watch`: la primera, y otra solo si cambia la puerta. Una cabecera nueva por el `rev`
 * (el día nuevo, lo visto en otra pestaña) reiniciaría el reproductor a mitad de etapa.
 */
export function usePinnedHead(head: BroadcastHead | undefined): BroadcastHead | undefined {
  const [watchHead, setWatchHead] = useState<BroadcastHead>()
  if (
    head !== undefined &&
    (watchHead === undefined || gateKey(watchHead.gate) !== gateKey(head.gate))
  )
    setWatchHead(head)
  return watchHead
}

/**
 * LA RACE RADIO DE UNA ETAPA SIN VER (§11.16, 11-i; 11a): en el velo (la puerta `not_seen`) y con línea
 * grabada, la radio hasta lo pintado en lugar de la puerta. Sin línea (el adaptador, una lápida) o en una
 * crono, que no tiene radio, la puerta; con la anterior sin ver, también.
 */
export function paintedRadioWanted(
  gate: StageGate | null,
  watchable: boolean,
  head: BroadcastHead | undefined,
): head is BroadcastHead {
  return (
    gate?.k === 'not_seen' &&
    watchable &&
    head !== undefined &&
    head.source === 'timeline' &&
    !head.stage.timeTrial
  )
}

/**
 * Lo alcanzado para la radio hasta lo pintado: el mayor de lo que dice la cabecera (con sesión) o el
 * `localStorage` (sin ella, 11-p) y lo visto en esta página.
 */
export function paintedReachedOf(
  head: BroadcastHead | undefined,
  day: number,
  reachedHere: number,
): number {
  if (head === undefined) return 0
  return Math.max(
    reachedHere,
    head.view?.reachedS ?? 0,
    head.view === null ? (readLocalProgress(head.stage.raceKey, day) ?? 0) : 0,
  )
}
