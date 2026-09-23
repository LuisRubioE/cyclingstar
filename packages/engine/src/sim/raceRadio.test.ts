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
    pullMotive: null,
    pullFor: null,
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

  /**
   * ————— Y LA ÚLTIMA FOTO SE MIDE HACIA ATRÁS (v85) —————
   *
   * El dueño lo vio en la etapa 20 de producción: un grupo de 21 sin velocidad mientras los de
   * delante y detrás iban marcados. La velocidad se calcula contra el kilómetro SIGUIENTE y en la
   * última foto no hay siguiente, así que el grupo salía en blanco.
   *
   * Medido sobre veinte reinas: **204 de los 229 huecos en blanco de la radio eran exactamente eso**,
   * el 89 %. Y no hacía falta ninguno: en la última foto no hay kilómetro siguiente, pero el
   * kilómetro que se acaba de recorrer existe igual. Con la foto anterior como referencia, los
   * huecos en blanco pasan de **237 a 31** sobre 13.805 fotos de grupo (1,72 % -> 0,22 %).
   *
   * Los 31 que quedan son relojes que saltan en una fusión, que es la radio negándose a enseñar un
   * número imposible y no un defecto. Ver `docs/balance.md` «v85».
   */
  it('la ÚLTIMA foto se mide contra la anterior, porque ese kilómetro sí se ha recorrido', () => {
    const aqui = radioKmFrom(
      10,
      Array.from({ length: 20 }, (_, i) => rider(`r-${i}`, 'peloton', 1000)),
      20,
    )
    const luego = radioKmFrom(
      11,
      Array.from({ length: 20 }, (_, i) => rider(`r-${i}`, 'peloton', 1080)),
      20,
    )
    const stored = radioForStorage({ starters: 20, kms: [aqui, luego] }, new Set())
    // La primera se mide contra la siguiente: un kilómetro en 80 s son 45 km/h.
    expect(stored.kms[0]!.groups[0]!.speedKmh).toBeCloseTo(45, 1)
    // Y la última contra la anterior: el mismo kilómetro y el mismo número, no un hueco en blanco.
    expect(stored.kms[1]!.groups[0]!.speedKmh).toBeCloseTo(45, 1)
  })

  /**
   * ————— Y SI EL KILÓMETRO SIGUIENTE NO SE PUEDE MEDIR, SE MIDE EL QUE ACABA DE RECORRER —————
   *
   * El dueño, con la foto de un grupo de sesenta sin velocidad: «¿por qué no dice la velocidad? eso
   * está mal… calcula la velocidad real a la que iba ese grupo SIN CONTAR EL REGALO por alcanzar a
   * un grupo que va muy estirado, y pon ésa».
   *
   * Medido: no es un fallo de la resta. Cuando un grupo se funde con otro, sus corredores adoptan
   * el reloj del grupo nuevo y el salto se reparte IGUAL entre todos —los 94 del caso peor traen el
   * mismo Δt al décimo—, así que el kilómetro sale a 89 km/h y `radioMaxKmh` lo rechaza entero, con
   * razón. El regalo es del motor (`docs/balance.md`) y la radio no lo puede deshacer: no sabe
   * cuánto hueco quedaba en el instante de la fusión.
   *
   * Lo que sí puede es medir el OTRO kilómetro, el de antes, donde ese grupo iba solo y sus relojes
   * no habían saltado. Sobre veinte reinas (14.658 grupos): **46 blancos, 44 recuperados (95,7 %)**,
   * de 22,7 a 62,5 km/h; los dos que quedan son fusiones en kilómetros seguidos.
   */
  it('un grupo que se funde enseña el kilómetro que acaba de correr, no un hueco en blanco', () => {
    // km 10 → 11: los cinco ruedan solos, 80 s el kilómetro (45 km/h).
    // km 11 → 12: se funden con el pelotón y su reloj salta: 40 s el kilómetro, o sea 90 km/h.
    const foto = (km: number, tPel: number, grupo: string, tShed: number) =>
      radioKmFrom(
        km,
        [
          ...Array.from({ length: 30 }, (_, i) => rider(`pel-${i}`, 'peloton', tPel)),
          ...Array.from({ length: 5 }, (_, i) => rider(`s-${i}`, grupo, tShed)),
        ],
        35,
      )
    const stored = radioForStorage(
      {
        starters: 35,
        kms: [
          foto(10, 1000, 'shed-1', 1120),
          foto(11, 1080, 'shed-1', 1200),
          foto(12, 1160, 'peloton', 1240),
        ],
      },
      new Set(),
    )
    const suyo = stored.kms[1]!.groups.find((g) => g.size === 5)!
    // Con la cuenta de siempre esto era `null`: 90 km/h rechazado y nada que enseñar.
    expect(suyo.speedKmh).toBeCloseTo(45, 1)
  })

  /**
   * ————— Y EL TECHO BAJA A 75, PORQUE RECHAZAR YA NO CUESTA UN HUECO EN BLANCO —————
   *
   * Los 85 de la v58 eran generosos a propósito: entonces un rechazo dejaba al grupo SIN
   * velocidad, así que más valía dejar pasar algún número raro que vaciar la pantalla. Con el
   * kilómetro de antes como recambio ese coste desapareció y el techo puede ponerse donde está la
   * física: medido sobre veinte reinas, un grupo que no se funde con nadie **no pasa de 75,5 km/h
   * en 13.666 kilómetros**, mientras que los que se funden llegan a 84,6.
   *
   * Sobre esas mismas veinte reinas: las velocidades por encima de 75 km/h pasan de 25 a 0 y los
   * huecos en blanco se quedan en 2, los mismos. Ver la nota de `radioMaxKmh`.
   */
  it('un kilómetro a 80 km/h ya no se enseña: se enseña el anterior, que sí se corrió', () => {
    const foto = (km: number, t: number) =>
      radioKmFrom(
        km,
        Array.from({ length: 5 }, (_, i) => rider(`r-${i}`, 'mov-1', t)),
        5,
      )
    // km 10 -> 11: 80 s el kilómetro, 45 km/h. km 11 -> 12: 45 s, o sea 80 km/h.
    const stored = radioForStorage(
      { starters: 5, kms: [foto(10, 1000), foto(11, 1080), foto(12, 1125)] },
      new Set(),
    )
    // Con el techo en 85 esto enseñaba 80 km/h. Con 75 se rechaza y cae en el kilómetro de antes.
    expect(stored.kms[1]!.groups[0]!.speedKmh).toBeCloseTo(45, 1)
  })

  /*
    LA CUENTA NO SE CORTA AUNQUE LA LISTA SÍ. El dueño: «si en 1 km solo pasa 1 al relevo, no tiene
    sentido que en el pelotón pongamos que pasan 15, porque no es real». Medido sobre ocho reinas,
    lo enseñado contra los que de verdad están en el turno: en un grupo de 31-100 se relevan 27 y
    salían 12, porque la lista se corta. Los dos números decían la verdad y aun así comparar uno con
    otro engañaba: uno es una cuenta y el otro un tope.
  */
  it('cuando la lista se corta, la CUENTA de los que se relevan sigue entera', () => {
    const foto = (km: number, t: number) =>
      radioKmFrom(
        km,
        Array.from({ length: 30 }, (_, i) => rider(`r-${i}`, 'peloton', t, { pulling: i < 20 })),
        30,
      )
    const stored = radioForStorage(
      { starters: 30, kms: [foto(10, 1000), foto(11, 1080)] },
      new Set(),
    )
    const g = stored.kms[0]!.groups[0]!
    // Se nombran doce…
    expect(g.pulling).toHaveLength(12)
    // …pero los que se están relevando son veinte, y eso no se pierde.
    expect(g.pullingTotal).toBe(20)
  })

  it('y cuando no se corta, la cuenta y la lista dicen lo mismo', () => {
    const foto = (km: number, t: number) =>
      radioKmFrom(
        km,
        Array.from({ length: 5 }, (_, i) => rider(`r-${i}`, 'mov-1', t, { pulling: i < 3 })),
        5,
      )
    const stored = radioForStorage(
      { starters: 5, kms: [foto(10, 1000), foto(11, 1080)] },
      new Set(),
    )
    const g = stored.kms[0]!.groups[0]!
    expect(g.pulling).toHaveLength(3)
    expect(g.pullingTotal).toBe(3)
  })

  it('…y NO pisa la velocidad del kilómetro siguiente cuando esa sí se puede medir', () => {
    // El pelotón frena: 80 s el km anterior (45 km/h) y 120 el siguiente (30). Manda el siguiente.
    const foto = (km: number, t: number) =>
      radioKmFrom(
        km,
        Array.from({ length: 20 }, (_, i) => rider(`r-${i}`, 'peloton', t)),
        20,
      )
    const stored = radioForStorage(
      { starters: 20, kms: [foto(10, 1000), foto(11, 1080), foto(12, 1200)] },
      new Set(),
    )
    expect(stored.kms[1]!.groups[0]!.speedKmh).toBeCloseTo(30, 1)
  })

  it('y si tampoco el kilómetro de antes está limpio, sigue sin haber velocidad que enseñar', () => {
    // Dos saltos seguidos: 40 s hacia delante y 40 hacia atrás. No se inventa nada.
    const foto = (km: number, t: number) =>
      radioKmFrom(
        km,
        Array.from({ length: 20 }, (_, i) => rider(`r-${i}`, 'peloton', t)),
        20,
      )
    const stored = radioForStorage(
      { starters: 20, kms: [foto(10, 1000), foto(11, 1040), foto(12, 1080)] },
      new Set(),
    )
    expect(stored.kms[1]!.groups[0]!.speedKmh).toBeNull()
  })

  it('si no queda ni uno de los suyos en la foto siguiente, no se inventa una velocidad', () => {
    const aqui = radioKmFrom(100, [rider('a', 'peloton', 5000), rider('b', 'peloton', 5000)], 2)
    const luego = radioKmFrom(101, [rider('c', 'peloton', 5080)], 3)
    const stored = radioForStorage({ starters: 3, kms: [aqui, luego] }, new Set())
    expect(stored.kms[0]!.groups[0]!.speedKmh).toBeNull()
  })
})

