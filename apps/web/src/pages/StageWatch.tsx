import {
  BROADCAST,
  type BroadcastFinish,
  type BroadcastHead,
  type Instant,
  type InstantContext,
  type LiveLine,
  fromDs,
  instantAt,
  paceAt,
  photoBlocksOf,
} from '@cyclingstar/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { broadcastChunkKey, fetchBroadcastChunk, postBroadcastFinish } from '../api/broadcast'
import {
  beaconWatchProgress,
  forgetLocalProgress,
  postWatchProgress,
  readLocalProgress,
  writeLocalProgress,
} from '../api/watch'
import { ClockNotice } from '../components/broadcast/ClockNotice'
import { FixedOverlay } from '../components/broadcast/FixedOverlay'
import { GroupBar } from '../components/broadcast/GroupBar'
import {
  type ControlsState,
  PLAY_GLYPH,
  PlayerControls,
} from '../components/broadcast/PlayerControls'
import { ProfileStrip } from '../components/broadcast/ProfileStrip'
import { VoiceTicker } from '../components/broadcast/VoiceTicker'
import { effectRunner } from '../domain/broadcast/effects'
import {
  DEFAULT_VIEW,
  type PlayerAction,
  type PlayerContext,
  type PlayerState,
  controlsHidden,
  headAtLine,
  playerInit,
  playerStep,
} from '../domain/broadcast/player'
import { clockText, isQuietFinal, unnamedFor } from '../domain/broadcast/screen'
import { servedLineOf, withChunk } from '../domain/broadcast/servedLine'
import { formatTime } from '../domain/format'

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
 * una tras la respuesta de la anterior (`effects.ts`); y los cuadros, contados por la pantalla. Lo que
 * se aparta, por ser del 3c: la previa no tiene cuadros (son del 10a), así que espera a `▶`; la
 * llegada es solo el ganador, `finishFreezeS`, y el cierre, el resultado y el acta a un toque, los dos
 * provisionales hasta los cuadros del 10a. Los informes de lo alcanzado salen desde el 7a: con sesión,
 * `POST /api/me/watch` con `keepalive` y, al salir, `sendBeacon` (14-g); sin ella (el visitante, o quien
 * lee con `cs_viewer`: la cabecera no trae `view`), al `localStorage`, de donde también se reanuda (11-p).
 */
export function StageWatch({
  head,
  raceId,
  day,
  onReport,
}: {
  head: BroadcastHead
  raceId: string
  day: number
  /** el acta, la pestaña `Story` de la página (`Report` desde el 9a) */
  onReport: () => void
}) {
  const w = useWatchPlayer(head, raceId, day)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [barOpen, setBarOpen] = useState(false)
  const [commentary, setCommentary] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const unnamed = useMemo(() => unnamedFor(head.cast, head.startState), [head])
  const { phase } = w.controls
  const card = 'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'
  return (
    <div className="space-y-3">
      <ClockNotice clock={head.clock} />
      <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-4 lg:space-y-0">
        <div className="space-y-3">
          <FixedOverlay
            instant={w.controls.atLine ? { ...w.overlay, toGoKm: 0 } : w.overlay}
            head={head}
            expanded={overlayOpen}
            onToggle={() => setOverlayOpen((o) => !o)}
          />
          <div className={card}>
            <ProfileStrip
              profile={head.profile}
              lengthKm={head.stage.lengthKm}
              instant={w.bar}
              clock={head.clock}
              reducedMotion={reducedMotion}
            />
          </div>
          {phase === 'preview' && (
            <PreviewCard head={head} onPlay={() => w.dispatch({ k: 'play' })} />
          )}
          {phase === 'arrival' && w.finish !== null && <WinnerCard head={head} finish={w.finish} />}
          {phase === 'closing' && w.finish !== null && (
            <ClosingCard head={head} finish={w.finish} raceId={raceId} onReport={onReport} />
          )}
          <div className={card}>
            <GroupBar
              instant={w.bar}
              cast={head.cast}
              clock={head.clock}
              expanded={barOpen}
              onExpand={() => setBarOpen(true)}
            />
          </div>
        </div>
        <div className={card}>
          <VoiceTicker
            lines={w.lines}
            t={w.overlay.t}
            open={commentary}
            quiet={isQuietFinal(w.overlay.toGoKm)}
            unnamed={unnamed}
          />
        </div>
      </div>
      {phase !== 'arrival' && phase !== 'closing' && (
        <PlayerControls
          state={w.controls}
          commentaryOpen={commentary}
          onPlay={() => w.dispatch({ k: 'play' })}
          onPause={() => w.dispatch({ k: 'pause' })}
          onSpeed={(x) => w.dispatch({ k: 'speed', x })}
          onCommentary={() => setCommentary((c) => !c)}
          onRetry={() => w.dispatch({ k: 'retry' })}
        />
      )}
    </div>
  )
}

