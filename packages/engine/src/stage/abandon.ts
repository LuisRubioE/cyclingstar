/**
 * ABANDONOS AUTOMÁTICOS (docs/motor.md §15 y §VI.3). El tipo `StageResult.estado` contemplaba
 * `'abandon' | 'dnf'` desde el Paso 21 y el motor no emitió jamás otra cosa que `'finish'`: en una
 * gran vuelta de 21 etapas los 176 que salían eran los 176 que acababan, siempre.
 *
 * QUÉ DISTINGUE `abandon` DE `dnf` EN ESTE PROYECTO. El SPEC (§ tabla `stage_results`) enumera
 * cuatro estados —`ok, fuera_control, abandono, caida`— y el tipo del motor tiene tres. El reparto
 * que se adopta, y que es el que respeta la frontera motor/datos:
 *
 * - **`abandon` = se BAJA DE LA BICI durante la etapa.** No llega a meta: no tiene tiempo ni puesto.
 *   Hoy lo produce el COLAPSO (`shouldCollapse`). Es el `abandono` del SPEC.
 * - **`dnf` = llega, pero FUERA DE CONTROL.** Cruzó la meta y tiene tiempo, pero queda sin
 *   clasificar y fuera del resto de la carrera. Es el `fuera_control` del SPEC.
 * - **No tomar la salida al día siguiente NO es un estado de etapa**: es `race_rosters.abandoned_day`
 *   y lo decide `packages/db`. El motor simula UNA etapa y no sabe que hay un mañana; la lesión que
 *   deja a alguien fuera de la vuelta se resuelve donde se conoce el calendario, no aquí
 *   (SPEC 6.14, `stageRun.ts::applyIncidents`).
 *
 * Todo lo de este módulo es puro: recibe números y devuelve números o booleanos.
 */
import { STAGE } from '../constants.js'
import { clamp } from '../random.js'
import type { Block, Incident } from './types.js'

// --- Lesión (causa «lesión» de §VI.3) --------------------------------------------------------

/**
 * ¿Esta caída deja al corredor FUERA del resto de la carrera por etapas? (docs/motor.md §VI.3).
 * Vive en el motor porque es una regla de juego con su constante, pero **la consume
 * `packages/db`**: el motor simula UNA etapa y no sabe que hay un mañana al que no tomar la salida.
 * El banco de la gran vuelta (`sim/grandTour.ts`) llama a la misma función, para que lo que mide CI
 * y lo que hace producción no puedan separarse.
 *
 * El criterio es la SEVERIDAD, no los días: `scratches` son 3-6 días y `minor` 5-15, así que un
 * umbral en días mete a la mitad de los rasguños. Un rasguño no te saca de una gran vuelta; una
 * lesión, sí. El umbral en días se conserva para las caídas que dejan una baja larga sin llegar a
 * `major`, que es la letra de §VI.3 («baja por encima de un umbral»).
 *
 * Antes de la v14 el umbral era de 15 días y solo `major` bastaba, con dos consecuencias medidas:
 * una gran vuelta perdía 1 corredor en tres semanas (0,6 %), y un corredor con una lesión de 10 días
 * quedaba marcado `lesionado` —fuera de los rosters de las demás carreras— y seguía corriendo esta.
 */
export function injuryEndsRace(severidad: Incident['severidad'], diasBaja: number): boolean {
  if (severidad === 'major' || severidad === 'minor') return true
  return diasBaja >= STAGE.abandonInjuryDays
}

// --- Colapso (causa «colapso / enfermedad» de §VI.3) ----------------------------------------

/** Lo que el motor sabe de un corredor cuando se pregunta si puede seguir. */
export interface CollapseContext {
  /** Km SEGUIDOS que lleva con el tanque a cero. */
  bonkKm: number
  /** Km que le faltan para la meta. */
  kmToGo: number
  /** Va en el grupo de cabeza (fuga o pelotón): quien se juega algo no se baja de la bici. */
  inFrontGroup: boolean
  /**
   * Cuánto lleva perdido su grupo respecto al pelotón, en fracción del tiempo de carrera. Es la
   * medida de «ya no pinta nada aquí»: quien va camino de llegar fuera de control es el que se baja.
   */
  lostFraction: number
  /**
   * Arrastra una caída SERIA de esta etapa (`minor` o `major`, v20). Es el corredor en apuros de
   * §VI.3: el que se ha caído fuerte, va tocado y ya no puede coger la rueda de nadie.
   */
  hurt: boolean
  /** Cuántos van en su grupo. Ir SOLO es la mitad de lo que significa estar en apuros. */
  groupSize: number
}

