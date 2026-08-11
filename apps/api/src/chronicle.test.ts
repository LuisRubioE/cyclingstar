import { describe, expect, it } from 'vitest'
import {
  type ChronicleEvent,
  buildChronicle,
  chronicleNames,
  type ChronicleRiderSource,
} from './chronicle.js'

/**
 * La CRÓNICA es la frontera entre telemetría y narrativa (docs/motor.md §16). Aquí se sella lo que
 * decide esa frontera, y muy en particular lo que solo puede arreglarse AQUÍ: los eventos de las
 * etapas ya corridas están congelados en `stage_runs.events` y se renderizan al vuelo, así que un
 * defecto que el motor ya no comete sigue vivo en las crónicas guardadas hasta que la construcción
 * lo corrige.
 */

const ev = (partial: Partial<ChronicleEvent> & { plantilla: string }): ChronicleEvent => ({
  km: 100,
  tS: 10000,
  tipo: '',
  protagonistas: [],
  ...partial,
})

const source = (
  riderId: string,
  over: Partial<ChronicleRiderSource> = {},
): ChronicleRiderSource => ({ riderId, name: riderId, ...over })

describe('identidad de los protagonistas', () => {
  it('funde el roster y los resultados quedándose con el primer dato no nulo', () => {
    const names = chronicleNames([
      source('r1', { name: 'Andrej Pucnik', bib: 42, teamName: null, country: 'SI' }),
      source('r1', { name: 'Andrej Pucnik', teamName: 'Al Assad Cycling', country: 'SI' }),
    ])
    expect(names.riderOf.get('r1')).toEqual({
      name: 'Andrej Pucnik',
      bib: 42,
      team: 'Al Assad Cycling',
      country: 'SI',
    })
  })

  it('un corredor que ya no se puede resolver no rompe nada: sale sin dorsal ni bandera', () => {
    const [entry] = buildChronicle(
      [ev({ plantilla: 'stage_win', protagonistas: ['fantasma'] })],
      chronicleNames([]),
    )
    expect(entry?.protagonists).toEqual([
      { name: 'fantasma', bib: null, team: null, country: null },
    ])
  })

  it('un roster sin dorsales deja el dorsal a null, no a 0', () => {
    const names = chronicleNames([source('r1', { name: 'Ana', teamName: 'Team Sol' })])
    expect(names.riderOf.get('r1')?.bib).toBeNull()
    expect(names.riderOf.get('r1')?.country).toBeNull()
  })

  it('los corredores citados por `datos` (`forId`) también se resuelven', () => {
    const names = chronicleNames([
      source('greg', { name: 'Tom Becker', bib: 12 }),
      source('jefe', { name: 'Iker Zabala', bib: 11, teamName: 'Summit Squad' }),
    ])
    const [entry] = buildChronicle(
      [
        ev({
          plantilla: 'peloton_pull',
          protagonistas: ['greg'],
          datos: { forKind: 'gregarios', forId: 'jefe' },
        }),
      ],
      names,
    )
    expect(entry?.mentions?.forId?.name).toBe('Iker Zabala')
  })

  it('un `forId` que no se resuelve simplemente no viaja', () => {
    const [entry] = buildChronicle(
      [ev({ plantilla: 'peloton_pull', protagonistas: [], datos: { forId: 'nadie' } })],
      chronicleNames([]),
    )
    expect(entry?.mentions).toBeUndefined()
  })
})

