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
 * Huella sellada de `cri-40`.
 *
 * **NACIÓ EN LA v17 Y LLEGÓ INTACTA A LA v18**: se generó con el motor de la v17 y se comprobó
 * contra el de la v18 antes de escribirla aquí (80 comparaciones, incluidas cronos con general y
 * con dorsales de verdad, cero diferencias). Que saliera igual no fue suerte, fue por construcción:
 *
 * - El orden de salida no consume azar —sale del dorsal y de la general, que son datos de entrada—,
 *   así que no hay dado nuevo ni subflujo nuevo que desplace ninguna secuencia.
 * - La física de la crono no se tocaba: el bucle de bloques era el mismo y en el mismo orden, y el
 *   ruido final se pedía en el mismo punto. Lo único que la v18 añadió dentro del bucle fue APUNTAR
 *   el tiempo acumulado (la traza), que no lo altera.
 * - El ALCANCE es narrativa pura: se detecta leyendo las trazas YA calculadas. Alcanzar no da
 *   rebufo —está prohibido y el alcanzado se aparta—, así que si esta huella se moviera por un
 *   alcance, la crono estaría rota.
 *
 * **RESELLADA EN LA v19** (el abanico de la contrarreloj, docs/balance.md «v19»), y aquí sí tenía
 * que moverse: la tanda corrige la LEY DE VELOCIDAD, que es lo que esta huella mide, y la crono es
 * justo donde la ley se aplica sin rebufo ni grupo que la disimulen. Se comprobó que se mueve
 * EXACTAMENTE como la corrección predice —comprimiendo, y desde los dos extremos hacia el centro—:
 *
 * - **Los especialistas pierden y el pelotón gana, que es el sentido del cambio.** Primera semilla:
 *   el ganador pasa de 2838 a 2895 (**+57 s**) y el último de 3211 a 3072 (**−139 s**). La brecha
 *   entre el primero y el último cae de 13,1 % a 6,1 %, y ese 6,1 % es lo que reparte en carretera
 *   un campo de «8 especialistas y 32 corredores de crono correcto» en 40 km.
 * - **Las velocidades pasan a ser de crono.** 40 km en 2895 s son 49,7 km/h para el ganador y 46,9
 *   para el último, contra 50,7 y 44,8 de la v18. La v18 mandaba al 40.º de un campo de rodadores a
 *   44,8 km/h, que no es una crono, es un paseo.
 * - **Y la sigue ganando un especialista.** El primero de las dos semillas sigue siendo un `cri-*`,
 *   y sobre 500 cronos el invariante se queda en 98,8 % (era 99,8 %): ver docs/balance.md «v19».
 * - **Ni un dado nuevo, otra vez**: la v19 no toca el azar de la crono —el ruido final se pide en el
 *   mismo punto y del mismo subflujo—, así que todo el movimiento es de la ley y ninguno del RNG.
 */
