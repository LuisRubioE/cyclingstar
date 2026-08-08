/**
 * Modelo de FINAL de etapa (docs/motor.md §12): de qué depende el orden de llegada dentro de un
 * grupo.
 *
 * Antes lo decidía UNA sola línea —`finishUphill ? max(MON, COL) : SPR`— con dos consecuencias
 * medidas: solo existían dos arquetipos de final en todo el juego (sprinter o escalador), el PAV no
 * intervenía jamás en ningún resultado, y bastaba que UN bloque de los últimos 2 km subiera para
 * que toda la meta pasara a decidirse por la escalada (una rampa de 200 m convertía una etapa llana
 * en llegada de escaladores).
 *
 * Aquí el final se deriva del RECORRIDO —los últimos kilómetros, la última cota y a qué distancia
 * corona— y del TAMAÑO del grupo que llega, y la puntuación pasa a ser una mezcla de atributos con
 * pesos por tipo de final. Todo es puro y determinista: solo lee bloques y números.
 */
import type { Attribute } from '@cyclingstar/shared'
import { STAGE } from '../constants.js'
import type { Eff } from './physics.js'
import type { Block } from './types.js'

/** Los siete arquetipos de final que el motor sabe resolver (docs/motor.md §12). */
export type FinishType =
  'sprint_masivo' | 'sprint_reducido' | 'puncheur' | 'alto' | 'pave' | 'descenso' | 'solitario'

/**
 * Lo que el RECORRIDO dice del final, ya medido en magnitudes con sentido ciclista. No depende de
 * los corredores: se calcula una vez por etapa.
 */
export interface FinishTerrain {
  /** Pendiente media (%) de los últimos `finishWindowKm`: el arrastre de la llegada. */
  avgGradient: number
  /** Pendiente media (%) de los últimos `hilltopFinishKm`: la definición de final en alto del SPEC. */
  hilltopGradient: number
  /** Longitud (km) de la última cota del final; 0 si no hay ninguna reseñable. */
  climbKm: number
  /** Pendiente media (%) de esa cota. */
  climbGradient: number
  /** Dureza acumulada de esa cota: km · g² (el mismo baremo que la categoría, SPEC 6.2). */
  climbScore: number
  /** A cuántos km de meta corona. */
  climbKmToFinish: number
  /** Fracción de descenso en los últimos `finishDescentKm`. */
  descentFraction: number
  /** Fracción de pavé en los últimos `finishPaveKm`. */
  paveFraction: number
}

/**
 * Mide el final a partir de los bloques del recorrido.
 *
 * La ventana es de ~5 km y no de 2, y la última cota se busca en los últimos 15: un final se decide
 * en el último puerto y en el descenso o el falso llano que vengan detrás, no en los 200 m finales.
 */
