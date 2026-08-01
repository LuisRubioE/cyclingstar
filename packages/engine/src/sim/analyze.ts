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
  /** % de etapas en que la fuga es cazada. */
  capturePct: number
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
  const catchKmToFinish: number[] = []

  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    const formed = out.events.find((e) => e.tipo === 'fuga_formada')
    const caught = out.events.find((e) => e.tipo === 'fuga_cazada')
    const winner = out.results[0]?.riderId
    if (winner && formed?.protagonistas.includes(winner) && !caught) breakawayWins += 1
    if (winner === scenario.bestSprinterId) bestSprinterWins += 1
    if (caught) catchKmToFinish.push(totalKm - caught.km)
  }

  const runs = seeds.length
  return {
    runs,
    breakawayWinPct: (100 * breakawayWins) / runs,
    bestSprinterWinPct: (100 * bestSprinterWins) / runs,
    capturePct: (100 * catchKmToFinish.length) / runs,
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
    const formed = out.events.find((e) => e.tipo === 'fuga_formada')
    const caught = out.events.find((e) => e.tipo === 'fuga_cazada')
    const winner = out.results[0]?.riderId
    if (winner && formed?.protagonistas.includes(winner) && !caught) breakawayWins += 1
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
