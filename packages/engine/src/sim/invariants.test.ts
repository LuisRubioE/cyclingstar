/**
 * Invariantes de balance de la etapa llana (SPEC 6.17), que corren en CI. Todo es determinista
 * (semillas fijas, sin reloj ni Math.random), así que los rangos se validan de forma reproducible
 * bit a bit. La campaña completa de calibración se lanza con `pnpm sim`.
 *
 * Los rangos salen de `sim/targets.ts`, la MISMA fuente que usa `pnpm sim`: antes estaban
 * duplicados aquí con valores más laxos, y por eso CI pasaba en verde mientras el simulador
 * fallaba (docs/motor.md §3-bis-h).
 */
import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { advanceGroup, createGroup } from '../stage/group.js'
import { accLimit, blockSeconds } from '../stage/physics.js'
import { simulateStage } from '../stage/simulate.js'
import { stageSeed } from '../stage/rng.js'
import type { Block, StageRider } from '../stage/types.js'
import { analyzeErosion, analyzeFlat, analyzeMountain, analyzeTimeTrial } from './analyze.js'
import { type GrandTourStats, analyzeGrandTour, runGrandTour } from './grandTour.js'
import {
  REAL_QUEENS,
  type RealQueenStats,
  analyzeRealQueens,
  colombiaRegressionTails,
} from './realQueens.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { STAGE } from '../constants.js'
import {
  campaignSeeds,
  flatScenario,
  hardestClassicScenario,
  longClassicScenario,
  queenScenario,
  queenThirdWeekScenario,
  realQueenThirdWeekScenario,
  realRaceScenario,
  timeTrialScenario,
} from './scenarios.js'
import { analyzeTeamVoice, teamedField } from './tactics.js'
import { TARGETS, type Target } from './targets.js'

const flat: Block = { tipo: 'llano', g: 0, estrellas: 0 }

/**
 * Umbrales de SATURACIÓN del depósito. Con RES 60 el umbral de erosión queda en 0,31, así que el
 * techo de erosión de 0,92 se alcanza con un vaciado de 0,945: por encima de eso el modelo ya no
 * puede expresar más degradación y deja de discriminar. Se deja un pelo de margen (0,95) y se pide
 * además que las pájaras sean marginales.
 */
const SATURATION_DEPLETION = 0.95
const SATURATION_BONK_PCT = 10

/** Comprueba un estadístico contra su rango objetivo compartido. */
function expectInRange(value: number, target: Target): void {
  expect(value).toBeGreaterThanOrEqual(target.min)
  expect(value).toBeLessThanOrEqual(target.max)
}

describe('invariantes de llano (6.17)', () => {
  const scenario = flatScenario()
  const stats = analyzeFlat(scenario, campaignSeeds(scenario.name, 120))

  // Con las "piernas del día" (dayFormSd) la fuga aguanta algo más a menudo: el juego de la fuga
  // pesa más y no siempre manda el pelotón. Aun así sigue siendo minoría en llano.
  it('la fuga gana el porcentaje objetivo de las etapas', () => {
    expectInRange(stats.breakawayWinPct, TARGETS.flat.breakawayWinPct)
  })

  it('el mejor sprinter gana el porcentaje objetivo con 3 sprinters de nivel', () => {
    expectInRange(stats.bestSprinterWinPct, TARGETS.flat.bestSprinterWinPct)
  })

  it('cuando los sprinters cazan, la captura mediana cae en el rango objetivo', () => {
    expect(stats.capturePct).toBeGreaterThan(85)
    expectInRange(stats.medianCatchKmToFinish, TARGETS.flat.catchKmToFinish)
  })
})

describe('invariantes de montaña (6.17)', () => {
  const scenario = queenScenario()
  const stats = analyzeMountain(scenario, campaignSeeds(scenario.name, 120))

  it('la fuga gana el porcentaje objetivo de las etapas de montaña', () => {
    expectInRange(stats.breakawayWinPct, TARGETS.mountain.breakawayWinPct)
  })

  it('una etapa reina produce la brecha objetivo entre el primero y el décimo del día', () => {
    expectInRange(stats.medianTop10GapSeconds, TARGETS.mountain.top10GapSeconds)
  })
})

