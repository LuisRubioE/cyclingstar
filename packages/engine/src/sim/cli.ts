/**
 * Simulador de consola: `pnpm sim [runs]` (SPEC 6.17, Paso 25). Corre una campaña Montecarlo de
 * la etapa llana y compara los estadísticos con los rangos objetivo del balance. Solo lectura:
 * no toca base de datos ni red.
 */
import { analyzeFlat } from './analyze.js'
import { campaignSeeds, flatScenario } from './scenarios.js'

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

function main(): void {
  const runs = Number(process.argv[2] ?? 500)
  const scenario = flatScenario()
  const seeds = campaignSeeds(scenario.name, runs)
  const stats = analyzeFlat(scenario, seeds)

  const targets: Target[] = [
    { label: 'Gana la fuga', value: stats.breakawayWinPct, min: 2, max: 8, unit: '%' },
    {
      label: 'Gana el mejor sprinter',
      value: stats.bestSprinterWinPct,
      min: 30,
      max: 45,
      unit: '%',
    },
    {
      label: 'Captura mediana (km a meta)',
      value: stats.medianCatchKmToFinish,
      min: 8,
      max: 25,
      unit: '',
    },
  ]

  console.log(`\nEscenario "${scenario.name}" — ${stats.runs} simulaciones\n`)
  for (const t of targets) console.log(line(t))
  console.log(`\n  Capturas: ${stats.capturePct.toFixed(0)}% de las etapas\n`)

  const allOk = targets.every((t) => t.value >= t.min && t.value <= t.max)
  process.exit(allOk ? 0 : 1)
}

main()
