/**
 * LA CONTRARRELOJ CON ORDEN DE SALIDA (v18, docs/balance.md «v18 — La contrarreloj»).
 *
 * La tanda añade el reloj de carrera —hora de salida, hora de llegada, silla del mejor tiempo,
 * parciales y alcances— y su criterio de aceptación es que **no mueve el tiempo de nadie**. El
 * primer test es el que lo demuestra y el que hay que mirar si algún día esto se rompe: la huella
 * `puesto:corredor:tiempo` de la crono canónica es la MISMA que en la v17, dígito a dígito.
 */
import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { campaignSeeds, timeTrialScenario } from '../sim/scenarios.js'
import { stageSeed } from './rng.js'
import { simulateTimeTrial } from './timetrial.js'
import type { Attribute } from '@cyclingstar/shared'
import type { RaceEvent, StageInput, StageOutput, StageRider } from './types.js'

/**
 * Huella sellada de `cri-40`. **Es la de la v17**: se generó con el motor de la v17 y se comprobó
 * contra el de la v18 antes de escribirla aquí (80 comparaciones, incluidas cronos con general y
 * con dorsales de verdad, cero diferencias). Que salga igual no es suerte, es por construcción:
 *
 * - El orden de salida no consume azar —sale del dorsal y de la general, que son datos de entrada—,
 *   así que no hay dado nuevo ni subflujo nuevo que desplace ninguna secuencia.
 * - La física de la crono no se toca: el bucle de bloques es el mismo y en el mismo orden, y el
 *   ruido final se sigue pidiendo en el mismo punto. Lo único que se añade dentro del bucle es
 *   APUNTAR el tiempo acumulado (la traza), que no lo altera.
 * - El ALCANCE es narrativa pura: se detecta leyendo las trazas YA calculadas. Alcanzar no da
 *   rebufo —está prohibido y el alcanzado se aparta—, así que si esta huella se moviera por un
 *   alcance, la crono estaría rota.
 */
const SEALED_ITT: Record<string, string> = {
  'cri-40-0|cri-40|1|v1':
    '1:cri-2:2838,2:cri-3:2851,3:cri-5:2882,4:cri-0:2888,5:cri-4:2895,6:cri-1:2906,7:cri-7:2918,8:cri-6:2971,9:pel-28:2986,10:pel-27:2992,11:pel-7:2999,12:pel-9:3005,13:pel-4:3014,14:pel-29:3020,15:pel-17:3024,16:pel-12:3029,17:pel-8:3034,18:pel-6:3039,19:pel-5:3045,20:pel-25:3051,21:pel-16:3052,22:pel-18:3057,23:pel-19:3064,24:pel-15:3078,25:pel-22:3079,26:pel-30:3093,27:pel-23:3095,28:pel-31:3102,29:pel-26:3103,30:pel-24:3106,31:pel-11:3126,32:pel-21:3129,33:pel-0:3130,34:pel-1:3132,35:pel-20:3133,36:pel-3:3134,37:pel-13:3156,38:pel-14:3157,39:pel-2:3160,40:pel-10:3211',
  'cri-40-1|cri-40|1|v1':
    '1:cri-2:2829,2:cri-4:2843,3:cri-7:2887,4:cri-5:2923,5:cri-6:2927,6:cri-0:2934,7:cri-3:2963,8:pel-8:2979,9:pel-9:2988,10:pel-15:2990,11:pel-29:2994,12:cri-1:2995,13:pel-19:3007,14:pel-18:3032,15:pel-7:3036,16:pel-6:3044,17:pel-28:3054,18:pel-26:3066,19:pel-5:3068,20:pel-27:3072,21:pel-16:3080,22:pel-25:3086,23:pel-23:3094,24:pel-14:3099,25:pel-3:3101,26:pel-13:3103,27:pel-11:3104,28:pel-22:3110,29:pel-24:3110,30:pel-31:3118,31:pel-12:3122,32:pel-2:3123,33:pel-1:3140,34:pel-4:3155,35:pel-20:3156,36:pel-10:3161,37:pel-17:3171,38:pel-21:3171,39:pel-30:3200,40:pel-0:3232',
}

