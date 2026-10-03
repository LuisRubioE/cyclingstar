import type { BroadcastHead, Instant } from '@cyclingstar/shared'
import {
  gapText,
  isQuietFinal,
  overlayDetailText,
  toGoText,
  versusText,
} from '../../domain/broadcast/screen'

/**
 * LA CAPA FIJA (docs/retransmision.md §6.2, 6-f; D-17): lo que la UCI pide «permanently viewed on
 * screen». A la izquierda, los km a meta de la cabeza (con un decimal; en metros dentro del último km;
 * en vueltas en un circuito); a la derecha, la diferencia principal (`s.t.` por debajo de
 * `sameTimeS`, `Bunch together` con un solo grupo), su flecha de tendencia y contra quién, con la
 * palabra de voz de ese grupo (`on the bunch`). Al tocarla, una segunda línea con el reloj, la
 * velocidad de la cabeza, la pendiente, el tiempo y el detalle de la tendencia; con el cuadro de
 * diferencias, desde el 6a. En los últimos `quietFinalM`, solo la distancia (§6.9).
 *
 * Se repinta a `overlayHz` y no es una región viva (§18.8): saturaría el lector de pantalla.
 */
export function FixedOverlay({
  instant,
  head,
  expanded = false,
  onToggle,
}: {
  instant: Instant
  head: Pick<BroadcastHead, 'cast' | 'profile' | 'weather'>
  /** la segunda línea (6-f) */
  expanded?: boolean
  onToggle?: () => void
}) {
  const quiet = isQuietFinal(instant.toGoKm)
  const gap = instant.mainGap
  const behind = gap === null ? undefined : instant.groups.find((g) => g.g === gap.behind)
  const arrow = gap?.trend?.arrow === 'up' ? '▲' : gap?.trend?.arrow === 'down' ? '▼' : null
  return (
    <button
      type="button"
      className="block w-full select-none rounded-xl bg-slate-900 px-3 py-2 text-left text-white"
      aria-live="off"
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold tabular-nums">
          {toGoText(instant.toGoKm, instant.lapsToGo)}
        </span>
        {!quiet &&
          (gap === null ? (
            <span className="text-sm font-semibold">Bunch together</span>
          ) : (
            <span className="flex items-baseline gap-1 text-right">
              <span className="text-lg font-bold tabular-nums">{gapText(gap.gapS)}</span>
              {arrow !== null && (
                <span className={arrow === '▲' ? 'text-amber-300' : 'text-emerald-300'}>
                  {arrow}
                </span>
              )}
              {behind !== undefined && (
                <span className="text-xs text-white/70">{versusText(behind, head.cast)}</span>
              )}
            </span>
          ))}
      </span>
      {expanded && !quiet && (
        <span className="mt-1 block text-xs tabular-nums text-white/70">
          {overlayDetailText(instant, head)}
        </span>
      )}
    </button>
  )
}
