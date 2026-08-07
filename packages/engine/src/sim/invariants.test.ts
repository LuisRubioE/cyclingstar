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
import { SEASON_CALENDAR } from '../routes/calendar.js'
import {
  campaignSeeds,
  flatScenario,
  hardestClassicScenario,
  longClassicScenario,
  queenScenario,
  queenThirdWeekScenario,
  realRaceScenario,
  timeTrialScenario,
} from './scenarios.js'
import { TARGETS, type Target } from './targets.js'

const flat: Block = { tipo: 'llano', g: 0, estrellas: 0 }

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

  it('la misma etapa reina en la tercera semana erosiona mucho más', { timeout: 30000 }, () => {
    const stats = analyzeErosion(tired, campaignSeeds(tired.name, 60))
    expectInRange(stats.medianErosion, TARGETS.erosion.queenThirdWeek)
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
    const saturated: string[] = []
    for (const id of oneDayWt) {
      const stats = analyzeErosion(realRaceScenario(id), campaignSeeds(id, 3))
      if (stats.medianErosion > TARGETS.erosion.hardestClassicFresh.max) {
        saturated.push(`${id} ${stats.medianErosion.toFixed(3)}`)
      }
    }
    expect(saturated).toEqual([])
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