// --- Campo de pruebas (arriba porque lo usan las constantes de módulo de más abajo) ------------

const ATTRS: Attribute[] = ['RES', 'REC', 'LLA', 'MON', 'COL', 'CRI', 'SPR', 'DES', 'PAV', 'TAC']

const fingerprint = (out: StageOutput): string =>
  out.results.map((r) => `${r.puesto}:${r.riderId}:${r.tiempoS}`).join(',')

describe('el orden de salida NO mueve el tiempo de nadie', () => {
  it('la huella de la crono canónica es la misma que la de la v17', () => {
    const scenario = timeTrialScenario()
    for (const seed of campaignSeeds(scenario.name, 2)) {
      const expected = SEALED_ITT[seed]
      expect(expected, `falta la huella sellada de ${seed}`).toBeDefined()
      expect(fingerprint(simulateTimeTrial(scenario.input, seed))).toBe(expected)
    }
  })

  it('cambiar la rampa entera no cambia una sola clasificación', () => {
    // La prueba directa de que el alcance no da rebufo: la MISMA crono corrida con orden de
    // dorsales y con orden inverso de la general tiene que dar los mismos tiempos y los mismos
    // puestos. Si alguien alcanzado ganara (o perdiera) tiempo, aquí se vería.
    for (let s = 0; s < 6; s++) {
      const seed = stageSeed({
        worldSeed: `rampa-${s}`,
        raceId: 'itt',
        stageDay: 1,
        engineVersion: 1,
      })
      const porDorsales = fingerprint(simulateTimeTrial(itt(field(90, false)), seed))
      const porGeneral = fingerprint(simulateTimeTrial(itt(field(90, true)), seed))
      expect(porGeneral).toBe(porDorsales)
    }
  })
})

// --- La crónica de la crono -------------------------------------------------------------------

const runs = Array.from({ length: 8 }, (_, s) =>
  simulateTimeTrial(
    itt(field(120, true)),
    stageSeed({ worldSeed: `cron-${s}`, raceId: 'itt', stageDay: 3, engineVersion: 1 }),
  ),
)
const of = (out: StageOutput, plantilla: string): RaceEvent[] =>
  out.events.filter((e) => e.plantilla === plantilla)

describe('una crono ya no es una línea de journal', () => {
  it('cuenta la salida, el mejor tiempo, los parciales, los alcances y el desenlace', () => {
    for (const out of runs) {
      expect(of(out, 'tt_start_order')).toHaveLength(1)
      expect(of(out, 'tt_last_off')).toHaveLength(1)
      expect(of(out, 'tt_first_time')).toHaveLength(1)
      expect(of(out, 'stage_win_itt')).toHaveLength(1)
      expect(of(out, 'tt_best_time').length).toBeGreaterThan(0)
      expect(of(out, 'tt_split').length).toBeGreaterThan(0)
    }
  })

  it('sale un número de líneas comparable al de una etapa en línea, no una por corredor', () => {
    // Las etapas en línea de producción van de 25 a 44 líneas (mediana 38). Una crono de 120
    // corredores no puede narrar 120 salidas: el techo es el throttle, no el tamaño del campo.
    for (const out of runs) {
      expect(out.events.length).toBeGreaterThanOrEqual(12)
      expect(out.events.length).toBeLessThanOrEqual(45)
    }
  })

  it('el reloj de carrera avanza y los eventos salen ordenados por él', () => {
    for (const out of runs) {
      for (let i = 1; i < out.events.length; i++) {
        expect(out.events[i]!.tS).toBeGreaterThanOrEqual(out.events[i - 1]!.tS)
      }
      // La rampa se abre en el segundo 0 y el último sale mucho después: eso ES el reloj.
      expect(out.events[0]!.plantilla).toBe('tt_start_order')
      expect(of(out, 'tt_last_off')[0]!.tS).toBeGreaterThan(0)
    }
  })

  it('la silla del mejor tiempo solo cambia hacia abajo, y respeta su throttle', () => {
    for (const out of runs) {
      const seat = [of(out, 'tt_first_time')[0]!, ...of(out, 'tt_best_time')]
      let prev = Infinity
      for (const e of seat) {
        const t = Number(e.datos!.timeS)
        expect(t).toBeLessThan(prev)
        prev = t
      }
      expect(of(out, 'tt_best_time').length).toBeLessThanOrEqual(STAGE.ttBestNarrateMax)
    }
  })

  it('el ganador es el del mejor tiempo, y se canta cuando el resultado ya no puede cambiar', () => {
    for (const out of runs) {
      const win = of(out, 'stage_win_itt')[0]!
      expect(win.protagonistas[0]).toBe(out.results[0]!.riderId)
      expect(Number(win.datos!.timeS)).toBe(out.results[0]!.tiempoS)
      // Es el último evento de la crónica: nadie puede ya bajarle el tiempo.
      expect(win.tS).toBe(Math.max(...out.events.map((e) => e.tS)))
    }
  })

  it('los alcances se cuentan con variedad: nadie sale dos veces en el parte', () => {
    for (const out of runs) {
      const seen = new Set<string>()
      for (const e of of(out, 'tt_catch')) {
        expect(e.protagonistas).toHaveLength(2)
        for (const id of e.protagonistas) {
          expect(seen.has(id)).toBe(false)
          seen.add(id)
        }
        // El alcanzado salió ANTES: alcanzar es cazar a quien te precede en la rampa.
        expect(Number(e.datos!.headStartS)).toBeGreaterThan(0)
      }
      expect(of(out, 'tt_catch').length).toBeLessThanOrEqual(STAGE.ttCatchNarrateMax)
    }
  })

  it('el recuento de alcances no se maquilla: dice cuántos hubo de verdad', () => {
    for (const out of runs) {
      const total = of(out, 'tt_catches')[0]
      if (!total) continue
      expect(Number(total.datos!.count)).toBeGreaterThanOrEqual(of(out, 'tt_catch').length)
    }
  })
})

