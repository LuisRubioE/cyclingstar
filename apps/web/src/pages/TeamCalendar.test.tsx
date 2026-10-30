import type {
  Calendar,
  CalendarRaceSummary,
  TeamCalendar as TeamCalendarData,
  TeamCalendarRace,
  TeamPlanRace,
  TeamRacePlan,
  UpcomingRace,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { horizonKey } from '../queryClient'
import { TeamCalendar } from './TeamCalendar'
import { healthWith, horizonWith } from './__fixtures__/world'

/**
 * EL CALENDARIO DEL EQUIPO CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21c), en estático
 * con la caché ya llena. Sus dos caras: la del mánager, con el plan en el `Panel` que contesta a la 15
 * (§7.3) y arriba, y las cifras en `Stat` con el dinero de `money`; y la del miembro, de solo lectura, con
 * cada carrera en una `ActionRow`, `Winner` en lugar del `🏆` (3-d) y las 20 primeras con `Show all N`.
 */

const REV = '200.1'

const race = (over: Partial<TeamCalendarRace>): TeamCalendarRace => ({
  raceId: 'race-ardeche',
  name: 'Race Ardèche',
  country: 'FR',
  startDay: 259,
  level: 'continental',
  raceClass: '1',
  format: 'un-dia',
  travelPerRider: 48,
  squad: 7,
  drafted: true,
  natural: true,
  travelTier: 'continental',
  ...over,
})

const calendar = (over: Partial<TeamCalendarData> = {}): TeamCalendarData => ({
  teamId: 'team-1',
  teamName: 'Noord Cycling',
  teamCountry: 'NL',
  budget: 1234567,
  weeklyIncome: 12000,
  weeklyWages: 9000,
  weeklyNet: 3000,
  races: [
    race({}),
    race({ raceId: 'race-b', name: 'Race B', travelPerRider: 2412, squad: 7, drafted: true }),
    race({ raceId: 'race-c', name: 'Race C', drafted: false, natural: false }),
  ],
  ...over,
})

const planRace = (over: Partial<TeamPlanRace>): TeamPlanRace => ({
  raceId: 'race-ardeche',
  name: 'Race Ardèche',
  country: 'FR',
  startDay: 259,
  level: 'continental',
  raceClass: '1',
  format: 'un-dia',
  attending: true,
  natural: true,
  ...over,
})

const plan = (races: TeamPlanRace[]): TeamRacePlan => ({
  teamId: 'team-1',
  teamName: 'Noord Cycling',
  teamCountry: 'NL',
  division: 'continental',
  races,
})

const publicRace = (over: Partial<CalendarRaceSummary>): CalendarRaceSummary => ({
  id: 'race-ardeche',
  name: 'Race Ardèche',
  level: 'CON',
  raceClass: '1',
  championshipCountry: null,
  championshipCategory: null,
  country: 'FR',
  format: 'un-dia',
  startDay: 259,
  openTo: ['CON'],
  winner: null,
  restAfter: [],
  stages: [
    {
      index: 1,
      name: 'Stage 1',
      label: 'Stage 1',
      kind: 'llana',
      km: 180,
      timeTrial: false,
      from: 'Privas',
      to: 'Aubenas',
    },
  ],
  ...over,
})

function page({
  draft = calendar(),
  member = null,
  publicCalendar = { races: [], dayOfSeason: 200 },
  upcoming = [],
  ready = [],
  loading,
}: {
  draft?: TeamCalendarData | null
  member?: TeamRacePlan | null
  publicCalendar?: Calendar
  upcoming?: UpcomingRace[]
  ready?: { raceKey: string; stages: number[] }[]
  /** la consulta que se queda sin datos: su espera (la revisión del 21c) */
  loading?: 'draft' | 'plan' | 'calendar'
} = {}): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'on'))
  client.setQueryData(
    ['horizon'],
    horizonWith({
      rev: REV,
      ready: ready.map((r) => ({ ...r, raceName: 'Race', reason: 'own_team' as const })),
    }),
  )
  if (loading !== 'draft') client.setQueryData(horizonKey(['team-calendar'], REV), draft)
  if (loading !== 'plan') client.setQueryData(['team-race-plan'], member)
  if (loading !== 'calendar') client.setQueryData(horizonKey(['calendar'], REV), publicCalendar)
  client.setQueryData(horizonKey(['rider', 'upcoming'], REV), upcoming)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/team/calendar']}>
        <TeamCalendar />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El `Panel` del catálogo que lleva ese título, entero. */
