import type {
  FormResponse,
  Health,
  HorizonSummary,
  MyRider,
  RiderRaceReport,
  RiderSummary,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lastRaceKey } from '../api/lastRace'
import type { DashboardAction } from '../domain/dashboard'
import { horizonKey } from '../queryClient'
import { Home, NextUp, PlayerHome } from './Home'
import { healthWith, horizonWith } from './__fixtures__/world'

/**
 * LA PORTADA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21g), en estático con la caché ya
 * llena y la sesión de better-auth sustituida. Sus tres caras, cada una con una respuesta (§7.3): el
 * visitante, con el `Panel` de bienvenida y `Create account`; el nuevo, con su `EmptyState`; y el jugador,
 * con `Next up`, los avisos de `dashboard.ts` en `ActionRow`, que contesta siempre, también vacío. Fuera el
 * reloj de la portada, que ya dice la cabecera (PR 11) y decía `GD`, y las flechas de texto (ui/10).
 */

const sesion = vi.hoisted(() => ({
  user: null as { id: string; email: string; emailVerified: boolean } | null,
}))

vi.mock('../auth/client', () => ({
  authClient: {
    useSession: () => ({ data: sesion.user ? { user: sesion.user } : null, isPending: false }),
  },
}))

beforeEach(() => {
  sesion.user = null
})

const key = (...base: unknown[]) => horizonKey(base, 'world')

const RESUMEN: RiderSummary = {
  teamId: null,
  teamName: null,
  money: 1200,
  moraleStars: 3,
  seasonPoints: 120,
  seasonRank: 40,
  fieldSize: 400,
  nationality: 'ES',
  residence: 'ES',
  housingCovered: false,
}

const FORMA: FormResponse = {
  log: [],
  form: { stars: 3.5, freshness: 16, matches: 3 },
  health: { state: 'sano', untilDay: null },
}

const ULTIMA: RiderRaceReport = {
  raceName: 'Race Valencia',
  stageName: 'Stage 3',
  raceId: 'race-valencia:s0',
  stageDay: 3,
  from: 'Valencia',
  to: 'Castellón',
  orders: null,
  position: 4,
  fieldSize: 150,
  timeGapToWinnerS: 72,
  sprintPoints: 0,
  komPoints: 0,
  winnerName: 'Ana Ruiz',
  personalEvents: [],
  story: [],
}

function pinta(
  node: ReactNode,
  {
    health = healthWith('on', 'off'),
    horizon,
    rider,
  }: { health?: Health; horizon?: HorizonSummary; rider?: MyRider | null } = {},
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], health)
  client.setQueryData(['admin-whoami'], null)
  if (horizon !== undefined) client.setQueryData(['horizon'], horizon)
  if (rider !== undefined) client.setQueryData(key('rider', 'me'), rider)
  client.setQueryData(key('rider', 'summary'), RESUMEN)
  client.setQueryData(key('rider', 'form'), FORMA)
  client.setQueryData(key('rider', 'upcoming'), [])
  client.setQueryData(key('orders'), {
    currentDay: 50,
    horizonDays: 28,
    orders: [],
    raceDays: [],
    travelDays: [],
    days: [],
  })
  client.setQueryData(['training-plan'], { mode: 'entrenador', plan: null, currentDay: 50 })
  client.setQueryData(['market'], { offers: [], contract: null })
  client.setQueryData(['race-entries'], [])
  client.setQueryData(lastRaceKey('world'), { report: ULTIMA, ready: null })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>{node}</MemoryRouter>
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

const aviso = (over: Partial<DashboardAction>): DashboardAction => ({
  id: 'race-orders',
  title: 'You race tomorrow: Race Var',
  detail: 'You have no orders set — your coach will ride it for you.',
  to: '/me/orders?race=race-var%3As0',
  cta: 'Set orders',
  dueInDays: 1,
  tone: 'urgent',
  ...over,
})

