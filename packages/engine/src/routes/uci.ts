/**
 * Modelo de clases UCI (SPEC 8, sistema real). Cada carrera tiene una clase que fija su prestigio y
 * la escala de puntos que reparte. Las clases reales:
 *  - .UWT  UCI WorldTour (máxima categoría)
 *  - .Pro  ProSeries
 *  - .1    Clase 1 del circuito continental (un día o por etapas)
 *  - .2    Clase 2 del circuito continental
 *  - .NC   Campeonato nacional
 * Puro y determinista: solo datos y una curva de puntos por posición. Nada de aleatoriedad.
 */

export type RaceClass = 'UWT' | 'Pro' | '1' | '2' | 'NC'

export const RACE_CLASSES: RaceClass[] = ['UWT', 'Pro', '1', '2', 'NC']

export interface RaceClassInfo {
  id: RaceClass
  /** Etiqueta con el punto delante, como la escribe la UCI (.UWT, .Pro, .1, .2, .NC). */
  label: string
  /** Peso relativo de prestigio (para valoración de IA, récords y desempates). */
  prestige: number
  /**
   * Puntos al GANADOR según formato: vuelta por etapas (GC) o carrera de un día. La curva por
   * posición se deriva de este tope con `racePoints`. Valores inspirados en el baremo UCI real,
   * comprimidos para el MVP.
   */
  winner: { stageRace: number; oneDay: number }
}

export const RACE_CLASS_INFO: Record<RaceClass, RaceClassInfo> = {
  UWT: { id: 'UWT', label: '.UWT', prestige: 100, winner: { stageRace: 500, oneDay: 500 } },
  Pro: { id: 'Pro', label: '.Pro', prestige: 50, winner: { stageRace: 200, oneDay: 200 } },
  '1': { id: '1', label: '.1', prestige: 25, winner: { stageRace: 125, oneDay: 125 } },
  '2': { id: '2', label: '.2', prestige: 12, winner: { stageRace: 80, oneDay: 80 } },
  NC: { id: 'NC', label: '.NC', prestige: 40, winner: { stageRace: 100, oneDay: 100 } },
}

/**
 * Fracción de los puntos del ganador que recibe cada posición (1-based). Escala decreciente al
 * estilo UCI (el 2.º ~70%, el 3.º ~52%, …), con una cola hasta el puesto 40. Devuelve 0 fuera de
 * rango. Determinista y monótona no creciente.
 */
const POSITION_FRACTION = [
  1.0, 0.7, 0.52, 0.44, 0.38, 0.33, 0.28, 0.24, 0.2, 0.17, 0.15, 0.13, 0.11, 0.096, 0.084, 0.072,
  0.06, 0.052, 0.044, 0.038, 0.032, 0.028, 0.024, 0.02, 0.017, 0.015, 0.013, 0.011, 0.0096, 0.0084,
  0.0072, 0.006, 0.0052, 0.0044, 0.0038, 0.0032, 0.0028, 0.0024, 0.002, 0.0016,
]

/** Puntos de una carrera para una posición (1-based) dada su clase y si es vuelta por etapas. */
export function racePoints(cls: RaceClass, position: number, stageRace: boolean): number {
  if (position < 1 || position > POSITION_FRACTION.length) return 0
  const winner = RACE_CLASS_INFO[cls].winner[stageRace ? 'stageRace' : 'oneDay']
  return Math.round(winner * POSITION_FRACTION[position - 1]!)
}

/** Prestigio de una clase (peso para IA/récords). */
export function classPrestige(cls: RaceClass): number {
  return RACE_CLASS_INFO[cls].prestige
}
