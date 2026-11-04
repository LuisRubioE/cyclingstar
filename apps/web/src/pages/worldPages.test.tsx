import type {
  AllTimeRecords,
  CountryRider,
  CountrySummary,
  RankingRow,
  SeasonAwards,
  TeamDetail,
  TeamListItem,
  TeamNewsItem,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { horizonKey } from '../queryClient'
import { Countries } from './Countries'
import { Country } from './Country'
import { HallOfFame } from './HallOfFame'
import { Rankings } from './Rankings'
import { Team } from './Team'
import { Teams } from './Teams'
import { PALETA, cuantas, pieza, respuestas, titulo } from './__fixtures__/markup'
import { healthWith } from './__fixtures__/world'

/**
 * EL MUNDO CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21k): lo que rodea a las tablas del 12b,
 * en estático con la caché llena y el velo apagado (`rev` `world`). Cada página con su `PageHeader`; los
 * equipos y los países, en `ActionRow` dentro de su `Panel`, el primero la respuesta de la 21 y de la 22
 * (§7.3); los récords y los premios, con las piezas del catálogo.
 */

vi.mock('../components/useTableIdentity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/useTableIdentity')>()),
  useOwnIds: () => ({ riderId: null, teamId: null }),
}))

const key = (...base: unknown[]) => horizonKey(base, 'world')

const equipo = (id: string, name: string, division: string, country: string): TeamListItem => ({
  id,
  name,
  country,
  division,
  budget: 1_000_000,
  pointsSeason: 1_234,
  kit: 'plain.navy',
  riderCount: 25,
})
const EQUIPOS = [
  equipo('t1', 'Mistral Racing', 'WT', 'FR'),
  equipo('t2', 'Andes Ruta', 'WT', 'CO'),
  // sin país
  { ...equipo('t4', 'Libre Team', 'WT', 'FR'), country: null },
  // con un solo corredor, en singular
  { ...equipo('t3', 'Sol Pro', 'PRS', 'ES'), riderCount: 1 },
]

function pinta(
  path: string,
  route: string,
  page: ReactNode,
  cache: readonly (readonly [readonly unknown[], unknown])[],
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'off'))
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(key('teams'), EQUIPOS)
  for (const [k, v] of cache) client.setQueryData(k, v)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={page} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Las filas con acción, con su enlace y lo que dicen sus dos renglones (como en `RacesIndex.test.tsx`, 21e). */
const filas = (s: string) =>
  s
    .split('<li data-ui="ActionRow"')
    .slice(1)
    .map((li) => {
      const raw = li.slice(0, li.indexOf('</li>'))
      const title = raw
        .split('<span class="block text-row text-ink">')[1]
        ?.split('</span><span class="block text-meta text-ink-2">')[0]
      const meta = raw.split('<span class="block text-meta text-ink-2">')[1]?.split('</a>')[0]
      return {
        href: /href="([^"]+)"/.exec(raw)?.[1],
        title: (title ?? '').replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<[^>]+>/g, ''),
        meta: (meta ?? '').replace(/<[^>]+>/g, '').replace(/<\/span>$/, ''),
        raw,
      }
    })

