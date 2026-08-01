/**
 * Caídas e incidentes (SPEC 6.14). La probabilidad de etapa se reparte como intensidad `λ` por
 * bloque, ponderada por los bloques de riesgo (pavés, descensos, embudo final), de modo que las
 * caídas ocurren donde ocurren en la vida. Puro y determinista: el azar entra por el RNG de caída.
 */
import { STAGE } from '../constants.js'
import type { Rng } from '../random.js'
import { rollHazard } from './hazard.js'
import type { Block, Incident } from './types.js'

/** Intensidad de caída de un bloque (eventos/km), según terreno y tramo (SPEC 6.14). */
export function crashLambda(block: Block, isFinal: boolean): number {
  if (block.tipo === 'paves') return STAGE.crashLambdaPaves
  if (block.tipo === 'descenso') return STAGE.crashLambdaDescent
  if (isFinal) return STAGE.crashLambdaFinal
  return STAGE.crashLambdaBase
}

/** La destreza que reduce el riesgo según el terreno: DES en descensos, PAV en pavés (SPEC 6.14). */
function terrainSkill(block: Block, eff: { DES: number; PAV: number; TAC: number }): number {
  if (block.tipo === 'paves') return eff.PAV
  if (block.tipo === 'descenso') return eff.DES
  return eff.TAC
}

export interface CrashOutcome {
  severidad: Incident['severidad']
  perdidaS: number
  diasBaja: number
}

/**
 * Tira si un corredor se cae en este bloque y, de hacerlo, su severidad (SPEC 6.14).
 * Devuelve null si no hay caída. La destreza y la fragilidad modulan riesgo y consecuencias.
 */
export function rollCrash(
  rng: Rng,
  block: Block,
  isFinal: boolean,
  eff: { DES: number; PAV: number; TAC: number },
  erosion: number,
  fragility: number,
): CrashOutcome | null {
  const skill = terrainSkill(block, eff)
  const lambda =
    crashLambda(block, isFinal) *
    (1 + STAGE.crashErosionScale * erosion) *
    (1 - STAGE.crashSkillScale * (skill / 100))
  if (lambda <= 0 || !rollHazard(rng, lambda)) return null

  // Severidad por ruleta acumulada (SPEC 6.14); la lesión escala con la fragilidad.
  const roll = rng()
  const s = STAGE.crashSeverity
  if (roll < s.none) {
    return { severidad: 'none', perdidaS: 30 + rng() * 60, diasBaja: 0 }
  }
  if (roll < s.none + s.scratches) {
    return {
      severidad: 'scratches',
      perdidaS: 30 + rng() * 60,
      diasBaja: Math.round(3 + rng() * 3),
    }
  }
  if (roll < s.none + s.scratches + s.minor * fragility) {
    return { severidad: 'minor', perdidaS: 60 + rng() * 120, diasBaja: Math.round(5 + rng() * 10) }
  }
  return { severidad: 'major', perdidaS: 120 + rng() * 180, diasBaja: Math.round(20 + rng() * 40) }
}
