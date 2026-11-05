import {
  type Contract,
  HOUSING_RENT_PER_WEEK,
  type Ledger,
  type NewsItem,
  type Offer,
  type RiderSummary,
  type TeamDetail,
  type TeamListItem,
  seasonPosition,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { newsKey } from '../api/news'
import { newsLabel, roleLabel } from '../domain/labels'
import { horizonKey } from '../queryClient'
import { Finances } from './Finances'
import { Market } from './Market'
import { News } from './News'
import { TeamIdentity } from './TeamIdentity'
import { TeamSquad } from './TeamSquad'
import { PALETA, campo, cuantas, pieza, respuestas, titulo } from './__fixtures__/markup'
import { healthWith } from './__fixtures__/world'

/**
 * LO DEL JUGADOR Y EL MÁNAGER CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21l): las noticias,
 * el mercado, las finanzas, la plantilla y la identidad del equipo, en estático con la caché llena y el velo
 * apagado (`rev` `world`). Cada página con su `PageHeader`, donde iba la barra dorada de `SectionBar`; sus
 * paneles, los del catálogo, donde iban los cian de antes con sus `InfoRow`; y cada una con su respuesta: el
 * primer día de las noticias (la 19), el contrato o la primera oferta (la 26) y el saldo (la 27, un `Stat`).
 */

vi.mock('../components/useTableIdentity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/useTableIdentity')>()),
  useOwnIds: () => ({ riderId: null, teamId: null }),
}))

const key = (...base: unknown[]) => horizonKey(base, 'world')

function pinta(
  path: string,
  route: string,
  page: ReactNode,
  cache: readonly (readonly [readonly unknown[], unknown])[],
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'off'))
  client.setQueryData(['admin-whoami'], null)
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

/** Las filas con acción, con su enlace y lo que dicen sus dos renglones (como en `worldPages.test.tsx`, 21k). */
const filas = (s: string) =>
  s
    .split('<li data-ui="ActionRow"')
    .slice(1)
    .map((li) => {
      const raw = li.slice(0, li.indexOf('</li>'))
      const title = raw
        .split('<span class="block text-row text-ink">')[1]
        ?.split('</span><span class="block text-meta text-ink-2">')[0]
      const meta = raw.split('<span class="block text-meta text-ink-2">')[1]?.split('</')[0]
      return {
        href: /href="([^"]+)"/.exec(raw)?.[1],
        title: (title ?? '').replace(/<[^>]+>/g, ''),
        meta: meta ?? '',
        raw,
      }
    })

/** Una fila de un `dl` por su rótulo: lo que dice su `dd`, sin las etiquetas. */
const dato = (s: string, rotulo: string): string | null => {
  const m = new RegExp(
    `<dt[^>]*>${rotulo}(?:(?!</dt>)[\\s\\S])*</dt><dd[^>]*>((?:(?!</dd>)[\\s\\S])*)</dd>`,
  ).exec(s)
  return m?.[1] === undefined ? null : m[1].replace(/<[^>]+>/g, '')
}

const RESUMEN: RiderSummary = {
  teamId: 't1',
  teamName: 'Mistral Racing',
  money: 0,
  moraleStars: 3,
  seasonPoints: 0,
  seasonRank: 1,
  fieldSize: 100,
  nationality: 'FR',
  residence: 'ES',
  housingCovered: false,
}

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

const lista = (id: string, pointsSeason: number): TeamListItem => ({
  id,
  name: `Team ${id}`,
  country: 'FR',
  division: 'WT',
  budget: 1,
  pointsSeason,
  kit: 'plain.navy',
  riderCount: 25,
})

