/**
 * EL PULSO POR EL FRENTE: QUIÉN PAGA LA CAZA (docs/tactica.md R20).
 *
 * Contiene **S-176, el contrario nº 1 de las veinte más graves**, y su ficha no se anda con rodeos:
 * «es el error de puntería del motor entero: se persigue al grupo más adelantado en vez de al que
 * hace daño, así que toda la lógica de caza apunta al sitio equivocado».
 *
 * Hoy el pelotón persigue `frontMove()` —lo que va delante— y el frente lo lleva quien gana una
 * tabla de `claim` con histéresis. Eso funciona, pero no es un pulso: nadie mira a quién le cuesta
 * qué, nadie se esconde, y nadie decide **que hoy no le toca a él**.
 *
 * Aquí se decide lo contrario, y con las piezas que el paso 6 ya dejó hechas: `threatOf` dice lo que
 * un movimiento le cuesta a un equipo ENTERO —general, etapa y secundarias—, y sobre esa misma
 * función se eligen las dos cosas que faltaban: **a quién se persigue** y **quién paga**.
 */
import { clamp } from '../random.js'
import { STAGE } from '../constants.js'
import { type CustomsMove, type CustomsTeam, payableOf, threatOf } from './customs.js'

/** Un movimiento candidato a ser perseguido, con lo que hace falta para desempatar. */
export interface ChaseCandidate {
  groupId: string
  move: CustomsMove
  /** Km que le quedan a este grupo hasta meta. Desempata a igualdad de amenaza. */
  kmToGo: number
}

/**
 * A QUIÉN PERSIGUE ESTE EQUIPO (R20.1). El que MÁS le cuesta, no el que va más lejos.
 *
 * `threatOf` y no `costToMyMan`, y es la corrección que hace ejecutable el contrario nº 1:
 * `costToMyMan` cuenta solo general, así que para el perseguidor normal de una llana —el equipo del
 * sprinter, sin hombre de general— vale **0 en todos los movimientos** y el `argmax` se queda en un
 * empate a cero sin desempate escrito. Con los tres términos, el equipo del sprinter apunta a lo que
 * de verdad le quita la etapa.
 *
 * El desempate es determinista y está escrito: a igualdad de amenaza, el movimiento **más cerca de
 * meta**; a igualdad de eso, el `groupId` menor. Sin él, dos movimientos empatados dejarían la caza
 * dependiendo del orden de un array.
 */
export function chaseTargetOf(
  t: CustomsTeam,
  candidates: readonly ChaseCandidate[],
): ChaseCandidate | null {
  let mejor: ChaseCandidate | null = null
  let mejorAmenaza = -1
  for (const c of candidates) {
    const amenaza = threatOf(t, c.move)
    if (mejor === null || amenaza > mejorAmenaza + STAGE.front.threatTieBand) {
      mejor = c
      mejorAmenaza = amenaza
      continue
    }
    if (Math.abs(amenaza - mejorAmenaza) > STAGE.front.threatTieBand) continue
    // Empate dentro de la banda: manda el que está más cerca de meta, y luego el id menor.
    if (c.kmToGo < mejor.kmToGo || (c.kmToGo === mejor.kmToGo && c.groupId < mejor.groupId)) {
      mejor = c
      mejorAmenaza = Math.max(mejorAmenaza, amenaza)
    }
  }
  return mejor
}

/**
 * EL HUECO QUE ESTE EQUIPO TOLERA (R20.1), **con sus dos ramas**.
 *
 * La segunda faltaba en el diseño original y sin ella la regla no se puede ejecutar: `leash(t)` se
 * calcula sobre el hombre de la general, y un equipo de sprint o de cazaetapas **no tiene** hombre de
 * general. Su hueco tolerable no es una correa: es **lo que todavía puede cerrar**. A `closeRate`
 * segundos por kilómetro y descontando los kilómetros de caza dura, a 120 km de meta tolera diez
 * minutos y a 40 km, dos. Es la curva de `flat.catchKmToFinish` leída al revés.
 */
export function desiredGapOf(t: CustomsTeam, kmToGo: number): number {
  if (t.cardGcId !== null) return t.leashSeconds
  return STAGE.front.closeRateSPerKm * Math.max(0, kmToGo - STAGE.front.chaseHardKm)
}

/**
 * EL DERECHO AL FRENTE (R20.2), y los cuatro factores que hoy no están.
 *
 * - **La presencia**, normalizada por CONVOCADOS y no por un 8 fijo: el equipo que tiene a todos los
 *   suyos aquí tiene derecho entero, sea de cuatro o de ocho, y el de ocho que llega al km 150 con
 *   tres vale tres octavos. Con un 6 fijo, un equipo de cuatro entero valía 0,67 el día que salía de
 *   casa; con un 8, dos bajas de una gran vuelta no costaban nada.
 * - **Lo gastado**, que ya existía en la histéresis pero no en el derecho.
 * - **La necesidad**, que es lo que ata la subasta a R20.1 y era lo que faltaba: sin ella el equipo
 *   del sprinter pujaba por el frente a 120 km de meta con la fuga a 90 segundos —aunque su hueco
 *   tolerable fuera de diez minutos— y se ponía a tirar en cuanto ganaba. Con necesidad, a 90 sobre
 *   600 vale 0,15: pierde la puja contra quien de verdad la necesita y se guarda para los últimos
 *   cuarenta, que es lo que hace en carretera.
 * - **El precio de la carretera**, que multiplica: cerrar en carretera revirada y estrecha cuesta
 *   más que en autovía.
 */
export function frontClaimOf(
  t: CustomsTeam,
  claimBase: number,
  gapToTargetSeconds: number,
  kmToGo: number,
  roadPrice = 1,
): number {
  const presencia = clamp(t.presentInPeloton / Math.max(1, t.convocados), 0, 1)
  const fresco = 1 - clamp(t.spentFraction, 0, 1)
  const deseado = desiredGapOf(t, kmToGo)
  const necesidad = deseado <= 0 ? 1 : clamp(gapToTargetSeconds / deseado, 0, 1)
  return claimBase * presencia * fresco * necesidad * roadPrice
}

/**
 * EL QUE SE SIENTA (R20.5): «llego al sprint con dos hombres más si tiras tú».
 *
 * Solo entre equipos con **el mismo motivo** —dos escuadras de sprinter que se miran—, y la escala
 * importa: escrito como «0,35 · lanzadores > objeción − payable», con la objeción acotada en 1 y el
 * payable en [0,1], tres lanzadores daban 1,05 > 1 **siempre**, o sea «nada» todos los días y cuanto
 * más fresco el equipo, antes. Comparado contra **la parte del cierre que le tocaría pagar**, que es
 * lo que de verdad se ahorra, el número cierra.
 */
export function sitsOut(
  t: CustomsTeam,
  move: CustomsMove,
  pot: number,
  lanzadoresVivos: number,
  hayOtroPagadorDelMismoMotivo: boolean,
): boolean {
  if (!hayOtroPagadorDelMismoMotivo) return false
  const amenaza = threatOf(t, move)
  if (amenaza <= 0) return false
  const valorDeSentarse =
    (STAGE.front.sitOutGain * Math.min(lanzadoresVivos, STAGE.front.trainMaxLaunchers)) /
    STAGE.front.trainMaxLaunchers
  const parteDelCierre = pot <= 0 ? 1 : Math.min(amenaza, payableOf(t, move)) / pot
  return valorDeSentarse > parteDelCierre * amenaza
}
