import { BROADCAST } from '@cyclingstar/shared'
import { type ReactNode, useState } from 'react'
import type {
  ClockJump,
  JumpWhy,
  PlayerPhase,
  RoadJump,
  Speed,
  ViewMode,
} from '../../domain/broadcast/player'
import { Button } from '../ui/Button'

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
  /** apagado, por qué (`jumpWhy`, revisión del 21n); sin él, `Nothing to skip to from here.` */
  readonly why?: JumpWhy
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
 * Los mandos, `Button` del catálogo (E3, PR 21n): los que se conmutan, con `pressed`; `More`, con `expanded`; y
 * los apagados, con su porqué solo para el lector (`reasonHidden`), porque E2 fija la fila en un renglón y
 * escrito debajo la partiría. Antes eran botones propios, porque `Button` no llevaba nada de eso (PR 20).
 */
const EN_EL_ULTIMO_KM = 'Already in the last kilometre.'
const SIN_SALTO = 'Nothing to skip to from here.'
/** El porqué de un salto apagado, por su causa (revisión del 21n): antes, siempre el de `none`. */
const POR_QUE_SALTO: Readonly<Record<JumpWhy, string>> = {
  busy: 'Already skipping.',
  notYet: 'Nothing to go back to yet.',
  lastKm: EN_EL_ULTIMO_KM,
  none: SIN_SALTO,
}

/**
 * LOS MANDOS (docs/retransmision.md §8.5, 8-o, 8-p y §18.8). En el teléfono, la fila lleva `❚❚`, la
 * velocidad (un botón que pasa a la siguiente de `×½ ×1 ×2 ×4`), `Next action` y `⋯`, y la
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
 * 360 px la fila partía en dos renglones (hasta W2a; sin `Commentary`, cabe en uno a 320, 360 y 390).
 * Ninguno es `primary`: el de `Watch` es el de la previa o el del cierre, uno por carrera. Dicen si están
 * escondidos en `data-state`.
 *
 * Desde W2a (la revisión de `Watch` del dueño, su punto 7), sin `Commentary`: va bajo la línea de la voz
 * (`VoiceTicker`), porque aquí se escondía a los 3 s con los demás y el dueño no veía «lo de atrás».
 *
 * Desde W3 (su punto 6), bajo la fila, la barra de progreso en km (`KmBar`, §8.5), que se esconde con los
 * mandos (8-p); nunca en el digest, cuyos mandos son la pausa y `Show results`, ni en la crono, cuya barra
 * tiene dos tramos (§9.4) y todavía no está. En el cierre de la meta vista, la fila deja su sitio a
 * `Watch again from any km` y la barra sigue en el suyo: es el mismo elemento, así que quien vuelve atrás
 * con el teclado no pierde el foco.
 */
export function PlayerControls({
  state,
  jumps,
  canShowResult,
  bar = null,
  closingCaptionId,
  onPlay,
  onPause,
  onSpeed,
  onNextAction,
  onJump,
  onView,
  onShowResult,
  onRetry,
}: {
  state: ControlsState
  /** los saltos de la hoja, en su orden; vacío en el digest */
  jumps: readonly JumpOption[]
  /** `Show result` (y `Show results` en el digest): con sesión, fuera del modo diagnóstico */
  canShowResult: boolean
  /** la barra de progreso en km, bajo la fila (W3); null en la crono */
  bar?: ReactNode
  /** el id de la leyenda del cierre, que la barra nombra en su `aria-describedby` */
  closingCaptionId?: string
  onPlay: () => void
  onPause: () => void
  onSpeed: (x: Speed) => void
  onNextAction: () => void
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
      {state.phase === 'closing' ? (
        <p id={closingCaptionId} className="px-1 text-caption text-ink-2">
          Watch again from any km
        </p>
      ) : (
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
                  <Button
                    key={x}
                    variant="control"
                    pressed={x === state.speed}
                    onClick={() => onSpeed(x)}
                  >
                    {speedLabel(x)}
                  </Button>
                ))}
              </span>
              <Button
                variant="control"
                pressed={state.nextAction}
                {...(state.lastKm && !state.nextAction
                  ? { disabledReason: EN_EL_ULTIMO_KM, reasonHidden: true }
                  : {})}
                onClick={onNextAction}
              >
                Next action
              </Button>
              <Button
                variant="control"
                icon="more"
                ariaLabel="More"
                expanded={sheetOpen}
                controls="player-sheet"
                onClick={() => setSheetOpen((o) => !o)}
              />
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
      )}
      {!digest && bar}
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
          // `secondary`: en la hoja, los saltos se ven como botones, como cuando tenían su relleno (PR 20)
          <Button
            key={j.id}
            size="sm"
            {...(j.enabled
              ? {}
              : { disabledReason: POR_QUE_SALTO[j.why ?? 'none'], reasonHidden: true })}
            onClick={() => onJump(j.id)}
          >
            {j.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="inline-flex gap-0.5" role="group" aria-label="Mode">
          {(['watch', 'highlights'] as const).map((v) => (
            <Button key={v} variant="control" pressed={view === v} onClick={() => onView(v)}>
              {v === 'watch' ? 'Watch' : 'Highlights'}
            </Button>
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