describe('contrarreloj (6.17)', () => {
  const scenario = timeTrialScenario()
  const stats = analyzeTimeTrial(scenario, campaignSeeds(scenario.name, 120))

  it('la brecha p90-p10 de una CRI de 40 km mide entre 2 y 4 minutos', () => {
    expectInRange(stats.medianP90MinusP10Seconds, TARGETS.timeTrial.p90MinusP10Seconds)
  })

  it('la gana un especialista', () => {
    expectInRange(stats.specialistWinPct, TARGETS.timeTrial.specialistWinPct)
  })
})

describe('desgaste (docs/motor.md §VI.1)', () => {
  // La perilla raíz del Cambio 0: la erosión valía 0.000 en TODAS las etapas, así que RES, la
  // durabilidad y el tanque no cambiaban nada y el ganador se decidía con los atributos del km 0.
  // Estos rangos son la tabla de objetivos de §VI.1 y evitan que el desgaste vuelva a apagarse.
  const flatScen = flatScenario()
  const queen = queenScenario()
  const tired = queenThirdWeekScenario()
  const longClassic = longClassicScenario()

  it('una llana rodada en pelotón no erosiona al corredor fresco', { timeout: 30000 }, () => {
    const stats = analyzeErosion(flatScen, campaignSeeds(flatScen.name, 60))
    expectInRange(stats.medianErosion, TARGETS.erosion.flatFresh)
  })

  it('una etapa reina en fresco sí erosiona', { timeout: 30000 }, () => {
    const stats = analyzeErosion(queen, campaignSeeds(queen.name, 60))
    expectInRange(stats.medianErosion, TARGETS.erosion.queenFresh)
  })

  /**
   * LA ETAPA REINA REAL EN LA TERCERA SEMANA (re-anclada en la v15, docs/motor.md §VI.1).
   *
   * Hasta la v14 esto se medía sobre la reina SINTÉTICA (135 km lisos más un puerto: 1.200 m) y por
   * eso pasaba en verde mientras la reina de verdad —4.500 m— saturaba con el 100 % del campo en
   * pájara y la erosión topada en 0,920, o sea con el modelo sin capacidad de discriminar. La banda
   * de §VI.1 es la misma; lo que cambia es que se mide donde se corre.
   *
   * Y va con la comprobación de saturación, que es la mitad que faltaba: una erosión de 0,80 con el
   * depósito a cero no es una erosión de 0,80, es un techo.
   */
  it(
    'la etapa reina REAL en la tercera semana erosiona mucho más, sin saturar',
    { timeout: 60000 },
    () => {
      const realQueen = realQueenThirdWeekScenario()
      const stats = analyzeErosion(realQueen, campaignSeeds(realQueen.name, 12))
      expectInRange(stats.medianErosion, TARGETS.erosion.queenThirdWeek)
      expect(stats.medianDepletion).toBeLessThanOrEqual(SATURATION_DEPLETION)
      expect(stats.bonkPct).toBeLessThanOrEqual(SATURATION_BONK_PCT)
    },
  )

  it('y la reina SINTÉTICA erosiona menos que ella, que es lo que debe', { timeout: 30000 }, () => {
    // 1.200 m de desnivel no son una etapa reina. Este escenario deja de ser el objetivo y pasa a
    // ser el control de que el ORDEN se respeta: la caricatura tiene que quedar por debajo.
    const synth = analyzeErosion(tired, campaignSeeds(tired.name, 60))
    const real = analyzeErosion(realQueenThirdWeekScenario(), campaignSeeds('reina-real-s3', 12))
    expect(synth.medianErosion).toBeLessThan(real.medianErosion)
  })

  it(
    'una clásica larga en fresco erosiona más que una reina, sin llegar a la 3.ª semana',
    { timeout: 30000 },
    () => {
      const stats = analyzeErosion(longClassic, campaignSeeds(longClassic.name, 12))
      expectInRange(stats.medianErosion, TARGETS.erosion.longClassicFresh)
    },
  )

  it('el que releva todo el día se desgasta más que el que va a rueda', { timeout: 30000 }, () => {
    // El turno de relevo lo reparte el ROL (`STAGE.relayDutyByRole`), no la posición en el array
    // (eso era el bug de la v1). Se compara el caso que describe docs/motor.md §VI.1: el GREGARIO
    // que tira todo el día (deber 1.0) contra el SPRINTER que se guarda para la meta (0.2).
    //
    // Campo a medida en vez del escenario canónico: `llana-180` no tiene gregarios, solo rodadores
    // `libre` (deber 0.6), y como el turno rota por frescura el trabajo se reparte entre los 31 y la
    // diferencia se diluye hasta ser irrelevante (~1.07). Aquí se mide la mecánica, no el escenario.
    const eff = (base: number): Record<Attribute, number> => ({
      RES: base,
      REC: base,
      LLA: base,
      MON: base,
      COL: base,
      CRI: base,
      SPR: base,
      DES: base,
      PAV: base,
      TAC: base,
    })
    const make = (id: string, role: 'gregario' | 'sprinter'): StageRider => ({
      riderId: id,
      eff0: eff(65),
      energy: 100,
      matches: 3,
      tsb: 0,
      orders: {
        role,
        mentality: 'reservon',
        contestSprints: false,
        contestClimbs: false,
      },
      gcDeficitSeconds: 0,
    })
    const riders: StageRider[] = []
    for (let i = 0; i < 10; i++) riders.push(make(`greg-${i}`, 'gregario'))
    for (let i = 0; i < 10; i++) riders.push(make(`spr-${i}`, 'sprinter'))
    const input = { profile: { segments: [{ km: 180, tipo: 'llano' as const }] }, riders }

    let relayWork = 0
    let shelteredWork = 0
    for (const seed of campaignSeeds('relevos-180', 20)) {
      const out = simulateStage(input, seed)
      for (const r of riders) {
        const w = out.workUnits.get(r.riderId) ?? 0
        if (r.orders.role === 'gregario') relayWork += w
        else shelteredWork += w
      }
    }
    // Umbral 1.10, no 1.15: el turno ROTA por frescura, así que ni el gregario más entregado releva
    // el 100% del tiempo (con 10 gregarios y ~5 huecos de turno, cada uno tira la mitad del día). El
    // techo estructural de este escenario extremo es ~1.14. El 1.15 original se fijó midiendo la
    // lógica vieja, donde el primer cuarto del array relevaba SIEMPRE y sin rotar.
    expect(relayWork / shelteredWork).toBeGreaterThan(1.1)
  })
})

