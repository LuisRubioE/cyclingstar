import { type NewsItem, SPOILER } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { newsKey } from '../api/news'
import { horizonKey } from '../queryClient'
import { News } from './News'
import { healthWith, horizonWith } from './__fixtures__/world'

/**
 * EL FEED BAJO EL VELO, EN PANTALLA (E2, docs/retransmision.md §11.7; sups. N1 a N3; paso 9b), en estático con
 * la caché ya llena (§16.6). La API manda un marcador `stage_ready` por etapa velada (8a); la página lo pinta
 * con la familia `Watch` y un enlace a su etapa, y con más de `SPOILER.newsGroupAbove` de una carrera, una
 * sola línea: `Race France · 4 stages ready to watch`.
 */

const REV = '200.3'

const marker = (stageDay: number, gameDay: number): NewsItem => ({
  gameDay,
  kind: 'stage_ready',
  text: `Stage ${stageDay} of Race France is ready to watch`,
  personal: false,
  riderId: null,
  riderName: null,
  country: null,
  teamId: null,
  teamName: null,
  payload: null,
  seed: null,
  tplRev: null,
  raceId: 'race-france',
  raceKey: 'race-france:s0',
  stageDay,
})
const headline: NewsItem = {
  gameDay: 190,
  kind: 'contract',
  text: 'Ana Ruiz signs for Team Sky.',
  personal: false,
  riderId: 'r1',
  riderName: 'Ana Ruiz',
  country: 'ES',
  teamId: 't1',
  teamName: 'Team Sky',
}

function feed(news: readonly NewsItem[]): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'on'))
  client.setQueryData(['horizon'], horizonWith({ rev: REV }))
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(newsKey(false, REV), news)
  client.setQueryData(horizonKey(['calendar'], REV), {
    races: [
      {
        id: 'race-france',
        name: 'Race France',
        level: 'WT',
        raceClass: 'WT',
        championshipCountry: null,
        championshipCategory: null,
        country: 'FR',
        format: 'gran-vuelta',
        startDay: 185,
        openTo: ['WT'],
        winner: null,
        restAfter: [],
        stages: [],
      },
    ],
    dayOfSeason: 200,
  })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/news']}>
        <News />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('el feed bajo el velo (§11.7)', () => {
  it(`hasta ${SPOILER.newsGroupAbove} etapas veladas de una carrera: un marcador por etapa, con la familia Watch y su enlace`, () => {
    const markup = feed([marker(3, 189), headline, marker(2, 188), marker(1, 187)])
    for (const d of [1, 2, 3]) {
      expect(markup).toContain(`Stage ${d} of Race France is ready to watch`)
      expect(markup).toContain(`href="/world/races/race-france/stages/${d}"`)
    }
    expect(markup.split('>Watch</span>').length - 1).toBe(3)
    expect(markup).toContain('Ana Ruiz signs for Team Sky.')
  })

  it(`con más de ${SPOILER.newsGroupAbove}, una sola línea por carrera, que lleva a la primera por ver`, () => {
    const markup = feed([marker(4, 190), headline, marker(3, 189), marker(2, 188), marker(1, 187)])
    expect(markup).toContain('Race France · 4 stages ready to watch')
    expect(markup).toContain('href="/world/races/race-france/stages/1"')
    expect(markup).not.toContain('Stage 2 of Race France is ready to watch')
    expect(markup.split('>Watch</span>').length - 1).toBe(1)
  })

  it('los desplegables se construyen con lo servido: un marcador aporta su carrera y ningún corredor (sup. N3)', () => {
    const markup = feed([marker(1, 187)])
    expect(markup).toContain('<option value="race-france">Race France</option>')
    // sin corredores servidos, el desplegable de corredor está vacío y desactivado
    expect(markup).toMatch(/<select id="news-rider"[^>]*disabled/)
    expect(feed([marker(1, 187), headline])).toContain('<option value="r1">Ana Ruiz</option>')
  })
})
