import {
  BROADCAST,
  type BannerResult,
  type Cue,
  type GroupCatalogEntry,
  type GroupDetail,
  shownGroupsOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  castOf,
  headOf,
  instantOf,
  leaderWorn,
  range,
} from '../../components/broadcast/__fixtures__/screen'
import {
  CURSOR_GHOST_PAINTS,
  type CueTextContext,
  cueText,
  cursorsOf,
  overlaySummaryText,
  screenKeysOf,
} from './screen'

/**
 * LO QUE LA PANTALLA DE `Watch` GANA EN EL 6a (docs/retransmision.md §6.2, §6.5 y §3.7; D-03, D-21):
 * el texto de cada rótulo que sale de los sucesos y del estado (`cueText`, con las palabras de §21.6
 * F.3), los grupos que se pintan (sin los recién nacidos vacíos) y la identidad en pantalla de un grupo
 * por su sucesor, con la que los cursores del perfil no saltan (`screenKeysOf`, `cursorsOf`).
 */

const CAST = castOf(40, {
  3: { worn: leaderWorn('gc'), notoriety: 0 },
  7: { notoriety: 2 },
})

/** El instante de la fuga de cinco a +0:48 del pelotón, con su diferencia principal contra él. */
function breakaway() {
  return instantOf(
    [
      { members: [0, 1, 2, 3, 4], km: 120.4 },
      { members: range(5, 40), km: 119.9, gapS: 48, kind: 'peloton' },
    ],
    {
      mainGap: { ahead: 0, behind: 1, gapS: 48, trend: null, ref: 'bunch' },
    },
  )
}

const ctxOf = (instant = breakaway()): CueTextContext => ({
  cast: CAST,
  instant,
  profile: headOf(CAST).profile,
})

const text = (cue: Cue, ctx = ctxOf()): string => {
  const x = cueText(cue, ctx)
  return x.detail === null ? x.title : `${x.title} · ${x.detail}`
}

