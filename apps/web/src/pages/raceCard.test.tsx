import type {
  HorizonSummary,
  RacePref,
  RaceStartlist,
  RaceView,
  StageReplay as StageReplayData,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'
import { broadcastHeadKey } from '../api/broadcast'
import { raceViewKey } from '../api/race'
import { stageReplayKey } from '../api/results'
import { Race } from './Race'
import { broadcastHeadWith, healthWith, horizonWith, raceViewWith } from './__fixtures__/world'

/**
 * LA FICHA DE CARRERA BAJO EL VELO (E2, docs/retransmision.md §11.5 y §11.17; sups. C1 a C4 y E9; 11-o; paso
 * 9b), en estático con la caché ya llena: `/health` con sus interruptores, el horizonte, la ficha y, en la
 * carrera de un día, la ruta de su etapa y la cabecera de `Watch`. Lo que se prueba es lo que pinta, no
 * cómo lo pide: sus claves y sus URL las prueba `api/results.test.ts`.
 */

const REV = '200.1'
const SANREMO = 'race-sanremo'

/** La ruta de la etapa 1 de la clásica, sin ver y en el velo (como la sirve la API desde el 7b). */
const veiledStage: StageReplayData = {
  day: 1,
  name: 'Race Sanremo',
  km: 260,
  run: true,
  race: { id: SANREMO, name: 'Race Sanremo', country: 'IT', stageCount: 1 },
  altimetry: '<svg/>',
  champions: {},
  watch: { known: false, reachedS: null, gate: { k: 'not_seen' }, seen: false },
}
const seenStage: StageReplayData = {
  ...veiledStage,
  results: [],
  watch: { known: true, reachedS: null, gate: null, seen: true },
}

function page(
  url: string,
  {
    watch = 'on',
    view,
    horizon = horizonWith({ rev: REV }),
    stage,
    prefs = [],
    startlist,
  }: {
    watch?: 'on' | 'off'
    view: RaceView
    horizon?: HorizonSummary
    stage?: StageReplayData
    /** los objetivos del corredor de quien mira (E3, PR 21a) */
    prefs?: RacePref[]
    /** la lista de salida (la revisión del 21a) */
    startlist?: RaceStartlist
  },
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const raceId = view.race.id
  client.setQueryData(['health'], healthWith(watch, 'on'))
  client.setQueryData(['horizon'], horizon)
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(['race-prefs'], prefs)
  if (startlist !== undefined) client.setQueryData(['race-startlist', raceId], startlist)
  client.setQueryData(raceViewKey(raceId, false, REV), view)
  if (stage !== undefined) {
    client.setQueryData(stageReplayKey(raceId, 1, false, REV), stage)
    client.setQueryData(
      broadcastHeadKey(raceId, 1, undefined, false, REV),
      broadcastHeadWith(raceId, 1),
    )
  }
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/world/races/:raceId" element={<Race />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const tabsOf = (markup: string): string[] =>
  [...markup.matchAll(/role="tab"[^>]*>([^<]+)</g)].map((m) => m[1] ?? '')
const selectedOf = (markup: string): string | undefined =>
  /role="tab" aria-selected="true"[^>]*>([^<]+)</.exec(markup)?.[1]

const sanremo = raceViewWith(1)
const sanremoVeil = horizonWith({
  rev: REV,
  ready: [
    {
      raceKey: `${SANREMO}:s0`,
      raceName: 'Race Sanremo',
      stages: [1],
      reason: 'headline',
    },
  ],
})
const GATE = 'This page shows the result of Stage 1.'

// La ficha de una carrera de un día terminada va diferida (`lazy`, `OneDayRace.tsx`), para que la de una
// vuelta no cargue la etapa: un primer render la pide y, ya cargada, los demás la pintan.
beforeAll(async () => {
  page(`/world/races/${SANREMO}`, { view: sanremo, stage: seenStage })
  await import('./OneDayRace')
  await new Promise((resolve) => setTimeout(resolve, 0))
})

describe('la carrera de un día terminada (11-o; sup. C3 y E9)', () => {
  it('sin ver y con Watch encendido: abre en Watch, sin Result aparte, y la cabecera no dice quién ganó', () => {
    const markup = page(`/world/races/${SANREMO}`, {
      view: sanremo,
      horizon: sanremoVeil,
      stage: veiledStage,
    })
    // re-sellado en W4: sin `Race Radio` (D-16 revocada)
    expect(tabsOf(markup)).toEqual(['Watch', 'Route', 'Report', 'Roll of honour'])
    expect(selectedOf(markup)).toBe('Watch')
    expect(markup).toContain('Finished · ready to watch')
    expect(markup).not.toContain('>Winner<')
  })

  it('?tab=story (los enlaces de hoy) abre Report, que pinta la puerta; ?tab=result también', () => {
    for (const tab of ['story', 'result']) {
      const markup = page(`/world/races/${SANREMO}?tab=${tab}`, {
        view: sanremo,
        horizon: sanremoVeil,
        stage: veiledStage,
      })
      expect(selectedOf(markup)).toBe('Report')
      expect(markup).toContain(GATE)
    }
  })

  // W4 (la revisión de `Watch` del dueño; D-16 revocada): sin `Race Radio`, el enlace viejo a la radio de
  // la carrera sin ver abre la pestaña por defecto, `Watch`, y nada de radio.
  it('?tab=radio de la carrera sin ver abre Watch, la de por defecto, sin radio (W4)', () => {
    const markup = page(`/world/races/${SANREMO}?tab=radio`, {
      view: sanremo,
      horizon: sanremoVeil,
      stage: veiledStage,
    })
    expect(selectedOf(markup)).toBe('Watch')
    expect(markup).not.toContain('race radio')
    expect(markup).not.toContain('Race Radio')
  })

  it('vista o revelada: abre en Report y deja Watch al final', () => {
    const markup = page(`/world/races/${SANREMO}`, { view: sanremo, stage: seenStage })
    expect(tabsOf(markup)).toEqual(['Report', 'Route', 'Roll of honour', 'Watch'])
    expect(selectedOf(markup)).toBe('Report')
  })

  it('compartir, como en la etapa (E3, §14.2; PR 20): Share to watch sobre las pestañas, y Share the report en Report, solo a quien la conoce', () => {
    // con los dos sobre las pestañas, en `Button` de 44, partían en dos renglones a 360 px y bajaban la
    // capa fija, la respuesta de la pantalla (§7.3), casi hasta el tope de la comprobación 7
    const seen = page(`/world/races/${SANREMO}`, { view: sanremo, stage: seenStage })
    const tabs = seen.indexOf('role="tab"')
    expect(seen.indexOf('Share to watch')).toBeGreaterThan(-1)
    expect(seen.indexOf('Share to watch')).toBeLessThan(tabs)
    expect(seen.indexOf('Share the report')).toBeGreaterThan(tabs)
    const veiled = page(`/world/races/${SANREMO}`, {
      view: sanremo,
      horizon: sanremoVeil,
      stage: veiledStage,
    })
    expect(veiled).toContain('Share to watch')
    expect(veiled).not.toContain('Share the report')
  })

  // re-sellado en W4: `Story` era la crónica con el podio y se fue con ella, como `Race Radio`
  it('con Watch apagado: Result primero, sin Story ni Race Radio (W4)', () => {
    const markup = page(`/world/races/${SANREMO}`, { watch: 'off', view: sanremo })
    expect(tabsOf(markup)).toEqual(['Result', 'Route', 'Roll of honour'])
    expect(selectedOf(markup)).toBe('Result')
  })

  it('con Watch apagado y la carrera en el velo, Result pinta la puerta y no la tabla', () => {
    const markup = page(`/world/races/${SANREMO}`, {
      watch: 'off',
      view: sanremo,
      horizon: sanremoVeil,
    })
    expect(markup).toContain(GATE)
  })
})

describe('una vuelta en guardia, conocida hasta la 9 con la 12 corrida (§11.5; sups. C1, C2, C4 y T4)', () => {
  const winner = (stageDay: number) => ({
    stageDay,
    riderId: `r${stageDay}`,
    name: `Rider ${stageDay}`,
    country: 'ES',
    teamName: null,
    isBot: true,
  })
  const tour = raceViewWith(21, {
    status: 'racing',
    runDays: Array.from({ length: 12 }, (_, i) => i + 1),
    stageWinners: Array.from({ length: 9 }, (_, i) => winner(i + 1)),
  })
  const veil = horizonWith({
    rev: REV,
    ready: [
      {
        raceKey: 'race-france:s0',
        raceName: 'Race France',
        stages: [10, 11, 12],
        reason: 'own_rider',
      },
    ],
  })

  it('la cabecera dice hasta dónde son las tablas y ofrece la primera por ver', () => {
    const markup = page('/world/races/race-france', { view: tour, horizon: veil })
    expect(markup).toContain('After stage 9 of 21 · stages 10-12 ready to watch')
    expect(markup).toContain('Watch stage 10')
  })

  it('Stages: ganador y acta de 1 a 9, Ready to watch de 10 a 12, Not raced yet después; el contador, 3', () => {
    const markup = page('/world/races/race-france?tab=stages', { view: tour, horizon: veil })
    expect(markup).toContain('/world/races/race-france/stages/9/report')
    expect(markup.split('Ready to watch</span>').length - 1).toBe(3)
    expect(markup.split('Not raced yet').length - 1).toBe(9)
    // re-sellado en el 21a (E3, §17.21): el contador va en el `Tabs` del catálogo, con su cifra en un `Chip`
    // que el lector no oye y la frase entera en `sr-only`, y no en un `aria-label` sobre un `span`
    // dentro de la pestaña `Stages` (la revisión del 21a: con un `toContain` suelto valía en cualquier sitio)
    expect(markup).toMatch(
      /id="race-section-tab-stages"[^>]*>Stages<span aria-hidden="true"><span data-ui="Chip"[^>]*>3<\/span><\/span><span class="sr-only">3 stages ready to watch<\/span><\/button>/,
    )
  })

  it('terminada con la final velada: Finished · ready to watch en lugar del ganador', () => {
    const finished = raceViewWith(21, {
      gc: [
        {
          riderId: 'r1',
          name: 'Rider 1',
          country: 'ES',
          teamName: null,
          isBot: true,
          tiempoTotalS: 3600,
        },
      ],
    })
    const finalVeil = horizonWith({
      rev: REV,
      ready: [
        {
          raceKey: 'race-france:s0',
          raceName: 'Race France',
          stages: [20, 21],
          reason: 'headline',
        },
      ],
    })
    const markup = page('/world/races/race-france', { view: finished, horizon: finalVeil })
    expect(markup).toContain('Finished · ready to watch')
    expect(markup).not.toContain('>Winner<')
    // sin velo, el ganador de hoy
    expect(page('/world/races/race-france', { view: finished })).toContain('>Winner<')
  })

  it('sin velo para quien mira (SPOILER_MODE apagado o un jugador con admins), la ficha de hoy', () => {
    const markup = page('/world/races/race-france?tab=stages', {
      view: tour,
      horizon: horizonWith({ rev: 'world' }),
    })
    expect(markup).not.toContain('ready to watch')
    expect(markup).not.toContain('Follow without spoilers')
  })
})

/**
 * LA FICHA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21a): la cabecera, el estado y la
 * marca de origen en `Chip`, el velo en un `Notice`, el objetivo en `Button` con su porqué en un
 * `InfoButton` (nada vive solo en un `title`, ui/4), las pestañas del catálogo con su contador, las
 * clasificaciones en las pestañas del catálogo, de 44, y cada pestaña en su `Panel`. Los textos, los de hoy.
 */
describe('la ficha de carrera con el sistema (§17.21; PR 21a)', () => {
  const tour = raceViewWith(21, { status: 'racing', runDays: [1, 2, 3] })
  /** El primer elemento con `data-ui="<ui>"` y lo que lleva dentro, hasta su cierre. */
  const first = (html: string, ui: string, tag = 'span'): string =>
    new RegExp(`<${tag}[^>]*data-ui="${ui}"[\\s\\S]*?</${tag}>`).exec(html)?.[0] ?? ''
  const chips = (html: string): string[] =>
    [
      ...html.matchAll(
        /data-ui="Chip" data-variant="([a-z]+)"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)</g,
      ),
    ].map((m) => `${m[1]}:${m[2]}`)

  it('la cabecera: la vuelta a Races de 44 con chevron-left y sin flecha de texto, y el h1 con el nombre', () => {
    const markup = page('/world/races/race-france', { view: tour })
    const back = /<a[^>]*href="\/world\/races"[^>]*>[\s\S]*?<\/a>/.exec(markup)?.[0] ?? ''
    expect(back).toContain('data-variant="chevron-left"')
    expect(back).toMatch(/>Races<\/a>$/)
    expect(back).toContain('min-h-11')
    expect(markup).not.toContain('←')
    expect(markup).toMatch(/<h1[^>]*>[\s\S]*?Race France<\/h1>/)
  })

  it('el estado y la marca de origen, en Chip: Racing now good, Finished info, Upcoming neutral; el origen, siempre neutral (§4.7; H-14, D-59)', () => {
    expect(chips(page('/world/races/race-france', { view: tour }))).toEqual([
      'good:Racing now',
      'neutral:Real route (source cited)',
    ])
    expect(chips(page('/world/races/race-france', { view: raceViewWith(21) }))[0]).toBe(
      'info:Finished',
    )
    const upcoming = raceViewWith(21, { status: 'upcoming', runDays: [] })
    expect(chips(page('/world/races/race-france', { view: upcoming }))[0]).toBe('neutral:Upcoming')
    for (const routeSource of ['generado', 'mixto'] as const) {
      const view = raceViewWith(21, { race: { ...raceViewWith(21).race, routeSource } })
      expect(chips(page('/world/races/race-france', { view }))[1], routeSource).toMatch(/^neutral:/)
    }
  })

  it('el velo, un Notice info que está desde el principio, con la primera por ver de acción', () => {
    const markup = page('/world/races/race-france', {
      view: raceViewWith(21, {
        status: 'racing',
        runDays: Array.from({ length: 12 }, (_, i) => i + 1),
      }),
      horizon: horizonWith({
        rev: REV,
        ready: [
          {
            raceKey: 'race-france:s0',
            raceName: 'Race France',
            stages: [10, 11, 12],
            reason: 'own_rider',
          },
        ],
      }),
    })
    const notice = first(markup, 'Notice', 'div')
    expect(notice).toMatch(
      /^<div data-ui="Notice" data-variant="info" data-state="ready" role="note"/,
    )
    expect(notice).toContain('stages 10-12 ready to watch')
    expect(notice).toMatch(
      /href="\/world\/races\/race-france\/stages\/10"[^>]*>[\s\S]*?Watch stage 10/,
    )
  })

  it('el objetivo: un Button con su estrella, sin title, y su porqué en un InfoButton', () => {
    const pref = (wanted: boolean, callup: RacePref['callup'] = null): RacePref => ({
      raceId: 'race-france',
      name: 'Race France',
      level: 'WT',
      format: 'gran-vuelta',
      startDay: 185,
      stageCount: 21,
      wanted,
      callup,
    })
    const off = page('/world/races/race-france', { view: tour, prefs: [pref(false)] })
    const button =
      /<button[^>]*data-ui="Button"[^>]*>(?:(?!<\/button>)[\s\S])*Target this race<\/span><\/button>/.exec(
        off,
      )?.[0] ?? ''
    expect(button).toContain('data-variant="star-empty"')
    expect(off).not.toMatch(/\stitle="/)
    expect(off).toContain('About targeted races')
    expect(off).not.toMatch(/[☆★]/)
    const on = page('/world/races/race-france', { view: tour, prefs: [pref(true, 'selected')] })
    expect(on).toMatch(/data-variant="star-full"[\s\S]*?Targeted<\/span><\/button>/)
    expect(on).toContain('You&#x27;re in the squad')
  })

  it('las pestañas de la carrera, las del catálogo en page', () => {
    // anclada a su nombre (la revisión del 21a): la de las clasificaciones, abierta, también es del catálogo
    const markup = page('/world/races/race-france', { view: tour })
    expect(markup).toMatch(
      /<div data-ui="Tabs" data-variant="page" data-state="ready"[^>]*><div role="tablist" aria-label="Race"/,
    )
  })

  it('las clasificaciones, en las pestañas del catálogo, de 44, con su panel: sus cuatro no caben en un Segmented a 320', () => {
    const markup = page('/world/races/race-france?tab=classifications', {
      view: raceViewWith(21, { status: 'racing', runDays: [1, 2, 3], points: [], kom: [] }),
    })
    const rail = /role="tablist" aria-label="Classification"[\s\S]*?<\/div>/.exec(markup)?.[0] ?? ''
    expect([...rail.matchAll(/role="tab"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual([
      'General',
      'Points',
      'Mountains',
      'Teams',
    ])
    expect(rail).toMatch(
      /role="tab" aria-selected="true"[^>]*id="race-classification-tab-gc"[^>]*>General</,
    )
    expect(markup).toContain(
      'id="race-classification" role="tabpanel" aria-labelledby="race-classification-tab-gc"',
    )
    expect(markup).not.toContain('data-ui="Segmented"')
  })

  it('con otra clasificación elegida (?cls=teams), su pestaña y su panel van juntos', () => {
    const markup = page('/world/races/race-france?tab=classifications&cls=teams', {
      view: raceViewWith(21, { status: 'racing', runDays: [1, 2, 3], points: [], kom: [] }),
    })
    expect(markup).toMatch(/role="tab" aria-selected="true"[^>]*id="race-classification-tab-teams"/)
    expect(markup).toContain(
      'id="race-classification" role="tabpanel" aria-labelledby="race-classification-tab-teams"',
    )
  })

  it('el tipo de cada etapa, con su palabra a todo ancho: en el teléfono no lo dice solo el color del punto (D-13)', () => {
    const markup = page('/world/races/race-france?tab=stages', { view: raceViewWith(21) })
    expect(markup).toContain('<span class="text-caption text-ink-3">Flat</span>')
    expect(markup).not.toMatch(/class="hidden text-caption text-ink-3 sm:inline">Flat</)
  })

  it('Startlist, Stages, Route y Roll of honour, cada una en su Panel con su título', () => {
    // la lista de salida, la de una carrera que va a empezar (la revisión del 21a: el test no la pintaba)
    const upcoming = raceViewWith(21, { status: 'upcoming', runDays: [] })
    const startlist = page('/world/races/race-france?tab=startlist', {
      view: upcoming,
      startlist: { upcoming: true, daysUntil: 3, frozen: false, teams: [], freeAgents: [] },
    })
    expect(startlist).toMatch(
      /<section data-ui="Panel"[^>]*><div[^>]*><h2[^>]*>Provisional startlist<\/h2>/,
    )
    for (const [tab, title] of [
      ['stages', 'Stages'],
      ['route', 'Stage profiles'],
      ['honours', 'Roll of honour'],
    ] as const) {
      const markup = page(`/world/races/race-france?tab=${tab}`, { view: raceViewWith(21) })
      expect(markup, tab).toMatch(
        new RegExp(`<section data-ui="Panel"[^>]*><div[^>]*><h2[^>]*>${title}</h2>`),
      )
    }
  })
})
