import { ATTRIBUTES, type Attribute, type RaceClass } from '@cyclingstar/shared'
import { LEARNING } from '../constants.js'

/**
 * LO QUE SE APRENDE CORRIENDO (docs/epics.md «G1», cuarta pata). Puro y determinista.
 *
 * Esta regla existía y funcionaba desde hace tiempo, pero vivía dentro de `packages/db`
 * (`stageRun.ts`) como dos constantes sueltas y un bucle. Se saca aquí por una razón concreta y no
 * por ordenar: **el banco de mundo no podía alcanzarla**, así que la única pieza del juego que sabe
 * medir lo que le pasa a una población con los años era ciega justamente a la mitad de la
 * progresión que ocurre compitiendo. Un banco que no lleva algo no puede medirlo, y ahí es donde
 * los defectos viven para siempre.
 */

/**
 * QUÉ TE ENSEÑA CADA TERRENO. Lo que el día te obliga a hacer es lo que se te queda: una llana te
 * hace rodar y rematar, una reina te hace subir, una clásica te curte en el muro y el adoquín.
 */
export const STAGE_LEARNING_ATTRS: Record<string, readonly Attribute[]> = {
  llana: ['LLA', 'SPR'],
  media: ['MON', 'LLA'],
  reina: ['MON', 'COL'],
  cri: ['CRI'],
  clasica: ['COL', 'PAV'],
}

/**
 * …Y LA TÁCTICA SIEMPRE, corras lo que corras. Es la única que no depende del terreno, y es
 * deliberado: la ayuda del propio atributo lo dice —«race intelligence… learned by racing, not just
 * training»— y colocarse, leer un final y elegir el momento se aprenden en cualquier carrera.
 */
const SIEMPRE: Attribute = 'TAC'

export interface RaceLearningInput {
  /** La clase de la carrera: es lo que hace que el Tour enseñe más que una .2. */
  raceClass: RaceClass
  /** El terreno del día (`llana`, `media`, `reina`, `cri`, `clasica`). */
  kind: string
  attributes: Readonly<Record<Attribute, number>>
  ceilings: Readonly<Record<Attribute, number>>
}

/**
 * Lo que sube cada atributo por haber CORRIDO Y TERMINADO esta etapa, en puntos.
 *
 * Devuelve solo los que se mueven, y nunca por encima del techo. Al que ya está en su techo no le
 * enseña nada, igual que el entrenamiento: es el mismo `kDim` dicho de otra forma, y por eso quien
 * nace sin margen no aprende ni entrenando ni corriendo.
 */
export function raceLearning(input: RaceLearningInput): Partial<Record<Attribute, number>> {
  const porTerreno = STAGE_LEARNING_ATTRS[input.kind] ?? []
  const cuales = new Set<Attribute>([...porTerreno, SIEMPRE])
  const nivel = LEARNING.raceClassFactor[input.raceClass] ?? 1
  const out: Partial<Record<Attribute, number>> = {}
  for (const attr of ATTRIBUTES) {
    if (!cuales.has(attr)) continue
    const actual = input.attributes[attr]
    const techo = input.ceilings[attr] ?? 100
    const margen = Math.max(0, techo - actual)
    if (margen <= 0) continue
    const gain = LEARNING.raceBase * nivel * (margen / LEARNING.raceMarginRef)
    if (gain <= 0) continue
    out[attr] = Math.min(techo - actual, gain)
  }
  return out
}
