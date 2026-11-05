import type { Calendar, CalendarRaceSummary, CalendarStageSummary } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { championshipsByNation } from '../domain/raceTimeline'
import { raceKeyOn } from '../domain/veil'
import { horizonKey } from '../queryClient'
import { NationalChampionships, RacesIndex } from './RacesIndex'
import { healthWith, horizonWith } from './__fixtures__/world'

/**
 * EL ÍNDICE DE CARRERAS CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21e), en estático con
 * la caché ya llena: la cabecera en `PageHeader`; un solo `Panel` que contesta a la 20 (§7.3), con el
 * buscador y los dos filtros dentro, en `Field` con su rótulo a la vista; cada carrera en una `ActionRow`
 * que enlaza a su ficha, con `Winner` en lugar del `🏆` (3-d) y sus etapas plegadas tras un `Disclosure`
 * sin región, cada una con la palabra de su tipo (D-13); hoy, `Day 50` y no `GD 50`; las 20 primeras de lo
 * que viene con `Show all N` (§6.1); y los campeonatos, cada prueba en un enlace de 44 y sin `title`.
 */

const REV = '200.1'
const HOY = 50

const stage = (index: number, over: Partial<CalendarStageSummary> = {}): CalendarStageSummary => ({
  index,
  name: `Stage ${index}`,
  label: 'Flat',
  kind: 'llana',
  km: 180,
  timeTrial: false,
  from: 'Valencia',
  to: 'Castellón',
  ...over,
})

const race = (over: Partial<CalendarRaceSummary>): CalendarRaceSummary => ({
  id: 'race-x',
  name: 'Race X',
  level: 'CON',
  raceClass: '1',
  championshipCountry: null,
  championshipCategory: null,
  country: 'FR',
  format: 'un-dia',
  startDay: 60,
  openTo: ['CON'],
  winner: null,
  restAfter: [],
  stages: [stage(1, { label: 'Classic', kind: 'clasica', km: 200, from: 'Lille', to: 'Roubaix' })],
  ...over,
})

/** Una vuelta de cinco etapas ya corrida, con su descanso tras la tercera y su crono en la cuarta. */
const valencia = race({
  id: 'race-valencia',
  name: 'Race Valencia',
  level: 'PRS',
  raceClass: 'Pro',
  country: 'ES',
  format: 'una-semana',
  startDay: 30,
  openTo: ['WT', 'PRS'],
  winner: 'José Quintáns',
  restAfter: [3],
  stages: [
    stage(1),
    stage(2, { label: 'Hilly', kind: 'media', km: 160 }),
    stage(3, { label: 'Summit finish', kind: 'reina', km: 150 }),
    stage(4, { label: 'Time trial', kind: 'cri', km: 25, timeTrial: true }),
    stage(5, { km: 175 }),
  ],
})

/** De un día, corrida, con la final en el velo de quien mira. */
const jaen = race({ id: 'race-jaen', name: 'Race Jaén', country: 'ES', startDay: 45 })

/** En curso: sale el 48 y acaba el 52. */
const romandie = race({
  id: 'race-romandie',
  name: 'Race Romandie',
  level: 'WT',
  raceClass: 'WT',
  country: 'CH',
  format: 'una-semana',
  startDay: 48,
  openTo: ['WT'],
  stages: [stage(1), stage(2), stage(3), stage(4), stage(5)],
})

/** Ocho corridas antes, para que dos queden plegadas tras las ocho recientes (`RECENT_WINDOW`). */
const early = Array.from({ length: 8 }, (_, i) =>
  race({ id: `race-early-${i + 1}`, name: `Race Early ${i + 1}`, startDay: i + 1 }),
)

/** Veintidós por venir: con la que está en curso, 23 tras el marcador de hoy. */
const next = Array.from({ length: 22 }, (_, i) =>
  race({ id: `race-next-${51 + i}`, name: `Race Next ${51 + i}`, startDay: 51 + i }),
)