export function deriveFinishTerrain(blocks: Block[], dx: number = STAGE.dx): FinishTerrain {
  const n = blocks.length
  if (n === 0) {
    return {
      avgGradient: 0,
      hilltopGradient: 0,
      climbKm: 0,
      climbGradient: 0,
      climbScore: 0,
      climbKmToFinish: Number.POSITIVE_INFINITY,
      descentFraction: 0,
      paveFraction: 0,
    }
  }
  const tail = (km: number): Block[] => blocks.slice(Math.max(0, n - Math.round(km / dx)))
  const mean = (bs: Block[]): number =>
    bs.length === 0 ? 0 : bs.reduce((acc, b) => acc + b.g, 0) / bs.length
  const fraction = (bs: Block[], tipo: Block['tipo']): number =>
    bs.length === 0 ? 0 : bs.filter((b) => b.tipo === tipo).length / bs.length

  // Última cota: la ÚLTIMA racha ascendente del tramo final. Se tolera un respiro corto dentro de
  // la subida (un rellano de 500 m no parte un puerto en dos) y se descartan las rachas demasiado
  // cortas para significar nada: esa es justo la rampa de 200 m que antes decidía la etapa.
  const from = Math.max(0, n - Math.round(STAGE.finishClimbSearchKm / dx))
  let runStart = -1
  let flatRun = 0
  let climbKm = 0
  let climbGradient = 0
  let climbKmToFinish = Number.POSITIVE_INFINITY
  const closeRun = (start: number, end: number): void => {
    const km = (end - start + 1) * dx
    if (km < STAGE.finishClimbMinKm) return
    let sum = 0
    for (let i = start; i <= end; i++) sum += blocks[i]!.g
    climbKm = km
    climbGradient = sum / (end - start + 1)
    climbKmToFinish = (n - 1 - end) * dx
  }
  for (let i = from; i < n; i++) {
    const rising = blocks[i]!.g >= STAGE.finishClimbMinGradient
    if (rising) {
      if (runStart < 0) runStart = i
      flatRun = 0
    } else if (runStart >= 0) {
      flatRun += 1
      if (flatRun > STAGE.finishClimbGapBlocks) {
        closeRun(runStart, i - flatRun)
        runStart = -1
        flatRun = 0
      }
    }
  }
  if (runStart >= 0) closeRun(runStart, n - 1 - flatRun)

  return {
    avgGradient: mean(tail(STAGE.finishWindowKm)),
    hilltopGradient: mean(tail(STAGE.hilltopFinishKm)),
    climbKm,
    climbGradient,
    climbScore: climbKm * climbGradient * climbGradient,
    climbKmToFinish,
    descentFraction: fraction(tail(STAGE.finishDescentKm), 'descenso'),
    paveFraction: fraction(tail(STAGE.finishPaveKm), 'paves'),
  }
}

/**
 * Tipo de final de un GRUPO concreto: el recorrido manda, pero cuántos llegan también. El mismo
 * kilómetro final es un sprint masivo para el pelotón y un esprint de grupo reducido —donde la
 * colocación y la táctica pesan— para los cinco que se han ido delante.
 */
export function finishType(t: FinishTerrain, groupSize: number): FinishType {
  if (groupSize <= 1) return 'solitario'
  // Final en alto: manda el escalador. Dos caminos, y los dos exigen una cota LARGA (por debajo de
  // `finishAltoMinKm` es un muro, y un muro lo gana un puncheur): que la cota muera en la meta, o
  // que se cumpla la definición del SPEC 6.12 —los últimos 3 km al 5% de media—, que cubre la
  // cumbre con rellano final donde la racha ascendente se corta un poco antes de la pancarta.
  if (t.climbKm >= STAGE.finishAltoMinKm) {
    if (t.climbKmToFinish <= STAGE.finishSummitKm) return 'alto'
    if (t.hilltopGradient >= STAGE.hilltopFinishGradient) return 'alto'
  }
  // Puncheur: una cota dura que corona cerca de meta, o una llegada que arrastra hacia arriba.
  if (t.climbKmToFinish <= STAGE.finishPuncheurKmToGo && t.climbScore >= STAGE.finishPuncheurScore)
    return 'puncheur'
  if (t.avgGradient >= STAGE.finishDragGradient) return 'puncheur'
  if (t.descentFraction >= STAGE.finishDescentFraction) return 'descenso'
  if (t.paveFraction >= STAGE.finishPaveFraction) return 'pave'
  return groupSize >= STAGE.finishBunchMinRiders ? 'sprint_masivo' : 'sprint_reducido'
}

/** ¿Se resuelve este final al sprint (y tiene sentido, por tanto, un tren de lanzadores)? */
export function isSprintFinish(type: FinishType): boolean {
  return type === 'sprint_masivo' || type === 'sprint_reducido'
}

/**
 * Puntuación de remate de un corredor en un final de este tipo (docs/motor.md §12): una MEZCLA de
 * atributos con pesos por tipo, en vez de un único atributo. Los pesos suman 1, así que la
 * puntuación queda en la escala de los atributos (0-100) sea cual sea el final.
 */
export function finishScore(eff: Eff, type: FinishType): number {
  const weights: Partial<Record<Attribute, number>> = STAGE.finishWeights[type]
  let score = 0
  for (const [attr, w] of Object.entries(weights)) score += w * eff[attr as Attribute]
  return score
}
