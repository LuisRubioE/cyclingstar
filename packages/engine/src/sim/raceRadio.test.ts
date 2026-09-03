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
import {
  checkReplay,
  raceRadioCollector,
  radioForStorage,
  radioKmFrom,
  radioKmPoints,
} from './raceRadio.js'

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
    pulling: false,
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

  it('nombra a los que TIRAN, y entre ellos primero al que más lleva puesto', () => {
    // Desde la v34 todos los que tiran pagan el mismo viento, así que lo único que ordena esta
    // lista es cuánto trabajo lleva cada uno en la ventana: no hay un «da la cara» que adelante a
    // nadie con dos unidades puestas por delante de otro con cuarenta.
    const km = radioKmFrom(
      60,
      [
        rider('a', 'peloton', 100, { pulling: true, pullWindow: 9 }),
        rider('b', 'peloton', 100, { pulling: true, pullWindow: 2 }),
        rider('c', 'peloton', 100, { pulling: true, pullWindow: 40 }),
        rider('d', 'peloton', 100),
      ],
      4,
      2,
    )
    expect(km.groups[0]!.pulling.map((p) => p.riderId)).toEqual(['c', 'a'])
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
  it('pide un km de cada uno, EMPIEZA EN LA SALIDA y remata en el último bloque', () => {
    const kms = radioKmPoints(151)
    // La primera foto es la de la SALIDA. Era la del km 1, y para entonces la carrera ya ha pasado
    // por diez bloques de decisión —medido, un 73,5 % de las etapas llega al km 1 con más de un
    // grupo—, así que la tabla abría siempre con una fuga hecha y no enseñaba nunca el pelotón
    // junto del que sale.
    expect(kms[0]).toBe(0)
    expect(kms).toContain(1)
    expect(kms).toContain(75)
    expect(kms[kms.length - 1]).toBeCloseTo(151 - STAGE.dx, 6)
    expect(kms.every((km, i) => i === 0 || km > kms[i - 1]!)).toBe(true)
  })
})

describe('radioForStorage: a quién se puede nombrar', () => {
  /** Una foto con un grupo del tamaño que se pida, sin nadie relevando salvo el primero. */
  const fotoDe = (size: number): SnapshotRider[] =>
    Array.from({ length: size }, (_, i) => rider(`r-${i}`, 'mov-1', 100, { pulling: i === 0 }))

  it('en un grupo PEQUEÑO se nombra a todos, tiren o no y lleven maillot o no', () => {
    // La queja, textual: una escapada de DOS enseñaba a uno y «+1 rider more». En carretera, de un
    // grupo de dos se sabe quién va: son dos.
    const km = radioKmFrom(10, fotoDe(2), 2)
    const stored = radioForStorage({ starters: 2, kms: [km] }, new Set())
    const g = stored.kms[0]!.groups[0]!
    expect(g.pulling.length + g.watching.length).toBe(2)
  })

  it('y en uno de once perseguidores, a los once', () => {
    const km = radioKmFrom(10, fotoDe(11), 11)
    const stored = radioForStorage({ starters: 11, kms: [km] }, new Set())
    const g = stored.kms[0]!.groups[0]!
    expect(g.pulling.length + g.watching.length).toBe(11)
  })

  /**
   * LOS TRES MAILLOTS NO SE CAEN DEL CORTE (v47), y esta prueba existe porque el dueño lo reportó
   * DOS VECES: «te dije que SIEMPRE se vean los 3 maillots y solo sale uno».
   *
   * No faltaba el dato: iba en el sitio equivocado de la cola. La vista nombra 24 por grupo
   * (`MAX_NAMED_PER_GROUP` en apps/api) poniendo PRIMERO a los que tiran —hasta doce—, y la lista de
   * seguimiento venía detrás EN ORDEN DE CARRETERA. Con doce tirando, el corte caía justo encima de
   * los maillots y cuál sobrevivía era puro azar.
   */
  it('los maillots van los PRIMEROS de la lista de seguimiento, para que el corte no se los coma', () => {
    // Un pelotón de 120 con doce relevando y tres maillots muy atrás en la carretera: exactamente la
    // forma en la que el defecto se veía.
    const foto = Array.from({ length: 120 }, (_, i) =>
      rider(`r-${i}`, 'mov-1', 100, { pulling: i < 12, pullWindow: 12 - i }),
    )
    const maillots = ['r-90', 'r-105', 'r-119']
    const watch = new Set([...maillots, 'r-40', 'r-41', 'r-42', 'r-43'])
    const km = radioKmFrom(10, foto, 120)
    const stored = radioForStorage({ starters: 120, kms: [km] }, watch, maillots)
    const g = stored.kms[0]!.groups[0]!
    const nombre = (i: number): string => stored.riders[i] ?? ''
    // Los tres, y en el orden en que se pidieron: amarillo, puntos, montaña.
    expect(g.watching.slice(0, 3).map(nombre)).toEqual(maillots)
    // Y lo que de verdad importa: sobreviven al corte de la vista, sean cuantos sean los que tiran.
    const MAX_NAMED_PER_GROUP = 24
    const mostrados = [...g.pulling, ...g.watching].slice(0, MAX_NAMED_PER_GROUP).map(nombre)
    for (const m of maillots)
      expect(`${m} visible=${mostrados.includes(m)}`).toBe(`${m} visible=true`)
    // …y el resto de la lista de seguimiento conserva el orden de carretera, que es lo que hace
    // legible la tabla: no se reordena todo, solo se adelanta a los que no pueden faltar.
    expect(g.watching.slice(3).map(nombre)).toEqual(['r-40', 'r-41', 'r-42', 'r-43'])
  })

  it('pero en el PELOTÓN no: ahí se nombra a quien hay que seguir y el resto se cuenta', () => {
    // Nombrar a ciento veinte no es información, es ruido: para eso está el «+N more».
    const km = radioKmFrom(10, fotoDe(120), 120)
    const stored = radioForStorage({ starters: 120, kms: [km] }, new Set(['r-77']))
    const g = stored.kms[0]!.groups[0]!
    expect(g.pulling.length + g.watching.length).toBeLessThan(120)
    // …y el que hay que seguir sigue estando.
    expect(g.watching.length).toBe(1)
  })
})

