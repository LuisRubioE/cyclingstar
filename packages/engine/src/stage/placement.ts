/**
 * LA COLOCACIÓN (R15a, docs/tactica.md paso 14).
 *
 * **Un escalar por corredor, `placement ∈ [0,1]`, 0 = cabeza del grupo.** Es el dato que el motor no
 * tenía en ninguna parte —la posición DENTRO de un grupo— y del que cuelgan el abanico, el sector,
 * el sprint, el tapón y el acordeón. Hasta aquí, cada uno de esos cinco sitios se lo inventaba con
 * un dado propio, y por eso ninguno podía contradecir a otro ni ser consecuencia de nada.
 *
 * La frontera de este fichero es la de siempre: **funciones puras y ningún estado**. El estado vive
 * en `simulate.ts` (un número por corredor, avanzado por kilómetro) y el coste vive en `cost.ts`,
 * porque es el sitio donde los cinco multiplicadores se suman UNA vez y se recortan UNA vez
 * (§9.1bis). Aquí solo están las leyes.
 */
import { STAGE } from '../constants.js'
import type { Phase } from './tactics.js'

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/**
 * DÓNDE ARRANCA CADA UNO: `0,5 + N(0, 0,15)`, o sea el grueso del pelotón en la mitad de la fila y
 * las colas a un lado y otro. No se siembra por calidad a propósito —colocarse es una acción, no un
 * atributo—: el que quiera ir delante que empuje, y eso lo cobra `placePushCost`.
 */
export function initialPlacement(z: number): number {
  return clamp(0.5 + STAGE.placement.initialSd * z, 0, 1)
}

/**
 * LA LEY DEL KILÓMETRO (R15a.1). Tres términos y ninguno es un adorno:
 *
 *  - **si no haces nada, retrocedes** (`driftPerKm`): el pelotón te come, y en cien kilómetros pasas
 *    de la primera fila a la cola. Ése es el acordeón visto desde dentro.
 *  - **si empujas, subes** (`gainPerKm · pushing`), y empujar cuesta —pero el coste no se cobra aquí
 *    sino en `cost.ts`, que es el único sitio donde se multiplica el bloque—.
 *  - **y el azar del pelotón** (`noise`), atenuado por TAC: el que lee la carrera se mueve menos por
 *    accidente. `1 − TAC/200` deja al TAC 100 con la mitad del ruido del TAC 0, no con cero: nadie
 *    controla del todo dónde acaba en una rotonda.
 *
 * `dkm` es el paso REAL en kilómetros, no un bloque: la regla se escribió por kilómetro y da lo
 * mismo llamarla diez veces con 0,1 que una con 1.
 */
export function placementStep(
  p: number,
  dkm: number,
  pushing: number,
  tac: number,
  z: number,
): number {
  const push = clamp(pushing, 0, 1)
  const ruido = STAGE.placement.noise * z * (1 - clamp(tac, 0, 200) / 200)
  return clamp(
    p + STAGE.placement.driftPerKm * dkm - STAGE.placement.gainPerKm * dkm * push + ruido,
    0,
    1,
  )
}

/**
 * ¿HAY ACORDEÓN AHORA MISMO? (R15a.2). «En el puesto ciento veinte se pagan arreones en cada
 * rotonda, cada pueblo y cada estrechamiento», y eso pasa en el llano nervioso: la aproximación y el
 * desenlace.
 *
 * El diseño añade `roadClass === 'revirada'` como tercera puerta. **`roadClass` no existe todavía**
 * —entra con la carretera del paso 1— y por eso esta guarda vale `false` mientras tanto, que es la
 * misma convención con la que R19 trata a sus guardas sin dato.
 */
export function accordionActive(phase: Phase): boolean {
  return phase === 'aproximacion' || phase === 'desenlace'
}

/**
 * EL TÉRMINO DEL ACORDEÓN, y **el «− media del grupo» es lo que lo hace legal**.
 *
 * Escrito como `× (1 + accordionGain·placement)` el acordeón subía el gasto MEDIO del pelotón entero
 * un 17,5 %, y eso es la economía del depósito, que ancla las cinco bandas de `erosion`. Escrito
 * contra la media del grupo **redistribuye**: el de delante paga menos, el de atrás más, y la suma
 * por grupo es cero por construcción.
 *
 * Y lleva su propio listón, que no es una perilla: `shelteredLeaderSavingPct ≤ 3 %`, el número que
 * la v38-2 §17 dejó medido el día que el dueño dijo que un líder arropado gasta LO MISMO.
 */
export function accordionTerm(p: number, mediaDelGrupo: number): number {
  return STAGE.placement.accordionGain * (p - mediaDelGrupo)
}

/** LO QUE CUESTA EMPUJAR, en bruto. `cost.ts` le resta la media del grupo. */
export function pushTerm(pushing: number): number {
  return STAGE.placement.pushCost * clamp(pushing, 0, 1)
}