describe('el visitante (§17.21; PR 21g)', () => {
  it('la cabecera, un PageHeader, y el Panel de bienvenida, la respuesta de la 18, con Create account y How to play', () => {
    const markup = pinta(<Home />)
    expect(markup).toMatch(
      /<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>Race\. Train\. Rise\.<\/h1>/,
    )
    expect(respuestas(markup)).toBe(1)
    const bienvenida =
      /<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="Welcome"[\s\S]*?<\/section>/.exec(
        markup,
      )?.[0] ?? ''
    expect(bienvenida).toContain('A persistent cycling world')
    expect(bienvenida).toMatch(
      /<a [^>]*data-ui="Button" data-variant="primary"[^>]*href="\/register"[^>]*>[\s\S]*?Create account/,
    )
    expect(bienvenida).toMatch(
      /<a [^>]*data-ui="Button" data-variant="secondary"[^>]*href="\/how-to-play"/,
    )
    expect(markup).not.toContain('bg-brand')
  })

  it('el estado del sistema, en su Panel y en un dl, con el día de la temporada y nunca GD', () => {
    const sistema = panel(pinta(<Home />), 'System status')
    expect(sistema).toMatch(/<dt[^>]*>Server<\/dt><dd[^>]*>Online<\/dd>/)
    expect(sistema).toMatch(/<dt[^>]*>Engine version<\/dt><dd[^>]*>91<\/dd>/)
    expect(sistema).toMatch(/<dt[^>]*>Game day<\/dt><dd[^>]*>Day 200 · Season 1<\/dd>/)
    expect(sistema).toMatch(/<dt[^>]*>Database<\/dt><dd[^>]*>ready<\/dd>/)
  })

  it('quien lee con el velo de su cuenta sin sesión: un Notice con su acción a /login', () => {
    const markup = pinta(<Home />, { health: healthWith('on', 'on'), horizon: horizonWith() })
    expect(markup).toMatch(
      /data-ui="Notice" data-variant="info"[\s\S]*?>Sign in to see results as you know them<[\s\S]*?href="\/login"/,
    )
    expect(respuestas(markup)).toBe(1)
  })
})

describe('mientras llega el corredor (§17.21; PR 21g)', () => {
  it('la espera también contesta (§7.3): una respuesta, en el esqueleto', () => {
    sesion.user = { id: 'u1', email: 'jugador@example.com', emailVerified: true }
    const markup = pinta(<Home />)
    expect(respuestas(markup)).toBe(1)
    expect(markup).toMatch(/data-ui="QueryView" data-state="loading"/)
  })
})

describe('el nuevo, sin corredor (§17.21; PR 21g)', () => {
  it('la cabecera, el vacío que contesta con Create your rider, y cómo se juega en un dl', () => {
    sesion.user = { id: 'u1', email: 'nuevo@example.com', emailVerified: true }
    const markup = pinta(<Home />, { rider: null })
    expect(markup).toMatch(
      /<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>Welcome to Cycling Star<\/h1>/,
    )
    expect(respuestas(markup)).toBe(1)
    expect(markup).toMatch(/data-ui="EmptyState"[^>]*data-answer=""[\s\S]*?Create your rider/)
    const como = panel(markup, 'How it works')
    for (const t of ['Stars', 'Matches', 'Form'])
      expect(como).toMatch(new RegExp(`<dt[^>]*>${t}</dt>`))
    expect(markup).not.toContain('ring-black')
  })
})

