import type { RaceOrders as Hoja, RaceStage, StageOrder, UpcomingRace } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { defaultOrder } from '../domain/raceOrdersDraft'
import { horizonKey } from '../queryClient'
import { RaceOrders } from './RaceOrders'
import { healthWith, horizonWith } from './__fixtures__/world'

/**
 * LA PANTALLA DE ÓRDENES CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21i), en estático con la
 * caché ya llena. `PageHeader`; la carrera en un `Field` `select`; cada etapa en su `Panel`, con su título como
 * toda etapa (§4.10), su tipo en palabra, sus km y el parte en palabras (`Rain`, `Showers`, `Dry`; 3-d); cada
 * orden en su `Field`, los equipos en `Checkbox` y los esprints y la montaña en `Segmented`; los avisos con su
 * icono; y guardar, en la barra de guardar (`ActionBar`, `Save orders`), que sin cambios no se pinta. La
 * respuesta de la 25, el `Panel` de la primera etapa. Lo que pesa cada orden no cambia (H-08).
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
}

function pinta({ proximas = PROXIMAS, hoja = HOJA, orders, sinVer = [], race }: Cache = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'on'))
  client.setQueryData(['admin-whoami'], null)
  const abierta = race ?? 'race-france:s0'
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
        <RaceOrders />
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

describe('la pantalla de órdenes (§17.21; PR 21i)', () => {
  it('la cabecera en PageHeader, y la carrera en un Field select con su rótulo y sus días', () => {
    const html = pinta()
    expect(html).toMatch(/<header data-ui="PageHeader"[\s\S]*?<h1[^>]*>Race orders<\/h1>/)
    const carrera = campo(html, 'race-picker')
    expect(carrera).toMatch(/<label for="race-picker"[^>]*>Race<\/label>/)
    expect(carrera).toContain('<option value="race-france:s0" selected="">Race France · in 2 days')
    expect(carrera).toContain('Race Var · in 6 days')
    expect(html).toContain('Set your autopilot for each stage, then save once.')
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

  it('la de un día, por el nombre de su carrera, sin su Stage 1, y sin copias que no van a ningún sitio', () => {
    const html = pinta({ hoja: UN_DIA, race: 'race-var:s0' })
    expect(titulos(html)).toEqual(['Race Var · Toulon → Nice'])
    expect(html).not.toContain('Copy to')
    expect(campo(html, 'race-picker')).toContain('<option value="race-var:s0" selected="">')
  })

  it('de qué va el día: su tipo en palabra, sus km y el parte en palabras, la perspectiva tenue y su porqué en su InfoButton', () => {
    const html = pinta()
    const llana = panel(html, 'Stage 1')
    expect(llana).toMatch(/>Flat<[\s\S]*?180 km[\s\S]*?Rain 60% · 14°C/)
    expect(llana).toContain('aria-label="About the forecast"')
    expect(llana).toContain('90% confidence.')
    const reina = panel(html, 'Stage 2')
    expect(reina).toMatch(/>Mountain</)
    expect(reina).toMatch(/class="text-ink-3">Showers 30% · 8°C \(outlook\)/)
    expect(reina).toContain(
      '40% confidence. A forecast this far out is closer to the local average than to the sky.',
    )
    // la crono no tiene parte
    expect(panel(html, 'Stage 3')).not.toContain('About the forecast')
    for (const g of ['🌧', '🌦', '☀', '⚠', 'ℹ']) expect(html, g).not.toContain(g)
    expect(html).not.toContain('title=')
  })

  it('cada orden en su Field, con su rótulo y su porqué: el papel con su id role-N, la mentalidad, el esfuerzo, cuándo voy, a qué salgo y qué hacemos con una fuga', () => {
    const html = pinta()
    const filas: [string, string][] = [
      ['role-1', 'Role'],
      ['mentality-1', 'Mentality'],
      ['effort-1', 'Effort'],
      ['trigger-1', 'When I go'],
      ['day-goal-1', 'What I ride for'],
      ['chase-1', 'What we do with a breakaway'],
    ]
    for (const [id, rotulo] of filas)
      expect(campo(html, id), id).toMatch(new RegExp(`<label for="${id}"[^>]*>${rotulo}</label>`))
    expect(campo(html, 'role-1')).toContain('Rides on instinct with no special job')
    expect(campo(html, 'mentality-1')).toContain('Conservative')
    expect(campo(html, 'effort-1')).toContain('Normal')
    // ningún select fuera de su Field
    const selects = html.match(/<select/g)?.length ?? 0
    const enField = html.match(/<div data-ui="Field" data-variant="select"/g)?.length ?? 0
    expect(selects).toBe(enField)
  })

  it('el objetivo, solo con un papel que lo pide: el compañero de un gregario y el rival de un marcador', () => {
    const gregario = pinta({ orders: [{ ...defaultOrder(1), role: 'gregario' }] })
    expect(campo(gregario, 'target-1')).toMatch(/>Teammate to work for<\/label>/)
    expect(campo(gregario, 'target-1')).toContain('Mia Lund')
    const marcador = pinta({ orders: [{ ...defaultOrder(1), role: 'marcador' }] })
    expect(campo(marcador, 'target-1')).toMatch(/>Rival to mark<\/label>/)
    expect(campo(marcador, 'target-1')).toContain('Eva Sanz')
    expect(campo(pinta(), 'target-1')).toBe('')
  })

  it('el disparo: el kilómetro, de 0 a los km de la etapa; el puerto, en dos Field; el hueco, de 15 en 15', () => {
    const km = pinta({
      orders: [{ ...defaultOrder(1), triggerOn: { at: 'km', km: 40 }, triggerKm: 40 }],
    })
    expect(km).toMatch(
      /<label for="trigger-km-1"[^>]*>Kilometre<\/label>[\s\S]*?<input [^>]*type="number"[^>]*min="0" max="180"/,
    )
    const puerto = pinta({
      orders: [{ ...defaultOrder(1), triggerOn: { at: 'climb', which: 'last', part: 'pie' } }],
    })
    expect(campo(puerto, 'trigger-climb-1')).toMatch(/>Which climb<\/label>/)
    expect(campo(puerto, 'trigger-part-1')).toMatch(/>Where on the climb<\/label>/)
    const hueco = pinta({ orders: [{ ...defaultOrder(1), triggerOn: { at: 'gap', overS: 120 } }] })
    expect(hueco).toMatch(/>Gap in seconds<\/label>[\s\S]*?step="15"/)
  })

  it('los equipos con los que no tiro: una Checkbox de 44 cada uno, plegados, con los elegidos contados', () => {
    const html = panel(
      pinta({ orders: [{ ...defaultOrder(1), refuseRelayTeams: ['t-mar'] }] }),
      'Stage 1',
    )
    expect(html).toMatch(/<legend[^>]*>Teams I will not work with<\/legend>/)
    expect(html).toMatch(/data-ui="Disclosure"[\s\S]*?1 chosen/)
    expect(html.match(/data-ui="Checkbox"/g)).toHaveLength(2)
    expect(html).toMatch(
      /data-ui="Checkbox" data-variant="default" data-state="on"[\s\S]*?Team Mar/,
    )
    // ninguna casilla suelta
    expect(html.match(/<input type="checkbox"/g)).toHaveLength(2)
  })

  it('los esprints y la montaña, cada uno un Segmented con su rótulo a la vista', () => {
    const html = panel(pinta({ orders: [{ ...defaultOrder(1), contestClimbs: true }] }), 'Stage 1')
    expect(html.match(/data-ui="Segmented"/g)).toHaveLength(2)
    expect(html).toMatch(
      />Points-jersey sprints<[\s\S]*?role="radiogroup" aria-label="Points-jersey sprints"/,
    )
    expect(html).toMatch(
      />Mountain \(KOM\) points<[\s\S]*?role="radiogroup" aria-label="Mountain \(KOM\) points"/,
    )
    expect(html).toMatch(
      /aria-label="Mountain \(KOM\) points"[\s\S]*?aria-checked="true"[^>]*>(?:<[^>]+>)*Chase them/,
    )
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

  it('copiar a las demás: dos Button secondary en cada etapa en línea', () => {
    const html = panel(pinta(), 'Stage 1')
    expect(html).toMatch(
      /data-ui="Button" data-variant="secondary"[^>]*>[\s\S]*?Copy to every flat stage/,
    )
    expect(html).toMatch(
      /data-ui="Button" data-variant="secondary"[^>]*>[\s\S]*?Copy to the rest of the race/,
    )
  })

  it('el resumen de arriba, en palabras y sin el ⚠', () => {
    expect(pinta()).toContain('2 road stages, no clashing orders.')
    expect(pinta({ orders: [{ ...defaultOrder(1), role: 'lanzador' }] })).toContain(
      '2 road stages · 1 with orders that clash: look for the warnings below.',
    )
  })

  it('sin cambios, sin la barra de guardar ni otro botón de guardar', () => {
    const html = pinta()
    expect(html).not.toContain('data-ui="ActionBar"')
    expect(html).not.toContain('Save all')
  })

  it('con una etapa corrida y sin ver, la puerta en su Panel, que contesta, y sin las etapas', () => {
    const html = pinta({ sinVer: [1] })
    expect(titulos(html)).toEqual(['Stage 1 is waiting for you'])
    expect(respuestas(html)).toBe(1)
    expect(panel(html, 'Stage 1 is waiting for you')).toMatch(
      /^<section data-ui="Panel"[^>]*data-answer=""/,
    )
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