describe('radioForStorage: la velocidad de un grupo la miden SUS HOMBRES', () => {
  /**
   * El defecto que arregla, visto en producción tres veces seguidas: «2nd group 31 riders — 62,2
   * km/h», «Grupetto 1 rider — 56,8 km/h» con el grupo de delante a 40. La velocidad se calculaba
   * restando el reloj del grupo de destino menos el de este, y los dos son el MÍNIMO de sus
   * miembros: en cuanto la composición cambia —y cambia justo cuando uno mira la radio: un pelotón
   * que se parte, un descolgado al que cazan— la resta deja de ser tiempo de carretera.
   */
  it('a un descolgado al que cazan se le mide por SU reloj, no por el del grupo que se lo come', () => {
    // km 10: el solitario va 90 s detrás del pelotón. km 11: ya va dentro, pero con su deriva
    // encima (1170), mientras la cabeza del pelotón marca 1100. Su kilómetro le costó 80 s: 45 km/h.
    const aqui = radioKmFrom(
      10,
      [
        ...Array.from({ length: 30 }, (_, i) => rider(`pel-${i}`, 'peloton', 1000)),
        rider('solo', 'shed-1', 1090, { pulling: true }),
      ],
      31,
    )
    const luego = radioKmFrom(
      11,
      [
        ...Array.from({ length: 30 }, (_, i) => rider(`pel-${i}`, 'peloton', 1100)),
        rider('solo', 'peloton', 1170),
      ],
      31,
    )
    const stored = radioForStorage({ starters: 31, kms: [aqui, luego] }, new Set())
    const suyo = stored.kms[0]!.groups.find((g) => g.size === 1)!
    // Con la cuenta vieja salían 1 km en 10 s (1100 − 1090), o sea 360 km/h.
    expect(suyo.speedKmh).toBeCloseTo(45, 1)
  })

  it('la mediana aguanta a los dos que se están descolgando del grupo', () => {
    // Veinte a 80 s el kilómetro (45 km/h) y dos que ceden treinta: el grupo va a 45, no a 40.
    const aqui = radioKmFrom(
      20,
      Array.from({ length: 22 }, (_, i) => rider(`r-${i}`, 'peloton', 2000)),
      22,
    )
    const luego = radioKmFrom(
      21,
      Array.from({ length: 22 }, (_, i) => rider(`r-${i}`, 'peloton', i < 20 ? 2080 : 2110)),
      22,
    )
    const stored = radioForStorage({ starters: 22, kms: [aqui, luego] }, new Set())
    expect(stored.kms[0]!.groups[0]!.speedKmh).toBeCloseTo(45, 1)
  })

  it('si no queda ni uno de los suyos en la foto siguiente, no se inventa una velocidad', () => {
    const aqui = radioKmFrom(100, [rider('a', 'peloton', 5000), rider('b', 'peloton', 5000)], 2)
    const luego = radioKmFrom(101, [rider('c', 'peloton', 5080)], 3)
    const stored = radioForStorage({ starters: 3, kms: [aqui, luego] }, new Set())
    expect(stored.kms[0]!.groups[0]!.speedKmh).toBeNull()
  })
})