const panel = (markup: string, title: string): string =>
  new RegExp(
    `<section data-ui="Panel"[^>]*>(?:(?!</section>)[\\s\\S])*?>${title}</h2>[\\s\\S]*?</section>`,
  ).exec(markup)?.[0] ?? ''

/** Las `Stat` de un trozo, como `rótulo:variante:cifra`. */
const stats = (markup: string): string[] =>
  [
    ...markup.matchAll(
      /<dl data-ui="Stat" data-variant="([a-z]+)"[\s\S]*?<dt[^>]*>([^<]+)<\/dt><dd[^>]*>([^<]+)<\/dd>/g,
    ),
  ].map((m) => `${m[2]}:${m[1]}:${m[3]}`)

const filas = (markup: string): number => markup.match(/<li data-ui="ActionRow"/g)?.length ?? 0

/** Cuántos elementos dicen ser la respuesta de la pantalla (§7.3): uno, y no más. */
const respuestas = (markup: string): number => markup.match(/data-answer=""/g)?.length ?? 0

/** La fila de una carrera, entera. */
const fila = (markup: string, name: string): string =>
  new RegExp(`<li data-ui="ActionRow"(?:(?!</li>)[\\s\\S])*?${name}[\\s\\S]*?</li>`).exec(
    markup,
  )?.[0] ?? ''

