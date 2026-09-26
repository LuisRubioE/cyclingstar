/**
 * Invariantes de balance que corren en CI (SPEC 6.17): la montaña, la crono, el pavé y los
 * guardarraíles de cierre e inercia. Todo es determinista (semillas fijas, sin reloj ni
 * Math.random), así que los rangos se validan de forma reproducible bit a bit. La campaña completa
 * de calibración se lanza con `pnpm sim`.
 *
 * Los rangos salen de `sim/targets.ts`, la MISMA fuente que usa `pnpm sim`: antes estaban
 * duplicados aquí con valores más laxos, y por eso CI pasaba en verde mientras el simulador
 * fallaba (docs/motor.md §3-bis-h).
 *
 * ————— ESTE FICHERO ERA UNO SOLO Y AHORA SON SEIS (v83) —————
 *
 * No por gusto: era el 64 % del trabajo del job de bancos —2.798 s de 4.365— y dentro de un fichero
 * vitest corre los tests EN SERIE, así que ningún runner extra podía ayudar. Los `describe` de aquí
 * no comparten fixture caro —cada uno monta el suyo—, así que repartirlos es gratis y deja que la
 * matriz del CI los corra en paralelo.
 *
 * El corte se hizo en dos pasadas, y la segunda la mandó el CI: con cuatro ficheros el tramo de
 * `invariantes` seguía tardando 33,1 min contra los 12,7 del siguiente, así que salieron también
 * `invariantsDesgaste` y `invariantsLlano`. Los hermanos son hoy `invariantsLlano`,
 * `invariantsDesgaste`, `invariantsClasicas`, `invariantsAbandonos` e `invariantsPequenas`.
 *
 * **No se salta nada**: los seis corren siempre, en paralelo, y el job entero sigue siendo condición
 * para fusionar. Lo único que cambia es el reloj de pared.
 */
import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { advanceGroup, createGroup } from '../stage/group.js'
import { accLimit, blockSeconds } from '../stage/physics.js'
import { simulateStage } from '../stage/simulate.js'
import { stageSeed } from '../stage/rng.js'
import type { Block, StageRider } from '../stage/types.js'
import { analyzeMountain, analyzeTimeTrial } from './analyze.js'
import { REAL_TIME_TRIALS, type RealTimeTrialStats, analyzeRealTimeTrials } from './timeTrials.js'
import { STAGE } from '../constants.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { campaignSeeds, queenScenario, timeTrialScenario } from './scenarios.js'
import { TARGETS, type Target } from './targets.js'

const flat: Block = { tipo: 'llano', g: 0, estrellas: 0 }

/** Comprueba un estadístico contra su rango objetivo compartido. */
function expectInRange(value: number, target: Target): void {
  expect(value).toBeGreaterThanOrEqual(target.min)
  expect(value).toBeLessThanOrEqual(target.max)
}

