/**
 * LA RADIO DE CARRERA (v28): la carrera km a km, y la prueba de que no toca la carrera.
 *
 * Dos cosas que verificar, y las dos importan por igual:
 *
 * 1. **Que la cuenta sea la cuenta.** Los huecos son una RESTA de relojes, no una estimación, y los
 *    grupos salen ordenados por carretera: es justo lo que se hacía a mano —y mal— reconstruyendo
 *    la carrera desde el reguero de eventos. Se comprueba sobre fotos escritas a mano, donde la
 *    respuesta se sabe de antemano, y luego sobre una etapa de verdad.
 * 2. **Que mirar no cambie nada.** `StageProbe` es observación pura y esta tanda le añade quién
 *    releva: la etapa con probe y sin probe tiene que dar el MISMO resultado, dígito a dígito. Es
 *    la misma garantía que sellan `attribution.test.ts` y `timetrial.test.ts`, comprobada aquí
 *    contra el camino nuevo.
 */
import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import { simulateStage } from '../stage/simulate.js'
import { stageSeed } from '../stage/rng.js'
import type { SnapshotRider } from '../stage/types.js'
import { queenScenario } from './scenarios.js'
import { checkReplay, raceRadioCollector, radioKmFrom, radioKmPoints } from './raceRadio.js'

function rider(
  riderId: string,
  groupId: string,
  tS: number,
  extra: Partial<SnapshotRider> = {},
): SnapshotRider {
  return {
    riderId,
    groupId,
    tS,
    energy: 500,
    energy0: 1000,
    relaying: false,
    onTheFront: false,
    pullWindow: 0,
    ...extra,
  }
}

describe('radioKmFrom', () => {
  it('ordena los grupos por carretera y mide el hueco al líder restando relojes', () => {
    const km = radioKmFrom(
      42,
      [
        rider('p1', 'peloton', 5000),
        rider('p2', 'peloton', 5002),
        rider('f1', 'mov-1', 4849),
        rider('g1', 'shed-1', 5364),
      ],
      4,
    )
    expect(km.groups.map((g) => g.id)).toEqual(['mov-1', 'peloton', 'shed-1'])
    expect(km.groups.map((g) => g.gapS)).toEqual([0, 151, 515])
    // El reloj del GRUPO es el de su primer hombre, no el del último ni la media: el grupo va donde
    // va su cabeza, y dentro cada uno lleva encima su propia deriva.
    expect(km.groups[1]!.tS).toBe(5000)
    expect(km.groups.map((g) => g.position)).toEqual([1, 2, 3])
  })

  it('nombra a cada grupo por lo que es, y un pelotón de seis sigue siendo el pelotón', () => {
    const km = radioKmFrom(
      120,
      [
        rider('f1', 'mov-1', 4000),
        rider('c1', 'mov-2', 4100),
        ...Array.from({ length: 6 }, (_, i) => rider(`p${i}`, 'peloton', 4300)),
        rider('t1', 'mov-3', 4400),
        rider('g1', 'shed-1', 4900),
      ],
      9,
    )
    expect(km.groups.map((g) => g.kind)).toEqual(['fuga', 'contra', 'peloton', 'tierra', 'grupeto'])
  })

  /**
   * EL PELOTÓN ES EL QUE LLEVA LA GENTE (v29). Esta tabla llegó a imprimir «[3] pelotón 2 · [4]
   * grupeto 15 … cola 100 en 4 grupos»: un pelotón de dos corredores con cien detrás llamados
   * grupeto, porque el nombre venía del ORIGEN del grupo y esos nombres no caducan.
   */
  it('dos supervivientes no son el pelotón cuando detrás van cien', () => {
    const km = radioKmFrom(
      151,
      [
        rider('f1', 'mov-1', 4000),
        ...Array.from({ length: 2 }, (_, i) => rider(`p${i}`, 'peloton', 4300)),
        ...Array.from({ length: 100 }, (_, i) => rider(`s${i}`, 'shed-3', 4700)),
      ],
      103,
    )
    // El de cien es el pelotón; los dos de delante, un grupo escapado; y la etiqueta vieja se cae.
    expect(km.groups.map((g) => g.kind)).toEqual(['fuga', 'contra', 'peloton'])
    expect(km.mainId).toBe('shed-3')
  })

  it('dos mitades parecidas no se turnan el título de una foto a la otra', () => {
    const foto = (previous: string | null) =>
      radioKmFrom(
        12,
        [
          ...Array.from({ length: 53 }, (_, i) => rider(`p${i}`, 'peloton', 4300)),
          ...Array.from({ length: 55 }, (_, i) => rider(`s${i}`, 'shed-1', 4310)),
        ],
        108,
        3,
        previous,
      )
    // Sin memoria manda el tamaño; con memoria, el que lo tenía lo conserva —55 no supera a 53 con
    // el margen que exige `mainGroupId`— y la tabla no baila kilómetro sí, kilómetro no.
    expect(foto(null).mainId).toBe('shed-1')
    expect(foto('peloton').mainId).toBe('peloton')
  })

  it('cuenta los que faltan contra los que tomaron la salida', () => {
    const km = radioKmFrom(80, [rider('a', 'peloton', 100), rider('b', 'peloton', 100)], 119)
    expect(km.racing).toBe(2)
    expect(km.gone).toBe(117)
  })

  it('nombra primero al que da la cara al viento y luego al que más lleva puesto', () => {
    const km = radioKmFrom(
      60,
      [
        rider('a', 'peloton', 100, { relaying: true, pullWindow: 9 }),
        rider('b', 'peloton', 100, { relaying: true, onTheFront: true, pullWindow: 2 }),
        rider('c', 'peloton', 100, { relaying: true, pullWindow: 40 }),
        rider('d', 'peloton', 100),
      ],
      4,
      2,
    )
    expect(km.groups[0]!.pulling.map((p) => p.riderId)).toEqual(['b', 'c'])
  })

  it('da el depósito medio del grupo en % de con lo que salieron', () => {
    const km = radioKmFrom(
      60,
      [
        rider('a', 'peloton', 100, { energy: 300, energy0: 1000 }),
        rider('b', 'peloton', 100, { energy: 700, energy0: 1000 }),
      ],
      2,
    )
    expect(km.groups[0]!.energyPct).toBeCloseTo(50, 6)
  })
})

