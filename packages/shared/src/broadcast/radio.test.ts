import { describe, expect, it } from 'vitest'
import type { ChronicleRider, RaceRadio, RadioGroup } from '../contracts.js'
import { type SynthPhoto, synthLine, toyStage } from './__fixtures__/syntheticLine.js'
import { BROADCAST } from './constants.js'
import { cutTimeline, visibilityOf } from './cut.js'
import { photoBlocksOf } from './instant.js'
import { photoAt } from './reduce.js'
import { type RadioNames, radioFromTimeline, radioKmOfBlock, radioNameableAt } from './radio.js'
import type { Block, GroupDetail, RiderIx, TimelineCore, TimelineEvent } from './timeline.js'
import { fromDs } from './timeline.js'

/**
 * LA RADIO DESDE LA LÍNEA (E2, docs/retransmision.md §12.10, §11.16 y §4.13; D-16, 12-o, 11-i; paso
 * 11a), sobre líneas sintéticas: la de juguete de `__fixtures__/syntheticLine.ts` (ocho corredores, todos
 * los grupos de doce o menos) y una de cuarenta con un pelotón grande, donde se ve a quién nombra. Lo que
 * la radio de la línea es frente a la guardada de hoy lo mide B16 sobre las congeladas y las 22 del banco
 * (`apps/api/src/broadcastFixtures.test.ts`), que también ata la copia de `kindOf` a la del motor.
 */

const OPTS = { photoEvery: 10, keyEvery: 20, lastBlocks: 10 } as const

/** La cara de cada id: `Rider <n>` con su dorsal; `jerseys` les pone el maillot de líder. */
function facesOf(
  riderIds: readonly string[],
  jerseys: Readonly<Record<string, ChronicleRider['jersey']>> = {},
  unknown: ReadonlySet<string> = new Set(),
): Map<string, ChronicleRider> {
  const out = new Map<string, ChronicleRider>()
  riderIds.forEach((id, i) => {
    if (unknown.has(id)) return
    const jersey = jerseys[id]
    out.set(id, {
      id,
      name: `Rider ${i}`,
      bib: i + 1,
      team: `Team ${i % 2}`,
      country: 'ES',
      ...(jersey === undefined ? {} : { jersey }),
    })
  })
  return out
}

const NOBODY: ReadonlySet<RiderIx> = new Set()

/** Los nombres de B16 con la lista vacía: nadie propio y nadie nombrable (la etapa no conocida). */
const plainNames = (riderIds: readonly string[]): RadioNames => ({
  riderOf: facesOf(riderIds),
  own: NOBODY,
  nameableAt: () => NOBODY,
})

/** Lo que dice un grupo sin los nombres: para comparar la carretera. */
const road = (g: RadioGroup) => [g.kind, g.size, g.gapS, g.gapToPrevS] as const

