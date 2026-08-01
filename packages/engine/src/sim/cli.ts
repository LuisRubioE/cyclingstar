/**
 * Simulador de consola: `pnpm sim [runs]` (SPEC 6.17, Pasos 25-26). Corre las campañas Montecarlo
 * de la etapa llana y de la etapa reina y compara los estadísticos con los rangos objetivo del
 * balance. Solo lectura: no toca base de datos ni red.
 */
import { analyzeFlat, analyzeMountain } from './analyze.js'
import { campaignSeeds, flatScenario, queenScenario } from './scenarios.js'

interface Target {
  label: string
  value: number
  min: number
  max: number
  unit: string
}

function line(t: Target): string {
  const ok = t.value >= t.min && t.value <= t.max
  const mark = ok ? '✓' : '✗'
  return `  ${mark} ${t.label.padEnd(34)} ${t.value.toFixed(1)}${t.unit}  (objetivo ${t.min}-${t.max}${t.unit})`
}

function report(name: string, runs: number, targets: Target[], extra?: string): boolean {
  console.log(`\nEscenario "${name}" — ${runs} simulaciones\n`)
  for (const t of targets) console.log(line(t))
  if (extra) console.log(`\n  ${extra}`)
  return targets.every((t) => t.value >= t.min && t.value <= t.max)
}

function main(): void {
  const runs = Number(process.argv[2] ?? 500)

  const flat = flatScenario()
  const flatStats = analyzeFlat(flat, campaignSeeds(flat.name, runs))
  const flatOk = report(
    'llana-180',
    flatStats.runs,
    [
      { label: 'Gana la fuga', value: flatStats.breakawayWinPct, min: 2, max: 8, unit: '%' },
      {
        label: 'Gana el mejor sprinter',
        value: flatStats.bestSprinterWinPct,
        min: 30,
        max: 45,
        unit: '%',
      },
      {
        label: 'Captura mediana (km a meta)',
        value: flatStats.medianCatchKmToFinish,
        min: 8,
        max: 25,
        unit: '',
      },
    ],
    `Capturas: ${flatStats.capturePct.toFixed(0)}% de las etapas`,
  )

  const queen = queenScenario()
  const mtnStats = analyzeMountain(queen, campaignSeeds(queen.name, runs))
  const mtnOk = report('reina-150', mtnStats.runs, [
    {
      label: 'Gana la fuga (montaña)',
      value: mtnStats.breakawayWinPct,
      min: 25,
      max: 45,
      unit: '%',
    },
    {
      label: 'Brecha 1º-10º (s)',
      value: mtnStats.medianTop10GapSeconds,
      min: 60,
      max: 240,
      unit: '',
    },
  ])

  console.log('')
  process.exit(flatOk && mtnOk ? 0 : 1)
}

main()
