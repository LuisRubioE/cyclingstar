import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '../countries.js'
import type { ChampionTitle, Distinction, NotorietyLevel, RiderCard } from '../jerseys.js'
import { BROADCAST } from './constants.js'
import type { GroupNow, InstantContext } from './instant.js'
import {
  PULL_MOTIVE_WORDS,
  WITH_THE,
  breakHeadline,
  breakHeadlineParts,
  breakPresentedOf,
  breakRoundOf,
  cardCaption,
  cardLineText,
  championTitleText,
  gapText,
  gapTrendLine,
  listAnd,
  namedRidersOf,
  ordinal,
  pullingLineOf,
} from './names.js'
import type { GroupDetail, RiderIx, StageRef, TimelineEvent } from './timeline.js'

/**
 * LAS PALABRAS DEL RÓTULO Y DE LA FRASE DE LA FUGA (E2, docs/retransmision.md §6.4, §6.7, §7.1, §7.4,
 * §7.6, §7.7 y §12.5; D-26, D-27; 6-d, 6-m, 7-d, 7-i; paso 6b). Los casos de la tabla de §7.6 con los
 * tres más que da (el propio que además es notable; diez contados o más, en cifras; una carta con el
 * título velado no sale como campeón), `namedRidersOf` (§7.7), `breakRoundOf` (hasta doce, por dorsal;
 * en una fuga mayor, antes los de maillot, luego los propios y luego por notoriedad), `pullingLineOf`
 * con el motivo de cada equipo (6-d), `gapTrendLine` (§12.5) y los textos del rótulo, con los ocho
 * países que llevan artículo en inglés (7-d).
 */

const N = { country: (iso2: string) => COUNTRIES.find((c) => c.code === iso2)?.name ?? iso2 }
const FROM: StageRef = { raceKey: 'race-france:s0', stageDay: 6 }

const title = (over: Partial<ChampionTitle> = {}): ChampionTitle => ({
  scope: 'national',
  country: 'IT',
  discipline: 'road',
  category: 'elite',
  season: 0,
  validFromDay: 179,
  validToDay: 543,
  source: { raceKey: 'nc-it-road:s0', stageDay: 1 },
  provisional: true,
  ...over,
})

/** Un corredor servido: por defecto, de nivel 8, con la equipación de su equipo y sin líneas. */
function card(ix: RiderIx, name: string, over: Partial<RiderCard> = {}): RiderCard {
  return {
    ix,
    id: `r${ix}`,
    name,
    bib: ix,
    country: 'FR',
    gender: 'M',
    team: { id: `t-${name}`, name: `Team ${name.split(' ')[0]}`, jerseySeed: `s-${name}` },
    worn: { kind: 'team' },
    lines: [],
    notoriety: 8,
    own: false,
    ...over,
  }
}
const team = (name: string) => ({ id: `t-${name}`, name, jerseySeed: `s-${name}` })
const lvl = (n: NotorietyLevel) => n

// Los cinco de la etapa 7 de Race France (§7.6), por su dorsal: el campeón de Italia, el líder de la
// montaña, uno sin nada, el 14.º de la general y el que ganó la etapa 3.
const BERTOLINI = card(21, 'Luca Bertolini', {
  country: 'IT',
  team: team('Team Alpha'),
  worn: { kind: 'champion', title: title() },
  notoriety: lvl(4),
})
const VERHOEVEN = card(45, 'Jonas Verhoeven', {
  country: 'BE',
  team: team('Team Gamma'),
  worn: { kind: 'leader', jersey: 'kom', delegated: false, from: FROM },
  notoriety: lvl(2),
})
const LAMBERT = card(57, 'Pierre Lambert', { team: team('Team Epsilon') })
const ARRIETA = card(88, 'Iñigo Arrieta', {
  country: 'ES',
  team: team('Team Delta'),
  lines: [{ kind: 'gc', rank: 14, deficitS: 242, from: FROM }],
})
const HARGREAVES = card(112, 'Tom Hargreaves', {
  country: 'GB',
  team: team('Team Zeta'),
  lines: [{ kind: 'stage_wins', stages: [{ raceKey: 'race-france:s0', stageDay: 3 }] }],
  notoriety: lvl(6),
})
const NONE = new Set<RiderIx>()