describe('radioFromTimeline · la etapa de juguete (todos los grupos de doce o menos)', () => {
  const { photos, riderIds } = toyStage()
  const { tl } = synthLine(photos, riderIds, OPTS)
  const radio = radioFromTimeline(tl, plainNames(riderIds))
  const blocks = photoBlocksOf(tl.lengthKm, tl.dx)

  it('una foto por bloque de foto, en el km de la radio guardada (el centro del bloque redondeado a dx)', () => {
    expect(radio.kms.map((k) => k.km)).toEqual(blocks.map((b) => radioKmOfBlock(b, tl.dx)))
    expect(radio.kms.length).toBe(blocks.length)
    // la cuenta de la radio guardada, operación a operación (`roundKm(kmAt(b))`)
    expect(radioKmOfBlock(0, 0.1)).toBe(Math.round((0.5 * 0.1) / 0.1) * 0.1)
    expect(radioKmOfBlock(57, 0.1)).toBe(Math.round((57.5 * 0.1) / 0.1) * 0.1)
  })

  it('los grupos en orden de carretera, con su kind por la regla del motor, su tamaño y sus huecos al segundo', () => {
    const at = (b: Block) => radio.kms[blocks.indexOf(b)]!
    // la salida: todos juntos, el pelotón
    expect(at(0).groups.map(road)).toEqual([['peloton', 8, 0, 0]])
    // b 20: la fuga de dos va 17,5 s por delante (175 Ds: al segundo, 18, como Math.round)
    expect(at(20).groups.map(road)).toEqual([
      ['fuga', 2, 0, 0],
      ['peloton', 6, 18, 18],
    ])
    // b 30: la fuga, el pelotón a 37,5 s y el descolgado a 49,5 s del primero y 12 del de delante
    expect(at(30).groups.map(road)).toEqual([
      ['fuga', 2, 0, 0],
      ['peloton', 5, 38, 38],
      ['grupeto', 1, 50, 12],
    ])
    // b 50: el título pasa a la fuga (D-03): ella es el pelotón, y el grupo de salida, detrás, grupeto
    expect(at(50).groups.map(road)).toEqual([
      ['peloton', 3, 0, 0],
      ['grupeto', 4, 49, 49],
    ])
  })

  it('el hueco es la resta de las marcas del bloque, al segundo, como lo redondea la radio guardada', () => {
    blocks.forEach((b, i) => {
      const p = photoAt(tl, b)
      const clocks = [...p.clock.values()].sort((x, y) => x - y)
      expect(
        radio.kms[i]!.groups.map((g) => g.gapS),
        `bloque ${b}`,
      ).toEqual(clocks.map((d) => Math.round((d - clocks[0]!) / 10)))
    })
  })

  it('racing y gone: los que tienen grupo y los que ya no; starters, los de la foto más poblada', () => {
    expect(radio.starters).toBe(8)
    for (const [i, b] of blocks.entries()) {
      const k = radio.kms[i]!
      expect(k.racing + k.gone, `bloque ${b}`).toBe(8)
      expect(k.gone, `bloque ${b}`).toBe(b >= 40 ? 1 : 0)
      expect(
        k.groups.reduce((n, g) => n + g.size, 0),
        `bloque ${b}`,
      ).toBe(k.racing)
    }
  })

  it('un grupo de doce o menos va entero, a rueda y por dorsal; sin capa de detalle, sin velocidad ni relevos', () => {
    for (const k of radio.kms)
      for (const g of k.groups) {
        expect(g.unnamed).toBe(0)
        expect(g.riders.map((r) => r.role)).toEqual(g.riders.map(() => 'sheltered'))
        expect(g.riders.map((r) => r.bib)).toEqual(
          [...g.riders.map((r) => r.bib!)].sort((a, b) => a - b),
        )
        expect(g.riders.length).toBe(g.size)
        expect([g.speedKmh, g.mishap, g.pullingTotal]).toEqual([null, null, 0])
      }
  })

  it('una crono no tiene radio: la vacía que guarda hoy la envoltura (la crono ignora la sonda)', () => {
    const empty: RaceRadio = { starters: 0, kms: [] }
    expect(radioFromTimeline({ ...tl, timeTrial: true }, plainNames(riderIds))).toEqual(empty)
  })
})

/**
 * LA ETAPA DE CUARENTA: un pelotón de 37 desde el bloque 20 (la fuga de tres se va), un descolgado
 * desde el 60 y un abandono en el 80, con la capa de detalle en cada bloque de foto.
 */