/** Las cuatro pruebas del campeonato de una nación: la crono el primer día y la ruta el tercero. */
const championship = (code: string, country: string, day: number): CalendarRaceSummary[] =>
  (
    [
      ['ITT', 'elite', day],
      ['ITT', 'u23', day],
      ['Road', 'elite', day + 2],
      ['Road', 'u23', day + 2],
    ] as const
  ).map(([discipline, category, startDay]) =>
    race({
      id: `nc-${code.toLowerCase()}-${category}-${discipline.toLowerCase()}`,
      name: `${country} ${category === 'u23' ? 'U23 ' : ''}${discipline} Championship`,
      level: 'CON',
      raceClass: 'NC',
      championshipCountry: code,
      championshipCategory: category,
      country: code,
      startDay,
      stages: [
        stage(1, { timeTrial: discipline === 'ITT', kind: discipline === 'ITT' ? 'cri' : 'llana' }),
      ],
    }),
  )

const RACES: CalendarRaceSummary[] = [
  ...early,
  valencia,
  jaen,
  romandie,
  ...next,
  ...championship('ES', 'Spain', 170),
  ...championship('FR', 'France', 171),
]

function page({
  races = RACES,
  dayOfSeason = HOY,
  loading = false,
}: { races?: CalendarRaceSummary[]; dayOfSeason?: number | null; loading?: boolean } = {}): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'on'))
  client.setQueryData(
    ['horizon'],
    horizonWith({
      rev: REV,
      ready: [
        {
          raceKey: raceKeyOn('race-jaen', 200) ?? '',
          stages: [1],
          raceName: 'Race Jaén',
          reason: 'own_team',
        },
      ],
    }),
  )
  const calendar: Calendar = { races, dayOfSeason }
  if (!loading) client.setQueryData(horizonKey(['calendar'], REV), calendar)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/world/races']}>
        <RacesIndex />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El `Panel` del catálogo que lleva ese título, entero. */
const panel = (markup: string, title: string): string =>
  new RegExp(
    `<section data-ui="Panel"[^>]*>(?:(?!</section>)[\\s\\S])*?>${title}</h2>[\\s\\S]*?</section>`,
  ).exec(markup)?.[0] ?? ''

/** Cuántos elementos dicen ser la respuesta de la pantalla (§7.3): uno, y no más. */
const respuestas = (markup: string): number => markup.match(/data-answer=""/g)?.length ?? 0

/**
 * Las filas de carrera, cada una hasta la siguiente o hasta el cierre de su lista: llevan dentro su desglose,
 * con un `<li>` por etapa, así que no acaban en el primer `</li>`.
 */
const filas = (markup: string): string[] =>
  markup
    .split('<li data-ui="ActionRow"')
    .slice(1)
    .map((f) => f.split('</ul>')[0] ?? '')

/** La fila de una carrera, por su nombre, que va delante de su clase. */
const fila = (markup: string, name: string): string =>
  filas(markup).find((f) => f.includes(`>${name} <span`)) ?? ''