describe('A3 · los descuelgues se agrupan', () => {
  const sitUp = (km: number, who: string, toGo: number): ChronicleEvent =>
    ev({ km, tS: km * 100, plantilla: 'rider_sits_up', protagonistas: [who], datos: { toGo } })

  it('tres o más en cinco km se cuentan en una sola frase con el número', () => {
    const out = buildChronicle(
      [sitUp(196, 'a', 14), sitUp(197, 'b', 13), sitUp(199, 'c', 11)],
      chronicleNames([source('a'), source('b'), source('c')]),
    )
    expect(out).toHaveLength(1)
    expect(out[0]?.plantilla).toBe('riders_sit_up')
    expect(out[0]?.datos?.count).toBe(3)
    // La frase se sitúa donde acaba la sangría, con los km que le quedaban al último.
    expect(out[0]?.km).toBe(199)
    expect(out[0]?.datos?.toGo).toBe(11)
    expect(out[0]?.protagonists).toHaveLength(3)
  })

  it('uno o dos sueltos conservan su mención individual', () => {
    const out = buildChronicle(
      [sitUp(150, 'a', 60), sitUp(196, 'b', 14), sitUp(197, 'c', 13)],
      chronicleNames([source('a'), source('b'), source('c')]),
    )
    expect(out.map((e) => e.plantilla)).toEqual(['rider_sits_up', 'rider_sits_up', 'rider_sits_up'])
  })

  it('lo que pasa entre medias no se traga ni cambia de sitio', () => {
    const out = buildChronicle(
      [
        sitUp(196, 'a', 14),
        ev({ km: 197, tS: 19700, plantilla: 'front_group', datos: { size: 5, toGo: 13 } }),
        sitUp(198, 'b', 12),
        sitUp(199, 'c', 11),
      ],
      chronicleNames([source('a'), source('b'), source('c')]),
    )
    expect(out.map((e) => e.plantilla)).toEqual(['front_group', 'riders_sit_up'])
  })

  // Race Muscat, producción: Alex Taylor se descuelga en el km 196, en el 204 y en el 209. El
  // motor ya no lo repite (v13), pero esa crónica está congelada y se sigue leyendo.
  it('un corredor que ya se descolgó no vuelve a descolgarse', () => {
    const out = buildChronicle(
      [sitUp(196, 'taylor', 14), sitUp(204, 'taylor', 6), sitUp(209, 'taylor', 1)],
      chronicleNames([source('taylor', { name: 'Alex Taylor' })]),
    )
    expect(out).toHaveLength(1)
    expect(out[0]?.km).toBe(196)
  })

  // v14: la pájara y el abandono llegan igual —en tandas, en el mismo tramo— y se agrupan con el
  // MISMO mecanismo, no con una copia de él (docs/motor.md §VI.3).
  const runOf = (plantilla: string, kms: number[]): ChronicleEvent[] =>
    kms.map((km, i) =>
      ev({ km, tS: km * 100, plantilla, protagonistas: [`r${i}`], datos: { toGo: 220 - km } }),
    )

  it('las pájaras cercanas también se agrupan', () => {
    const out = buildChronicle(
      runOf('rider_bonks', [140, 142, 144]),
      chronicleNames([source('r0'), source('r1'), source('r2')]),
    )
    expect(out).toHaveLength(1)
    expect(out[0]?.plantilla).toBe('riders_bonk')
    expect(out[0]?.datos?.count).toBe(3)
  })

  it('y los abandonos', () => {
    const out = buildChronicle(
      runOf('rider_abandons', [90, 91, 93, 94]),
      chronicleNames([source('r0'), source('r1'), source('r2'), source('r3')]),
    )
    expect(out).toHaveLength(1)
    expect(out[0]?.plantilla).toBe('riders_abandon')
    expect(out[0]?.datos?.count).toBe(4)
  })

  it('un abandono suelto conserva su frase propia', () => {
    const out = buildChronicle(runOf('rider_abandons', [90]), chronicleNames([source('r0')]))
    expect(out.map((e) => e.plantilla)).toEqual(['rider_abandons'])
  })

  it('la pájara se cuenta ANTES del descuelgue que provoca, y el abandono después', () => {
    const out = buildChronicle(
      [
        ev({ km: 120, tS: 12000, plantilla: 'rider_abandons', protagonistas: ['a'] }),
        ev({ km: 120, tS: 12000, plantilla: 'rider_sits_up', protagonistas: ['b'] }),
        ev({ km: 120, tS: 12000, plantilla: 'rider_bonks', protagonistas: ['c'] }),
      ],
      chronicleNames([source('a'), source('b'), source('c')]),
    )
    expect(out.map((e) => e.plantilla)).toEqual(['rider_bonks', 'rider_sits_up', 'rider_abandons'])
  })
})

