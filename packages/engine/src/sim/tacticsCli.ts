/**
 * Banco de la CAPA TÁCTICA: `pnpm sim:tactics [runs]` (docs/motor.md §13).
 *
 * `pnpm sim` vigila que el balance no se rompa; esto mide lo que la capa táctica PROMETE, que es
 * otra cosa: que dos carreras no se parezcan, que fracasar sea lo normal, que la general de una
 * carrera llana pueda abrirse, que un final en alto lo pueda decidir un ataque y que el agotado se
 * deje ir sin irse fuera de control. Solo lectura: no toca base de datos ni red.
 */
import { campaignSeeds, flatScenario, queenScenario, queenThirdWeekScenario } from './scenarios.js'
import {
  analyzeAttribution,
  analyzeChase,
  analyzeGiveUp,
  analyzeSharjah,
  analyzeUphillFinish,
  analyzeVariety,
  grandTourSprintField,
  proSprintField,
  sharjahField,
} from './tactics.js'

function main(): void {
  const runs = Number(process.argv[2] ?? 120)

  const flat = flatScenario()
  const flatVar = analyzeVariety(flat, campaignSeeds(flat.name, runs))
  console.log(`\n1) Variedad — "${flat.name}", ${flatVar.runs} semillas\n`)
  console.log(
    `  intentos por etapa   mediana ${flatVar.attemptsMedian} (min ${flatVar.attemptsMin}, max ${flatVar.attemptsMax})`,
  )
  console.log(`  intentos que cuajan  ${(100 * flatVar.prosperFraction).toFixed(1)}%`)
  console.log(
    `  fuga del día         sale en el km ${flatVar.breakKmMedian} (mediana) tras ${flatVar.triesBeforeBreakMedian} intentos fallidos (peor caso ${flatVar.triesBeforeBreakMax}) · sin fuga el ${flatVar.noBreakPct.toFixed(1)}% de las etapas`,
  )
  console.log(
    `  guiones distintos    ${flatVar.distinctScripts} de ${flatVar.runs} · ganadores distintos ${flatVar.distinctWinners}`,
  )
  console.log(
    `  ataques              en el ${flatVar.lateAttackPct.toFixed(1)}% de las etapas · gana un atacante el ${flatVar.attackerWinPct.toFixed(1)}%`,
  )

  const queen = queenScenario()
  const queenVar = analyzeVariety(queen, campaignSeeds(queen.name, runs))
  console.log(`\n2) Variedad — "${queen.name}", ${queenVar.runs} semillas\n`)
  console.log(
    `  intentos por etapa   mediana ${queenVar.attemptsMedian} (min ${queenVar.attemptsMin}, max ${queenVar.attemptsMax})`,
  )
  console.log(`  intentos que cuajan  ${(100 * queenVar.prosperFraction).toFixed(1)}%`)
  console.log(
    `  fuga del día         sale en el km ${queenVar.breakKmMedian} (mediana) tras ${queenVar.triesBeforeBreakMedian} intentos fallidos (peor caso ${queenVar.triesBeforeBreakMax}) · sin fuga el ${queenVar.noBreakPct.toFixed(1)}%`,
  )
  console.log(
    `  guiones distintos    ${queenVar.distinctScripts} de ${queenVar.runs} · ganadores distintos ${queenVar.distinctWinners}`,
  )

  const uphill = analyzeUphillFinish(queen, campaignSeeds(queen.name, runs))
  console.log(`\n4) Regla 9 — final en alto ("${queen.name}"), ${uphill.runs} semillas\n`)
  console.log(
    `  desenlace por ATAQUE ${uphill.attackDecidedPct.toFixed(1)}% · por desgaste de ritmo ${uphill.attritionPct.toFixed(1)}%`,
  )
  console.log(
    `  ataques por etapa    mediana ${uphill.attacksMedian} · margen mediano del ganador ${uphill.medianMargin}s`,
  )

  const tired = queenThirdWeekScenario()
  const give = analyzeGiveUp(tired, campaignSeeds(tired.name, Math.max(20, Math.round(runs / 2))))
  console.log(`\n5) Regla 8 — el agotado que se deja ir ("${tired.name}"), ${give.runs} semillas\n`)
  console.log(
    `  se dejan ir          mediana ${give.giveUpsMedian} por etapa · en el ${give.stagesWithGiveUpPct.toFixed(1)}% de las etapas`,
  )
  console.log(
    `  peor retraso         ${give.worstLossPct.toFixed(1)}% sobre el tiempo del ganador (fuera de control: 8-18%)`,
  )

  // 6) La caza depende del campo (docs/balance.md, v10): las MISMAS cinco etapas llanas corridas por
  // una carrera modesta y por una gran vuelta con cinco trenes.
  const chaseRuns = Math.max(4, Math.round(runs / 12))
  const modest = analyzeChase(sharjahField(), 'caza-modesta', chaseRuns)
  const pro = analyzeChase(proSprintField(), 'caza-proseries', chaseRuns)
  const wt = analyzeChase(grandTourSprintField(), 'caza-gran-vuelta', chaseRuns)
  console.log(`\n6) La caza según el campo — 5 etapas llanas × ${chaseRuns} semanas\n`)
  for (const [name, st] of [
    ['carrera modesta ', modest],
    ['ProSeries       ', pro],
    ['gran vuelta     ', wt],
  ] as const) {
    console.log(
      `  ${name}  fuerza ${st.force.toFixed(2)} (${st.trains} trenes) · sin sprint masivo ${st.noBunchPct.toFixed(1)}% (mediana ${st.medianNoBunchPerWeek} de 5) · gana un escapado ${st.breakawayWinPct.toFixed(1)}%`,
    )
  }

  // 7) La atribución del trabajo (docs/balance.md, v11): las dos preguntas del dueño —quién tira
  // del pelotón y quién hizo el trabajo para cerrar— salen las veces justas, ni una ni veinte.
  console.log(`\n7) La atribución del trabajo — ${runs} semillas por escenario\n`)
  for (const sc of [flat, queen]) {
    const at = analyzeAttribution(sc, campaignSeeds(sc.name, runs))
    console.log(
      `  ${sc.name.padEnd(16)} quién tira: mediana ${at.pullsMedian} por etapa (min ${at.pullsMin}, max ${at.pullsMax}) · en la ventana 3-6 el ${at.pullsInWindowPct.toFixed(1)}% · ${at.pullNamesMedian} nombres por parte`,
    )
    console.log(
      `  ${''.padEnd(16)} quién cerró: ${at.catchesPerStage.toFixed(2)} capturas narradas por etapa, con autor el ${at.attributedPct.toFixed(1)}% · reparto en la fuga en el ${at.breakSharePct.toFixed(1)}% de las etapas`,
    )
  }

  const gcRuns = Math.max(4, Math.round(runs / 12))
  const gc = analyzeSharjah(gcRuns)
  console.log(`\n3) La general de Sharjah — ${gc.races} generales, ${gc.stages} etapas\n`)
  console.log(
    `  etapas con diferencias de tiempo reales  ${gc.stagesWithTimeGapsPct.toFixed(1)}% (mediana de ${gc.medianSameTime} de 40 con el tiempo del ganador)`,
  )
  console.log(
    `  el sprinter malo gana                    ${gc.sprinterGcWins}/${gc.races} generales · ${gc.sprinterStageWins}/${gc.stages} etapas`,
  )
  console.log(`  margen mediano de la general             ${gc.medianGcMargin}s`)
  console.log('')
}

main()
