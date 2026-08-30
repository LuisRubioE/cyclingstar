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
import { clamp } from '../random.js'
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
  /*
   * Final en alto: manda el escalador. Exige tres cosas, no dos.
   *
   * LARGA (`finishAltoMinKm`): por debajo es un muro, y un muro lo gana un puncheur —el Muro de Huy
   * del calendario, 1,4 km al 8,5 % en la línea, sale «puncheur» y eso es correcto—.
   *
   * DE VERDAD (v30): una cota puede medir cuatro kilómetros y no ser una subida. La condición era
   * solo de LONGITUD, así que `race-basque-country` e2 —**4,0 km al 3,0 %, 120 metros de desnivel**,
   * un falso llano hasta la meta— repartía el remate con MON al 0,60 y lo ganaba el mejor escalador
   * del pelotón. Medido sobre el calendario entero: 9 de los 197 finales en alto (5 %) tenían menos
   * del 4 % de pendiente media, contra una mediana de 728 m de desnivel.
   *
   * El listón es una O, no una Y, y las dos mitades dicen algo distinto: o la cota es EMPINADA
   * (`finishAltoMinGradient`) o es tan LARGA que acumula subida de verdad (`finishAltoMinMetres`),
   * que es el caso de un puerto tendido de once kilómetros. Con las dos juntas se quedan fuera los
   * arrastres a la línea y se quedan dentro los cat-2 tendidos: `race-france` e6 (8,7 km al 4,4 %)
   * sigue siendo final en alto, y `race-basque-country` e2 deja de serlo.
   *
   * QUE MUERA EN LA META, o que se cumpla la definición del SPEC 6.12 —los últimos 3 km al 5 % de
   * media—, que cubre la cumbre con rellano final donde la racha ascendente se corta antes.
   */
  const climbHard =
    t.climbGradient >= STAGE.finishAltoMinGradient ||
    t.climbKm * t.climbGradient * 10 >= STAGE.finishAltoMinMetres
  if (t.climbKm >= STAGE.finishAltoMinKm && climbHard) {
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
 * ¿ADMITE ESTE FINAL UNA LLEGADA AGRUPADA? (v22)
 *
 * Es una pregunta DISTINTA de `isSprintFinish` y de `isUphillFinish`, y confundirlas costó el
 * defecto del GP de Québec. Aquí no se pregunta quién REMATA (eso lo resuelve `finishScore` grupo a
 * grupo, ya con los que han llegado), sino si el pelotón puede plantarse entero en el kilómetro
 * final: si los trenes tienen sentido, si los equipos de los sprinters se ponen a cazar y si el
 * tirón de los últimos kilómetros existe.
 *
 * La respuesta la da el tipo de final y es casi siempre que sí. Sube el ÚNICO que la niega:
 *
 * - `alto` — un puerto de 3 km o más que muere en la meta (o los últimos 3 km al 5 %). Ahí no hay
 *   tren que valga: el pelotón se rompe en la subida y cada uno llega como puede.
 * - `puncheur` — SÍ admite llegada agrupada, y esta es la corrección. Un repecho de 1,3 km al 6 %
 *   en la línea (Québec), el Mur de Huy o el Cauberg se abordan con el pelotón lanzado a tope y se
 *   deciden en el último minuto: el GP de Québec 2025 lo ganó Alaphilippe con 2 s sobre el segundo
 *   y 17 s sobre el décimo, que es una llegada de grupo, no una criba.
 * - `pave`, `descenso`, `sprint_*` — llegada rodada de los que queden.
 *
 * Lo que ESTO sustituye es `finalStretch.every((b) => b.tipo !== 'subida')` en `simulate.ts`: un
 * `every` en crudo sobre los últimos 2 km, donde UN bloque de subida —una rampa del 3 % en la
 * pancarta— apagaba los trenes, la caza y el tirón final de toda la carrera. El motor ya tenía aquí
 * un clasificador que sabe distinguir un repecho de un puerto; no lo usaba donde más importa.
 */
export function admitsBunchFinish(type: FinishType): boolean {
  return type !== 'alto' && type !== 'solitario'
}

/**
 * ¿Se llega a meta CUESTA ARRIBA? Es lo que antes decidía el binario `finishUphill`, y para lo
 * único que hace falta seguir sabiéndolo es la crónica: un grupo grande que llega en llano, en
 * descenso o por el adoquín disputa un sprint; uno que llega trepando, no.
 */
export function isUphillFinish(type: FinishType): boolean {
  return type === 'alto' || type === 'puncheur'
}

/**
 * EL DESORDEN DE LA COLOCACIÓN (v24, docs/motor.md §12.6): con cuánta dispersión se juega la
 * posición en meta un corredor de este grupo.
 *
 * Devuelve el sd relativo de un factor multiplicativo de media 1. No es «ruido» de desempate —de eso
 * ya hay uno, `sprintScoreNoiseSd`—: es la pieza de carrera que faltaba, la que hace que el mismo
 * hombre no gane siempre aunque sea el más rápido. Tres términos, en este orden:
 *
 * - **El tamaño del grupo.** Por debajo de `finishBunchMinRiders` devuelve CERO: en un grupo de diez
 *   todos ven la carretera y se colocan donde quieren. De ahí a `placementFullBunchRiders` sube
 *   lineal hasta el desorden del pelotón entero. Ese cero es lo que deja intactos el final en alto,
 *   la fuga que llega, el escapado en solitario y la contrarreloj.
 * - **El tren.** Cada lanzador PRESENTE en el mismo grupo baja el desorden: para eso existe un tren,
 *   y por eso el tope de lanzadores útiles es el mismo que el del empujón (`leadOutMaxHelpers`).
 * - **La táctica.** Colocarse es leer el momento. TAC por encima de 50 alivia, por debajo penaliza.
 *
 * Y un suelo: `placementReliefMax` impide que el alivio llegue nunca al 100 %. Ni el mejor tren del
 * mundo te garantiza la rueda buena.
 */
export function placementSd(groupSize: number, leadOutsPresent: number, tac: number): number {
  const span = STAGE.placementFullBunchRiders - STAGE.finishBunchMinRiders
  const crowd = Math.max(0, Math.min(1, (groupSize - STAGE.finishBunchMinRiders) / span))
  if (crowd === 0) return 0
  const fromTrain = STAGE.placementTrainRelief * Math.min(leadOutsPresent, STAGE.leadOutMaxHelpers)
  const fromTac = (tac - 50) / STAGE.placementTacScale
  const relief = Math.max(0, Math.min(STAGE.placementReliefMax, fromTrain + fromTac))
  return STAGE.placementSdMax * crowd * (1 - relief)
}

/**
 * EL RÉGIMEN DE REMATE: los últimos kilómetros de una llegada masiva NO se ruedan, se lanzan (v39).
 *
 * El dueño, después de que le enseñara por qué reciclando la ley de velocidad no salía: «para ese
 * último km de sprint final en pelotón diseña una mecánica nueva; que no uses solo lo que ya tienes,
 * porque ese modelo tal cual nunca va a dar la velocidad real de un sprint real». Tiene razón, y el
 * motivo es físico y no de calibración:
 *
 * La ley de velocidad del motor (`targetSpeed`) es AERÓBICA: describe lo que un grupo sostiene
 * durante horas a partir de su umbral. Un lanzamiento no es eso. Un hombre de tren pone 550-700 W
 * durante uno o dos minutos y el velocista 1200-1600 W durante quince segundos, o sea entre el
 * doble y el cuádruple del umbral, y eso no cabe en una escala de perfil donde diez puntos son un
 * 6 % de potencia: para pasar de 48 a 58 km/h haría falta subir la potencia un 71 %, unos NOVENTA
 * puntos de perfil. Medido: encender los cerillos de los trenes y medir el ritmo sobre los
 * relevistas en vez de sobre el cuarto delantero mueven el último kilómetro medio km/h.
 *
 * Así que el remate tiene su propia ley, y es una ley de VELOCIDAD OBJETIVO y no de vatios, porque
 * es lo que de verdad se sabe de un sprint: a tres kilómetros un pelotón lanzado va a unos
 * cincuenta, y en el último se pone en sesenta y pico. La aceleración sigue estando acotada
 * (`stepSpeed`), así que el pelotón SUBE a esa velocidad, no aparece en ella.
 *
 * Tres condiciones, y las tres son las que el dueño describió:
 *
 * - **Hace falta que alguien lance.** Sin un tren trabajando no hay régimen y el pelotón llega a lo
 *   que iba: eso también pasa, y es la llegada desangelada en la que se cuela un ataque tardío.
 * - **Cuantos más trenes, más rápido.** «Puede haber varios equipos con sus lanzadores al mismo
 *   tiempo, aunque no necesariamente con el mismo éxito.»
 * - **Y solo si el final es de sprint.** Cuesta arriba no hay lanzamiento que valga: ahí manda la
 *   ley de siempre, que es la que sabe de rampas.
 *
 * Devuelve 0 cuando el régimen no aplica; quien lo llama toma el MÁXIMO con la ley normal, así que
 * esto solo puede acelerar el desenlace, nunca frenarlo.
 */
export function sprintRegimeKmh(
  kmToGo: number,
  trenesTrabajando: number,
  gradient: number,
): number {
  if (trenesTrabajando < STAGE.sprintRegimeMinTrains) return 0
  if (kmToGo > STAGE.sprintTrainKm || kmToGo < 0) return 0
  if (gradient > STAGE.sprintRegimeMaxGradient) return 0
  const t = clamp(1 - kmToGo / Math.max(1e-9, STAGE.sprintTrainKm), 0, 1)
  const fuerza =
    STAGE.sprintRegimeSoloShare +
    (1 - STAGE.sprintRegimeSoloShare) * clamp(trenesTrabajando / STAGE.sprintRegimeFullTrains, 0, 1)
  return (
    STAGE.sprintApproachKmh + (STAGE.sprintFlammeKmh - STAGE.sprintApproachKmh) * t * t * fuerza
  )
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

/**
 * EL LANZAMIENTO: CUÁNDO SE ABRE EL SPRINT (v39, docs/motor.md §12.7).
 *
 * El dueño: «fíjate cómo funciona un sprint sin lanzadores, por ejemplo en una fuga, donde puede
 * haber un momento en el que todos se miran y de repente uno se lanza… pero si se lanza demasiado
 * temprano puede no llegar, y si se lanza demasiado tarde igual ya no sobrepasa al que se lanzó
 * antes».
 *
 * Eso es una decisión, y el motor no la tenía: la meta se resolvía comparando puntuaciones de
 * remate con un dado de desempate, así que el sprint era una tirada y no una carrera. Aquí el
 * sprint pasa a tener una VARIABLE propia —a cuántos metros de la línea abre cada uno— y dos
 * maneras de equivocarse, que son las dos que dijo el dueño:
 *
 * - **DEMASIADO PRONTO.** Un sprint se sostiene una distancia y no más: 200-250 m para un velocista
 *   puro, menos si llega vaciado. Lo que se abre por encima de eso se paga en los últimos metros,
 *   que es el hombre que va en cabeza y se apaga viendo pasar a tres.
 * - **DEMASIADO TARDE.** El que espera va a rueda y llega más entero, pero necesita CARRETERA para
 *   pasar. Si el primero se ha ido más allá de una ventana de cortesía, ya no lo alcanza aunque
 *   fuera más rápido. Por eso el castigo del tarde no es absoluto sino RELATIVO al primero que
 *   abrió: un sprint en el que todos esperan no perjudica a nadie —sale lento y gana el más
 *   rápido—, y el que se descuelga del momento sí.
 *
 * De ahí sale solo lo que se ve en carretera: el mejor sitio para abrir es exactamente lo que
 * aguantas, ni un metro más; en un grupo con trenes el sprint se abre pronto y ordenado porque
 * alguien tira; y en una fuga sin trenes nadie quiere abrir —todos se miran— así que se abre tarde
 * y con mucha más dispersión, y quien se lanza primero se lleva a veces la etapa aunque no sea el
 * más rápido.
 */
export function sprintHoldMetres(spr: number, freshness: number): number {
  const base = STAGE.sprintHoldBase + STAGE.sprintHoldPerPoint * (spr - 50)
  const piernas =
    STAGE.sprintHoldFreshFloor + (1 - STAGE.sprintHoldFreshFloor) * clamp(freshness, 0, 1)
  return Math.max(STAGE.sprintHoldMin, base * piernas)
}

/**
 * Lo que vale el sprint de un hombre que abre a `launchM` de meta aguantando `holdM`, con el
 * primero del grupo abriendo a `firstLaunchM`. Factor multiplicativo ≤ 1 con suelo: abrir en el
 * punto justo no regala nada, equivocarse cuesta.
 */
export function launchEffect(launchM: number, holdM: number, firstLaunchM: number): number {
  const pasado = Math.max(0, launchM - holdM)
  const tarde = Math.max(0, firstLaunchM - launchM - STAGE.launchWindowM)
  return Math.max(
    STAGE.launchEffectFloor,
    1 - (STAGE.launchEarlyPenalty * pasado + STAGE.launchLatePenalty * tarde) / 100,
  )
}