describe('breakHeadline · «cuando se escapan cinco» (§7.6, la tabla)', () => {
  /** Cinco sin nadie notable, cada uno de su equipo. */
  const plain = [
    card(3, 'Ana Uno', { team: team('Team A') }),
    card(4, 'Bea Dos', { team: team('Team B') }),
    card(5, 'Cris Tres', { team: team('Team C') }),
    card(6, 'Dani Cuatro', { team: team('Team D') }),
    card(7, 'Eva Cinco', { team: team('Team E') }),
  ]

  it('cinco sin nadie notable: Five riders go clear.', () => {
    expect(breakHeadline('en', plain, NONE)).toBe('Five riders go clear.')
  })

  it('ídem, dos de ellos del mismo equipo: …, two of them from Team Delta.', () => {
    const delta = plain.map((c, i) => (i === 1 || i === 3 ? { ...c, team: team('Team Delta') } : c))
    expect(breakHeadline('en', delta, NONE)).toBe(
      'Five riders go clear, two of them from Team Delta.',
    )
  })

  it('el campeón de Italia con cuatro más, sin otro notable (el caso literal del dueño)', () => {
    expect(breakHeadline('en', [BERTOLINI, ...plain.slice(0, 4)], NONE)).toBe(
      'The champion of Italy goes clear with four others.',
    )
  })

  it('el líder de la montaña, el campeón de Italia y tres más', () => {
    // la etapa 7 de §7.6: Hargreaves es nivel 6 y no cabe; Arrieta, 14.º, es nivel 8
    const five = [BERTOLINI, VERHOEVEN, LAMBERT, ARRIETA, HARGREAVES]
    expect(breakHeadline('en', five, NONE)).toBe(
      'The mountains leader and the champion of Italy go clear with three others.',
    )
  })

  it('ídem, y uno de los tres es el corredor del espectador', () => {
    const five = [BERTOLINI, VERHOEVEN, LAMBERT, { ...ARRIETA, own: true }, HARGREAVES]
    expect(breakHeadline('en', five, new Set([88]))).toBe(
      'The mountains leader and the champion of Italy go clear with your rider Iñigo Arrieta and two others.',
    )
  })

  it('el corredor del espectador y cuatro sin notables', () => {
    const five = [{ ...ARRIETA, own: true }, ...plain.slice(0, 4)]
    expect(breakHeadline('en', five, new Set([88]))).toBe(
      'Your rider Iñigo Arrieta goes clear with four others.',
    )
  })

  it('el líder de la montaña y el 9.º de la general', () => {
    const ninth: RiderCard = {
      ...ARRIETA,
      lines: [{ kind: 'gc', rank: 9, deficitS: 151, from: FROM }],
      notoriety: 5,
    }
    expect(breakHeadline('en', [VERHOEVEN, ninth, ...plain.slice(0, 3)], NONE)).toBe(
      'The mountains leader and Iñigo Arrieta (9th overall) go clear with three others.',
    )
  })

  it('dos sin notables: por su nombre, por dorsal', () => {
    const two = [card(9, 'Tom Hargreaves'), card(57, 'Pierre Lambert')]
    expect(breakHeadline('en', two, NONE)).toBe('Tom Hargreaves and Pierre Lambert go clear.')
    expect(breakHeadline('en', [...two].reverse(), NONE)).toBe(
      'Tom Hargreaves and Pierre Lambert go clear.',
    )
    expect(breakHeadline('en', [card(9, 'Tom Hargreaves')], NONE)).toBe(
      'Tom Hargreaves goes clear.',
    )
  })

  it('el campeón del mundo (cuando E12 lo cree)', () => {
    const world = card(1, 'Mads Olsen', {
      worn: { kind: 'champion', title: title({ scope: 'world', country: null }) },
      notoriety: 1,
    })
    expect(breakHeadline('en', [world, ...plain.slice(0, 4)], NONE)).toBe(
      'The world champion goes clear with four others.',
    )
  })

  it('el Giro de la temporada 0: sin el título, el segundo hueco es del ganador de la etapa 3', () => {
    const bertolini: RiderCard = { ...BERTOLINI, worn: { kind: 'team' }, notoriety: 8 }
    const five = [bertolini, VERHOEVEN, LAMBERT, ARRIETA, HARGREAVES]
    expect(breakHeadline('en', five, NONE)).toBe(
      'The mountains leader and stage 3 winner Tom Hargreaves go clear with three others.',
    )
  })

  it('los demás niveles con su forma: el líder, otro maillot de líder, uno delegado y un nombre conocido', () => {
    const leader = card(11, 'Sam Carter', {
      worn: { kind: 'leader', jersey: 'gc', delegated: false, from: FROM },
      notoriety: 0,
    })
    const delegated = card(33, 'Mads Olsen', {
      worn: { kind: 'leader', jersey: 'points', delegated: true, from: FROM },
      notoriety: 3,
    })
    const known = card(40, 'Jan Novák', { notoriety: 7 })
    expect(breakHeadline('en', [leader, delegated, ...plain.slice(0, 2)], NONE)).toBe(
      'The race leader and Mads Olsen in the points jersey go clear with two others.',
    )
    expect(breakHeadline('en', [known, ...plain.slice(0, 1)], NONE)).toBe(
      'Jan Novák goes clear with one other.',
    )
    const u23 = card(5, 'Ugo Rossi', {
      worn: { kind: 'champion', title: title({ category: 'u23', discipline: 'itt' }) },
      notoriety: 4,
    })
    expect(breakHeadline('en', [u23, ...plain.slice(0, 1)], NONE)).toBe(
      'The U23 time trial champion of Italy goes clear with one other.',
    )
  })

  // Los tres casos más de §7.6.
  it('el propio que además es notable ocupa su hueco por notoriedad y se escribe your rider {Name}, nunca dos veces', () => {
    const ownChamp: RiderCard = { ...BERTOLINI, own: true }
    const five = [ownChamp, VERHOEVEN, LAMBERT, ARRIETA, HARGREAVES]
    const line = breakHeadline('en', five, new Set([21]))
    expect(line).toBe(
      'The mountains leader and your rider Luca Bertolini go clear with three others.',
    )
    expect(line.split('Luca Bertolini')).toHaveLength(2)
    expect(breakHeadlineParts(five, new Set([21]))).toEqual({
      named: [45, 21],
      own: [],
      others: [57, 88, 112],
    })
  })

  it('con diez contados o más, el número va en cifras', () => {
    const many = Array.from({ length: 13 }, (_, i) =>
      card(100 + i, `Rider ${i}`, { team: team(`Team ${i}`) }),
    )
    expect(breakHeadline('en', [BERTOLINI, ...many.slice(0, 12)], NONE)).toBe(
      'The champion of Italy goes clear with 12 others.',
    )
    expect(breakHeadline('en', many, NONE)).toBe('13 riders go clear.')
    expect(breakHeadline('en', [BERTOLINI, ...many.slice(0, 9)], NONE)).toBe(
      'The champion of Italy goes clear with nine others.',
    )
  })

  it('una carta cuyo título está velado no sale como campeón: la frase lee las cartas ya servidas (§7.8)', () => {
    // la API degrada el maillot velado a la equipación y quita la línea antes de servir (7b)
    const veiled: RiderCard = { ...BERTOLINI, worn: { kind: 'team' }, lines: [], notoriety: 8 }
    expect(breakHeadline('en', [veiled, ...plain.slice(0, 4)], NONE)).toBe('Five riders go clear.')
  })

  it('las partes: los nombrados por notoriedad, los propios por dorsal y los contados por dorsal', () => {
    const five = [HARGREAVES, ARRIETA, LAMBERT, VERHOEVEN, BERTOLINI]
    expect(breakHeadlineParts(five, new Set([88]))).toEqual({
      named: [45, 21],
      own: [88],
      others: [57, 112],
    })
    expect(breakHeadlineParts(plain, NONE)).toEqual({ named: [], own: [], others: [3, 4, 5, 6, 7] })
  })
})

