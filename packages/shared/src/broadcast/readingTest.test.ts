import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import type { PullMotive } from '../contracts.js'
import type { ChampionTitle, JerseyKind, RiderCard, WornJersey } from '../jerseys.js'
import { riderCardsOf, startStateOf } from './cards.js'
import { decodeTimeline } from './codec.js'
import { BROADCAST } from './constants.js'
import { cutTimeline } from './cut.js'
import {
  type GroupLabel,
  type GroupNow,
  type GroupRole,
  type InstantContext,
  instantAt,
  packOf,
  photoBlocksOf,
} from './instant.js'
import { groupLabelText, pullingLineOf } from './names.js'
import {
  READING_DRAW,
  type ReadingStageCandidate,
  barLabelText,
  breakawayKmsOf,
  drawBreakawayPoint,
  drawReadingPoints,
  mainGapText,
  pickReadingStages,
  pullingText,
  readingCrossings,
  readingScreenOf,
  readingTruthsOf,
  toGoText,
  versusText,
  wornText,
} from './readingTest.js'
import type { GroupDetail, RiderIx, StageTimeline } from './timeline.js'

/**
 * LA PRUEBA DE LECTURA (E2, docs/retransmision.md §16.5; D-60, 16-i, 16-w; paso 10b, adelantado): el
 * sorteo de los puntos (punto 4) y del punto de la fuga (punto 6), la elección de las tres etapas
 * (punto 3) y la verdad de cada punto (punto 7), la que imprime `scripts/pl-truth.mjs`. La verdad se
 * compara con lo que pintan la capa fija y la barra en ese instante, calculado como lo calcula la web
 * (`StageWatch.tsx`: el contexto de la cabecera y la línea servida hasta esa hora, que es la cortada,
 * B9) y con las funciones de `shared` que leen sus componentes (`instantAt`, `pullingLineOf`,
 * `groupLabelText`), no con cifras a mano. Sobre las cinco congeladas en línea.
 */

// ------------------------------------------------------------------------------ el sorteo

/** Los km de un sorteo cumplen el punto 4 de §16.5. */
function expectValidDraw(points: readonly number[], lengthKm: number, n: number): void {
  const { edgeKm, minApartKm, finaleKm } = READING_DRAW
  expect(points).toHaveLength(n)
  for (const km of points) {
    expect(Number.isInteger(km)).toBe(true)
    expect(km).toBeGreaterThanOrEqual(edgeKm)
    expect(km).toBeLessThanOrEqual(lengthKm - edgeKm + 1e-9)
  }
  // de mayor a menor: el orden en que la capa fija llega a ellos
  expect([...points].sort((a, b) => b - a)).toEqual(points)
  for (let i = 1; i < points.length; i++)
    expect(points[i - 1]! - points[i]!).toBeGreaterThanOrEqual(minApartKm)
  expect(Math.min(...points)).toBeLessThanOrEqual(finaleKm)
}

