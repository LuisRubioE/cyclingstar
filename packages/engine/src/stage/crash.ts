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
 * LA SEVERIDAD DE UNA CAÍDA, sin preguntar antes si se cae (v38). Sale aparte de `rollCrash` porque
 * los que se van al suelo ARRASTRADOS por otro no tiran el dado del riesgo: ya están en el suelo, y
 * lo único que queda por saber es cómo se levantan.
 */
export function rollCrashSeverity(rng: Rng, fragility: number): CrashOutcome {
  const roll = rng()
  const s = STAGE.crashSeverity
  const noneLoss = (): number => STAGE.crashLossNoneMinS + rng() * STAGE.crashLossNoneRangeS
  if (roll < s.none) return { severidad: 'none', perdidaS: noneLoss(), diasBaja: 0 }
  if (roll < s.none + s.scratches) {
    return {
      severidad: 'scratches',
      perdidaS: noneLoss(),
      diasBaja: Math.round(STAGE.crashDaysScratchesMin + rng() * STAGE.crashDaysScratchesRange),
    }
  }
  if (roll < s.none + s.scratches + s.minor * fragility) {
    return {
      severidad: 'minor',
      perdidaS: STAGE.crashLossMinorMinS + rng() * STAGE.crashLossMinorRangeS,
      diasBaja: Math.round(STAGE.crashDaysMinorMin + rng() * STAGE.crashDaysMinorRange),
    }
  }
  return {
    severidad: 'major',
    perdidaS: STAGE.crashLossMajorMinS + rng() * STAGE.crashLossMajorRangeS,
    diasBaja: Math.round(STAGE.crashDaysMajorMin + rng() * STAGE.crashDaysMajorRange),
  }
}

/**
 * CUÁNTOS SE VAN AL SUELO CON ÉL (v38). El dueño: «normalmente cuando se cae alguien en el pelotón,
 * casi siempre se caen varios… y depende de la gravedad puede haber uno o varios que se vayan de la
 * carrera, otros que se queden muy cortados, pero normalmente VARIOS, con lo cual podrían tirar».
 *
 * Hasta la v37 cada caída era de uno, porque el dado se tiraba corredor a corredor y nadie miraba a
 * los de al lado. Y eso no es un detalle de narración: es lo que decide si el cortado acaba SOLO —y
 * entonces no vuelve y se va fuera de control— o en un grupo que se releva y llega. Medido en la
 * v38, de los ocho corredores que se iban fuera de control en dos giras del banco, los ocho iban
 * solos.
 *
 * Cuántos se lleva depende de lo gorda que sea: un susto es un toque y una caída seria es un montón.
 * Y no puede llevarse a más gente de la que va en el grupo, claro.
 */
export function crashPile(rng: Rng, severidad: Incident['severidad'], groupSize: number): number {
  const techo =
    severidad === 'major' || severidad === 'minor'
      ? STAGE.crashPileSeriousMax
      : STAGE.crashPileLightMax
  const arrastrados = Math.floor(rng() * (techo + 1))
  return Math.max(0, Math.min(arrastrados, groupSize - 1))
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
  return rollCrashSeverity(rng, fragility)
}