function bigStage(): { readonly tl: TimelineCore; readonly riderIds: readonly string[] } {
  const riderIds = Array.from({ length: 40 }, (_, i) => `b${i}`)
  const photos: SynthPhoto[] = []
  for (let b = 0; b < 100; b++) {
    const groupOf: (string | null)[] = riderIds.map(() => 'peloton')
    if (b >= 20) groupOf[0] = groupOf[1] = groupOf[2] = 'mov-1'
    if (b >= 60) groupOf[39] = 'shed-2'
    if (b >= 80) groupOf[38] = null
    const clockS: Record<string, number> = { peloton: 10 * (b + 1) }
    if (b >= 20) clockS['mov-1'] = 10 * (b + 1) - (b - 19) * 0.5
    if (b >= 60) clockS['shed-2'] = 10 * (b + 1) + (b - 59)
    photos.push({ groupOf, clockS, main: 'peloton' })
  }
  const { tl, ixOf } = synthLine(photos, riderIds, OPTS)
  const g = (id: string) => ixOf.get(id)!
  const detail = new Map<Block, readonly GroupDetail[]>()
  for (const b of photoBlocksOf(tl.lengthKm, tl.dx)) {
    const rows: GroupDetail[] = [
      {
        g: g('peloton'),
        speedKmh: 41.3,
        pullingTotal: 15,
        pullers: [
          { rider: 10, motive: 'equipo_general', forRider: 20 },
          { rider: 11, motive: 'equipo_general', forRider: 20 },
          { rider: 12, motive: null, forRider: null },
        ],
        mishap: null,
      },
    ]
    if (b >= 20)
      rows.push({
        g: g('mov-1'),
        speedKmh: 45.2,
        pullingTotal: 3,
        pullers: [0, 1, 2].map((rider) => ({ rider, motive: 'fuga' as const, forRider: null })),
        mishap: null,
      })
    if (b >= 60)
      rows.push({
        g: g('shed-2'),
        speedKmh: null,
        pullingTotal: 0,
        pullers: [],
        mishap: { kind: 'pinchazo', lostS: 32.4 },
      })
    detail.set(
      b,
      rows.sort((x, y) => x.g - y.g),
    )
  }
  return { tl: { ...tl, detail }, riderIds }
}