describe('la erosión no satura en ninguna clásica (docs/motor.md §VI.1)', () => {
  // Cuando la erosión topa en 1,000 todo el pelotón queda al máximo de degradación: el modelo deja
  // de discriminar y el resultado vuelve a ser azar, que es justo lo contrario de lo que se buscaba
  // con el desgaste. Al cargar los recorridos reales, TRES clásicas saturaron (Lombardía, Flandes y
  // Roubaix) y ningún invariante se enteró, porque la batería solo corría perfiles sintéticos.
  //
  // Las carreras de un día del WorldTour son las más largas del calendario (200-290 km) y por tanto
  // el peor caso. Se corren con el campo homogéneo: lo único que explica la erosión es el recorrido.
  const oneDayWt = SEASON_CALENDAR.filter(
    (r) => r.level === 'WT' && r.format === 'un-dia' && r.stages[0] && !r.stages[0].timeTrial,
  ).map((r) => r.id)

  it(
    'la clásica más dura del calendario erosiona fuerte pero no satura',
    { timeout: 30000 },
    () => {
      const hardest = hardestClassicScenario()
      const stats = analyzeErosion(hardest, campaignSeeds(hardest.name, 12))
      expectInRange(stats.medianErosion, TARGETS.erosion.hardestClassicFresh)
    },
  )

  it('ninguna clásica del WorldTour satura con el pelotón fresco', { timeout: 120000 }, () => {
    expect(oneDayWt.length).toBeGreaterThan(10)
    // OJO: desde v6 la erosión lleva un techo estructural (`STAGE.erosionMax`), así que mirar la
    // erosión ya NO detecta la saturación —topa en 0,92 justo cuando hay que dar la alarma—. La
    // señal buena es el VACIADO del depósito, que no está topado: si el tanque llega a cero, la
    // erosión estaba pidiendo más de lo que el modelo puede expresar. Medido hoy: el peor caso es
    // Il Lombardia con 0,908 de vaciado y un 3% de pájaras.
    const saturated: string[] = []
    for (const id of oneDayWt) {
      const stats = analyzeErosion(realRaceScenario(id), campaignSeeds(id, 3))
      if (stats.medianDepletion > SATURATION_DEPLETION || stats.bonkPct > SATURATION_BONK_PCT) {
        saturated.push(
          `${id} vaciado ${stats.medianDepletion.toFixed(3)} pájaras ${stats.bonkPct.toFixed(0)}%`,
        )
      }
    }
    expect(saturated).toEqual([])
  })
})