/**
 * ¿Se retira? La regla de §VI.3 es «tanque a cero LEJOS DE META de forma SOSTENIDA», y las tres
 * palabras cuentan:
 *
 * - **A cero** no basta: medido sobre la etapa 18 de una gran vuelta con el campo de tercera semana,
 *   el 100 % del pelotón cruza la meta con el tanque vacío (docs/balance.md, «la reina real de
 *   tercera semana»). Una regla que solo mirase `energy <= 0` retiraría a la carrera entera.
 * - **Sostenido**: hay que llevar `collapseSustainedKm` arrastrándose, no un bloque de 100 m.
 * - **Lejos de meta**: a diez kilómetros de la línea nadie se baja de la bici, se llega como sea.
 *
 * Y dos filtros más, los que hacen que la cuenta salga donde sale en la vida y no en media carrera:
 *
 * - **Hay que ir DESCOLGADO.** El que sigue en el grupo de cabeza vacío no abandona, se agarra: se
 *   juega algo. (Se probó pedir además que se hubiera «dejado ir» —`gaveUp`, regla 8— y es una
 *   condición IMPOSIBLE de cumplir a la vez que esta: `administerEffort` solo sortea dentro de los
 *   últimos `giveUpKm` = 25 km y el colapso exige estar a más de 30 km de meta.)
 * - **Hay que ir CAMINO DE QUEDAR FUERA DE CONTROL** (`collapseMinLostFraction`). Es el filtro que
 *   de verdad separa a los tres que se bajan de los ciento setenta que también llegan vacíos: en la
 *   etapa reina de una gran vuelta el pelotón ENTERO cruza la meta con el tanque a cero, así que sin
 *   esto la única regulación era el tope del 4 %, y un tope que se toca todos los días no es una
 *   salvaguarda, es la calibración. Uno se baja de la bici cuando ya sabe que no llega a tiempo.
 */
export function shouldCollapse(ctx: CollapseContext): boolean {
  if (ctx.inFrontGroup) return false
  if (ctx.kmToGo < STAGE.collapseMinKmToGo) return false
  if (ctx.lostFraction < STAGE.collapseMinLostFraction) return false
  return ctx.bonkKm >= STAGE.collapseSustainedKm || isInTrouble(ctx)
}

/**
 * EL CORREDOR EN APUROS (v20, docs/motor.md §VI.3). La segunda vía del colapso, y la única que de
 * verdad se dispara en una gran vuelta.
 *
 * La primera —la pájara sostenida— es INALCANZABLE y ahora está medido: sobre una gran vuelta entera
 * el `bonkKm` máximo de un descolgado a más de 30 km de meta es **0,0**, porque con el depósito
 * re-anclado en la v15 nadie está vaciado tan lejos de casa. No se toca (describe algo verdadero y
 * saltará el día que un recorrido lo produzca), pero por sí sola dejaba la tercera causa de §VI.3 en
 * el 0 % de los abandonos.
 *
 * Ésta dice lo que pasa en carretera: **el que se baja de la bici es el que se ha caído fuerte y se
 * ha quedado SOLO**. Las dos mitades cuentan, y por eso son dos condiciones y no una:
 *
 * - **Tocado** (`hurt`): una caída `minor` o `major`. No es una categoría inventada para esto, son
 *   exactamente las que `injuryEndsRace` ya sacaba de la carrera al día siguiente; lo que cambia es
 *   que una parte de ellas se resuelve donde de verdad se resuelve, en la cuneta.
 * - **Solo** (`groupSize <= collapseHurtMaxGroup`): mientras vas en un autobús que se releva, llegas.
 *   El herido no va en autobús porque `dropOut` ya no se lo da (ver `simulate.ts`), y ésta es la
 *   condición que lo dice en la regla en vez de darlo por hecho.
 *
 * Más las dos que comparte con la otra vía y que son las que impiden la hemorragia: lejos de meta
 * —a diez kilómetros se llega como sea— y ya perdiendo de verdad.
 */
function isInTrouble(ctx: CollapseContext): boolean {
  return ctx.hurt && ctx.groupSize <= STAGE.collapseHurtMaxGroup
}

/**
 * Intensidad (por km) con que se retira el que ya cumple `shouldCollapse`. No es un interruptor:
 * abandonar es una decisión que se toma en algún momento del calvario, no en el metro exacto en que
 * se cumple la condición.
 *
 * La vía de la PÁJARA crece con lo que lleve arrastrándose de más. La del CORREDOR EN APUROS no
 * crece: la caída ya ocurrió y el daño no va a más kilómetro a kilómetro, lo que decide es cuánto
 * tiempo le queda por delante para tomar la decisión. Se toma la mayor de las dos, que es lo que
 * corresponde a un corredor que cumpla las dos cosas a la vez.
 */
