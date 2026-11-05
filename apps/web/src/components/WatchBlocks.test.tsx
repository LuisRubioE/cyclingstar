import type { Calendar, CalendarRaceSummary, HorizonSummary } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { horizonKey } from '../queryClient'
import { cuantas, pieza } from '../pages/__fixtures__/markup'
import { healthWith, horizonWith } from '../pages/__fixtures__/world'
import { WatchBlocks } from './WatchBlocks'

/**
 * LA PORTADA BAJO EL VELO (E2, docs/retransmision.md §11.4; D-39, I-37, 11-q; paso 9b), en estático con la
 * caché ya llena (§16.6): el horizonte de quien mira, `/health` y el calendario público. Tres bloques, por
 * este orden: `Continue watching` (las etapas a medias), `Ready to watch` (las veladas de las carreras en
 * guardia que siguen en curso, una fila por carrera) y `While you were away` (las terminadas con etapas
 * veladas: el digest, `Key stages`, `Continue from stage 4` y `Show results`; el digest, desde el 10a).
 * Nada de lo que ve depende de lo que pasó en esas etapas.
 */

const REV = '200.4'

const stage = (index: number, kind: string) => ({
  index,
  name: `Stage ${index}`,
  label: kind === 'reina' ? 'Summit finish' : 'Flat',
  kind,
  km: kind === 'cri' ? 30 : 187,
  timeTrial: kind === 'cri',
  from: null,
  to: null,
})
const race = (
  id: string,
  name: string,
  startDay: number,
  kinds: readonly string[],
): CalendarRaceSummary => ({
  id,
  name,
  level: 'WT',
  raceClass: 'WT',
  championshipCountry: null,
  championshipCategory: null,
  country: 'FR',
  format: 'gran-vuelta',
  startDay,
  openTo: ['WT'],
  winner: null,
  restAfter: [],
  stages: kinds.map((k, i) => stage(i + 1, k)),
})
const KINDS = Array.from({ length: 21 }, (_, i) =>
  [12, 15, 18].includes(i + 1) ? 'reina' : i + 1 === 16 ? 'cri' : 'llana',
)
const calendar: Calendar = {
  races: [
    race('race-france', 'Race France', 185, KINDS),
    race('race-italy', 'Race Italy', 128, KINDS),
  ],
  dayOfSeason: 200,
}

function home(
  horizon: HorizonSummary,
  spoilerMode: 'on' | 'off' = 'on',
  broadcastWatch: 'on' | 'off' = 'on',
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith(broadcastWatch, spoilerMode, 200))
  client.setQueryData(['horizon'], horizon)
  client.setQueryData(horizonKey(['calendar'], horizon.rev), calendar)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <WatchBlocks />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const veiled = horizonWith({
  rev: REV,
  ready: [
    {
      raceKey: 'race-italy:s0',
      raceName: 'Race Italy',
      stages: Array.from({ length: 18 }, (_, i) => i + 4),
      reason: 'headline',
    },
    {
      raceKey: 'race-france:s0',
      raceName: 'Race France',
      stages: [10, 11, 12],
      reason: 'own_rider',
    },
  ],
  watching: [{ raceKey: 'race-france:s0', stageDay: 10, reachedS: 4200, toGoKm: 42 }],
})

