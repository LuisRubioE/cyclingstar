import { describe, expect, it } from 'vitest'
import type { NewsItem } from '@cyclingstar/shared'
import { NO_FILTER, groupByGameDay, matchesFilter, raceOfHeadline } from './newsFeed'

const RACES = [
  { id: 'race-france', name: 'Race France' },
  { id: 'volta', name: 'Volta' },
  { id: 'race', name: 'Race' },
]

function item(partial: Partial<NewsItem>): NewsItem {
  return {
    gameDay: 10,
    kind: 'stage_win',
    text: 'Someone wins.',
    personal: false,
    riderId: null,
    riderName: null,
    country: null,
    teamId: null,
    teamName: null,
    ...partial,
  }
}

describe('raceOfHeadline', () => {
  it('reconoce la carrera por su nombre dentro del titular', () => {
    expect(raceOfHeadline('Ana Ruiz wins the Volta overall.', RACES)).toBe('volta')
  })

  it('prefiere el nombre más largo cuando uno contiene al otro', () => {
    expect(raceOfHeadline('Ana Ruiz wins stage 3 of the Race France.', RACES)).toBe('race-france')
  })

  it('devuelve null si el titular no habla de ninguna carrera', () => {
    expect(raceOfHeadline('Ana Ruiz signs for Team Sky.', RACES)).toBeNull()
  })
})

describe('matchesFilter', () => {
  const news = item({ riderId: 'r1', teamId: 't1', country: 'ESP' })

  it('sin filtros deja pasar todo', () => {
    expect(matchesFilter(news, NO_FILTER, 'volta')).toBe(true)
  })

  it('filtra por equipo, corredor, nación y carrera', () => {
    expect(matchesFilter(news, { ...NO_FILTER, teamId: 't1' }, null)).toBe(true)
    expect(matchesFilter(news, { ...NO_FILTER, teamId: 't2' }, null)).toBe(false)
    expect(matchesFilter(news, { ...NO_FILTER, riderId: 'r2' }, null)).toBe(false)
    expect(matchesFilter(news, { ...NO_FILTER, country: 'ESP' }, null)).toBe(true)
    expect(matchesFilter(news, { ...NO_FILTER, raceId: 'volta' }, 'volta')).toBe(true)
    expect(matchesFilter(news, { ...NO_FILTER, raceId: 'volta' }, null)).toBe(false)
  })

  it('combina filtros: tienen que cumplirse todos', () => {
    expect(matchesFilter(news, { ...NO_FILTER, teamId: 't1', country: 'FRA' }, null)).toBe(false)
  })
})

describe('groupByGameDay', () => {
  it('agrupa por día y ordena del más reciente al más antiguo', () => {
    const groups = groupByGameDay([
      item({ gameDay: 12, text: 'a' }),
      item({ gameDay: 10, text: 'b' }),
      item({ gameDay: 12, text: 'c' }),
    ])
    expect(groups.map((g) => g.gameDay)).toEqual([12, 10])
    expect(groups[0]!.items.map((i) => i.text)).toEqual(['a', 'c'])
  })
})
