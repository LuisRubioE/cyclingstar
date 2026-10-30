import { BROADCAST } from '@cyclingstar/shared'
import { useState } from 'react'
import type {
  ClockJump,
  PlayerPhase,
  RoadJump,
  Speed,
  ViewMode,
} from '../../domain/broadcast/player'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { FOCUS } from '../ui/styles'

/** Lo que los mandos leen del reproductor. */
export interface ControlsState {
  readonly phase: PlayerPhase
  /** la curva: `Watch`, `Highlights` o el digest, que solo tiene la pausa y `Show results` (§8.1) */
  readonly view: ViewMode
  readonly speed: Speed
  /** `Next action` encendido (§8.5) */
  readonly nextAction: boolean
  /** la cabeza en el último km: `Next action` no se enciende (8-o) */
  readonly lastKm: boolean
  readonly notice: 'loading' | 'offline' | null
  /** escondidos: en `playing`, tras `controlsHideS` sin tocar (`controlsHidden`, 8-p) */
  readonly hidden: boolean
}

/** Un salto de la hoja de `⋯`: de recorrido (§8.5) o de reloj en la crono (9-g), y si lleva a algún sitio. */
export interface JumpOption {
  readonly id: RoadJump | ClockJump
  readonly label: string
  readonly enabled: boolean
}

/** `×½ ×1 ×2 ×4` (pantalla). */
const speedLabel = (x: Speed): string => `×${x === 0.5 ? '½' : x}`

/** Los rótulos de los saltos (pantalla): `−5 km`, `+5 km`, `Next climb`, `Final 20 km`, `Last km`. */
export const ROAD_JUMP_LABEL: Readonly<Record<RoadJump, string>> = {
  back5: `−${BROADCAST.seekStepKm} km`,
  fwd5: `+${BROADCAST.seekStepKm} km`,
  nextClimb: 'Next climb',
  final20: `Final ${BROADCAST.seekFinalKm} km`,
  lastKm: 'Last km',
}

/** Los de la crono (9-g): `−10 min`, `+10 min`, `Last 20 starters`, `Last starter`. */
export const CLOCK_JUMP_LABEL: Readonly<Record<ClockJump, string>> = {
  back10: `−${BROADCAST.ttSeekStepS / 60} min`,
  fwd10: `+${BROADCAST.ttSeekStepS / 60} min`,
  last20: `Last ${BROADCAST.ttSeekLastStarters} starters`,
  lastStarter: 'Last starter',
}

/**
 * Un mando que se conmuta (`aria-pressed`) o un salto de la hoja, que el catálogo no tiene: 44 × 44 como
 * mínimo, como un `Button` (comprobación 5), con los tokens del ámbito oscuro. En el teléfono, más
 * estrechos que un `Button`, para que la fila parta lo menos posible.
 */