export function collapseLambda(ctx: CollapseContext): number {
  const extra = Math.max(0, ctx.bonkKm - STAGE.collapseSustainedKm)
  const bonk =
    ctx.bonkKm >= STAGE.collapseSustainedKm
      ? STAGE.lambdaCollapse * (1 + STAGE.collapseLambdaGrowthPerKm * extra)
      : 0
  return Math.max(bonk, isInTrouble(ctx) ? STAGE.lambdaCollapseHurt : 0)
}

// --- Fuera de control (causa «corte de tiempo» de §VI.3) -------------------------------------

/**
 * DUREZA de la etapa en desnivel positivo por km. Es la magnitud con la que el ciclismo real
 * escala el corte de tiempo (un coeficiente por dificultad), y la única que el motor puede medir
 * sobre el recorrido sin que se la digan desde fuera.
 *
 * Medido sobre el calendario: una llana real da 0,8-3 m/km, una media montaña 5-14 y una etapa
 * reina 15-26 (docs/balance.md, «v14»).
 */
export function elevationGainPerKm(blocks: readonly Block[]): number {
  if (blocks.length === 0) return 0
  let gain = 0
  // Con dx = 0,1 km, un bloque al g % sube exactamente g metros: g/100 · 100 m.
  for (const b of blocks) if (b.g > 0) gain += b.g * (STAGE.dx / 0.1)
  return gain / (blocks.length * STAGE.dx)
}

/**
 * Fracción del tiempo del ganador que marca el corte (docs/motor.md §VI.3): **8 % en llana, hasta
 * 18 % en la reina**, interpolado por la dureza del recorrido.
 */
export function timeCutFraction(gainPerKm: number): number {
  const hardness = clamp(gainPerKm / STAGE.timeCutHardnessGainPerKm, 0, 1)
  return STAGE.timeCutFlat + (STAGE.timeCutQueen - STAGE.timeCutFlat) * hardness
}

/** Un grupo de meta a efectos del corte: cuántos llegaron juntos y con qué tiempo. */
export interface FinishGroup {
  size: number
  timeS: number
}

/** Qué le pasa a cada grupo señalado por el corte. */
export interface TimeCutOutcome {
  /** Índices (sobre la lista de entrada) de los grupos ELIMINADOS: fuera de control. */
  eliminated: number[]
  /** Índices de los grupos READMITIDOS con penalización: el corte les señaló y no caben en el tope. */
  readmitted: number[]
}

/**
 * Aplica el corte de tiempo CONTRA EL GRUPO, no contra el corredor suelto, con las dos salvaguardas
 * de §VI.3 (los grupos llegan ordenados de más rápido a más lento):
 *
 * 1. **El corte se mide por grupos.** Un corredor no queda eliminado por llegar 5 s detrás de su
 *    grupeto: o cae el grupo entero o no cae nadie. Es la regla real y es además la salvaguarda que
 *    hacía imposible implementar esto antes de que el reagrupamiento funcionara.
 * 2. **Tope por etapa** (`budget`): como mucho un 4 % del pelotón que tomó la salida se va en un
 *    día. Se elimina de MÁS LENTO a menos lento mientras quepa en el tope, y en cuanto un grupo no
 *    cabe, ese y todos los que van por delante de él se READMITEN CON PENALIZACIÓN, que es lo que
 *    hace el jurado cuando llega un grupo numeroso fuera de control.
 */
export function applyTimeCut(
  groups: readonly FinishGroup[],
  limitS: number,
  budget: number,
): TimeCutOutcome {
  const flagged: number[] = []
  for (let i = 0; i < groups.length; i++) if (groups[i]!.timeS > limitS) flagged.push(i)
  const eliminated: number[] = []
  const readmitted: number[] = []
  let left = Math.max(0, budget)
  // De más lento a menos lento: el que más lejos ha quedado del corte es el primero en irse.
  for (let k = flagged.length - 1; k >= 0; k--) {
    const idx = flagged[k]!
    const size = groups[idx]!.size
    if (readmitted.length === 0 && size <= left) {
      eliminated.push(idx)
      left -= size
    } else {
      readmitted.push(idx)
    }
  }
  eliminated.sort((a, b) => a - b)
  readmitted.sort((a, b) => a - b)
  return { eliminated, readmitted }
}