describe('invariantes de montaña (6.17)', () => {
  const scenario = queenScenario()
  const stats = analyzeMountain(scenario, campaignSeeds(scenario.name, 120))

  it('la fuga gana el porcentaje objetivo de las etapas de montaña', () => {
    expectInRange(stats.breakawayWinPct, TARGETS.mountain.breakawayWinPct)
  })

  it('una etapa reina produce la brecha objetivo entre el primero y el décimo del día', () => {
    expectInRange(stats.medianTop10GapSeconds, TARGETS.mountain.top10GapSeconds)
  })

  /**
   * ————— EL ANCLA DE `gcClimbRecoverPerKm`, Y VIGILADA (v82) —————
   *
   * La constante llevaba `[calibrar]` desde que nació. Su frase —«segundos que se mueve la general
   * por km de puerto ENTRE HOMBRES VECINOS»— describe algo que el motor produce y que nadie estaba
   * midiendo; `gcMovePerClimbKm` lo mide ahora, y la unidad coincide con la que la constante cobra
   * (los segmentos `tipo: 'puerto'`, que es como `terrenoRestante` cuenta en `packages/db`).
   *
   * LO QUE SE COMPARA ES EL PRODUCTO, y no la constante suelta, porque `recoverableSeconds` se usa
   * en **un solo sitio de todo el motor** —`leashOf`— y siempre multiplicada por `gcLeashShare`:
   *
   *     leashOf = clamp(colchón + recoverableSeconds(shape) · gcLeashShare, suelo, techo)
   *
   * Así que lo que de verdad decide es `gcClimbRecoverPerKm · gcLeashShare` = 1,6 · 0,6 = **0,96 s
   * por km de puerto y por vecino**, contra los **0,83** que el motor produce en la reina canónica.
   * Un 16 % por encima, y por el lado correcto: `recoverableSeconds` contesta «¿cuánto se PUEDE
   * recuperar todavía?», que es una cota superior y no una media.
   *
   * EL MARGEN ES ANCHO A PROPÓSITO (un factor de dos en cada sentido). Lo que este invariante caza
   * no es que el producto deje de ser 0,96: es que el motor y la constante se divorcien —que alguien
   * cambie la montaña, la general pase a moverse el triple, y la correa siga concediendo cuerda con
   * la cuenta de antes—. Un margen estrecho aquí sería sellar la σ de una mediana sobre 120 reinas,
   * que es justo lo que la banda de arriba ya tuvo que ensanchar dos veces.
   *
   * SU ESLABÓN DÉBIL, dicho: esto ancla la constante al COMPORTAMIENTO del motor, y lo que ata ese
   * comportamiento a la realidad es la banda de arriba (40-300 s). La cadena es real y tiene tres
   * eslabones; el de en medio es este invariante y antes no existía ninguno.
   */
  it('la correa concede con la cuenta que la montaña produce de verdad', () => {
    // Primero el control: sin km de puerto en el recorrido el estadístico vale 0 por construcción y
    // la comparación de abajo pasaría sola. La reina canónica tiene 25.
    expect(stats.gcMovePerClimbKm).toBeGreaterThan(0)
    const cuentaDeLaCorrea = STAGE.customs.gcClimbRecoverPerKm * STAGE.customs.gcLeashShare
    expect(cuentaDeLaCorrea).toBeGreaterThan(stats.gcMovePerClimbKm * 0.5)
    expect(cuentaDeLaCorrea).toBeLessThan(stats.gcMovePerClimbKm * 2)
  })
})

describe('contrarreloj (6.17)', () => {
  const scenario = timeTrialScenario()
  const stats = analyzeTimeTrial(scenario, campaignSeeds(scenario.name, 120))

  it('la brecha p90-p10 de una CRI de 40 km cae en la banda de la ley', () => {
    expectInRange(stats.medianP90MinusP10Seconds, TARGETS.timeTrial.p90MinusP10Seconds)
  })

  it('la gana un especialista', () => {
    expectInRange(stats.specialistWinPct, TARGETS.timeTrial.specialistWinPct)
  })
})

/**
 * EL ABANICO DE LA CRONO (v19, `sim/timeTrials.ts`). El invariante que faltaba, y la razón por la
 * que faltaba: los dos de arriba miden `cri-40` —40 corredores de crono correcto en 40 km de
 * laboratorio— y estaban en VERDE mientras producción repartía en `race-colombia` e3 una cola del
 * 46,4 % del primero al último, 65 alcances en 130 corredores, y el corte de tiempo tenía que
 * quedarse fuera de la crono. Es la misma lección de `realQueens` frente a `grandTour`: lo que no se
 * mide sobre carreras reales, no se mide.
 */