const control = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-ui px-2 text-meta font-semibold text-ink transition hover:bg-surface-2 disabled:text-disabled-ink disabled:hover:bg-transparent sm:px-3 ${FOCUS}`
/** El encendido: el de la opción activa de un `Segmented` (§4.3). */
const pressed = 'bg-accent text-on-accent hover:bg-accent-strong'

/**
 * LOS MANDOS (docs/retransmision.md §8.5, 8-o, 8-p y §18.8). En el teléfono, la fila lleva `❚❚`, la
 * velocidad (un botón que pasa a la siguiente de `×½ ×1 ×2 ×4`), `Next action`, `Commentary` y `⋯`, y la
 * hoja de `⋯`, los saltos, el conmutador de modo y `Show result` (8-p); en escritorio, las cuatro
 * velocidades a la vista, y `←` y `→` son `−5 km` y `+5 km` (el hook). En el digest, solo `❚❚` y `Show
 * results` (§8.1). `Loading` (esperando un tramo) y `Connection lost · Retry` van en `role="status"`.
 *
 * Se esconden como en un reproductor de vídeo, a los `controlsHideS` sin tocar mientras la hora avanza:
 * con opacidad, así que siguen en el árbol de accesibilidad; el foco dentro los enseña, y con la hoja
 * abierta no se esconden. Nacen en el 3c; `Next action`, los saltos, el conmutador de `Highlights` y
 * `Show result` son del 10a.
 *
 * Desde el PR 20 (E3, docs/visual.md §14.6; O-18): en el ámbito oscuro; los iconos `pause`, `play` y
 * `more` en lugar de `❚❚`, `▶︎` y `⋯`, que `ui/10` marca; y cada mando de 44 × 44 como mínimo, así que a
 * 360 px la fila parte en dos renglones. Ninguno es `primary`: el de `Watch` es el de la previa o el del
 * cierre, uno por carrera. Dicen si están escondidos en `data-state`.
 */
export function PlayerControls({
  state,
  commentaryOpen,
  jumps,
  canShowResult,
  onPlay,
  onPause,
  onSpeed,
  onNextAction,
  onCommentary,
  onJump,
  onView,
  onShowResult,
  onRetry,
}: {
  state: ControlsState
  commentaryOpen: boolean
  /** los saltos de la hoja, en su orden; vacío en el digest */
  jumps: readonly JumpOption[]
  /** `Show result` (y `Show results` en el digest): con sesión, fuera del modo diagnóstico */
  canShowResult: boolean
  onPlay: () => void
  onPause: () => void
  onSpeed: (x: Speed) => void
  onNextAction: () => void
  onCommentary: () => void
  onJump: (id: JumpOption['id']) => void
  onView: (view: 'watch' | 'highlights') => void
  onShowResult: () => void
  onRetry: () => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const running = state.phase === 'playing' || state.phase === 'waiting'
  const digest = state.view === 'digest'
  const speeds = BROADCAST.speeds
  const next = speeds[(speeds.indexOf(state.speed) + 1) % speeds.length] ?? 1
  // con la hoja abierta no se esconden (8-p)
  const hidden = state.hidden && !sheetOpen
  return (
    <div
      data-surface="dark"
      data-state={hidden ? 'hidden' : 'shown'}
      className={`rounded-ui bg-surface px-2 py-1.5 text-ink transition-opacity duration-300 ${
        hidden ? 'opacity-0 focus-within:opacity-100' : 'opacity-100'
      }`}
    >
      <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
        <Button
          variant="secondary"
          icon={running ? 'pause' : 'play'}
          ariaLabel={running ? 'Pause' : 'Play'}
          onClick={running ? onPause : onPlay}
        />
        {digest ? (
          canShowResult && (
            <Button variant="quiet" onClick={onShowResult}>
              Show results
            </Button>
          )
        ) : (
          <>
            <span className="sm:hidden">
              <Button
                variant="quiet"
                ariaLabel={`Speed ${speedLabel(state.speed)}, change to ${speedLabel(next)}`}
                onClick={() => onSpeed(next)}
              >
                {speedLabel(state.speed)}
              </Button>
            </span>
            <span
              className="hidden items-center gap-0.5 sm:inline-flex"
              role="group"
              aria-label="Speed"
            >
              {speeds.map((x) => (
                <button
                  key={x}
                  type="button"
                  aria-pressed={x === state.speed}
                  className={`${control} ${x === state.speed ? pressed : ''}`}
                  onClick={() => onSpeed(x)}
                >
                  {speedLabel(x)}
                </button>
              ))}
            </span>
            <button
              type="button"
              aria-pressed={state.nextAction}
              disabled={state.lastKm && !state.nextAction}
              className={`${control} ${state.nextAction ? pressed : ''}`}
              onClick={onNextAction}
            >
              Next action
            </button>
            <button
              type="button"
              aria-pressed={commentaryOpen}
              className={`${control} ${commentaryOpen ? pressed : ''}`}
              onClick={onCommentary}
            >
              Commentary
            </button>
            <button
              type="button"
              aria-label="More"
              aria-expanded={sheetOpen}
              aria-controls="player-sheet"
              className={control}
              onClick={() => setSheetOpen((o) => !o)}
            >
              <Icon name="more" />
            </button>
          </>
        )}
        <span className="ml-auto text-caption text-ink-2" role="status">
          {state.notice === 'loading' && 'Loading'}
          {state.notice === 'offline' && (
            <>
              Connection lost ·{' '}
              <Button variant="quiet" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </>
          )}
        </span>
      </div>
      {!digest && sheetOpen && (
        <PlayerSheet
          view={state.view}
          jumps={jumps}
          canShowResult={canShowResult}
          onJump={(id) => {
            setSheetOpen(false)
            onJump(id)
          }}
          onView={onView}
          onShowResult={() => {
            setSheetOpen(false)
            onShowResult()
          }}
        />
      )}
    </div>
  )
}

/**
 * LA HOJA DE `⋯` (8-p): los saltos (de recorrido, o de reloj en la crono), el conmutador de modo
 * (`Watch` / `Highlights`, que cambia la curva y no la hora, §8.1) y `Show result`. Un salto que no lleva
 * a ningún sitio va apagado: `Next climb` sin puertos por delante, `Final 20 km` pasados, cualquiera en el
 * último km (8-j). Se exporta para probarla sin estado.
 */
export function PlayerSheet({
  view,
  jumps,
  canShowResult,
  onJump,
  onView,
  onShowResult,
}: {
  view: ViewMode
  jumps: readonly JumpOption[]
  canShowResult: boolean
  onJump: (id: JumpOption['id']) => void
  onView: (view: 'watch' | 'highlights') => void
  onShowResult: () => void
}) {
  return (
    <div
      id="player-sheet"
      role="group"
      aria-label="More controls"
      className="mt-1.5 space-y-2 border-t border-line pt-2"
    >
      <div className="flex flex-wrap gap-1" role="group" aria-label="Skip">
        {jumps.map((j) => (
          <button
            key={j.id}
            type="button"
            className={`${control} bg-surface-2`}
            disabled={!j.enabled}
            onClick={() => onJump(j.id)}
          >
            {j.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="inline-flex gap-0.5" role="group" aria-label="Mode">
          {(['watch', 'highlights'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              className={`${control} ${view === v ? pressed : ''}`}
              onClick={() => onView(v)}
            >
              {v === 'watch' ? 'Watch' : 'Highlights'}
            </button>
          ))}
        </span>
        {canShowResult && (
          <Button variant="quiet" layout="ml-auto" onClick={onShowResult}>
            Show result
          </Button>
        )}
      </div>
    </div>
  )
}