describe('B1/B2 · la cadena de cortes de las crónicas viejas', () => {
  const split = (km: number, datos: Record<string, number | string>): ChronicleEvent =>
    ev({ km, tS: km * 100, plantilla: 'peloton_split', protagonistas: ['drv'], datos })
  const names = chronicleNames([source('drv', { name: 'Jean Thomas', teamName: 'Éclair Équipe' })])

  it('un aviso en el que no se descolgó nadie no es un aviso', () => {
    const out = buildChronicle(
      [
        split(180, { dropped: 31, remaining: 116, before: 147 }),
        split(183, { dropped: 937, remaining: 116, before: 116 }),
        split(186, { dropped: 1315, remaining: 89, before: 116 }),
      ],
      names,
    )
    expect(out.map((e) => e.km)).toEqual([180, 186])
  })

  // Antes de la v6 el evento solo traía `dropped` y `remaining`: sin `before` la frase no podía
  // decir de cuántos a cuántos, y diez avisos seguidos se leían idénticos.
  it('reconstruye `before` de la cadena y tira los que no aportan', () => {
    const out = buildChronicle(
      [
        split(136, { dropped: 2, remaining: 130 }),
        split(139, { dropped: 4, remaining: 128 }),
        split(142, { dropped: 4, remaining: 128 }),
        split(145, { dropped: 4, remaining: 128 }),
        split(157, { dropped: 5, remaining: 127 }),
      ],
      names,
    )
    expect(out.map((e) => e.km)).toEqual([136, 139, 157])
    expect(out[1]?.datos?.before).toBe(130)
    expect(out[2]?.datos?.before).toBe(128)
  })

  it('la `phase` reconstruida hace que solo el primer aviso presente a quien aprieta', () => {
    const out = buildChronicle(
      [
        split(180, { dropped: 31, remaining: 116, before: 147 }),
        split(186, { dropped: 26, remaining: 89, before: 116 }),
      ],
      names,
    )
    expect(out[0]?.datos?.phase).toBe(0)
    expect(out[1]?.datos?.phase).toBe(1)
  })

  it('lo que el motor ya manda no se toca', () => {
    const out = buildChronicle([split(186, { remaining: 89, before: 116, phase: 4 })], names)
    expect(out[0]?.datos?.phase).toBe(4)
  })

  it('tras un reagrupamiento la siguiente criba vuelve a empezar', () => {
    const out = buildChronicle(
      [
        split(180, { dropped: 31, remaining: 116, before: 147 }),
        ev({
          km: 182,
          tS: 18200,
          plantilla: 'peloton_regroup',
          datos: { joined: 20, remaining: 136, before: 116 },
        }),
        split(186, { dropped: 26, remaining: 110, before: 136 }),
      ],
      names,
    )
    expect(out[2]?.datos?.phase).toBe(0)
  })
})

describe('B4 · la concesión que luego se desmiente', () => {
  it('se marca `cazada` si la fuga acaba cogida', () => {
    const out = buildChronicle(
      [
        ev({ km: 10, tS: 1000, plantilla: 'peloton_concedes' }),
        ev({ km: 126, tS: 12600, plantilla: 'breakaway_caught' }),
      ],
      chronicleNames([]),
    )
    expect(out[0]?.datos?.cazada).toBe(1)
  })

  it('si la fuga llega a meta, la concesión se queda como estaba', () => {
    const out = buildChronicle([ev({ km: 60, plantilla: 'peloton_concedes' })], chronicleNames([]))
    expect(out[0]?.datos?.cazada).toBeUndefined()
  })
})

describe('lo que ya hacía la crónica sigue haciéndolo', () => {
  it('los intentos que el motor marca como no narrables no llegan', () => {
    const out = buildChronicle(
      [ev({ plantilla: 'attack_go', datos: { narra: 0 } }), ev({ plantilla: 'stage_win' })],
      chronicleNames([]),
    )
    expect(out.map((e) => e.plantilla)).toEqual(['stage_win'])
  })

  it('ordena por km y, dentro del km, por orden narrativo', () => {
    const out = buildChronicle(
      [
        ev({ km: 10, plantilla: 'stage_win' }),
        ev({ km: 10, plantilla: 'breakaway_formed' }),
        ev({ km: 5, plantilla: 'time_gap' }),
      ],
      chronicleNames([]),
    )
    expect(out.map((e) => e.plantilla)).toEqual(['time_gap', 'breakaway_formed', 'stage_win'])
  })
})

