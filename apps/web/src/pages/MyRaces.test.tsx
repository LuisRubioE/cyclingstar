import type {
  EnterableRace,
  RiderRaceResult,
  RiderSummary,
  UpcomingRace,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { horizonKey } from '../queryClient'
import { MyRaces } from './MyRaces'
import { healthWith, horizonWith } from './__fixtures__/world'

/**
 * MIS CARRERAS CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21b), en estático con la caché ya
 * llena: la cabecera en `PageHeader`, las pestañas del catálogo, cada lista en su `Panel` con la respuesta de
 * su pantalla (§7.3: la 02, `On your programme`; la 03, la de la inscripción; la 37, la `RankTable` de los
 * resultados), las cifras de la inscripción en `Stat` y el desglose de etapas en un `Disclosure` de 44.
 */

const REV = '200.1'

const upcoming: UpcomingRace = {
  raceId: 'race-valencia',
  raceKey: 'race-valencia:s0',
  raceName: 'Race Valencia',
  raceClass: 'PRS',
  country: 'ES',
  startGameDay: 52,
  daysUntil: 2,
  stageCount: 5,
  ongoing: false,
  bib: 214,
  travelOut: [],
  travelBack: [],
  travelPaid: null,
}

const enterable = (over: Partial<EnterableRace>): EnterableRace => ({
  raceId: 'race-jaen',
  name: 'Race Jaén',
  country: 'ES',
  startDay: 60,
  raceClass: '1',
  travelMoney: 1200,
  travelDays: 1,
  entered: false,
  enrolled: false,
  affordable: true,
  ...over,
})

const result = (over: Partial<RiderRaceResult>): RiderRaceResult => ({
  raceId: 'race-france',
  raceName: 'Race France',
  raceClass: 'WT',
  season: 0,
  stageCount: 3,
  isOneDay: false,
  gcPuesto: 7,
  dnf: false,
  finished: true,
  stages: [
    { stageDay: 1, puesto: 1, from: 'Lille', to: 'Arras' },
    { stageDay: 2, puesto: 12, from: 'Arras', to: 'Reims' },
    { stageDay: 3, puesto: 4, from: 'Reims', to: 'Paris' },
  ],
  ...over,
})

function page(
  url: string,
  {
    freeAgent = false,
    races = [upcoming],
    entries = [],
    results = [result({})],
    money = 15000,
  }: {
    freeAgent?: boolean
    races?: UpcomingRace[]
    entries?: EnterableRace[]
    results?: RiderRaceResult[]
    money?: number
  } = {},
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const summary: Partial<RiderSummary> = {
    teamId: freeAgent ? null : 'team-1',
    teamName: freeAgent ? null : 'Noord',
    money,
  }
  client.setQueryData(['health'], healthWith('on', 'on'))
  client.setQueryData(['horizon'], horizonWith({ rev: REV }))
  client.setQueryData(horizonKey(['rider', 'summary'], REV), summary)
  client.setQueryData(horizonKey(['rider', 'me'], REV), { id: 'rider-1' })
  client.setQueryData(horizonKey(['rider', 'upcoming'], REV), races)
  client.setQueryData(['race-entries'], entries)
  client.setQueryData(horizonKey(['rider', 'results', 'rider-1'], REV), results)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <MyRaces />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El `Panel` del catálogo que lleva ese título, entero. */
const panel = (markup: string, title: string): string =>
  new RegExp(
    `<section data-ui="Panel"[^>]*>(?:(?!</section>)[\\s\\S])*?>${title}</h2>[\\s\\S]*?</section>`,
  ).exec(markup)?.[0] ?? ''

describe('mis carreras con el sistema (§17.21; PR 21b)', () => {
  it('la cabecera, un PageHeader con My races; las pestañas, las del catálogo en page', () => {
    const markup = page('/me/races')
    expect(markup).toMatch(/<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>My races<\/h1>/)
    expect(markup).toMatch(/<div data-ui="Tabs" data-variant="page"/)
    expect(markup).toContain('role="tablist" aria-label="My races sections"')
  })

  it('Upcoming: On your programme, el Panel que contesta a la 02 (§7.3)', () => {
    const programme = panel(page('/me/races'), 'On your programme')
    expect(programme).toMatch(
      /^<section data-ui="Panel" data-variant="default" data-state="ready" data-answer=""/,
    )
    expect(programme).toContain('Set orders')
  })

  it('lo pedido que espera su lista, en su Panel, y cada carrera, un enlace de 44', () => {
    const markup = page('/me/races', {
      freeAgent: true,
      races: [],
      entries: [enterable({ entered: true })],
    })
    const waiting = panel(markup, 'Entered — waiting for the start list')
    expect(waiting).toMatch(
      /<a data-ui="TextLink"[^>]*class="[^"]*\bmin-h-11\b[^"]*" href="\/world\/races\/race-jaen"/,
    )
  })

  it('Available to enter: el saldo, lo comprometido y lo pedido en Stat; lo comprometido, con su signo', () => {
    const markup = page('/me/races?tab=enter', {
      freeAgent: true,
      entries: [enterable({ entered: true }), enterable({ raceId: 'race-b', name: 'Race B' })],
    })
    const stats = [
      ...markup.matchAll(
        /<dl data-ui="Stat" data-variant="([a-z]+)"[\s\S]*?<dt[^>]*>([^<]+)<\/dt><dd[^>]*>([^<]+)<\/dd>/g,
      ),
    ].map((m) => `${m[2]}:${m[1]}:${m[3]}`)
    expect(stats).toEqual([
      'Balance:default:15,000',
      'Committed:signed:−1,200',
      'Entered:default:1',
    ])
    // en el teléfono, en un renglón que parte: `100,000` y `−12,000` no caben en media columna a 320
    expect(markup).toMatch(
      /<div class="flex flex-wrap gap-x-6 gap-y-3 sm:grid sm:grid-cols-3"><dl data-ui="Stat"/,
    )
  })

  it('sin nada comprometido, el cero sin signo ni rosa (captura 03)', () => {
    const markup = page('/me/races?tab=enter', { freeAgent: true, entries: [enterable({})] })
    expect(markup).toMatch(/<dt[^>]*>Committed<\/dt><dd class="[^"]*text-ink">0<\/dd>/)
  })

  it('la lista de lo que se puede pedir, el Panel que contesta a la 03 (§7.3)', () => {
    const markup = page('/me/races?tab=enter', { freeAgent: true, entries: [enterable({})] })
    const open = panel(markup, 'Still open')
    expect(open).toMatch(/^<section data-ui="Panel"[^>]*data-answer=""/)
    expect(open).toContain('Enter Race Jaén')
  })

  it('Results: una RankTable que contesta a la 37 (§7.3), con la carrera, su resultado y su puesto', () => {
    const markup = page('/me/races?tab=results')
    expect(markup).toMatch(/data-ui="RankTable"[^>]*data-answer=""/)
    expect(markup).toContain('>Race France</a>')
    expect(markup).not.toContain('<table class="w-full text-sm">')
  })

  it('el segundo renglón de cada carrera: su temporada y qué es su resultado (Season 1 · Overall)', () => {
    const markup = page('/me/races?tab=results')
    expect(markup).toMatch(
      /<span data-column="season" data-priority="secondary"[^>]*><span>Season 1<\/span>/,
    )
    expect(markup).toMatch(
      /<span data-column="result" data-priority="secondary"[^>]*><span>Overall<\/span>/,
    )
  })

  it('el puesto, con su tono (placeTone): la victoria en good y el resto en ink-2', () => {
    const win = page('/me/races?tab=results', { results: [result({ gcPuesto: 1 })] })
    expect(win).toMatch(
      /<td data-column="place"[^>]*><span class="font-bold text-good">1st<\/span><\/td>/,
    )
    const seventh = page('/me/races?tab=results')
    expect(seventh).toMatch(
      /<td data-column="place"[^>]*><span class="font-bold text-ink-2">7th<\/span><\/td>/,
    )
  })

  it('el desglose de etapas, plegado en un Disclosure de 44, con un enlace por etapa', () => {
    const markup = page('/me/races?tab=results')
    const disclosure =
      /<div data-ui="Disclosure"[\s\S]*?<\/ul><\/div><\/div>/.exec(markup)?.[0] ?? ''
    // la lista, dentro de lo plegado (la revisión del 21b: el regex de antes valía con ella fuera)
    expect(disclosure).toMatch(
      /aria-expanded="false"[\s\S]*?<\/button><div id="[^"]+" hidden=""><ul /,
    )
    // sin región: abiertos, todos se llamarían `Hide the stages` (APG; la revisión del 21b)
    expect(disclosure).not.toContain('role="region"')
    // y su botón, con el nombre de su carrera para el lector (la revisión del 21e)
    expect(disclosure).toMatch(/<button[^>]*aria-label="[^"]+, Race France"/)
    expect(disclosure).toContain('href="/world/races/race-france/stages/2"')
    expect(disclosure).toMatch(/>Stage 3 of 3</)
    expect(disclosure).toContain(
      '<span class="w-10 shrink-0 text-right font-semibold text-good">1st</span>',
    )
    expect(disclosure).toContain(
      '<span class="w-10 shrink-0 text-right font-semibold text-ink-2">12th</span>',
    )
  })

  it('lo plegado, debajo del segundo renglón (detail): Season 1 · Overall junto al nombre, y el desglose detrás', () => {
    const cell = /<th scope="row"[\s\S]*?<\/th>/.exec(page('/me/races?tab=results'))?.[0] ?? ''
    expect(cell).toMatch(
      /data-column="season"[\s\S]*data-column="result"[\s\S]*<\/span><\/span><div data-ui="Disclosure"/,
    )
    expect(cell).toMatch(/<div data-ui="Disclosure"[\s\S]*<\/ul><\/div><\/div><\/th>$/)
  })

  it('los resultados, las 20 primeras y Show all N (§6.1)', () => {
    const results = Array.from({ length: 25 }, (_, i) =>
      result({ raceId: `race-${i}`, raceName: `Race ${i}` }),
    )
    const markup = page('/me/races?tab=results', { results })
    expect(markup.match(/<th scope="row"/g)).toHaveLength(20)
    expect(markup).toContain('Show all 25')
  })

  it('una carrera de un día: su recorrido debajo del nombre, sin desglose, y lo que tengo por ver, en good', () => {
    const markup = page('/me/races?tab=results', {
      results: [
        result({
          isOneDay: true,
          stageCount: 1,
          gcPuesto: null,
          stagesToWatch: 1,
          stages: [{ stageDay: 1, puesto: 3, from: 'Jaén', to: 'Úbeda' }],
        }),
      ],
    })
    expect(markup).toContain(
      '<span data-ui="StageRoute" class="block text-meta text-ink-3">Jaén → Úbeda</span>',
    )
    expect(markup).toContain(
      '<span class="block text-meta font-semibold text-good">1 stage to watch</span>',
    )
    expect(markup).not.toContain('data-ui="Disclosure"')
  })

  it('una sola respuesta en cada estado de Upcoming: el programa, lo pedido o el vacío (§7.3)', () => {
    const respuestas = (m: string) => m.match(/data-answer=""/g)?.length ?? 0
    const both = page('/me/races', { freeAgent: true, entries: [enterable({ entered: true })] })
    expect(respuestas(both)).toBe(1)
    expect(panel(both, 'On your programme')).toContain('data-answer=""')
    const waiting = page('/me/races', {
      freeAgent: true,
      races: [],
      entries: [enterable({ entered: true })],
    })
    expect(respuestas(waiting)).toBe(1)
    expect(panel(waiting, 'Entered — waiting for the start list')).toMatch(
      /^<section data-ui="Panel"[^>]*data-answer=""/,
    )
    const nothing = page('/me/races', { races: [] })
    expect(respuestas(nothing)).toBe(1)
    expect(nothing).toMatch(/data-ui="EmptyState"[^>]*data-answer=""/)
  })

  it('en la inscripción y en los resultados, el vacío también contesta', () => {
    expect(page('/me/races?tab=enter', { freeAgent: true, entries: [] })).toMatch(
      /data-ui="EmptyState"[^>]*data-answer=""/,
    )
    expect(page('/me/races?tab=results', { results: [] })).toMatch(
      /data-ui="EmptyState"[^>]*data-answer=""/,
    )
  })
})