describe('radioFromTimeline · a quién nombra un grupo grande (12-o; R23.7)', () => {
  const { tl, riderIds } = bigStage()
  const blocks = photoBlocksOf(tl.lengthKm, tl.dx)
  /** El pelotón de una foto: el grupo del título. */
  const pack = (radio: RaceRadio, b: Block): RadioGroup =>
    radio.kms[blocks.indexOf(b)]!.groups.find((x) => x.kind === 'peloton')!

  it('la capa de detalle: la velocidad, los relevistas con su motivo y su destinatario, pullingTotal y el percance', () => {
    const radio = radioFromTimeline(tl, plainNames(riderIds))
    const k = radio.kms[blocks.indexOf(70)]!
    const [fuga, peloton, shed] = k.groups
    expect(fuga!.speedKmh).toBe(45.2)
    expect(fuga!.riders.map((r) => [r.name, r.role, r.motivo])).toEqual([
      ['Rider 0', 'pulling', 'fuga'],
      ['Rider 1', 'pulling', 'fuga'],
      ['Rider 2', 'pulling', 'fuga'],
    ])
    expect(peloton!.pullingTotal).toBe(15)
    expect(peloton!.riders.map((r) => [r.name, r.motivo, r.para?.name ?? null])).toEqual([
      ['Rider 10', 'equipo_general', 'Rider 20'],
      ['Rider 11', 'equipo_general', 'Rider 20'],
      ['Rider 12', null, null],
    ])
    // sin nadie propio ni nombrable, un grupo de más de doce nombra solo a los que tiran: el resto se cuenta
    expect(peloton!.unnamed).toBe(peloton!.size - 3)
    expect(shed!).toMatchObject({ speedKmh: null, mishap: { tipo: 'pinchazo', lostS: 32.4 } })
    expect(shed!.riders.map((r) => r.name)).toEqual(['Rider 39'])
  })

  it('los del espectador, en todas las fotos en que corren; los nombrables de cada km; el resto, contado', () => {
    const names: RadioNames = {
      riderOf: facesOf(riderIds, { b25: 'gc', b26: 'points', b27: 'kom' }),
      own: new Set([30, 2]),
      nameableAt: (km) => new Set(km >= 5 ? [27, 25, 26, 31] : [27, 25, 26]),
    }
    const radio = radioFromTimeline(tl, names)
    for (const b of blocks) {
      const p = pack(radio, b)
      const sheltered = p.riders.filter((r) => r.role === 'sheltered').map((r) => r.name)
      // a rueda: los propios primero (el 2 solo mientras va en el pelotón), los maillots por
      // JERSEY_PRIORITY y el resto por dorsal
      const km = radioKmOfBlock(b, tl.dx)
      expect(sheltered, `bloque ${b}`).toEqual([
        ...(b < 20 ? ['Rider 2'] : []),
        'Rider 30',
        'Rider 25',
        'Rider 26',
        'Rider 27',
        ...(km >= 5 ? ['Rider 31'] : []),
      ])
      expect(p.unnamed, `bloque ${b}`).toBe(p.size - p.riders.length)
    }
    // el propio de la fuga sale en la fuga, con los que tiran, y no a rueda
    const fuga = radio.kms[blocks.indexOf(30)]!.groups[0]!
    expect(fuga.riders.map((r) => [r.name, r.role])).toContainEqual(['Rider 2', 'pulling'])
  })

  it('el que tira no sale también a rueda, y a quien riderOf no conoce no se le nombra: se cuenta', () => {
    const names: RadioNames = {
      riderOf: facesOf(riderIds, {}, new Set(['b33', 'b11'])),
      own: new Set([10]),
      nameableAt: () => new Set([10, 33, 34]),
    }
    const p = pack(radioFromTimeline(tl, names), 50)
    expect(p.riders.map((r) => [r.name, r.role])).toEqual([
      ['Rider 10', 'pulling'],
      ['Rider 12', 'pulling'],
      ['Rider 34', 'sheltered'],
    ])
    expect(p.unnamed).toBe(p.size - 3)
  })

  it('como mucho radioNamedMax por grupo, y el corte no cae sobre los propios', () => {
    const everyone = new Set(riderIds.map((_, r) => r))
    const names: RadioNames = {
      riderOf: facesOf(riderIds),
      own: new Set([37]),
      nameableAt: () => everyone,
    }
    const p = pack(radioFromTimeline(tl, names), 50)
    expect(p.size).toBeGreaterThan(BROADCAST.radioNamedMax)
    expect(p.riders.length).toBe(BROADCAST.radioNamedMax)
    expect(p.unnamed).toBe(p.size - BROADCAST.radioNamedMax)
    expect(p.riders.filter((r) => r.role === 'sheltered')[0]!.name).toBe('Rider 37')
  })

  it('nameableAt se pregunta con el km de cada foto', () => {
    const asked: number[] = []
    radioFromTimeline(tl, {
      riderOf: facesOf(riderIds),
      own: NOBODY,
      nameableAt: (km) => {
        asked.push(km)
        return NOBODY
      },
    })
    expect(asked).toEqual(blocks.map((b) => radioKmOfBlock(b, tl.dx)))
  })
})

/**
 * LA RADIO HASTA LO PINTADO (11-i; §11.16): sobre la línea cortada en T, solo salen las fotos cerradas,
 * las de los km por los que ya habían pasado en T todos los grupos vivos (con la hora a la que se ve cada
 * marca, §4.6), y cada una es la de la línea entera.
 */