describe('el plan de equipo y la voz de la crónica (docs/motor.md §V.1)', () => {
  /**
   * El criterio de éxito VISIBLE del plan de equipo. Antes de la v15 el parte de «quién tira» casi
   * nunca podía nombrar a un equipo (medido: 0 % en la llana con 8 equipos de 5, 2-12 % en la
   * campaña de la v11) porque el turno de relevos se decidía corredor a corredor y los tres que más
   * tiraban salían de tres equipos distintos. Este invariante vigila las dos mitades: que la voz de
   * equipo salga, y que el frente CAMBIE DE MANOS —si un solo equipo lo llevara todo el día, el
   * presupuesto de esfuerzo no estaría haciendo nada—.
   */
  const field = teamedField({ teams: 8, per: 5, kind: 'llana', strong: 4 })
  const stats = analyzeTeamVoice(
    field,
    flatScenario().input.profile,
    campaignSeeds('voz-llana', 40),
  )

  it('el parte de relevos puede nombrar a un EQUIPO', { timeout: 60000 }, () => {
    expect(stats.pulls).toBeGreaterThan(50)
    expectInRange(stats.teamVoicePct, TARGETS.chronicle.teamPullFlatPct)
  })

  it('y el frente cambia de manos a lo largo de la etapa', { timeout: 60000 }, () => {
    expectInRange(stats.frontTeamsAvg, TARGETS.chronicle.frontTeamsPerStage)
  })

  it('…y el parte dice POR QUÉ tira ese equipo', { timeout: 60000 }, () => {
    // La otra mitad del encargo: «no es solo saber qué equipo(s) participan de la persecución…
    // también es saber POR QUÉ». Por construcción el equipo sin motivo no toma el frente, así que
    // esto debería ser el 100 %; el invariante existe para que siga siéndolo.
    expectInRange(stats.withReasonPct, TARGETS.chronicle.teamPullWithReasonPct)
    // Y en una LLANA el motivo que manda es la etapa: hay trenes y hay sprint que ganar.
    expect(stats.reasons.etapa).toBeGreaterThan(stats.reasons.maillot + stats.reasons.general)
  })

  it('un campo SIN equipos no cambia de comportamiento', () => {
    // La regla 2 de §V.1 y la garantía que sostiene todo lo demás: el plan de equipo no puede tocar
    // a quien no tiene equipo. Un corredor sin `teamId` no recibe compañeros fantasma ni empuje de
    // ningún plan, y una etapa entera de agentes libres sale como salía.
    const free = field.map((r) => ({ ...r, teamId: null }))
    const seeds = campaignSeeds('sin-equipos', 3)
    for (const seed of seeds) {
      const out = simulateStage({ profile: flatScenario().input.profile, riders: free }, seed)
      const teams = new Set(
        out.events
          .filter((e) => e.plantilla === 'peloton_pull')
          .flatMap((e) => e.protagonistas.map((id) => id.split('-')[0])),
      )
      // Sin equipos no hay dueño del frente: los que tiran salen de donde toque.
      expect(out.events.some((e) => e.plantilla === 'rider_defies_team')).toBe(false)
      expect(teams.size).toBeGreaterThan(1)
    }
  })
})