/** Antes de la salida: la etapa, lo que dura a ×1 y `▶`. Provisional: los cuatro cuadros de la previa son del 10a. */
function PreviewCard({ head, onPlay }: { head: BroadcastHead; onPlay: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide">
          {head.stage.name} · {head.stage.km} km
        </p>
        <p className="text-xs text-white/70">
          About {Math.max(1, Math.round(head.estimateS / 60))} min
        </p>
      </div>
      <button
        type="button"
        onClick={onPlay}
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        aria-label="Play"
      >
        {PLAY_GLYPH} Watch
      </button>
    </div>
  )
}

/** El ganador, en la línea (§8.7, paso 3). Provisional hasta los rótulos de llegada del 6a y el 10a. */
function WinnerCard({ head, finish }: { head: BroadcastHead; finish: BroadcastFinish }) {
  const winner = finish.result.find((r) => !r.dnf && r.puesto === 1)
  if (winner === undefined) return null
  const bib = head.cast.find((c) => c.id === winner.riderId)?.bib
  return (
    <div className="rounded-2xl bg-slate-900 p-4 text-white" role="status">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Stage winner</p>
      <p className="text-lg font-bold">
        {bib != null ? `${bib} ` : ''}
        {winner.name}
        {winner.teamName ? ` · ${winner.teamName}` : ''} · {formatTime(winner.tiempoS)}
      </p>
    </div>
  )
}

/**
 * El cierre (§8.6): el resultado de la etapa, los `closingResultTop` primeros y los corredores del
 * espectador, el acta a un toque y la etapa siguiente. Provisional: los cuadros del cierre son del 10a.
 */
function ClosingCard({
  head,
  finish,
  raceId,
  onReport,
}: {
  head: BroadcastHead
  finish: BroadcastFinish
  raceId: string
  onReport: () => void
}) {
  const own = new Set(head.cast.filter((c) => c.own).map((c) => c.id))
  const finished = finish.result.filter((r) => !r.dnf)
  const winnerS = finished[0]?.tiempoS ?? 0
  const rows = finished.filter((r, i) => i < BROADCAST.closingResultTop || own.has(r.riderId))
  const next = finish.closing.tomorrow
  const bibOf = new Map(head.cast.map((c) => [c.id, c.bib] as const))
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Stage {head.stage.day} · Result
      </h2>
      <ol className="mt-2 space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.riderId} className="flex gap-2">
            <span className="w-6 shrink-0 text-right tabular-nums text-slate-400">{r.puesto}</span>
            <span className="min-w-0 flex-1 truncate text-slate-700">
              {bibOf.get(r.riderId) ?? ''} {r.name}
              {own.has(r.riderId) ? ' (your rider)' : ''}
              <span className="ml-2 text-xs text-slate-400">{r.teamName ?? ''}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {r.puesto === 1 ? formatTime(r.tiempoS) : `+${clockText(r.tiempoS - winnerS)}`}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={onReport}
          className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white"
        >
          Report
        </button>
        {next !== null && (
          <Link
            to={`/world/races/${raceId}/stages/${next.stageDay}?tab=watch`}
            className="text-slate-600 underline"
          >
            Next: Stage {next.stageDay} · {next.km} km · {next.label}
          </Link>
        )}
      </div>
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
}