describe('radioFromTimeline · una línea cortada da el prefijo de fotos cerradas (11-i)', () => {
  for (const [label, line] of [
    ['la etapa de juguete', synthLine(toyStage().photos, toyStage().riderIds, OPTS).tl],
    ['la de cuarenta', bigStage().tl],
  ] as const) {
    it(`${label}: en cada décima de segundo, el prefijo cerrado de la radio de la línea entera`, () => {
      const names = plainNames(line.riderIds)
      const full = radioFromTimeline(line, names)
      const blocks = photoBlocksOf(line.lengthKm, line.dx)
      // la hora a la que se cierra cada foto: la mayor de las horas a las que se ven las marcas de sus grupos vivos
      const vis = visibilityOf(line)
      const closesAt = blocks.map((b) => {
        const alive = new Set([...photoAt(line, b).groupOf].filter((g) => g >= 0))
        let at = 0
        line.stateEvents.forEach((e, i) => {
          if (e.t !== 'clock' || e.b !== b) return
          e.marks.forEach(([g], j) => {
            if (alive.has(g)) at = Math.max(at, vis.clockMarkDs[i]![j]!)
          })
        })
        return at
      })
      const end = Math.max(...closesAt)
      let partial = 0
      for (let ds = 0; ds <= end + 10; ds += 7) {
        const cut = radioFromTimeline(cutTimeline(line, fromDs(ds)), names)
        let n = 0
        while (n < blocks.length && closesAt[n]! <= ds) n++
        expect(cut.kms, `T ${ds} Ds`).toEqual(full.kms.slice(0, n))
        if (n > 0 && n < blocks.length) partial += 1
      }
      expect(partial).toBeGreaterThan(10)
    })
  }

  it('una foto que cierra el grupo de detrás no se enseña cuando la cabeza ya ha pasado por ella', () => {
    const { tl } = bigStage()
    const blocks = photoBlocksOf(tl.lengthKm, tl.dx)
    const i = blocks.indexOf(70)
    const p = photoAt(tl, 70)
    const clocks = [...p.clock.values()].sort((x, y) => x - y)
    // la cabeza ya ha pasado por el km 7, el descolgado todavía no
    const between = fromDs(Math.floor((clocks[0]! + clocks.at(-1)!) / 2))
    const cut = radioFromTimeline(cutTimeline(tl, between), plainNames(tl.riderIds))
    expect(cut.kms.length).toBe(i)
    const after = radioFromTimeline(
      cutTimeline(tl, fromDs(clocks.at(-1)!)),
      plainNames(tl.riderIds),
    )
    expect(after.kms.length).toBeGreaterThan(i)
  })
})

describe('radioNameableAt · los nombrables de cada foto por la política de §7.7 (12-o)', () => {
  const ev = (km: number, riders: readonly RiderIx[]): TimelineEvent => ({
    source: 0,
    plantilla: 'attack',
    km,
    tS: 0,
    bEmit: 0,
    revealS: 0,
    riders,
    datos: null,
  })

  it('los maillots, los namedGcTop primeros de salida y extra, siempre; los protagonistas, desde el km de su suceso', () => {
    const nameable = radioNameableAt(
      { events: [ev(4.5, [6]), ev(2, [3, 4]), ev(2.05, [7])] },
      {
        wearing: [1],
        gcTop: [
          { rider: 2, rank: 1 },
          { rider: 8, rank: BROADCAST.namedGcTop },
          { rider: 9, rank: BROADCAST.namedGcTop + 1 },
        ],
        extra: [5],
      },
    )
    const sorted = (km: number) => [...nameable(km)].sort((a, b) => a - b)
    expect(sorted(0)).toEqual([1, 2, 5, 8])
    expect(sorted(1.95)).toEqual([1, 2, 5, 8])
    expect(sorted(2.0000000000000004)).toEqual([1, 2, 3, 4, 5, 8])
    expect(sorted(2.1)).toEqual([1, 2, 3, 4, 5, 7, 8])
    expect(sorted(200)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('sobre una línea cortada en lo pintado, solo nombran los sucesos ya revelados (los que trae el corte)', () => {
    const { photos, riderIds } = toyStage()
    const { tl } = synthLine(photos, riderIds, OPTS)
    const line: TimelineCore = {
      ...tl,
      events: [
        { ...ev(1, [4]), revealS: 5 },
        { ...ev(1, [3]), revealS: 50 },
      ],
    }
    const policy = { wearing: [], gcTop: [] }
    expect([...radioNameableAt(cutTimeline(line, 10), policy)(5)]).toEqual([4])
    expect([...radioNameableAt(line, policy)(5)].sort((a, b) => a - b)).toEqual([3, 4])
  })
})
