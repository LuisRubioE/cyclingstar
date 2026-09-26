/**
 * VETOS DEL GENERADOR (docs/generador.md §3.9 y sección 9).
 *
 * Los vetos son puros y solo leen `routes/` y la geometría de `grammar/geometry.ts`: nunca
 * `sampleProfile`, `finishType` ni `costBase` (decisión 4). Lo que el motor lee de un perfil se mide
 * en `sim/routeCensus.ts`.
 *
 * Paso 1: solo los tipos `VetoId`, `Veto` y `VetoFn` (`GeneratedStage.arch.rechazos` es `Veto[]`).
 * Paso 5: `finalKindDe`, `verify`, V1 a V12, V15, V16 y `conjuntoV16`; paso 7: V13 y V14.
 */
import type { StageProfile } from '../../stage/types.js'
import type { StageRequest } from './generate.js'
import type { Motif } from './motifs.js'
import type { Placed } from './place.js'
import type { Skeleton } from './skeletons.js'

export type VetoId =
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'V7'
  | 'V8'
  | 'V9'
  | 'V10'
  | 'V11'
  | 'V12'
  | 'V13'
  | 'V14'
  | 'V15'
  | 'V16'

/** El veto que falló y por qué, para el test y la galería ("Intentos y rechazos"). */
export interface Veto {
  id: VetoId
  detalle: string
}

/**
 * Un veto por etapa, puro. `kmObjetivo` es el km de la INSTANCIA (`EditionPlan.km`), no el de la
 * petición; `colocados` son los `Placed` rendidos (solo V10 lee estos dos).
 */
export type VetoFn = (
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
  kmObjetivo: number,
  colocados: Placed[],
) => Veto | null
