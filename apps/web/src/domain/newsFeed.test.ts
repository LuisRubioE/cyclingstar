import { describe, expect, it } from 'vitest'
import type { NewsItem } from '@cyclingstar/shared'
import { NO_FILTER, groupByGameDay, headlineTarget, matchesFilter, raceOfItem } from './newsFeed'

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

/**
 * RE-SELLADO EN EL 1b DE E2 (docs/retransmision.md §11.7 y §16.1, D-45). La carrera de un titular se
 * buscaba por su NOMBRE dentro del inglés del texto (`raceOfHeadline`, que muere aquí). Desde la 0046
 * cada titular trae su carrera como dato (`raceId`) y el enlace sale de ahí; un titular de antes no la
 * trae, y no se adivina del texto.
 */
describe('la carrera de un titular', () => {
  it('sale de sus datos, aunque el texto nombre otra', () => {
    expect(
      raceOfItem(item({ text: 'Ana Ruiz wins stage 3 of the Volta.', raceId: 'race-france' })),
    ).toBe('race-france')
  })

  it('un titular de antes de la 0046 no la trae, y no se adivina del texto', () => {
    expect(raceOfItem(item({ text: 'Ana Ruiz wins the Volta overall.' }))).toBeNull()
    expect(raceOfItem(item({ text: 'Ana Ruiz wins the Volta overall.', raceId: null }))).toBeNull()
  })

  it('un fichaje no es de ninguna carrera', () => {
    expect(
      raceOfItem(item({ kind: 'contract', text: 'Ana Ruiz signs for Team Sky.', raceId: null })),
    ).toBeNull()
  })

  it('y el enlace de una victoria lleva a esa carrera', () => {
    const victoria = item({
      riderId: 'r1',
      text: 'Ana Ruiz wins stage 3 of the Volta.',
      raceId: 'race-france',
    })
    expect(headlineTarget(victoria, raceOfItem(victoria))).toBe('/world/races/race-france')
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

describe('a dónde lleva un titular', () => {
  const noticia = (over: Partial<NewsItem>): NewsItem => ({
    gameDay: 1,
    kind: 'stage_win',
    text: 'Someone wins stage 4 of Race Sardegna',
    personal: false,
    riderId: 'r-1',
    riderName: 'Someone',
    country: 'ES',
    teamId: 't-1',
    teamName: 'Equipo',
    ...over,
  })

  it('una carrera GANADA abre la carrera, no la ficha del corredor', () => {
    // La queja: «cuando aparece una noticia de una carrera ganada, si le hago clic sale el
    // ciclista… yo querría que salga mejor la carrera».
    expect(headlineTarget(noticia({}), 'race-sardegna')).toBe('/world/races/race-sardegna')
  })

  it('y vale para todas las formas de ganar', () => {
    for (const kind of [
      'tt_win',
      'breakaway_win',
      'one_day_win',
      'one_day_tt_win',
      'gc_win',
      'kom',
    ])
      expect(headlineTarget(noticia({ kind }), 'race-x')).toBe('/world/races/race-x')
  })

  it('pero un fichaje o una lesión siguen llevando a su protagonista: la noticia va de él', () => {
    expect(headlineTarget(noticia({ kind: 'contract' }), 'race-x')).toBe('/world/riders/r-1')
    expect(headlineTarget(noticia({ kind: 'injury' }), null)).toBe('/world/riders/r-1')
  })

  it('si no se sabe de qué carrera habla, no se inventa: se queda con el corredor', () => {
    expect(headlineTarget(noticia({}), null)).toBe('/world/riders/r-1')
  })

  it('y un titular sin corredor ni carrera no es un enlace', () => {
    expect(headlineTarget(noticia({ kind: 'contract', riderId: null }), null)).toBeNull()
  })
})
