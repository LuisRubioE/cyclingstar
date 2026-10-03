import { BROADCAST } from '@cyclingstar/shared'
import type { PlayerPhase, Speed } from '../../domain/broadcast/player'

/** Lo que los mandos leen del reproductor. */
export interface ControlsState {
  readonly phase: PlayerPhase
  readonly speed: Speed
  readonly notice: 'loading' | 'offline' | null
  /** escondidos: en `playing`, tras `controlsHideS` sin tocar (`controlsHidden`, 8-p) */
  readonly hidden: boolean
}

/** `▶` como texto y no como emoji (U+FE0E): algunas fuentes lo pintan en un recuadro de color. */
export const PLAY_GLYPH = '\u25B6\uFE0E'

/** `×½ ×1 ×2 ×4` (pantalla). */
const speedLabel = (x: Speed): string => `×${x === 0.5 ? '½' : x}`

/**
 * LOS MANDOS (docs/retransmision.md §8.5, 8-p y §18.8): pausa, las velocidades y `Commentary`. En el
 * teléfono, la velocidad es un botón que pasa a la siguiente de `×½ ×1 ×2 ×4`; en escritorio, las
 * cuatro. `Loading` (esperando un tramo) y `Connection lost · Retry` van en `role="status"`.
 *
 * Se esconden como en un reproductor de vídeo, a los `controlsHideS` sin tocar mientras la hora avanza:
 * con opacidad, así que siguen en el árbol de accesibilidad, y el foco dentro los enseña. Nacen en el
 * 3c; `Next action`, los saltos, el conmutador de `Highlights` y `Show result` son del 10a (la cola de
 * rótulos que apaga `Next action` llega en el 6a).
 */
export function PlayerControls({
  state,
  commentaryOpen,
  onPlay,
  onPause,
  onSpeed,
  onCommentary,
  onRetry,
}: {
  state: ControlsState
  commentaryOpen: boolean
  onPlay: () => void
  onPause: () => void
  onSpeed: (x: Speed) => void
  onCommentary: () => void
  onRetry: () => void
}) {
  const running = state.phase === 'playing' || state.phase === 'waiting'
  const speeds = BROADCAST.speeds
  const next = speeds[(speeds.indexOf(state.speed) + 1) % speeds.length] ?? 1
  const button =
    'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100'
  return (
    <div
      className={`flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-opacity duration-300 ${
        state.hidden ? 'opacity-0 focus-within:opacity-100' : 'opacity-100'
      }`}
    >
      <button
        type="button"
        className={`${button} w-12 text-base`}
        aria-label={running ? 'Pause' : 'Play'}
        onClick={running ? onPause : onPlay}
      >
        {running ? '❚❚' : PLAY_GLYPH}
      </button>
      <button
        type="button"
        className={`${button} sm:hidden`}
        aria-label={`Speed ${speedLabel(state.speed)}, change to ${speedLabel(next)}`}
        onClick={() => onSpeed(next)}
      >
        {speedLabel(state.speed)}
      </button>
      <span className="hidden items-center gap-0.5 sm:inline-flex" role="group" aria-label="Speed">
        {speeds.map((x) => (
          <button
            key={x}
            type="button"
            aria-pressed={x === state.speed}
            className={`${button} ${x === state.speed ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}`}
            onClick={() => onSpeed(x)}
          >
            {speedLabel(x)}
          </button>
        ))}
      </span>
      <button
        type="button"
        aria-pressed={commentaryOpen}
        className={`${button} ${commentaryOpen ? 'bg-slate-100' : ''}`}
        onClick={onCommentary}
      >
        Commentary
      </button>
      <span className="ml-auto text-xs text-slate-500" role="status">
        {state.notice === 'loading' && 'Loading'}
        {state.notice === 'offline' && (
          <>
            Connection lost ·{' '}
            <button
              type="button"
              className="font-semibold text-brand-cyan underline"
              onClick={onRetry}
            >
              Retry
            </button>
          </>
        )}
      </span>
    </div>
  )
}