describe('el calendario del mánager (§17.21; PR 21c)', () => {
  it('la cabecera, un PageHeader con el equipo y su país en la línea de estado', () => {
    const markup = page()
    expect(markup).toMatch(/<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>Race calendar<\/h1>/)
    expect(markup).toContain('>Noord Cycling · based in Netherlands</p>')
  })

  it('el plan, el Panel que contesta a la 15 (§7.3), y antes que el presupuesto', () => {
    const markup = page()
    expect(panel(markup, 'Race plan')).toMatch(
      /^<section data-ui="Panel" data-variant="default" data-state="ready" data-answer=""/,
    )
    expect(markup.indexOf('>Race plan</h2>')).toBeLessThan(markup.indexOf('>Team budget</h2>'))
  })

  it('las cifras del plan en Stat, y el coste con sus comas: 17,220 y no 17220', () => {
    // los dos planeados: 48 × 7 y 2.412 × 7
    expect(stats(panel(page(), 'Race plan'))).toEqual([
      'Races planned:default:2',
      'Planned travel cost:default:17,220',
    ])
  })

  it('el presupuesto y la semana en Stat: los ingresos con su +, los sueldos con su − y el neto con su signo', () => {
    expect(stats(panel(page(), 'Team budget'))).toEqual([
      'Budget:default:1,234,567',
      'Weekly income:signed:+12,000',
      'Weekly wages:signed:−9,000',
      'Weekly net:signed:+3,000',
    ])
    expect(stats(panel(page({ draft: calendar({ weeklyNet: -500 }) }), 'Team budget'))).toContain(
      'Weekly net:signed:−500',
    )
  })

  it('las cifras de dinero, en un renglón que parte en el teléfono: 6,173,210 en display no cabe en media columna a 320', () => {
    const budget = panel(page(), 'Team budget')
    expect(budget).toMatch(
      /<div class="flex flex-wrap gap-x-6 gap-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-4"><dl data-ui="Stat"/,
    )
    expect(panel(page(), 'Race plan')).toMatch(
      /<div class="flex flex-wrap gap-x-6 gap-y-3 sm:grid sm:grid-cols-2"><dl data-ui="Stat"/,
    )
  })

  it('el viaje caro, con su porqué en un InfoButton', () => {
    const markup = page({
      draft: calendar({ races: [race({ travelTier: 'intercontinental', country: 'AU' })] }),
    })
    expect(panel(markup, 'Race plan')).toContain('Overseas races cost more.')
    expect(panel(markup, 'Race plan')).toMatch(/data-ui="InfoButton"/)
  })

  it('cada carrera del plan, con su botón según esté: Drop la que va, Add la que no, con el nombre entero y su enlace (la revisión del 21c)', () => {
    const markup = page()
    const va = fila(markup, 'Race Ardèche')
    expect(va).toMatch(/<a [^>]*href="\/world\/races\/race-ardeche"/)
    expect(va).toMatch(/<button[^>]*aria-label="Drop Race Ardèche"[\s\S]*?>Drop</)
    expect(fila(markup, 'Race C')).toMatch(/<button[^>]*aria-label="Add Race C"[\s\S]*?>Add</)
  })

  it('una sola respuesta, con carreras y sin ellas: el plan (§7.3)', () => {
    expect(respuestas(page())).toBe(1)
    const vacio = page({ draft: calendar({ races: [] }) })
    expect(respuestas(vacio)).toBe(1)
    expect(panel(vacio, 'Race plan')).toMatch(/^<section data-ui="Panel"[^>]*data-answer=""/)
  })

  it('las 20 primeras filas del plan y Show all N', () => {
    const races = Array.from({ length: 25 }, (_, i) =>
      race({ raceId: `race-${i}`, name: `Race ${i}` }),
    )
    const markup = page({ draft: calendar({ races }) })
    expect(filas(markup)).toBe(20)
    expect(markup).toContain('Show all 25')
  })
})

