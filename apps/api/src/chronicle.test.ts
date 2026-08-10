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