describe('el índice de carreras con el sistema (§17.21; PR 21e)', () => {
  it('la cabecera, un PageHeader con el h1 de siempre, y sin la barra de sección de antes', () => {
    const markup = page()
    expect(markup).toMatch(/<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>Races<\/h1>/)
    expect(markup).toContain('The season in order, with today marked')
    expect(markup).not.toContain('bg-brand-navy')
  })

  it('una sola respuesta, la de la 20 (§7.3): el Panel de la línea temporal, con todas las que pasan el filtro', () => {
    const markup = page()
    expect(respuestas(markup)).toBe(1)
    // 8 + 2 corridas, la que está en curso y 22 por venir; los campeonatos, aparte
    expect(panel(markup, 'Season timeline \\(33\\)')).toMatch(
      /^<section data-ui="Panel" data-variant="default" data-state="ready" data-answer=""/,
    )
  })

  it('el buscador y los dos filtros, Field con su rótulo a la vista y dentro del Panel que contesta, y no las pestañas de antes', () => {
    const answer = panel(page(), 'Season timeline \\(33\\)')
    expect(answer).toMatch(/<label for="races-search"[^>]*>Search races<\/label>/)
    expect(answer).toMatch(/<input id="races-search"[^>]*type="search"/)
    expect(answer).toContain('placeholder="Search by race, country code or winner…"')
    expect(answer).toMatch(/<label for="races-class"[^>]*>Race class<\/label>/)
    expect(answer).toMatch(/<label for="races-format"[^>]*>Race format<\/label>/)
    const opciones = (id: string) =>
      [
        ...(new RegExp(`<select id="${id}"[\\s\\S]*?</select>`).exec(answer)?.[0] ?? '').matchAll(
          /<option value="([^"]+)"[^>]*>([^<]+)<\/option>/g,
        ),
      ].map((m) => `${m[1]}:${m[2]}`)
    expect(opciones('races-class')).toEqual([
      'all:All',
      'WT:WorldTour',
      'Pro:ProSeries',
      'CON:Continental',
      'NC:Championships',
    ])
    expect(opciones('races-format')).toEqual([
      'all:Any format',
      'gran-vuelta:Grand tours',
      'una-semana:Stage races',
      'un-dia:One-day',
    ])
    expect(answer).not.toContain('sr-only')
    expect(answer).not.toContain('role="tablist"')
  })

  it('cada carrera, una ActionRow que enlaza a su ficha: el nombre y su clase, y el día, el país y el formato', () => {
    const row = fila(page(), 'Race Valencia')
    expect(row).toMatch(/<a [^>]*href="\/world\/races\/race-valencia"/)
    expect(row).toMatch(
      />Race Valencia <span class="[^"]*text-ink-3[^"]*">\.Pro · 5 stages<\/span>/,
    )
    expect(row).toContain('>Day 30 · ES · Stage race')
    const oneDay = fila(page(), 'Race Next 51')
    expect(oneDay).toMatch(/>Race Next 51 <span class="[^"]*">\.1<\/span>/)
    expect(oneDay).toContain('>Day 51 · in 1 day · FR · One-day')
    expect(page()).not.toContain('View full race')
  })

  it('el ganador, con la palabra Winner y sin el 🏆 (3-d)', () => {
    const markup = page()
    expect(fila(markup, 'Race Valencia')).toMatch(/>Winner<\/span> José Quintáns/)
    expect(markup).not.toContain('🏆')
  })

  it('la final que no he visto, Finished · ready to watch, y la que está en curso, Racing now, en good', () => {
    const markup = page()
    expect(fila(markup, 'Race Jaén')).toMatch(
      /<span class="[^"]*text-good[^"]*">Finished · ready to watch<\/span>/,
    )
    expect(fila(markup, 'Race Romandie')).toMatch(
      /<span class="[^"]*text-good[^"]*">Racing now<\/span>/,
    )
    expect(fila(markup, 'Race Next 51')).not.toMatch(/Racing now|ready to watch|Winner|—/)
  })

  it('las etapas, plegadas tras un Disclosure sin región: abiertos, se llamarían todos igual', () => {
    const markup = page()
    const row = fila(markup, 'Race Valencia')
    // a todo lo ancho de la fila, y no del ancho de su botón: `extra` es un renglón que parte
    expect(row).toMatch(/<div data-extra=""[^>]*><div data-ui="Disclosure"[^>]*class="grid w-full"/)
    expect(row).toContain('>Show the 5 stages<')
    expect(fila(markup, 'Race Next 51')).toContain('>Show the route<')
    expect(markup).not.toContain('role="region"')
    // las etapas, dentro de lo plegado y no a su lado (la revisión del 21e: el test valía con ellas fuera)
    expect(row).toMatch(
      /aria-expanded="false"[\s\S]*?<\/button><div id="[^"]+" hidden=""><div [^>]*><p [^>]*>690 km total/,
    )
  })

  it('cada desglose, con el nombre de su carrera para el lector: son veinte botones con el mismo texto (la revisión del 21e)', () => {
    const markup = page()
    expect(fila(markup, 'Race Valencia')).toContain('aria-label="Show the 5 stages, Race Valencia"')
    expect(fila(markup, 'Race Next 51')).toContain('aria-label="Show the route, Race Next 51"')
  })

  it('cada etapa, con la palabra de su tipo a la vista (D-13), su recorrido y sus km; el descanso; y la vuelta entera', () => {
    const row = fila(page(), 'Race Valencia')
    expect(row).toContain('690 km total · open to WT, PRS')
    expect(row).toMatch(
      />Stage 3<\/span><span class="text-caption text-ink-3">Summit finish<\/span>/,
    )
    expect(row).toMatch(/>Stage 4<\/span><span class="text-caption text-ink-3">Time trial<\/span>/)
    expect(row).toContain('>Valencia → Castellón<')
    expect(row).toContain('>150 km<')
    expect(row).toMatch(/>ITT<\/span>/)
    expect(row.indexOf('>Stage 3<')).toBeLessThan(row.indexOf('Rest day'))
    expect(row.indexOf('Rest day')).toBeLessThan(row.indexOf('>Stage 4<'))
    // la de un día no numera su etapa: la etapa es la carrera
    const oneDay = fila(page(), 'Race Next 51')
    expect(oneDay).toContain('>Classic<')
    expect(oneDay).not.toContain('Stage 1')
  })

  it('hoy, con su día de la temporada: Today · Day 50, y nunca GD', () => {
    const markup = page()
    expect(markup).toContain('>Today · Day 50</p>')
    expect(markup).not.toContain('GD ')
    // entre lo corrido y lo que viene
    expect(markup.indexOf('Race Jaén')).toBeLessThan(markup.indexOf('Today · Day 50'))
    expect(markup.indexOf('Today · Day 50')).toBeLessThan(markup.indexOf('Race Romandie'))
  })

  it('el pasado lejano, plegado tras un Button quiet a todo lo ancho, sin flechas de texto', () => {
    const markup = page()
    expect(markup).toMatch(
      /<button type="button" data-ui="Button" data-variant="quiet"[^>]*class="[^"]*w-full[^"]*"[^>]*>(?:<[^>]+>)*Show 2 earlier races</,
    )
    expect(markup).not.toMatch(/[↑↓]/)
    expect(markup).not.toContain('Race Early 2 <span')
    expect(markup).toContain('Race Early 3 <span')
  })

  it('las 20 primeras de lo que viene y Show all N (§6.1), y lo corrido sin el gris de la opacidad', () => {
    const markup = page()
    // las ocho recientes, y las 20 de lo que viene: la que está en curso y de la 51 a la 69
    expect(filas(markup)).toHaveLength(28)
    expect(markup).toContain('Race Next 69 <span')
    expect(markup).not.toContain('Race Next 70 <span')
    expect(markup).toMatch(/data-ui="ShowAllRows"[\s\S]*?Show all 23</)
    expect(markup).not.toContain('opacity-60')
  })

  it('sin mundo, ni hoy ni pasado: las 20 primeras y Show all N', () => {
    const markup = page({ dayOfSeason: null })
    expect(markup).not.toContain('Today')
    expect(markup).not.toContain('earlier race')
    expect(filas(markup)).toHaveLength(20)
    expect(markup).toContain('Show all 33')
  })

  it('ningún title (ui/4)', () => {
    expect(page()).not.toMatch(/\stitle="/)
  })

  it('sin carreras, el vacío dentro del Panel que contesta', () => {
    const markup = page({ races: [] })
    expect(respuestas(markup)).toBe(1)
    expect(panel(markup, 'Season timeline \\(0\\)')).toContain('No race matches that search.')
  })

  it('mientras llega el calendario: una respuesta, y filas de 64', () => {
    const markup = page({ loading: true })
    expect(respuestas(markup)).toBe(1)
    expect(markup).toContain('h-16')
  })
})