describe('el jugador (§17.21; PR 21g)', () => {
  const jugador = () => pinta(<PlayerHome name="José Quintáns" />)

  it('la cabecera, un PageHeader con su nombre, y debajo su equipo o Free agent', () => {
    const markup = jugador()
    expect(markup).toMatch(/<header data-ui="PageHeader"[^>]*>[\s\S]*?<h1[^>]*>José Quintáns<\/h1>/)
    expect(markup).toContain('Free agent')
  })

  it('sin el reloj de la portada, que ya dice la cabecera: ni GD ni la cuenta atrás', () => {
    const markup = jugador()
    expect(markup).not.toContain('GD ')
    expect(markup).not.toContain('next update in')
  })

  it('Next up contesta siempre (§7.3): sin avisos, su vacío dentro, y una sola respuesta', () => {
    const markup = jugador()
    expect(respuestas(markup)).toBe(1)
    const siguiente = panel(markup, 'Next up')
    expect(siguiente).toMatch(/^<section data-ui="Panel"[^>]*data-answer=""/)
    expect(siguiente).toContain('Nothing needs you right now.')
  })

  it('la condición: la forma con su palabra y sus estrellas, la frescura en el Meter, y los puntos y el dinero en Stat', () => {
    const condicion = panel(jugador(), 'Condition')
    expect(condicion).toMatch(/>Form<[\s\S]*?data-ui="StarRating"[^>]*aria-label="3\.5 of 5 stars"/)
    expect(condicion).toContain('data-ui="Meter"')
    expect(condicion).toMatch(
      /<dl data-ui="Stat"[\s\S]*?<dt[^>]*>Season points<\/dt><dd[^>]*>120<\/dd>/,
    )
    expect(condicion).toMatch(/<dl data-ui="Stat"[\s\S]*?<dt[^>]*>Money<\/dt><dd[^>]*>1,200<\/dd>/)
    const perfil = /<a ([^>]*)>See the full profile<\/a>/.exec(condicion)?.[1] ?? ''
    expect(perfil).toContain('href="/me/profile"')
    expect(perfil).toContain('data-ui="TextLink"')
  })

  it('la última carrera: Full story, un enlace de 44 a su etapa, el puesto y el hueco, y ninguna flecha', () => {
    const markup = jugador()
    const ultima = panel(markup, 'Last race')
    const enlace = /<a ([^>]*)>Full story<\/a>/.exec(ultima)?.[1] ?? ''
    expect(enlace).toContain('href="/world/races/race-valencia/stages/3"')
    expect(enlace).toContain('data-ui="TextLink"')
    expect(ultima).toContain('Race Valencia · Stage 3')
    expect(ultima).toContain('Valencia → Castellón')
    expect(ultima).toMatch(/>4<\/span><span[^>]*> \/ 150<\/span> · \+1&#x27;12&quot;/)
    expect(markup).not.toMatch(/ →</)
    expect(markup).not.toContain('bg-brand')
  })
})

describe('Next up, con sus avisos (§17.21; PR 21g)', () => {
  const siguiente = (actions: DashboardAction[]) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <NextUp actions={actions} />
      </MemoryRouter>,
    )

  it('cada aviso, una ActionRow: su titular y su detalle, y su acción, un enlace de 44 con el nombre entero y sin la flecha', () => {
    const markup = siguiente([aviso({})])
    expect(markup).toMatch(/<li data-ui="ActionRow"[\s\S]*?You race tomorrow: Race Var/)
    expect(markup).toContain('You have no orders set')
    const enlace = /<a ([^>]*)>(?:<[^>]+>)*Set orders</.exec(markup)?.[1] ?? ''
    expect(enlace).toContain('href="/me/orders?race=race-var%3As0"')
    expect(enlace).toContain('aria-label="Set orders: You race tomorrow: Race Var"')
    expect(markup).not.toContain('→')
  })

  it('el tono, con su palabra y no solo su color (D-13): Urgent y Soon en su Chip; lo informativo, sin chapa', () => {
    const markup = siguiente([
      aviso({}),
      aviso({ id: 'warn', title: 'You race the Race Var in 3 days', tone: 'warn', dueInDays: 3 }),
      aviso({
        id: 'travel',
        title: 'You travel to Race Var tomorrow',
        tone: 'info',
        cta: 'See your plan',
      }),
    ])
    expect(markup).toMatch(
      /You race tomorrow: Race Var[\s\S]*?data-ui="Chip" data-variant="bad"[\s\S]*?>Urgent</,
    )
    expect(markup).toMatch(/in 3 days[\s\S]*?data-ui="Chip" data-variant="warn"[\s\S]*?>Soon</)
    const info = markup.split('<li data-ui="ActionRow"')[3] ?? ''
    expect(info).toContain('You travel to Race Var tomorrow')
    expect(info).not.toContain('data-ui="Chip"')
    expect(markup).not.toMatch(/border-l-(rose|amber|slate)/)
  })

  it('contesta, con avisos y sin ellos', () => {
    expect(respuestas(siguiente([aviso({})]))).toBe(1)
    expect(respuestas(siguiente([]))).toBe(1)
  })
})
