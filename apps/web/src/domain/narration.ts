/**
 * El veredicto de la última carrera (presentación pura, sin HTTP).
 *
 * Aquí vivía además un segundo narrador de la crónica: `narrate()` y su tabla `CHRONICLE`, con 19
 * plantillas y 56 redacciones que nada llamaba en producción, y `personalNarration`, la frase en
 * segunda persona de siete plantillas y la clave cruda en las demás. El paso 12 de E2 los quita
 * (docs/retransmision.md §12.9, D-47): las frases de una etapa las redacta un solo sitio,
 * `stageJournal.ts`, y los momentos del corredor en `Your last race` son las líneas del acta en que es
 * protagonista (`moments`, 12-k). Queda `raceVerdict`, que pintan la tarjeta y la portada.
 */

import type { RiderRaceReport } from '@cyclingstar/shared'
import { formatTime } from './format'

/** Veredicto corto comparando lo ordenado con lo sucedido. */
export function raceVerdict(r: RiderRaceReport): string {
  const top = r.fieldSize > 0 ? r.position / r.fieldSize : 1
  if (r.position === 1) return 'Perfect execution — you took the win.'
  if (r.position <= 3) return 'A podium — the plan came together.'
  if (r.orders?.contestSprints && r.position <= 8)
    return 'You went for the sprint and were right in the mix.'
  if (r.orders?.contestClimbs && r.komPoints > 0)
    return 'You animated the climbs and grabbed mountain points.'
  if (r.orders?.role === 'gregario') return 'A domestique day — work done for the team.'
  if (top <= 0.15) return 'A strong ride near the front.'
  if (top <= 0.4) return 'A solid day in the bunch.'
  return 'A quiet day — the race got away from you.'
}

/**
 * El hueco con el ganador, como toda diferencia (E3, docs/visual.md §4.10; la revisión del 21g): `winner` al
 * primero; al resto, `+0:40` con `formatTime`; y `s.t.` a quien llegó con él, lo normal en un esprint, que no es
 * haber ganado. Lo pintan la portada y la ficha, que lo escribían cada una a su manera (`+1'12"`, `+0:00`).
 */
export function gapToWinnerText(r: Pick<RiderRaceReport, 'position' | 'timeGapToWinnerS'>): string {
  if (r.position === 1) return 'winner'
  return r.timeGapToWinnerS > 0 ? `+${formatTime(r.timeGapToWinnerS)}` : 's.t.'
}