const SEALED_ITT: Record<string, string> = {
  'cri-40-0|cri-40|1|v1':
    '1:cri-2:2895,2:cri-3:2920,3:cri-1:2923,4:cri-4:2934,5:cri-0:2935,6:cri-5:2942,7:cri-7:2952,8:cri-6:2966,9:pel-17:2966,10:pel-27:2977,11:pel-28:2978,12:pel-7:2985,13:pel-29:2986,14:pel-9:2987,15:pel-4:2989,16:pel-12:2990,17:pel-25:2994,18:pel-6:2994,19:pel-5:2996,20:pel-16:2998,21:pel-8:3006,22:pel-18:3008,23:pel-15:3018,24:pel-19:3019,25:pel-22:3023,26:pel-31:3023,27:pel-30:3026,28:pel-23:3033,29:pel-20:3033,30:pel-24:3035,31:pel-26:3037,32:pel-21:3039,33:pel-2:3045,34:pel-14:3048,35:pel-11:3049,36:pel-13:3050,37:pel-1:3051,38:pel-3:3053,39:pel-0:3056,40:pel-10:3072',
  'cri-40-1|cri-40|1|v1':
    '1:cri-2:2888,2:cri-4:2922,3:cri-7:2929,4:cri-6:2949,5:cri-5:2951,6:pel-8:2955,7:cri-3:2965,8:pel-9:2968,9:pel-15:2970,10:pel-29:2975,11:cri-0:2977,12:cri-1:2980,13:pel-19:2982,14:pel-6:2998,15:pel-18:3000,16:pel-7:3000,17:pel-5:3009,18:pel-24:3014,19:pel-23:3023,20:pel-26:3024,21:pel-27:3025,22:pel-16:3027,23:pel-22:3027,24:pel-28:3031,25:pel-13:3031,26:pel-14:3033,27:pel-3:3034,28:pel-1:3034,29:pel-25:3035,30:pel-11:3039,31:pel-31:3040,32:pel-2:3046,33:pel-30:3047,34:pel-12:3049,35:pel-10:3053,36:pel-20:3057,37:pel-4:3059,38:pel-21:3064,39:pel-17:3069,40:pel-0:3079',
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

/**
 * EL CORTE DE TIEMPO DE LA CRONO (v20, docs/motor.md §VI.3). La deuda que abrió la v14 —«no se aplica
 * el corte en contrarreloj, y por tanto la etapa 1 de una gran vuelta no elimina a nadie aunque el
 * último entre 36 % detrás»— y que la v19 dejó medida y sin activar.
 */
describe('el corte de tiempo de la crono (v20)', () => {
  it('una crono normal no elimina a nadie', () => {
    // 120 corredores de 44 a 65 de nivel en 33 km llanos: el campo de una crono de producción. La
    // cola de un campo así vive en el 13-15 % y el corte está en el 25 %.
    for (let s = 0; s < 6; s++) {
      const out = simulateTimeTrial(
        itt(field(120, true)),
        stageSeed({ worldSeed: `corte-${s}`, raceId: 'itt', stageDay: 3, engineVersion: 1 }),
      )
      expect(out.results.filter((r) => r.estado !== 'finish')).toHaveLength(0)
      expect(of(out, 'time_cut')).toHaveLength(0)
    }
  })

  it('…pero sí señala al que se queda tirado del todo', () => {
    const out = simulateTimeTrial(itt(stranded(1)), 'tirado')
    const suyo = out.results.find((r) => r.riderId === 'tirado-0')!
    expect(suyo.estado).toBe('dnf')
    expect(suyo.puesto).toBe(0)
    // Tiene tiempo —cruzó la meta— pero no se clasifica, que es la diferencia entre `dnf` y
    // `abandon` en este proyecto.
    expect(suyo.tiempoS).toBeGreaterThan(0)
    // Y no se lleva a nadie más por delante.
    expect(out.results.filter((r) => r.estado === 'dnf')).toHaveLength(1)
    // Los clasificados conservan puestos correlativos desde el 1: el eliminado no gasta número.
    const puestos = out.results.filter((r) => r.estado === 'finish').map((r) => r.puesto)
    expect(puestos).toEqual(puestos.map((_, i) => i + 1))
  })

  it('lo que no cabe en el tope del 4% se readmite con penalización', () => {
    // La salvaguarda de §VI.3, resuelta con el MISMO `applyTimeCut` que la carretera para que el
    // corte no pueda divergir entre las dos disciplinas. Ocho corredores tirados sobre un campo de
    // 28: el tope deja irse a uno (4 % de 28 = 1) y los otros siete vuelven a la carrera.
    const riders = stranded(8)
    const out = simulateTimeTrial(itt(riders), 'masacre')
    const fuera = out.results.filter((r) => r.estado === 'dnf')
    expect(fuera.length).toBe(Math.floor(STAGE.abandonStageCapFraction * riders.length))
    const readmitidos = of(out, 'time_cut_readmitted')
    expect(readmitidos).toHaveLength(1)
    expect(Number(readmitidos[0]!.datos!.count)).toBe(8 - fuera.length)
    // Y el readmitido sigue clasificado: la penalización del reglamento le quita los puntos de la
    // etapa, que en una crono no existen, pero no el tiempo ni el puesto.
    expect(out.results.filter((r) => r.estado === 'finish')).toHaveLength(riders.length - 1)
  })
})

/**
 * Un campo de 20 corredores buenos más N a los que se les ha roto el día.
 *
 * **EL CORREDOR TIRADO ESTÁ EN EL FONDO DE LA ESCALA A PROPÓSITO, y ese detalle dice algo del
 * modelo.** Con la ley de velocidad de la v19 el NIVEL por sí solo no puede repartir más de un ~26 %
 * en llano (`p75PowerFloor` = 0,55 topa la escala: `(1/0,55)^0,39` = 1,263), así que un corte del
 * 25 % está por encima de casi todo lo que el motor sabe expresar. Es lo correcto —el reglamento no
 * quiere eliminar al último clasificado, quiere eliminar al que se queda tirado— y a la vez es lo que
 * hay que saber al leer el resultado: **en una crono de producción este corte no va a saltar hasta
 * que el motor modele el pinchazo y la caída dentro de una contrarreloj**, que hoy no lo hace
 * (`simulateTimeTrial` devuelve `incidents: []`). Queda anotado en docs/balance.md «v20».
 */
function stranded(n: number): StageRider[] {
  const base = Object.fromEntries(ATTRS.map((a) => [a, 90])) as Record<Attribute, number>
  const roto = Object.fromEntries(ATTRS.map((a) => [a, 1])) as Record<Attribute, number>
  const one = (id: string, eff0: Record<Attribute, number>, energy: number): StageRider => ({
    riderId: id,
    eff0,
    energy,
    matches: 3,
    tsb: 0,
    orders: { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false },
    gcDeficitSeconds: 0,
  })
  // 24 corredores buenos y no 20: el tope del 4 % es `floor(0,04·N)`, así que por debajo de 25
  // participantes vale CERO y el corte no puede eliminar a nadie —lo readmite todo—. Es correcto
  // (una carrera de veinte no elimina a nadie por tiempo) y es la razón por la que este banco de
  // laboratorio necesita un campo mínimo para poder demostrar el corte.
  const riders = Array.from({ length: 24 }, (_, i) => one(`r-${i}`, base, 100))
  for (let i = 0; i < n; i++) riders.push(one(`tirado-${i}`, roto, 1))
  return riders
}

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
