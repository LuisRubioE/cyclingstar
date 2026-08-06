/**
 * Simulador de consola: `pnpm sim [runs]` (SPEC 6.17, Pasos 25-26). Corre las campañas Montecarlo
 * de la etapa llana, la etapa reina, la contrarreloj y el desgaste, y compara los estadísticos con
 * los rangos objetivo del balance. Solo lectura: no toca base de datos ni red.
 *
 * Los rangos NO se escriben aquí: salen de `sim/targets.ts`, la misma fuente que usan los
 * invariantes de CI. Antes estaban duplicados y divergentes, y por eso `pnpm sim` salía en rojo
 * mientras CI pasaba en verde (docs/motor.md §3-bis-h).
 */
import { analyzeErosion, analyzeFlat, analyzeMountain, analyzeTimeTrial } from './analyze.js'
import {
  campaignSeeds,
  flatScenario,
  queenScenario,
  queenThirdWeekScenario,
  timeTrialScenario,
} from './scenarios.js'
import { TARGETS, type Target } from './targets.js'

interface Measurement {
  target: Target
  value: number
}

function line(m: Measurement): string {
  const { target: t, value } = m
  const ok = value >= t.min && value <= t.max
  const decimals = t.unit === '%' || t.max > 10 ? 1 : 3
  return `  ${ok ? '✓' : '✗'} ${t.label.padEnd(34)} ${value.toFixed(decimals)}${t.unit}  (objetivo ${t.min}-${t.max}${t.unit})`
}

function report(name: string, runs: number, rows: Measurement[], extra?: string): boolean {
  console.log(`\nEscenario "${name}" — ${runs} simulaciones\n`)
  for (const m of rows) console.log(line(m))
  if (extra) console.log(`\n  ${extra}`)
  return rows.every((m) => m.value >= m.target.min && m.value <= m.target.max)
}

function main(): void {
  const runs = Number(process.argv[2] ?? 500)

  const flat = flatScenario()
  const flatStats = analyzeFlat(flat, campaignSeeds(flat.name, runs))
  const flatOk = report(
    flat.name,
    flatStats.runs,
    [
      { target: TARGETS.flat.breakawayWinPct, value: flatStats.breakawayWinPct },
      { target: TARGETS.flat.bestSprinterWinPct, value: flatStats.bestSprinterWinPct },
      { target: TARGETS.flat.catchKmToFinish, value: flatStats.medianCatchKmToFinish },
    ],
    `Capturas: ${flatStats.capturePct.toFixed(0)}% de las etapas`,
  )

  const queen = queenScenario()
  const mtnStats = analyzeMountain(queen, campaignSeeds(queen.name, runs))
  const mtnOk = report(queen.name, mtnStats.runs, [
    { target: TARGETS.mountain.breakawayWinPct, value: mtnStats.breakawayWinPct },
    { target: TARGETS.mountain.top10GapSeconds, value: mtnStats.medianTop10GapSeconds },
  ])

  const tt = timeTrialScenario()
  const ttStats = analyzeTimeTrial(tt, campaignSeeds(tt.name, runs))
  const ttOk = report(tt.name, ttStats.runs, [
    { target: TARGETS.timeTrial.p90MinusP10Seconds, value: ttStats.medianP90MinusP10Seconds },
    { target: TARGETS.timeTrial.specialistWinPct, value: ttStats.specialistWinPct },
  ])

  // Desgaste (docs/motor.md §VI.1): la tabla de objetivos del Cambio 0.
  const tired = queenThirdWeekScenario()
  const flatEro = analyzeErosion(flat, campaignSeeds(flat.name, runs))
  const queenEro = analyzeErosion(queen, campaignSeeds(queen.name, runs))
  const tiredEro = analyzeErosion(tired, campaignSeeds(tired.name, runs))
  const eroOk = report(
    'desgaste',
    runs,
    [
      { target: TARGETS.erosion.flatFresh, value: flatEro.medianErosion },
      { target: TARGETS.erosion.queenFresh, value: queenEro.medianErosion },
      { target: TARGETS.erosion.queenThirdWeek, value: tiredEro.medianErosion },
    ],
    `Gasto mediano del tanque: llana ${(100 * flatEro.medianDepletion).toFixed(0)}% · reina ${(100 * queenEro.medianDepletion).toFixed(0)}% · reina 3.ª semana ${(100 * tiredEro.medianDepletion).toFixed(0)}% (pájaras ${tiredEro.bonkPct.toFixed(0)}%)`,
  )

  console.log('')
  process.exit(flatOk && mtnOk && ttOk && eroOk ? 0 : 1)
}

main()
