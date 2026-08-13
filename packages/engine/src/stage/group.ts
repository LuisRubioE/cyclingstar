/**
 * Los grupos como relojes paralelos (SPEC 6.3). La simulación mueve grupos, no puntos: cada
 * grupo es un cursor sobre el recorrido con su cronómetro acumulado `tS`. Los boquetes no se
 * estiman, se integran bloque a bloque; una captura es la fusión de dos relojes que se juntan.
 */
import { STAGE } from '../constants.js'
import { type AccOptions, blockSeconds, stepSpeed, targetSpeed } from './physics.js'
import type { Block } from './types.js'

/** Un grupo de corredores rodando juntos, con su reloj y su estado social (SPEC 6.3, 6.10). */
export interface Group {
  id: string
  riderIds: string[]
  /** Cronómetro acumulado en segundos desde la salida. */
  tS: number
  /** Velocidad actual en km/h (arranca en 35 tras la salida neutralizada). */
  vActual: number
  /** Compromiso [0,1]: 0 tempo, 1 a bloque (SPEC 6.4, 6.9). */
  compromiso: number
  /** Cooperación [0,1]: fracción de relevadores (SPEC 6.10). */
  coop: number
  /**
   * Tensión acumulada de la fuga (SPEC 6.10, docs/motor.md §13 regla 6). Cada grupo escapado la
   * acumula `breakawayTensionPerKm` por kilómetro y, pasado `breakawayTensionThreshold`, el pacto
   * se rompe: los ataques internos se disparan (`breakawayTensionAttackFactor`) y la cooperación
   * de lo que salga de ahí se recorta (`breakawayTensionCoopFactor`).
   */
  tension: number
}

export interface GroupInit {
  compromiso?: number
  coop?: number
  vActual?: number
  tS?: number
  tension?: number
}

/** Crea un grupo con los valores iniciales del SPEC 6.3 (velocidad 35 km/h tras la salida). */
export function createGroup(id: string, riderIds: string[], init: GroupInit = {}): Group {
  return {
    id,
    riderIds: [...riderIds],
    tS: init.tS ?? 0,
    vActual: init.vActual ?? STAGE.initialSpeed,
    compromiso: init.compromiso ?? STAGE.commitIdle,
    coop: init.coop ?? 1,
    tension: init.tension ?? 0,
  }
}

/** P75 de una lista de valores (interpolación lineal). Marca el ritmo del grupo (SPEC 6.4). */
export function percentile75(values: number[]): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]!
  const sorted = [...values].sort((a, b) => a - b)
  const rank = 0.75 * (sorted.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  const frac = rank - lo
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * frac
}

/**
 * Avanza un grupo un bloque (SPEC 6.4, 6.16). `p75Perfil` es el P75 del perfil efectivo de
 * quienes marcan el ritmo. Devuelve un grupo nuevo: la velocidad persigue a la objetivo con
 * aceleraciones acotadas y el reloj suma el tiempo del bloque a la velocidad ya actualizada.
 */
export function advanceGroup(
  group: Group,
  block: Block,
  p75Perfil: number,
  opts: AccOptions = {},
  dx: number = STAGE.dx,
): Group {
  const vObjetivo = targetSpeed(block, p75Perfil, group.compromiso)
  // `dt de entrada`: la cota de aceleración usa la velocidad de entrada al bloque (SPEC 6.4).
  const dtIn = blockSeconds(group.vActual, dx)
  const vActual = stepSpeed(group.vActual, vObjetivo, block.g, dtIn, opts)
  const tS = group.tS + blockSeconds(vActual, dx)
  return { ...group, vActual, tS }
}

/** Boquete en segundos entre dos grupos al cruzar el mismo bloque (SPEC 6.3). */
export function gapSeconds(a: Group, b: Group): number {
  return Math.abs(a.tS - b.tS)
}

/** ¿Se capturan? El boquete cayó a 5 s o menos (SPEC 6.3). */
export function isCapture(a: Group, b: Group): boolean {
  return gapSeconds(a, b) <= STAGE.captureGapSeconds
}

/**
 * Fusiona dos grupos en uno (captura, SPEC 6.3). El grupo resultante hereda el reloj del que va
 * delante (menor `tS`) y su velocidad; la cooperación y la tensión se promedian.
 */
export function mergeGroups(a: Group, b: Group): Group {
  const [front, back] = a.tS <= b.tS ? [a, b] : [b, a]
  return {
    id: front.id,
    riderIds: [...front.riderIds, ...back.riderIds],
    tS: front.tS,
    vActual: front.vActual,
    compromiso: Math.max(front.compromiso, back.compromiso),
    coop: (front.coop + back.coop) / 2,
    // Dos grupos que se juntan traen su historia: la tensión resultante es la media de las dos.
    tension: (front.tension + back.tension) / 2,
  }
}

/**
 * Un grupo de la carretera visto por el parte de ventaja: cuánta gente lleva y si SIGUE EN CARRERA
 * —la fuga, los movimientos y el pelotón— o es un grupeto de descolgados.
 */
export interface ChaseCandidate {
  size: number
  racing: boolean
}

