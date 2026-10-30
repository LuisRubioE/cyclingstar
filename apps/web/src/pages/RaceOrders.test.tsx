import type { RaceOrders as Hoja, RaceStage, StageOrder, UpcomingRace } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { type OrdersDraft, defaultOrder } from '../domain/raceOrdersDraft'
import { horizonKey } from '../queryClient'
import { RaceOrders } from './RaceOrders'
import { healthWith, horizonWith } from './__fixtures__/world'

/**
 * LA PANTALLA DE ÓRDENES CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21i), en estático con la
 * caché ya llena. `PageHeader`; la carrera en un `Field` `select`; cada etapa en su `Panel`, con su título como
 * toda etapa (§4.10), su tipo en palabra, sus km y el parte en palabras (`Rain`, `Showers`, `Dry`; 3-d); cada
 * orden en su `Field`, los equipos en `Checkbox` y los esprints y la montaña en `Segmented`; los avisos con su
 * icono; y guardar, en la barra de guardar (`ActionBar`, `Save orders`), que sin cambios no se pinta: con algo
 * tocado, con un borrador inicial (`initialDraft`), porque el test no puede pulsar. La respuesta de la 25, el
 * `Panel` de la primera etapa. Lo que hacen los controles, en `raceOrdersEdit.test.ts`. Lo que pesa cada orden
 * no cambia (H-08).
 */

const REV = '200.1'
const key = (...base: unknown[]) => horizonKey(base, REV)

const proxima = (over: Partial<UpcomingRace> & Pick<UpcomingRace, 'raceKey' | 'raceName'>) => ({
  raceId: over.raceKey.split(':')[0] ?? over.raceKey,
  raceClass: '2.1',
  country: 'FR',
  startGameDay: 202,
  daysUntil: 2,
  stageCount: 3,
  ongoing: false,
  bib: null,
  travelOut: [],
  travelBack: [],
  travelPaid: null,
  ...over,
})

const PROXIMAS: UpcomingRace[] = [
  proxima({ raceKey: 'race-oman:s0', raceName: 'Race Oman', daysUntil: 0, ongoing: true }),
  proxima({ raceKey: 'race-france:s0', raceName: 'Race France' }),
  proxima({ raceKey: 'race-var:s0', raceName: 'Race Var', daysUntil: 6, stageCount: 1 }),
]

const etapa = (day: number, over: Partial<RaceStage> = {}): RaceStage => ({
  day,
  name: `Stage ${day}`,
  kind: 'llana',
  timeTrial: false,
  km: 180,
  altimetry: '<svg viewBox="0 0 720 200"></svg>',
  forecast: { lluvia: 60, grados: 14, fiabilidad: 90 },
  from: 'Lyon',
  to: 'Grenoble',
  ...over,
})

const HOJA: Hoja = {
  race: { id: 'race-france', name: 'Race France' },
  stages: [
    etapa(1),
    etapa(2, { kind: 'reina', forecast: { lluvia: 30, grados: 8, fiabilidad: 40 } }),
    etapa(3, { kind: 'cri', timeTrial: true, from: null, to: null, forecast: null }),
  ],
  orders: [],
  teammates: [{ id: 'm1', name: 'Mia Lund' }],
  rivals: [{ id: 'r1', name: 'Eva Sanz' }],
  teams: [
    { id: 't-sol', name: 'Team Sol' },
    { id: 't-mar', name: 'Team Mar' },
  ],
}

const UN_DIA: Hoja = {
  ...HOJA,
  race: { id: 'race-var', name: 'Race Var' },
  stages: [etapa(1, { from: 'Toulon', to: 'Nice' })],
}

interface Cache {
  /** false, mientras llegan las carreras */
  readonly proximas?: UpcomingRace[] | false
  /** la hoja de la carrera que se abre: false, mientras llega */
  readonly hoja?: Hoja | false
  /** las órdenes guardadas de la hoja */
  readonly orders?: StageOrder[]
  /** las etapas de la carrera que se abre corridas y sin ver */
  readonly sinVer?: number[]
  /** el `?race=` del enlace */
  readonly race?: string
  /** lo tocado sin guardar, como si el jugador lo hubiera tocado */
  readonly draft?: OrdersDraft
}

