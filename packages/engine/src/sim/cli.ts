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
import { analyzeTeamVoice, teamedField } from './tactics.js'
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
  //
  // Y desde la v15 la TERCERA SEMANA se mide sobre la etapa reina REAL (Race France e18, 185 km),
  // no sobre la sintética: la banda de §VI.1 no se ha movido, se ha movido el punto de medida. La
  // caricatura de 1.200 m arrastraba la curva del depósito fuera de la fórmula de §VI.1 y con ella
  // la reina de verdad saturaba al 100 % de pájaras (docs/balance.md, «v15»).
  const realQueen = realQueenThirdWeekScenario()
  const longClassic = longClassicScenario()
  const hardest = hardestClassicScenario()
  // Una clásica de 250-280 km cuesta ~6 veces más de simular que la llana canónica: menos corridas.
  const classicRuns = Math.max(6, Math.round(runs / 20))
  const flatEro = analyzeErosion(flat, campaignSeeds(flat.name, runs))
  const queenEro = analyzeErosion(queen, campaignSeeds(queen.name, runs))
  const tiredEro = analyzeErosion(realQueen, campaignSeeds(realQueen.name, classicRuns))
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
    `Gasto mediano del tanque: llana ${(100 * flatEro.medianDepletion).toFixed(0)}% · reina ${(100 * queenEro.medianDepletion).toFixed(0)}% · reina REAL 3.ª semana ${(100 * tiredEro.medianDepletion).toFixed(0)}% (pájaras ${tiredEro.bonkPct.toFixed(0)}%, ${classicRuns} corridas) · clásica larga ${(100 * longEro.medianDepletion).toFixed(0)}% · más dura ${(100 * hardEro.medianDepletion).toFixed(0)}% (pájaras ${hardEro.bonkPct.toFixed(0)}%, ${classicRuns} corridas)`,
  )

  // Medida INFORMATIVA (no bloquea): la reina SINTÉTICA de tercera semana, que hasta la v14 era el
  // objetivo. Se sigue imprimiendo porque es la referencia histórica de toda la calibración del
  // depósito, pero ya no manda: 1.200 m de desnivel no son una etapa reina, y anclar §VI.1 en ella
  // era lo que rompía la de verdad. Erosiona MENOS, y eso es lo correcto.
  const tired = queenThirdWeekScenario()
  const synthEro = analyzeErosion(tired, campaignSeeds(tired.name, runs))
  console.log(
    `\nInformativo — ${tired.name} (reina SINTÉTICA de 1.200 m, tercera semana, ${runs} corridas)\n`,
  )
  console.log(
    `  erosión mediana ${synthEro.medianErosion.toFixed(3)} · gasto ${(100 * synthEro.medianDepletion).toFixed(0)}% · pájaras ${synthEro.bonkPct.toFixed(0)}%  (referencia histórica: era el objetivo hasta la v14 — ver docs/balance.md, «v15»)`,
  )

  // EL PLAN DE EQUIPO (docs/motor.md §V.1): la voz de la crónica. Es el único objetivo del banco
  // que se mide sobre un campo CON EQUIPOS —los escenarios canónicos son de agentes libres y por
  // construcción no pueden decir nada de esto— y responde a la pregunta del dueño: ¿puede el parte
  // de «quién tira» nombrar a un equipo, o siempre es una alianza de corredores sueltos?
  const teamRuns = Math.max(20, Math.round(runs / 5))
  const teamed = teamedField({ teams: 8, per: 5, kind: 'llana', strong: 4 })
  const voice = analyzeTeamVoice(teamed, flat.input.profile, campaignSeeds('voz-llana', teamRuns))
  const voiceOk = report(
    'plan de equipo (8 equipos × 5, llana)',
    voice.runs,
    [
      { target: TARGETS.chronicle.teamPullFlatPct, value: voice.teamVoicePct },
      { target: TARGETS.chronicle.frontTeamsPerStage, value: voice.frontTeamsAvg },
      { target: TARGETS.chronicle.teamPullWithReasonPct, value: voice.withReasonPct },
    ],
    `Partes de relevo medidos: ${voice.pulls} sobre grupo grande · motivos: etapa ${voice.reasons.etapa} · maillot ${voice.reasons.maillot} · general ${voice.reasons.general} · sin motivo ${voice.reasons.sinMotivo}`,
  )

  // ABANDONOS (docs/motor.md §VI.3): la única medida del banco que no sale de una etapa suelta.
  // Correr una gran vuelta de 21 etapas con 176 corredores cuesta ~22 s, así que el número de
  // vueltas no escala con `runs`: son unas pocas y su MEDIA, que es lo que el objetivo mide.
  const tourRuns = Math.max(4, Math.min(12, Math.round(runs / 60)))
  const gt = analyzeGrandTour(tourRuns)
  const totalCauses =
    gt.causes.fueraControl + gt.causes.lesion + gt.causes.colapso + gt.causes.enfermedad
  const share = (n: number): string => `${Math.round((100 * n) / Math.max(1, totalCauses))}%`
  // La COLA de la carrera por tipo de etapa (v16, docs/motor.md §9): cuánto pierde el último y
  // cuántas etapas terminan con el pelotón entero al mismo segundo. El desglose por TIPO no es
  // adorno: en una llana que acaba al sprint el pelotón entero comparte tiempo y eso es CORRECTO;
  // en una reina, no.
  const tailLine = (name: string, t: (typeof gt.tails)['reina']): string =>
    `${name.padEnd(6)} ${t.stages.toString().padStart(3)} etapas · último grupo ${t.medianLastGroupPct.toFixed(1).padStart(5)}% (peor ${t.maxLastGroupPct.toFixed(1)}%) · ${t.medianGroups} grupos en meta · mismo segundo ${t.oneGroupPct.toFixed(0)}%`
  const gtOk = report(
    'gran vuelta (21 etapas, 176 corredores)',
    tourRuns,
    [
      { target: TARGETS.grandTour.abandonPct, value: gt.abandonPct },
      { target: TARGETS.grandTour.queenLastGroupPct, value: gt.tails.reina.medianLastGroupPct },
    ],
    [
      `Terminan ${gt.medianFinishers} de 176 (mediana) · por vuelta ${gt.minAbandonPct.toFixed(1)}-${gt.maxAbandonPct.toFixed(1)}%`,
      `Causas: fuera de control ${share(gt.causes.fueraControl)} (objetivo 45%) · lesión ${share(gt.causes.lesion)} (40%) · colapso ${share(gt.causes.colapso)} + enfermedad ${share(gt.causes.enfermedad)} (15%)`,
      `Salvaguardas: tope del 4% tocado en ${gt.capHitStages} etapas · ${gt.readmitted} readmitidos con penalización en ${gt.readmissionStages} etapas`,
      tailLine('reina', gt.tails.reina),
      tailLine('media', gt.tails.media),
      tailLine('llana', gt.tails.llana),
    ].join('\n  '),
  )

  console.log('')
  process.exit(flatOk && mtnOk && ttOk && eroOk && voiceOk && gtOk ? 0 : 1)
}

main()