/**
 * EL SPRINT (R15a.4): `placementSd` deja de ser un dado por tamaño de grupo y pasa a leer la
 * colocación de verdad. El que llega el 60.º de un pelotón no pierde el sprint por mala suerte:
 * lo pierde porque está el 60.º.
 */
export function placeFinishWeight(p: number): number {
  return 1 - STAGE.placement.finishMax * clamp(p, 0, 1)
}

/**
 * EL ENCAJONADO (R15a.4, S-445), que es **la causa que hoy falta**: el velocista que pierde llegando
 * entero y bien lanzado, sin que le gane nadie, porque no llegó a abrir.
 *
 * `lanes` sale del ancho de la carretera (R15b.4) y mientras no exista vale el valor por defecto de
 * `GroupView`. Que los carriles estén llenos se pregunta contando cuántos aspirantes van por delante
 * de éste: si caben menos de los que hay, el que va detrás del corte no tiene por dónde salir.
 */
export function isBoxed(p: number, aspirantesDelante: number, lanes: number): boolean {
  return p > STAGE.placement.boxedThreshold && aspirantesDelante >= Math.max(1, lanes)
}

/**
 * EL ÚLTIMO GIRO (R15a.4, S-446): en una curva, rotonda o estrechamiento dentro de los últimos 1,5
 * km el orden de paso es el de la colocación y CONGELA la posición hasta meta. Los tres primeros
 * salen con dos cuerpos y medio de ventaja; el decimoquinto ya no gana.
 *
 * Se devuelve en metros porque es lo que el remate sabe leer, y se convierte a ventaja de score
 * arriba: aquí no se decide cuánto vale un cuerpo.
 */
export function turnGainM(puestoEnElGiro: number): number {
  if (puestoEnElGiro >= STAGE.placement.turnWinners) return 0
  return STAGE.placement.turnGainM * (STAGE.placement.turnWinners - puestoEnElGiro)
}

/**
 * EL SECTOR (R15a.6): entrar a un tramo malo por detrás cuesta segundos y multiplica el dado de
 * percances. Las quince primeras posiciones de un pelotón de sesenta pasan; el que va 80.º, no.
 */
export function sectorEntryLossS(p: number): number {
  return p > STAGE.placement.sectorSafePlace ? STAGE.placement.sectorLossS : 0
}

/**
 * …Y EL ADOQUÍN COBRA POSICIÓN (S-480): la selección del sector escala con la posición.
 *
 * **Se hace escalando la λ del dado y NO moviendo el exponente atributo→velocidad**, que es
 * deliberado: el exponente del pavé es física, y éste es un paso que promete no tocarla.
 */
export function sectorLambdaScale(p: number): number {
  return STAGE.placement.sectorLambdaBase + STAGE.placement.sectorLambdaSlope * clamp(p, 0, 1)
}

/** Lo que el equipo necesita saber para decidir si abre el abanico (R15a.3b). */
export interface EchelonBid {
  /** Viento de lado, [0,1]. */
  vientoLateral: number
  /** Colocación media de los leales presentes. */
  placeLeales: number
  /** ¿Hay un rival de general amenazante, y dónde se le VE (con creencia, R24)? */
  placeVictima: number | null
  /** Lo gastado del presupuesto del día, [0,1]. */
  spent: number
}

/**
 * EL ABANICO TIENE AUTOR (R15a.3b, S-165: «en gran vuelta el abanico lo provocan los equipos de la
 * general con sus rodadores y sus jefes colocados, para sacar minutos a un favorito mal colocado»).
 *
 * Hasta aquí el abanico era un dado por kilómetro: pasaba, y no lo decidía nadie. El invariante 60
 * («el abanico tiene autor» ≥ 50 %) medía entonces algo que ninguna regla producía. Esto es la
 * decisión, y la evalúa el DIRECTOR, no el corredor: hay con qué (viento), los míos están colocados,
 * hay a quién hacérselo y **le veo mal colocado** —leído con error—, y me queda presupuesto.
 *
 * El precio va aparte y es el que hace que no se intente todos los días: presupuesto × 1,4 y, si el
 * corte no cuaja, dos hombres menos en el final.
 */
export function echelonAttempt(b: EchelonBid): boolean {
  if (b.vientoLateral < STAGE.placement.echelonWindMin) return false
  if (b.placeLeales > STAGE.placement.echelonReadyPlace) return false
  if (b.placeVictima === null) return false
  if (b.placeVictima < STAGE.placement.echelonVictimPlace) return false
  return b.spent <= STAGE.placement.echelonBudgetMax
}

/**
 * EL BAJADOR (R15a.7, S-465): con un peón que baje bien delante, la carta baja A SU RUEDA y no
 * pierde. Sin él cede veinte segundos en un descenso decisivo **sin que nadie le ataque**, que es
 * exactamente la forma en que se pierde una clásica de montaña.
 */
export function descentLossS(tieneBajador: boolean, lluvia: boolean): number {
  if (tieneBajador) return 0
  return STAGE.placement.descentNoHelperS * (lluvia ? 2 : 1)
}