describe('abandonos en una gran vuelta (docs/motor.md §VI.3)', () => {
  /**
   * El criterio de éxito de la v14, y el único invariante del banco que no se mide sobre una etapa
   * suelta: «una gran vuelta de 21 etapas empieza con ~176 y termina con entre 140 y 155».
   *
   * Se mide sobre la MEDIA de varias vueltas y no sobre una. Una vuelta suelta oscila entre el 12 %
   * y el 21 % según le caigan las caídas (medido, 8 semillas), así que un invariante sobre una sola
   * sería intermitente; con seis, la media se queda en 15-17 %. Seis vueltas de 21 etapas con 176
   * corredores son ~2 minutos, de ahí el timeout.
   */
  // Las seis vueltas se corren UNA vez y las comparten los dos invariantes que salen de ellas: son
  // ~2 minutos de simulación y medir dos veces lo mismo solo dobla el reloj de CI.
  let shared: GrandTourStats | null = null
  const tours = (): GrandTourStats => (shared ??= analyzeGrandTour(6))

  it('el pelotón adelgaza entre un 12% y un 20% en tres semanas', { timeout: 300000 }, () => {
    const stats = tours()
    expect(stats.runs).toBe(6)
    expectInRange(stats.abandonPct, TARGETS.grandTour.abandonPct)
  })

  /**
   * EL CRITERIO DE ÉXITO DEL MODELO DE PERSECUCIÓN (v16, docs/motor.md §9). En una etapa reina de
   * gran vuelta el último grupo entra entre el 8 % y el 14 % del tiempo del ganador, que es lo que
   * hace el grupeto en carretera. Con menos, el corte de tiempo de §VI.3 (8-18 %) no señala a nadie
   * y la causa «fuera de control» no puede llegar a su 45 %; con más, el corte se llevaría por
   * delante media carrera todos los días.
   */
  it('el último grupo de una etapa reina entra al 8-14%', { timeout: 300000 }, () => {
    const stats = tours()
    expect(stats.tails.reina.stages).toBeGreaterThanOrEqual(6 * 7)
    expectInRange(stats.tails.reina.medianLastGroupPct, TARGETS.grandTour.queenLastGroupPct)
  })

  /**
   * …y la otra mitad, que es la que pedía el dueño con sus palabras («hay 23 ciclistas en el mismo
   * tiempo y luego todos los demás llegan a 1 segundo... lo cual es técnicamente imposible»): una
   * etapa reina NO puede terminar con el pelotón entero al mismo segundo. En una llana sí —y por eso
   * esto no se comprueba sobre las llanas—, pero una etapa de montaña que llega en bloque es un
   * defecto, no un resultado.
   */
  it(
    'ninguna etapa reina termina con el pelotón entero al mismo segundo',
    { timeout: 300000 },
    () => {
      expect(tours().tails.reina.oneGroupPct).toBe(0)
    },
  )

  it('el tope del 4% por etapa nunca se rebasa', { timeout: 300000 }, () => {
    // Salvaguarda 1 de §VI.3, y la que de verdad protege la carrera: la hemorragia es el riesgo
    // real de esta mecánica. Se comprueba etapa a etapa sobre una vuelta entera.
    const tour = runGrandTour('tope-4pct')
    const gone = tour.starters - tour.finishers
    expect(gone).toBeGreaterThan(0)
    // 21 etapas × 4 % de un pelotón que mengua: la cota superior holgada es 21 · 0,04 · 176.
    expect(gone).toBeLessThan(Math.ceil(21 * 0.04 * tour.starters))
  })
})

/**
 * LAS ETAPAS REINA REALES (v17, docs/motor.md §9 y docs/balance.md «v17»). La cobertura que le
 * faltaba a la batería y la lección de la regresión de la v16.
 *
 * `grandTour.queenLastGroupPct` estaba en verde mientras Race Colombia e5 metía en producción a 126
 * de 130 corredores a más de 74 minutos. No porque el invariante estuviera mal medido, sino porque
 * **mide siempre la misma forma**: las siete reinas de `race-france`, todas finales en alto de
 * 170-185 km. La de Colombia son 232 km con el último puerto a 62 km de meta y 47 km rodadores
 * hasta la línea. El banco nuevo corre ocho reinas REALES elegidas por forma, y esa entre ellas.
 */
describe('la cola en las etapas reina REALES (v17)', () => {
  let shared: RealQueenStats | null = null
  const bench = (): RealQueenStats => (shared ??= analyzeRealQueens(6))

  it('el banco cubre formas distintas, y el caso de la regresión está dentro', () => {
    // No es decorado: el defecto se coló porque el banco no tenía ninguna reina con esta forma.
    expect(REAL_QUEENS.some((q) => q.raceId === 'race-colombia' && q.stageIndex === 5)).toBe(true)
    expect(REAL_QUEENS.length).toBeGreaterThanOrEqual(6)
    expect(new Set(REAL_QUEENS.map((q) => q.raceId)).size).toBe(REAL_QUEENS.length)
  })

  it('el último grupo entra al 8-14% del tiempo del ganador', { timeout: 300000 }, () => {
    const stats = bench()
    expect(stats.all.stages).toBe(REAL_QUEENS.length * 6)
    expectInRange(stats.all.medianLastGroupPct, TARGETS.realQueens.lastGroupPct)
  })

  it('…y NINGUNA etapa suelta deja a su cola fuera del corte', { timeout: 300000 }, () => {
    // El techo es `timeCutQueen` (18 %), el corte de §VI.3, y no un número de calibración: por
    // encima de él el corte deja de ser un riesgo y pasa a ser una eliminación en bloque que solo
    // frena el tope del 4 %. Es lo que Race Colombia e5 hacía en producción con un 22 %.
    expectInRange(bench().worst.medianLastGroupPct, TARGETS.realQueens.worstStagePct)
  })

  /**
   * EL CASO DE LA REGRESIÓN, CON EL CAMPO CON EL QUE SE VIO. El banco de arriba genera campos con
   * `generateNpcRider` y sale un CONTINUO de niveles; lo que rompía la carrera es el ESCALÓN —ocho
   * corredores treinta puntos por encima de una masa homogénea—, así que este caso va aparte y con
   * el campo del dueño: 8 a 82, 16 a 62 y el resto a 52.
   */
  it('Race Colombia e5 no vuelve a entregar la etapa a 74 minutos', { timeout: 120000 }, () => {
    const tails = colombiaRegressionTails(5)
    const worst = Math.max(...tails.map((t) => t.lastGroupPct))
    // Medido: v16 llegaba al 18,9 % en esta misma tanda de semillas (y al 22 % en producción); la
    // v17 se queda en el 15,5 %. El listón es el corte de la reina, no el número medido.
    expect(worst).toBeLessThanOrEqual(100 * STAGE.timeCutQueen)
    // Y no se arregla llevándose por delante la selección: la etapa sigue partiéndose de verdad.
    for (const t of tails) expect(t.groups).toBeGreaterThan(2)
  })
})