describe('drawReadingPoints · los tres km a meta de cada etapa (§16.5, punto 4)', () => {
  // las de las congeladas (con su coma flotante) y las de los bordes: 50 km es la más corta en que caben
  const LENGTHS = [
    50, 56, 60, 87.3, 120, 171.00000000000003, 174.99999999999997, 185, 232, 278.21, 320,
  ]

  it('en muchas semillas: enteros entre 5 y lengthKm − 5, separados al menos 20 y uno en los últimos 30', () => {
    for (const lengthKm of LENGTHS)
      for (let s = 0; s < 400; s++)
        expectValidDraw(drawReadingPoints(String(s), lengthKm), lengthKm, READING_DRAW.points)
  })

  it('la coma flotante de la longitud no quita el último km: en 174,99999999999997 cabe el 170', () => {
    const top = new Set<number>()
    for (let s = 0; s < 2000; s++) top.add(drawReadingPoints(`t${s}`, 174.99999999999997)[0]!)
    expect(top.has(170)).toBe(true)
    expect(Math.max(...top)).toBe(170)
  })

  it('determinista: la misma semilla da los mismos km; semillas distintas, conjuntos distintos', () => {
    for (let s = 0; s < 50; s++)
      expect(drawReadingPoints(`semilla-${s}`, 185)).toEqual(drawReadingPoints(`semilla-${s}`, 185))
    const seen = new Set<string>()
    for (let s = 0; s < 300; s++) seen.add(drawReadingPoints(`semilla-${s}`, 185).join(','))
    expect(seen.size).toBeGreaterThan(280)
  })

  it('uniforme entre todos los conjuntos que cumplen: en 56 km son 84, y salen todos por igual', () => {
    // a mano: el menor, entre 5 y 11 (el de los últimos 30); el de en medio, 20 más arriba; el mayor, hasta 51
    const all = new Set<string>()
    for (let a = 5; a <= 30; a++)
      for (let b = a + 20; b <= 51; b++)
        for (let c = b + 20; c <= 51; c++) all.add([c, b, a].join(','))
    expect(all.size).toBe(84)
    const counts = new Map<string, number>()
    const draws = 84 * 200
    for (let s = 0; s < draws; s++) {
      const key = drawReadingPoints(String(s), 56).join(',')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(new Set(counts.keys())).toEqual(all)
    // 200 de media por conjunto: de 120 a 280 es más de cinco desviaciones a cada lado
    for (const n of counts.values()) {
      expect(n).toBeGreaterThan(120)
      expect(n).toBeLessThan(280)
    }
  })

  it('en la más corta en que caben, solo uno; si no caben, RangeError', () => {
    expect(drawReadingPoints('x', 50)).toEqual([45, 25, 5])
    expect(() => drawReadingPoints('x', 49.9)).toThrow(RangeError)
    expect(() => drawReadingPoints('x', 12)).toThrow(RangeError)
    expect(() => drawReadingPoints('x', Number.NaN)).toThrow(RangeError)
    expect(() => drawReadingPoints('x', 185, 0)).toThrow(RangeError)
  })

  it('con otro número de puntos, las mismas reglas: uno solo va a los últimos 30 km', () => {
    for (let s = 0; s < 200; s++) {
      expectValidDraw(drawReadingPoints(String(s), 185, 1), 185, 1)
      expectValidDraw(drawReadingPoints(String(s), 185, 4), 185, 4)
    }
  })
})

describe('drawBreakawayPoint · el punto de la fuga (§16.5, punto 6)', () => {
  const kms = [
    { stage: 'llana', km: 61 },
    { stage: 'llana', km: 60 },
    { stage: 'reina', km: 140 },
  ]

  it('sin km con fuga, ninguno', () => {
    expect(drawBreakawayPoint('7', [])).toBeNull()
  })

  it('uno de los candidatos, el mismo con la misma semilla, y todos salen', () => {
    const got = new Map<number, number>()
    for (let s = 0; s < 600; s++) {
      const p = drawBreakawayPoint(String(s), kms)
      expect(p).toBe(drawBreakawayPoint(String(s), kms))
      expect(kms).toContain(p)
      got.set(kms.indexOf(p!), (got.get(kms.indexOf(p!)) ?? 0) + 1)
    }
    for (const i of [0, 1, 2]) expect(got.get(i)).toBeGreaterThan(150)
  })
})

// --------------------------------------------------------------------- las tres etapas

describe('pickReadingStages · la llana, la reina y la clásica más recientes con línea (§16.5, punto 3)', () => {
  const stage = (
    raceKey: string,
    day: number,
    gameDay: number,
    kind: ReadingStageCandidate['kind'],
    more: Partial<ReadingStageCandidate> = {},
  ): ReadingStageCandidate => ({
    raceKey,
    day,
    gameDay,
    kind,
    timeTrial: kind === 'cri',
    oneDay: false,
    lengthKm: 180,
    ...more,
  })

  it('la más reciente de cada tipo, por día de juego; sin cronos ni etapas de otro tipo', () => {
    const got = pickReadingStages([
      stage('race-france:s0', 5, 186, 'llana'),
      stage('race-france:s0', 7, 188, 'llana'),
      stage('race-france:s0', 6, 187, 'reina'),
      stage('race-france:s0', 8, 189, 'media'),
      stage('race-france:s0', 9, 190, 'cri'),
      stage('race-flanders:s0', 1, 95, 'clasica', { oneDay: true, lengthKm: 278 }),
      stage('race-sanremo:s0', 1, 80, 'clasica', { oneDay: true, lengthKm: 290 }),
      // una llana que es crono por equipos no vale para Watch en línea
      stage('race-tachira:s0', 1, 200, 'llana', { timeTrial: true }),
    ])
    expect(got.llana).toMatchObject({ raceKey: 'race-france:s0', day: 7 })
    expect(got.reina).toMatchObject({ raceKey: 'race-france:s0', day: 6 })
    expect(got.clasica).toMatchObject({ raceKey: 'race-flanders:s0', day: 1 })
    expect(got.clasicaFallback).toBe(false)
  })

  it('a igual día de juego, por la clave de carrera: el resultado no depende del orden de la lista', () => {
    const a = stage('race-b:s0', 3, 120, 'reina')
    const b = stage('race-a:s0', 4, 120, 'reina')
    expect(pickReadingStages([a, b]).reina).toBe(b)
    expect(pickReadingStages([b, a]).reina).toBe(b)
  })

  it('sin clásica con línea, la carrera de un día más larga que la tenga (no una crono, ni una ya elegida)', () => {
    const got = pickReadingStages([
      stage('race-france:s0', 7, 188, 'llana'),
      stage('race-france:s0', 6, 187, 'reina'),
      stage('nc-es-road:s0', 1, 170, 'media', { oneDay: true, lengthKm: 190 }),
      stage('nc-it-road:s0', 1, 171, 'media', { oneDay: true, lengthKm: 220 }),
      stage('nc-it-itt:s0', 1, 169, 'cri', { oneDay: true, lengthKm: 400 }),
      // la llana más reciente es de un día y es la más larga: ya es la llana, no se repite
      stage('race-gp:s0', 1, 199, 'llana', { oneDay: true, lengthKm: 260 }),
    ])
    expect(got.llana).toMatchObject({ raceKey: 'race-gp:s0' })
    expect(got.clasica).toMatchObject({ raceKey: 'nc-it-road:s0' })
    expect(got.clasicaFallback).toBe(true)
  })

  it('lo que no hay, null', () => {
    const got = pickReadingStages([stage('race-france:s0', 6, 187, 'reina')])
    expect(got.reina).toMatchObject({ raceKey: 'race-france:s0', day: 6 })
    expect([got.llana, got.clasica, got.clasicaFallback]).toEqual([null, null, false])
    expect(pickReadingStages([])).toEqual({
      llana: null,
      reina: null,
      clasica: null,
      clasicaFallback: false,
    })
  })
})

// ------------------------------------------------------------ las palabras de la pantalla

const ITALY: ChampionTitle = {
  scope: 'national',
  country: 'IT',
  discipline: 'road',
  category: 'elite',
  season: 0,
  validFromDay: 170,
  validToDay: 534,
  source: { raceKey: 'nc-it-road:s0', stageDay: 1 },
  provisional: true,
}

/** Una carta de prueba: `Rider <ix>` con el dorsal ix + 1, en el equipo `team`. */
function card(ix: RiderIx, team: number | null, worn: WornJersey = { kind: 'team' }): RiderCard {
  return {
    ix,
    id: `r${ix}`,
    name: `Rider ${ix}`,
    bib: ix + 1,
    country: 'ES',
    gender: 'M',
    team: team === null ? null : { id: `t${team}`, name: `Team ${team}`, jerseySeed: `j${team}` },
    worn,
    lines: [],
    notoriety: 8,
    own: false,
  }
}

/** Un grupo del instante, con lo que leen las palabras. */
function groupNow(
  members: readonly RiderIx[],
  role: GroupRole,
  label: GroupLabel,
  jerseys: readonly JerseyKind[] = [],
): GroupNow {
  return {
    g: 1,
    number: 2,
    role,
    label,
    kind: 'peloton',
    km: 40,
    size: members.length,
    members,
    gap: { toHeadS: 60, toAheadS: 60, atKm: 39.95, trend: null },
    detail: null,
    jerseys,
    own: false,
  }
}

describe('las palabras de la pantalla, como las escribe la web (screen.ts y los iconos de la barra)', () => {
  it('los km a meta de la capa fija: un decimal, metros en el último km y vueltas en un circuito', () => {
    expect(toGoText(98.5, null)).toBe('98.5 km to go')
    expect(toGoText(0.856, null)).toBe('850 m to go')
    expect(toGoText(0.0004, null)).toBe('0 m to go')
    expect(toGoText(0, null)).toBe('0 m to go')
    expect(toGoText(0.9999, null)).toBe('990 m to go')
    expect(toGoText(1, null)).toBe('1.0 km to go')
    expect(toGoText(42.5, 3)).toBe('3 laps to go · 42.5 km')
    expect(toGoText(8.2, 1)).toBe('Last lap · 8.2 km to go')
  })

  it('la diferencia principal: +3:46, s.t. por debajo de sameTimeS, y las horas', () => {
    expect(mainGapText(226)).toBe('+3:46')
    expect(mainGapText(BROADCAST.sameTimeS - 1)).toBe('s.t.')
    expect(mainGapText(BROADCAST.sameTimeS)).toBe('+0:05')
    expect(mainGapText(3730)).toBe('+1:02:10')
  })

  it('contra quién, con la palabra de voz del grupo: on the bunch, por sus nombres o por el maillot', () => {
    const cards = [card(0, 0), card(1, 1), card(2, 2)]
    expect(versusText(groupNow([0, 1, 2, 3], 'bunch', { k: 'role' }), cards)).toBe('on the bunch')
    expect(versusText(groupNow([0, 1], 'chase', { k: 'names', riders: [0, 1] }), cards)).toBe(
      'on Rider 0 and Rider 1',
    )
    expect(
      versusText(groupNow([0, 1, 2, 3], 'chase', { k: 'jersey_group', jersey: 'gc' }), cards),
    ).toBe('on the race leader’s group')
  })

  it('la fila de la barra: los nombres con su punto, o la palabra con el tamaño', () => {
    const cards = [card(0, 0), card(1, 1), card(2, 2)]
    expect(
      barLabelText(groupNow([0, 1, 2], 'lead', { k: 'names', riders: [0, 1, 2] }), cards),
    ).toBe('Rider 0 · Rider 1 · Rider 2')
    const seven = [0, 1, 2, 3, 4, 5, 6]
    expect(barLabelText(groupNow(seven, 'lead', { k: 'role' }), cards)).toBe('Lead group · 7')
    expect(barLabelText(groupNow(seven, 'bunch', { k: 'together' }), cards)).toBe(
      'Bunch together · 7',
    )
  })

  it('el maillot de cada uno, con las palabras de su icono', () => {
    const leader = card(0, 0, {
      kind: 'leader',
      jersey: 'gc',
      delegated: false,
      from: ITALY.source,
    })
    const points = card(1, 0, {
      kind: 'leader',
      jersey: 'points',
      delegated: true,
      from: ITALY.source,
    })
    expect(wornText(leader)).toBe('Race leader')
    expect(wornText(points)).toBe('Points leader')
    expect(wornText(card(2, 1, { kind: 'champion', title: ITALY }))).toBe('Champion of Italy')
    expect(wornText(card(3, 1))).toBe('Team jersey')
  })

  it('quién tira: la fuga que colabora, y cada equipo con su porqué y +N teams', () => {
    const cards = Array.from({ length: 12 }, (_, r) => card(r, r < 3 ? r : Math.floor(r / 3)))
    const detail = (
      pullers: { rider: RiderIx; motive: PullMotive | null; forRider: RiderIx | null }[],
      pullingTotal = pullers.length,
    ): GroupDetail => ({ g: 1, speedKmh: 44, pullingTotal, pullers, mishap: null })
    const line = (members: readonly RiderIx[], d: GroupDetail) => pullingLineOf(d, members, cards)!
    const all3 = detail([0, 1, 2].map((r) => ({ rider: r, motive: 'fuga', forRider: null })))
    expect(pullingText(line([0, 1, 2], all3), cards)).toBe('Pulling: all 3 in turn')
    const both = detail([0, 1].map((r) => ({ rider: r, motive: 'fuga', forRider: null })))
    expect(pullingText(line([0, 1], both), cards)).toBe('Pulling: both in turn')
    // cinco de tres equipos, y cuatro en el turno: todos sus equipos relevan, pero no todos ellos
    const four = detail([0, 1, 2, 3].map((r) => ({ rider: r, motive: 'fuga', forRider: null })))
    expect(pullingText(line([0, 1, 2, 3, 4], four), cards)).toBe('Pulling: 4 of 5 in turn')
    // el pelotón: dos del equipo 1 persiguen, dos del 2 tiran para el 6, y uno del 3 por su papel
    const pack = detail([
      { rider: 3, motive: 'persecucion', forRider: null },
      { rider: 4, motive: 'persecucion', forRider: null },
      { rider: 6, motive: 'equipo_etapa', forRider: 6 },
      { rider: 7, motive: 'equipo_etapa', forRider: 6 },
      { rider: 9, motive: 'rol', forRider: null },
    ])
    const members = Array.from({ length: 12 }, (_, r) => r)
    expect(pullingText(line(members, pack), cards)).toBe(
      'Pulling: Team 1 (chasing), Team 2 (for 7 Rider 6) +1 team',
    )
    // en el móvil, un equipo y el resto contado
    expect(pullingText(line(members, pack), cards, true)).toBe('Pulling: Team 1 (chasing) +2 teams')
    // un corredor sin equipo es su propio «equipo», por su nombre; sin motivo, sin paréntesis
    const solo = [...cards.slice(0, 11), card(11, null)]
    const alone = pullingLineOf(
      detail([{ rider: 11, motive: null, forRider: null }]),
      members,
      solo,
    )!
    expect(pullingText(alone, solo)).toBe('Pulling: Rider 11')
  })
})

// ------------------------------------------------------------- la verdad, sobre las congeladas

const ROAD = [
  'race-france-e7',
  'race-france-e18',
  'race-france-e20',
  'race-flanders-e1',
  'race-colombia-e5',
] as const

/** La línea grabada de una congelada, decodificada como la lee `readStageTimeline`. */
function frozen(name: (typeof ROAD)[number]): StageTimeline {
  const url = new URL(
    `../../../../apps/api/src/__fixtures__/broadcast/${name}.timeline.gz`,
    import.meta.url,
  )
  return decodeTimeline(JSON.parse(gunzipSync(readFileSync(url)).toString('utf8')))
}

/** Los nombres de la ruta: el corredor por su dorsal y el equipo por su orden en el reparto. */
function namesOf(tl: StageTimeline) {
  const bib = new Map(tl.cast.riders.map((c) => [c.riderId, c.bib] as const))
  const team = new Map(tl.cast.teams.map((t, i) => [t.teamId, i + 1] as const))
  return {
    rider: (id: string) => `Rider ${bib.get(id) ?? '?'}`,
    team: (id: string) => `Team ${team.get(id) ?? '?'}`,
  }
}

/** El contexto con que pinta la web (`StageWatch.tsx`), sobre la cabecera que arma la ruta. */
function screenCtxOf(tl: StageTimeline): InstantContext {
  return {
    own: new Set(),
    start: startStateOf(tl.cast, tl.riderIds.length),
    photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
  }
}

/** Los km de cada congelada: cada 25 km y los de dos sorteos. */
function kmsOf(tl: StageTimeline): number[] {
  const out = new Set<number>()
  for (let km = READING_DRAW.edgeKm; km <= tl.lengthKm - READING_DRAW.edgeKm; km += 25) out.add(km)
  for (const seed of ['a', 'b']) for (const km of drawReadingPoints(seed, tl.lengthKm)) out.add(km)
  return [...out].sort((a, b) => b - a)
}

describe('readingCrossings · cuándo llega la capa fija al km a meta del punto (§16.5, punto 5)', () => {
  it('la primera décima del primer segundo entero en que toGoKm ≤ km, en una pasada para todos los km', () => {
    const tl = frozen('race-france-e7')
    const screen = readingScreenOf(tl, namesOf(tl))
    const ctx = screenCtxOf(tl)
    const kms = [175, 170, 150.5, 120, 88, 42, 30.25, 5, 0.06, 0.01]
    const ts = readingCrossings(tl, screen, kms)
    // a mano: la capa fija en cada segundo entero, de la salida a la meta
    const perSecond: number[] = []
    for (let s = 0; s <= Math.ceil(tl.finish.finishS); s++)
      perSecond.push(instantAt(tl, s, ctx).toGoKm)
    kms.forEach((km, i) => {
      const first = perSecond.findIndex((x) => x <= km)
      const t = ts[i]
      if (first < 0) {
        expect(t, `${km}`).toBeNull()
        return
      }
      expect(t, `${km}`).not.toBeNull()
      // en décimas: dentro del segundo en que llega, y la décima de antes aún no había llegado
      const ds = Math.round(t! * 10)
      expect(ds / 10, `${km}`).toBe(t)
      expect(ds, `${km}`).toBeGreaterThan((first - 1) * 10)
      expect(ds, `${km}`).toBeLessThanOrEqual(first * 10)
      expect(instantAt(tl, ds / 10, ctx).toGoKm, `${km}`).toBeLessThanOrEqual(km)
      if (ds - 1 >= 0 && ds - 1 > (first - 1) * 10)
        expect(instantAt(tl, (ds - 1) / 10, ctx).toGoKm, `${km}`).toBeGreaterThan(km)
    })
    // la salida ya está a lengthKm; la meta pinta la cabeza a medio bloque de la línea
    expect(ts[0]).toBe(0)
    expect(ts.at(-2)).not.toBeNull()
    expect(ts.at(-1)).toBeNull()
  })
})

describe('readingTruthsOf · la verdad de un punto es lo que pintan la capa fija y la barra (§16.5, punto 7)', () => {
  it('en las cinco congeladas: el grupo 1 con su maillot, la diferencia y su referencia, los km a meta y quién tira detrás', () => {
    const seen = {
      points: 0,
      breakaway: 0,
      byNames: 0,
      wholeGroup: 0,
      notTeamJersey: 0,
      versusBunch: 0,
      pullingTeams: 0,
      pullingWhy: 0,
    }
    for (const name of ROAD) {
      const tl = frozen(name)
      const names = namesOf(tl)
      const screen = readingScreenOf(tl, names)
      const kms = kmsOf(tl)
      const truths = readingTruthsOf(tl, screen, kms)
      // la cabecera como la arma la ruta: las cartas servidas (riderCardsOf, sin velo ni corredores
      // propios) y el contexto con que pinta la web (StageWatch.tsx)
      const cards = riderCardsOf(tl.cast, names, new Set(), 'elite')
      const nameOf = (r: RiderIx): string => cards[r]!.name
      const ctx = screenCtxOf(tl)
      kms.forEach((km, i) => {
        const truth = truths[i]
        expect(truth, `${name} ${km}`).not.toBeNull()
        if (truth === null || truth === undefined) return
        const at = `${name} km ${km} (t ${truth.t})`
        expect(truth.kmToGo).toBe(km)
        expect(truth.cards).toEqual(cards)
        // la pantalla en esa hora: la línea servida hasta ella (B9) y el contexto de la cabecera
        const shown = instantAt(cutTimeline(tl, truth.t), truth.t, ctx)
        // la capa fija: los km a meta, la diferencia, su flecha y contra quién
        expect(truth.instant.toGoKm, at).toBe(shown.toGoKm)
        expect(truth.instant.toGoKm, at).toBeLessThanOrEqual(km)
        expect(toGoText(truth.instant.toGoKm, truth.instant.lapsToGo), at).toBe(
          toGoText(shown.toGoKm, shown.lapsToGo),
        )
        expect(truth.instant.mainGap, at).toEqual(shown.mainGap)
        const behind = shown.groups.find((g) => g.g === shown.mainGap?.behind) ?? null
        expect(truth.behind?.g ?? null, at).toBe(behind?.g ?? null)
        if (behind !== null) {
          expect(versusText(truth.behind!, cards), at).toBe(
            `on ${groupLabelText('en', behind.label, behind.role, 'voice', nameOf)}`,
          )
          if (shown.mainGap!.ref === 'bunch') seen.versusBunch++
        }
        // la barra: las filas con alguien dentro, renumeradas, y la 1 es quien va delante
        const bar = shown.groups.filter((g) => g.size > 0)
        expect(
          truth.bar.map((g) => [g.g, g.number, g.size]),
          at,
        ).toEqual(bar.map((g, j) => [g.g, j + 1, g.size]))
        const front = bar[0]!
        expect(truth.front.g, at).toBe(front.g)
        expect(truth.front.number, at).toBe(1)
        expect(truth.front.members, at).toEqual(front.members)
        expect(truth.front.label, at).toEqual(front.label)
        const word = groupLabelText('en', front.label, front.role, 'bar', nameOf)
        expect(barLabelText(truth.front, cards), at).toBe(
          front.label.k === 'names' ? word : `${word} · ${front.size}`,
        )
        if (front.label.k === 'names') seen.byNames++
        // los de delante, por dorsal, con su carta servida: el maillot que llevan es su `worn` (§4.8)
        expect(
          truth.frontCards.map((c) => [c.ix, c.worn]),
          at,
        ).toEqual(front.members.map((r) => [r, cards[r]!.worn]))
        // la fuga de hasta 12 por delante del pelotón, la de las dos preguntas más (punto 6, 16-w)
        const pack = packOf(bar)
        const breakaway =
          pack !== null && pack.g !== front.g && front.size <= BROADCAST.nameWholeGroupUpTo
        expect(truth.breakaway, at).toBe(breakaway)
        if (breakaway) {
          seen.breakaway++
          if (front.size > BROADCAST.byNamesUpTo) seen.wholeGroup++
          if (front.members.some((r) => cards[r]!.worn.kind !== 'team')) seen.notTeamJersey++
          // con la fuga delante, el que persigue es el pelotón, que es contra quien mide la capa fija
          expect(shown.mainGap?.ref, at).toBe('bunch')
          expect(truth.behind?.g, at).toBe(pack!.g)
        }
        // quién tira detrás: la línea `Pulling:` del grupo de la diferencia principal
        const pulling = behind === null ? null : pullingLineOf(behind.detail, behind.members, cards)
        expect(truth.pulling, at).toEqual(pulling)
        if (pulling?.k === 'teams') {
          seen.pullingTeams++
          if (pulling.teams.some((x) => x.motive !== null || x.forRider !== null)) seen.pullingWhy++
        }
        seen.points++
      })
    }
    // no vacío: la verdad pasa por todos los casos que la prueba pregunta
    expect(seen.points).toBeGreaterThan(40)
    expect(seen.breakaway).toBeGreaterThan(10)
    expect(seen.byNames).toBeGreaterThan(0)
    expect(seen.wholeGroup).toBeGreaterThan(0)
    expect(seen.notTeamJersey).toBeGreaterThan(0)
    expect(seen.versusBunch).toBeGreaterThan(10)
    expect(seen.pullingTeams).toBeGreaterThan(10)
    expect(seen.pullingWhy).toBeGreaterThan(10)
  })

  it('un km al que la cabeza no llega no tiene verdad; uno por encima de la salida, la de la salida', () => {
    const tl = frozen('race-france-e7')
    const screen = readingScreenOf(tl, namesOf(tl))
    const [start, never] = readingTruthsOf(tl, screen, [tl.lengthKm + 10, 0])
    expect(never).toBeNull()
    expect(start?.t).toBe(0)
    expect(start?.instant.mainGap).toBeNull()
    expect(start?.front.size).toBe(tl.riderIds.length)
    expect(start?.behind).toBeNull()
    expect(start?.pulling).toBeNull()
    expect(start?.breakaway).toBe(false)
  })
})

describe('breakawayKmsOf · los km en que hay una fuga de hasta 12 por delante del pelotón (§16.5, punto 6)', () => {
  it('son los km enteros del sorteo en que la verdad dice fuga, de mayor a menor', () => {
    const tl = frozen('race-france-e18')
    const screen = readingScreenOf(tl, namesOf(tl))
    const kms = breakawayKmsOf(tl, screen)
    const all: number[] = []
    for (let km = Math.floor(tl.lengthKm - READING_DRAW.edgeKm); km >= READING_DRAW.edgeKm; km--)
      all.push(km)
    const truths = readingTruthsOf(tl, screen, all)
    expect(kms).toEqual(all.filter((_, i) => truths[i]?.breakaway === true))
    // no vacío, y no todo: la reina tiene fuga buena parte de la etapa
    expect(kms.length).toBeGreaterThan(20)
    expect(kms.length).toBeLessThan(all.length)
  })
})
