import { describe, expect, it } from 'vitest'
import {
  REVEAL_RULES,
  TT_REVEAL_RULES,
  type RecorderView,
  type RevealInput,
  revealSOf,
} from './reveal.js'
import type { BannerResult, Block, GroupIx, RiderIx } from './timeline.js'

/**
 * CUÁNDO SE ENSEÑA CADA SUCESO (docs/retransmision.md §4.7, D-05). `revealSOf` fecha un suceso por
 * la hora a la que se SABE, no por su `tS`: el bloque en que el motor lo emitió y el reloj de quien
 * lo protagoniza. Lo usan el adaptador de la radio desde el PR 2 (sobre su reloj estimado) y el
 * grabador desde el 4b (sobre las marcas exactas); aquí se sella cada regla sobre una vista de
 * mentira en la que todo reloj es una cuenta que se puede hacer de cabeza.
 */

/** La cabeza pasa el final del bloque b en el segundo 10·(b + 1); cada grupo, `retraso` después. */
const head = (b: Block): number => 10 * (b + 1)

interface FakeLine {
  /** su grupo al final de cada bloque: [desde el bloque, grupo] por bloque creciente; null, fuera */
  readonly groups?: Readonly<Record<string, readonly (readonly [Block, GroupIx | null])[]>>
  /** segundos que lleva cada grupo de retraso sobre la cabeza */
  readonly lag?: Readonly<Record<number, number>>
  /** el último bloque en que vive cada grupo (los demás viven siempre) */
  readonly diedB?: Readonly<Record<number, Block>>
  readonly banners?: readonly BannerResult[]
  readonly nextEmit?: (rider: RiderIx, afterSource: number) => Block | null
  readonly timeTrial?: boolean
}

const IX: Readonly<Record<string, RiderIx>> = { ana: 0, bea: 1, cris: 2 }

function view(line: FakeLine = {}): RecorderView {
  return {
    timeTrial: line.timeTrial ?? false,
    finishS: 5000,
    riderIx: (id) => IX[id] ?? null,
    blockOfKm: (km) => Math.max(0, Math.round(km / 0.1 - 0.5)),
    groupAt: (rider, b) => {
      if (b < 0) return 0
      const name = Object.keys(IX).find((k) => IX[k] === rider) ?? ''
      let g: GroupIx | null = 0
      for (const [from, to] of line.groups?.[name] ?? []) if (from <= b) g = to
      return g
    },
    clockAt: (g, b) => {
      const died = line.diedB?.[g]
      if (died !== undefined && b > died) return null
      return head(b) + (line.lag?.[g] ?? 0)
    },
    headClockAt: head,
    bannerAt: (kind, km) =>
      (line.banners ?? []).find((x) => x.kind === kind && Math.abs(x.km - km) < 0.1) ?? null,
    nextEmitOf: line.nextEmit ?? (() => null),
    ttStartS: (rider) => 600 * rider,
    ttOwnClockAt: (_rider, km) => 90 * km,
  }
}

const ev = (over: Partial<RevealInput> & { plantilla: string }): RevealInput => ({
  km: 10.05,
  tS: 0,
  protagonistas: [],
  ...over,
})