describe('los campeonatos nacionales con el sistema (§17.21; PR 21e)', () => {
  const nacionales = (
    races: CalendarRaceSummary[],
    hidden: (race: CalendarRaceSummary) => boolean = () => false,
  ): string =>
    renderToStaticMarkup(
      <MemoryRouter>
        <NationalChampionships nations={championshipsByNation(races)} today={HOY} hidden={hidden} />
      </MemoryRouter>,
    )
  const spain = championship('ES', 'Spain', 170)

  it('cada nación, con su bandera y su nombre, y sus días con su Day, y nunca GD', () => {
    const markup = nacionales(spain)
    expect(markup).toMatch(/<span aria-hidden="true"><span data-ui="Flag"[^>]*aria-label="Spain"/)
    expect(markup).toMatch(/<\/span><\/span>Spain<\/p>/)
    expect(markup).toContain('>Day 170<')
    expect(markup).toContain('>Day 172<')
    expect(markup).not.toContain('GD ')
  })

  it('cada prueba, un enlace de 44 a su ficha, en el orden de su día', () => {
    const markup = nacionales(spain)
    const enlaces = [...markup.matchAll(/<a ([^>]*)>([^<]+)<\/a>/g)].map(
      ([, attrs = '', text]) => ({
        text,
        href: /href="([^"]+)"/.exec(attrs)?.[1],
        ui: /data-ui="([^"]+)"/.exec(attrs)?.[1],
        cls: /class="([^"]+)"/.exec(attrs)?.[1] ?? '',
      }),
    )
    expect(enlaces.map((e) => `${e.text}:${e.href}`)).toEqual([
      'ITT:/world/races/nc-es-elite-itt',
      'U23 ITT:/world/races/nc-es-u23-itt',
      'Road:/world/races/nc-es-elite-road',
      'U23 Road:/world/races/nc-es-u23-road',
    ])
    for (const e of enlaces) {
      expect(e.ui, e.text).toBe('TextLink')
      expect(e.cls, e.text).toContain('min-h-11')
      // y 44 de ancho: `ITT` mide 20, y fuera de una frase es un control (la revisión del 21e)
      expect(e.cls, e.text).toContain('min-w-11')
    }
  })

  it('el ganador tras Winner, sin la copa ni el title de antes; y la final velada, Finished · ready to watch', () => {
    const [itt, u23itt, road, u23road] = spain
    const markup = nacionales(
      [{ ...itt!, winner: 'Juan Pérez' }, u23itt!, road!, u23road!],
      (r) => r.id === 'nc-es-elite-road',
    )
    expect(markup).toMatch(
      />ITT<\/a><span class="[^"]*"><span class="text-ink-3">Winner<\/span> Juan Pérez<\/span>/,
    )
    expect(markup).toMatch(
      />Road<\/a><span class="[^"]*text-good[^"]*">Finished · ready to watch<\/span>/,
    )
    expect(markup).not.toContain('🏆')
    expect(markup).not.toMatch(/\stitle="/)
  })

  it('el intervalo de los campeonatos, de la primera prueba a la última, con su frase de siempre (la revisión del 21e: contaba solo la ruta)', () => {
    const markup = nacionales([...spain, ...championship('FR', 'France', 171)])
    expect(markup).toContain('Day 170 to Day 173 · Elite &amp; U23, road and time trial')
    // todas el mismo día, un día y no un intervalo
    const unDia = championship('ES', 'Spain', 170).map((r) => ({ ...r, startDay: 170 }))
    expect(nacionales(unDia)).toContain('>Day 170 · Elite &amp; U23')
  })

  it('las 20 primeras naciones y Show all N', () => {
    const muchas = Array.from({ length: 25 }, (_, i) =>
      championship(`X${String.fromCharCode(65 + i)}`, `Nation ${i}`, 100 + i),
    ).flat()
    const markup = nacionales(muchas)
    expect(markup.match(/<li class="[^"]*"><p class="[^"]*">/g)).toHaveLength(20)
    expect(markup).toMatch(/data-ui="ShowAllRows"[\s\S]*?Show all 25</)
  })

  it('sin campeonatos que casen, su vacío', () => {
    expect(nacionales([])).toContain('No national championships match that search.')
  })
})