describe('radioForStorage: el que releva nunca sale como que va a rueda', () => {
  it('un relevista que no entra en el corte se queda sin nombrar, pero NO se pinta guarecido', () => {
    // El «símbolo de tirar que no sale en algunos que tiran»: `inPull` se calculaba sobre el corte
    // de doce, así que el relevista trece caía en la lista de los que van a rueda y se pintaba con
    // el icono contrario. Mentir sobre lo que hace es peor que no nombrarlo.
    const veinte = Array.from({ length: 20 }, (_, i) =>
      rider(`r-${i}`, 'peloton', 100, { pulling: true, pullWindow: 20 - i }),
    )
    // Un grupo grande, para que no entre por la regla de «grupo pequeño, se nombran todos».
    const foto = [
      ...veinte,
      ...Array.from({ length: 100 }, (_, i) => rider(`x-${i}`, 'peloton', 100)),
    ]
    const km = radioKmFrom(10, foto, 120)
    const stored = radioForStorage({ starters: 120, kms: [km] }, new Set())
    const g = stored.kms[0]!.groups[0]!
    const nombrados = new Set([...g.pulling, ...g.watching].map((i) => stored.riders[i]))
    const enRueda = new Set(g.watching.map((i) => stored.riders[i]))
    // Ninguno de los veinte que relevan aparece entre los que van a rueda.
    for (const r of veinte) expect(enRueda.has(r.riderId)).toBe(false)
    // Y del corte para abajo, sencillamente no se les nombra.
    expect(nombrados.has('r-19')).toBe(false)
  })

  it('pero al maillot se le guarda aunque el corte lo dejara fuera: si tira, es la noticia', () => {
    const veinte = Array.from({ length: 20 }, (_, i) =>
      rider(`r-${i}`, 'peloton', 100, { pulling: true, pullWindow: 20 - i }),
    )
    const foto = [
      ...veinte,
      ...Array.from({ length: 100 }, (_, i) => rider(`x-${i}`, 'peloton', 100)),
    ]
    const km = radioKmFrom(10, foto, 120)
    const stored = radioForStorage({ starters: 120, kms: [km] }, new Set(['r-19']))
    const g = stored.kms[0]!.groups[0]!
    expect(g.pulling.map((i) => stored.riders[i])).toContain('r-19')
  })
})

describe('radioForStorage: la velocidad se le sigue midiendo al grupo que se funde', () => {
  /** Dos fotos seguidas, a un km de distancia, con los relojes que se le pasen. */
  const dos = (a: SnapshotRider[], b: SnapshotRider[]) =>
    radioForStorage({ starters: 4, kms: [radioKmFrom(10, a, 4), radioKmFrom(11, b, 4)] }, new Set())

  it('un grupo que se FUNDE con otro conserva su velocidad', () => {
    // Se buscaba por id: al fundirse, el grupo desaparecía de la foto siguiente y se quedaba sin
    // velocidad. Pero el dato existe —sus corredores han cubierto el km igual— y basta con seguir a
    // la gente en vez de a la etiqueta.
    const antes = [
      rider('a', 'mov-1', 3600),
      rider('b', 'mov-1', 3600),
      rider('p', 'peloton', 3660),
    ]
    const despues = [
      rider('a', 'peloton', 3700),
      rider('b', 'peloton', 3700),
      rider('p', 'peloton', 3700),
    ]
    const g = dos(antes, despues).kms[0]!.groups.find((x) => x.size === 2)!
    // 1 km en 100 s = 36 km/h. Antes: null.
    expect(g.speedKmh).toBeCloseTo(36, 1)
  })

  it('y uno que se ROMPE se mide por el trozo que se lleva a más gente', () => {
    const antes = [
      rider('a', 'mov-1', 3600),
      rider('b', 'mov-1', 3600),
      rider('c', 'mov-1', 3600),
      rider('p', 'peloton', 3900),
    ]
    // `mov-1` se parte: dos siguen en `mov-9` y uno se descuelga a `shed-1` con otro reloj.
    const despues = [
      rider('a', 'mov-9', 3700),
      rider('b', 'mov-9', 3700),
      rider('c', 'shed-1', 3800),
      rider('p', 'peloton', 3990),
    ]
    const g = dos(antes, despues).kms[0]!.groups.find((x) => x.size === 3)!
    expect(g.speedKmh).toBeCloseTo(36, 1)
  })

  it('sin nadie a quien seguir no se inventa una velocidad', () => {
    const antes = [rider('a', 'mov-1', 3600), rider('p', 'peloton', 3900)]
    const despues = [rider('p', 'peloton', 3990)]
    const g = dos(antes, despues).kms[0]!.groups.find((x) => x.size === 1)!
    expect(g.speedKmh).toBeNull()
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
