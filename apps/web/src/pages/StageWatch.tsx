import {
  BROADCAST,
  type BroadcastChunk,
  type BroadcastFinish,
  type BroadcastHead,
  type Cue,
  type HorizonSummary,
  type Instant,
  type InstantContext,
  type LiveLine,
  type RaceS,
  type TimeTrialInstant,
  type TimelineCore,
  breakHeadline,
  digestPace,
  fromDs,
  instantAt,
  paceAt,
  photoBlocksOf,
  shownGroupsOf,
  timeTrialInstantAt,
  toDs,
  ttDigestScale,
  ttLastKmFromS,
  ttPaceAt,
} from '@cyclingstar/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  broadcastChunkKey,
  fetchBroadcastChunk,
  postBroadcastFinish,
  postBroadcastSeek,
} from '../api/broadcast'
import {
  beaconWatchProgress,
  forgetLocalProgress,
  postWatchProgress,
  readLocalProgress,
  writeLocalProgress,
} from '../api/watch'
import { ClockNotice } from '../components/broadcast/ClockNotice'
import { CueCard, type ShownCueCard } from '../components/broadcast/CueCard'
import { FixedOverlay } from '../components/broadcast/FixedOverlay'
import { GroupBar } from '../components/broadcast/GroupBar'
import {
  CLOCK_JUMP_LABEL,
  type ControlsState,
  type JumpOption,
  PlayerControls,
  ROAD_JUMP_LABEL,
} from '../components/broadcast/PlayerControls'
import { ProfileStrip } from '../components/broadcast/ProfileStrip'
import {
  ArrivalCardView,
  RecapCard,
  StageClosingCards,
  StagePreviewCards,
} from '../components/broadcast/StageCards'
import { TimeTrialBoard, TimeTrialOverlay } from '../components/broadcast/TimeTrialBoard'
import { VoiceTicker } from '../components/broadcast/VoiceTicker'
import { type RevealActions, RevealConfirm } from '../components/StageGate'
import { effectRunner } from '../domain/broadcast/effects'
import {
  type ArrivalCard,
  type RecapView,
  arrivalCardsOf,
  closingCardsOf,
  previewCardsOf,
  previewSeconds,
  recapRowsOf,
} from '../domain/broadcast/montage'
import {
  type ClockJump,
  type CueDeck,
  type CueDeckContext,
  DEFAULT_VIEW,
  type PlayerAction,
  type PlayerContext,
  type PlayerState,
  type RoadJump,
  type ViewMode,
  clockCapS,
  controlsHidden,
  cueDeckInit,
  cueDeckSeat,
  cueDeckStep,
  headAtLine,
  jumpable,
  playerInit,
  playerStep,
  recapOf,
  seekTargetKm,
  ttCandidatesOf,
  ttSeekTargetS,
} from '../domain/broadcast/player'
import {
  type Cursor,
  cueBodyOf,
  cursorsOf,
  isQuietFinal,
  screenKeysOf,
  ttCursorsOf,
} from '../domain/broadcast/screen'
import { servedLineOf, withChunk } from '../domain/broadcast/servedLine'
import { raceRevealQuestion, stageRange } from '../domain/stageGate'
import { GAP_TREND_INIT, type GapTrendVoice, gapTrendStep, unnamedBefore } from '../domain/voice'

/** El modo de `?view=` (§8.1; 10a): `highlights`, `digest` o, con cualquier otra cosa, `Watch` (DD-03). */
export function watchViewOf(param: string | null): ViewMode {
  return param === 'highlights' || param === 'digest' ? param : DEFAULT_VIEW
}

/** El digest de una carrera (§8.8): de qué etapa empezó, la última y el nombre de la carrera. */
export interface DigestRun {
  /** la primera etapa del digest: la de antes de esta sigue en memoria si es del digest (18-e) */
  readonly from: number
  /** la última etapa velada de la carrera: tras ella, el cierre */
  readonly last: number
  readonly raceName: string
}