describe('B5 · el liderato de la montaña de las crónicas viejas', () => {
  const kom = (km: number, who: string): ChronicleEvent =>
    ev({
      km,
      tS: km * 100,
      plantilla: 'climb_kom',
      protagonistas: [who],
      // `leads: 1` es lo que emitía el motor viejo con la comparación no estricta: con un punto
      // cada uno, los tres se proclamaban líderes (Race Great Ocean, producción).
      datos: { category: 'cat3', points: 1, leads: 1 },
    })

  it('con un punto cada uno, solo lidera el primero', () => {
    const out = buildChronicle(
      [kom(60, 'a'), kom(111, 'b'), kom(161, 'c')],
      chronicleNames([source('a'), source('b'), source('c')]),
    )
    expect(out.map((e) => e.datos?.leads)).toEqual([1, 0, 0])
  })

  it('el que suma de verdad sí lidera', () => {
    const out = buildChronicle(
      [kom(60, 'a'), kom(111, 'b'), kom(161, 'a')],
      chronicleNames([source('a'), source('b')]),
    )
    expect(out.map((e) => e.datos?.leads)).toEqual([1, 0, 1])
  })
})

/**
 * EL MAILLOT ENTRA EN LA IDENTIDAD, no en el evento.
 *
 * Esa es toda la decisión de diseño: el maillot llega pegado al corredor —como el dorsal, el equipo
 * y la bandera— y por eso sale en todas sus menciones sin tocar ni una de las plantillas del
 * journal. Y el que llega es el de la CARRETERA de ese día, que lo elige la ruta.
 */
describe('el maillot en la identidad', () => {
  const leaders = { gc: 'r1', points: 'r2', kom: 'r3', team: 'equipo-1' }

  it('cada líder llega con el suyo y el resto sin ninguno', () => {
    const names = chronicleNames([source('r1'), source('r2'), source('r3'), source('r4')], leaders)
    expect(names.riderOf.get('r1')?.jersey).toBe('gc')
    expect(names.riderOf.get('r2')?.jersey).toBe('points')
    expect(names.riderOf.get('r3')?.jersey).toBe('kom')
    expect(names.riderOf.get('r4')?.jersey).toBeUndefined()
  })

  it('sin líderes —etapa 1, carrera de un día, vuelta de prueba— nadie lleva maillot', () => {
    const names = chronicleNames([source('r1')])
    expect(names.riderOf.get('r1')?.jersey).toBeUndefined()
  })

  it('el equipo líder NO se pega al corredor: no es un maillot y no viaja en la crónica', () => {
    // Medido sobre Race Colombia: marcarlo aquí saldría de 4 a 13 veces por etapa (los corredores
    // del equipo líder), tanto como los tres maillots juntos y diciendo mucho menos. Va en las
    // tablas de la clasificación por equipos, que es donde se consulta.
    const names = chronicleNames([source('r9', { teamName: 'Equipo Uno' })], leaders)
    expect(names.riderOf.get('r9')).toEqual({
      name: 'r9',
      bib: null,
      team: 'Equipo Uno',
      country: null,
    })
  })

  it('el maillot viaja también a las menciones de `datos` (el jefe de filas de quien tira)', () => {
    const [entry] = buildChronicle(
      [ev({ plantilla: 'peloton_pull', protagonistas: ['r5'], datos: { forId: 'r1', size: 80 } })],
      chronicleNames([source('r1'), source('r5')], leaders),
    )
    expect(entry?.mentions?.forId?.jersey).toBe('gc')
  })
})

