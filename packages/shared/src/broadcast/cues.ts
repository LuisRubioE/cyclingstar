/**
 * LO EVENTUAL DE LA PANTALLA (E2, docs/retransmision.md §4.9): la cola de rótulos y la voz.
 *
 * En el PR 2 este fichero nace con un solo tipo, `LiveLine`, porque la voz causal lo devuelve
 * (`buildChronicle` con `live`, §12.2) y la web lo filtra (`inVoice`) antes de que exista la cola. El
 * resto de §4.9 (`Cue`, `CueKind`, `TemplateTarget`, `TimeCheckRow`, `RiderCueContext`) llega en el
 * 3a, y `CUE_OF_TEMPLATE`, `cuesBetween` y la cola, en el 6a (decisión 17-z: los tipos que otros
 * ficheros importan nacen antes que el código que los usa). `CueClass` vive en `timeline.ts`.
 */
import type { ChronicleEntry } from '../contracts.js'
import type { RaceS } from './timeline.js'

/**
 * Una línea de la voz: la entrada de buildChronicle con live (§12.2) y la hora a la que se dice. La
 * construye la API para cada tramo.
 */
export type LiveLine = ChronicleEntry & { readonly revealS: RaceS }