describe('namedRidersOf · a quién se nombra en cada grupo (§7.7)', () => {
  const cast = Array.from({ length: 40 }, (_, i) => card(i, `Rider ${i}`))
  const ctx = (over: Partial<InstantContext> = {}): InstantContext => ({
    own: new Set(),
    start: { leaders: { gc: null, points: null, kom: null }, gcTop: [], racingAtStart: 40 },
    photoBlocks: [],
    ...over,
  })
  const group = (members: readonly RiderIx[], detail: GroupDetail | null = null): GroupNow => ({
    g: 0,
    number: 1,
    role: 'bunch',
    label: { k: 'role' },
    kind: 'peloton',
    km: 50,
    size: members.length,
    members,
    gap: { toHeadS: 0, toAheadS: null, atKm: 49, trend: null },
    detail,
    jerseys: [],
    own: false,
  })
  const event = (riders: readonly RiderIx[], revealS = 100): TimelineEvent => ({
    source: 0,
    plantilla: 'attack_go',
    km: 30,
    tS: revealS,
    bEmit: 300,
    revealS,
    riders,
    datos: null,
  })

  it(`un grupo de hasta ${BROADCAST.nameWholeGroupUpTo} se nombra entero, por dorsal`, () => {
    const twelve = [11, 3, 7, 0, 1, 2, 4, 5, 6, 8, 9, 10]
    expect(namedRidersOf(group(twelve), cast, [], ctx())).toEqual({
      named: [...twelve].sort((a, b) => a - b),
      others: 0,
    })
  })

  it('uno mayor: los que tiran, los de maillot, los primeros de la general de salida, los propios y los protagonistas de lo ya revelado', () => {
    const members = Array.from({ length: 30 }, (_, i) => i)
    const withJersey = cast.map((c, i) =>
      i === 20
        ? {
            ...c,
            worn: { kind: 'leader' as const, jersey: 'gc' as const, delegated: false, from: FROM },
          }
        : c,
    )
    const detail: GroupDetail = {
      g: 0,
      speedKmh: 42,
      pullingTotal: 3,
      pullers: [
        { rider: 5, motive: 'persecucion', forRider: null },
        { rider: 6, motive: 'persecucion', forRider: null },
      ],
      mishap: null,
    }
    const c = ctx({
      own: new Set([25]),
      start: {
        leaders: { gc: 20, points: null, kom: null },
        gcTop: [
          { rider: 20, rank: 1, gapS: 0 },
          { rider: 12, rank: BROADCAST.namedGcTop, gapS: 60 },
          { rider: 13, rank: BROADCAST.namedGcTop + 1, gapS: 70 },
        ],
        racingAtStart: 40,
      },
    })
    const got = namedRidersOf(group(members, detail), withJersey, [event([28])], c)
    expect(got).toEqual({ named: [5, 6, 12, 20, 25, 28], others: 24 })
    // el que se nombra por un suceso, solo desde que se ha revelado: la línea cortada no trae otros
    expect(namedRidersOf(group(members, detail), withJersey, [], c).named).not.toContain(28)
  })

  it('named.length + others es el tamaño del grupo', () => {
    const members = Array.from({ length: 35 }, (_, i) => i)
    const { named, others } = namedRidersOf(group(members), cast, [event([3, 4])], ctx())
    expect(named.length + others).toBe(35)
  })
})

