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
import { analyzeClimbs } from './climbs.js'
import { abandonMix, analyzeGrandTour } from './grandTour.js'
import { REAL_QUEENS, analyzeRealQueens, colombiaRegressionTails } from './realQueens.js'
import { REAL_TIME_TRIALS, analyzeRealTimeTrials } from './timeTrials.js'
import { SMALL_TOURS, analyzeSmallTours } from './smallTours.js'
import { analyzeTeamVoice, teamedField } from './tactics.js'
import { STAGE } from '../constants.js'
import {
  campaignSeeds,
  flatScenario,
  mediumMountainScenario,
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

  /**
   * MEDIA MONTAÑA (v38) — INFORMATIVO, todavía sin banda. Es el hueco que señaló el dueño: el banco
   * tenía dos caricaturas (una llana que es g = 0 durante 180 km y una reina que es un solo puerto
   * al 8 %) y ningún término medio. Se imprime sin objetivo a propósito: primero se mide qué hace el
   * motor con siete cotas cortas, y las bandas se deciden mirando esos números, no al revés.
   */
  const media = mediumMountainScenario()
  const mediaStats = analyzeFlat(media, campaignSeeds(media.name, runs))
  console.log(`\nInformativo — "${media.name}" (media montaña, ${mediaStats.runs} simulaciones)\n`)
  console.log(
    `  gana la fuga ${mediaStats.breakawayWinPct.toFixed(1)}% · gana el mejor sprinter ` +
      `${mediaStats.bestSprinterWinPct.toFixed(1)}% · se forma fuga en el ${mediaStats.breakFormedPct.toFixed(0)}% ` +
      `· captura mediana a ${mediaStats.medianCatchKmToFinish.toFixed(1)} km de meta`,
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

  // …y la crono sobre carreras REALES (v19), que es donde vivía el abanico: `cri-40` es un campo
  // estrecho de laboratorio y su brecha central estaba en verde mientras producción repartía el 46 %
  // de cola. Una crono cuesta poco de simular, así que el banco entero corre con 8 semillas.
  const ttRuns = Math.max(4, Math.round(runs / 60))
  const rtt = analyzeRealTimeTrials(ttRuns)
  const rttOk = report(
    `cronos REALES del calendario (${REAL_TIME_TRIALS.length} cronos × ${ttRuns} semillas)`,
    rtt.all.runs,
    [
      { target: TARGETS.timeTrials.tailPct, value: rtt.all.medianTailPct },
      { target: TARGETS.timeTrials.worstStagePct, value: rtt.worst.medianTailPct },
    ],
    rtt.perStage
      .map(
        (row) =>
          `${`${row.tt.raceId} e${row.tt.stageIndex}`.padEnd(24)} ${row.stats.km.toFixed(0).padStart(2)} km · ${String(row.stats.riders).padStart(3)} corredores · cola ${row.stats.medianTailPct.toFixed(1).padStart(5)}% (peor ${row.stats.maxTailPct.toFixed(1)}%) · ${row.stats.medianWinnerKmh.toFixed(1)} → ${row.stats.medianLastKmh.toFixed(1)} km/h · ${row.stats.medianCatches} alcances · corte ${row.stats.outOfTime} fuera`,
      )
      .join('\n  '),
  )

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
  // El REPARTO de causas (v20, docs/motor.md §VI.3), agrupado como lo agrupan las listas de
  // abandonos reales: la caída se cuenta entera —el que no sale mañana y el que se bajó hoy— y la
  // enfermedad absorbe el bloque de «no toma la salida». Ya no es un adorno del informe: es un
  // objetivo, porque durante tres tandas el total cuadró mientras la mezcla no.
  const mix = abandonMix(gt.causes)
  // La COLA de la carrera por tipo de etapa (v16, docs/motor.md §9): cuánto pierde el último y
  // cuántas etapas terminan con el pelotón entero al mismo segundo. El desglose por TIPO no es
  // adorno: en una llana que acaba al sprint el pelotón entero comparte tiempo y eso es CORRECTO;
  // en una reina, no.
  const tailLine = (name: string, t: (typeof gt.tails)['reina']): string =>
    `${name.padEnd(6)} ${t.stages.toString().padStart(3)} etapas · último grupo ${t.medianLastGroupPct.toFixed(1).padStart(5)}% (peor ${t.maxLastGroupPct.toFixed(1)}%) · ${t.medianGroups} grupos en meta · con el ganador ${t.medianWinnerGroupPct.toFixed(0)}% · mismo segundo ${t.oneGroupPct.toFixed(0)}%`
  const gtOk = report(
    'gran vuelta (21 etapas, 176 corredores)',
    tourRuns,
    [
      { target: TARGETS.grandTour.abandonPct, value: gt.abandonPct },
      { target: TARGETS.grandTour.queenLastGroupPct, value: gt.tails.reina.medianLastGroupPct },
      { target: TARGETS.abandonCauses.crashPct, value: mix.crashPct },
      { target: TARGETS.abandonCauses.illnessPct, value: mix.illnessPct },
      { target: TARGETS.abandonCauses.outOfTimePct, value: mix.outOfTimePct },
    ],
    [
      `Terminan ${gt.medianFinishers} de 176 (mediana) · por vuelta ${gt.minAbandonPct.toFixed(1)}-${gt.maxAbandonPct.toFixed(1)}%`,
      `Corredores: caída ${gt.causes.lesion} sin tomar la salida + ${gt.causes.colapso} bajándose de la bici · enfermedad ${gt.causes.enfermedad} · fuera de control ${gt.causes.fueraControl}`,
      `Salvaguardas: tope del 4% tocado en ${gt.capHitStages} etapas · ${gt.readmitted} readmitidos con penalización en ${gt.readmissionStages} etapas`,
      tailLine('reina', gt.tails.reina),
      tailLine('media', gt.tails.media),
      tailLine('llana', gt.tails.llana),
    ].join('\n  '),
  )

  // LAS REINAS REALES (v17, docs/motor.md §9). El banco que le faltaba a la batería: la cola de la
  // carrera medida sobre etapas reina REALES del calendario elegidas por FORMA —finales en alto y
  // finales rodados, de 151 a 232 km, de WorldTour a continental—. La gran vuelta del banco mide
  // siempre la misma forma, y por eso no vio la regresión de Race Colombia e5.
  const queenRuns = Math.max(4, Math.min(12, Math.round(runs / 60)))
  const rq = analyzeRealQueens(queenRuns)
  const rqOk = report(
    `reinas REALES del calendario (${REAL_QUEENS.length} etapas × ${queenRuns} semillas)`,
    rq.all.stages,
    [
      { target: TARGETS.realQueens.lastGroupPct, value: rq.all.medianLastGroupPct },
      { target: TARGETS.realQueens.worstStagePct, value: rq.worst.medianLastGroupPct },
    ],
    rq.perStage
      .map(
        (row) =>
          `${`${row.queen.raceId} e${row.queen.stageIndex}`.padEnd(24)} último grupo ${row.stats.medianLastGroupPct.toFixed(1).padStart(5)}% (peor ${row.stats.maxLastGroupPct.toFixed(1)}%) · ${row.stats.medianGroups} grupos · con el ganador ${row.stats.medianWinnerGroupPct.toFixed(0)}% · 1.º-10.º ${row.stats.medianTop10GapSeconds}s`,
      )
      .join('\n  '),
  )

  // LAS CARRERAS PEQUEÑAS (v23, docs/motor.md §19). El banco con FORMA DE PRODUCCIÓN: `llana-180`
  // monta tres sprinters empatados a 84-86 de SPR y con eso el ganador lo decide el ruido; los
  // campos de producción tienen un mejor rematador CLARO y corren CARRERAS de varias etapas, que es
  // la pregunta que el dueño hace («Race Arabia: gana las 5») y que ningún invariante sobre una
  // etapa suelta puede contestar.
  const tourStages = SMALL_TOURS.length
  const smallRuns = Math.max(3, Math.min(8, Math.round(runs / 80)))
  const st = analyzeSmallTours(smallRuns)
  const stOk = report(
    `carreras PEQUEÑAS del calendario (${tourStages} carreras × ${smallRuns} semillas)`,
    st.share.races,
    [
      { target: TARGETS.smallTours.bestSprinterWinPct, value: st.share.bestSprinterWinPct },
      { target: TARGETS.smallTours.sweepPct, value: st.share.sweepPct },
      {
        target: TARGETS.smallTours.flatWinnerGroupPct,
        value: st.shapes.llana.medianWinnerGroupPct,
      },
      { target: TARGETS.smallTours.mediaGroups, value: st.shapes.media.medianGroups },
      { target: TARGETS.smallTours.mediaOneGroupPct, value: st.shapes.media.oneGroupPct },
      { target: TARGETS.smallTours.flatMoveWorstMarginS, value: st.flatMargins.maxMarginS },
      { target: TARGETS.smallTours.photoRepeatTopFive, value: st.photo.repeatTopFive },
      { target: TARGETS.smallTours.worstRacePhotoRepeat, value: st.photo.worstRepeatTopFive },
      { target: TARGETS.smallTours.sameWinnerPairPct, value: st.photo.sameWinnerPct },
    ],
    [
      `Llegadas agrupadas ${st.share.bunchStages} · ventaja en SPR del mejor sobre el 2.º ${st.share.medianEdge.toFixed(1)} · ganadores distintos ${st.share.distinctWinnerPct.toFixed(0)}% · barrido medido sobre ${st.share.sweepableRaces} carreras`,
      `Fugas que ganan en llano: ${st.flatMargins.wins} · margen mediano ${st.flatMargins.medianMarginS.toFixed(0)}s · de MINUTOS ${st.flatMargins.runawayPct.toFixed(0)}% · del término medio realista (5-60s) ${st.flatMargins.closePct.toFixed(0)}%`,
      // DEUDA MEDIDA de la v23 (ver `sim/targets.ts`): el grupo de cabeza de una reina. El encargo
      // pedía «5-15 juntos y no 1» y el motor da 1, así que la medida se IMPRIME y no lleva banda:
      // un objetivo que nace rojo no es un objetivo, y calibrar hacia él es una tanda entera.
      `DEUDA — grupo de cabeza (dentro de 30 s del ganador): llana ${st.shapes.llana.medianLeadGroupRiders} · media ${st.shapes.media.medianLeadGroupRiders} · reina ${st.shapes.reina.medianLeadGroupRiders} (una reina real deja 5-15)`,
      `Cribas lejos de meta narradas (peloton_selection, v21): ${st.shapes.todas.farSelections} en ${st.shapes.todas.stages} etapas`,
      `Foto de meta (${st.photo.pairs} pares de llegadas agrupadas de una misma carrera): mismo 1.º y 2.º ${st.photo.sameTopTwoPct.toFixed(0)}% · peor carrera ${st.photo.worstRaceId} ${st.photo.worstRepeatTopFive.toFixed(2)}/5 · favoritos del remate que siguen siéndolo el último día ${st.photo.favouritesKept.toFixed(2)}/5`,
      `Velocidad del ganador (guardarraíl, NO objetivo): llana ${st.shapes.llana.medianWinnerKmh.toFixed(1)} · media ${st.shapes.media.medianWinnerKmh.toFixed(1)} · reina ${st.shapes.reina.medianWinnerKmh.toFixed(1)} km/h`,
      ...st.perRace.map(
        (row) =>
          `${row.tour.raceId.padEnd(18)} ${String(row.runs[0]?.riders ?? 0).padStart(3)} corredores · agrupadas ${String(row.share.bunchStages).padStart(3)} · gana el mejor ${row.share.bestSprinterWinPct.toFixed(0).padStart(3)}% · ${row.shape.medianGroups} grupos · con el ganador ${row.shape.medianWinnerGroupPct.toFixed(0)}% · mismo segundo ${row.shape.oneGroupPct.toFixed(0)}% · cola ${row.shape.medianLastGroupPct.toFixed(1)}%`,
      ),
    ].join('\n  '),
  )

  // LO QUE PASA DENTRO DE UN PUERTO (v26, `sim/climbs.ts`). El banco corre EXACTAMENTE las mismas
  // etapas reina reales de arriba —mismo campo, misma semilla— y solo cambia lo que mira: tres fotos
  // por puerto (pie, mitad y cima) con `StageProbe`. Es la única regla del banco que puede decir si
  // hay remontadas y hundimientos DENTRO de la subida; todo lo demás se mide en meta.
  const cl = analyzeClimbs(queenRuns)
  console.log(
    `\nDentro del PUERTO (v26) — reinas REALES (${REAL_QUEENS.length} etapas × ${queenRuns} semillas, ${cl.all.allClimbs.climbs} puertos de +4 km)\n`,
  )
  console.log(
    [
      `Puerto DECISIVO (el último de cada etapa): remontadas ${cl.all.decisive.medianGainers} · hundidos ${cl.all.decisive.medianLosers} · de libro ${cl.all.decisive.medianComebacks} remonta / ${cl.all.decisive.medianBlowups} revienta · mejor remontada ${cl.all.decisive.medianBestGain} puestos`,
      `  …sin NI UNA remontada en el ${cl.all.decisive.zeroGainerPct.toFixed(0)}% de las corridas · relojes distintos en la cima ${cl.all.decisive.medianClocksAtTop} sobre ${cl.all.decisive.medianRiders} corredores · cede ${cl.all.decisive.medianLossPerKm.toFixed(1)} s/km`,
      `Todos los puertos: remontadas ${cl.all.allClimbs.medianGainers} · remonta ${cl.all.allClimbs.medianComebacks} · revienta ${cl.all.allClimbs.medianBlowups} · sin ni una remontada el ${cl.all.allClimbs.zeroGainerPct.toFixed(0)}%`,
      `Forma de la META: dentro de 10 s ${cl.all.finish.medianWithin10s} · 30 s ${cl.all.finish.medianWithin30s} · 60 s ${cl.all.finish.medianWithin60s} · relojes ${cl.all.finish.medianClocks} · escalón mayor ${cl.all.finish.medianMaxStepS.toFixed(0)}s · comparten reloj ${cl.all.finish.medianSharedPct.toFixed(0)}%`,
      ...cl.perStage.map(
        (row) =>
          `${`${row.queen.raceId} e${row.queen.stageIndex}`.padEnd(24)} decisivo: ${row.stats.decisive.medianGainers} remontan · ${row.stats.decisive.medianBlowups} revientan · ${row.stats.decisive.medianClocksAtTop}/${row.stats.decisive.medianRiders} relojes en la cima · meta: ${row.stats.finish.medianWithin30s} en 30 s`,
      ),
    ].join('\n  '),
  )

  // …y el caso de la regresión con el campo con el que se vio (escalón de niveles, no continuo).
  const colombia = colombiaRegressionTails(5)
  const worstColombia = Math.max(...colombia.map((t) => t.lastGroupPct))
  console.log(
    `\nRace Colombia e5 — el caso de la v17 (130 corredores: 8 a 82 · 16 a 62 · el resto a 52, 5 semillas)\n`,
  )
  console.log(
    `  colas ${colombia.map((t) => `${t.lastGroupPct.toFixed(1)}%`).join(' · ')} · peor ${worstColombia.toFixed(1)}% (corte de la reina ${100 * STAGE.timeCutQueen}%) · grupos en meta ${colombia.map((t) => t.groups).join('/')}`,
  )

  console.log('')
  process.exit(flatOk && mtnOk && ttOk && rttOk && eroOk && voiceOk && gtOk && rqOk && stOk ? 0 : 1)
}

main()