describe('revealSOf · carretera', () => {
  it('por defecto (emit): el reloj del grupo del primer protagonista al final del bloque de emisión', () => {
    const v = view({ groups: { bea: [[0, 2]] }, lag: { 2: 75 } })
    // bEmit 120: la cabeza pasa en 1.210 s y el grupo de Bea, 75 s después.
    expect(revealSOf(ev({ plantilla: 'attack_go', protagonistas: ['bea'] }), 3, 120, v)).toBe(1285)
  })

  it('…y sin protagonista, o con uno que no está en la carrera, el reloj de la cabeza', () => {
    const v = view({ lag: { 0: 30 } })
    expect(revealSOf(ev({ plantilla: 'time_gap' }), 0, 120, v)).toBe(1210)
    expect(revealSOf(ev({ plantilla: 'time_gap', protagonistas: ['nadie'] }), 0, 120, v)).toBe(1210)
  })

  it('…nunca antes de su propio tS (4-g): la concesión del pelotón la protagoniza la fuga', () => {
    const v = view({ groups: { ana: [[0, 1]] }, lag: { 1: 0 } })
    const concede = ev({ plantilla: 'peloton_concedes', tS: 1500, protagonistas: ['ana'] })
    expect(revealSOf(concede, 0, 120, v)).toBe(1500)
  })

  it('una plantilla que nadie ha decidido (R23.8 traerá card_changed) cae en emit', () => {
    const v = view({ groups: { ana: [[0, 1]] }, lag: { 1: 40 } })
    expect(revealSOf(ev({ plantilla: 'card_changed', protagonistas: ['ana'] }), 0, 50, v)).toBe(550)
    // …también una que se llamara como una propiedad de Object: la tabla no la hereda.
    expect(revealSOf(ev({ plantilla: 'constructor', protagonistas: ['ana'] }), 0, 50, v)).toBe(550)
  })

  it('rider_defies_team se revela con el siguiente suceso de su protagonista (next_emit)', () => {
    const v = view({ nextEmit: (rider, after) => (rider === 1 && after === 4 ? 300 : null) })
    const rebelde = ev({ plantilla: 'rider_defies_team', protagonistas: ['bea'] })
    expect(revealSOf(rebelde, 4, 120, v)).toBe(3010)
    // Sin siguiente suceso, su propio bloque de emisión.
    expect(revealSOf(rebelde, 5, 120, v)).toBe(1210)
  })

  it('las pancartas, con el reloj del grupo del primero que puntúa (banner)', () => {
    const cima: BannerResult = {
      kind: 'cima',
      km: 50,
      cat: 'cat1',
      name: null,
      revealS: 2222,
      order: [{ rider: 0, points: 10 }],
    }
    const v = view({ banners: [cima] })
    expect(
      revealSOf(ev({ plantilla: 'climb_kom', km: 50, protagonistas: ['ana'] }), 0, 499, v),
    ).toBe(2222)
    // Una volante sin su pancarta en la línea (el adaptador no las tiene) cae en emit.
    expect(
      revealSOf(
        ev({ plantilla: 'sprint_intermediate', km: 50, protagonistas: ['ana'] }),
        0,
        499,
        v,
      ),
    ).toBe(5000)
  })

  it('la caída y los percances de carretera, con el grupo en que iba al final del bloque anterior (incident, 4-v)', () => {
    // Cris iba en el grupo 1 (60 s) hasta el bloque 99; en el 100, el de la caída, ya va en el 3.
    const v = view({
      groups: {
        cris: [
          [0, 1],
          [100, 3],
        ],
      },
      lag: { 1: 60, 3: 200 },
    })
    const caida = ev({ plantilla: 'crash', km: 10.05, protagonistas: ['cris'] })
    expect(revealSOf(caida, -1, 100, v)).toBe(head(100) + 60)
    expect(revealSOf({ ...caida, plantilla: 'puncture' }, 7, 100, v)).toBe(head(100) + 60)
  })

  it('…con el reloj del bloque anterior si su grupo murió en el de la caída (iba solo)', () => {
    const v = view({ groups: { cris: [[0, 4]] }, lag: { 4: 90 }, diedB: { 4: 99 } })
    const caida = ev({ plantilla: 'mechanical', km: 10.05, protagonistas: ['cris'] })
    expect(revealSOf(caida, 2, 100, v)).toBe(head(99) + 90)
  })

  it('lo de la meta nunca va en un tramo: máx(finishS, tS) (finish)', () => {
    const v = view()
    for (const plantilla of [
      'bunch_sprint',
      'final_km',
      'stage_win',
      'time_cut',
      'time_cut_readmitted',
    ])
      expect(revealSOf(ev({ plantilla, tS: 4990 }), 0, 499, v), plantilla).toBe(5000)
    expect(revealSOf(ev({ plantilla: 'time_cut', tS: 5400 }), 0, 499, v)).toBe(5400)
  })
})

describe('revealSOf · contrarreloj', () => {
  const tt = view({ timeTrial: true })

  it('lo de la crono lleva ya reloj de carrera (tt_race_clock): su tS', () => {
    expect(
      revealSOf(ev({ plantilla: 'tt_split', tS: 1234, protagonistas: ['bea'] }), 0, 0, tt),
    ).toBe(1234)
  })

  it('el pinchazo de una crono va en reloj propio: su salida más su reloj en el km (tt_own_clock)', () => {
    // Bea sale en el segundo 600 y en el km 10 lleva 900 s: el pinchazo se sabe en el 1.500.
    const pinchazo = ev({ plantilla: 'puncture', km: 10, tS: 2549, protagonistas: ['bea'] })
    expect(revealSOf(pinchazo, 0, 0, tt)).toBe(1500)
  })

  it('el ganador, la última llegada y la caza de la meta van al paquete de meta (finish)', () => {
    for (const plantilla of ['stage_win_itt', 'tt_last_home', 'tt_catches'])
      expect(revealSOf(ev({ plantilla, tS: 100 }), 0, 0, tt), plantilla).toBe(5000)
  })
})

describe('las tablas de reglas (D-05)', () => {
  it('en carretera, las fechas trucadas del mapa 01 §1.2 tienen su regla', () => {
    expect(REVEAL_RULES).toMatchObject({
      breakaway_formed: 'emit',
      break_cooperation: 'emit',
      peloton_concedes: 'emit',
      rider_defies_team: 'next_emit',
      climb_kom: 'banner',
      sprint_intermediate: 'banner',
      crash: 'incident',
      puncture: 'incident',
      mechanical: 'incident',
      bunch_sprint: 'finish',
      final_km: 'finish',
      stage_win: 'finish',
      time_cut: 'finish',
      time_cut_readmitted: 'finish',
    })
  })

  it('en la crono, los percances van en reloj propio y la meta, al paquete de meta', () => {
    expect(TT_REVEAL_RULES).toEqual({
      puncture: 'tt_own_clock',
      mechanical: 'tt_own_clock',
      stage_win_itt: 'finish',
      tt_last_home: 'finish',
      tt_catches: 'finish',
      time_cut: 'finish',
      time_cut_readmitted: 'finish',
    })
  })
})