describe('la portada bajo el velo (§11.4)', () => {
  it('Continue watching: la etapa a medias, con lo que le queda a la cabeza, que lleva a Watch', () => {
    const markup = home(veiled)
    expect(markup).toContain('Continue watching')
    expect(markup).toContain('Race France · Stage 10 · 42 km to go')
    expect(markup).toContain('href="/world/races/race-france/stages/10?tab=watch"')
  })

  it('Ready to watch: una fila por carrera en curso, con su cabecera, sus tarjetas y Your rider raced', () => {
    const markup = home(veiled)
    expect(markup).toContain('Ready to watch')
    expect(markup).toContain('Race France · 3 stages ready to watch')
    expect(markup).toContain('Stage 12 · 187 km · mountain stage')
    expect(markup).toContain('Your rider raced')
    expect(markup).toContain('href="/world/races/race-france/stages/11"')
    // y Highlights, que abre la etapa en su curva (10a). RE-SELLADO EN EL PR 20 (E3, docs/visual.md §14.6):
    // el enlace es un `Button` del catálogo, que lleva el texto dentro de su caja
    expect(markup).toMatch(
      /href="\/world\/races\/race-france\/stages\/11\?tab=watch&amp;view=highlights"[^>]*>[\s\S]*?Highlights[\s\S]*?<\/a>/,
    )
  })

  it('While you were away: el digest con sus minutos calculados, de la primera velada en orden (8-b; 10a)', () => {
    const markup = home(veiled)
    // de la 4 a la 21 del Giro: catorce llanas, tres reinas y una crono, 1.410 s, y 180 s de cuadros
    expect(markup).toContain('Watch the race in 27 minutes')
    expect(markup).toContain(
      'href="/world/races/race-italy/stages/4?tab=watch&amp;view=digest&amp;from=4&amp;to=21"',
    )
    // delante de Key stages (§11.4)
    expect(markup.indexOf('Watch the race in')).toBeLessThan(markup.indexOf('Key stages'))
  })

  it('con Watch apagado para quien mira (el velo encendido antes que Watch), ni Highlights ni el digest: llevarían a una etapa sin Watch', () => {
    const markup = home(veiled, 'on', 'off')
    expect(markup).toContain('Ready to watch')
    expect(markup).not.toContain('Highlights')
    expect(markup).not.toContain('Watch the race in')
    expect(markup).not.toContain('view=')
  })

  it('While you were away: la terminada, con Key stages, Continue from stage 4 y Show results', () => {
    const markup = home(veiled)
    expect(markup).toContain('While you were away')
    expect(markup).toContain('Race Italy · 18 stages ready to watch')
    expect(markup).toContain('Key stages')
    expect(markup).toContain('Continue from stage 4')
    expect(markup).toContain('href="/world/races/race-italy/stages/4"')
    expect(markup).toContain('Show results')
    // la terminada no se repite en Ready to watch (11-q)
    expect(markup.split('Race Italy').length - 1).toBe(1)
  })

  it('Key stages, el Button quiet del catálogo con aria-expanded, cerrado al entrar; ningún button a mano (ui/1)', () => {
    const markup = home(veiled)
    const key = pieza(markup, 'Button', 'Key stages')
    expect(key).toMatch(/^<button[^>]*data-variant="quiet"/)
    expect(key).toContain('aria-expanded="false"')
    expect(cuantas(markup, /<button(?![^>]*data-ui=)/)).toBe(0)
  })

  it('sin velo para quien mira (SPOILER_MODE apagado, o un jugador con admins), la portada de hoy: ningún bloque', () => {
    expect(home(horizonWith({ rev: 'world' }))).toBe('')
    expect(home(veiled, 'off')).toBe('')
  })

  it('la caducidad: una vez, Results of Race Italy are now shown (finished N days ago)', () => {
    const markup = home(horizonWith({ rev: REV, expiredSinceLastVisit: ['race-italy:s0'] }))
    // la 21 del Giro es el día 148; hoy, el 200: 52 días de juego, 13 reales
    expect(markup).toContain('Results of Race Italy are now shown (finished 13 days ago)')
  })
})

/**
 * UN SOLO PRIMARY POR CARRERA (E3, docs/visual.md §14.6; captura 17; PR 20): los botones de los bloques son
 * del catálogo, y en cada carrera solo uno es `primary`: el digest si lo hay, o `Watch`; en `Ready to
 * watch`, el `Watch` de la primera etapa velada. Hoy Race Jaén, de un día, llevaba dos: el digest y `Watch`.
 */