/**
 * `Watch`, LA RETRANSMISIÓN DE LA ETAPA (docs/retransmision.md §6, §8 y §17.6; paso 3c): la capa fija,
 * el perfil con un cursor por grupo, la barra de grupos con quién va y con qué maillot, la voz a su
 * hora y los mandos, al ritmo de la curva de §8.2. Detrás de `BROADCAST_WATCH` (la página de etapa
 * solo enseña la pestaña si la cabecera responde) y, en el 3c, sobre la radio de hoy con el reloj
 * estimado del adaptador, lo estimado marcado (§3.8).
 *
 * El hook (`useWatchPlayer`) es el de §8.11 y las notas 2 y 3 del 3b: un fotograma por
 * `requestAnimationFrame` con su `dtS`; el instante a `overlayHz` sobre la línea servida
 * (`servedLine.ts`), que pintan todos los componentes; las peticiones de `playerStep`, en orden y cada
 * una tras la respuesta de la anterior (`effects.ts`); y los cuadros, contados por la pantalla. Los
 * informes de lo alcanzado salen desde el 7a: con sesión, `POST /api/me/watch` con `keepalive` y, al
 * salir, `sendBeacon` (14-g); sin ella (el visitante, o quien lee con `cs_viewer`: la cabecera no trae
 * `view`), al `localStorage`, de donde también se reanuda (11-p).
 *
 * Desde el 6a, sobre la línea grabada con el reloj exacto donde la hay: el plano (`CueCard`) con la cola
 * de rótulos del reproductor (`CueDeck`, que el hook avanza en cada fotograma con el instante que pinta,
 * §6.5), y los cursores del perfil y las filas de la barra que siguen al grupo por su sucesor
 * (`cursorsOf` y `screenKeysOf`, D-03).
 *
 * Desde el 6b: el rótulo de corredor entero y los que programa el reproductor (la presentación de la
 * fuga, el cuadro de diferencias, la ficha del puerto; `cueBodyOf`); la voz con la frase de la fuga, la
 * tendencia del hueco y los nombres de una caída en un segundo tiempo, y a quién nombra con
 * `namedRidersOf` (`unnamedBefore`); y la crono (§9): su capa fija y su tablero (`TimeTrialOverlay`,
 * `TimeTrialBoard`) en lugar de la capa y la barra de carretera, un cursor por corredor en ruta, su
 * ritmo (`ttPaceAt`, con su último km desde que lo pisa el último en salir) y sus rótulos. Lo que cuesta
 * se calcula a `overlayHz` o al cambiar el instante, no en cada fotograma (B8).
 *
 * Desde el 9a: la meta invalida `['horizon']` (la regla 3 de §10.9): el `rev` nuevo cambia las claves de
 * la ficha, la cabecera y el acta, que se piden otra vez con la etapa ya vista (sustituye a la
 * invalidación de la ficha del 7b), y la página sabe que la etapa se vio AQUÍ (`onFinished`), no en otro
 * dispositivo. Y el modo diagnóstico del dueño (`diag`, §11.15): los tramos y la meta con `?diag=1`, que
 * la API sirve sin tope y sin escribir, desde la previa y sin informar de lo alcanzado.
 *
 * Desde el 11a, cada informe de lo alcanzado (y el de salir, al cambiar de pestaña) se le dice también a
 * la página (`onReached`): la `Race Radio` de una etapa sin ver llega hasta lo que se ha visto aquí sin
 * esperar a que la cabecera se pida otra vez (11-i).
 *
 * Desde el 10a, el montaje y los modos (§8.1, §8.5 a §8.8): la previa de cuatro cuadros, la llegada (el
 * ganador, los grupos que llegan y el fuera de control) y el cierre de seis (`StageCards.tsx`, con los
 * textos de `montage.ts`); `Highlights` (`summaryPace`, o la curva de 8-m en la crono) y el digest
 * (`digestPace`; la página encadena navegando a la siguiente y lo que se suelta se borra de la caché,
 * 18-e); los saltos de recorrido y de reloj, `−5 km` y `−10 min` sobre la línea en memoria (§8.5, 9-g),
 * con el aterrizaje, `While you skipped` y `Previously` con el reloj quieto (8-i, 8-n) y la cola asentada
 * en el aterrizaje; `Next action`; `Show result` con su confirmación (DD-17); y en escritorio `←` y `→`.
 */
