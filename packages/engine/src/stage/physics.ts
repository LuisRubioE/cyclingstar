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
 * COMPROMISO DEL DESCOLGADO (v16, docs/motor.md §9). A qué ritmo rueda un grupo que ya se ha ido
 * por detrás. Sustituye a la constante `shedCommit` = 0,82, que era la mitad del parche: con ella
 * un descolgado rodaba SIEMPRE al ritmo de un pelotón lanzado y la otra mitad —el recorte fijo de
 * `chaseBackSecondsPerKm`— tenía que existir para tapar los fantasmas que eso producía.
 *
 * Sale de dos cosas que sí son física y que el motor ya modela en el COSTE (SPEC 6.5) sin que
 * llegaran nunca a la velocidad:
 *
 * 1. **Relevarse reparte el viento.** En un grupo de `n` que rota, a cada uno le toca ir en cabeza
 *    1/n del tiempo; el que va solo da la cara el 100 %. Por eso un autobús de cuarenta rueda como
 *    un pelotón y un descolgado suelto no puede sostener ese ritmo aunque tenga las mismas piernas.
 *    Es lo que `shelterAlone` (v15) ya cobraba en energía y aquí se cobra en velocidad.
 * 2. **…y eso vale lo que valga el rebufo en este terreno.** `draftMax` ya lo dice: en el llano un
 *    42 %, en un sector de adoquines un 18 %, y en una rampa al 8 % un 9,6 %. De ahí sale solo el
 *    hecho de carretera que ningún parche sabía imitar: **el grupeto sube tan lento como el que sube
 *    solo** —arriba no hay rueda a la que ir— y en el valle vuelve a rodar como un pelotón.
 * 3. **Con lo que quede en las piernas.** Un grupeto de la última hora de una etapa reina va vacío y
 *    administra; entero, no. `freshness` es E/E₀, la misma frescura que ya pesa en el deber de relevo.
 *
 * Y por encima de las tres, **primero se PERSIGUE y luego uno se resigna**, que es de lo que iba
 * este modelo: el que acaba de soltarse va a su umbral (`shedFightCommit`, el 0,82 de siempre)
 * peleando por volver, y conforme el grupo de cabeza se le pierde de vista pasa a rodar a lo suyo.
 * Sin esta parte el motor mandaba al grupeto a cualquiera que perdiese una rueda, y una etapa reina
 * la ganaba el mejor escalador por siete minutos sobre el décimo; con ella, el que se suelta a un
 * minuto sigue peleando —y esa es la diferencia entre una selección y una debacle—.
 *
 * …Y QUIÉN ES MAYORÍA EN LA CARRETERA (v17, la corrección de la regresión de la v16). El boquete no
 * puede ser lo ÚNICO que decide si un grupo se resigna, porque «resignarse» pasados 300 s es
 * verdad para UN rezagado y es mentira para el pelotón entero. El tamaño ya entraba —`rotation`—,
 * pero satura: con n = 10 vale 0,90 y con n = 126, 0,992, así que un pelotón se rendía igual que un
 * hombre solo. Medido en producción (Race Colombia e5, docs/balance.md «v17»): cuatro corredores
 * delante, 126 detrás, y esos 126 rodando 47 km de terreno rodador a 8 km/h del grupo de cabeza
 * hasta entrar a 74 minutos. Lo que distingue al grupeto que se resigna del pelotón que persigue no
 * es el boquete, es que **cuatro delante y 126 detrás significa que los 126 son la carrera**.
 *
 * Vuelve por eso `chaseBackBusFactor` (v12, retirado por error en la v16): un grupo que TRIPLICA en
 * número al que va delante no se resigna. La rampa es continua entre la paridad —donde no cambia
 * nada— y el triple, y **se cobra a precio de rebufo** (`wind`), que es lo que hace honesto el
 * argumento: ser mayoría paga porque un autobús se releva y caza en el llano; en una rampa al 8 %
 * no hay rueda a la que ir y ser cuarenta no sirve de nada. Por eso el grupeto de la etapa reina
 * —que se resigna EN EL PUERTO— sigue existiendo exactamente igual que en la v16.
 */
export function droppedCommit(
  block: Block,
  size: number,
  freshness: number,
  gapSeconds: number,
  aheadSize: number,
): number {
  const rotation = 1 - 1 / Math.max(1, size)
  const wind = draftMax(block) / STAGE.draftFlat
  const able =
    STAGE.shedCommitAlone + (STAGE.shedCommitBunch - STAGE.shedCommitAlone) * rotation * wind
  const legs =
    STAGE.shedEmptyCommitFactor + (1 - STAGE.shedEmptyCommitFactor) * clamp(freshness, 0, 1)
  // La frescura pesa sobre el ritmo del GRUPETO y no sobre el del que pelea, y no es un detalle: lo
  // que administra es una decisión («me queda poco, lo guardo»), no una limitación —esa ya la cobra
  // la erosión sobre el P75, y cobrarla dos veces mandaba al grupeto a cualquiera que perdiese una
  // rueda—. El que acaba de soltarse va a su umbral aunque vaya vacío; el que ya se ha resignado,
  // no.
  const seen = 1 - clamp(gapSeconds / STAGE.shedResignGapSeconds, 0, 1)
  const fight = seen + (1 - seen) * majorityOnTheRoad(size, aheadSize) * wind
  return able * legs + (STAGE.shedFightCommit - able * legs) * fight
}

/**
 * MAYORÍA EN LA CARRETERA (v17): cuánto pesa ser más que los de delante, de 0 a 1.
 *
 * La escala es `chaseBackBusFactor` (3) leída en los dos sentidos, y esa simetría es justo lo que se
 * quiere decir: **eres un grupeto cuando ellos te triplican a ti** (razón ≤ 1/3, vale 0, y es
 * exactamente lo que había en la v16) **y eres un pelotón cuando tú los triplicas a ellos** (razón
 * ≥ 3, vale 1, no te resignas). Entre medias la rampa es continua, así que dos mitades de un
 * pelotón partido —el caso que de verdad se ve en carretera— quedan cerca del centro y siguen
 * peleando un poco, sin que ninguna se convierta de golpe en la otra cosa.
 *
 * Los dos casos que la fijan: el grupeto de una gran vuelta (cuarenta detrás de ciento veinte, razón
 * 0,33) no se entera de que esto existe; los 126 de Race Colombia e5 detrás de 4 dan 1 y no se
 * resignan, que es de lo que iba la corrección.
 */
export function majorityOnTheRoad(size: number, aheadSize: number): number {
  const ratio = size / Math.max(1, aheadSize)
  const floor = 1 / STAGE.chaseBackBusFactor
  return clamp((ratio - floor) / (STAGE.chaseBackBusFactor - floor), 0, 1)
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