describe('la portada bajo el velo · un solo primary por carrera (§14.6)', () => {
  const jaen = race('race-jaen', 'Race Jaén', 150, ['media'])
  const conJaen = horizonWith({
    rev: REV,
    ready: [
      ...veiled.ready,
      { raceKey: 'race-jaen:s0', raceName: 'Race Jaén', stages: [1], reason: 'headline' },
    ],
    watching: veiled.watching,
  })
  const render = (h: HorizonSummary, broadcastWatch: 'on' | 'off' = 'on'): string => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['health'], healthWith(broadcastWatch, 'on', 200))
    client.setQueryData(['horizon'], h)
    client.setQueryData(horizonKey(['calendar'], h.rev), {
      ...calendar,
      races: [...calendar.races, jaen],
    })
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <WatchBlocks />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }
  /** El marcado de cada carrera, por su `data-race-block`. */
  const blocks = (markup: string): Map<string, string> => {
    const out = new Map<string, string>()
    const starts = [...markup.matchAll(/data-race-block="([^"]+)"/g)]
    starts.forEach((m, i) =>
      out.set(m[1]!, markup.slice(m.index, starts[i + 1]?.index ?? markup.length)),
    )
    return out
  }
  const primaries = (html: string): string[] =>
    [
      ...html.matchAll(/data-ui="Button" data-variant="primary"[^>]*>([\s\S]*?)<\/(?:a|button)>/g),
    ].map((m) => m[1]!.replace(/<[^>]+>/g, '').trim())

  it('cada carrera, con un solo primary: el digest; en la de un día, el digest y Watch secondary', () => {
    const b = blocks(render(conJaen))
    expect([...b.keys()].sort()).toEqual(['race-france:s0', 'race-italy:s0', 'race-jaen:s0'])
    expect(primaries(b.get('race-italy:s0')!)).toEqual(['Watch the race in 27 minutes'])
    expect(primaries(b.get('race-jaen:s0')!)).toHaveLength(1)
    expect(primaries(b.get('race-jaen:s0')!)[0]).toMatch(/^Watch the race in \d+ minutes?$/)
    expect(b.get('race-jaen:s0')!).toMatch(/data-variant="secondary"[^>]*>[\s\S]*?>Watch</)
  })

  it('el digest no pasa del ancho de su bloque: a 320 px parte en dos renglones y no se sale', () => {
    // `Watch the race in 27 minutes` en `body` 600 mide más que el bloque a 320 px, y `Button` no encoge
    // (`shrink-0`): sin tope, la comprobación 2 de la prueba del teléfono lo cuenta en las pantallas 17 y 30.
    const digest = /<a[^>]*data-variant="primary"[^>]*>(?=[\s\S]*?Watch the race in)/.exec(
      blocks(render(conJaen)).get('race-italy:s0')!,
    )
    expect(digest?.[0]).toContain('max-w-full')
  })

  it('en Continue watching y en Ready to watch a la vez, el primary de la carrera es Continue, en toda la portada', () => {
    // la revisión del 20: `blocks` corta desde el primer `data-race-block` y no veía `Continue watching`
    const markup = render(conJaen)
    const france = [...markup.matchAll(/<a[^>]*data-variant="primary"[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => tag.includes('/world/races/race-france/'))
    expect(france).toHaveLength(1)
    expect(france[0]).toContain('href="/world/races/race-france/stages/10?tab=watch"')
  })

  it('Ready to watch: el Watch de la primera etapa velada es el primary; las demás, secondary', () => {
    // sin la carrera en `Continue watching`, que si no lleva el primary (el caso de arriba)
    const france = blocks(render({ ...conJaen, watching: [] })).get('race-france:s0')!
    expect(primaries(france)).toEqual(['Watch'])
    expect(france.indexOf('data-variant="primary"')).toBeLessThan(
      france.indexOf('href="/world/races/race-france/stages/11"'),
    )
  })

  it('con Watch apagado, sin digest, el Watch de la de un día es el primary', () => {
    const jaenOff = blocks(render(conJaen, 'off')).get('race-jaen:s0')!
    expect(jaenOff).not.toContain('Watch the race in')
    expect(primaries(jaenOff)).toEqual(['Watch'])
  })
})