describe('radioKmPoints', () => {
  it('pide un km de cada uno y remata en el último bloque del recorrido', () => {
    const kms = radioKmPoints(151)
    expect(kms[0]).toBe(1)
    expect(kms).toContain(75)
    expect(kms[kms.length - 1]).toBeCloseTo(151 - STAGE.dx, 6)
    expect(kms.every((km, i) => i === 0 || km > kms[i - 1]!)).toBe(true)
  })
})

describe('checkReplay', () => {
  it('una etapa que corrió con el motor de hoy se puede reconstruir', () => {
    expect(checkReplay(ENGINE_VERSION).faithful).toBe(true)
  })

  it('una etapa que corrió con OTRO motor no se puede reconstruir, ni la anterior ni la siguiente', () => {
    // Las dos direcciones importan: un snapshot viejo re-simulado con el motor nuevo cuenta otra
    // carrera, y un árbol viejo leyendo un snapshot nuevo, también. La regla es la IGUALDAD.
    expect(checkReplay(ENGINE_VERSION - 1).faithful).toBe(false)
    expect(checkReplay(ENGINE_VERSION + 1).faithful).toBe(false)
    expect(checkReplay(ENGINE_VERSION - 1)).toEqual({
      faithful: false,
      ranWith: ENGINE_VERSION - 1,
      today: ENGINE_VERSION,
    })
  })
})

describe('la radio no toca la carrera', () => {
  const scenario = queenScenario()
  const seed = stageSeed({
    worldSeed: 'radio',
    raceId: 'reina-150',
    stageDay: 1,
    engineVersion: 1,
  })
  const huella = (results: ReturnType<typeof simulateStage>['results']): string =>
    results.map((r) => `${r.puesto}:${r.riderId}:${r.tiempoS}`).join('|')

  it('la etapa sale idéntica con radio y sin radio', () => {
    const sin = simulateStage(scenario.input, seed)
    const radio = raceRadioCollector(radioKmPoints(150, 5))
    const con = simulateStage(scenario.input, seed, radio.probe)
    expect(huella(con.results)).toBe(huella(sin.results))
  })

  it('en una etapa de verdad los grupos suman los que quedan en carrera y los huecos crecen hacia atrás', () => {
    const radio = raceRadioCollector(radioKmPoints(150, 5))
    simulateStage(scenario.input, seed, radio.probe)
    const out = radio.radio()
    expect(out.kms.length).toBeGreaterThan(10)
    for (const km of out.kms) {
      // La foto es una PARTICIÓN: cada corredor en carrera está en uno y solo un grupo.
      const sizes = km.groups.reduce((n, g) => n + g.size, 0)
      expect(sizes).toBe(km.racing)
      expect(km.racing + km.gone).toBe(out.starters)
      // Y el orden de carretera es el orden de los huecos: el primero a 0 y de ahí, hacia atrás.
      expect(km.groups[0]!.gapS).toBe(0)
      for (let i = 1; i < km.groups.length; i++) {
        expect(km.groups[i]!.gapS).toBeGreaterThanOrEqual(km.groups[i - 1]!.gapS)
      }
    }
  })

  it('el que va tirando está en el grupo del que tira', () => {
    const radio = raceRadioCollector(radioKmPoints(150, 5))
    simulateStage(scenario.input, seed, radio.probe)
    let pullersSeen = 0
    for (const km of radio.radio().kms) {
      for (const g of km.groups) {
        for (const p of g.pulling) {
          expect(g.riderIds).toContain(p.riderId)
          pullersSeen += 1
        }
      }
    }
    // Y no es una lista vacía por construcción: en una etapa siempre hay alguien dando la cara.
    expect(pullersSeen).toBeGreaterThan(0)
  })
})
