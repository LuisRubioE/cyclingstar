/**
 * LA HIPÓTESIS DE R28.2, MEDIDA POR FIN (docs/tactica.md §7.5 y §8, paso 0).
 *
 * R28.2 afirma que **el escalador gana menos cuanto más valle queda tras la última cota**, y sobre
 * esa afirmación cuelga el `queenFinalMix` que el paso 1 quiere justificar. Estaba **sin medir**, y
 * el plan decía que se podía medir «sobre las ~157 a coste ≈ 0 cruzando resultados que ya existen».
 * Las dos mitades de esa frase eran falsas: `analyzeCalendarQueens` **simula y no guarda nada**, así
 * que no hay resultados que cruzar, y la muestra es de una etapa de cada seis.
 *
 * Un win-rate por etapa hay que SIMULARLO. Sobre las 157 con 8 semillas son ≈ 1.256 etapas, unas
 * seis veces el CI entero. Así que se mide donde el diseño decidió: **la muestra de 27 con 8
 * semillas** (≈ 216 etapas), **una vez y fuera de CI**, y el número se publica en la v60 §0.
 *
 * La GEOMETRÍA —en qué cubeta cae cada etapa— sí se calcula sobre las 157: `queenGeometry`.
 */
import type { FinalKind } from '../routes/finalKind.js'
import { simulateStage } from '../stage/simulate.js'
import { calendarQueenSample } from './calendarQueens.js'
import { realQueenSetup } from './realQueens.js'

/** El percentil de MON a partir del cual un corredor cuenta como escalador, según R28.2. */
export const CLIMBER_PCT = 0.85

export interface ClimberBucket {
  kind: FinalKind
  stages: number
  runs: number
  /** % de esas corridas ganadas por un corredor del cuartil alto de MON. */
  climberWinPct: number
}

export interface ClimberWinRateStats {
  runsPerStage: number
  buckets: ClimberBucket[]
  /** Sobre la muestra entera, para poder leer las cubetas contra algo. */
  overallClimberWinPct: number
}

/** El umbral de MON del campo del día: quién es escalador se decide CONTRA el pelotón que corre. */
function climberThreshold(mons: number[]): number {
  const s = [...mons].sort((a, b) => a - b)
  const pos = CLIMBER_PCT * (s.length - 1)
  const bajo = Math.floor(pos)
  const alto = Math.min(s.length - 1, bajo + 1)
  return s[bajo]! + (s[alto]! - s[bajo]!) * (pos - bajo)
}

/**
 * Corre la muestra y devuelve el win-rate del escalador por cubeta de final.
 *
 * `runsPerStage` es 8 en la medida publicada. Con 27 etapas eso deja ≥ 20 corridas en las cubetas
 * pobladas, que es lo que hace falta para ver la diferencia de 20 puntos que la hipótesis afirma.
 */
export function analyzeClimberWinRate(runsPerStage: number): ClimberWinRateStats {
  const muestra = calendarQueenSample()
  const acc = new Map<FinalKind, { stages: number; runs: number; wins: number }>()
  let runs = 0
  let wins = 0
  for (const q of muestra) {
    if (q.finalKind === null) continue
    const cubeta = acc.get(q.finalKind) ?? { stages: 0, runs: 0, wins: 0 }
    cubeta.stages += 1
    for (let i = 0; i < runsPerStage; i++) {
      const { input, seed } = realQueenSetup(
        { raceId: q.raceId, stageIndex: q.stageIndex, why: '' },
        i,
      )
      const umbral = climberThreshold(input.riders.map((r) => r.eff0.MON as number))
      const out = simulateStage(input, seed)
      const ganador = out.results[0]
      if (ganador === undefined) continue
      const suMon = input.riders.find((r) => r.riderId === ganador.riderId)?.eff0.MON
      cubeta.runs += 1
      runs += 1
      if (suMon !== undefined && (suMon as number) >= umbral) {
        cubeta.wins += 1
        wins += 1
      }
    }
    acc.set(q.finalKind, cubeta)
  }
  const orden: FinalKind[] = ['alto', 'cima_cerca', 'valle_corto', 'valle_largo']
  return {
    runsPerStage,
    overallClimberWinPct: runs === 0 ? 0 : (100 * wins) / runs,
    buckets: orden
      .filter((k) => acc.has(k))
      .map((kind) => {
        const c = acc.get(kind)!
        return {
          kind,
          stages: c.stages,
          runs: c.runs,
          climberWinPct: c.runs === 0 ? 0 : (100 * c.wins) / c.runs,
        }
      }),
  }
}
