/**
 * Qué dice la voz de `Watch` (docs/retransmision.md §12.2; D-43, punto 5). Pura.
 *
 * La voz es la crónica causal que la API construye para cada tramo (`buildChronicle` con `live`). La
 * web calla lo que ya dice el estado: la barra y la capa fija enseñan siempre quién va dónde y con
 * cuánto. Todo lo que se calla aquí sigue en el acta (`Report`).
 */

import type { LiveLine } from '@cyclingstar/shared'

/**
 * Las plantillas que solo van al acta porque las dice el estado: el parte de cabeza lo dice la barra
 * y el de ventaja, la capa fija. Son las dos `report_only` de `CUE_OF_TEMPLATE` (§6.6), que nace en
 * el 6a con la cola de rótulos; entonces esta lista se cambia por
 * `CUE_OF_TEMPLATE[line.plantilla] === 'report_only'` y `voice.test.ts` sigue igual.
 */
const REPORT_ONLY = new Set(['front_group', 'time_gap'])

/**
 * ¿Dice la voz esta línea? `unnamed(id)`: el corredor no estaba nombrado en su grupo un instante antes
 * de la línea (`namedRidersOf`, §7.7), es decir, con los sucesos revelados ANTES de ella (12-m): si
 * contara el propio descuelgue, todo el que se descuelga estaría nombrado por descolgarse.
 */
export function inVoice(line: LiveLine, unnamed: (riderId: string) => boolean): boolean {
  if (REPORT_ONLY.has(line.plantilla)) return false // front_group, time_gap (§6.6)
  if (line.plantilla === 'time_gap_run') return false // solo lo crea groupGapRuns, apagada en vivo
  // El descuelgue suelto de un corredor sin rótulo lo cuenta la barra (`GRUPPETTO · 23`).
  if (line.plantilla === 'rider_sits_up')
    return line.protagonists.some((p) => p.id == null || !unnamed(p.id))
  return true
}