describe('radioForStorage: un hombre PARADO no es una velocidad', () => {
  /**
   * EL DEFECTO, VISTO EN PRODUCCIÓN (v70.1). El dueño, en el campeonato de Marruecos en carretera:
   * el líder EN SOLITARIO marcado a **16,1 km/h** mientras el grupo de caza iba a 42,1 y el pelotón
   * a 41,2. Y 16,1 km/h ahí es imposible por la LEY: en llano al 1,3 % el suelo de `targetSpeed`
   * para un hombre solo, con el peor perfil del campo y compromiso cero, son **29,9 km/h**.
   *
   * No iba lento: estaba **de pie**, cambiando una rueda. Y a un hombre solo en cabeza el coche le
   * cuesta el TRIPLE (`carNoAccessGain`) porque no lleva caravana detrás, o sea dos minutos largos.
   * La radio dividía el kilómetro entre el tiempo que estuvo parado y llamaba a eso velocidad.
   *
   * Es el defecto SIMÉTRICO del de la v58 —«¿qué me dices de este tercer grupo que va a 94 km/h?»—:
   * entonces se puso TECHO (`radioMaxKmh`) y no se puso suelo. En un pelotón la mediana ya se tragaba
   * al que pinchaba; en un grupo de UNO no hay mediana que lo tape, y por eso salía a la pantalla.
   */
  const pinchazo = (riderId: string, lostS: number) =>
    new Map([[riderId, { tipo: 'pinchazo' as const, lostS }]])

  it('al que pincha yendo solo no se le inventa una velocidad: se dice el percance', () => {
    // Un hombre solo en cabeza. Su kilómetro le cuesta 224 s (88 de rodar + 136 parado).
    const aqui = radioKmFrom(
      139,
      [rider('lider', 'mov-1', 9000, { pulling: true })],
      1,
      undefined,
      null,
      undefined,
      pinchazo('lider', 136),
    )
    const luego = radioKmFrom(140, [rider('lider', 'mov-1', 9224)], 1)
    const stored = radioForStorage({ starters: 1, kms: [aqui, luego] }, new Set())
    const g = stored.kms[0]!.groups[0]!
    // Con la cuenta vieja: 3600/224 = 16,1 km/h, que es el número de la foto del dueño.
    expect(g.speedKmh).toBeNull()
    expect(g.mishap).toEqual({ tipo: 'pinchazo', lostS: 136 })
  })

  it('en un grupo grande el que pincha no arrastra la velocidad de los demás', () => {
    // Veinte a 80 s el kilómetro (45 km/h) y uno que se para dos minutos.
    const aqui = radioKmFrom(
      50,
      Array.from({ length: 21 }, (_, i) => rider(`r-${i}`, 'peloton', 3000)),
      21,
      undefined,
      null,
      undefined,
      pinchazo('r-20', 120),
    )
    const luego = radioKmFrom(
      51,
      Array.from({ length: 21 }, (_, i) => rider(`r-${i}`, 'peloton', i < 20 ? 3080 : 3200)),
      21,
    )
    const stored = radioForStorage({ starters: 21, kms: [aqui, luego] }, new Set())
    const g = stored.kms[0]!.groups[0]!
    expect(g.speedKmh).toBeCloseTo(45, 1)
    // …y el percance se cuenta igual, que es la noticia aunque el grupo siga rodando a 45.
    expect(g.mishap).toEqual({ tipo: 'pinchazo', lostS: 120 })
  })

  it('sin percances la radio se comporta exactamente como antes', () => {
    const aqui = radioKmFrom(10, [rider('a', 'peloton', 1000)], 1)
    const luego = radioKmFrom(11, [rider('a', 'peloton', 1080)], 1)
    const stored = radioForStorage({ starters: 1, kms: [aqui, luego] }, new Set())
    expect(stored.kms[0]!.groups[0]!.speedKmh).toBeCloseTo(45, 1)
    expect(stored.kms[0]!.groups[0]!.mishap).toBeNull()
  })
})