describe('cueText · los rótulos de los sucesos y del estado (§6.5, F.3)', () => {
  it('ATTACK con el más notable delante y, con más, «and 2 others»', () => {
    expect(text({ kind: 'attack', t: 10, riders: [5], fromGroup: 1 })).toBe('ATTACK · 6 Rider F5')
    // el líder (notoriedad 0) va delante aunque no sea el primero de los protagonistas
    expect(text({ kind: 'attack', t: 10, riders: [5, 7, 3], fromGroup: 1 })).toBe(
      'ATTACK · 4 Rider D3 and 2 others',
    )
    expect(text({ kind: 'attack', t: 10, riders: [], fromGroup: 1 })).toBe('ATTACK')
  })

  it('BREAKAWAY con los corredores y la diferencia contra quien la persigue', () => {
    expect(text({ kind: 'break_formed', t: 10, group: 0, riders: [0, 1, 2, 3, 4], gapS: 48 })).toBe(
      'BREAKAWAY · 5 riders · +0:48 on the bunch',
    )
    expect(text({ kind: 'break_formed', t: 10, group: 0, riders: [0, 1], gapS: 0 })).toBe(
      'BREAKAWAY · 2 riders',
    )
  })

  it('CRASH primero sin nombres y, en su segundo tiempo, con ellos', () => {
    expect(text({ kind: 'crash', t: 10, group: 1, riders: null })).toBe('CRASH')
    expect(text({ kind: 'crash', t: 10, group: 1, riders: [8, 12] })).toBe(
      'CRASH · 9 Rider I8 · 13 Rider M12',
    )
  })

  it('PUNCTURE y MECHANICAL, DROPPED con el maillot y el hueco, ABANDON con el equipo', () => {
    expect(text({ kind: 'mishap', t: 1, rider: 9, mishap: 'pinchazo', lostS: 20 })).toBe(
      'PUNCTURE · 10 Rider J9',
    )
    expect(text({ kind: 'mishap', t: 1, rider: 9, mishap: 'averia', lostS: 20 })).toBe(
      'MECHANICAL · 10 Rider J9',
    )
    expect(text({ kind: 'dropped', t: 1, rider: 3, gapS: 25 })).toBe(
      'DROPPED · 4 Rider D3 · Race leader · +0:25',
    )
    expect(text({ kind: 'dropped', t: 1, rider: 9, gapS: null })).toBe('DROPPED · 10 Rider J9')
    expect(text({ kind: 'abandon', t: 1, rider: 9, gapS: null })).toBe(
      'ABANDON · 10 Rider J9 · Team 0',
    )
  })

  it('SPLIT IN THE BUNCH con su causa, ECHELONS, CAUGHT con los km a meta y FLAMME ROUGE con la cabeza', () => {
    expect(text({ kind: 'split', t: 1, parts: [1], cause: 'viento', echelon: false })).toBe(
      'SPLIT IN THE BUNCH · in the crosswind',
    )
    expect(text({ kind: 'split', t: 1, parts: [1], cause: null, echelon: false })).toBe(
      'SPLIT IN THE BUNCH',
    )
    // el abanico (echelon_split) es su propio rótulo (F.3); el `Cue` lo sabe desde el 6b
    expect(text({ kind: 'split', t: 1, parts: [1], cause: 'viento', echelon: true })).toBe(
      'ECHELONS',
    )
    // el grupo cazado ya no está en el instante: la cabeza, por la palabra de §6.3
    expect(text({ kind: 'caught', t: 1, caught: 9, by: 1, toGoKm: 12.44 })).toBe(
      'CAUGHT · the lead group · 12.4 km to go',
    )
    expect(text({ kind: 'last_km', t: 1, leadGapS: 8 })).toBe(
      'FLAMME ROUGE · 1 KM · 5 in front · +0:08',
    )
    expect(text({ kind: 'last_km', t: 1, leadGapS: null })).toBe('FLAMME ROUGE · 1 KM · 5 in front')
  })

  it('CONTACT, BACK TOGETHER y «3 of the 5 remain»', () => {
    const now = instantOf([
      { members: [0, 1, 2], km: 120.4 },
      { members: range(3, 40), km: 119.9, gapS: 48, kind: 'peloton' },
    ])
    const ctx = ctxOf(now)
    expect(text({ kind: 'group_changed', t: 1, group: 0, gained: [2], lost: [] }, ctx)).toBe(
      'CONTACT · 1 rider bridges across',
    )
    expect(text({ kind: 'group_changed', t: 1, group: 1, gained: [3, 4, 5], lost: [] }, ctx)).toBe(
      'BACK TOGETHER · 3 riders rejoin the bunch',
    )
    expect(text({ kind: 'group_changed', t: 1, group: 0, gained: [], lost: [3, 4] }, ctx)).toBe(
      `${cueText({ kind: 'group_changed', t: 1, group: 0, gained: [], lost: [3, 4] }, ctx).title} · 3 of the 5 remain`,
    )
  })

  it('KOM con el puerto y su categoría y los tres primeros, e INTERMEDIATE SPRINT', () => {
    const kom: BannerResult = {
      kind: 'cima',
      km: 92,
      cat: 'cat2',
      name: 'Côte de Monteynard',
      revealS: 100,
      order: [
        { rider: 0, points: 5 },
        { rider: 1, points: 3 },
        { rider: 2, points: 2 },
        { rider: 3, points: 1 },
      ],
    }
    const sprint: BannerResult = {
      kind: 'meta_volante',
      km: 129,
      cat: null,
      name: null,
      revealS: 200,
      order: [{ rider: 4, points: 20 }],
    }
    const instant = { ...breakaway(), banners: [kom, sprint] }
    const ctx = ctxOf(instant)
    expect(text({ kind: 'banner_result', t: 1, banner: 0 }, ctx)).toBe(
      'KOM · Côte de Monteynard (Cat. 2) · 1. Rider A0 5 pts · 2. Rider B1 3 · 3. Rider C2 2',
    )
    expect(text({ kind: 'banner_result', t: 1, banner: 1 }, ctx)).toBe(
      'INTERMEDIATE SPRINT · 1. Rider E4 20 pts',
    )
  })
})

describe('shownGroupsOf · un grupo recién nacido sin nadie no se pinta (6a)', () => {
  it('se salta y los demás se renumeran por carretera', () => {
    const instant = instantOf([
      { members: [], km: 80.9 },
      { members: [0, 1], km: 80.8, gapS: 1 },
      { members: range(2, 30), km: 80.6, gapS: 20, kind: 'peloton' },
    ])
    const shown = shownGroupsOf(instant)
    expect(shown.map((g) => [g.g, g.number])).toEqual([
      [1, 1],
      [2, 2],
    ])
    // sin grupos vacíos, el mismo arreglo
    const full = breakaway()
    expect(shownGroupsOf(full)).toBe(full.groups)
  })
})

