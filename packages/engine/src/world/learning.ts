import { ATTRIBUTES, type Attribute, type RaceClass } from '@cyclingstar/shared'
import { LEARNING, TRAINING } from '../constants.js'
import { kAge, kDim } from '../progression.js'

/**
 * LO QUE SE APRENDE CORRIENDO (docs/epics.md «G1», cuarta pata). Puro y determinista.
 *
 * Esta regla existía y funcionaba desde hace tiempo, pero vivía dentro de `packages/db`
 * (`stageRun.ts`) como dos constantes sueltas y un bucle. Se saca aquí por una razón concreta y no
 * por ordenar: **el banco de mundo no podía alcanzarla**, así que la única pieza del juego que sabe
 * medir lo que le pasa a una población con los años era ciega justamente a la mitad de la
 * progresión que ocurre compitiendo. Un banco que no lleva algo no puede medirlo, y ahí es donde
 * los defectos viven para siempre.
 */

/**
 * QUÉ TE ENSEÑA CADA TERRENO. Lo que el día te obliga a hacer es lo que se te queda: una llana te
 * hace rodar y rematar, una reina te hace subir, una clásica te curte en el muro y el adoquín.
 */
export const STAGE_LEARNING_ATTRS: Record<string, readonly Attribute[]> = {
  llana: ['LLA', 'SPR'],
  // DES entra en las de montaña: lo que baja un puerto es lo que te enseña a bajarlo, y hasta aquí
  // el descenso solo se podía entrenar con una sesión. LLA entra en la crono y en la clásica por lo
  // mismo: son kilómetros de rodar a tope.
  media: ['MON', 'LLA', 'DES'],
  reina: ['MON', 'COL', 'DES'],
  cri: ['CRI', 'LLA'],
  clasica: ['COL', 'PAV', 'LLA'],
}

/**
 * …Y LA TÁCTICA SIEMPRE, corras lo que corras. Es la única que no depende del terreno, y es
 * deliberado: la ayuda del propio atributo lo dice —«race intelligence… learned by racing, not just
 * training»— y colocarse, leer un final y elegir el momento se aprenden en cualquier carrera.
 */
const SIEMPRE: Attribute = 'TAC'

export interface RaceLearningInput {
  /** La clase de la carrera: es lo que hace que el Tour enseñe más que una .2. */
  raceClass: RaceClass
  /** El terreno del día (`llana`, `media`, `reina`, `cri`, `clasica`). */
  kind: string
  attributes: Readonly<Record<Attribute, number>>
  ceilings: Readonly<Record<Attribute, number>>

  // ── v2: quién eres, qué hiciste y cómo acabaste ───────────────────────────────────────────────
  // Todo opcional: sin ello la fórmula se comporta como la v1, que es lo que permite que el banco y
  // la producción entren por el mismo sitio aunque uno sepa menos que el otro.

  /** Talento [0,100]. El mismo `kTal` que el entrenamiento: aprender es aprender. */
  talent?: number
  age?: number
  declineAge?: number
  /**
   * Cuánto se vació: 0 escondido todo el día, 1 sin nada en el depósito. Sale de `output.tank`, que
   * vive en memoria en la misma transacción donde se llama a esto.
   */
  depletion?: number
  /** Puesto en la etapa. Ganar enseña más que entrar el 150.º, y solo en TAC. */
  puesto?: number | null
  /** Si trabajó para otro ese día. El gregario aprende oficio, aunque no salga en la foto. */
  trabajoParaOtro?: boolean
  /** `finish` · `abandon` · `dnf`. El que se bajó corrió media carrera y aprendió media. */
  estado?: string
  /** Qué número de etapa es dentro de su carrera: encadenar días es lo que enseña a recuperar. */
  stageIndex?: number
}

/**
 * Lo que sube cada atributo por haber CORRIDO esta etapa, en puntos (v2).
 *
 * La v1 era `raceBase · nivel · margen/30` y nada más: daba igual la edad, el talento, lo que
 * hiciste ese día y cómo acabaste. Un veterano de 34 escondido en el pelotón aprendía lo mismo que
 * un neopro que se vació en la fuga, y el que ganó lo mismo que el 150.º.
 *
 * **Y el comentario de la v1 afirmaba algo falso**: decía que `margen/30` «es el mismo `kDim` dicho
 * de otra forma». No lo es, y la diferencia es de orden: `margen/30` es LINEAL y `kDim` es
 * superlineal con un denominador de 45, así que cerca del techo `kDim` frena y `margen/30` no. Con
 * solo el lineal, todo el que corría acababa clavado en su techo a los 22-24. Ahora los dos frenos
 * se multiplican, que es lo que estabiliza el margen en vez de cerrarlo.
 *
 * El precio está medido y declarado en `docs/balance.md` «v59 §1»: correr enseña **la mitad** de
 * puntos brutos. Se paga porque la alternativa es un mundo en el que a los 23 nadie tiene margen.
 */
