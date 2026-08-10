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
import { analyzeGrandTour } from './grandTour.js'
import {
  campaignSeeds,
  flatScenario,
  hardestClassicScenario,
  longClassicScenario,
  queenScenario,
  queenThirdWeekScenario,
  realQueenThirdWeekScenario,
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

  // Desgaste (docs/motor.md §VI.1): la tabla de objetivos del Cambio 0 más la clásica larga.
  // Las dos clásicas corren su RECORRIDO REAL con el campo homogéneo, así que lo único que explica
  // su erosión es el trazado; con perfiles sintéticos esto no se veía y tres clásicas saturaron.
  const tired = queenThirdWeekScenario()
  const longClassic = longClassicScenario()
  const hardest = hardestClassicScenario()
  // Una clásica de 250-280 km cuesta ~6 veces más de simular que la llana canónica: menos corridas.
  const classicRuns = Math.max(6, Math.round(runs / 20))
  const flatEro = analyzeErosion(flat, campaignSeeds(flat.name, runs))
  const queenEro = analyzeErosion(queen, campaignSeeds(queen.name, runs))
  const tiredEro = analyzeErosion(tired, campaignSeeds(tired.name, runs))
  const longEro = analyzeErosion(longClassic, campaignSeeds(longClassic.name, classicRuns))
  const hardEro = analyzeErosion(hardest, campaignSeeds(hardest.name, classicRuns))
  const eroOk = report(
    'desgaste',
    runs,
    [
      { target: TARGETS.erosion.flatFresh, value: flatEro.medianErosion },
      { target: TARGETS.erosion.queenFresh, value: queenEro.medianErosion },
      { target: TARGETS.erosion.longClassicFresh, value: longEro.medianErosion },
      { target: TARGETS.erosion.queenThirdWeek, value: tiredEro.medianErosion },
      { target: TARGETS.erosion.hardestClassicFresh, value: hardEro.medianErosion },
    ],
    `Gasto mediano del tanque: llana ${(100 * flatEro.medianDepletion).toFixed(0)}% · reina ${(100 * queenEro.medianDepletion).toFixed(0)}% · reina 3.ª semana ${(100 * tiredEro.medianDepletion).toFixed(0)}% (pájaras ${tiredEro.bonkPct.toFixed(0)}%) · clásica larga ${(100 * longEro.medianDepletion).toFixed(0)}% · más dura ${(100 * hardEro.medianDepletion).toFixed(0)}% (pájaras ${hardEro.bonkPct.toFixed(0)}%, ${classicRuns} corridas)`,
  )

  // Medida INFORMATIVA (no bloquea): la etapa reina REAL de gran vuelta en la tercera semana. Es el
  // punto ciego que dejaban los escenarios sintéticos y hoy sale mal a propósito —está en
  // docs/balance.md como defecto abierto—: se imprime en cada corrida para que deje de ser invisible
  // mientras no se re-ancle §VI.1 sobre una reina realista. No se convierte en objetivo todavía
  // porque arreglarlo es una recalibración completa del depósito, no una perilla.
  const realQueen = realQueenThirdWeekScenario()
  const realQueenEro = analyzeErosion(realQueen, campaignSeeds(realQueen.name, classicRuns))
  console.log(
    `\nInformativo — ${realQueen.name} (Race France e18, 185 km, tercera semana, ${classicRuns} corridas)\n`,
  )
  console.log(
    `  erosión mediana ${realQueenEro.medianErosion.toFixed(3)} · gasto ${(100 * realQueenEro.medianDepletion).toFixed(0)}% · pájaras ${realQueenEro.bonkPct.toFixed(0)}%  (objetivo de diseño 0.60-0.85 y pájaras marginales — ver docs/balance.md, «la reina real de tercera semana»)`,
  )

  // ABANDONOS (docs/motor.md §VI.3): la única medida del banco que no sale de una etapa suelta.
  // Correr una gran vuelta de 21 etapas con 176 corredores cuesta ~22 s, así que el número de
  // vueltas no escala con `runs`: son unas pocas y su MEDIA, que es lo que el objetivo mide.
  const tourRuns = Math.max(4, Math.min(12, Math.round(runs / 60)))
  const gt = analyzeGrandTour(tourRuns)
  const totalCauses =
    gt.causes.fueraControl + gt.causes.lesion + gt.causes.colapso + gt.causes.enfermedad
  const share = (n: number): string => `${Math.round((100 * n) / Math.max(1, totalCauses))}%`
  const gtOk = report(
    'gran vuelta (21 etapas, 176 corredores)',
    tourRuns,
    [{ target: TARGETS.grandTour.abandonPct, value: gt.abandonPct }],
    [
      `Terminan ${gt.medianFinishers} de 176 (mediana) · por vuelta ${gt.minAbandonPct.toFixed(1)}-${gt.maxAbandonPct.toFixed(1)}%`,
      `Causas: fuera de control ${share(gt.causes.fueraControl)} (objetivo 45%) · lesión ${share(gt.causes.lesion)} (40%) · colapso ${share(gt.causes.colapso)} + enfermedad ${share(gt.causes.enfermedad)} (15%)`,
      `Salvaguardas: tope del 4% tocado en ${gt.capHitStages} etapas · ${gt.readmitted} readmitidos con penalización en ${gt.readmissionStages} etapas`,
    ].join('\n  '),
  )

  console.log('')
  process.exit(flatOk && mtnOk && ttOk && eroOk && gtOk ? 0 : 1)
}

main()
