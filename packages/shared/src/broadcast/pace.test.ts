import { describe, expect, it } from 'vitest'
import { PACE_PROFILES } from './__fixtures__/paceProfiles.js'
import { BROADCAST } from './constants.js'
import { paceAt, playbackEstimateS } from './pace.js'
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
   */
  it.each([
    ['race-france-e7', '8:11'],
    ['race-france-e13', '9:11'],
    ['race-france-e18', '11:40'],
    ['race-flanders-e1', '11:05'],
    ['race-colombia-e5', '15:14'],
  ] as const)('%s: Watch anuncia %s', (name, expected) => {
    expect(mmss(playbackEstimateS(strip(PACE_PROFILES[name]), BROADCAST.pace))).toBe(expected)
  })

  it('Highlights de la e18 anuncia 3:42 (4:25 en la v89, con la subida final de antes)', () => {
    const e18 = strip(PACE_PROFILES['race-france-e18'])
    expect(mmss(playbackEstimateS(e18, BROADCAST.summaryPace))).toBe('3:42')
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