export function raceLearning(input: RaceLearningInput): Partial<Record<Attribute, number>> {
  const porTerreno = STAGE_LEARNING_ATTRS[input.kind] ?? []
  const cuales = new Set<Attribute>([...porTerreno, SIEMPRE])
  /**
   * REC SE APRENDE ENCADENANDO DÍAS, no corriendo uno. A partir de la quinta etapa de una carrera el
   * cuerpo está aprendiendo a repararse entre esfuerzos, y eso es exactamente lo que REC mide. Una
   * carrera de tres días no lo enseña, y por eso el listón es la etapa y no el terreno.
   */
  const enVuelta = (input.stageIndex ?? 0) >= LEARNING.recStageIndexMin
  if (enVuelta) cuales.add('REC')

  const nivel = LEARNING.raceClassFactor[input.raceClass] ?? 1
  const kTal = TRAINING.kTalentBase + (input.talent ?? 40) / 100
  const esfuerzo = LEARNING.effortBase + LEARNING.effortScale * (input.depletion ?? 0.5)
  const kDnf =
    input.estado === undefined || input.estado === 'finish'
      ? 1
      : input.estado === 'abandon' || input.estado === 'dnf'
        ? LEARNING.dnfFactor
        : 0

  /** Solo sobre TAC: ganar enseña a ganar, y trabajar para otro enseña oficio. Se toma el mayor. */
  const resultadoTac = Math.max(
    input.puesto === 1 ? LEARNING.resultTacWin : 1,
    input.puesto != null && input.puesto <= 10 ? LEARNING.resultTacTop10 : 1,
    input.trabajoParaOtro === true ? LEARNING.resultTacWork : 1,
  )

  const out: Partial<Record<Attribute, number>> = {}
  for (const attr of ATTRIBUTES) {
    if (!cuales.has(attr)) continue
    const actual = input.attributes[attr]
    const techo = input.ceilings[attr] ?? 100
    const margen = Math.max(0, techo - actual)
    if (margen <= 0) continue
    const reloj =
      input.age === undefined ? 1 : kAge(attr, input.age, input.declineAge ?? input.age + 8)
    let gain =
      LEARNING.raceBase *
      nivel *
      kTal *
      reloj *
      kDim(actual, techo) *
      esfuerzo *
      (attr === 'TAC' ? resultadoTac : 1) *
      kDnf *
      (margen / LEARNING.raceMarginRef)
    // REC se aprende a media ración: es un efecto de acumulación, no el trabajo del día.
    if (attr === 'REC' && !porTerreno.includes('REC')) gain *= LEARNING.recShare
    if (gain <= 0) continue
    out[attr] = Math.min(techo - actual, Math.min(gain, LEARNING.raceDailyCap))
  }
  return out
}

/**
 * LO QUE DEJA UNA VUELTA ENTERA, más allá de lo que dejó cada etapa (SPEC 5.4, forma simple).
 *
 * Tres semanas de carrera construyen fondo de una forma que la suma de veintiún días sueltos no
 * explica: es el clásico «llegó del Tour volando». Se aplica UNA vez, al cerrar la última etapa de
 * una carrera de cinco etapas o más, y va a `RES` con su propio origen en la bitácora para que el
 * informe del bloque pueda decir de dónde salió.
 *
 * Deliberadamente SIN máquina de estados de «pendiente de liberar»: esa versión —donde la ganancia
 * se libera solo si descansas después— puede hacer que una gran vuelta enseñe MENOS que hoy, y
 * «no subiste porque no descansaste» es lo más difícil de explicar que hay. Queda para una decisión
 * con su propio interruptor.
 */
export function tourSupercompensation(input: {
  stages: number
  attributes: Readonly<Record<Attribute, number>>
  ceilings: Readonly<Record<Attribute, number>>
  talent?: number
  age?: number
  declineAge?: number
}): number {
  if (input.stages < LEARNING.supercompMinStages) return 0
  const techo = input.ceilings.RES ?? 100
  const actual = input.attributes.RES
  if (techo - actual <= 0) return 0
  const kTal = TRAINING.kTalentBase + (input.talent ?? 40) / 100
  const reloj =
    input.age === undefined ? 1 : kAge('RES', input.age, input.declineAge ?? input.age + 8)
  const bruto = LEARNING.supercompResPerStage * input.stages * kTal * reloj * kDim(actual, techo)
  return Math.min(techo - actual, bruto)
}