describe('breakPresentedOf · la frase como rótulo, del break_formed de la fuga (§6.5, 6-i)', () => {
  const cast: RiderCard[] = []
  for (const c of [BERTOLINI, VERHOEVEN, LAMBERT, ARRIETA, HARGREAVES]) cast[c.ix] = c
  const formed = {
    kind: 'break_formed',
    t: 1234,
    group: 2,
    riders: [112, 21, 57, 45, 88],
    gapS: 0,
  } as const

  it('nombra a los notables en el orden de la frase y cuenta al resto, con los escapados por dorsal', () => {
    expect(breakPresentedOf(formed, cast, NONE)).toEqual({
      kind: 'break_presented',
      t: 1234,
      group: 2,
      named: [45, 21],
      others: 3,
      riders: [21, 45, 57, 88, 112],
    })
  })

  it('el propio va después de los notables, y sale de la cuenta', () => {
    const p = breakPresentedOf(formed, cast, new Set([57]))
    expect([p.named, p.others]).toEqual([[45, 21, 57], 2])
  })
})

describe('breakRoundOf · a quiénes presenta la moto (6-m)', () => {
  it(`hasta ${BROADCAST.nameWholeGroupUpTo}, todos, por dorsal`, () => {
    const cast = Array.from({ length: 20 }, (_, i) => card(i, `R${i}`))
    expect(breakRoundOf([9, 2, 5, 1], cast)).toEqual([1, 2, 5, 9])
  })

  it('en una fuga mayor: los de maillot, luego los propios y luego por notoriedad, hasta doce, por dorsal', () => {
    // del 10 al 17, de nivel 0 a 7; el 18 y el 19, de 7; los demás, de 8
    const cast = Array.from({ length: 30 }, (_, i) =>
      card(i, `R${i}`, { notoriety: i < 10 ? 8 : (Math.min(7, i - 10) as NotorietyLevel) }),
    )
    const withJerseys = cast.map((c) =>
      c.ix === 3
        ? { ...c, worn: { kind: 'champion' as const, title: title() }, notoriety: 4 as const }
        : c.ix === 4
          ? {
              ...c,
              worn: {
                kind: 'leader' as const,
                jersey: 'kom' as const,
                delegated: false,
                from: FROM,
              },
            }
          : c.ix === 7
            ? { ...c, own: true }
            : c,
    )
    const riders = Array.from({ length: 20 }, (_, i) => i)
    const round = breakRoundOf(riders, withJerseys)
    expect(round).toHaveLength(BROADCAST.nameWholeGroupUpTo)
    // el campeón y el de la montaña, el propio, y los de menor nivel de notoriedad; a igual nivel (el
    // 17, el 18 y el 19, de 7), por dorsal
    expect(round).toEqual([3, 4, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18])
  })
})

