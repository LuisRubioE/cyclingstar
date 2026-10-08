import type { Calendar, CalendarRaceSummary, HorizonSummary } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { horizonKey } from '../queryClient'
import { healthWith, horizonWith } from '../pages/__fixtures__/world'
import { WatchBlocks } from './WatchBlocks'

/**
 * LA PORTADA BAJO EL VELO (E2, docs/retransmision.md §11.4; D-39, I-37, 11-q; paso 9b), en estático con la
 * caché ya llena (§16.6): el horizonte de quien mira, `/health` y el calendario público. Tres bloques, por
 * este orden: `Continue watching` (las etapas a medias), `Ready to watch` (las veladas de las carreras en
 * guardia que siguen en curso, una fila por carrera) y `While you were away` (las terminadas con etapas
 * veladas: `Key stages`, `Continue from stage 4` y `Show results`; el digest llega con el 10a). Nada de lo
 * que ve depende de lo que pasó en esas etapas.
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

function home(horizon: HorizonSummary, spoilerMode: 'on' | 'off' = 'on'): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', spoilerMode, 200))
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
      expiresOnDay: 204,
    },
    {
      raceKey: 'race-france:s0',
      raceName: 'Race France',
      stages: [10, 11, 12],
      reason: 'own_rider',
      expiresOnDay: 263,
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