/** Lo que pinta la pantalla: el instante a `overlayHz` y a `barHz`, los mandos, la voz y la meta. */
interface WatchScreen {
  readonly overlay: Instant
  readonly bar: Instant
  readonly controls: Shown
  readonly lines: readonly LiveLine[]
  readonly finish: BroadcastFinish | null
  readonly dispatch: (a: PlayerAction) => void
}

/** Un fotograma de pared nunca avanza más que esto: tras un tirón, el reloj no salta. */
const MAX_FRAME_S = 0.25

const controlsOf = (s: PlayerState): Shown => ({
  phase: s.phase,
  speed: s.speed,
  notice: s.notice,
  hidden: controlsHidden(s),
  atLine:
    s.phase === 'arrival' ||
    s.phase === 'closing' ||
    (s.phase === 'waiting' && s.atFinish && s.inFlight),
})
const sameControls = (a: Shown, b: Shown): boolean =>
  a.phase === b.phase &&
  a.speed === b.speed &&
  a.notice === b.notice &&
  a.hidden === b.hidden &&
  a.atLine === b.atLine

/**
 * EL HOOK DEL REPRODUCTOR (§8.11; notas 2 y 3 del 3b). Mientras está montado, un bucle de
 * `requestAnimationFrame` le da al reductor un fotograma con sus km a meta y si la cabeza está en la
 * línea (`headAtLine`), con el instante a `overlayHz` sobre la línea servida; ejecuta sus peticiones en
 * orden con `effectRunner` (un tramo, con `fetchQuery` y su clave, que no caduca ni se reintenta; un
 * 429, a los `retryAfterS`; los informes de lo alcanzado, desde el 7a); y cuenta los cuadros: la
 * llegada, `finishFreezeS`, y `Previously`, `cueHoldS[3]`. Ocultar la pestaña pausa; un toque, el ratón
 * o una tecla enseñan los mandos, y la barra espaciadora pausa y sigue (D-20).
 */
