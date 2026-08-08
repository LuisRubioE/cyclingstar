/**
 * Física del corredor y del grupo, bloque a bloque (SPEC 6.4-6.7). Todo puro y determinista.
 * Una sola ley de velocidad sirve al pelotón, a la fuga, al descolgado y a la contrarreloj:
 * cambian los inputs, no la física (SPEC 6.4).
 */
import type { Attribute } from '@cyclingstar/shared'
import { clamp } from '../random.js'
import { STAGE } from '../constants.js'
import type { Block, BlockTerrain, TankState } from './types.js'

/** Efectividades por atributo, ya resueltas por Banister (eff0) o por erosión (effNow). */
export type Eff = Record<Attribute, number>

/** Atributos físicos que la pájara castiga (todos menos la táctica y la recuperación). */
const PHYSICAL: Attribute[] = ['RES', 'LLA', 'MON', 'COL', 'CRI', 'SPR', 'DES', 'PAV']

// --- 6.4 La ley de velocidad ---------------------------------------------------------------

/** Peso del atributo de subida frente al de llano: w(g) = clamp((g - 2) / 6, 0.15, 1.0). */
export function climbWeight(g: number): number {
  return clamp((g - STAGE.wGradientOffset) / STAGE.wGradientScale, STAGE.wMin, STAGE.wMax)
}

/**
 * Valor efectivo del corredor en un bloque (SPEC 6.4). En subida mezcla el atributo de subida
 * (MON, o COL en muros) con el de llano según w(g); en pavés mezcla PAV y LLA.
 */
export function blockPerfil(eff: Eff, block: Block, useCol = false): number {
  switch (block.tipo) {
    case 'subida': {
      const w = climbWeight(block.g)
      const climb = useCol ? eff.COL : eff.MON
      return w * climb + (1 - w) * eff.LLA
    }
    case 'llano':
      return eff.LLA
    case 'paves':
      return STAGE.pavesPavWeight * eff.PAV + STAGE.pavesLlaWeight * eff.LLA
    case 'descenso':
      return eff.DES
  }
}

/**
 * Velocidad de referencia del terreno en km/h (SPEC 6.4).
 *
 * En SUBIDA es hiperbólica, `A / (g + k)`, no lineal: subir es vencer la gravedad, así que la
 * velocidad va como el inverso de la pendiente. La recta anterior (44 − 2.7·g, con suelo en 14)
 * daba VAM de 1.940 m/h al 8% —por encima de cualquier ascensión de la historia— y encima se
 * volvía absurda al pasar del 11%, donde el suelo la dejaba plana y la VAM se disparaba a 2.200.
 * Con la hipérbola la VAM sale sola en el rango real (1.500-1.800 m/h) a cualquier pendiente.
 */
export function vRef(g: number, tipo: BlockTerrain): number {
  switch (tipo) {
    case 'subida':
      return clamp(
        STAGE.vRefClimbNumerator / (g + STAGE.vRefClimbOffset),
        STAGE.vRefClimbMin,
        STAGE.vRefFlat,
      )
    case 'llano':
      return STAGE.vRefFlat
    case 'paves':
      return STAGE.vRefPaves
    case 'descenso':
      return STAGE.vRefDescent
  }
}

/** Ritmo del grupo según su compromiso c (0 tempo, 1 a bloque): 0.90 + 0.35·c. */
export function rhythm(c: number): number {
  return STAGE.rhythmBase + STAGE.rhythmScale * c
}

/**
 * Velocidad objetivo del grupo en un bloque (SPEC 6.4):
 * v_obj = vRef(g)·(P75_perfil / 75)^0.34·ritmo(c). El P75 lo aportan quienes marcan el ritmo.
 */
export function targetSpeed(block: Block, p75Perfil: number, c: number): number {
  const base = vRef(block.g, block.tipo)
  const load = Math.pow(p75Perfil / STAGE.p75Reference, STAGE.p75Exponent)
  return base * load * rhythm(c)
}