/**
 * LA CRONO SE LEE POR EL RELOJ (v18). En una etapa en línea avanzar en el km es avanzar en el
 * tiempo y por eso la crónica se ordena por km. En una contrarreloj no: el primero en salir cruza
 * la meta mientras el último todavía espera en la rampa, así que ordenar por km mezclaría dos horas
 * distintas de la tarde en la misma frase.
 */
describe('la crónica de una contrarreloj se ordena por el reloj de carrera', () => {
  const carrera: ChronicleEvent[] = [
    ev({ plantilla: 'tt_start_order', km: 0, tS: 0, protagonistas: ['r1'] }),
    ev({ plantilla: 'tt_first_time', km: 33, tS: 3200, protagonistas: ['r1'] }),
    ev({ plantilla: 'tt_split', km: 11, tS: 4100, protagonistas: ['r2'] }),
    ev({ plantilla: 'tt_last_off', km: 0, tS: 7800, protagonistas: ['r3'] }),
    ev({ plantilla: 'stage_win_itt', km: 33, tS: 10400, protagonistas: ['r3'] }),
  ]
  const names = chronicleNames([source('r1'), source('r2'), source('r3')])

  it('con `byClock` la historia va en el orden en que ocurrió', () => {
    expect(buildChronicle(carrera, names, { byClock: true }).map((e) => e.plantilla)).toEqual([
      'tt_start_order',
      'tt_first_time',
      'tt_split',
      'tt_last_off',
      'stage_win_itt',
    ])
  })

  it('sin `byClock` mandaría el kilómetro, que en una crono no es el hilo de la historia', () => {
    expect(buildChronicle(carrera, names).map((e) => e.plantilla)).toEqual([
      'tt_start_order',
      'tt_last_off',
      'tt_split',
      'tt_first_time',
      'stage_win_itt',
    ])
  })

  it('una etapa en línea no cambia: sin la opción se ordena por km, como siempre', () => {
    const linea = [
      ev({ plantilla: 'stage_win', km: 180, tS: 14000 }),
      ev({ plantilla: 'breakaway_formed', km: 12, tS: 1200 }),
    ]
    expect(buildChronicle(linea, chronicleNames([])).map((e) => e.km)).toEqual([12, 180])
  })
})

/**
 * LA CRIBA QUE SE DESHACE (v21). El motor emite la selección lejana con la magnitud que ve en
 * carretera; esta capa es la única que sabe si la carrera siguió rota. Es el mismo reparto de
 * papeles que la v13 hizo con la concesión que luego se desmiente.
 */
describe('v21 · la criba lejos de meta que la carrera deshace', () => {
  const criba = (km: number, before: number, remaining: number): ChronicleEvent =>
    ev({
      km,
      tS: km * 100,
      plantilla: 'peloton_selection',
      protagonistas: ['drv'],
      datos: { before, remaining, dropped: before - remaining, toGo: 210 - km, fromKm: km - 6 },
    })
  const names = chronicleNames([source('drv', { name: 'Jean Thomas', teamName: 'Éclair Équipe' })])
  const pull = (km: number, size: number): ChronicleEvent =>
    ev({ km, tS: km * 100, plantilla: 'peloton_pull', protagonistas: ['drv'], datos: { size } })

  it('la criba que aguanta hasta meta se cuenta', () => {
    const out = buildChronicle(
      [
        criba(160, 116, 80),
        pull(180, 78),
        ev({ km: 209, tS: 20900, plantilla: 'bunch_sprint', datos: { field: 74 } }),
      ],
      names,
    )
    expect(out.map((e) => e.plantilla)).toContain('peloton_selection')
  })

  it('la criba que se recompone después NO se cuenta: no decidió nada', () => {
    const out = buildChronicle([criba(160, 116, 80), pull(185, 112)], names)
    expect(out.map((e) => e.plantilla)).not.toContain('peloton_selection')
  })

  it('recuperar menos de la mitad de lo perdido sigue siendo una criba', () => {
    // Perdió 36 y vuelven 12: la carrera sigue rota.
    const out = buildChronicle([criba(160, 116, 80), pull(185, 92)], names)
    expect(out.map((e) => e.plantilla)).toContain('peloton_selection')
  })

  it('un corte del desenlace que devuelve el grupo también la desmiente', () => {
    const out = buildChronicle(
      [
        criba(160, 116, 80),
        ev({
          km: 190,
          tS: 19000,
          plantilla: 'peloton_regroup',
          datos: { joined: 30, remaining: 110, before: 80 },
        }),
      ],
      names,
    )
    expect(out.map((e) => e.plantilla)).not.toContain('peloton_selection')
  })
})