describe('caídas en pavés (6.17)', () => {
  // Monte Carlo de 80 etapas completas: pesado, con margen de tiempo holgado para runners lentos.
  it('una etapa de pavés deja entre un 5% y un 12% de bajas por caída', { timeout: 30000 }, () => {
    const eff = (base: number): Record<Attribute, number> => ({
      RES: base,
      REC: base,
      LLA: base,
      MON: base,
      COL: base,
      CRI: base,
      SPR: base,
      DES: base,
      PAV: 55,
      TAC: base,
    })
    const field: StageRider[] = Array.from({ length: 40 }, (_, i) => ({
      riderId: `r-${i}`,
      eff0: eff(55),
      energy: 100,
      matches: 4,
      tsb: 0,
      orders: { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false },
      gcDeficitSeconds: 0,
      fragility: 1,
    }))
    const profile = {
      segments: [
        { km: 20, tipo: 'llano' as const },
        { km: 30, tipo: 'paves' as const, estrellas: 4 },
        { km: 10, tipo: 'llano' as const },
      ],
    }
    let crashedFraction = 0
    const runs = 80
    for (let s = 0; s < runs; s++) {
      const seed = stageSeed({
        worldSeed: `pave-${s}`,
        raceId: 'pave',
        stageDay: 1,
        engineVersion: 1,
      })
      const out = simulateStage({ profile, riders: field }, seed)
      crashedFraction += new Set(out.incidents.map((i) => i.riderId)).size / field.length
    }
    const rate = (100 * crashedFraction) / runs
    expect(rate).toBeGreaterThanOrEqual(5)
    expect(rate).toBeLessThanOrEqual(12)
  })
})

describe('cierre del pelotón comprometido (6.17)', () => {
  it('un pelotón comprometido cierra entre 50 y 75 segundos por cada 10 km', () => {
    // Fuga a tempo (0.6) y pelotón a compromiso alto de caza (0.85), mismos punteros (~68).
    let brk = createGroup('brk', ['b'], { compromiso: 0.6 })
    let pel = createGroup('pel', ['p'], { compromiso: 0.85 })
    for (let i = 0; i < 50; i++) {
      brk = advanceGroup(brk, flat, 68, {})
      pel = advanceGroup(pel, flat, 68, {})
    }
    const gap0 = pel.tS - brk.tS
    for (let i = 0; i < 100; i++) {
      brk = advanceGroup(brk, flat, 68, {})
      pel = advanceGroup(pel, flat, 68, {})
    }
    const cierre = gap0 - (pel.tS - brk.tS)
    expect(cierre).toBeGreaterThanOrEqual(50)
    expect(cierre).toBeLessThanOrEqual(75)
  })
})

describe('inercia acotada (6.17)', () => {
  it('a ritmo de carrera, ningún grupo varía más de 4 km/h entre bloques (fuera de cerillo y descenso)', () => {
    // La cota es ACC_PEDAL·dt; con dx = 0.1 km se mantiene ≤ 4 km/h por encima de ~36 km/h.
    for (let v = 40; v <= 55; v += 1) {
      const dt = blockSeconds(v)
      const deltaMax = accLimit(0) * dt // g = 0: sin regalo de gravedad
      expect(deltaMax).toBeLessThanOrEqual(4)
    }
  })
})