describe('las noticias (§17.21; PR 21l)', () => {
  const titular = (over: Partial<NewsItem> = {}): NewsItem => ({
    gameDay: 200,
    kind: 'signing',
    text: 'Rider 7 joins Mistral Racing',
    personal: false,
    riderId: 'r7',
    riderName: 'Rider 7',
    country: 'FR',
    teamId: 't1',
    teamName: 'Mistral Racing',
    ...over,
  })
  const NOTICIAS: NewsItem[] = [
    titular(),
    titular({
      kind: 'injury',
      text: 'You crashed and hurt your knee',
      personal: true,
      riderId: null,
      riderName: null,
      country: null,
      teamId: null,
      teamName: null,
    }),
    titular({ gameDay: 199, text: 'Rider 8 joins Mistral Racing', riderId: 'r8' }),
  ]
  const html = (items: NewsItem[] = NOTICIAS) =>
    pinta('/news', '/news', <News />, [
      [newsKey(false, 'world'), items],
      [key('calendar'), { races: [] }],
    ])
  const dia = (gameDay: number) => {
    const p = seasonPosition(gameDay)
    return `Day ${p.dayOfSeason} · Season ${p.season}`
  }

  it('la cabecera, un PageHeader, y los filtros en su Panel, cada uno en su Field', () => {
    const s = html()
    expect(titulo(s)).toBe('News')
    const filtros = pieza(s, 'Panel', 'news-team')
    expect(filtros).toMatch(/^<section data-ui="Panel"[^>]*aria-label="Filters"/)
    for (const id of ['news-team', 'news-rider', 'news-nation', 'news-race'])
      expect(filtros).toMatch(
        new RegExp(`<div data-ui="Field"[^>]*>(?:(?!data-ui="Field")[\\s\\S])*id="${id}"`),
      )
    // sin filtrar, `All` elegido en los cuatro
    expect(cuantas(filtros, /<option value="" selected="">All<\/option>/)).toBe(4)
    // sin filtrar, nada que limpiar
    expect(s).not.toContain('Clear filters')
    // sin carreras servidas, el de la carrera, desactivado con su porqué (§4.1; sup. N3)
    const carrera = campo(s, 'news-race')
    expect(carrera).toMatch(/<select id="news-race"[^>]*aria-disabled="true"/)
    expect(carrera).toContain('No races in these headlines.')
    expect(campo(s, 'news-team')).not.toContain('aria-disabled')
  })

  it('cada día en su Panel, por su día de la temporada; el primero, la única respuesta (pantalla 19)', () => {
    const s = html()
    const titulos = [...s.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    expect(titulos).toEqual([dia(200), dia(199)])
    expect(respuestas(s)).toBe(1)
    expect(pieza(s, 'Panel', dia(200))).toContain('data-answer=""')
    // el día, en palabras de la temporada (§4.10), y no `Game day`
    expect(s).not.toContain('Game day')
  })

  it('cada titular, una ActionRow: su enlace si lo tiene, la bandera de su país, y su familia en meta', () => {
    const f = filas(html())
    expect(f.map((x) => x.href)).toEqual(['/world/riders/r7', undefined, '/world/riders/r8'])
    expect(f[0]?.title).toBe('Rider 7 joins Mistral Racing')
    expect(f[0]?.raw).toMatch(/data-ui="Flag"[^>]*aria-label="France"/)
    expect(f[0]?.meta).toBe(newsLabel('signing'))
    // el mío, con su `you`; sin corredor ni carrera, sin enlace y sin bandera
    expect(f[1]?.meta).toBe(`${newsLabel('injury')} · you`)
    expect(f[1]?.raw).not.toContain('<a ')
    expect(f[1]?.raw).not.toContain('data-ui="Flag"')
  })

  it('las 20 primeras de cada día, y Show all (§6.1)', () => {
    const muchas = Array.from({ length: 25 }, (_, i) =>
      titular({ gameDay: 198, text: `Headline ${i}`, riderId: `r${i}` }),
    )
    const s = html([...NOTICIAS, ...muchas])
    const panel = pieza(s, 'Panel', dia(198))
    expect(cuantas(panel, /<li data-ui="ActionRow"/)).toBe(20)
    expect(panel).toMatch(/data-ui="ShowAllRows"[\s\S]*Show all 25/)
    // el día que no llega a 20, entero y sin el botón
    expect(pieza(s, 'Panel', dia(200))).not.toContain('ShowAllRows')
  })

  it('sin noticias, su vacío, que contesta, y sin filtros que no filtran nada', () => {
    const s = html([])
    expect(respuestas(s)).toBe(1)
    expect(s).toMatch(/data-ui="EmptyState"[^>]*data-answer=""[\s\S]*Nothing has happened yet\./)
    expect(s).not.toContain('news-team')
  })

  it('sin la paleta, ni la barra dorada, ni la letra de 11', () => {
    const s = html()
    expect(s).not.toMatch(PALETA)
    expect(s).not.toContain('text-[11px]')
  })
})

describe('el mercado (§17.21; PR 21l)', () => {
  const OFERTA: Offer = {
    id: 'o1',
    teamId: 't1',
    teamName: 'Mistral Racing',
    division: 'WT',
    role: 'gregario',
    salary: 1_200,
    seasons: 2,
    releaseClause: 2_000_000,
    payHousing: true,
    relocatesTo: 'ES',
  }
  const CONTRATO: Contract = {
    teamId: 't2',
    teamName: 'Andes Ruta',
    division: 'PRS',
    role: 'gregario',
    salary: 1_000,
    endSeason: 2,
    releaseClause: 500_000,
  }
  const html = (offers: Offer[], contract: Contract | null) =>
    pinta('/me/contract', '/me/contract', <Market />, [[['market'], { offers, contract }]])

  it('la cabecera, un PageHeader; con contrato, su Panel, que contesta (pantalla 26)', () => {
    const s = html([OFERTA], CONTRATO)
    expect(titulo(s)).toBe('Transfer market')
    expect(respuestas(s)).toBe(1)
    const contrato = pieza(s, 'Panel', 'Current contract')
    expect(contrato).toContain('data-answer=""')
    expect(contrato).toMatch(
      /<a [^>]*href="\/world\/teams\/t2"[^>]*>(?:(?!<\/a>)[\s\S])*Andes Ruta/,
    )
    expect(contrato.replace(/<[^>]+>/g, '')).toContain(
      `Pro Series · ${roleLabel('gregario')} · 1,000/wk · through season 3`,
    )
  })

  it('cada oferta en su Panel, con su equipo en el título y su ficha en un TextLink; sin contrato, la primera contesta', () => {
    const s = html([OFERTA, { ...OFERTA, id: 'o2', teamId: 't3', teamName: 'Sol Pro' }], null)
    expect(respuestas(s)).toBe(1)
    const oferta = pieza(s, 'Panel', 'Mistral Racing')
    expect(oferta).toContain('data-answer=""')
    expect(oferta).toMatch(/<h2[^>]*>Mistral Racing<\/h2>/)
    expect(oferta).toMatch(/<a [^>]*href="\/world\/teams\/t1"[^>]*>(?:(?!<\/a>)[\s\S])*Team page/)
    expect(pieza(s, 'Panel', 'Sol Pro')).not.toContain('data-answer')
  })

  it('lo que ofrece, en su dl: la división en palabras, el sueldo, los años, la cláusula y la casa, sin su 🏠', () => {
    const s = html([OFERTA, { ...OFERTA, id: 'o2', teamName: 'Sol Pro', seasons: 1 }], null)
    const oferta = pieza(s, 'Panel', 'Mistral Racing')
    expect(dato(oferta, 'Division')).toBe('World Tour')
    expect(dato(oferta, 'Role')).toBe(roleLabel('gregario'))
    expect(dato(oferta, 'Salary')).toBe('1,200/wk')
    expect(dato(oferta, 'Length')).toBe('2 seasons')
    expect(dato(oferta, 'Buyout')).toBe('2,000,000')
    expect(dato(oferta, 'Relocate to')).toBe('Spain')
    expect(dato(oferta, 'Housing')).toBe('Team pays rent')
    expect(dato(pieza(s, 'Panel', 'Sol Pro'), 'Length')).toBe('1 season')
    // la bandera, para el ojo: su nombre va al lado
    expect(oferta).toMatch(/<span aria-hidden="true"><span data-ui="Flag"/)
    expect(s).not.toContain('🏠')
  })

  it('el porqué de la cláusula y de la casa, en un InfoButton y no en un title que el dedo no abre (ui/4)', () => {
    const s = html([OFERTA], null)
    expect(s).toMatch(/data-ui="InfoButton"[\s\S]*?aria-label="About the buyout"/)
    expect(s).toMatch(/data-ui="InfoButton"[\s\S]*?aria-label="About the housing"/)
    expect(s).toContain('A higher buyout means you&#x27;re harder to poach.')
    expect(s).not.toMatch(/\stitle="/)
    expect(s).not.toContain('cursor-help')
  })

  it('firmar, un Button primario, y rechazar, uno secundario; ninguno a mano', () => {
    const s = html([OFERTA], null)
    expect(pieza(s, 'Button', 'Sign')).toMatch(/data-variant="primary"/)
    expect(pieza(s, 'Button', 'Decline')).toMatch(/data-variant="secondary"/)
    expect(cuantas(s, /<button(?![^>]*data-ui=)(?![^>]*aria-controls=)/)).toBe(0)
  })

  it('sin ofertas ni contrato, su vacío, que contesta; con contrato, el vacío no', () => {
    const s = html([], null)
    expect(respuestas(s)).toBe(1)
    expect(s).toMatch(/data-ui="EmptyState"[^>]*data-answer=""[\s\S]*No offers on the table/)
    const t = html([], CONTRATO)
    expect(respuestas(t)).toBe(1)
    expect(t).not.toMatch(/data-ui="EmptyState"[^>]*data-answer=""/)
  })

  it('sin la paleta ni la barra dorada', () => {
    expect(html([OFERTA], CONTRATO)).not.toMatch(PALETA)
  })
})

describe('las finanzas (§17.21; PR 21l)', () => {
  const LIBRO: Ledger = {
    balance: 12_345,
    entries: [{ gameDay: 196, kind: 'salary', amount: 780, note: '' }],
    gameDay: 200,
    salary: 780,
  }
  const html = (ledger: Ledger = LIBRO, resumen: RiderSummary = RESUMEN) =>
    pinta('/me/finances', '/me/finances', <Finances />, [
      [key('ledger'), ledger],
      [key('rider-summary'), resumen],
    ])

  it('la cabecera, un PageHeader con lo que se apunta; el saldo, un Stat, que contesta (pantalla 27)', () => {
    const s = html()
    expect(titulo(s)).toBe('Finances')
    expect(s).toContain('Every salary payment and race prize is logged here.')
    expect(respuestas(s)).toBe(1)
    const saldo = pieza(s, 'Stat', 'Balance')
    expect(saldo).toMatch(/^<dl data-ui="Stat"[^>]*data-answer=""/)
    expect(saldo).toContain('12,345')
  })

  it('el próximo sueldo, un Stat con su signo, y su día en palabras de la temporada, nunca GD (§4.10)', () => {
    const s = html()
    const sueldo = pieza(s, 'Stat', 'Next salary')
    expect(sueldo).toMatch(/data-variant="signed"/)
    expect(sueldo).toMatch(/<dd class="[^"]*text-good[^"]*">\+780<\/dd>/)
    // el siguiente múltiplo de 7 tras el 200 es el 203, en 3 días
    expect(s).toContain(`Day ${seasonPosition(203).dayOfSeason} · in 3 days`)
    expect(s).not.toMatch(/\bGD/)
    // sin contrato, nada
    expect(html({ ...LIBRO, salary: null })).not.toContain('Next salary')
  })

  it('la casa, en su Panel, sin su 🏠: dónde vive, con su bandera para el ojo, y lo que paga', () => {
    const casa = pieza(html(), 'Panel', 'Housing')
    expect(casa).toMatch(/Lives in[\s\S]*<span aria-hidden="true"><span data-ui="Flag"[\s\S]*Spain/)
    expect(casa).toContain(`${HOUSING_RENT_PER_WEEK}/week`)
    expect(pieza(html(LIBRO, { ...RESUMEN, residence: 'FR' }), 'Panel', 'Housing')).toContain(
      'You live in your home country',
    )
    expect(pieza(html(LIBRO, { ...RESUMEN, housingCovered: true }), 'Panel', 'Housing')).toContain(
      'your team covers your rent',
    )
    expect(html()).not.toContain('🏠')
  })

  it('sin movimientos, su vacío, que no contesta: contesta el saldo', () => {
    const s = html({ ...LIBRO, entries: [] })
    expect(respuestas(s)).toBe(1)
    expect(s).toMatch(/data-ui="EmptyState"(?![^>]*data-answer)[^>]*>[\s\S]*No transactions yet\./)
  })

  it('sin la paleta ni la barra dorada', () => {
    expect(html()).not.toMatch(PALETA)
  })
})

describe('la plantilla (§17.21; PR 21l)', () => {
  const html = (resumen: RiderSummary = RESUMEN) =>
    pinta('/team/squad', '/team/squad', <TeamSquad />, [
      [key('rider', 'summary'), resumen],
      [key('team', 't1'), DETALLE],
    ])

  it('la cabecera, un PageHeader con el equipo y su división', () => {
    const s = html()
    expect(titulo(s)).toBe('Squad')
    expect(pieza(s, 'PageHeader', 'Squad')).toContain('Mistral Racing · World Tour')
  })

  it('el equipo, en su Panel: su maillot de 40 (§8.3), sin bandera (6-f), sus cifras y su ficha pública', () => {
    const panel = pieza(html(), 'Panel', 'Public team page')
    expect(panel).toMatch(
      /<svg[^>]*width="40"[^>]*aria-label="Mistral Racing kit"|<svg[^>]*aria-label="Mistral Racing kit"[^>]*width="40"/,
    )
    expect(panel).not.toContain('data-ui="Flag"')
    expect(panel).toContain('France · 0 riders · 900 season points')
    expect(panel).toMatch(
      /<a [^>]*href="\/world\/teams\/t1"[^>]*>(?:(?!<\/a>)[\s\S])*Public team page/,
    )
  })

  it('la tabla, la única respuesta (pantalla 14); sin equipo, su vacío (la 43)', () => {
    const s = html()
    expect(respuestas(s)).toBe(1)
    expect(s).toMatch(/data-ui="RankTable"[^>]*data-answer=""/)
    const libre = html({ ...RESUMEN, teamId: null, teamName: null })
    expect(titulo(libre)).toBe('Squad')
    expect(respuestas(libre)).toBe(1)
    expect(libre).toMatch(/data-ui="EmptyState"[^>]*data-answer=""/)
  })

  it('sin la paleta ni la barra dorada', () => {
    expect(html()).not.toMatch(PALETA)
    expect(html({ ...RESUMEN, teamId: null, teamName: null })).not.toMatch(PALETA)
  })
})

describe('la identidad del equipo (§17.21; PR 21l)', () => {
  const html = (detalle: TeamDetail = DETALLE, equipos = [lista('t9', 2_000), lista('t1', 900)]) =>
    pinta('/team/identity', '/team/identity', <TeamIdentity />, [
      [key('rider', 'summary'), RESUMEN],
      [key('team', 't1'), detalle],
      [key('team-news', 't1'), [{ gameDay: 12, kind: 'signing', text: 'Rider 7 joins the team' }]],
      [key('teams'), equipos],
      [['team-control'], null],
    ])

  it('el equipo, en un Panel del catálogo: su filosofía y sus datos en un dl, donde iban los InfoRow', () => {
    const panel = pieza(html(), 'Panel', 'The team')
    expect(panel).toMatch(/^<section data-ui="Panel"/)
    expect(dato(panel, 'Division')).toBe('World Tour')
    expect(dato(panel, 'Based in')).toBe('France')
    expect(panel).toMatch(/<span aria-hidden="true"><span data-ui="Flag"/)
    expect(dato(panel, 'Riders')).toBe('0')
    expect(dato(panel, 'Season points')).toBe('900')
    expect(dato(panel, 'Rank among teams')).toBe('#2 of 2')
    expect(dato(panel, 'Budget')).toBe('1,000,000')
  })

  it('sin país ni puesto, en palabras, donde iba una raya', () => {
    const panel = pieza(html({ ...DETALLE, country: null }, []), 'Panel', 'The team')
    expect(dato(panel, 'Based in')).toBe('None')
    expect(dato(panel, 'Rank among teams')).toBe('Not ranked yet')
    expect(panel).not.toContain('—')
  })

  it('la historia, en su Panel sin relleno, con las noticias del equipo', () => {
    const historia = pieza(html(), 'Panel', 'History')
    expect(historia).toMatch(/^<section data-ui="Panel" data-variant="bleed"/)
    expect(historia).toContain('Rider 7 joins the team')
  })

  it('sin la paleta ni los paneles de antes', () => {
    expect(html()).not.toMatch(PALETA)
  })
})