/** Un grupo de la carretera para decidir cuál es el principal: su id y cuánta gente lleva. */
export interface RoadGroup {
  id: string
  size: number
}

/**
 * QUIÉN ES EL PELOTÓN (v29, docs/motor.md §6.3).
 *
 * Los grupos del motor se llaman por su ORIGEN: `peloton` es el que salió del pelotón, `shed-N` el
 * que se descolgó de él, `mov-N` el que atacó. Esos nombres no caducan. Un grupo que nació del
 * pelotón sigue llamándose «pelotón» aunque le queden dos corredores, y un `shed-N` sigue siendo
 * «grupeto» aunque lleve cien. La Race Radio de Race Andalucía e1 lo enseña en una línea:
 *
 * ```
 * km 151  [1] fuga 1  [2] contra 1  [3] pelotón 2  [4] grupeto 15  …  cola 100 en 4 grupos
 * ```
 *
 * Un «pelotón» de DOS corredores con cien detrás llamados «grupeto». Y de esa etiqueta cuelgan la
 * crónica entera y las decisiones que miden huecos: de ahí salieron tres parches sucesivos —v17
 * (`majorityOnTheRoad`), v25 (`gapChaseMainFraction`) y v27 (`chaseReferenceIndex`)— que son tres
 * aproximaciones al mismo hecho que el motor no representaba.
 *
 * La regla que faltaba es corta: **el pelotón es el grupo que lleva la gente**. Con dos matices que
 * no son de gusto:
 *
 * - **Histéresis.** Cuando el pelotón se parte en dos mitades parecidas, la etiqueta no puede bailar
 *   cada bloque: el retador tiene que SUPERAR al actual por un margen (`takeover`) para quitarle el
 *   nombre. Es el caso que la v17 dejó deliberadamente «cerca del centro», y sin margen dos grupos
 *   de 55 y 53 se intercambiarían el título kilómetro sí, kilómetro no.
 * - **Si el grupo que tenía el título ya no existe** —se ha fundido con otro o se ha quedado vacío—
 *   no hay nada que conservar y manda el tamaño.
 *
 * Puro y total: el desempate por id hace que dos grupos del mismo tamaño den siempre la misma
 * respuesta, venga como venga la lista.
 */
export function mainGroupId(
  groups: readonly RoadGroup[],
  current: string | null,
  takeover: number,
): string | null {
  if (groups.length === 0) return null
  const biggest = groups.reduce((mx, g) =>
    g.size > mx.size || (g.size === mx.size && g.id < mx.id) ? g : mx,
  )
  const held = current === null ? undefined : groups.find((g) => g.id === current)
  if (held === undefined) return biggest.id
  return biggest.size >= held.size * takeover ? biggest.id : held.id
}

/**
 * CONTRA QUIÉN SE MIDE LA VENTAJA (v25 + v27, SPEC 6.15 y docs/motor.md §16). Es la regla que decide qué
 * grupo de los que van detrás es «la persecución» en cada parte, y vive aquí —pura y probada— porque
 * de ella salieron los dos defectos que más han estropeado un diario:
 *
 * - **v25**: era el primer reloj de detrás sin más, así que un puente en solitario en tierra de nadie
 *   se convertía en «la caza» mientras el pelotón de 127 tiraba. De ahí sale el listón de MAGNITUD:
 *   la referencia tiene que llevar al menos una fracción de la gente del mayor que va detrás.
 * - **v27**: ese «mayor que va detrás» incluía a los DESCOLGADOS, y tras una criba masiva el mayor de
 *   detrás es un grupeto. En Race Andalucía (119 → 13 en el km 26, con 80 fuera) la ventaja se midió
 *   trece kilómetros contra un grupeto a casi siete minutos mientras la etapa la decidían seis
 *   hombres que iban mucho más cerca.
 *
 * La regla, en orden:
 *
 * 1. Los candidatos son los que SIGUEN EN CARRERA y no van solos. Un descolgado no vuelve, y un
 *    hombre suelto en tierra de nadie no es un grupo perseguidor: su historia la cuentan
 *    `bridge_made` y `bridge_failed`.
 * 2. Si no hay ninguno —el pelotón va en cabeza y detrás solo quedan grupetos, o la carrera se ha
 *    quedado en cuatro corredores— la referencia se busca entre TODOS los de detrás: es la carrera
 *    que hay, y callarse la ventaja sería peor.
 * 3. Entre los candidatos manda la carretera: el PRIMERO que llegue al listón de magnitud, para que
 *    la referencia sea siempre la más cercana de las que cuentan.
 *
 * `behind` viene en orden de carretera (el más cercano primero). Devuelve el índice elegido, o -1 si
 * no hay nadie detrás.
 */
export function chaseReferenceIndex(
  behind: readonly ChaseCandidate[],
  mainFraction: number,
): number {
  if (behind.length === 0) return -1
  const pool = behind.filter((x) => x.racing && x.size >= 2)
  const candidates = pool.length > 0 ? pool : behind
  const biggest = candidates.reduce((mx, x) => Math.max(mx, x.size), 0)
  const chosen = candidates.find((x) => x.size >= biggest * mainFraction) ?? candidates[0]!
  return behind.indexOf(chosen)
}
