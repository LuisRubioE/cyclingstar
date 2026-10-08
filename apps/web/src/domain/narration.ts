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
