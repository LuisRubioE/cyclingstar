import {
  ATTRIBUTES,
  type Attribute,
  type AttrTrendRow,
  type FormResponse,
  type MyRider,
  type PublicRiderDetail,
  type RiderSummary,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { horizonKey } from '../queryClient'
import { PlayerHome } from './Home'
import { RiderProfile } from './RiderProfile'
import { healthWith } from './__fixtures__/world'

/**
 * LA CONDICIÓN Y LOS ATRIBUTOS, EN SU FORMA DE PANTALLA (E3, docs/visual.md §13.5 y §13.7; DD-12; PR 19b):
 * la portada y la ficha pintan lo que la API manda ya hecho, la moral en medias estrellas, la frescura sin
 * cifra y los cerillos que cuenta el servidor. En estático con la caché llena y el velo apagado (`world`).
 */

const key = (...base: unknown[]) => horizonKey(base, 'world')

const MIO: MyRider = {
  id: 'p1',
  name: 'Ana Ruiz',
  country: 'ES',
  gender: 'F',
  archetype: 'escalada',
  birthSeason: 0,
  attributes: Object.fromEntries(
    ATTRIBUTES.map((a) => [a, a === 'MON' ? { stars: 3, mark: 1 } : { stars: 2, mark: 0 }]),
  ) as MyRider['attributes'],
}

const ficha = (id: string, name: string): PublicRiderDetail => ({
  id,
  name,
  country: 'ES',
  residence: 'ES',
  archetype: 'escalada',
  age: 24,
  isBot: id !== 'p1',
  teamId: null,
  teamName: null,
  seasonPoints: 120,
  seasonRank: 40,
  fieldSize: 400,
  fame: 0,
  attributes: Object.fromEntries(ATTRIBUTES.map((a) => [a, { stars: 2.5 }])) as Record<
    Attribute,
    { stars: number }
  >,
  health: { state: 'sano', untilDay: null },
  champion: null,
})

const FORMA: FormResponse = {
  log: [
    { gameDay: 198, fitness: 64, freshness: 30, load: 2, activity: 'fondo', parte: null },
    { gameDay: 199, fitness: 65, freshness: 16, load: 3, activity: 'fondo', parte: null },
  ],
  form: { stars: 3.5, freshness: 16, matches: 3 },
  health: { state: 'sano', untilDay: null },
}

const RESUMEN: RiderSummary = {
  teamId: null,
  teamName: null,
  money: 1200,
  moraleStars: 3,
  fame: 0,
  seasonPoints: 120,
  seasonRank: 40,
  fieldSize: 400,
  nationality: 'ES',
  residence: 'ES',
  housingCovered: false,
}

const TENDENCIA: AttrTrendRow[] = ATTRIBUTES.map((attr) => ({
  attr,
  arrow: attr === 'MON' ? 'sube' : 'igual',
}))

function pinta(path: string, route: string, page: ReactNode): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'off'))
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(key('rider', 'me'), MIO)
  client.setQueryData(key('public-rider', 'p1'), ficha('p1', 'Ana Ruiz'))
  client.setQueryData(key('public-rider', 'r2'), ficha('r2', 'Eva Sanz'))
  client.setQueryData(key('rider', 'form'), FORMA)
  client.setQueryData(key('rider', 'summary'), RESUMEN)
  client.setQueryData(key('rider-trend'), TENDENCIA)
  client.setQueryData(['coach-view'], null)
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

/** Lo que va de la etiqueta `Morale` al cierre de su valor. */
const moral = (html: string) => /Morale<\/dt>(.*?)<\/dd>/s.exec(html)?.[1] ?? ''
const cuenta = (s: string, texto: string) => s.split(texto).length - 1

describe('la portada (§13.7; 19b)', () => {
  const html = pinta('/', '/', <PlayerHome name="Ana Ruiz" />)

  it('la frescura en el medidor y con su palabra, sin la cifra', () => {
    expect(html).toContain('data-ui="Meter"')
    expect(html).toContain('Freshness: very low')
    expect(html).not.toContain('16 / 100')
  })

  it('la moral en medias estrellas, y no en porcentaje (DD-12)', () => {
    expect(moral(html)).toContain('data-ui="StarRating"')
    expect(moral(html)).toContain('aria-label="3 of 5 stars"')
    expect(moral(html)).not.toContain('%')
  })
})

describe('la ficha propia y la ajena (§13.5; 19b)', () => {
  it('la propia: los cerillos que cuenta la API, la moral en estrellas, la marca y la flecha', () => {
    const html = pinta('/me/profile', '/me/profile', <RiderProfile />)
    expect(html).toContain('3 of 5')
    expect(moral(html)).toContain('aria-label="3 of 5 stars"')
    expect(moral(html)).not.toContain('%')
    // la marca y las estrellas, las del corredor propio (GET /api/riders/me), no las de la ficha pública
    expect(cuenta(html, 'through this band')).toBe(10)
    expect(html).toContain('aria-label="3 of 5 stars"')
    expect(html).toMatch(/data-variant="trend"[^>]*aria-label="Improving"/)
    // las dos barras, con su palabra: el fondo `Good` (65) y la frescura `Very low` (16)
    expect(html).toContain('Good')
    expect(html).toContain('Very low')
  })

  it('la ajena: solo las estrellas, sin condición, marca ni flecha', () => {
    const html = pinta('/world/riders/r2', '/world/riders/:id', <RiderProfile />)
    expect(cuenta(html, 'aria-label="2.5 of 5 stars"')).toBe(10)
    expect(html).not.toContain('through this band')
    expect(html).not.toContain('data-variant="trend"')
    expect(html).not.toContain('Morale')
    expect(html).not.toContain('Matches')
  })
})