describe('pullingLineOf · quién tira y por qué (6-d)', () => {
  const cast = Array.from({ length: 20 }, (_, i) =>
    card(i, `R${i}`, { team: team(i < 4 ? 'Team Rho' : i < 8 ? 'Team Kappa' : `Team ${i}`) }),
  )
  const detail = (pullers: GroupDetail['pullers'], pullingTotal = pullers.length): GroupDetail => ({
    g: 0,
    speedKmh: 40,
    pullingTotal,
    pullers,
    mishap: null,
  })

  it('nadie da la cara, o no hay fila de detalle: null', () => {
    expect(pullingLineOf(null, [0, 1], cast)).toBeNull()
    expect(pullingLineOf(detail([], 0), [0, 1], cast)).toBeNull()
  })

  it('una fuga en la que relevan todos sus equipos: in_turn', () => {
    const three = [0, 4, 8]
    expect(
      pullingLineOf(
        detail([
          { rider: 0, motive: 'fuga', forRider: null },
          { rider: 4, motive: 'fuga', forRider: null },
          { rider: 8, motive: 'fuga', forRider: null },
        ]),
        three,
        cast,
      ),
    ).toEqual({ k: 'in_turn', pulling: 3, of: 3 })
  })

  it('el pelotón: los dos equipos con más relevistas, con su destinatario si lo comparten dos, si no su motivo mayoritario', () => {
    const members = Array.from({ length: 20 }, (_, i) => i)
    const line = pullingLineOf(
      detail(
        [
          { rider: 0, motive: 'persecucion', forRider: null },
          { rider: 1, motive: 'rol', forRider: null },
          { rider: 2, motive: 'rol', forRider: null },
          { rider: 3, motive: 'persecucion', forRider: null },
          { rider: 4, motive: 'equipo_etapa', forRider: 7 },
          { rider: 5, motive: 'equipo_etapa', forRider: 7 },
          { rider: 6, motive: 'equipo_etapa', forRider: 7 },
          { rider: 9, motive: 'persecucion', forRider: null },
          { rider: 10, motive: 'persecucion', forRider: null },
        ],
        20,
      ),
      members,
      cast,
    )
    // Rho, cuatro: dos por persecución y dos por rol, y sale antes un persecucion; Kappa, tres para R7
    expect(line).toEqual({
      k: 'teams',
      teams: [
        { teamId: 't-Team Rho', count: 4, forRider: null, motive: 'persecucion' },
        { teamId: 't-Team Kappa', count: 3, forRider: 7, motive: 'equipo_etapa' },
      ],
      moreTeams: 2,
    })
  })

  it('cada motivo tiene su palabra', () => {
    expect(PULL_MOTIVE_WORDS.persecucion).toBe('chasing')
    expect(PULL_MOTIVE_WORDS.equipo_general).toBe('for the GC')
    expect(Object.values(PULL_MOTIVE_WORDS).every((w) => w.length > 0)).toBe(true)
  })
})

