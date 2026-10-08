import { describe, expect, it } from 'vitest'
import { type NewsItem, SPOILER } from '@cyclingstar/shared'
import {
  NO_FILTER,
  feedEntries,
  groupByGameDay,
  headlineTarget,
  matchesFilter,
  raceOfItem,
  readyTarget,
  stageReadyOf,
} from './newsFeed'

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

/**
 * EL MARCADOR DE UNA ETAPA VELADA (E2, docs/retransmision.md §11.7 y §4.12; D-45, I-39, 14-j; paso 9b). La API
 * manda, en lugar de las noticias de cada etapa velada, UN titular `stage_ready` con texto neutro y la
 * carrera y la etapa como datos (8a). La web lo convierte en `StageReadyItem`, lo lleva a la etapa (que
 * abre en `Watch`) y, con más de `SPOILER.newsGroupAbove` etapas veladas de una carrera, los junta en una
 * línea, `Race France · 4 stages ready to watch`, que solo mira el horizonte.
 */
describe('stage_ready: el marcador de una etapa velada (9b)', () => {
  const marker = (stageDay: number, gameDay: number, raceId = 'race-france'): NewsItem =>
    item({
      kind: 'stage_ready',
      gameDay,
      text: `Stage ${stageDay} of Race France is ready to watch`,
      raceId,
      raceKey: `${raceId}:s0`,
      stageDay,
    })

  it('stageReadyOf lo convierte en StageReadyItem; un titular normal, o uno sin etapa, no', () => {
    expect(stageReadyOf(marker(7, 191))).toEqual({
      kind: 'stage_ready',
      raceId: 'race-france',
      season: 0,
      stageDay: 7,
      gameDay: 191,
    })
    expect(stageReadyOf(item({ kind: 'stage_win', raceId: 'race-france', stageDay: 7 }))).toBeNull()
    expect(stageReadyOf(item({ kind: 'stage_ready', raceId: null }))).toBeNull()
  })

  it('lleva a la etapa, que abre en Watch (no a la carrera ni a un corredor)', () => {
    expect(readyTarget({ raceId: 'race-france', stageDay: 7 })).toBe(
      '/world/races/race-france/stages/7',
    )
  })

  it(`hasta ${SPOILER.newsGroupAbove} de una carrera van sueltos, cada uno en su sitio`, () => {
    const news = [marker(3, 189), item({ gameDay: 189 }), marker(2, 188), marker(1, 187)]
    const entries = feedEntries(news)
    expect(entries.map((e) => e.kind)).toEqual(['ready', 'news', 'ready', 'ready'])
  })

  it(`con más de ${SPOILER.newsGroupAbove}, una línea por carrera en el sitio del más reciente, con las etapas en orden`, () => {
    const news = [
      marker(4, 190),
      item({ gameDay: 190, kind: 'contract', text: 'A signs for B.' }),
      marker(3, 189),
      marker(1, 182, 'race-flanders'),
      marker(2, 188),
      marker(1, 187),
    ]
    const entries = feedEntries(news)
    expect(entries.map((e) => e.kind)).toEqual(['ready-group', 'news', 'ready'])
    const group = entries[0]
    expect(group).toMatchObject({
      kind: 'ready-group',
      raceId: 'race-france',
      raceName: 'Race France',
      stages: [1, 2, 3, 4],
      gameDay: 190,
    })
    // la de otra carrera, con una sola etapa velada, sigue suelta
    expect(entries[2]).toMatchObject({ kind: 'ready', ready: { raceId: 'race-flanders' } })
  })

  it('agrupa por día de juego los marcadores y los titulares juntos', () => {
    const days = groupByGameDay(
      feedEntries([marker(2, 188), item({ gameDay: 188 }), marker(1, 187)]),
    )
    expect(days.map((d) => [d.gameDay, d.items.length])).toEqual([
      [188, 2],
      [187, 1],
    ])
  })
})
