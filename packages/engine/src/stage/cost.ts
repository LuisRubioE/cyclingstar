/**
 * EL PUNTO ÚNICO DEL COSTE TÁCTICO (§9.1bis de docs/tactica.md).
 *
 * La Frontera 2 dice que `physics.ts` no se toca, y eso solo es comprobable si los multiplicadores
 * tácticos del coste de bloque están **los cinco en un sitio, con su tope y con su signo**. Aquí
 * están. `physics.ts` no se entera de nada: se le multiplica el resultado, no se le edita la
 * función.
 *
 *     coste_final(r, block) = blockCost(...) × (1 + clamp(Σ mult_i, −cap, +cap))
 *
 * De los cinco, el paso 14 encendió **dos** —empujar (R15a.1) y el acordeón (R15a.2)—, el 9 el ritmo de
 * carrera (R08.4) y el **20** el frío (R13.5), que llega con el parte por segmentos porque hasta él no
 * había de dónde sacar un `frio`. Falta la altitud (R28.7), que entra en el 18 y se suma aquí mismo.
 *
 * **Y CUATRO DE LOS CINCO SON DE SUMA CERO POR GRUPO**, que es lo que los hace inocuos para las
 * cinco bandas de `erosion`: la mediana del grupo no se mueve, cambia la dispersión dentro de él.
 * Si en el paso 14 se moviera la mediana de `queenFresh`, la suma cero estaría mal implementada y la
 * tanda se para —no se re-ancla la banda—. El invariante C1 lo vigila con
 * `sumaTacticalCostMultiplierPorGrupo ≈ 0 ± 0,02`.
 */
import { STAGE } from '../constants.js'

/** Lo que un corredor aporta a la suma, antes de normalizar. */
export interface CostTerms {
  /** R15a.1, bruto: `placePushCost · pushing`. Se le resta la media del grupo. */
  push: number
  /** R15a.2, YA relativo a la media del grupo: `accordionGain · (p − media)`. */
  accordion: number
  /**
   * R08.4 (paso 18): **el que llega sin ritmo de carrera**. `rhythmCostGain · (1 − raceRhythm)`, y
   * como es idéntico para todo el que trae el mismo dato, redistribuye **entre** grupos y no dentro
   * — que es lo que lo mantiene inocuo para las cinco bandas de `erosion`.
   *
   * La señal es de `entrenamiento.md` (§5.2) y la palanca es de aquí. Ausente = 0.
   */
  rhythm?: number
  /**
   * R13.5 (paso 20): **el frío**. `coldCostScale · frio`, con `frio` en [0,1]. Es el cuarto de los
   * cinco y llega en el paso 20 y no en el 13 por un motivo que hay que decir: **hasta R14 no había
   * de dónde sacarlo**. La temperatura del día existe desde la v42, pero solo se leía hacia arriba
   * —el calor—, así que una etapa a 2° y una a 20° costaban exactamente lo mismo. El parte por
   * segmentos es lo que da `frio`, y con él este término pasa de declarado a cobrado.
   *
   * Como el clima es del BLOQUE y no del hombre, es idéntico para todo el grupo: redistribuye entre
   * grupos y no dentro, que es lo que lo mantiene inocuo para las cinco bandas de `erosion`. Escala
   * pequeña a propósito; el frío se cobra sobre todo en `coldStopS`. Ausente = 0.
   */
  cold?: number
}

/**
 * LA SUMA DE UN CORREDOR, con el tope puesto. `mediaPush` es la media del término bruto de empujar
 * **en su grupo**: restarla es lo que convierte «empujar cuesta» en «el grupo gasta lo mismo y
 * cambia quién». El que no empuja no gana puestos y además paga un poco menos; el que empuja, al
 * revés. Eso es un pelotón.
 *
 * El tope existe porque cinco términos [calibrar] multiplicándose es la forma exacta de mover
 * `erosion.*` sin que nadie lo vea. `tacticalCostCap` 0,60 sale de que los dos grandes coincidan en
 * el peor caso —el que remonta cien puestos en pleno acordeón— sin volver el bloque incoherente.
 */
export function tacticalCostMultiplier(t: CostTerms, mediaPush: number): number {
  const suma = t.push - mediaPush + t.accordion + (t.rhythm ?? 0) + (t.cold ?? 0)
  return Math.max(-STAGE.tacticalCostCap, Math.min(STAGE.tacticalCostCap, suma))
}

/** El factor que multiplica al bloque. Sin términos vale 1 exacto, y ése es el brazo A/B. */
export function tacticalCostFactor(t: CostTerms, mediaPush: number): number {
  return 1 + tacticalCostMultiplier(t, mediaPush)
}
