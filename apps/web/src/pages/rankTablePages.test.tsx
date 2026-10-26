import type {
  CountryRider,
  HallOfFameRow,
  Ledger,
  LedgerEntry,
  RankingRow,
  RiderSummary,
  TeamDetail,
  TeamListItem,
  TeamRider,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { horizonKey } from '../queryClient'
import { Country } from './Country'
import { Finances } from './Finances'
import { HallOfFame } from './HallOfFame'
import { Rankings } from './Rankings'
import { Team } from './Team'
import { TeamSquad } from './TeamSquad'
import { healthWith } from './__fixtures__/world'

/**
 * LAS TABLAS DEL MUNDO EN `RankTable` (E3, docs/visual.md §6.1 y §6.2; PR 12b): el ranking, el salón de la
 * fama, la nación, los movimientos y la plantilla, en estático con la caché llena y el velo apagado (`rev`
 * `world`). El maillot sale de `GET /api/teams` de verdad (`useTeamsIdentity`); lo propio, de `useOwnIds`,
 * que sin sesión no pide nada, así que aquí se sustituye.
 */

const propio = vi.hoisted(() => ({ riderId: null as string | null }))
vi.mock('../components/useTableIdentity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/useTableIdentity')>()),
  useOwnIds: () => ({ riderId: propio.riderId, teamId: null }),
}))

beforeEach(() => {
  propio.riderId = null
})

const key = (...base: unknown[]) => horizonKey(base, 'world')

const equipo = (id: string, name: string): TeamListItem => ({
  id,
  name,
  country: 'FR',
  division: 'WT',
  budget: 1_000_000,
  pointsSeason: 900,
  jerseySeed: `cyclingstar-2:team:WT:${id}:jersey`,
  riderCount: 25,
})
const MISTRAL = equipo('t1', 'Mistral Racing')
const ANDES = equipo('t2', 'Andes Ruta')

function pinta(
  path: string,
  route: string,
  page: ReactNode,
  cache: readonly (readonly [readonly unknown[], unknown])[],
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'off'))
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(key('teams'), [MISTRAL, ANDES])
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

