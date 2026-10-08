import { describe, expect, it } from 'vitest'
import { PACE_PROFILES } from './__fixtures__/paceProfiles.js'
import { BROADCAST } from './constants.js'
import type { StageKind } from '../contracts.js'
import {
  digestMinutes,
  digestPace,
  paceAt,
  playbackEstimateS,
  ttDigestScale,
  ttPaceAt,
  ttPlaybackEstimateS,
} from './pace.js'
import type { PaceZone, ProfileStrip } from './timeline.js'

/**
 * EL RITMO (E2, docs/retransmision.md §8.2 y §8.12; D-19). `Watch` corre la hora de carrera a una
 * velocidad que depende de cuántos km le quedan a la cabeza, nunca de lo que pasa (B9), y la ficha de
 * la etapa anuncia cuánto dura con velocidades NOMINALES por pendiente, que no saben nada de la etapa
 * corrida. Las filas del 3a de §8.12.
 */

/** Un perfil con solo las cotas: es lo único que lee la duración anunciada. */
const strip = (altM: readonly number[]): ProfileStrip => ({
  altM,
  climbs: [],
  sprintsKm: [],
  laps: 1,
})
const mmss = (s: number): string => {
  const r = Math.round(s)
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`
}

describe('paceAt · la curva por zonas de km a meta (§8.2)', () => {
  it('en los bordes de cada zona manda la de más cerca de meta: a 50,0 km, ×30; a 50,01 km, ×60', () => {
    expect(paceAt(50.01, BROADCAST.pace)).toBe(60)
    expect(paceAt(50, BROADCAST.pace)).toBe(30)
    expect(paceAt(20.01, BROADCAST.pace)).toBe(30)
    expect(paceAt(20, BROADCAST.pace)).toBe(12)
    expect(paceAt(5.01, BROADCAST.pace)).toBe(12)
    expect(paceAt(5, BROADCAST.pace)).toBe(4)
    expect(paceAt(1.01, BROADCAST.pace)).toBe(4)
    expect(paceAt(1, BROADCAST.pace)).toBe(1.5)
    expect(paceAt(0.3, BROADCAST.pace)).toBe(1.5)
  })

  it('en la línea, y más allá, la del último km', () => {
    expect(paceAt(0, BROADCAST.pace)).toBe(1.5)
    expect(paceAt(-0.4, BROADCAST.pace)).toBe(1.5)
    expect(paceAt(0, BROADCAST.summaryPace)).toBe(3)
  })

  it('pace y summaryPace bajan por aboveKm hasta 0, y Highlights va siempre más deprisa', () => {
    for (const zones of [
      BROADCAST.pace,
      BROADCAST.summaryPace,
    ] as readonly (readonly PaceZone[])[]) {
      for (let i = 1; i < zones.length; i++)
        expect(zones[i]!.aboveKm).toBeLessThan(zones[i - 1]!.aboveKm)
      expect(zones.at(-1)!.aboveKm).toBe(0)
      for (const z of zones) expect(z.x).toBeGreaterThan(0)
    }
    expect(BROADCAST.summaryPace.map((z) => z.aboveKm)).toEqual(
      BROADCAST.pace.map((z) => z.aboveKm),
    )
    BROADCAST.pace.forEach((z, i) => expect(BROADCAST.summaryPace[i]!.x).toBeGreaterThan(z.x))
  })
})

describe('playbackEstimateS · la duración que anuncia la ficha (§8.2)', () => {
  /**
   * Las cinco etapas de §8.3 con el perfil de la cabecera del adaptador, en metros enteros. §8.12 y
   * §17.6 daban 8:12, 9:08, 13:10, 11:06 y 15:36, medidas en la v89 y sin redondear la cota: la v90
   * reescribió los perfiles de los puertos reales (la e18 pasa de 13:10 a 11:40) y redondear a metros
   * cambia de banda de `nominalKmh` tres km de Colombia e5 que caían en su borde (15:36 → 15:14).
   * Vueltas a medir aquí, son las de la línea base de B17 del paso 0 (`scripts/bench-pace.mjs`).
   *
   * RE-SELLADO EN EL 10b, por la altitud de la estimación (`BROADCAST.nominalAltitude`): los km de subida
   * de más del 4 % por encima de 1.000 m tardan más. La e18 (hasta 1.615 m) pasa de 11:40 a 12:07 y
   * Colombia e5 (hasta 2.274 m), de 15:14 a 16:57; las otras tres no suben por encima de 1.000 m y no se
   * mueven. Con la línea grabada, la e18 dura en `Watch` de 12:30 a 13:37 y Colombia, de 19:13 a 20:22.
   */
  it.each([
    ['race-france-e7', '8:11'],
    ['race-france-e13', '9:11'],
    ['race-france-e18', '12:07'],
    ['race-flanders-e1', '11:05'],
    ['race-colombia-e5', '16:57'],
  ] as const)('%s: Watch anuncia %s', (name, expected) => {
    expect(mmss(playbackEstimateS(strip(PACE_PROFILES[name]), BROADCAST.pace))).toBe(expected)
  })

  it('Highlights de la e18 anuncia 3:54 (4:25 en la v89, con la subida final de antes; 3:42 sin la altitud, hasta el 10b)', () => {
    const e18 = strip(PACE_PROFILES['race-france-e18'])
    expect(mmss(playbackEstimateS(e18, BROADCAST.summaryPace))).toBe('3:54')
  })

  it('la altitud (10b): un km de más del 4 % por encima de 1.000 m tarda 1 + 0,2 · (cota media − 1.000) / 1.000 veces lo de su banda', () => {
    expect(BROADCAST.nominalAltitude).toEqual({ abovePct: 4, fromM: 1000, slowdownPer1000M: 0.2 })
    const x1 = [{ aboveKm: 0, x: 1 }] as const
    // al 6 % de 1.950 a 2.010 m (cota media 1.980): 22 km/h, un 19,6 % más
    expect(playbackEstimateS(strip([1950, 2010]), x1)).toBeCloseTo((3600 / 22) * 1.196, 6)
    // al 8 % de 2.400 a 2.480 m (2.440): 16 km/h, un 28,8 % más
    expect(playbackEstimateS(strip([2400, 2480]), x1)).toBeCloseTo((3600 / 16) * 1.288, 6)
    // al 6 % por debajo de 1.000 m (de 900 a 960, 930): la de su banda
    expect(playbackEstimateS(strip([900, 960]), x1)).toBeCloseTo(3600 / 22, 6)
    // al 4 % justo (la banda de 37 km/h) o menos, y bajando, la de su banda aunque vaya alto
    expect(playbackEstimateS(strip([1500, 1540]), x1)).toBeCloseTo(3600 / 37, 6)
    expect(playbackEstimateS(strip([2000, 2030]), x1)).toBeCloseTo(3600 / 37, 6)
    expect(playbackEstimateS(strip([2010, 1950]), x1)).toBeCloseTo(3600 / 56, 6)
    // la cota media es la de los dos extremos del km: de 980 a 1.040 (1.010), un 0,2 % más
    expect(playbackEstimateS(strip([980, 1040]), x1)).toBeCloseTo((3600 / 22) * 1.002, 6)
  })

  it('cada km va a la velocidad nominal de su pendiente, por décimas, y el último parcial cuenta entero', () => {
    // 3 km llanos (44 km/h, 81,8 s de carrera por km) a ×1 en todas las zonas: 3 · 3600 / 44 s.
    const flat = strip([0, 0, 0, 0])
    expect(playbackEstimateS(flat, [{ aboveKm: 0, x: 1 }])).toBeCloseTo((3 * 3600) / 44, 6)
    // Un km al 5 % (22 km/h) y otro bajando al 5 % (56 km/h).
    const upDown = strip([100, 150, 100])
    expect(playbackEstimateS(upDown, [{ aboveKm: 0, x: 2 }])).toBeCloseTo(
      (3600 / 22 + 3600 / 56) / 2,
      6,
    )
    // La curva se aplica por décimas de km a meta: con la zona cambiando a 1 km de meta, el primer
    // km de dos va entero a ×10 y el último a ×1.
    const two = strip([0, 0, 0])
    const zones = [
      { aboveKm: 1, x: 10 },
      { aboveKm: 0, x: 1 },
    ]
    expect(playbackEstimateS(two, zones)).toBeCloseTo(3600 / 44 / 10 + 3600 / 44, 6)
  })

  it('no mira la carrera: el mismo perfil da la misma cifra, y un perfil de un solo punto da 0', () => {
    const e7 = strip(PACE_PROFILES['race-france-e7'])
    expect(playbackEstimateS(e7, BROADCAST.pace)).toBe(playbackEstimateS(e7, BROADCAST.pace))
    expect(playbackEstimateS(strip([0]), BROADCAST.pace)).toBe(0)
  })
})

describe('ttPaceAt · el ritmo de la crono por el orden de salida (§9.4)', () => {
  // 10 corredores cada 60 s: en t sale el `⌊t / 60⌋ + 1`
  const plan = { riders: 10, intervalS: 60 }

  it('×120 hasta que ha salido el 60 %, ×40 hasta el 90 % y ×12 después, con el borde en la zona de antes', () => {
    expect(ttPaceAt(0, plan, null)).toBe(120) // el primero sale en t = 0
    expect(ttPaceAt(-5, plan, null)).toBe(120)
    expect(ttPaceAt(359.9, plan, null)).toBe(120) // 6 de 10: el 60 % justo
    expect(ttPaceAt(360, plan, null)).toBe(40) // el séptimo
    expect(ttPaceAt(539.9, plan, null)).toBe(40) // 9 de 10: el 90 % justo
    expect(ttPaceAt(540, plan, null)).toBe(12) // el último
    expect(ttPaceAt(99_999, plan, null)).toBe(12)
  })

  it('×2 desde que el último en salir entra en su último km, y no antes', () => {
    expect(ttPaceAt(1199.9, plan, 1200)).toBe(12)
    expect(ttPaceAt(1200, plan, 1200)).toBe(BROADCAST.ttLastKmX)
    expect(ttPaceAt(1500, plan, 1200)).toBe(2)
  })

  it('con un solo corredor, todo es la última salida', () => {
    expect(ttPaceAt(0, { riders: 1, intervalS: 60 }, null)).toBe(12)
  })
})

describe('ttPlaybackEstimateS · la duración que anuncia una crono (§9.4)', () => {
  it('10 km llanos, 10 corredores cada 60 s: 3 + 4,5 + 61,36 + 40,91 = 109,77 s', () => {
    // el último sale a 540 s y rueda 10 km a 44 km/h (818,18 s): su último km empieza a 1276,36 s;
    // [0, 360) a ×120, [360, 540) a ×40, [540, 1276,36) a ×12 y el último km, 81,82 s, a ×2
    const flat = strip(Array.from({ length: 11 }, () => 0))
    const km = 3600 / 44
    const expected = 360 / 120 + 180 / 40 + (540 + 10 * km - km - 540) / 12 + km / 2
    expect(expected).toBeCloseTo(109.7727273, 6)
    expect(ttPlaybackEstimateS(flat, { riders: 10, intervalS: 60 })).toBeCloseTo(expected, 9)
  })

  it('no mira la carrera: solo el plan y el perfil; con más corredores, más larga', () => {
    const flat = strip(Array.from({ length: 11 }, () => 0))
    const a = ttPlaybackEstimateS(flat, { riders: 10, intervalS: 60 })
    expect(ttPlaybackEstimateS(flat, { riders: 10, intervalS: 60 })).toBe(a)
    expect(ttPlaybackEstimateS(flat, { riders: 20, intervalS: 60 })).toBeGreaterThan(a)
    // un km al 5 % (22 km/h) tras nueve llanos: el último km, a 163,64 s de carrera, va a ×2
    const climb = strip([...Array.from({ length: 10 }, () => 0), 50])
    expect(ttPlaybackEstimateS(climb, { riders: 10, intervalS: 60 })).toBeCloseTo(
      360 / 120 + 180 / 40 + (9 * (3600 / 44)) / 12 + 3600 / 22 / 2,
      9,
    )
  })

  it('la altitud (10b) también en la crono: el mismo último km al 5 %, a 2.000 m de cota media, un 20 % más', () => {
    const high = strip([...Array.from({ length: 10 }, () => 1975), 2025])
    expect(ttPlaybackEstimateS(high, { riders: 10, intervalS: 60 })).toBeCloseTo(
      360 / 120 + 180 / 40 + (9 * (3600 / 44)) / 12 + ((3600 / 22) * 1.2) / 2,
      9,
    )
  })
})

describe('digestPace y digestMinutes · el digest de While you were away (§8.2, §8.8; 8-a, 8-b, 8-m)', () => {
  const KINDS: readonly StageKind[] = ['llana', 'media', 'reina', 'cri', 'clasica']

  it('digestPace multiplica todas las zonas de summaryPace por un mismo factor, y la estimación nominal dura digestBudgetS de su tipo (menos de 1 s de error)', () => {
    for (const name of Object.keys(PACE_PROFILES) as (keyof typeof PACE_PROFILES)[]) {
      const p = strip(PACE_PROFILES[name])
      for (const kind of KINDS) {
        const zones = digestPace(p, kind)
        expect(zones.map((z) => z.aboveKm)).toEqual(BROADCAST.summaryPace.map((z) => z.aboveKm))
        const k = zones[0]!.x / BROADCAST.summaryPace[0].x
        zones.forEach((z, i) => expect(z.x / BROADCAST.summaryPace[i]!.x).toBeCloseTo(k, 9))
        expect(
          Math.abs(playbackEstimateS(p, zones) - BROADCAST.digestBudgetS[kind]),
          `${name} ${kind}`,
        ).toBeLessThan(1)
      }
    }
  })

  it('no mira la carrera: el mismo perfil y el mismo tipo dan la misma curva', () => {
    const p = strip(PACE_PROFILES['race-france-e18'])
    expect(digestPace(p, 'reina')).toEqual(digestPace(p, 'reina'))
  })

  /**
   * Los tipos de las 21 etapas de cada gran vuelta en la temporada 0 (`stagesForSeason`, el calendario
   * del motor), en su orden: `broadcastPace.test.ts` (apps/api) comprueba que son los del calendario.
   */
  const GRAND_TOURS: Readonly<Record<'italy' | 'france' | 'spain', readonly StageKind[]>> = {
    italy: [
      'llana',
      'media',
      'llana',
      'llana',
      'media',
      'llana',
      'reina',
      'media',
      'reina',
      'cri',
      'media',
      'llana',
      'media',
      'reina',
      'llana',
      'reina',
      'media',
      'media',
      'reina',
      'reina',
      'llana',
    ],
    france: [
      'cri',
      'media',
      'media',
      'media',
      'llana',
      'reina',
      'llana',
      'llana',
      'media',
      'reina',
      'llana',
      'llana',
      'media',
      'reina',
      'reina',
      'cri',
      'media',
      'reina',
      'reina',
      'reina',
      'llana',
    ],
    spain: [
      'cri',
      'media',
      'reina',
      'reina',
      'media',
      'clasica',
      'reina',
      'llana',
      'reina',
      'media',
      'llana',
      'reina',
      'media',
      'reina',
      'media',
      'llana',
      'llana',
      'cri',
      'reina',
      'reina',
      'media',
    ],
  }

  it('digestMinutes da 38, 40 y 43 con los tipos de las tres grandes vueltas (8-b)', () => {
    expect(GRAND_TOURS.italy).toHaveLength(21)
    expect(digestMinutes(GRAND_TOURS.italy)).toBe(38)
    expect(digestMinutes(GRAND_TOURS.france)).toBe(40)
    expect(digestMinutes(GRAND_TOURS.spain)).toBe(43)
  })

  it('digestMinutes: los presupuestos por tipo y los cuadros fijos (el recorrido y el ganador de cada una y el cierre final), nunca menos de uno', () => {
    // una llana: 60 s de carrera, 5 + 3 s de cuadros y 36 de cierre = 104 s, 2 min
    expect(digestMinutes(['llana'])).toBe(2)
    expect(digestMinutes([])).toBe(1)
  })

  it('en una crono, el resumen y el digest son una sola curva: ttPaceAt por la escala que lleva la estimación nominal a 120 s (8-m)', () => {
    const flat = strip(Array.from({ length: 31 }, () => 0))
    const plan = { riders: 120, intervalS: 60 }
    const k = ttDigestScale(flat, plan)
    expect(k).toBeGreaterThan(1)
    expect(ttPlaybackEstimateS(flat, plan) / k).toBeCloseTo(BROADCAST.digestBudgetS.cri, 9)
  })
})
