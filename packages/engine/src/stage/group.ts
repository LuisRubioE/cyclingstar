/**
 * Los grupos como relojes paralelos (SPEC 6.3). La simulación mueve grupos, no puntos: cada
 * grupo es un cursor sobre el recorrido con su cronómetro acumulado `tS`. Los boquetes no se
 * estiman, se integran bloque a bloque; una captura es la fusión de dos relojes que se juntan.
 */
import { STAGE } from '../constants.js'
import { type AccOptions, blockSeconds, stepSpeed, targetSpeed } from './physics.js'
import type { Block } from './types.js'

/** Un grupo de corredores rodando juntos, con su reloj y su estado social (SPEC 6.3, 6.10). */
export interface Group {
  id: string
  riderIds: string[]
  /** Cronómetro acumulado en segundos desde la salida. */
  tS: number
  /** Velocidad actual en km/h (arranca en 35 tras la salida neutralizada). */
  vActual: number
  /** Compromiso [0,1]: 0 tempo, 1 a bloque (SPEC 6.4, 6.9). */
  compromiso: number
  /** Cooperación [0,1]: fracción de relevadores (SPEC 6.10). */
  coop: number
  /**
   * Tensión acumulada de la fuga (SPEC 6.10, docs/motor.md §13 regla 6). Cada grupo escapado la
   * acumula `breakawayTensionPerKm` por kilómetro y, pasado `breakawayTensionThreshold`, el pacto
   * se rompe: los ataques internos se disparan (`breakawayTensionAttackFactor`) y la cooperación
   * de lo que salga de ahí se recorta (`breakawayTensionCoopFactor`).
   */
  tension: number
}

export interface GroupInit {
  compromiso?: number
  coop?: number
  vActual?: number
  tS?: number
  tension?: number
}

/** Crea un grupo con los valores iniciales del SPEC 6.3 (velocidad 35 km/h tras la salida). */
export function createGroup(id: string, riderIds: string[], init: GroupInit = {}): Group {
  return {
    id,
    riderIds: [...riderIds],
    tS: init.tS ?? 0,
    vActual: init.vActual ?? STAGE.initialSpeed,
    compromiso: init.compromiso ?? STAGE.commitIdle,
    coop: init.coop ?? 1,
    tension: init.tension ?? 0,
  }
}

/** P75 de una lista de valores (interpolación lineal). Marca el ritmo del grupo (SPEC 6.4). */
export function percentile75(values: number[]): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]!
  const sorted = [...values].sort((a, b) => a - b)
  const rank = 0.75 * (sorted.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  const frac = rank - lo
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * frac
}

/**
 * Avanza un grupo un bloque (SPEC 6.4, 6.16). `p75Perfil` es el P75 del perfil efectivo de
 * quienes marcan el ritmo. Devuelve un grupo nuevo: la velocidad persigue a la objetivo con
 * aceleraciones acotadas y el reloj suma el tiempo del bloque a la velocidad ya actualizada.
 */
export function advanceGroup(
  group: Group,
  block: Block,
  p75Perfil: number,
  opts: AccOptions = {},
  dx: number = STAGE.dx,
): Group {
  const vObjetivo = targetSpeed(block, p75Perfil, group.compromiso)
  // `dt de entrada`: la cota de aceleración usa la velocidad de entrada al bloque (SPEC 6.4).
  const dtIn = blockSeconds(group.vActual, dx)
  const vActual = stepSpeed(group.vActual, vObjetivo, block.g, dtIn, opts)
  const tS = group.tS + blockSeconds(vActual, dx)
  return { ...group, vActual, tS }
}

/** Boquete en segundos entre dos grupos al cruzar el mismo bloque (SPEC 6.3). */
export function gapSeconds(a: Group, b: Group): number {
  return Math.abs(a.tS - b.tS)
}

/** ¿Se capturan? El boquete cayó a 5 s o menos (SPEC 6.3). */
export function isCapture(a: Group, b: Group): boolean {
  return gapSeconds(a, b) <= STAGE.captureGapSeconds
}

/**
 * Fusiona dos grupos en uno (captura, SPEC 6.3). El grupo resultante hereda el reloj del que va
 * delante (menor `tS`) y su velocidad; la cooperación y la tensión se promedian.
 */
export function mergeGroups(a: Group, b: Group): Group {
  const [front, back] = a.tS <= b.tS ? [a, b] : [b, a]
  return {
    id: front.id,
    riderIds: [...front.riderIds, ...back.riderIds],
    tS: front.tS,
    vActual: front.vActual,
    compromiso: Math.max(front.compromiso, back.compromiso),
    coop: (front.coop + back.coop) / 2,
    // Dos grupos que se juntan traen su historia: la tensión resultante es la media de las dos.
    tension: (front.tension + back.tension) / 2,
  }
}