/**
 * LA FUGA QUE SE HUNDE, EN DOS LÍNEAS Y NO EN NUEVE (v21, deuda de la v13 y de la v16). El ruido es
 * el mismo que el de los descuelgues uno a uno, pero aquí no se agrupa por número: se agrupa por
 * NARRATIVA. Se cuenta el arranque y el desenlace, y en medio solo lo que cambia la historia.
 */
describe('v21 · la racha de partes de boquete', () => {
  const gap = (km: number, gapS: number, trend: number, leadSize = 1): ChronicleEvent =>
    ev({ km, tS: km * 100, plantilla: 'time_gap', datos: { gapS, trend, leadSize, chaseSize: 60 } })
  const names = chronicleNames([])

  it('nueve partes de una fuga que se hunde son dos líneas', () => {
    const out = buildChronicle(
      [216, 179, 149, 119, 95, 76, 60, 48, 38].map((g, i) => gap(150 + 4 * i, g, -1)),
      names,
    )
    expect(out.map((e) => e.plantilla)).toEqual(['time_gap', 'time_gap_run'])
    // El arranque conserva su cifra y el resumen trae de dónde a dónde fue la ventaja.
    expect(out[0]?.datos?.gapS).toBe(216)
    expect(out[1]?.datos?.fromGapS).toBe(216)
    expect(out[1]?.datos?.gapS).toBe(38)
    expect(out[1]?.datos?.count).toBe(8)
  })

  it('dos partes seguidos no son una racha: no hay nada que resumir', () => {
    const out = buildChronicle([gap(150, 216, -1), gap(154, 179, -1)], names)
    expect(out.map((e) => e.plantilla)).toEqual(['time_gap', 'time_gap'])
  })

  it('que la ventaja vuelva a crecer ROMPE la racha: es otra noticia', () => {
    const out = buildChronicle(
      [gap(150, 216, -1), gap(154, 179, -1), gap(158, 149, -1), gap(162, 190, 1), gap(166, 220, 1)],
      names,
    )
    expect(out.map((e) => e.plantilla)).toEqual([
      'time_gap',
      'time_gap_run',
      'time_gap',
      'time_gap',
    ])
  })

  it('que cambie el grupo de cabeza también la rompe: no se habla de lo mismo', () => {
    const out = buildChronicle(
      [gap(150, 216, -1, 4), gap(154, 179, -1, 4), gap(158, 149, -1, 1), gap(162, 119, -1, 1)],
      names,
    )
    expect(out.map((e) => e.plantilla)).toEqual(['time_gap', 'time_gap', 'time_gap', 'time_gap'])
  })

  it('sin `trend` (crónicas anteriores a la v6) la dirección sale de los dos números', () => {
    const viejo = (km: number, gapS: number): ChronicleEvent =>
      ev({ km, tS: km * 100, plantilla: 'time_gap', datos: { gapS } })
    const out = buildChronicle(
      [viejo(150, 216), viejo(154, 179), viejo(158, 149), viejo(162, 119)],
      names,
    )
    expect(out.map((e) => e.plantilla)).toEqual(['time_gap', 'time_gap_run'])
  })

  it('las frases de en medio se van, pero lo que NO es un parte de boquete se queda donde estaba', () => {
    const out = buildChronicle(
      [
        gap(150, 216, -1),
        gap(154, 179, -1),
        ev({ km: 156, tS: 15600, plantilla: 'climb_kom', protagonistas: [] }),
        gap(158, 149, -1),
        gap(162, 119, -1),
      ],
      names,
    )
    expect(out.map((e) => e.plantilla)).toEqual(['time_gap', 'climb_kom', 'time_gap_run'])
  })
})