/** Un catálogo: `peloton`; `mov-1`, que muere en el 500 y se lleva a todos a `mov-2`, que nace en el 501
 *  (un cambio de etiqueta); `mov-3`, cazada en el 700 por el pelotón. */
const CATALOG: GroupCatalogEntry[] = [
  { id: 'peloton', origin: 'start', bornB: 0, diedB: null, successor: null },
  { id: 'mov-1', origin: 'attack', bornB: 100, diedB: 500, successor: 2 },
  { id: 'mov-2', origin: 'attack', bornB: 501, diedB: null, successor: null },
  { id: 'mov-3', origin: 'attack', bornB: 600, diedB: 700, successor: 0 },
]

describe('screenKeysOf y cursorsOf · los cursores siguen al grupo por su sucesor (D-03, §3.7)', () => {
  it('un cambio de etiqueta conserva la identidad en pantalla; una caza, no', () => {
    expect(screenKeysOf(CATALOG)).toEqual(['peloton', 'mov-1', 'mov-1', 'mov-3'])
    // nacer más de un bloque después de la muerte no es un cambio de etiqueta
    const late = CATALOG.map((g, i) => (i === 2 ? { ...g, bornB: 503 } : g))
    expect(screenKeysOf(late)).toEqual(['peloton', 'mov-1', 'mov-2', 'mov-3'])
  })

  it('en el cambio de etiqueta el cursor es el mismo: se queda donde iba hasta que su sucesor se ve', () => {
    const keys = screenKeysOf(CATALOG)
    const before = cursorsOf(
      shownGroupsOf(
        instantOf([
          { members: [0, 1], km: 50.0 },
          { members: range(2, 30), km: 49.0, kind: 'peloton' },
        ]),
      ).map((g) => ({ ...g, g: g.g === 0 ? 1 : 0 })),
      CATALOG,
      keys,
      [],
    )
    expect(before.map((c) => c.key).sort()).toEqual(['mov-1', 'peloton'])
    // muere mov-1 y sus dos van en tránsito: su cursor se queda en el km 50,0, sin número
    const gap = cursorsOf(
      shownGroupsOf(instantOf([{ members: range(2, 30), km: 49.1, kind: 'peloton' }])).map((g) => ({
        ...g,
        g: 0,
      })),
      CATALOG,
      keys,
      before,
    )
    expect(gap.find((c) => c.key === 'mov-1')).toMatchObject({ ghost: 1, km: 50.0 })
    // nace mov-2: el mismo cursor, con la misma identidad, sigue desde ahí
    const after = cursorsOf(
      shownGroupsOf(
        instantOf([
          { members: [0, 1], km: 50.1 },
          { members: range(2, 30), km: 49.2, kind: 'peloton' },
        ]),
      ).map((g) => ({ ...g, g: g.g === 0 ? 2 : 0 })),
      CATALOG,
      keys,
      gap,
    )
    expect(after.filter((c) => c.key === 'mov-1')).toEqual([
      expect.objectContaining({ g: 2, ghost: 0, km: 50.1 }),
    ])
  })

  it('una fuga cazada se funde con el cursor de su cazador y se va', () => {
    const keys = screenKeysOf(CATALOG)
    const before = cursorsOf(
      shownGroupsOf(
        instantOf([
          { members: [0, 1, 2], km: 70.0 },
          { members: range(3, 30), km: 69.9, kind: 'peloton' },
        ]),
      ).map((g) => ({ ...g, g: g.g === 0 ? 3 : 0 })),
      CATALOG,
      keys,
      [],
    )
    let now = before
    for (let paint = 1; paint <= CURSOR_GHOST_PAINTS + 1; paint++) {
      now = cursorsOf(
        shownGroupsOf(instantOf([{ members: range(0, 30), km: 70.1, kind: 'peloton' }])).map(
          (g) => ({ ...g, g: 0 }),
        ),
        CATALOG,
        keys,
        now,
      )
      const leaving = now.find((c) => c.key === 'mov-3')
      if (paint <= CURSOR_GHOST_PAINTS) expect(leaving).toMatchObject({ ghost: paint, km: 70.1 })
      else expect(leaving).toBeUndefined()
    }
  })
})

