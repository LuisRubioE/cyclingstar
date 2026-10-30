import {
  ATTRIBUTES,
  type Attribute,
  type AttrTrendRow,
  type BlockReport,
  type CoachView,
  type FormResponse,
  type MyRider,
  type PalmaresRow,
  type PublicRiderDetail,
  type RacePref,
  type RiderRaceReport,
  type RiderRaceResult,
  type RiderSummary,
  type TeamListItem,
  maxMatchCount,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { lastRaceKey } from '../api/lastRace'
import { horizonKey } from '../queryClient'
import { RiderProfile } from './RiderProfile'
import { healthWith } from './__fixtures__/world'

/**
 * LA FICHA DEL CORREDOR CON EL SISTEMA (E3, docs/visual.md §4.6 y §17.21, la cola larga; PR 21h), en estático
 * con la caché ya llena y el velo apagado (`world`). La composición fija, en su orden: `RiderHeader`; en la
 * propia, `Condition`, la respuesta; `Attributes`, la respuesta en la ajena, con la frase del entrenador a la
 * vista; `Season objectives` y `Season`; el palmarés, los logros y los resultados en `RankTable`; y detrás, los
 * datos de `Rider` y, en la propia, los dos informes. La ajena, sin nada de lo privado.
 */

const key = (...base: unknown[]) => horizonKey(base, 'world')

const MIO: MyRider = {
  id: 'p1',
  name: 'Ana Ruiz',
  country: 'ES',
  gender: 'F',
  archetype: 'escalada',
  attributes: Object.fromEntries(
    ATTRIBUTES.map((a) => [a, a === 'MON' ? { stars: 3, mark: 1 } : { stars: 2, mark: 0 }]),
  ) as MyRider['attributes'],
}

const ficha = (over: Partial<PublicRiderDetail> & Pick<PublicRiderDetail, 'id' | 'name'>) => ({
  country: 'ES',
  residence: 'ES',
  archetype: 'escalada',
  age: 24,
  isBot: false,
  teamId: null,
  teamName: null,
  seasonPoints: 120,
  seasonRank: 40,
  fieldSize: 400,
  attributes: Object.fromEntries(ATTRIBUTES.map((a) => [a, { stars: 2.5 }])) as Record<
    Attribute,
    { stars: number }
  >,
  health: { state: 'sano' as const, untilDay: null },
  champion: null,
  ...over,
})

const PROPIA: PublicRiderDetail = ficha({
  id: 'p1',
  name: 'Ana Ruiz',
  residence: 'FR',
  teamId: 't-sol',
  teamName: 'Team Sol',
})
/** Un bot de otro equipo, lesionado: su salud es pública. */
const AJENA: PublicRiderDetail = ficha({
  id: 'r2',
  name: 'Eva Sanz',
  isBot: true,
  health: { state: 'lesionado', untilDay: 205 },
})

const EQUIPOS: TeamListItem[] = [
  {
    id: 't-sol',
    name: 'Team Sol',
    country: 'ES',
    division: 'WT',
    budget: 1000,
    pointsSeason: 10,
    kit: 'plain.navy',
    riderCount: 12,
  },
]

const FORMA: FormResponse = {
  log: [
    { gameDay: 198, fitness: 64, freshness: 30, load: 2, activity: 'fondo', parte: null },
    { gameDay: 199, fitness: 65, freshness: 16, load: 3, activity: 'fondo', parte: null },
  ],
  form: { stars: 3.5, freshness: 16, matches: 3 },
  health: { state: 'sano', untilDay: null },
}

const RESUMEN: RiderSummary = {
  teamId: 't-sol',
  teamName: 'Team Sol',
  money: 1200,
  moraleStars: 3,
  seasonPoints: 120,
  seasonRank: 40,
  fieldSize: 400,
  nationality: 'ES',
  residence: 'FR',
  housingCovered: false,
}

const TENDENCIA: AttrTrendRow[] = ATTRIBUTES.map((attr) => ({
  attr,
  arrow: attr === 'MON' ? 'sube' : 'igual',
}))

const ENTRENADOR: CoachView = {
  ceilings: ATTRIBUTES.map((attr) => ({ attr, opinion: attr === 'MON' ? 'lo_tuyo' : 'normal' })),
  notes: ['recupera_rapido'],
  declining: false,
}

const OBJETIVOS: RacePref[] = [
  {
    raceId: 'race-var:s0',
    name: 'Race Var',
    level: '1.1',
    format: 'one-day',
    startDay: 201,
    stageCount: 1,
    wanted: true,
    callup: 'selected',
  },
  {
    raceId: 'race-jaen:s0',
    name: 'Race Jaén',
    level: '1.1',
    format: 'one-day',
    startDay: 205,
    stageCount: 1,
    wanted: true,
    callup: null,
  },
  {
    raceId: 'race-nada:s0',
    name: 'Race Nada',
    level: '1.1',
    format: 'one-day',
    startDay: 210,
    stageCount: 1,
    wanted: false,
    callup: null,
  },
]

const PALMARES: PalmaresRow[] = [
  {
    season: 0,
    raceId: 'race-oman',
    raceName: 'Race Oman',
    kind: 'stage',
    detail: 'Stage 2',
    from: 'Al Rustaq',
    to: 'Muscat',
  },
]

const RESULTADOS: RiderRaceResult[] = [
  {
    raceId: 'race-oman',
    raceName: 'Race Oman',
    raceClass: '2.1',
    season: 0,
    stageCount: 5,
    isOneDay: false,
    gcPuesto: 1,
    dnf: false,
    finished: true,
    stages: [{ stageDay: 2, puesto: 1, from: 'Al Rustaq', to: 'Muscat' }],
  },
]

const LOGROS = [{ id: 'first-win', label: 'First win', icon: '🏆', desc: 'Won a race.' }]

const BLOQUE: BlockReport = {
  rows: [{ attr: 'RES', total: 1.2, bySource: [{ source: 'entrenamiento', delta: 1.2 }] }],
  trainingDays: 20,
  raceDays: 0,
  sessions: [{ activity: 'carrera:race-oman:e2', days: 1 }],
}

const ULTIMA: RiderRaceReport = {
  raceName: 'Race Oman',
  stageName: 'Stage 2',
  raceId: 'race-oman:s0',
  stageDay: 2,
  from: 'Al Rustaq',
  to: 'Muscat',
  orders: null,
  position: 1,
  fieldSize: 120,
  timeGapToWinnerS: 0,
  sprintPoints: 0,
  komPoints: 0,
  winnerName: 'Ana Ruiz',
  personalEvents: [],
  story: [],
}

interface Cache {
  readonly forma?: boolean
  readonly equipos?: boolean
  readonly entrenador?: CoachView
}

function pinta(path: string, { forma = true, equipos = true, entrenador = ENTRENADOR }: Cache = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'off'))
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(key('rider', 'me'), MIO)
  for (const r of [PROPIA, AJENA]) {
    client.setQueryData(key('public-rider', r.id), r)
    client.setQueryData(key('public-rider', r.id, 'palmares'), PALMARES)
    client.setQueryData(key('public-rider', r.id, 'results'), RESULTADOS)
    client.setQueryData(key('badges', r.id), LOGROS)
  }
  if (forma) client.setQueryData(key('rider', 'form'), FORMA)
  if (equipos) client.setQueryData(key('teams'), EQUIPOS)
  client.setQueryData(key('rider', 'summary'), RESUMEN)
  client.setQueryData(key('rider-trend'), TENDENCIA)
  client.setQueryData(['coach-view'], entrenador)
  client.setQueryData(key('rider', 'race-prefs'), OBJETIVOS)
  client.setQueryData(key('block-report'), BLOQUE)
  client.setQueryData(lastRaceKey('world'), { report: ULTIMA, ready: null })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/me/profile" element={<RiderProfile />} />
          <Route path="/world/riders/:id" element={<RiderProfile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El `Panel` del catálogo con ese título, entero. */
const panel = (markup: string, title: string): string =>
  new RegExp(
    `<section data-ui="Panel"[^>]*>(?:(?!</section>)[\\s\\S])*?>${title}</h2>[\\s\\S]*?</section>`,
  ).exec(markup)?.[0] ?? ''
const respuestas = (markup: string): number => markup.match(/data-answer=""/g)?.length ?? 0
const titulos = (markup: string): string[] =>
  [...markup.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1] ?? '')

