import {
  type BroadcastHead,
  type Instant,
  mainGapText,
  toGoText,
  versusText,
} from '@cyclingstar/shared'
import { useState } from 'react'
import { isQuietFinal, overlayDetailText, overlaySummaryText } from '../../domain/broadcast/screen'
import { Icon } from '../ui/Icon'
import { FOCUS } from '../ui/styles'

type OverlayHead = Pick<BroadcastHead, 'cast' | 'profile' | 'weather'>

/**
 * EL RESUMEN, SOLO CUANDO CAMBIA LO QUE SE PINTA (E3, docs/visual.md §14.3): la distancia con su decimal,
 * el segundo de la diferencia con su flecha y contra quién, y el tamaño del grupo de cabeza; no a
 * `overlayHz`, para que el nombre del botón no cambie mientras se lee. Guarda la clave con que lo escribió,
 * como pide React para lo que depende del render anterior.
 */
function useOverlaySummary(instant: Instant, head: OverlayHead): string {
  const gap = instant.mainGap
  const ahead = gap === null ? undefined : instant.groups.find((g) => g.g === gap.ahead)
  const behind = gap === null ? undefined : instant.groups.find((g) => g.g === gap.behind)
  const key = [
    toGoText(instant.toGoKm, instant.lapsToGo),
    gap === null ? '' : mainGapText(gap.gapS),
    gap?.trend?.arrow ?? '',
    behind === undefined ? '' : versusText(behind, head.cast),
    ahead?.size ?? '',
  ].join('|')
  const [shown, setShown] = useState(() => ({ key, text: overlaySummaryText(instant, head) }))
  if (shown.key === key) return shown.text
  const next = { key, text: overlaySummaryText(instant, head) }
  setShown(next)
  return next.text
}

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
 *
 * Desde el PR 20 (E3, docs/visual.md §14.3; I-10): en el ámbito oscuro, igual en los dos modos; los km en
 * `display`, la diferencia en `row`, la flecha como el icono `trend` en `gold`, girado y `aria-hidden`, y
 * contra quién y la segunda línea en `meta` `ink-2`. Su nombre accesible son las dos frases de
 * `overlaySummaryText` (H-05), que se leen al enfocarla o tocarla.
 */
export function FixedOverlay({
  instant,
  head,
  expanded = false,
  onToggle,
}: {
  instant: Instant
  head: OverlayHead
  /** la segunda línea (6-f) */
  expanded?: boolean
  onToggle?: () => void
}) {
  const quiet = isQuietFinal(instant.toGoKm)
  const gap = instant.mainGap
  const behind = gap === null ? undefined : instant.groups.find((g) => g.g === gap.behind)
  const arrow = gap?.trend?.arrow === 'up' || gap?.trend?.arrow === 'down' ? gap.trend.arrow : null
  const summary = useOverlaySummary(instant, head)
  return (
    <button
      type="button"
      data-surface="dark"
      className={`block w-full select-none rounded-ui bg-surface px-3 py-2 text-left text-ink ${FOCUS}`}
      aria-live="off"
      aria-expanded={expanded}
      aria-label={summary}
      onClick={onToggle}
    >
      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-display tabular-nums">
          {toGoText(instant.toGoKm, instant.lapsToGo)}
        </span>
        {!quiet &&
          (gap === null ? (
            <span className="text-row">Bunch together</span>
          ) : (
            <span className="flex items-baseline gap-1 text-right">
              <span className="text-row tabular-nums">{mainGapText(gap.gapS)}</span>
              {arrow !== null && (
                <span data-trend={arrow} className="self-center text-gold">
                  <Icon name="trend" size={16} turn={arrow === 'up' ? -90 : 90} />
                </span>
              )}
              {behind !== undefined && (
                <span className="text-meta text-ink-2">{versusText(behind, head.cast)}</span>
              )}
            </span>
          ))}
      </span>
      {expanded && !quiet && (
        <span className="mt-1 block text-meta tabular-nums text-ink-2">
          {overlayDetailText(instant, head)}
        </span>
      )}
    </button>
  )
}