/**
 * EL RESUMEN ACCESIBLE DE LA CAPA FIJA (E3, docs/visual.md §14.3; H-05, X-15, 14-e; PR 20): el nombre del
 * botón, en dos frases con las piezas de lo que se pinta y en su orden, para que lo que se oye no se separe
 * de lo que se ve. La primera, siempre: la distancia, el grupo de cabeza y contra quién; la segunda, la de
 * `overlayDetailText` en palabras, salvo en los últimos `quietFinalM`, donde la capa solo dice la distancia.
 */
describe('overlaySummaryText · la capa fija, en dos frases (§14.3)', () => {
  const HEAD = headOf(CAST)
  /** La cabeza de cinco en `headKm` y el pelotón de 35 a `gapS`, con su tendencia y su velocidad. */
  const at = (
    headKm: number,
    gapS: number,
    o: {
      readonly t?: number
      readonly trend?: { deltaS: number; arrow: 'up' | 'down' | 'flat' } | null
      readonly speedKmh?: number | null
      readonly lapsToGo?: number | null
      readonly lengthKm?: number
    } = {},
  ) => {
    const detail: GroupDetail | null =
      o.speedKmh === undefined || o.speedKmh === null
        ? null
        : { g: 0, speedKmh: o.speedKmh, pullingTotal: 0, pullers: [], mishap: null }
    const trend =
      o.trend === undefined || o.trend === null
        ? null
        : { ...o.trend, windowKm: BROADCAST.trendWindowKm }
    return instantOf(
      [
        { members: [0, 1, 2, 3, 4], km: headKm, detail },
        { members: range(5, 40), km: headKm - 1, gapS, kind: 'peloton' },
      ],
      {
        ...(o.lengthKm === undefined ? {} : { lengthKm: o.lengthKm }),
        ...(o.t === undefined ? {} : { t: o.t }),
        lapsToGo: o.lapsToGo ?? null,
        mainGap: { ahead: 0, behind: 1, gapS, trend, ref: 'bunch' },
      },
    )
  }

  it('entera, con la segunda línea en palabras: la lluvia y el viento, la velocidad y la tendencia', () => {
    // en el km 86,5 de 185: sube al 5 %, y desde el 80 llueve con viento de costado (`headOf`)
    const instant = at(86.5, 134, {
      t: 3 * 3600 + 12 * 60 + 5,
      speedKmh: 42.3,
      trend: { deltaS: 12, arrow: 'up' },
    })
    expect(overlaySummaryText(instant, HEAD)).toBe(
      '98.5 km to go, lead group 5 riders, bunch at 2 minutes 14. Race time 3 hours 12 minutes, ' +
        '42.3 km per hour, 5 percent, 21 degrees, rain, crosswind, gap up 12 seconds over 5 km.',
    )
  })

  it('lo que la segunda línea no pinta, tampoco se dice: sin velocidad, sin lluvia y sin tendencia', () => {
    // en el llano del km 50, antes de la lluvia; la tendencia plana no lleva flecha
    const instant = at(50, 45, { t: 3900, trend: { deltaS: 2, arrow: 'flat' } })
    expect(overlaySummaryText(instant, HEAD)).toBe(
      '135.0 km to go, lead group 5 riders, bunch at 45 seconds. Race time 1 hour 5 minutes, ' +
        '0 percent, 21 degrees.',
    )
  })

  it('la diferencia que baja, en minutos y segundos; y la misma marca por debajo de sameTimeS', () => {
    const down = at(86.5, 61, { t: 600, trend: { deltaS: -65, arrow: 'down' } })
    expect(overlaySummaryText(down, HEAD)).toContain('bunch at 1 minute 1.')
    expect(overlaySummaryText(down, HEAD)).toContain('Race time 10 minutes,')
    expect(overlaySummaryText(down, HEAD)).toMatch(/gap down 1 minute 5 seconds over 5 km\.$/)
    const same = at(86.5, BROADCAST.sameTimeS - 1)
    expect(overlaySummaryText(same, HEAD)).toMatch(
      /^98\.5 km to go, lead group 5 riders, bunch at the same time\. /,
    )
  })

  it('con la cabeza retenida, que no está en groups (10a), lead group sin tamaño, y no el del primero de la barra', () => {
    // unos segundos tras morir la cabeza con los suyos en carrera, la diferencia aún se mide contra ella:
    // el primero de `groups` es el pelotón, el mismo contra el que se mide, y no es la cabeza
    const held = instantOf([{ members: range(0, 40), km: 86.5, kind: 'peloton' }], {
      t: 7200,
      mainGap: { ahead: 9, behind: 0, gapS: 8, trend: null, ref: 'bunch' },
    })
    const text = overlaySummaryText(held, HEAD)
    expect(text).toMatch(/^98\.5 km to go, lead group, bunch at 8 seconds\. /)
    expect(text).not.toContain('lead group 40 riders')
  })

  it('la cabeza que lleva el amarillo, con la palabra de su fila (W1): race leader’s group', () => {
    const instant = instantOf(
      [
        { members: [0, 1, 2, 3, 4], km: 86.5, jerseys: ['gc'] },
        { members: range(5, 40), km: 85.5, gapS: 134, kind: 'peloton' },
      ],
      { t: 600, mainGap: { ahead: 0, behind: 1, gapS: 134, trend: null, ref: 'bunch' } },
    )
    expect(instant.groups[0]!.label).toEqual({ k: 'jersey_group', jersey: 'gc' })
    expect(overlaySummaryText(instant, HEAD)).toMatch(
      /^98\.5 km to go, race leader’s group 5 riders, bunch at 2 minutes 14\. /,
    )
  })

  it('un solo grupo: bunch together, sin cabeza ni diferencia', () => {
    const together = instantOf([{ members: range(0, 40), km: 86.5, kind: 'peloton' }], {
      t: 7200,
    })
    expect(overlaySummaryText(together, HEAD)).toBe(
      '98.5 km to go, bunch together. Race time 2 hours, 5 percent, 21 degrees, rain, crosswind.',
    )
  })

  it('una pendiente negativa dice minus, sin el decimal cero; y un corredor solo, 1 rider', () => {
    // la bajada del 4 % del km 140 al 141
    const altM = HEAD.profile.altM.map((a, k) => (k <= 140 ? a : a - 40))
    const down = { ...HEAD, profile: { ...HEAD.profile, altM } }
    const solo = instantOf(
      [
        { members: [0], km: 140.2 },
        { members: range(1, 40), km: 139, gapS: 30, kind: 'peloton' },
      ],
      { t: 7200, mainGap: { ahead: 0, behind: 1, gapS: 30, trend: null, ref: 'bunch' } },
    )
    const text = overlaySummaryText(solo, down)
    expect(text).toMatch(/, lead group 1 rider, bunch at 30 seconds\. /)
    expect(text).toContain(', minus 4 percent, ')
  })

  it('en un circuito, las vueltas delante, como en la capa: 3 laps to go con sus km, y Last lap', () => {
    const lap = headOf(CAST, { lengthKm: 85 })
    const circuit = { ...lap, profile: { ...lap.profile, laps: 5 } }
    expect(overlaySummaryText(at(42.5, 40, { lengthKm: 85, lapsToGo: 3 }), circuit)).toMatch(
      /^3 laps to go, 42\.5 km, lead group 5 riders, bunch at 40 seconds\. /,
    )
    expect(overlaySummaryText(at(76.8, 40, { lengthKm: 85, lapsToGo: 1 }), circuit)).toMatch(
      /^Last lap, 8\.2 km to go, lead group 5 riders, /,
    )
  })

  it('el último km, en metros; y en los últimos quietFinalM, solo la distancia', () => {
    const lengthKm = 185
    expect(overlaySummaryText(at(lengthKm - 0.856, 6), HEAD)).toMatch(
      /^850 m to go, lead group 5 riders, bunch at 6 seconds\. Race time /,
    )
    const quiet = at(lengthKm - (BROADCAST.quietFinalM - 100) / 1000, 6, {
      trend: { deltaS: 12, arrow: 'up' },
    })
    expect(overlaySummaryText(quiet, HEAD)).toBe(`${BROADCAST.quietFinalM - 100} m to go.`)
  })
})