/** Las filas del cuerpo: las que llevan su estado (la cabecera y el hueco, no). */
const filas = (s: string) => s.match(/<tr data-state="/g)?.length ?? 0
/** El `data-ui` de cada elemento con `data-answer`: la comprobación 7 quiere uno. */
const respuestas = (s: string) =>
  [...s.matchAll(/data-ui="([A-Za-z]+)"[^>]*data-answer=""/g)].map((m) => m[1])
/** Lo que se lee en la celda de identidad de un corredor, sin etiquetas. */
const celda = (s: string, id: string) =>
  (new RegExp(`<a [^>]*href="/world/riders/${id}"[^>]*>(.*?)</a>`).exec(s)?.[1] ?? '').replace(
    /<[^>]+>/g,
    '',
  )
const cuenta = (s: string, texto: string) => s.split(texto).length - 1

describe('el ranking (§6.1)', () => {
  const fila = (n: number, over: Partial<RankingRow> = {}): RankingRow => ({
    riderId: `r${n}`,
    name: `Rider ${n}`,
    country: 'ES',
    teamId: 't1',
    teamName: 'Mistral Racing',
    isBot: true,
    points: 2000 - n,
    ...over,
  })
  // el 2, agente libre; el 3, de un equipo cuya semilla no se sabe
  const RANKING = Array.from({ length: 100 }, (_, i) =>
    fila(
      i + 1,
      i === 1
        ? { teamId: null, teamName: null }
        : i === 2
          ? { teamId: 't9', teamName: 'Otro Team' }
          : {},
    ),
  )
  const ranking = () =>
    pinta('/world/rankings', '/world/rankings', <Rankings />, [
      [key('rankings'), RANKING],
      [key('season-awards'), null],
    ])

  it('las 20 primeras y Show all 100, y la tabla es la única respuesta (pantalla 11)', () => {
    const s = ranking()
    expect(filas(s)).toBe(20)
    expect(s).toContain('Show all 100')
    expect(respuestas(s)).toEqual(['RankTable'])
    expect(s).toContain('role="tab" aria-selected="true"')
  })

  it('el maillot del equipo de hoy, el hueco del agente libre y nada sin semilla', () => {
    const s = ranking()
    expect(cuenta(s, 'aria-label="Mistral Racing kit"')).toBe(18)
    expect(celda(s, 'r2')).toContain('Individual')
    expect(celda(s, 'r3')).toContain('Otro Team')
    expect(cuenta(s, 'aria-label="Otro Team kit"')).toBe(0)
    expect(s).toContain('1,999')
  })

  it('la fila propia, anclada tras las 20 detrás del hueco (§6.2)', () => {
    propio.riderId = 'r34'
    const s = ranking()
    expect(filas(s)).toBe(21)
    expect(cuenta(s, 'aria-current="true"')).toBe(1)
    expect(s).toMatch(/<tr aria-hidden="true" class="h-6/)
    expect(s).toMatch(/aria-current="true"(?:(?!<\/tr>).)*\/world\/riders\/r34"/)
  })
})

describe('el salón de la fama (§6.1)', () => {
  const fila = (n: number, over: Partial<HallOfFameRow> = {}): HallOfFameRow => ({
    riderId: `h${n}`,
    name: `Champion ${n}`,
    country: 'UA',
    teamId: 't1',
    teamName: 'Mistral Racing',
    isBot: false,
    gc: 0,
    stage: 1,
    kom: 0,
    points: 0,
    total: 1,
    ...over,
  })
  const SALON = [
    fila(1, { gc: 2, stage: 4, kom: 0, points: 6, total: 12 }),
    ...Array.from({ length: 39 }, (_, i) => fila(i + 2)),
  ]
  const salon = () =>
    pinta('/world/hall-of-fame', '/world/hall-of-fame', <HallOfFame />, [
      [key('hall-of-fame'), SALON],
      [key('records'), null],
    ])

  it('las 20 primeras y Show all 40, sin desplazarse de lado, y la respuesta (pantalla 24)', () => {
    const s = salon()
    expect(filas(s)).toBe(20)
    expect(s).toContain('Show all 40')
    expect(respuestas(s)).toEqual(['RankTable'])
    expect(s).not.toContain('overflow-x-auto')
    expect(s).not.toContain('min-w-[520px]')
  })

  it('el segundo renglón dice cada cifra con su palabra, y las columnas solo la cifra', () => {
    const s = salon()
    expect(celda(s, 'h1')).toContain('2 overall·4 stages·0 mountains·6 points')
    expect(celda(s, 'h2')).toContain('0 overall·1 stage·0 mountains·0 points')
    for (const h of ['Overall', 'Stages', 'Mountains', 'Points', 'Total'])
      expect(s).toMatch(new RegExp(`<th scope="col"[^>]*>${h}</th>`))
    expect(s).toMatch(/<td data-column="stage" data-priority="secondary"[^>]*>4<\/td>/)
  })

  it('el maillot del equipo de hoy, sin el equipo debajo; y la fila propia', () => {
    propio.riderId = 'h30'
    const s = salon()
    expect(cuenta(s, 'aria-label="Mistral Racing kit"')).toBe(21)
    expect(celda(s, 'h1')).not.toContain('Mistral Racing')
    expect(cuenta(s, 'aria-current="true"')).toBe(1)
  })
})

describe('la nación (§6.1)', () => {
  const fila = (n: number): CountryRider => ({
    id: `c${n}`,
    name: `Corredor ${n}`,
    archetype: 'escalada',
    isBot: true,
    teamId: 't2',
    teamName: 'Andes Ruta',
    seasonPoints: 500 - n,
    fame: 0,
  })
  const nacion = () =>
    pinta('/world/nations/es', '/world/nations/:code', <Country />, [
      [key('country', 'es'), Array.from({ length: 25 }, (_, i) => fila(i + 1))],
    ])

  it('la bandera de la página, el equipo y el tipo debajo, y la respuesta (pantalla 23)', () => {
    const s = nacion()
    expect(filas(s)).toBe(20)
    expect(s).toContain('Show all 25')
    expect(respuestas(s)).toEqual(['RankTable'])
    expect(cuenta(s, 'data-ui="Flag" data-variant="sprite" data-state="ready"')).toBe(20)
    expect(celda(s, 'c1')).toContain('Andes Ruta·Climber')
    expect(cuenta(s, 'aria-label="Andes Ruta kit"')).toBe(20)
    expect(s).not.toContain('overflow-x-auto')
  })

  it('la fila propia, en su sitio si está entre las 20', () => {
    propio.riderId = 'c3'
    const s = nacion()
    expect(filas(s)).toBe(20)
    expect(cuenta(s, 'aria-current="true"')).toBe(1)
    expect(s).not.toMatch(/<tr aria-hidden="true" class="h-6/)
  })
})

describe('los movimientos (§6.1)', () => {
  const mov = (gameDay: number, kind: string, amount: number, note: string): LedgerEntry => ({
    gameDay,
    kind,
    amount,
    note,
  })
  const LEDGER: Ledger = {
    balance: 1200,
    gameDay: 399,
    salary: null,
    entries: [
      // el día 399 del mundo es el 35 de la segunda temporada (364 días cada una)
      mov(399, 'salario', 780, 'Weekly salary · wk 57'),
      mov(398, 'viaje', -80, 'Race Var · travel'),
      mov(397, 'otro', 0, ''),
      ...Array.from({ length: 57 }, (_, i) => mov(390 - i, 'premio', 10, 'Stage prize')),
    ],
  }
  const movimientos = () =>
    pinta('/me/finances', '/me/finances', <Finances />, [[key('ledger'), LEDGER]])

  it('sin puesto ni enlace, las 20 primeras y Show all 60; no es la respuesta (la 27 es el Stat)', () => {
    const s = movimientos()
    const tabla = s.slice(s.indexOf('data-ui="RankTable"'))
    expect(s).toMatch(/data-ui="RankTable" data-variant="plain"/)
    expect(tabla).not.toContain('<a ')
    expect(filas(s)).toBe(20)
    expect(s).toContain('Show all 60')
    expect(s).not.toMatch(/data-ui="RankTable"[^>]*data-answer/)
  })

  it('el importe con su signo y su tono, el día de la temporada y la clase si no hay nota', () => {
    const s = movimientos()
    expect(s).toContain('<span class="text-good">+780</span>')
    expect(s).toContain('<span class="text-bad">−80</span>')
    expect(s).toContain('<span class="text-ink">0</span>')
    expect(s).toContain('Day 35')
    expect(s).not.toContain('Day 399')
    expect(s).toMatch(/<span class="text-row text-ink">Other<\/span>/)
  })
})

describe('la plantilla (§6.1)', () => {
  const corredor = (n: number, health = 'sano'): TeamRider => ({
    id: `p${n}`,
    name: `Rider ${n}`,
    country: n % 2 === 0 ? 'FR' : 'BE',
    archetype: 'escalada',
    isBot: true,
    seasonPoints: n * 10,
    foreign: n % 2 !== 0,
    health,
  })
  const ROSTER = Array.from({ length: 25 }, (_, i) =>
    corredor(i + 1, ['sano', 'molestias', 'enfermo', 'lesionado'][i < 3 ? i + 1 : 0]),
  )
  const DETALLE: TeamDetail = {
    id: 't1',
    name: 'Mistral Racing',
    country: 'FR',
    division: 'WT',
    budget: 1_000_000,
    pointsSeason: 900,
    jerseySeed: MISTRAL.jerseySeed,
    human: false,
    roster: ROSTER,
  }

  /** Lo que comparten la ficha del equipo y `My Team → Squad`. */
  function comoPlantilla(s: string) {
    const tabla = s.slice(s.indexOf('data-ui="RankTable"'))
    expect(respuestas(s)).toEqual(['RankTable'])
    expect(s).toMatch(/data-ui="RankTable" data-variant="plain"/)
    expect(filas(s)).toBe(25)
    expect(s).not.toContain('Show all')
    expect(cuenta(tabla, 'href="/world/riders/')).toBe(25)
    expect(cuenta(tabla, 'aria-label="Mistral Racing kit"')).toBe(25)
    expect(s).not.toContain('aria-current')
    // la salud, en `Chip` y solo si no está sano: en su columna desde 1.024 y debajo hasta ahí
    expect(cuenta(tabla, 'data-ui="Chip"')).toBe(6)
    expect(tabla).toMatch(/data-ui="Chip" data-variant="warn"[^>]*>(?:(?!<\/span>).)*<\/svg>Niggle/)
    expect(tabla).toMatch(/data-ui="Chip" data-variant="bad"[^>]*>(?:(?!<\/span>).)*<\/svg>Ill/)
    expect(tabla).toMatch(/data-ui="Chip" data-variant="bad"[^>]*>(?:(?!<\/span>).)*<\/svg>Injured/)
    expect(celda(s, 'p12')).toContain('Climber·120 pts')
  }

  it('la ficha del equipo: todas, la celda entera a la ficha del corredor (pantalla 12)', () => {
    comoPlantilla(
      pinta('/world/teams/t1', '/world/teams/:id', <Team />, [
        [key('team', 't1'), DETALLE],
        [['team-control'], null],
        [key('team-news', 't1', false), []],
      ]),
    )
  })

  it('My Team → Squad: lo mismo, sin la marca You ni el desplegable Detail (pantalla 14)', () => {
    const resumen: RiderSummary = {
      teamId: 't1',
      teamName: 'Mistral Racing',
      money: 0,
      morale: 60,
      fame: 0,
      seasonPoints: 0,
      seasonRank: 0,
      fieldSize: 0,
      nationality: 'ES',
      residence: 'ES',
      housingCovered: false,
    }
    propio.riderId = 'p1'
    const s = pinta('/team/squad', '/team/squad', <TeamSquad />, [
      [key('rider', 'summary'), resumen],
      [key('team', 't1'), DETALLE],
    ])
    comoPlantilla(s)
    expect(s).not.toMatch(/>(?:Detail|Hide|You)</)
    // por puntos, el que más arriba
    expect(s.indexOf('/world/riders/p25"')).toBeLessThan(s.indexOf('/world/riders/p24"'))
  })
})
