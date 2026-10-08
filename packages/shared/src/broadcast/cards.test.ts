import { describe, expect, it } from 'vitest'
import type { ChampionTitle, Distinction } from '../jerseys.js'
import { riderCardsOf, startStateOf } from './cards.js'
import { BROADCAST } from './constants.js'
import type { CastRider, StageRef, TimelineCast } from './timeline.js'

/**
 * LAS CARTAS SERVIDAS Y LA SALIDA (E2, docs/retransmision.md §4.11, §7.5 y §7.8; paso 6b): lo que la
 * cabecera sirve del reparto congelado, con las líneas cortadas a `cardLinesMax` DESPUÉS del velo y la
 * notoriedad calculada con lo que queda, y los maillots y la general con que se sale.
 */

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

const rider = (r: number, over: Partial<CastRider> = {}): CastRider => ({
  rider: r,
  riderId: `id-${r}`,
  bib: r + 1,
  team: r % 2,
  country: 'FR',
  gender: 'M',
  start: { gcRank: null, gcDeficitS: null, from: null },
  worn: { kind: 'team' },
  distinctions: [],
  knownWins: 0,
  ...over,
})

const gcLine = (rank: number, deficitS: number): Distinction => ({
  kind: 'gc',
  rank,
  deficitS,
  from: FROM,
})

const CAST: TimelineCast = {
  riders: [
    rider(0, {
      worn: { kind: 'leader', jersey: 'gc', delegated: false, from: FROM },
      start: { gcRank: 1, gcDeficitS: 0, from: FROM },
      distinctions: [{ kind: 'leads', jersey: 'kom', from: FROM }],
    }),
    rider(1, {
      worn: { kind: 'leader', jersey: 'kom', delegated: true, from: FROM },
      start: { gcRank: 4, gcDeficitS: 75, from: FROM },
      distinctions: [{ kind: 'wears_for', jersey: 'kom', rank: 2, from: FROM }, gcLine(4, 75)],
    }),
    rider(2, { worn: { kind: 'champion', title: title() } }),
    rider(3, {
      team: null,
      start: { gcRank: 14, gcDeficitS: 242, from: FROM },
      distinctions: [
        { kind: 'champion', title: title({ category: 'u23' }) },
        { kind: 'champion', title: title({ discipline: 'itt' }) },
        gcLine(14, 242),
        { kind: 'stage_wins', stages: [{ raceKey: 'race-france:s0', stageDay: 3 }] },
      ],
    }),
    rider(4, { knownWins: BROADCAST.knownNameMinWins }),
    rider(5, { start: { gcRank: 11, gcDeficitS: 200, from: FROM } }),
  ],
  teams: [
    { teamId: 'alpha', jerseySeed: 'j-alpha' },
    { teamId: 'beta', jerseySeed: 'j-beta' },
  ],
  favourites: [],
}
const NAMES = { rider: (id: string) => `Name ${id}`, team: (id: string) => `Team ${id}` }

describe('riderCardsOf · el reparto servido (§7.8)', () => {
  const cards = riderCardsOf(CAST, NAMES, new Set([4]), 'elite')

  it('por RiderIx, con los nombres de hoy y el equipo y la equipación del día', () => {
    expect(cards.map((c) => [c.ix, c.id, c.name, c.bib, c.own])).toEqual([
      [0, 'id-0', 'Name id-0', 1, false],
      [1, 'id-1', 'Name id-1', 2, false],
      [2, 'id-2', 'Name id-2', 3, false],
      [3, 'id-3', 'Name id-3', 4, false],
      [4, 'id-4', 'Name id-4', 5, true],
      [5, 'id-5', 'Name id-5', 6, false],
    ])
    expect(cards[0]!.team).toEqual({ id: 'alpha', name: 'Team alpha', jerseySeed: 'j-alpha' })
    expect(cards[1]!.team).toEqual({ id: 'beta', name: 'Team beta', jerseySeed: 'j-beta' })
    expect(cards[3]!.team).toBeNull()
    expect(cards[2]!.worn).toEqual({ kind: 'champion', title: title() })
  })

  it(`las líneas, cortadas a cardLinesMax (${BROADCAST.cardLinesMax}) en el orden en que vienen`, () => {
    expect(cards[3]!.lines).toHaveLength(BROADCAST.cardLinesMax)
    expect(cards[3]!.lines.map((d) => d.kind)).toEqual(['champion', 'champion', 'gc'])
    expect(cards[1]!.lines).toEqual(CAST.riders[1]!.distinctions)
  })

  it('la notoriedad de §7.5 con lo que queda tras el corte: la etapa ganada que no cabe no sube a nadie', () => {
    // 0 el líder; 3 el delegado; 4 el campeón de la categoría del día; el 14.º con dos títulos que no
    // son de élite en ruta (un sub-23 y uno de crono que sí es élite: 4); 7 un nombre conocido; 8 el resto
    expect(cards.map((c) => c.notoriety)).toEqual([0, 3, 4, 4, 7, 8])
    const onlyU23: TimelineCast = {
      ...CAST,
      riders: [
        rider(0, {
          distinctions: [
            { kind: 'champion', title: title({ category: 'u23' }) },
            gcLine(14, 242),
            gcLine(14, 242),
            { kind: 'stage_wins', stages: [{ raceKey: 'race-france:s0', stageDay: 3 }] },
          ],
        }),
      ],
    }
    // la línea de la etapa ganada (nivel 6) es la cuarta: el corte la deja fuera y no cuenta
    expect(riderCardsOf(onlyU23, NAMES, new Set(), 'elite')[0]!.notoriety).toBe(8)
    expect(riderCardsOf(onlyU23, NAMES, new Set(), 'u23')[0]!.notoriety).toBe(4)
  })
})

describe('startStateOf · la salida (§4.11)', () => {
  it('quién lleva cada maillot (delegado o no), los virtualGcTop primeros de la general y cuántos salen', () => {
    expect(startStateOf(CAST, 176)).toEqual({
      leaders: { gc: 0, points: null, kom: 1 },
      gcTop: [
        { rider: 0, rank: 1, gapS: 0 },
        { rider: 1, rank: 4, gapS: 75 },
      ],
      racingAtStart: 176,
    })
  })

  it('el primer día, nadie lleva nada ni sale con general', () => {
    const first: TimelineCast = { ...CAST, riders: [rider(0), rider(1)] }
    expect(startStateOf(first, 2)).toEqual({
      leaders: { gc: null, points: null, kom: null },
      gcTop: [],
      racingAtStart: 2,
    })
  })
})