/** Duración en segundos de un bloque de `dx` km a la velocidad actual (Euler explícito, 6.4). */
export function blockSeconds(vActual: number, dx: number = STAGE.dx): number {
  return (3600 * dx) / vActual
}

export interface AccOptions {
  /** Uno de los últimos 20 bloques: se permite la aceleración de trenes y sprint. */
  isFinal?: boolean
  /** Impulso de cerillo activo: la aceleración aplicable se multiplica por 2.5. */
  matchActive?: boolean
}

/** Cota de aceleración aplicable en km/h por segundo (SPEC 6.4), asimétrica y contextual. */
export function accLimit(g: number, opts: AccOptions = {}): number {
  let acc: number = STAGE.accPedal
  if (g <= STAGE.accGravGradient) acc = Math.max(acc, STAGE.accGrav) // la gravedad regala
  if (opts.isFinal) acc = Math.max(acc, STAGE.accFinal)
  if (opts.matchActive) acc *= STAGE.matchAccMultiplier // el W prima financia los cambios bruscos
  return acc
}

/**
 * Persigue la velocidad objetivo con aceleraciones acotadas (SPEC 6.4). Las cotas son en km/h
 * por segundo (jamás por bloque: invariancia de resolución), y frenar es más rápido que acelerar.
 */
export function stepSpeed(
  vActual: number,
  vObjetivo: number,
  g: number,
  dt: number,
  opts: AccOptions = {},
): number {
  const acc = accLimit(g, opts)
  const delta = clamp(vObjetivo - vActual, -STAGE.decMax * dt, acc * dt)
  return vActual + delta
}

// --- 6.5 Coste, tanque y drafting ----------------------------------------------------------

/** Coste base por km según terreno y pendiente (SPEC 6.5). */
export function costBase(block: Block): number {
  if (block.tipo === 'paves') return STAGE.costPavesBase + STAGE.costPavesStars * block.estrellas
  const g = block.g
  if (g <= STAGE.costDescentGradient) return STAGE.costDescentFloor
  if (g < 0) {
    // lerp(0.10, 0.30) entre g = -3 y g = 0.
    const t = (g - STAGE.costDescentGradient) / (0 - STAGE.costDescentGradient)
    return STAGE.costDescentFloor + (STAGE.costFlatBase - STAGE.costDescentFloor) * t
  }
  return STAGE.costFlatBase + STAGE.costClimbSlope * g
}

/** Rebufo máximo disponible según terreno (SPEC 6.5). */
export function draftMax(block: Block): number {
  switch (block.tipo) {
    case 'llano':
      return STAGE.draftFlat
    case 'descenso':
      return STAGE.draftDescent
    case 'paves':
      return STAGE.draftPaves
    case 'subida':
      return clamp(
        STAGE.draftClimbBase - STAGE.draftClimbSlope * block.g,
        STAGE.draftClimbMin,
        STAGE.draftFlat,
      )
  }
}

/**
 * Coste de energía de un corredor en un bloque (SPEC 6.5):
 * coste = dx·costeBase·ritmo(c)^1.6·(1 - draftMax·shelter).
 */
export function blockCost(block: Block, c: number, shelter: number, dx: number = STAGE.dx): number {
  return (
    dx *
    costBase(block) *
    Math.pow(rhythm(c), STAGE.costRhythmExponent) *
    (1 - draftMax(block) * shelter)
  )
}

// --- 6.6 Cerillos ---------------------------------------------------------------------------

/**
 * Cerillos disponibles (SPEC 6.6). comp = 0.50·max(MON,COL) + 0.30·RES + 0.20·LLA;
 * cerillos = 2 + umbrales; con TSB < -25 se resta uno; el vaciado profundo del día anterior
 * resta otro. Mínimo 1.
 */