export function StageWatch({
  head,
  raceId,
  day,
  diag = false,
  view = DEFAULT_VIEW,
  digest = null,
  oneDay = false,
  reveal = null,
  onReport,
  onFinished,
  onReached,
  onChain,
}: {
  head: BroadcastHead
  raceId: string
  day: number
  /** el modo diagnóstico de un administrador (§11.15): sin tope, desde la previa y sin informar */
  diag?: boolean
  /** la curva con que se entra (§8.1): `Watch`, `?view=highlights` o el digest (10a) */
  view?: ViewMode
  /** el digest de la carrera (§8.8), con `view: 'digest'` */
  digest?: DigestRun | null
  /** una carrera de un día: la previa sin maillots y el cierre sin general (§8.6) */
  oneDay?: boolean
  /** revelar (`Show result`, §8.5): null sin sesión o sin poder (quien lee con `cs_viewer`) */
  reveal?: RevealActions | null
  /** el acta, la pestaña `Report` de la página (9a) */
  onReport: () => void
  /** la meta respondió: la etapa se vio aquí (la página no la toma por otro dispositivo, D-57) */
  onFinished?: () => void
  /** lo alcanzado que se acaba de informar (11a): hasta ahí llega la radio de una etapa sin ver */
  onReached?: (reachedS: RaceS) => void
  /** el digest pasa a la etapa siguiente (8-c): la página navega a ella */
  onChain?: (nextDay: number) => void
}) {
  const w = useWatchPlayer(head, raceId, day, {
    diag,
    view: digest === null && view === 'digest' ? DEFAULT_VIEW : view,
    digest,
    oneDay,
    onFinished,
    onReached,
    onChain,
    reveal: reveal === null ? null : () => reveal.reveal(digest?.last ?? day),
  })
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [barOpen, setBarOpen] = useState(false)
  const [commentary, setCommentary] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  // a quién nombra la voz: namedRidersOf antes de cada línea, sobre lo servido (una vez por línea)
  const unnamed = useMemo(() => unnamedBefore(w.core, head.cast, w.ctx), [w.core, head.cast, w.ctx])
  // la frase de la fuga en lugar de la línea de breakaway_formed (12-e)
  const present = useMemo(() => {
    const byId = new Map(head.cast.map((c) => [c.id, c] as const))
    return (line: LiveLine): string | null => {
      const cards = line.protagonists.flatMap((p) => {
        const c = p.id == null ? undefined : byId.get(p.id)
        return c === undefined ? [] : [c]
      })
      return cards.length === 0 ? null : breakHeadline('en', cards, w.ctx.own)
    }
  }, [head.cast, w.ctx])
  const closing = useMemo(
    () => (w.finish === null ? [] : closingCardsOf(head, w.finish, { oneDay })),
    [head, w.finish, oneDay],
  )
  const tt = head.stage.timeTrial ? head.tt : null
  const { phase } = w.controls
  // Show result: con sesión, fuera del modo diagnóstico, con la etapa sin conocer y antes de la meta
  // (§8.5); la conocida tiene su acta en `Report`
  const canShowResult =
    reveal !== null && !diag && head.view !== null && !head.view.known && !w.controls.revealed
  const revealDay = digest?.last ?? day
  function askShowResult(): void {
    if (!canShowResult || reveal === null) return
    if (reveal.askFirst) setConfirming(true)
    else w.dispatch({ k: 'showResult' })
  }
  const card = 'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'
  return (
    <div className="space-y-3">
      <ClockNotice clock={head.clock} />
      <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-4 lg:space-y-0">
        <div className="space-y-3">
          {tt !== null && w.tti !== null ? (
            <TimeTrialOverlay tti={w.tti} cast={head.cast} />
          ) : (
            <FixedOverlay
              instant={w.controls.atLine ? { ...w.overlay, toGoKm: 0 } : w.overlay}
              head={head}
              expanded={overlayOpen}
              onToggle={() => setOverlayOpen((o) => !o)}
            />
          )}
          <div className={card}>
            <ProfileStrip
              profile={head.profile}
              lengthKm={head.stage.lengthKm}
              instant={w.bar}
              clock={head.clock}
              reducedMotion={reducedMotion}
              cursors={w.cursors}
            />
          </div>
          {phase === 'preview' && (
            <StagePreviewCards
              cards={w.preview}
              index={w.previewIndex}
              onWatch={() => w.dispatch({ k: 'play' })}
            />
          )}
          {phase === 'closing' && closing.length > 0 && (
            <StageClosingCards
              cards={closing}
              nextHref={(d) => `/world/races/${raceId}/stages/${d}?tab=watch`}
              onReport={onReport}
            />
          )}
          <div className={card}>
            {tt !== null && w.tti !== null ? (
              <TimeTrialBoard tti={w.tti} cast={head.cast} tt={tt} />
            ) : (
              <GroupBar
                instant={w.bar}
                cast={head.cast}
                clock={head.clock}
                expanded={barOpen}
                onExpand={() => setBarOpen(true)}
                keys={w.keys}
              />
            )}
          </div>
        </div>
        <div className="space-y-3">
          {/* El plano (§6.1): la llegada (el plano del ganador de la tele, §8.7), el resumen de un salto,
              el aviso del salto en curso o el rótulo; en el cierre, nada. Tocarlo pausa y enseña los
              mandos («tocar la pantalla» de D-20, 8-p). */}
          {phase === 'arrival' ? (
            w.arrival !== null && <ArrivalCardView card={w.arrival} />
          ) : phase === 'closing' ? null : phase === 'recap' && w.recap !== null ? (
            <RecapCard recap={w.recap} onDone={() => w.dispatch({ k: 'cardDone' })} />
          ) : phase === 'seeking' && w.seeking !== null ? (
            <p className="rounded-2xl bg-slate-900 px-3 py-4 text-sm text-white" role="status">
              {w.seeking}
            </p>
          ) : (
            <div
              onClick={() => {
                if (phase === 'playing' || phase === 'waiting') w.dispatch({ k: 'pause' })
              }}
            >
              <CueCard cue={w.cue} />
            </div>
          )}
          <div className={card}>
            <VoiceTicker
              lines={w.lines}
              t={w.overlay.t}
              open={commentary}
              quiet={tt === null && isQuietFinal(w.overlay.toGoKm)}
              unnamed={unnamed}
              extras={{ present, state: w.trend, namesDelayS: w.namesDelayS }}
            />
          </div>
        </div>
      </div>
      {phase !== 'arrival' && phase !== 'closing' && (
        <PlayerControls
          state={w.controls}
          commentaryOpen={commentary}
          jumps={w.jumps}
          canShowResult={canShowResult}
          onPlay={() => w.dispatch({ k: 'play' })}
          onPause={() => w.dispatch({ k: 'pause' })}
          onSpeed={(x) => w.dispatch({ k: 'speed', x })}
          onNextAction={() => w.dispatch({ k: 'nextAction' })}
          onCommentary={() => setCommentary((c) => !c)}
          onJump={w.jump}
          onView={(v) => w.dispatch({ k: 'view', view: v })}
          onShowResult={askShowResult}
          onRetry={() => w.dispatch({ k: 'retry' })}
        />
      )}
      {confirming && canShowResult && (
        <RevealConfirm
          stageDay={revealDay}
          also={digest === null ? [] : stageRange(day, digest.last - 1)}
          busy={false}
          {...(digest === null ? {} : { question: raceRevealQuestion(digest.raceName) })}
          onConfirm={(dontAsk) => {
            setConfirming(false)
            // `Don't ask again` no puede impedir revelar: si no se guarda, la próxima vez se pregunta
            if (dontAsk) void reveal?.dontAskAgain().catch(() => undefined)
            w.dispatch({ k: 'showResult' })
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

/** ¿Pide el sistema menos movimiento? Los cursores del perfil saltan de km en km (D-57). */
function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true,
  )
  useEffect(() => {
    const m = window.matchMedia?.(query)
    if (m === undefined) return
    const on = () => setReduced(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return reduced
}

// ------------------------------------------------------------------------------------- el hook

/** Lo que la pantalla lee del reproductor: los mandos y si la cabeza está en la línea. */
interface Shown extends ControlsState {
  /** la meta pedida o recibida: la capa fija dice `0 m` (§8.7) */
  readonly atLine: boolean
  /** `Show result` aceptado: ya no se ofrece */
  readonly revealed: boolean
}

/**
 * Lo que pinta la pantalla: el instante a `overlayHz` y a `barHz`, los cursores del perfil y la
 * identidad de las filas (a `barHz`), el rótulo en pantalla, los mandos, la voz y la meta.
 */
interface WatchScreen {
  readonly overlay: Instant
  readonly bar: Instant
  readonly cursors: readonly Cursor[]
  readonly keys: readonly string[]
  readonly cue: ShownCueCard | null
  readonly controls: Shown
  readonly lines: readonly LiveLine[]
  readonly finish: BroadcastFinish | null
  readonly dispatch: (a: PlayerAction) => void
  /** la línea servida, que cambia con cada tramo: la voz decide sobre ella a quién nombra */
  readonly core: TimelineCore
  readonly ctx: InstantContext
  /** la crono: su estado a `overlayHz` (§9.3); null en línea */
  readonly tti: TimeTrialInstant | null
  /** las líneas de la tendencia del hueco (§12.5) */
  readonly trend: GapTrendVoice['lines']
  /** s de carrera entre una caída y sus nombres, al ritmo de ahora (`crashNamesDelayS` de pared) */
  readonly namesDelayS: number
  /** los cuadros de la previa (§8.6) y el que se ve */
  readonly preview: ReturnType<typeof previewCardsOf>
  readonly previewIndex: number
  /** el cuadro de la llegada que se ve (§8.7) */
  readonly arrival: ArrivalCard | null
  /** `While you skipped` o `Previously` (8-i), en `recap` */
  readonly recap: RecapView | null
  /** `Skipping to 20 km to go…`, en `seeking` (§8.5) */
  readonly seeking: string | null
  /** los saltos de la hoja de `⋯`, con si llevan a algún sitio */
  readonly jumps: readonly JumpOption[]
  /** un salto de la hoja o del teclado */
  readonly jump: (id: JumpOption['id']) => void
}

/** Un fotograma de pared nunca avanza más que esto: tras un tirón, el reloj no salta. */
const MAX_FRAME_S = 0.25

const ROAD_JUMPS: readonly RoadJump[] = ['back5', 'fwd5', 'nextClimb', 'final20', 'lastKm']
const CLOCK_JUMPS: readonly ClockJump[] = ['back10', 'fwd10', 'last20', 'lastStarter']

const controlsOf = (s: PlayerState): Shown => ({
  phase: s.phase,
  view: s.view,
  speed: s.speed,
  nextAction: s.nextAction,
  lastKm: s.lastKm,
  notice: s.notice,
  hidden: controlsHidden(s),
  atLine:
    s.phase === 'arrival' ||
    s.phase === 'closing' ||
    (s.phase === 'waiting' && s.atFinish && s.inFlight),
  revealed: s.revealed,
})
const sameControls = (a: Shown, b: Shown): boolean =>
  a.phase === b.phase &&
  a.view === b.view &&
  a.speed === b.speed &&
  a.nextAction === b.nextAction &&
  a.lastKm === b.lastKm &&
  a.notice === b.notice &&
  a.hidden === b.hidden &&
  a.atLine === b.atLine &&
  a.revealed === b.revealed
const sameJumps = (a: readonly JumpOption[], b: readonly JumpOption[]): boolean =>
  a.length === b.length && a.every((j, i) => j.id === b[i]?.id && j.enabled === b[i]?.enabled)

/**
 * La primera hora de lo servido, en décimas de [loDs, hiDs], en que el km pintado de la cabeza llega a
 * `km` (bisección sobre `instantAt`, §8.5); hiDs si no llega.
 */
function firstDsAtKm(
  line: TimelineCore,
  km: number,
  loDs: number,
  hiDs: number,
  ctx: InstantContext,
): number {
  let lo = loDs
  let hi = hiDs
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (instantAt(line, fromDs(mid), ctx).headKm >= km) hi = mid
    else lo = mid + 1
  }
  return lo
}

interface PlayerOptions {
  readonly diag: boolean
  readonly view: ViewMode
  readonly digest: DigestRun | null
  readonly oneDay: boolean
  readonly onFinished: (() => void) | undefined
  readonly onReached: ((reachedS: RaceS) => void) | undefined
  readonly onChain: ((nextDay: number) => void) | undefined
  /** `POST /api/me/reveal` de la etapa (o, en el digest, de la última, que arrastra las demás) */
  readonly reveal: (() => Promise<unknown>) | null
}

/**
 * EL HOOK DEL REPRODUCTOR (§8.11; notas 2 y 3 del 3b). Mientras está montado, un bucle de
 * `requestAnimationFrame` le da al reductor un fotograma con sus km a meta y si la cabeza está en la
 * línea (`headAtLine`), con el instante a `overlayHz` sobre la línea servida; ejecuta sus peticiones en
 * orden con `effectRunner` (un tramo, con `fetchQuery` y su clave, que no caduca ni se reintenta; un
 * 429, a los `retryAfterS`; los informes de lo alcanzado, desde el 7a; la revelación y lo que el digest
 * suelta, desde el 10a); y cuenta los cuadros: la previa, la llegada y los resúmenes. Ocultar la pestaña
 * pausa; un toque, el ratón o una tecla enseñan los mandos, la barra espaciadora pausa y sigue (D-20), y
 * `←` y `→` saltan (8-p).
 *
 * Los saltos (10a): el hacia atrás busca la hora en la línea en memoria y se la da al reductor (`back`); el
 * hacia delante lo lleva el reductor tramo a tramo (`seek`, `seekTime`), y cuando lo servido llega y no
 * queda nada en vuelo, el hook aterriza: la primera décima en que la cabeza pintada llega al km destino (o
 * la hora pedida en la crono), los rótulos de clase ≥ 2 saltados (`recapOf`) y la cola asentada ahí
 * (`cueDeckSeat`), con la fuga que siga delante y el cuadro de diferencias detrás del resumen.
 */
function useWatchPlayer(
  head: BroadcastHead,
  raceId: string,
  day: number,
  opts: PlayerOptions,
): WatchScreen {
  const { diag, view: initialView, digest, oneDay } = opts
  const queryClient = useQueryClient()
  // los avisos a la página y la revelación, sin reiniciar el reproductor cuando la página los cambia
  const finishedRef = useRef(opts.onFinished)
  const reachedRef = useRef(opts.onReached)
  const chainRef = useRef(opts.onChain)
  const revealRef = useRef(opts.reveal)
  useEffect(() => {
    finishedRef.current = opts.onFinished
    reachedRef.current = opts.onReached
    chainRef.current = opts.onChain
    revealRef.current = opts.reveal
  }, [opts.onFinished, opts.onReached, opts.onChain, opts.reveal])
  const digestFrom = digest?.from ?? null
  const digestLast = digest?.last ?? null
  const ctx = useMemo<InstantContext>(
    () => ({
      own: new Set(head.cast.filter((c) => c.own).map((c) => c.ix)),
      start: head.startState,
      photoBlocks: photoBlocksOf(head.stage.lengthKm, head.stage.dx),
    }),
    [head],
  )
  const preview = useMemo(
    () => previewCardsOf(head, { digest: initialView === 'digest', oneDay }),
    [head, initialView, oneDay],
  )
  const first = useMemo(() => instantAt(servedLineOf(head).core, 0, ctx), [head, ctx])
  const firstKeys = useMemo(() => screenKeysOf(servedLineOf(head).core.groups), [head])
  const [overlay, setOverlay] = useState<Instant>(first)
  const [bar, setBar] = useState<Instant>(first)
  const [cursors, setCursors] = useState<readonly Cursor[]>(() =>
    cursorsOf(shownGroupsOf(first), servedLineOf(head).core.groups, firstKeys, []),
  )
  const [keys, setKeys] = useState<readonly string[]>(firstKeys)
  const [cue, setCue] = useState<ShownCueCard | null>(null)
  const [controls, setControls] = useState<Shown>(() =>
    controlsOf(playerInit(initialView, day, null, false).next),
  )
  const [lines, setLines] = useState<readonly LiveLine[]>([])
  const [finish, setFinish] = useState<BroadcastFinish | null>(null)
  const [core, setCore] = useState<TimelineCore>(() => servedLineOf(head).core)
  const timeTrial = head.stage.timeTrial && head.tt !== null
  const [tti, setTti] = useState<TimeTrialInstant | null>(() =>
    timeTrial ? timeTrialInstantAt(servedLineOf(head).core, 0, ctx) : null,
  )
  const [trend, setTrend] = useState<GapTrendVoice['lines']>([])
  const [namesDelayS, setNamesDelayS] = useState(0)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [arrival, setArrival] = useState<ArrivalCard | null>(null)
  const [recap, setRecap] = useState<RecapView | null>(null)
  const [seeking, setSeeking] = useState<string | null>(null)
  const [jumps, setJumps] = useState<readonly JumpOption[]>([])
  const dispatchRef = useRef<(a: PlayerAction) => void>(() => {})
  const jumpRef = useRef<(id: JumpOption['id']) => void>(() => {})

  useEffect(() => {
    const plan = { riders: head.cast.length, intervalS: head.tt?.intervalS ?? 60 }
    // la curva del modo (§8.1, §8.2): en una crono, `ttPaceAt` y, en Highlights y el digest, por la escala
    // de 8-m; en línea, `pace`, `summaryPace` o `digestPace` de su tipo (8-a)
    const ttScale = timeTrial ? ttDigestScale(head.profile, plan) : 1
    const digestZones = digestPace(head.profile, head.stage.kind)
    const pctx: PlayerContext = {
      baseX: timeTrial
        ? (v, t) => ttPaceAt(t, plan, ttLastKmFromS(served.core)) * (v === 'watch' ? 1 : ttScale)
        : (v, _t, toGoKm) =>
            paceAt(
              toGoKm,
              v === 'watch'
                ? BROADCAST.pace
                : v === 'highlights'
                  ? BROADCAST.summaryPace
                  : digestZones,
            ),
      lengthKm: head.stage.lengthKm,
      digestNext: digestLast !== null && day < digestLast ? day + 1 : null,
    }
    let served = servedLineOf(head)
    let instant = instantAt(served.core, 0, ctx)
    let ttNow: TimeTrialInstant | null = timeTrial ? timeTrialInstantAt(served.core, 0, ctx) : null
    let trendState: GapTrendVoice = GAP_TREND_INIT
    let delayShown = -1
    const candidates = ttCandidatesOf(head.cast, ctx.own, head.startState, head.tt)
    let painted = { line: served.core, t: 0 }
    const raceKey = head.stage.raceKey
    // Sin sesión la cabecera no trae `view`, y el progreso no va al servidor: vive en localStorage (11-p).
    const signedIn = head.view !== null
    // En el modo diagnóstico (§11.15) no se reanuda ni se informa: lo visto ahí lo sabe el dueño, no su
    // cuenta, y la etapa empieza en la previa, como una conocida. En el digest, la de antes sigue en
    // memoria si es del digest (18-e).
    const init = playerInit(
      initialView,
      day,
      diag ? null : signedIn ? (head.view?.reachedS ?? null) : readLocalProgress(raceKey, day),
      diag || (head.view?.known ?? false),
      digestFrom !== null && day > digestFrom ? day - 1 : null,
    )
    let s = init.next
    let shown = controlsOf(s)
    let phaseWallS = 0
    let lastPhase = s.phase
    let chained = false
    // la cola de rótulos (§6.5), los cursores por sucesor y la identidad de las filas (D-03)
    let deck: CueDeck = cueDeckInit(head.startState)
    let onScreen = deck.queue.shown
    let cueSeq = 0
    let screenKeys = screenKeysOf(served.core.groups)
    let drawn = cursorsOf(shownGroupsOf(instant), served.core.groups, screenKeys, [])
    // los cuadros (§8.6, §8.7) y los resúmenes (8-i): el de la previa que se ve, los de la llegada, y el
    // de Previously, que espera a que lo servido llegue a lo alcanzado
    let previewShown = 0
    let arrivalCards: readonly ArrivalCard[] = []
    let arrivalShown = -1
    let previouslyPending = s.phase === 'recap'
    let jumpsShown: readonly JumpOption[] = []
    let seekingShown: string | null = null

    const deckCtxOf = (line: TimelineCore): CueDeckContext => ({
      start: head.startState,
      timeTrial: head.stage.timeTrial,
      events: line.events,
      catalog: line.groups,
      cast: head.cast,
      profile: head.profile,
      own: ctx.own,
      view: s.view,
      speed: s.speed,
      tt: head.tt,
    })

    /** Lo que el digest suelta (18-e): los tramos de esa etapa, de la caché. */
    const release = (stageDay: number): void => {
      queryClient.removeQueries({ queryKey: ['broadcast-chunk', raceId, stageDay] })
    }

    /** La cola asentada en un instante (§8.5): tras volver atrás, o en el aterrizaje de un salto. */
    function seat(at: Instant, carry: readonly Cue[], checkNow: boolean): void {
      const tNow = timeTrial ? timeTrialInstantAt(served.core, at.t, ctx) : null
      const r = cueDeckSeat(deck, at, deckCtxOf(served.core), tNow, carry, checkNow)
      deck = r.deck
      for (const a of r.admitted) dispatch(a)
      // la hora salta: la tendencia del hueco empieza otra vez y los cursores, de cero
      trendState = { ...GAP_TREND_INIT, lines: trendState.lines, t: at.t }
      drawn = []
      instant = at
      ttNow = tNow
      painted = { line: served.core, t: at.t }
    }

    function dispatch(a: PlayerAction): void {
      if (chained) return
      const r = playerStep(s, a, pctx)
      s = r.next
      if (s.stageDay !== day) {
        // El digest encadena (8-c): lo que suelta se borra ya, y la etapa siguiente es de la página, que
        // navega a ella; sus peticiones las hará la página nueva (18-e).
        chained = true
        for (const e of r.effects) if (e.k === 'release') release(e.stageDay)
        runner.stop()
        chainRef.current?.(s.stageDay)
        return
      }
      runner.push(r.effects)
      const next = controlsOf(s)
      if (!sameControls(next, shown)) {
        shown = next
        setControls(next)
      }
    }

    /** Un salto de la hoja o del teclado (§8.5, 9-g): hacia atrás, sin red; hacia delante, el reductor. */
    function jump(id: JumpOption['id']): void {
      if (chained || !jumpable(s)) return
      if (timeTrial) {
        const toS = ttSeekTargetS(id as ClockJump, s.t, plan)
        if (toS === null) return
        if (id === 'back10') back(toS)
        else dispatch({ k: 'seekTime', toS })
        return
      }
      const km = seekTargetKm(id as RoadJump, instant.headKm, head.stage.lengthKm, head.profile)
      if (km === null) return
      if (id === 'back5') back(fromDs(firstDsAtKm(served.core, km, 0, toDs(s.t), ctx)))
      else
        dispatch({
          k: 'seek',
          km,
          headKmAtEnd: instantAt(served.core, s.servedS, ctx).headKm,
        })
    }

    /** Volver atrás (§8.5): dentro de lo servido; la cola, vacía y asentada ahí, vuelve a rotular. */
    function back(toS: RaceS): void {
      const before = s.t
      dispatch({ k: 'back', toS })
      if (s.t < before) seat(instantAt(served.core, s.t, ctx), [], false)
    }

    /**
     * EL ATERRIZAJE (§8.5): lo servido llega al destino y nada está en vuelo. La primera décima en que la
     * cabeza pintada llega al km destino (o la hora pedida de la crono), sin pasar del borde de la meta;
     * los rótulos de clase ≥ 2 saltados, para `While you skipped`; y la cola asentada ahí, con la fuga que
     * se formó en lo saltado si sigue delante y el cuadro de diferencias detrás del resumen.
     */
    function land(): void {
      const line = served.core
      const from = instantAt(line, s.t, ctx)
      // en la crono, ninguno pasa del último km del último en salir (9-g): ahí se ve a su ritmo
      const ttLast = timeTrial ? ttLastKmFromS(line) : null
      const capDs = Math.min(
        toDs(clockCapS(s)),
        ttLast === null ? Number.POSITIVE_INFINITY : Math.max(toDs(s.t), toDs(ttLast)),
      )
      const toD =
        s.seekKm !== null
          ? firstDsAtKm(line, s.seekKm, toDs(s.t), capDs, ctx)
          : Math.min(capDs, toDs(s.seekS ?? s.t))
      const to = instantAt(line, fromDs(toD), ctx)
      const skipped = recapOf(from, to, deckCtxOf(line))
      dispatch({ k: 'landed', toS: fromDs(toD), skipped: skipped.count })
      seat(instantAt(line, s.t, ctx), skipped.breakaway === null ? [] : [skipped.breakaway], true)
      const view: RecapView | null =
        skipped.count > 0
          ? {
              title: 'WHILE YOU SKIPPED',
              rows: recapRowsOf(skipped.cues, head, (t) => instantAt(line, t, ctx)),
            }
          : null
      setRecap(view)
    }

    /** Un tramo, o los de un salto juntos: la pantalla los junta a su línea; el reductor recibe su borde. */
    const takeChunk = (c: BroadcastChunk): Extract<PlayerAction, { k: 'chunk' }> => {
      served = withChunk(head, served, c)
      setLines(served.lines)
      setCore(served.core)
      screenKeys = screenKeysOf(served.core.groups)
      setKeys(screenKeys)
      const toS = fromDs(c.toDs)
      return {
        k: 'chunk',
        toS,
        atFinish: c.atFinish,
        headKmAtEnd: instantAt(served.core, toS, ctx).headKm,
      }
    }

    const runner = effectRunner(
      {
        chunk: (fromD, toD) =>
          queryClient.fetchQuery({
            queryKey: broadcastChunkKey(raceId, day, undefined, fromD, toD, diag),
            queryFn: () => fetchBroadcastChunk(raceId, day, fromD, toD, undefined, { diag }),
          }),
        finish: async (mode) => {
          // Con `?diag=1`, la API sirve la meta sin escribir nada (7b): el dueño ve la llegada y el cierre.
          const f = await postBroadcastFinish(raceId, day, mode, undefined, { diag })
          // Con sesión, la meta escribe la letra (14-f) y cambia el `rev` del horizonte: se pide otra vez
          // (la regla 3 de §10.9) y con él la ficha, la cabecera y el acta, ya con la etapa vista. El
          // visitante olvida lo alcanzado y vuelve a la previa (8-l).
          if (!diag) {
            if (signedIn) void queryClient.invalidateQueries({ queryKey: ['horizon'] })
            else forgetLocalProgress(raceKey, day)
          }
          finishedRef.current?.()
          return f
        },
        sleep: (sec) => new Promise((resolve) => window.setTimeout(resolve, sec * 1000)),
        // En el modo diagnóstico nada se informa (§11.15): ni al servidor, ni al localStorage. Lo que se
        // informa se le dice también a la página, para la radio de una etapa sin ver (11a).
        report: diag
          ? async () => undefined
          : signedIn
            ? async (reachedS, mode) => {
                reachedRef.current?.(reachedS)
                const res = await postWatchProgress(raceKey, day, { reachedS, mode })
                // El primer progreso puede seguir la carrera (D-30) y arrastrar con `A` las anteriores
                // (10-a): el `rev` cambia, y con él lo que el mundo enseña (9b). Si es otro, el horizonte
                // se pide otra vez y las claves de las páginas del mundo cambian de una vez (§10.9).
                const known = queryClient.getQueryData<HorizonSummary | null>(['horizon'])
                if (known != null && known.rev !== res.rev)
                  void queryClient.invalidateQueries({ queryKey: ['horizon'] })
                return res
              }
            : async (reachedS) => {
                reachedRef.current?.(reachedS)
                writeLocalProgress(raceKey, day, reachedS)
              },
        beacon: diag
          ? () => undefined
          : signedIn
            ? (reachedS, mode) => {
                reachedRef.current?.(reachedS)
                beaconWatchProgress(raceKey, day, { reachedS, mode })
              }
            : (reachedS) => {
                reachedRef.current?.(reachedS)
                writeLocalProgress(raceKey, day, reachedS)
              },
        // `Show result` (§8.5): la revelación, delante de la meta; si falla, `Connection lost · Retry`
        reveal: async () => {
          const r = revealRef.current
          if (r === null) throw new Error('reveal unavailable')
          return r()
        },
        release,
        // El salto de recorrido en el servidor (8-t, 10b): una petición en lugar de un informe y un tramo por
        // vuelta. Lo que informa el servidor se le dice a la página, como un informe, y su `rev`, igual.
        seek: async (km, fromD) => {
          const res = await postBroadcastSeek(raceId, day, km, fromD, undefined, { diag })
          if (res.written) {
            reachedRef.current?.(res.reachedS)
            const known = queryClient.getQueryData<HorizonSummary | null>(['horizon'])
            if (known != null && known.rev !== res.rev)
              void queryClient.invalidateQueries({ queryKey: ['horizon'] })
          }
          return res
        },
      },
      {
        chunk: takeChunk,
        seek: (res) => ({
          ...takeChunk(res.chunk),
          k: 'seekServed',
          reachedS: res.reachedS,
          written: res.written,
        }),
        finish: (f) => {
          // la llegada (§8.7), con la palabra de cada grupo del último instante pintado
          arrivalCards = arrivalCardsOf(head, f, instant, {
            revealed: s.revealed,
            digest: s.view === 'digest',
            oneDay,
          })
          arrivalShown = -1
          setFinish(f)
        },
        dispatch,
      },
    )
    dispatchRef.current = dispatch
    jumpRef.current = jump
    setControls(shown)
    setFinish(null)
    setLines([])
    setCore(served.core)
    setTrend([])
    setTti(ttNow)
    setCue(null)
    setKeys(screenKeys)
    setCursors(drawn)
    setPreviewIndex(0)
    setArrival(null)
    setRecap(null)
    setSeeking(null)
    runner.push(init.effects)

    let raf = 0
    let last: number | null = null
    let lastOverlay = Number.NEGATIVE_INFINITY
    let lastBar = Number.NEGATIVE_INFINITY
    const frame = (now: number): void => {
      if (chained) return
      const dtS = last === null ? 0 : Math.min(MAX_FRAME_S, Math.max(0, (now - last) / 1000))
      last = now
      // El aterrizaje de un salto: lo servido llegó al destino y no queda nada en vuelo (§8.5).
      if (s.phase === 'seeking' && !s.inFlight) {
        land()
        lastOverlay = Number.NEGATIVE_INFINITY
        lastBar = Number.NEGATIVE_INFINITY
      }
      // Previously (8-l, 8-i): cuando lo servido llega a lo alcanzado, el resumen de lo de antes, y la
      // cola asentada en la hora de la carrera con la fuga que va delante (su lista no se ha pintado en
      // esta reproducción) y el cuadro de diferencias, que salen al acabar el resumen: con el reloj
      // quieto, la cola no corre.
      if (previouslyPending && s.phase !== 'recap') previouslyPending = false
      if (previouslyPending && (s.servedS >= s.reachedS || s.atFinish)) {
        previouslyPending = false
        const line = served.core
        const before = recapOf(
          instantAt(line, 0, ctx),
          instantAt(line, s.reachedS, ctx),
          deckCtxOf(line),
        )
        seat(instantAt(line, s.t, ctx), before.breakaway === null ? [] : [before.breakaway], true)
        phaseWallS = 0
        // nada que contar: la carrera sigue
        if (before.count === 0) dispatch({ k: 'cardDone' })
        else
          setRecap({
            title: 'PREVIOUSLY',
            rows: recapRowsOf(before.cues, head, (t) => instantAt(line, t, ctx)),
          })
      }
      // el instante, a overlayHz, sobre la línea servida: solo si cambió la hora o la línea
      if (now - lastOverlay >= 1000 / BROADCAST.overlayHz) {
        lastOverlay = now
        if (painted.line !== served.core || painted.t !== s.t) {
          instant = instantAt(served.core, s.t, ctx)
          if (timeTrial) {
            ttNow = timeTrialInstantAt(served.core, s.t, ctx)
            setTti(ttNow)
          } else {
            const nextTrend = gapTrendStep(trendState, instant)
            if (nextTrend.lines !== trendState.lines) setTrend(nextTrend.lines)
            trendState = nextTrend
          }
          painted = { line: served.core, t: s.t }
        } else if (timeTrial) setTti(ttNow)
        setOverlay(instant)
        // los nombres de una caída, crashNamesDelayS de pared después, en s de carrera al ritmo de ahora
        const x = pctx.baseX(s.view, s.t, instant.toGoKm) * s.speed
        const delay = Math.round(BROADCAST.crashNamesDelayS * (Number.isFinite(x) ? x : 1))
        if (delay !== delayShown) {
          delayShown = delay
          setNamesDelayS(delay)
        }
        // los saltos que llevan a algún sitio (8-j, 9-g), y el aviso del salto en curso
        const canJump = jumpable(s)
        const ttLast = timeTrial ? ttLastKmFromS(served.core) : null
        const nextJumps: JumpOption[] = timeTrial
          ? CLOCK_JUMPS.map((id) => ({
              id,
              label: CLOCK_JUMP_LABEL[id],
              enabled:
                canJump &&
                (id === 'back10' ? s.phase !== 'preview' : ttLast === null || s.t < ttLast) &&
                ttSeekTargetS(id, s.t, plan) !== null,
            }))
          : ROAD_JUMPS.map((id) => ({
              id,
              label: ROAD_JUMP_LABEL[id],
              enabled:
                canJump &&
                (id === 'back5' ? s.phase !== 'preview' : !s.lastKm) &&
                seekTargetKm(id, instant.headKm, head.stage.lengthKm, head.profile) !== null,
            }))
        if (!sameJumps(nextJumps, jumpsShown)) {
          jumpsShown = nextJumps
          setJumps(nextJumps)
        }
        const label =
          s.phase !== 'seeking'
            ? null
            : s.seekKm !== null
              ? `Skipping to ${Math.max(1, Math.round(head.stage.lengthKm - s.seekKm))} km to go…`
              : 'Skipping ahead…'
        if (label !== seekingShown) {
          seekingShown = label
          setSeeking(label)
        }
      }
      if (now - lastBar >= 1000 / BROADCAST.barHz) {
        lastBar = now
        drawn =
          ttNow !== null
            ? ttCursorsOf(ttNow, head.cast, candidates)
            : cursorsOf(shownGroupsOf(instant), served.core.groups, screenKeys, drawn)
        setBar(instant)
        setCursors(drawn)
      }
      // La cola de rótulos (§6.5): los de este instante, admitidos con su clase; lo admitido, al
      // reductor (solo apaga Next action); y el que está en pantalla, con su texto fijado al salir.
      const step = cueDeckStep(
        deck,
        instant,
        dtS,
        s.phase === 'playing',
        deckCtxOf(served.core),
        ttNow,
      )
      deck = step.deck
      for (const a of step.admitted) dispatch(a)
      if (deck.queue.shown !== onScreen) {
        onScreen = deck.queue.shown
        cueSeq += 1
        if (onScreen === null) setCue(null)
        else {
          const { text, ...body } = cueBodyOf(onScreen.cue, {
            cast: head.cast,
            instant,
            profile: head.profile,
            own: ctx.own,
            tt: head.tt,
            tti: ttNow,
          })
          setCue({ text, cls: onScreen.cls, seq: cueSeq, body })
        }
      }
      dispatch({
        k: 'frame',
        dtS,
        toGoKm: instant.toGoKm,
        atLine: headAtLine(instant, served.core),
      })
      if (chained) return
      // los cuadros que cuenta la pantalla: la previa, la llegada y los resúmenes
      if (s.phase !== lastPhase) {
        if (lastPhase === 'recap') setRecap(null)
        lastPhase = s.phase
        phaseWallS = 0
      } else phaseWallS += dtS
      if (s.phase === 'preview') {
        const i = Math.min(preview.length - 1, Math.floor(phaseWallS / BROADCAST.previewCardS))
        if (i !== previewShown) {
          previewShown = i
          setPreviewIndex(i)
        }
        if (phaseWallS >= previewSeconds(preview)) dispatch({ k: 'cardDone' })
      }
      if (s.phase === 'recap' && !previouslyPending && phaseWallS >= BROADCAST.cueHoldS[3])
        dispatch({ k: 'cardDone' })
      if (s.phase === 'arrival') {
        let acc = 0
        let i = 0
        while (i < arrivalCards.length && phaseWallS >= acc + arrivalCards[i]!.holdS) {
          acc += arrivalCards[i]!.holdS
          i++
        }
        if (i >= arrivalCards.length) dispatch({ k: 'cardDone' })
        else if (i !== arrivalShown) {
          arrivalShown = i
          setArrival(arrivalCards[i] ?? null)
        }
      }
      if (!chained) raf = window.requestAnimationFrame(frame)
    }
    raf = window.requestAnimationFrame(frame)

    const onVisibility = (): void => {
      if (document.hidden) dispatch({ k: 'hidden' })
    }
    const onLeave = (): void => dispatch({ k: 'leave' })
    const onTouch = (): void => dispatch({ k: 'touch' })
    const onKey = (e: KeyboardEvent): void => {
      dispatch({ k: 'touch' })
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('button, a, input, textarea, select, [role="tab"]')) return
      if (e.key === ' ') {
        e.preventDefault()
        dispatch({ k: s.phase === 'playing' || s.phase === 'waiting' ? 'pause' : 'play' })
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // en escritorio, `←` y `→` son `−5 km` y `+5 km`; en la crono, `−10 min` y `+10 min` (8-p)
        if (s.view === 'digest') return
        e.preventDefault()
        const backward = e.key === 'ArrowLeft'
        jump(timeTrial ? (backward ? 'back10' : 'fwd10') : backward ? 'back5' : 'fwd5')
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('pointermove', onTouch)
    window.addEventListener('pointerdown', onTouch)
    window.addEventListener('keydown', onKey)
    return () => {
      window.cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onLeave)
      window.removeEventListener('pointermove', onTouch)
      window.removeEventListener('pointerdown', onTouch)
      window.removeEventListener('keydown', onKey)
      dispatch({ k: 'leave' })
      runner.stop()
      dispatchRef.current = () => {}
      jumpRef.current = () => {}
    }
  }, [
    head,
    raceId,
    day,
    ctx,
    queryClient,
    timeTrial,
    diag,
    initialView,
    digestFrom,
    digestLast,
    oneDay,
    preview,
  ])

  return {
    overlay,
    bar,
    cursors,
    keys,
    cue,
    controls,
    lines,
    finish,
    dispatch: (a) => dispatchRef.current(a),
    core,
    ctx,
    tti,
    trend,
    namesDelayS,
    preview,
    previewIndex,
    arrival,
    recap,
    seeking,
    jumps,
    jump: (id) => jumpRef.current(id),
  }
}