describe('bordes de la crono', () => {
  it('una crono de un solo corredor se cuenta sin inventarse un rival', () => {
    const out = simulateTimeTrial(itt(field(1, false)), 'sola')
    expect(out.results).toHaveLength(1)
    expect(of(out, 'tt_last_off')).toHaveLength(0)
    expect(of(out, 'tt_catch')).toHaveLength(0)
    expect(of(out, 'stage_win_itt')).toHaveLength(1)
  })

  it('un prólogo cortísimo no pone parciales pegados a la salida ni a la meta', () => {
    const out = simulateTimeTrial(
      {
        profile: { segments: [{ km: 3, tipo: 'llano' }] },
        riders: field(30, false),
        timeTrial: true,
      },
      'prologo',
    )
    for (const e of of(out, 'tt_split')) {
      expect(Number(e.datos!.checkKm)).toBeGreaterThanOrEqual(STAGE.ttSplitMinKm)
      expect(3 - Number(e.datos!.checkKm)).toBeGreaterThanOrEqual(STAGE.ttSplitMinKm)
    }
  })
})

/** Un campo con equipos y dorsales de verdad; con `withGc`, además, una general repartida. */
function field(n: number, withGc: boolean): StageRider[] {
  const riders: StageRider[] = []
  for (let i = 0; i < n; i++) {
    const team = Math.floor(i / 9)
    const inTeam = i % 9
    const level = 52 + ((team * 5) % 26) - inTeam * 1.5
    const eff0 = Object.fromEntries(ATTRS.map((a) => [a, level])) as Record<Attribute, number>
    eff0.CRI = level + (inTeam === 0 ? 8 : 0)
    riders.push({
      riderId: `r${String(i).padStart(3, '0')}`,
      eff0,
      energy: 100,
      matches: 4,
      tsb: 0,
      orders: { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false },
      // Una general con empates a montones, como la de verdad tras una etapa llana.
      gcDeficitSeconds: withGc ? Math.floor(i / 7) * 43 : 0,
      bib: (team + 1) * 10 + inTeam + 1,
      teamId: `t${team}`,
    })
  }
  return riders
}

/** Una crono llana de 33 km, la del calendario (Race Colombia e3). */
function itt(riders: StageRider[]): StageInput {
  return { profile: { segments: [{ km: 33, tipo: 'llano' }] }, riders, timeTrial: true }
}