describe('la cola de una CONTRARRELOJ real (v19)', () => {
  let shared: RealTimeTrialStats | null = null
  const bench = (): RealTimeTrialStats => (shared ??= analyzeRealTimeTrials(6))

  it('el banco cubre formas distintas, y las dos cronos de producción están dentro', () => {
    const has = (raceId: string): boolean => REAL_TIME_TRIALS.some((t) => t.raceId === raceId)
    expect(has('race-colombia')).toBe(true)
    expect(has('nc-co-itt')).toBe(true)
    expect(REAL_TIME_TRIALS.length).toBeGreaterThanOrEqual(4)
    expect(new Set(REAL_TIME_TRIALS.map((t) => t.raceId)).size).toBe(REAL_TIME_TRIALS.length)
  })

  it('del primero al último hay entre un 8% y un 15%', { timeout: 300000 }, () => {
    const stats = bench()
    expect(stats.all.runs).toBe(REAL_TIME_TRIALS.length * 6)
    expectInRange(stats.all.medianTailPct, TARGETS.timeTrials.tailPct)
  })

  it('…y ninguna crono suelta se dispara', { timeout: 300000 }, () => {
    expectInRange(bench().worst.medianTailPct, TARGETS.timeTrials.worstStagePct)
  })

  /**
   * EL CORTE DE LA CRONO NO ELIMINA A NADIE EN UNA CRONO NORMAL (v20, `timeCutItt` = 0,25). Es el
   * criterio de aceptación de haberlo activado, y el que la v14 no podía cumplir: con el abanico de
   * aquel motor el corte de la llana habría eliminado a 150 de 176 en la etapa 1 de una gran vuelta.
   * El corte de una contrarreloj existe para el que pincha, se cae o se queda tirado; el último
   * clasificado de una crono llana es un corredor flojo, no un eliminado.
   */
  it('el corte de la crono no elimina a nadie en una crono normal', { timeout: 300000 }, () => {
    const stats = bench()
    expect(stats.all.outOfTime).toBe(0)
    expect(stats.all.readmitted).toBe(0)
    // …y no es porque el corte esté tan lejos que no signifique nada: la cola vive a 10 puntos de él.
    expect(stats.worst.medianTailPct).toBeLessThan(100 * STAGE.timeCutItt)
  })

  it(
    'las velocidades son de profesional: el peor no rueda de cicloturista',
    { timeout: 300000 },
    () => {
      // El síntoma con el que se vio el defecto: en producción el último de una crono llana de 33 km
      // entraba a 32,2 km/h. Un profesional, por flojo que sea, rueda una crono llana por encima de
      // 40; y el mejor de una crono no pasa de 56, que es el récord de la hora con casco aerodinámico.
      //
      // RE-SELLADO EN EL PASO 9 DE E1 (docs/balance.md, v87 §2): el suelo de 40 km/h es de una crono
      // LLANA, y desde la v87 las tres cronos generadas del banco llevan la cota que el catálogo da a
      // `et_crono` y `nc_crono` (§5.3: [2,5; 5] km al [4; 6] %): el último sube a 36,6-39,2 km/h y el
      // ganador a 42-44. El suelo se afirma donde vale, en las cronos sin puerto (las dos reales de
      // gran vuelta), y el techo y el orden en todas; no se baja el número.
      for (const row of bench().perStage) {
        const etapa = SEASON_CALENDAR.find((r) => r.id === row.tt.raceId)!.stages.find(
          (s) => s.index === row.tt.stageIndex,
        )!
        if (!etapa.profile.segments.some((s) => s.tipo === 'puerto'))
          expect(row.stats.medianLastKmh, row.tt.raceId).toBeGreaterThanOrEqual(40)
        expect(row.stats.medianWinnerKmh).toBeLessThanOrEqual(56)
        expect(row.stats.medianWinnerKmh).toBeGreaterThan(row.stats.medianLastKmh)
      }
      // Y la regla no se queda vacía: el banco sigue teniendo cronos llanas que la cumplen.
      expect(
        bench().perStage.filter(
          (row) =>
            !SEASON_CALENDAR.find((r) => r.id === row.tt.raceId)!
              .stages.find((s) => s.index === row.tt.stageIndex)!
              .profile.segments.some((s) => s.tipo === 'puerto'),
        ).length,
      ).toBeGreaterThanOrEqual(2)
    },
  )
})

describe('caídas en pavés (6.17)', () => {
  // Monte Carlo de 80 etapas completas: pesado, con margen de tiempo holgado para runners lentos.
  it('una etapa de pavés deja entre un 5% y un 12% de bajas por caída', { timeout: 120000 }, () => {
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
      /**
       * SOLO LAS CAÍDAS, que es lo que el nombre de este invariante dice y lo que su banda de 5-12 %
       * mide desde que existe.
       *
       * Hasta el paso 13 `incidents` solo llevaba caídas, así que contar incidentes y contar caídas
       * era lo mismo y nadie tuvo que elegir. Con los percances mecánicos (R11) dejan de serlo: un
       * pinchazo viaja por el mismo canal —para el parte y la crónica es la misma cosa, un hombre
       * que se para y pierde tiempo— y **no es una baja**. Medido sin este filtro, el número saltaba
       * al 17,3 % sin que una sola caída más hubiera ocurrido: 3,20 caídas por etapa antes y 3,20
       * después. El diseño avisaba de esto con todas las letras y pedía comprobarlo aparte.
       */
      crashedFraction +=
        new Set(out.incidents.filter((i) => i.tipo === 'caida').map((i) => i.riderId)).size /
        field.length
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
      brk = advanceGroup(brk, flat, 68, undefined, {})
      pel = advanceGroup(pel, flat, 68, undefined, {})
    }
    const gap0 = pel.tS - brk.tS
    for (let i = 0; i < 100; i++) {
      brk = advanceGroup(brk, flat, 68, undefined, {})
      pel = advanceGroup(pel, flat, 68, undefined, {})
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