describe('la ficha propia (§4.6; PR 21h)', () => {
  const propia = () => pinta('/me/profile')

  it('la cabecera, RiderHeader: su h1, el maillot de su equipo que abre su hoja, Player y el papel; sin SectionBar', () => {
    const html = propia()
    expect(html).toMatch(/<header data-ui="RiderHeader" data-variant="player"/)
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<h1[^>]*>[\s\S]*?Ruiz/)
    expect(html).toContain('aria-label="Show the kit full screen"')
    expect(html).toMatch(/data-ui="Chip" data-variant="accent"[\s\S]*?Player/)
    expect(html).toContain('Climber')
    expect(html).not.toContain('brand-gold')
  })

  it('una sola respuesta: Condition', () => {
    const html = propia()
    expect(respuestas(html)).toBe(1)
    expect(panel(html, 'Condition')).toMatch(/^<section data-ui="Panel"[^>]*data-answer=""/)
  })

  it('en su orden (§4.6): la condición, los atributos, los objetivos, la temporada, el palmarés, los logros, los resultados, el corredor y los dos informes', () => {
    expect(titulos(propia())).toEqual([
      'Condition',
      'Attributes',
      'Season objectives',
      'Season',
      'Palmarès',
      'Badges',
      'Recent results',
      'Rider',
      'Last 4 weeks',
      'Your last race',
    ])
  })

  it('la condición: la forma en estrellas de 20, el fondo y la frescura en su Meter con la palabra en minúscula, y cada porqué en su InfoButton', () => {
    const c = panel(propia(), 'Condition')
    expect(c).toMatch(/Form[\s\S]*?data-ui="StarRating" data-variant="page"[^>]*aria-label="3\.5 of 5 stars"/)
    expect(c).toContain('Fitness: good')
    expect(c).toContain('Freshness: very low')
    for (const l of ['About fitness', 'About freshness', 'About matches'])
      expect(c).toContain(`aria-label="${l}"`)
    expect(c).not.toContain('Fitness — training base')
  })

  it('los cerillos, en un Meter de cinco: 3 of 5', () => {
    expect(maxMatchCount()).toBe(5)
    const c = panel(propia(), 'Condition')
    expect(c).toMatch(/data-ui="Meter" data-variant="count"[\s\S]*?Matches: 3 of 5/)
  })

  it('la salud en su Chip, con su nota; la moral en estrellas; la gráfica; y Where the energy went, plegado', () => {
    const c = panel(propia(), 'Condition')
    expect(c).toMatch(/data-ui="Chip" data-variant="good"[\s\S]*?Healthy/)
    expect(c).toContain('Fit to race and train.')
    expect(c).toMatch(/Morale<\/dt>[\s\S]*?aria-label="3 of 5 stars"/)
    expect(c).toContain('data-ui="FormChart"')
    expect(c).toMatch(/data-ui="Disclosure"[\s\S]*?Where the energy went/)
  })

  it('mientras llega la forma, su espera, dentro de la respuesta', () => {
    const html = pinta('/me/profile', { forma: false })
    const c = panel(html, 'Condition')
    expect(c).toMatch(/data-ui="QueryView" data-state="loading"/)
    expect(respuestas(html)).toBe(1)
  })

  it('los atributos: la frase del entrenador a la vista junto al de techo más alto, y sus notas debajo', () => {
    const a = panel(propia(), 'Attributes')
    expect(a).toMatch(/Mountain<[\s\S]*?This is your thing: your biggest potential is here\./)
    expect(a).toContain('You recover quickly')
    expect(a).not.toContain('Tap an attribute')
  })

  it('los objetivos: la carrera enlazada, Selected en su Chip, y la que espera, con su día; nunca GD', () => {
    const o = panel(propia(), 'Season objectives')
    expect(o).toMatch(/<a [^>]*href="\/world\/races\/race-var"[^>]*>Race Var<\/a>/)
    expect(o).toMatch(/data-ui="Chip" data-variant="good"[\s\S]*?Selected/)
    expect(o).toContain('Day 205')
    expect(o).not.toContain('GD')
    expect(o).not.toContain('Race Nada')
  })

  it('la temporada, con sus puntos en Stat', () => {
    expect(panel(propia(), 'Season')).toMatch(
      /<dl data-ui="Stat"[\s\S]*?<dt[^>]*>Season points<\/dt><dd[^>]*>120<\/dd>/,
    )
  })

  it('el palmarés: la carrera y lo que ganó, y la temporada con su recorrido', () => {
    const p = panel(propia(), 'Palmarès')
    expect(p).toContain('Race Oman')
    expect(p).toContain('Stage win · Stage 2')
    expect(p).toContain('Season 1 · Al Rustaq → Muscat')
  })

  it('los resultados, en la RankTable de My races', () => {
    const r = panel(propia(), 'Recent results')
    expect(r).toContain('data-ui="RankTable"')
    expect(r).toMatch(/<a [^>]*href="\/world\/races\/race-oman"[^>]*>Race Oman<\/a>/)
  })

  it('el corredor: la edad, la nación, dónde vive, el equipo, el papel con su editor y el puesto, en un dl', () => {
    const r = panel(propia(), 'Rider')
    expect(r).toMatch(/<dt[^>]*>Age<\/dt><dd[^>]*>24 · born day \d+ of the season/)
    expect(r).toMatch(/<dt[^>]*>Nation<\/dt><dd[^>]*>[\s\S]*?href="\/world\/nations\/ES"[\s\S]*?Spain/)
    expect(r).toMatch(/<dt[^>]*>Lives in<\/dt><dd[^>]*>[\s\S]*?France/)
    expect(r).toMatch(/<dt[^>]*>Team<\/dt><dd[^>]*>[\s\S]*?href="\/world\/teams\/t-sol"[\s\S]*?Team Sol/)
    expect(r).toMatch(/<dt[^>]*>Role<\/dt><dd[^>]*>[\s\S]*?Change role/)
    expect(r).toMatch(/<dt[^>]*>Season rank<\/dt><dd[^>]*>#40 of 400/)
  })

  it('en declive, su Chip, sin title', () => {
    const r = panel(pinta('/me/profile', { entrenador: { ...ENTRENADOR, declining: true } }), 'Rider')
    expect(r).toMatch(/data-ui="Chip" data-variant="warn"[\s\S]*?Declining/)
    expect(r).not.toContain('title=')
  })

  it('sin el maillot de su equipo todavía, su hueco, y nada se rompe', () => {
    const html = pinta('/me/profile', { equipos: false })
    expect(html).toContain('data-ui="RiderHeader"')
    expect(html).not.toContain('aria-label="Show the kit full screen"')
  })

  it('ninguna clase de la paleta ni del tema de antes, ni un title', () => {
    const html = propia()
    expect(html).not.toMatch(/\b(slate|indigo|emerald|amber|rose|cyan)-\d/)
    expect(html).not.toContain('brand-')
    expect(html).not.toContain('title=')
  })
})

describe('la ficha ajena (§4.6; PR 21h)', () => {
  const ajena = () => pinta('/world/riders/r2')

  it('la cabecera: sin Player, que es un bot, y su salud pública en su Chip, con hasta cuándo', () => {
    const html = ajena()
    expect(html).toMatch(/<header data-ui="RiderHeader" data-variant="rider"/)
    expect(html).not.toMatch(/data-ui="Chip" data-variant="accent"/)
    expect(html).toMatch(
      /data-ui="Chip" data-variant="bad"[\s\S]*?Injured · out until Day 205 · ~6 days/,
    )
  })

  it('la respuesta, Attributes; y nada de lo privado', () => {
    const html = ajena()
    expect(respuestas(html)).toBe(1)
    expect(panel(html, 'Attributes')).toMatch(/^<section data-ui="Panel"[^>]*data-answer=""/)
    expect(titulos(html)).toEqual(['Attributes', 'Season', 'Palmarès', 'Badges', 'Recent results', 'Rider'])
    expect(html).not.toContain('through this band')
    expect(html).not.toContain('data-variant="trend"')
    expect(html).not.toContain('Coach:')
    expect(html).not.toContain('Change role')
  })
})