function pinta({ proximas = PROXIMAS, hoja = HOJA, orders, sinVer = [], race, draft }: Cache = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'on'))
  client.setQueryData(['admin-whoami'], null)
  const abierta = race ?? draft?.raceKey ?? 'race-france:s0'
  client.setQueryData(
    ['horizon'],
    horizonWith({
      rev: REV,
      ready:
        sinVer.length === 0
          ? []
          : [{ raceKey: abierta, stages: sinVer, raceName: 'Race', reason: 'own_team' as const }],
    }),
  )
  if (proximas !== false) client.setQueryData(key('rider', 'upcoming'), proximas)
  if (hoja !== false)
    client.setQueryData(['race-orders', abierta], {
      ...hoja,
      orders: orders ?? hoja.orders,
    })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[race === undefined ? '/me/orders' : `/me/orders?race=${race}`]}
      >
        <RaceOrders {...(draft === undefined ? {} : { initialDraft: draft })} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** El `Panel` del catálogo cuyo título empieza así, entero. */
const panel = (markup: string, title: string): string =>
  new RegExp(
    `<section data-ui="Panel"[^>]*>(?:(?!</section>)[\\s\\S])*?>${title}[^<]*</h2>[\\s\\S]*?</section>`,
  ).exec(markup)?.[0] ?? ''
const titulos = (markup: string): string[] =>
  [...markup.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1] ?? '')
const respuestas = (markup: string): number => markup.match(/data-answer=""/g)?.length ?? 0
/** Un `Field` por el id de su control, con su ayuda, si la lleva. */
const campo = (markup: string, id: string): string =>
  new RegExp(
    `<div data-ui="Field"(?:(?!<div data-ui="Field")[\\s\\S])*?id="${id}"[\\s\\S]*?</select>[\\s\\S]*?</div>(?:<p[^>]*>[^<]*</p>)?`,
  ).exec(markup)?.[0] ?? ''
/** Un texto, tal cual, dentro de una expresión. */
const esc = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** La opción marcada de un `Segmented`, por su nombre. */
const marcada = (markup: string, grupo: string): string =>
  new RegExp(
    `aria-label="${grupo}"(?:(?!aria-label=)[\\s\\S])*?aria-checked="true"[^>]*>([^<]+)<`,
  ).exec(markup)?.[1] ?? ''

