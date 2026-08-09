/**
 * Análisis Montecarlo de una campaña de etapas (SPEC 6.17). Corre el mismo escenario con muchas
 * semillas y agrega los estadísticos que validan los invariantes de balance.
 */
import { simulateStage } from '../stage/simulate.js'
import type { Scenario } from './scenarios.js'

export interface FlatStats {
  runs: number
  /** % de etapas que gana la fuga (objetivo 2-8%). */
  breakawayWinPct: number
  /** % que gana el mejor sprinter del campo (objetivo 30-45%). */
  bestSprinterWinPct: number
  /** % de las etapas CON fuga en que la fuga es cazada. */
  capturePct: number
  /** % de etapas en que llega a formarse una fuga del día. */
  breakFormedPct: number
  /** Km a meta de la captura, mediana (objetivo entre 25 y 8). */
  medianCatchKmToFinish: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/** Corre la campaña llana y agrega los estadísticos de los invariantes de llano (SPEC 6.17). */
export function analyzeFlat(scenario: Scenario, seeds: string[]): FlatStats {
  const totalKm = scenario.input.profile.segments.reduce((s, seg) => s + seg.km, 0)
  let breakawayWins = 0
  let bestSprinterWins = 0
  let breaks = 0
  const catchKmToFinish: number[] = []

  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    const formed = out.events.find((e) => e.tipo === 'fuga_formada')
    const caught = out.events.find((e) => e.tipo === 'fuga_cazada')
    const winner = out.results[0]?.riderId
    // «Gana la fuga» = la etapa se gana DESDE LA CARRETERA: el ganador llega en un grupo escapado.
    // Antes se medía como «el ganador estaba en la lista del evento fuga_formada y no hubo
    // captura», que con capa táctica deja fuera al que llegó a la fuga por un puente y al que se
    // fue en un ataque posterior — la mitad de los casos (docs/balance.md, v9).
    if (out.events.find((e) => e.tipo === 'meta')?.datos?.fuga === 1) breakawayWins += 1
    if (winner === scenario.bestSprinterId) bestSprinterWins += 1
    if (formed) breaks += 1
    if (caught) catchKmToFinish.push(totalKm - caught.km)
  }

  const runs = seeds.length
  return {
    runs,
    breakawayWinPct: (100 * breakawayWins) / runs,
    bestSprinterWinPct: (100 * bestSprinterWins) / runs,
    // Sobre las etapas EN QUE LLEGÓ A HABER FUGA: la fuga del día ya no está garantizada —a veces
    // el pelotón no da cuerda a nadie— y mezclar los dos casos hacía que «cuando hay fuga, ¿se
    // caza?» dependiera de con qué frecuencia se forma, que es otra pregunta.
    capturePct: breaks === 0 ? 0 : (100 * catchKmToFinish.length) / breaks,
    breakFormedPct: (100 * breaks) / runs,
    medianCatchKmToFinish: median(catchKmToFinish),
  }
}

export interface MountainStats {
  runs: number
  /** % de etapas que gana la fuga en montaña (objetivo 25-45%). */
  breakawayWinPct: number
  /** Brecha mediana entre el 1º y el 10º del día, en segundos (objetivo 60-240). */
  medianTop10GapSeconds: number
}

/** Corre la etapa reina y agrega los invariantes de montaña (SPEC 6.17). */
export function analyzeMountain(scenario: Scenario, seeds: string[]): MountainStats {
  let breakawayWins = 0
  const top10Gaps: number[] = []

  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    if (out.events.find((e) => e.tipo === 'meta')?.datos?.fuga === 1) breakawayWins += 1
    if (out.results.length >= 10) {
      top10Gaps.push(out.results[9]!.tiempoS - out.results[0]!.tiempoS)
    }
  }

  const runs = seeds.length
  return {
    runs,
    breakawayWinPct: (100 * breakawayWins) / runs,
    medianTop10GapSeconds: median(top10Gaps),
  }
}

export interface ErosionStats {
  runs: number
  /** Erosión mediana del campo al cruzar la meta (docs/motor.md §VI.1). */
  medianErosion: number
  /** Vaciado mediano del tanque, en fracción de E0. */
  medianDepletion: number
  /** % de corredores que terminan con pájara (tanque a cero). */
  bonkPct: number
}

/**
 * Corre una campaña y agrega el DESGASTE (docs/motor.md §VI.1). Sin esto la erosión no se podía
 * medir desde fuera y llevaba tiempo valiendo 0.000 en todas las etapas sin que nadie lo notara.
 */
export function analyzeErosion(scenario: Scenario, seeds: string[]): ErosionStats {
  const erosions: number[] = []
  const depletions: number[] = []
  let bonked = 0
  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    for (const t of out.tank.values()) {
      erosions.push(t.erosion)
      depletions.push(t.depletion)
      if (t.energy <= 0) bonked += 1
    }
  }
  return {
    runs: seeds.length,
    medianErosion: median(erosions),
    medianDepletion: median(depletions),
    bonkPct: erosions.length === 0 ? 0 : (100 * bonked) / erosions.length,
  }
}

export interface TimeTrialStats {
  runs: number
  /** Brecha percentil 90 a 10 del campo, mediana en segundos (objetivo 120-240). */
  medianP90MinusP10Seconds: number
  /** % de cronos que gana un especialista (id que empieza por "cri-"). */
  specialistWinPct: number
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!
}

/** Corre la contrarreloj y agrega el invariante de crono (SPEC 6.17). */
export function analyzeTimeTrial(scenario: Scenario, seeds: string[]): TimeTrialStats {
  const spreads: number[] = []
  let specialistWins = 0
  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    const times = out.results.map((r) => r.tiempoS).sort((a, b) => a - b)
    spreads.push(percentile(times, 0.9) - percentile(times, 0.1))
    if (out.results[0]?.riderId.startsWith('cri-')) specialistWins += 1
  }
  const runs = seeds.length
  return {
    runs,
    medianP90MinusP10Seconds: median(spreads),
    specialistWinPct: (100 * specialistWins) / runs,
  }
}