function useWatchPlayer(head: BroadcastHead, raceId: string, day: number): WatchScreen {
  const queryClient = useQueryClient()
  const ctx = useMemo<InstantContext>(
    () => ({
      own: new Set(head.cast.filter((c) => c.own).map((c) => c.ix)),
      start: head.startState,
      photoBlocks: photoBlocksOf(head.stage.lengthKm, head.stage.dx),
    }),
    [head],
  )
  const first = useMemo(() => instantAt(servedLineOf(head).core, 0, ctx), [head, ctx])
  const [overlay, setOverlay] = useState<Instant>(first)
  const [bar, setBar] = useState<Instant>(first)
  const [controls, setControls] = useState<Shown>(() =>
    controlsOf(playerInit(DEFAULT_VIEW, day, null, false).next),
  )
  const [lines, setLines] = useState<readonly LiveLine[]>([])
  const [finish, setFinish] = useState<BroadcastFinish | null>(null)
  const dispatchRef = useRef<(a: PlayerAction) => void>(() => {})

  useEffect(() => {
    const pctx: PlayerContext = {
      baseX: (view, _t, toGoKm) =>
        paceAt(toGoKm, view === 'highlights' ? BROADCAST.summaryPace : BROADCAST.pace),
      lengthKm: head.stage.lengthKm,
      digestNext: null,
    }
    let served = servedLineOf(head)
    let instant = instantAt(served.core, 0, ctx)
    let painted = { line: served.core, t: 0 }
    const raceKey = head.stage.raceKey
    // Sin sesión la cabecera no trae `view`, y el progreso no va al servidor: vive en localStorage (11-p).
    const signedIn = head.view !== null
    const init = playerInit(
      DEFAULT_VIEW,
      day,
      signedIn ? (head.view?.reachedS ?? null) : readLocalProgress(raceKey, day),
      head.view?.known ?? false,
    )
    let s = init.next
    let shown = controlsOf(s)
    let phaseWallS = 0
    let lastPhase = s.phase

    function dispatch(a: PlayerAction): void {
      const r = playerStep(s, a, pctx)
      s = r.next
      runner.push(r.effects)
      const next = controlsOf(s)
      if (!sameControls(next, shown)) {
        shown = next
        setControls(next)
      }
    }

    const runner = effectRunner(
      {
        chunk: (fromD, toD) =>
          queryClient.fetchQuery({
            queryKey: broadcastChunkKey(raceId, day, undefined, fromD, toD),
            queryFn: () => fetchBroadcastChunk(raceId, day, fromD, toD),
          }),
        finish: async (mode) => {
          const f = await postBroadcastFinish(raceId, day, mode)
          // con sesión, la meta escribe la letra (14-f); el visitante olvida lo alcanzado y vuelve a la previa (8-l)
          if (!signedIn) forgetLocalProgress(raceKey, day)
          return f
        },
        sleep: (sec) => new Promise((resolve) => window.setTimeout(resolve, sec * 1000)),
        report: signedIn
          ? (reachedS, mode) => postWatchProgress(raceKey, day, { reachedS, mode })
          : async (reachedS) => writeLocalProgress(raceKey, day, reachedS),
        beacon: signedIn
          ? (reachedS, mode) => beaconWatchProgress(raceKey, day, { reachedS, mode })
          : (reachedS) => writeLocalProgress(raceKey, day, reachedS),
      },
      {
        chunk: (c) => {
          served = withChunk(head, served, c)
          setLines(served.lines)
          const toS = fromDs(c.toDs)
          return {
            k: 'chunk',
            toS,
            atFinish: c.atFinish,
            headKmAtEnd: instantAt(served.core, toS, ctx).headKm,
          }
        },
        finish: (f) => setFinish(f),
        dispatch,
      },
    )
    dispatchRef.current = dispatch
    setControls(shown)
    setFinish(null)
    setLines([])
    runner.push(init.effects)

    let raf = 0
    let last: number | null = null
    let lastOverlay = Number.NEGATIVE_INFINITY
    let lastBar = Number.NEGATIVE_INFINITY
    const frame = (now: number): void => {
      const dtS = last === null ? 0 : Math.min(MAX_FRAME_S, Math.max(0, (now - last) / 1000))
      last = now
      // el instante, a overlayHz, sobre la línea servida: solo si cambió la hora o la línea
      if (now - lastOverlay >= 1000 / BROADCAST.overlayHz) {
        lastOverlay = now
        if (painted.line !== served.core || painted.t !== s.t) {
          instant = instantAt(served.core, s.t, ctx)
          painted = { line: served.core, t: s.t }
        }
        setOverlay(instant)
      }
      if (now - lastBar >= 1000 / BROADCAST.barHz) {
        lastBar = now
        setBar(instant)
      }
      dispatch({
        k: 'frame',
        dtS,
        toGoKm: instant.toGoKm,
        atLine: headAtLine(instant, served.core),
      })
      // los cuadros que cuenta la pantalla: la llegada y Previously
      if (s.phase !== lastPhase) {
        lastPhase = s.phase
        phaseWallS = 0
      } else phaseWallS += dtS
      if (s.phase === 'arrival' && phaseWallS >= BROADCAST.finishFreezeS)
        dispatch({ k: 'cardDone' })
      if (s.phase === 'recap' && phaseWallS >= BROADCAST.cueHoldS[3]) dispatch({ k: 'cardDone' })
      raf = window.requestAnimationFrame(frame)
    }
    raf = window.requestAnimationFrame(frame)

    const onVisibility = (): void => {
      if (document.hidden) dispatch({ k: 'hidden' })
    }
    const onLeave = (): void => dispatch({ k: 'leave' })
    const onTouch = (): void => dispatch({ k: 'touch' })
    const onKey = (e: KeyboardEvent): void => {
      dispatch({ k: 'touch' })
      if (e.key !== ' ' || e.repeat) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('button, a, input, textarea, select, [role="tab"]')) return
      e.preventDefault()
      dispatch({ k: s.phase === 'playing' || s.phase === 'waiting' ? 'pause' : 'play' })
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
    }
  }, [head, raceId, day, ctx, queryClient])

  return {
    overlay,
    bar,
    controls,
    lines,
    finish,
    dispatch: (a) => dispatchRef.current(a),
  }
}
