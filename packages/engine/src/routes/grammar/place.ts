/**
 * COLOCACIÓN DE MOTIVOS EN LA ETAPA (docs/generador.md §3.9 y §8.6).
 *
 * Paso 1: solo el tipo `Placed`, que firman `VetoFn`, `renderSkeleton` y `colocarLegado`. Paso 4:
 * `colocar`, `colocarPlantilla` y `kmNoEnlace`.
 */
import type { Motif } from './motifs.js'

/** Un motivo con su sitio en la etapa: km de inicio y fin desde la salida, y la bajada canónica colgada si la lleva. */
export interface Placed {
  motif: Motif
  slot: number | 'meta'
  inicioKm: number
  finKm: number
  bajada?: Motif
}