describe('radioForStorage: el que está en el TURNO no va a rueda', () => {
  /**
   * EL DEFECTO, VISTO EN PRODUCCIÓN. El dueño: «hay 3 escapados… todos parece que colaboran, pero
   * en vez de salir que tiran todos, sale cada km que tira uno diferente».
   *
   * Y con su etapa delante (`race-ain` s3, km 10 a 25) la radio nombraba a UNO por kilómetro y
   * pintaba a los otros dos con el icono de ir guarecido. El motor no se equivoca —en una fuga de
   * tres al frente va uno y los otros dos van a su rueda—; lo que estaba mal era la foto, porque
   * `pulling` se llenaba con quien daba la cara EN ESE INSTANTE y su contrato dice desde la v34
   * «está en la ROTACIÓN que se reparte el viento». Una rotación no cabe en un instante.
   */
  const tres = (km: number, alFrente: string) =>
    radioKmFrom(
      km,
      ['a', 'b', 'c'].map((id) =>
        rider(id, 'mov-1', 1000 + 80 * (km - 10), { pulling: id === alFrente, pullWindow: 1 }),
      ),
      3,
    )

  it('los tres de una fuga que se relevan salen los tres, no uno por kilómetro', () => {
    const stored = radioForStorage(
      { starters: 3, kms: [tres(10, 'a'), tres(11, 'b'), tres(12, 'c')] },
      new Set(),
    )
    const g = stored.kms[2]!.groups[0]!
    expect(g.pulling.map((i) => stored.riders[i]).sort()).toEqual(['a', 'b', 'c'])
    // Y el que da la cara AHORA sigue yendo el primero de la lista: el orden es el del viento.
    expect(stored.riders[g.pulling[0]!]).toBe('c')
    expect(g.watching).toEqual([])
  })

  /* Al que va a rueda de verdad no se le asciende: el turno es haber dado la cara, no estar ahí. */
  it('el que no ha dado la cara nunca sigue saliendo a rueda', () => {
    const conGorron = (km: number, alFrente: string) =>
      radioKmFrom(
        km,
        ['a', 'b', 'gorron'].map((id) =>
          rider(id, 'mov-1', 1000 + 80 * (km - 10), {
            pulling: id === alFrente,
            pullWindow: id === 'gorron' ? 0 : 1,
          }),
        ),
        3,
      )
    const stored = radioForStorage(
      { starters: 3, kms: [conGorron(10, 'a'), conGorron(11, 'b'), conGorron(12, 'a')] },
      new Set(),
    )
    const g = stored.kms[2]!.groups[0]!
    expect(g.pulling.map((i) => stored.riders[i]).sort()).toEqual(['a', 'b'])
    expect(g.watching.map((i) => stored.riders[i])).toEqual(['gorron'])
  })

  /*
    El turno caduca: si dejó de relevar hace más de tres kilómetros, ya no está en la rotación.
    Sin esto, «el que tira» acabaría siendo «el que tiró alguna vez», que no es un parte de radio.
  */
  it('el turno caduca a los tres kilómetros', () => {
    const kms = [tres(10, 'a')]
    for (let km = 11; km <= 15; km++) kms.push(tres(km, 'b'))
    const stored = radioForStorage({ starters: 3, kms }, new Set())
    // km 13: `a` dio la cara en el 10, hace tres → sigue contando.
    expect(stored.kms[3]!.groups[0]!.pulling.map((i) => stored.riders[i]).sort()).toEqual([
      'a',
      'b',
    ])
    // km 15: hace cinco → ya no.
    expect(stored.kms[5]!.groups[0]!.pulling.map((i) => stored.riders[i])).toEqual(['b'])
  })

  /*
    Y se pide el MISMO grupo, no solo el mismo hombre: el que venía relevando en el pelotón y acaba
    de caerse a un grupeto no está relevando en el grupeto — está descolgado.
  */
  it('el que relevaba en el pelotón y se cae a un grupeto no sale relevando allí', () => {
    const antes = radioKmFrom(
      10,
      [
        ...Array.from({ length: 10 }, (_, i) => rider(`p-${i}`, 'peloton', 1000)),
        rider('caido', 'peloton', 1000, { pulling: true, pullWindow: 1 }),
      ],
      11,
    )
    const ahora = radioKmFrom(
      11,
      [
        ...Array.from({ length: 10 }, (_, i) => rider(`p-${i}`, 'peloton', 1080)),
        rider('caido', 'shed-1', 1200),
      ],
      11,
    )
    const stored = radioForStorage({ starters: 11, kms: [antes, ahora] }, new Set())
    const grupeto = stored.kms[1]!.groups.find((g) => g.size === 1)!
    expect(grupeto.pulling).toEqual([])
    expect(grupeto.watching.map((i) => stored.riders[i])).toEqual(['caido'])
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