describe('la pantalla de órdenes (§17.21; PR 21i)', () => {
  it('la cabecera en PageHeader, y la carrera en un Field select con su rótulo y sus días', () => {
    const html = pinta()
    expect(html).toMatch(/<header data-ui="PageHeader"[\s\S]*?<h1[^>]*>Race orders<\/h1>/)
    const carrera = campo(html, 'race-picker')
    expect(carrera).toMatch(/<label for="race-picker"[^>]*>Race<\/label>/)
    // la que ya se corre no se abre por defecto, y dice que se corre
    expect(carrera).toContain('<option value="race-oman:s0">Race Oman · racing now')
    expect(carrera).toContain('<option value="race-france:s0" selected="">Race France · in 2 days')
    expect(carrera).toContain('Race Var · in 6 days')
    expect(carrera).toMatch(/<p [^>]*>Set your autopilot for each stage, then save once\.<\/p>$/)
    expect(html).not.toContain('(in 2d)')
  })

  it('una sola respuesta, el Panel de la primera etapa', () => {
    const html = pinta()
    expect(respuestas(html)).toBe(1)
    expect(panel(html, 'Stage 1')).toMatch(/^<section data-ui="Panel"[^>]*data-answer=""/)
  })

  it('cada etapa en su Panel, con su título como toda etapa; la crono, sin ciudades, su nombre', () => {
    expect(titulos(pinta())).toEqual([
      'Stage 1 · Lyon → Grenoble',
      'Stage 2 · Lyon → Grenoble',
      'Stage 3',
    ])
  })

  it('la de un día, por el nombre de su carrera, sin su Stage 1, sin el resumen y sin copias que no van a ningún sitio', () => {
    const html = pinta({ hoja: UN_DIA, race: 'race-var:s0' })
    expect(titulos(html)).toEqual(['Race Var · Toulon → Nice'])
    expect(html).not.toContain('Copy to')
    expect(html).not.toContain('road stage')
    expect(html).toContain('aria-label="About the forecast for Race Var"')
    expect(campo(html, 'race-picker')).toContain('<option value="race-var:s0" selected="">')
  })

  it('de qué va el día: su tipo en palabra, sus km y el parte en palabras, la perspectiva tenue y su porqué en su InfoButton', () => {
    const html = pinta()
    const llana = panel(html, 'Stage 1')
    expect(llana).toMatch(/>Flat<[\s\S]*?180 km[\s\S]*?Rain 60% · 14°C/)
    // su nombre, con su etapa, que en una vuelta son veintiuna
    expect(llana).toContain('aria-label="About the forecast for Stage 1"')
    expect(llana).toContain('90% confidence.')
    // en la línea que parte, y no dentro de una caja que no parte: su porqué, al renglón siguiente (§4.3)
    expect(llana).toMatch(
      /<p class="flex flex-wrap[^"]*">(?:(?!<\/p>)[\s\S])*?Rain 60% · 14°C<\/span><span data-ui="InfoButton"/,
    )
    const reina = panel(html, 'Stage 2')
    expect(reina).toMatch(/>Mountain</)
    expect(reina).toMatch(/class="text-ink-3">Showers 30% · 8°C \(outlook\)/)
    expect(reina).toContain(
      '40% confidence. A forecast this far out is closer to the local average than to the sky.',
    )
    // la crono no tiene parte
    expect(panel(html, 'Stage 3')).not.toContain('About the forecast for')
    for (const g of ['🌧', '🌦', '☀', '⚠', 'ℹ']) expect(html, g).not.toContain(g)
    expect(html).not.toContain('title=')
  })

  it('cada orden en su Field, con su rótulo y su porqué: el papel con su id role-N, la mentalidad, el esfuerzo, cuándo voy, a qué salgo y qué hacemos con una fuga', () => {
    const html = pinta()
    const filas: [string, string, string][] = [
      ['role-1', 'Role', 'Rides on instinct with no special job — a free role.'],
      ['mentality-1', 'Mentality', 'Conservative — saves energy and only reacts.'],
      ['effort-1', 'Effort', 'Normal — a balanced effort for the day.'],
      ['trigger-1', 'When I go', 'No appointment. Your mentality picks the moment.'],
      ['day-goal-1', 'What I ride for', 'Leave it blank and the day is planned for you.'],
      [
        'chase-1',
        'What we do with a breakaway',
        'Leave it blank and the team judges each move on its merits.',
      ],
    ]
    for (const [id, rotulo, porque] of filas) {
      const f = campo(html, id)
      expect(f, id).toMatch(new RegExp(`<label for="${id}"[^>]*>${rotulo}</label>`))
      expect(f, id).toMatch(new RegExp(`<p [^>]*>${esc(porque)}</p>$`))
    }
    // ningún select fuera de su Field
    const selects = html.match(/<select/g)?.length ?? 0
    const enField = html.match(/<div data-ui="Field" data-variant="select"/g)?.length ?? 0
    expect(selects).toBe(enField)
  })

  it('el objetivo, solo con un papel que lo pide: el compañero de un lanzador o de un gregario y el rival de un marcador', () => {
    const lanzador = pinta({ orders: [{ ...defaultOrder(1), role: 'lanzador' }] })
    expect(campo(lanzador, 'target-1')).toMatch(/>Teammate to lead out<\/label>/)
    const gregario = pinta({ orders: [{ ...defaultOrder(1), role: 'gregario' }] })
    expect(campo(gregario, 'target-1')).toMatch(/>Teammate to work for<\/label>/)
    expect(campo(gregario, 'target-1')).toContain('Mia Lund')
    const marcador = pinta({ orders: [{ ...defaultOrder(1), role: 'marcador' }] })
    expect(campo(marcador, 'target-1')).toMatch(/>Rival to mark<\/label>/)
    expect(campo(marcador, 'target-1')).toContain('Eva Sanz')
    expect(campo(pinta(), 'target-1')).toBe('')
  })

  it('el disparo: cada forma, con lo suyo en su Field', () => {
    const km = pinta({
      orders: [{ ...defaultOrder(1), triggerOn: { at: 'km', km: 40 }, triggerKm: 40 }],
    })
    expect(km).toMatch(
      /<label for="trigger-km-1"[^>]*>Kilometre<\/label>[\s\S]*?<input [^>]*type="number"[^>]*min="0" max="180"[^>]*value="40"/,
    )
    // una orden de antes, con el kilómetro solo en triggerKm, se ve igual
    const vieja = pinta({ orders: [{ ...defaultOrder(1), triggerOn: null, triggerKm: 25 }] })
    expect(vieja).toMatch(/<label for="trigger-km-1"[^>]*>Kilometre<\/label>[\s\S]*?value="25"/)
    const puerto = pinta({
      orders: [{ ...defaultOrder(1), triggerOn: { at: 'climb', which: 'last', part: 'pie' } }],
    })
    expect(campo(puerto, 'trigger-climb-1')).toMatch(/>Which climb<\/label>/)
    expect(campo(puerto, 'trigger-part-1')).toMatch(/>Where on the climb<\/label>/)
    const hueco = pinta({ orders: [{ ...defaultOrder(1), triggerOn: { at: 'gap', overS: 120 } }] })
    expect(hueco).toMatch(/>Gap in seconds<\/label>[\s\S]*?step="15"/)
    const tiempo = pinta({
      orders: [{ ...defaultOrder(1), triggerOn: { at: 'weather', cond: 'viento' } }],
    })
    expect(campo(tiempo, 'trigger-weather-1')).toMatch(/>Weather<\/label>/)
    expect(campo(tiempo, 'trigger-weather-1')).toContain(
      '<option value="viento" selected="">the wind picks up</option>',
    )
    const sector = pinta({
      orders: [{ ...defaultOrder(1), triggerOn: { at: 'sector', index: 3 } }],
    })
    expect(sector).toMatch(
      /<label for="trigger-sector-1"[^>]*>Sector number<\/label>[\s\S]*?<input [^>]*type="number"[^>]*min="1"[^>]*value="3"/,
    )
    // con una cita, su porqué dice otra cosa
    expect(campo(puerto, 'trigger-1')).toContain(
      'A move launched here, if the legs are there when it comes.',
    )
  })

  it('los equipos con los que no tiro: una Checkbox de 44 cada uno, plegados y sin región, con los elegidos contados y el nombre de su etapa', () => {
    const html = panel(
      pinta({ orders: [{ ...defaultOrder(1), refuseRelayTeams: ['t-mar'] }] }),
      'Stage 1',
    )
    expect(html).toMatch(/<legend[^>]*>Teams I will not work with<\/legend>/)
    expect(html).toContain('aria-label="Choose teams · 1 chosen, Stage 1"')
    // sin región: en una vuelta serían veintiuna con el mismo nombre (21b)
    expect(html).not.toContain('role="region"')
    expect(html.match(/data-ui="Checkbox"/g)).toHaveLength(2)
    expect(html).toMatch(
      /data-ui="Checkbox" data-variant="default" data-state="active"[\s\S]*?Team Mar/,
    )
    expect(html).toMatch(
      /data-ui="Checkbox" data-variant="default" data-state="inactive"[\s\S]*?Team Sol/,
    )
    // ninguna casilla suelta
    expect(html.match(/<input type="checkbox"/g)).toHaveLength(2)
    // sin ninguno elegido, sin cuenta
    expect(panel(pinta(), 'Stage 1')).toContain('aria-label="Choose teams, Stage 1"')
    // sin equipos en la carrera, sin la pregunta
    expect(panel(pinta({ hoja: { ...HOJA, teams: [] } }), 'Stage 1')).not.toContain(
      'Teams I will not work with',
    )
  })

  it('los esprints y la montaña, cada uno un Segmented con su rótulo a la vista, con lo que dice la orden', () => {
    const html = panel(pinta({ orders: [{ ...defaultOrder(1), contestClimbs: true }] }), 'Stage 1')
    expect(html.match(/data-ui="Segmented"/g)).toHaveLength(2)
    expect(html).toMatch(
      />Points-jersey sprints<[\s\S]*?role="radiogroup" aria-label="Points-jersey sprints"/,
    )
    expect(html).toMatch(
      />Mountain \(KOM\) points<[\s\S]*?role="radiogroup" aria-label="Mountain \(KOM\) points"/,
    )
    expect(marcada(html, 'Mountain \\(KOM\\) points')).toBe('Chase them')
    expect(marcada(html, 'Points-jersey sprints')).toBe('Let them go')
    const esprints = panel(
      pinta({ orders: [{ ...defaultOrder(1), contestSprints: true }] }),
      'Stage 1',
    )
    expect(marcada(esprints, 'Points-jersey sprints')).toBe('Chase them')
    expect(marcada(esprints, 'Mountain \\(KOM\\) points')).toBe('Let them go')
    expect(html).toContain('Costs energy.')
  })

  it('la crono, sin órdenes de grupo ni copias', () => {
    const crono = panel(pinta(), 'Stage 3')
    expect(crono).toContain('Individual time trial')
    expect(crono).not.toContain('data-ui="Field"')
    expect(crono).not.toContain('Copy to')
  })

  it('lo que diría un director, con su icono en su tono y sin glifos', () => {
    const html = panel(pinta({ orders: [{ ...defaultOrder(1), role: 'lanzador' }] }), 'Stage 1')
    expect(html).toMatch(
      /class="[^"]*text-warn[^"]*"><svg[^>]*data-variant="warning"[^>]*aria-label="Warning"[\s\S]*?A lead-out rider with nobody to lead out just rides\./,
    )
  })

  it('copiar a las demás: dos Button secondary, con el nombre entero y a todo lo ancho en el teléfono', () => {
    const html = panel(pinta(), 'Stage 1')
    expect(html).toMatch(
      /data-ui="Button" data-variant="secondary"[^>]*>[\s\S]*?Copy to every flat stage/,
    )
    expect(html).toMatch(
      /data-ui="Button" data-variant="secondary"[^>]*>[\s\S]*?Copy to the rest of the race/,
    )
    // su nombre entero, con la etapa de donde copia; y a todo lo ancho donde no cabe en un renglón
    expect(html).toContain('aria-label="Copy to every flat stage, from Stage 1"')
    expect(html).toContain('aria-label="Copy to the rest of the race, from Stage 1"')
    expect(html.match(/<button [^>]*class="[^"]*w-full sm:w-auto/g)).toHaveLength(2)
  })

  it('el resumen de arriba, el texto de 3-d, sin el ⚠', () => {
    expect(pinta()).toContain('2 road stages, no clashing orders.')
    expect(pinta({ orders: [{ ...defaultOrder(1), role: 'lanzador' }] })).toContain(
      '2 road stages · 1 with orders that clash. Look for the warning below.',
    )
  })

  it('sin cambios, sin la barra de guardar ni otro botón de guardar', () => {
    const html = pinta()
    expect(html).not.toContain('data-ui="ActionBar"')
    expect(html).not.toContain('Save all')
  })

  it('con algo tocado, la barra de guardar: cuántos cambios, la carrera y su etapa, y Save orders, la acción', () => {
    const html = pinta({
      draft: { raceKey: 'race-france:s0', orders: { 2: { ...defaultOrder(2), role: 'sprinter' } } },
    })
    expect(html).toMatch(/data-ui="ActionBar" data-variant="default" data-state="dirty"/)
    expect(html).toContain('1 change · Race France: Stage 2')
    expect(html).toMatch(/<button [^>]*data-primary-action=""[^>]*>[\s\S]*?Save orders/)
    // la de un día, la carrera sola
    const unDia = pinta({
      hoja: UN_DIA,
      draft: { raceKey: 'race-var:s0', orders: { 1: { ...defaultOrder(1), effort: 'a_tope' } } },
    })
    expect(unDia).toContain('1 change · Race Var</p>')
  })

  it('con algo tocado en una carrera, se abre en ella, aunque la de por defecto sea otra', () => {
    const html = pinta({
      hoja: UN_DIA,
      draft: { raceKey: 'race-var:s0', orders: { 1: { ...defaultOrder(1), effort: 'a_tope' } } },
    })
    expect(campo(html, 'race-picker')).toContain('<option value="race-var:s0" selected="">')
  })

  it('con una etapa corrida y sin ver, la puerta en su Panel, que contesta, y sin las etapas', () => {
    const html = pinta({ sinVer: [1] })
    expect(titulos(html)).toEqual(['Stage 1 is waiting for you'])
    expect(respuestas(html)).toBe(1)
    expect(panel(html, 'Stage 1 is waiting for you')).toMatch(
      /^<section data-ui="Panel"[^>]*data-answer=""/,
    )
    // y mientras la hoja llega detrás de la puerta, una sola respuesta: la puerta (la revisión del 21i)
    const llegando = pinta({ sinVer: [1], hoja: false })
    expect(respuestas(llegando)).toBe(1)
    expect(llegando).not.toContain('data-ui="QueryView"')
  })

  it('sin carreras: su PageHeader y el vacío, que contesta', () => {
    const html = pinta({ proximas: [] })
    expect(html).toMatch(/<h1[^>]*>Race orders<\/h1>/)
    expect(html).toMatch(/data-ui="EmptyState"[^>]*data-answer=""/)
    expect(respuestas(html)).toBe(1)
  })

  it('mientras llegan las carreras, y mientras llega la hoja, su espera, que contesta', () => {
    for (const html of [pinta({ proximas: false }), pinta({ hoja: false })]) {
      expect(html).toMatch(/data-ui="QueryView" data-state="loading"/)
      expect(respuestas(html)).toBe(1)
    }
  })

  it('ninguna clase de la paleta ni del tema de antes', () => {
    const html = pinta({ orders: [{ ...defaultOrder(1), role: 'lanzador' }] })
    expect(html).not.toMatch(/\b(?:slate|indigo|emerald|amber|rose|cyan|red|orange)-\d/)
    expect(html).not.toContain('brand-')
    expect(html).not.toContain('rounded-lg')
  })
})