export function matchCount(eff0: Eff, tsb: number, deepDepleted = false): number {
  const comp =
    STAGE.matchCompMonWeight * Math.max(eff0.MON, eff0.COL) +
    STAGE.matchCompResWeight * eff0.RES +
    STAGE.matchCompLlaWeight * eff0.LLA
  let matches = STAGE.matchBase
  for (const threshold of STAGE.matchThresholds) if (comp >= threshold) matches += 1
  if (tsb < STAGE.matchTsbPenaltyThreshold) matches -= 1
  if (deepDepleted) matches -= 1
  return Math.max(STAGE.matchMin, matches)
}

// --- 6.7 Erosión por vaciado ---------------------------------------------------------------

/** Fracción de vaciado del tanque: clamp(1 - E/E0, 0, 1). */
export function depletion(energy: number, energy0: number): number {
  return clamp(1 - energy / energy0, 0, 1)
}

/**
 * ¿Terminó la etapa con VACIADO PROFUNDO (SPEC 6.6)? Quien acaba por debajo del
 * `matchDepletionThreshold` de su depósito arranca la etapa siguiente con un cerillo menos
 * (`matchCount(eff0, tsb, deepDepleted)`), que hasta ahora nunca se activaba.
 */
export function isDeepDepleted(energy: number, energy0: number): boolean {
  if (energy0 <= 0) return false
  return energy / energy0 < STAGE.matchDepletionThreshold
}

/** Foto del tanque de un corredor en meta (SPEC 6.6, 6.7), para telemetría e invariantes. */
export function tankState(energy: number, energy0: number, res: number): TankState {
  return {
    energy0,
    energy,
    depletion: depletion(energy, energy0),
    erosion: erosion(energy, energy0, res),
    deepDepleted: isDeepDepleted(energy, energy0),
  }
}

/**
 * Erosión del corredor (SPEC 6.7). Nada por debajo del umbral (0.35 + 0.40·RES/100); a partir
 * de ahí crece con el vaciado, TOPADA en `erosionMax`.
 *
 * El techo no es cosmético y estaba escrito en docs/motor.md §VI.1 sin implementar: «con la erosión
 * topada en 1,000 el pelotón entero está al máximo de degradación, el modelo DEJA DE DISCRIMINAR y
 * el resultado vuelve a ser azar». Hasta ahora ese techo solo lo garantizaba la calibración de las
 * clásicas de un día con el campo fresco; medido sobre etapas de montaña REALES con un campo de
 * tercera semana, la erosión llegaba a 1,000 en el 100% del pelotón (docs/balance.md).
 */
export function erosion(energy: number, energy0: number, res: number): number {
  const depl = depletion(energy, energy0)
  const umbral = STAGE.erosionThresholdBase + STAGE.erosionThresholdResScale * (res / 100)
  return Math.min(STAGE.erosionMax, Math.max(0, (depl - umbral) / (1 - umbral)))
}

/**
 * Efectividad ahora mismo de un atributo bajo erosión (SPEC 6.7):
 * effNow(a) = eff0(a)·(1 - coefErosion[a]·erosion^1.2). El sprinter (coef 0.45) pierde punta
 * mucho antes que el rodador táctico (coef 0.15).
 */
export function effNowAttr(eff0Value: number, attr: Attribute, erosionValue: number): number {
  // RES y REC no erosionan (no aparecen en la tabla del SPEC 6.7): coef 0.
  const coef = (STAGE.erosionCoef as Partial<Record<Attribute, number>>)[attr] ?? 0
  return eff0Value * (1 - coef * Math.pow(erosionValue, STAGE.erosionExponent))
}

/**
 * Efectividades actuales de todos los atributos (SPEC 6.7). Con `bonk` (tanque a cero) los
 * atributos físicos caen a 0.55 y el corredor se descuelga automáticamente.
 */
export function effNow(eff0: Eff, erosionValue: number, bonk = false): Eff {
  const out = {} as Eff
  for (const attr of Object.keys(eff0) as Attribute[]) {
    let value = effNowAttr(eff0[attr], attr, erosionValue)
    if (bonk && PHYSICAL.includes(attr)) value *= STAGE.bonkFactor
    out[attr] = value
  }
  return out
}