describe('el calendario del miembro (§17.21; PR 21c)', () => {
  const member = (races: TeamPlanRace[], over: Parameters<typeof page>[0] = {}) =>
    page({ draft: null, member: plan(races), ...over })

  it('la cabecera, el mismo PageHeader, y las que quedan en su Panel, la respuesta de la vista', () => {
    const markup = member([planRace({})])
    expect(markup).toMatch(/<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>Race calendar<\/h1>/)
    expect(markup).toContain('>Noord Cycling · based in Netherlands</p>')
    const ahead = panel(markup, 'Still to come \\(1\\)')
    expect(ahead).toMatch(/^<section data-ui="Panel"[^>]*data-answer=""/)
    expect(ahead).toContain('Race Ardèche')
  })

  it('cada carrera, una ActionRow que enlaza a su ficha: el día, el país, el formato y si es de casa', () => {
    const row = /<li data-ui="ActionRow"[\s\S]*?<\/li>/.exec(member([planRace({})]))?.[0] ?? ''
    expect(row).toMatch(/<a [^>]*href="\/world\/races\/race-ardeche"/)
    expect(row).toContain('Day 259 · FR · One-day · Home race')
  })

  it('la que corro, con su Chip You ride junto al nombre, dentro del enlace, y solo ella (la revisión del 21c)', () => {
    const upcoming = [{ raceId: 'race-ardeche' } as UpcomingRace]
    const markup = member([planRace({}), planRace({ raceId: 'race-b', name: 'Race B' })], {
      upcoming,
    })
    expect(fila(markup, 'Race Ardèche')).toMatch(
      /<a [^>]*>(?:(?!<\/a>)[\s\S])*data-ui="Chip"[^>]*>(?:<[^>]+>)*You ride<[\s\S]*?<\/a>/,
    )
    expect(fila(markup, 'Race B')).not.toContain('You ride')
  })

  it('solo las carreras a las que va el equipo, y lo que queda, también con las 20 primeras y Show all N', () => {
    const races = Array.from({ length: 25 }, (_, i) =>
      planRace({ raceId: `race-${i}`, name: `Race ${i}`, startDay: 250 + i }),
    )
    const markup = member([
      ...races,
      planRace({ raceId: 'race-x', name: 'Race X', attending: false }),
    ])
    const ahead = panel(markup, 'Still to come \\(25\\)')
    expect(filas(ahead)).toBe(20)
    expect(ahead).toContain('Show all 25')
    expect(markup).not.toContain('Race X')
  })

  it('lo ya corrido, de lo más reciente a lo más viejo, y sin nada por venir, el vacío en su Panel', () => {
    const markup = member([
      planRace({ raceId: 'race-old', name: 'Race Old', startDay: 110 }),
      planRace({ raceId: 'race-new', name: 'Race New', startDay: 120 }),
    ])
    const past = panel(markup, 'Already raced \\(2\\)')
    expect(past.indexOf('Race New')).toBeLessThan(past.indexOf('Race Old'))
    expect(panel(markup, 'Still to come \\(0\\)')).toContain('The season is over')
  })

  it('una sola respuesta en la vista del miembro: lo que queda (§7.3)', () => {
    expect(respuestas(member([planRace({}), planRace({ raceId: 'race-p', startDay: 120 })]))).toBe(
      1,
    )
  })

  it('el ganador, con la palabra Winner y sin el 🏆 (3-d)', () => {
    const markup = member([planRace({ startDay: 120 })], {
      publicCalendar: { races: [publicRace({ winner: 'Sander Wouters' })], dayOfSeason: 200 },
    })
    expect(markup).toMatch(/>Winner<\/span> Sander Wouters/)
    expect(markup).not.toContain('🏆')
  })

  it('la final que no he visto: Finished · ready to watch (la API ya no manda su ganador)', () => {
    const markup = member([planRace({ startDay: 120 })], {
      publicCalendar: { races: [publicRace({})], dayOfSeason: 200 },
      ready: [{ raceKey: 'race-ardeche:s0', stages: [1] }],
    })
    expect(markup).toMatch(/<span class="[^"]*text-good[^"]*">Finished · ready to watch<\/span>/)
  })

  it('lo ya corrido, en su Panel, con las 20 primeras y Show all N, y sin el gris de la opacidad', () => {
    const races = Array.from({ length: 25 }, (_, i) =>
      planRace({ raceId: `race-${i}`, name: `Race ${i}`, startDay: 100 + i }),
    )
    const markup = member(races)
    const past = panel(markup, 'Already raced \\(25\\)')
    expect(filas(past)).toBe(20)
    expect(past).toContain('Show all 25')
    expect(markup).not.toContain('opacity-60')
  })
})

describe('sin equipo (§17.21; PR 21c)', () => {
  it('la cabecera y su vacío, con la salida a My races', () => {
    const markup = page({ draft: null, member: null })
    expect(markup).toMatch(/<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>Race calendar<\/h1>/)
    expect(markup).toMatch(/data-ui="EmptyState"[^>]*data-answer=""/)
    expect(respuestas(markup)).toBe(1)
    expect(markup).toMatch(/href="\/me\/races"/)
  })
})

describe('las esperas, con su respuesta y con el alto de sus filas (la revisión del 21c)', () => {
  it('mientras llega el plan del mánager, el del equipo o el calendario: una respuesta, y filas de 64', () => {
    for (const [loading, over] of [
      ['draft', {}],
      ['plan', { draft: null }],
      ['calendar', { draft: null, member: plan([planRace({})]) }],
    ] as const) {
      const markup = page({ loading, ...over })
      expect(respuestas(markup), loading).toBe(1)
      expect(markup, loading).toContain('h-16')
      expect(markup, loading).not.toContain('h-11')
    }
  })
})