describe('gapTrendLine · la tendencia del hueco en la voz (§12.5)', () => {
  it('baja y sube, en segundos y desde el minuto en m:ss; la ventana en palabras', () => {
    expect(gapTrendLine('en', { deltaS: -40, windowKm: 5, arrow: 'down' })).toBe(
      'The gap has fallen by 40 seconds in five kilometres.',
    )
    expect(gapTrendLine('en', { deltaS: 70, windowKm: 5, arrow: 'up' })).toBe(
      'The gap has grown by 1:10 in five kilometres.',
    )
    expect(gapTrendLine('en', { deltaS: 2, windowKm: 5, arrow: 'flat' })).toBeNull()
  })
})

describe('los textos del rótulo (§7.1, §7.4; 7-d)', () => {
  it('ordinal: 1st 2nd 3rd 4th, 11th 12th 13th, 21st', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111, 112].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '101st',
      '111th',
      '112th',
    ])
  })

  it('gapText: +m:ss, desde la hora +h:mm:ss, y con signo siempre (D-57)', () => {
    expect(gapText(242)).toBe('+4:02')
    expect(gapText(0)).toBe('+0:00')
    expect(gapText(3730)).toBe('+1:02:10')
    expect(gapText(-3)).toBe('−0:03')
  })

  it('listAnd: «3», «3 and 7», «3, 7 and 12»', () => {
    expect(listAnd([])).toBe('')
    expect(listAnd(['3'])).toBe('3')
    expect(listAnd(['3', '7'])).toBe('3 and 7')
    expect(listAnd(['3', '7', '12'])).toBe('3, 7 and 12')
  })

  it('el titular: el líder no delegado y el campeón; ni el delegado ni el de equipo', () => {
    expect(cardCaption({ kind: 'leader', jersey: 'gc', delegated: false, from: FROM }, N)).toBe(
      'Leader, general classification',
    )
    expect(cardCaption({ kind: 'leader', jersey: 'kom', delegated: false, from: FROM }, N)).toBe(
      'Leader, mountains classification',
    )
    expect(
      cardCaption({ kind: 'leader', jersey: 'points', delegated: true, from: FROM }, N),
    ).toBeNull()
    expect(cardCaption({ kind: 'champion', title: title() }, N)).toBe('Champion of Italy')
    expect(cardCaption({ kind: 'team' }, N)).toBeNull()
  })

  it('las líneas: wears_for, leads, champion, gc y stage_wins', () => {
    const lines: Distinction[] = [
      { kind: 'wears_for', jersey: 'points', rank: 2, from: FROM },
      { kind: 'wears_for', jersey: 'kom', rank: 3, from: FROM },
      { kind: 'leads', jersey: 'points', from: FROM },
      { kind: 'leads', jersey: 'kom', from: FROM },
      { kind: 'champion', title: title({ discipline: 'itt' }) },
      { kind: 'gc', rank: 14, deficitS: 242, from: FROM },
      { kind: 'gc', rank: 2, deficitS: 0, from: FROM },
      { kind: 'stage_wins', stages: [{ raceKey: 'race-france:s0', stageDay: 3 }] },
      {
        kind: 'stage_wins',
        stages: [3, 7].map((stageDay) => ({ raceKey: 'race-france:s0', stageDay })),
      },
      {
        kind: 'stage_wins',
        stages: [3, 7, 12].map((stageDay) => ({ raceKey: 'race-france:s0', stageDay })),
      },
    ]
    expect(lines.map((d) => cardLineText(d, N))).toEqual([
      'Points jersey (2nd in the classification)',
      'Mountains jersey (3rd in the classification)',
      'Also leads the points classification',
      'Also leads the mountains',
      'Time trial champion of Italy',
      '14th overall +4:02',
      '2nd overall +0:00',
      'Won stage 3',
      'Won stages 3 and 7',
      'Won stages 3, 7 and 12',
    ])
  })

  it('los títulos: nacionales de las dos disciplinas y categorías, y los del mundo', () => {
    expect(championTitleText('en', title(), N)).toBe('Champion of Italy')
    expect(championTitleText('en', title({ discipline: 'itt' }), N)).toBe(
      'Time trial champion of Italy',
    )
    expect(championTitleText('en', title({ category: 'u23' }), N)).toBe('U23 champion of Italy')
    expect(championTitleText('en', title({ category: 'u23', discipline: 'itt' }), N)).toBe(
      'U23 time trial champion of Italy',
    )
    expect(championTitleText('en', title({ scope: 'world', country: null }), N)).toBe(
      'World champion',
    )
    expect(
      championTitleText('en', title({ scope: 'world', country: null, discipline: 'itt' }), N),
    ).toBe('World time trial champion')
  })

  it('los ocho países con artículo (7-d): una lista cerrada, y cada nombre existe en COUNTRIES', () => {
    expect([...WITH_THE].sort()).toEqual([
      'Cayman Islands',
      'Dominican Republic',
      'Netherlands',
      'Philippines',
      'Seychelles',
      'United Arab Emirates',
      'United Kingdom',
      'United States',
    ])
    const names = new Set(COUNTRIES.map((c) => c.name))
    for (const name of WITH_THE) expect(names.has(name), name).toBe(true)
    expect(championTitleText('en', title({ country: 'NL' }), N)).toBe('Champion of the Netherlands')
    expect(
      championTitleText('en', title({ country: 'NL', category: 'u23', discipline: 'itt' }), N),
    ).toBe('U23 time trial champion of the Netherlands')
    expect(championTitleText('en', title({ country: 'GB' }), N)).toBe(
      'Champion of the United Kingdom',
    )
    expect(championTitleText('en', title({ country: 'ES' }), N)).toBe('Champion of Spain')
  })
})