describe('los equipos (§17.21; PR 21k)', () => {
  const html = () => pinta('/world/teams', '/world/teams', <Teams />, [])

  it('la cabecera, un PageHeader con cuántos son', () => {
    expect(titulo(html())).toBe('Teams')
    expect(html()).toContain('4 teams across the three divisions.')
  })

  it('cada división en su Panel, por su nombre, sin las vacías; la primera, la única respuesta (pantalla 21)', () => {
    const s = html()
    const titulos = [...s.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    expect(titulos).toEqual(['World Tour', 'Pro Series'])
    expect(respuestas(s)).toBe(1)
    expect(pieza(s, 'Panel', 'World Tour')).toContain('data-answer=""')
  })

  it('cada equipo, una ActionRow a su ficha: su nombre seguido de su maillot, sin bandera (4-i); su país en palabras, sus puntos y sus corredores', () => {
    const f = filas(html())
    expect(f.map((x) => x.href)).toEqual([
      '/world/teams/t1',
      '/world/teams/t2',
      '/world/teams/t4',
      '/world/teams/t3',
    ])
    expect(f[0]?.title).toBe('Mistral Racing')
    // el nombre y después el maillot, para el ojo: el lector no lo dice dos veces
    expect(f[0]?.raw).toMatch(
      /Mistral Racing<span aria-hidden="true"><svg[^>]*aria-label="Mistral Racing kit"/,
    )
    expect(f[0]?.raw).not.toContain('data-ui="Flag"')
    expect(f[0]?.meta).toBe('France · 1,234 pts · 25 riders')
    // sin país, sus cifras
    expect(f[2]?.meta).toBe('1,234 pts · 25 riders')
    expect(f[3]?.meta).toBe('Spain · 1,234 pts · 1 rider')
  })

  it('sin equipos, su vacío, que contesta', () => {
    const s = pinta('/world/teams', '/world/teams', <Teams />, [[key('teams'), []]])
    expect(respuestas(s)).toBe(1)
    expect(s).toMatch(/data-ui="EmptyState"[^>]*data-answer=""[\s\S]*No teams yet\./)
  })

  it('sin la marca de la división en cada fila, que ya dice su Panel, y sin la paleta ni las cajas de antes', () => {
    const s = html()
    expect(s).not.toMatch(/>WT<|>PRS</)
    expect(s).not.toMatch(PALETA)
    expect(s).not.toContain('rounded-2xl')
  })
})

describe('los países (§17.21; PR 21k)', () => {
  const PAISES: CountrySummary[] = [
    { country: 'ES', riderCount: 12, totalPoints: 1_234 },
    { country: 'JP', riderCount: 1, totalPoints: 50 },
    { country: 'FR', riderCount: 3, totalPoints: 300 },
  ]
  const html = () =>
    pinta('/world/nations', '/world/nations', <Countries />, [[key('countries'), PAISES]])

  it('la cabecera, un PageHeader con lo que hay, y cada continente en su Panel, el primero la respuesta (pantalla 22)', () => {
    const s = html()
    expect(titulo(s)).toBe('Nations')
    expect(s).toContain('Every country with riders in the game, by continent.')
    const titulos = [...s.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    expect(titulos).toEqual(['Europe', 'Asia'])
    expect(respuestas(s)).toBe(1)
    expect(pieza(s, 'Panel', 'Europe')).toContain('data-answer=""')
  })

  it('sin países, su vacío, que contesta', () => {
    const s = pinta('/world/nations', '/world/nations', <Countries />, [[key('countries'), []]])
    expect(respuestas(s)).toBe(1)
    expect(s).toMatch(
      /data-ui="EmptyState"[^>]*data-answer=""[\s\S]*No countries with riders yet\./,
    )
  })

  it('cada país, una ActionRow a su ranking: su bandera y su nombre; sus puntos y sus corredores', () => {
    const f = filas(html())
    expect(f.map((x) => x.href)).toEqual([
      '/world/nations/ES',
      '/world/nations/FR',
      '/world/nations/JP',
    ])
    expect(f.map((x) => x.title)).toEqual(['Spain', 'France', 'Japan'])
    expect(f[0]?.meta).toBe('1,234 pts · 12 riders')
    expect(f[2]?.meta).toBe('50 pts · 1 rider')
    expect(f[0]?.raw).toMatch(/<span aria-hidden="true"><span data-ui="Flag"/)
    expect(html()).not.toMatch(PALETA)
  })
})

describe('la nación (§17.21; PR 21k)', () => {
  const fila = (n: number): CountryRider => ({
    id: `r${n}`,
    name: `Rider ${n}`,
    teamId: 't1',
    teamName: 'Mistral Racing',
    archetype: 'escalada',
    isBot: true,
    seasonPoints: 100 - n,
  })
  const html = () =>
    pinta('/world/nations/ES', '/world/nations/:code', <Country />, [
      [key('country', 'ES'), [fila(1), fila(2)]],
    ])

  it('la cabecera, un PageHeader con su vuelta a los países y lo que es el ranking; sin la flecha de texto', () => {
    const s = html()
    expect(titulo(s)).toBe('Spain')
    expect(pieza(s, 'PageHeader', 'Spain')).toMatch(/href="\/world\/nations"/)
    expect(s).toContain('2 active riders · national ranking by season points')
    expect(s).not.toContain('←')
    const uno = pinta('/world/nations/ES', '/world/nations/:code', <Country />, [
      [key('country', 'ES'), [fila(1)]],
    ])
    expect(uno).toContain('1 active rider · national ranking by season points')
    expect(s).not.toMatch(PALETA)
  })
})

describe('el salón de la fama (§17.21; PR 21k)', () => {
  const RECORDS: AllTimeRecords = {
    mostWins: {
      riderId: 'r1',
      name: 'Rider 1',
      country: 'ES',
      isBot: false,
      value: 12,
      note: 'Over 3 seasons',
    },
    mostGcWins: {
      riderId: 'r3',
      name: 'Rider 3',
      country: 'BE',
      isBot: true,
      value: 3,
      note: 'Three overall wins',
    },
    youngestWinner: {
      riderId: 'r2',
      name: 'Rider 2',
      country: 'FR',
      isBot: true,
      value: 21,
      note: 'Race France, season 2',
    },
  }
  const html = () =>
    pinta('/world/hall-of-fame', '/world/hall-of-fame', <HallOfFame />, [
      [key('hall-of-fame'), []],
      [key('records'), RECORDS],
    ])

  it('la cabecera, un PageHeader con lo que es el salón', () => {
    expect(titulo(html())).toBe('Hall of Fame')
    expect(html()).toContain('The most decorated riders of the world')
  })

  it('los récords, en su Panel: cada uno su Stat, su corredor, que enlaza, y su nota; sin récord, lo dice', () => {
    const panel = pieza(html(), 'Panel', 'All-time records')
    expect(panel).toMatch(/data-ui="Stat"[\s\S]*?>Most wins<\/dt><dd[^>]*>12 wins<\/dd>/)
    expect(panel).toMatch(/href="\/world\/riders\/r1"/)
    expect(panel).toContain('Over 3 seasons')
    expect(panel).toMatch(/>Most overall wins<\/dt><dd[^>]*>3 GC<\/dd>/)
    expect(panel).toMatch(/>Youngest overall winner<\/dt><dd[^>]*>21 yrs<\/dd>/)
  })

  it('un récord que no hay, None yet', () => {
    const s = pinta('/world/hall-of-fame', '/world/hall-of-fame', <HallOfFame />, [
      [key('hall-of-fame'), []],
      [key('records'), { ...RECORDS, mostGcWins: null }],
    ])
    expect(pieza(s, 'Panel', 'All-time records')).toMatch(
      />Most overall wins<\/dt><dd[^>]*>None yet<\/dd>/,
    )
  })

  it('ni la letra de 11 px ni la paleta, ni el guion de lo que no hay', () => {
    const s = html()
    expect(s).not.toContain('text-[11px]')
    expect(s).not.toMatch(PALETA)
    expect(s).not.toContain('>—<')
  })
})

describe('el ranking (§17.21; PR 21k)', () => {
  const fila = (n: number): RankingRow => ({
    riderId: `r${n}`,
    name: `Rider ${n}`,
    country: 'ES',
    teamId: 't1',
    teamName: 'Mistral Racing',
    isBot: true,
    points: 2000 - n,
  })
  const PREMIOS: SeasonAwards = {
    riderOfYear: {
      riderId: 'r1',
      name: 'Rider 1',
      country: 'ES',
      isBot: false,
      archetype: 'escalada',
      points: 1_999,
    },
    bestSprinter: null,
    bestClimber: null,
    revelation: null,
  }
  const html = () =>
    pinta('/world/rankings', '/world/rankings', <Rankings />, [
      [key('rankings'), [fila(1), fila(2)]],
      [key('season-awards'), PREMIOS],
    ])

  it('la cabecera, un PageHeader; y lo que cuenta la pestaña, dentro de su Panel, en meta', () => {
    const s = html()
    expect(titulo(s)).toBe('Rankings')
    expect(pieza(s, 'Panel', 'Points scored over the last 12 months')).toMatch(
      /<p class="[^"]*text-meta text-ink-2[^"]*">Points scored over the last 12 months/,
    )
  })

  it('los premios, en su Panel: cada uno con su ganador, que enlaza, su tipo y sus puntos, y su porqué; sin ganador, lo dice', () => {
    const panel = pieza(html(), 'Panel', 'Season awards')
    expect(panel).toMatch(/Rider of the year[\s\S]*?href="\/world\/riders\/r1"/)
    expect(panel).toMatch(/<h3[^>]*>Rider of the year<\/h3>/)
    expect(panel).toContain('Climber · 1,999 pts')
    expect(panel).toContain('Most season points')
    expect(cuantas(panel, /None yet/)).toBe(3)
    expect(html()).not.toContain('text-[11px]')
    expect(html()).not.toMatch(PALETA)
  })
})

describe('la ficha del equipo (§17.21; PR 21k)', () => {
  const DETALLE: TeamDetail = {
    id: 't1',
    name: 'Mistral Racing',
    country: 'FR',
    division: 'WT',
    budget: 1_000_000,
    pointsSeason: 900,
    kit: 'plain.navy',
    bib: 'black',
    human: false,
    roster: [],
  }
  const NOTICIAS: TeamNewsItem[] = [
    { gameDay: 12, kind: 'signing', text: 'Rider 7 joins the team' },
  ]
  const html = (control: unknown) =>
    pinta('/world/teams/t1', '/world/teams/:id', <Team />, [
      [key('team', 't1'), DETALLE],
      [['team-control'], control],
      [key('team-news', 't1', false), NOTICIAS],
    ])

  it('tomar el equipo, un Notice con su acción, solo para el premium cuyo corredor corre en él', () => {
    const control = {
      premium: true,
      isAdmin: false,
      team: { id: 't1', name: 'Mistral Racing', isBot: true, ownedByMe: false },
    }
    const aviso = pieza(html(control), 'Notice', 'Take over this team')
    expect(aviso).toMatch(/data-variant="info"/)
    expect(aviso).toMatch(/<button [^>]*data-ui="Button"[\s\S]*?Take control/)
    expect(html(null)).not.toContain('Take over this team')
    // ni el de otro equipo, ni sin premium
    expect(html({ ...control, team: { ...control.team, id: 't2' } })).not.toContain(
      'Take over this team',
    )
    expect(html({ ...control, premium: false })).not.toContain('Take over this team')
  })

  it('las noticias, en su Panel, con su día en meta y sin la paleta', () => {
    const s = html(null)
    const panel = pieza(s, 'Panel', 'Recent news')
    expect(panel).toMatch(/<span class="[^"]*text-meta[^"]*text-ink-2[^"]*">Day 12<\/span>/)
    expect(panel).toContain('Rider 7 joins the team')
    expect(s).not.toMatch(PALETA)
    expect(s).not.toContain('rounded-2xl')
  })
})
