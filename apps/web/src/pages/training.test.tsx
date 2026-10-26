import {
  ATTRIBUTES,
  type OrdersResponse,
  type PlanPreview,
  type PlanPreviewDay,
  type PlanPreviewRace,
  type PublicRider,
  type TeamTraining,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { TrainingPlanResponse } from '../api/sheet'
import { ordersWindow, previewRequest, savedDraft } from '../domain/trainingPlan'
import { horizonKey } from '../queryClient'
import { Training } from './Training'
import { healthWith } from './__fixtures__/world'

/**
 * EL CUADRO, ENTERO (E3, docs/visual.md §10; PR 14): la pantalla del jugador del mapa 05 el día 50, en
 * `Mixed` y con el plan `Build`, `Specific`, `Taper`, `Recovery` guardado ese día, convocado a Race Var (el
 * 52, con viaje el 51 y el 53) y a Race Sardegna (del 56 al 60, con viaje el 55 y el 61), y una orden el 62.
 * En estático, con la caché llena y el velo apagado.
 */

const key = (...base: unknown[]) => horizonKey(base, 'world')

const RIDER: PublicRider = {
  id: 'r1',
  name: 'José Quintáns',
  country: 'ES',
  gender: 'm',
  archetype: 'escalador',
  birthSeason: 1,
  attributes: Object.fromEntries(ATTRIBUTES.map((a) => [a, 60])) as PublicRider['attributes'],
}

const VAR: PlanPreviewRace = {
  raceKey: 'race-var:s0',
  raceId: 'race-var',
  name: 'Race Var',
  country: 'FR',
  raceClass: '1',
  stageCount: 1,
  startDay: 52,
  endDay: 52,
  ongoing: false,
  arrival: 'cargado',
  travelOut: [51],
  travelBack: [53],
}
const SARDEGNA: PlanPreviewRace = {
  ...VAR,
  raceKey: 'race-sardegna:s0',
  raceId: 'race-sardegna',
  name: 'Race Sardegna',
  country: 'IT',
  stageCount: 5,
  startDay: 56,
  endDay: 60,
  arrival: 'bien',
  travelOut: [55],
  travelBack: [61],
}

const BLOQUES = ['construccion', 'especifico', 'afinado', 'recuperacion'] as const

/** Los 28 días, del 51 al 78, como los da la vista previa. */
function losDias(): PlanPreviewDay[] {
  const dias: PlanPreviewDay[] = []
  for (let g = 51; g <= 78; g++) {
    const semana = Math.floor((g - 51) / 7)
    const base = { gameDay: g, block: null, raceKey: null }
    if (g === 51 || g === 53)
      dias.push({ ...base, session: 'viaje', intensity: 'normal', source: 'viaje', raceKey: VAR.raceKey, kind: 'travel', load: 1 })
    else if (g === 52)
      dias.push({ ...base, session: null, intensity: null, source: 'carrera', raceKey: VAR.raceKey, kind: 'race', load: 4 })
    else if (g === 55 || g === 61)
      dias.push({ ...base, session: 'viaje', intensity: 'normal', source: 'viaje', raceKey: SARDEGNA.raceKey, kind: 'travel', load: 1 })
    else if (g >= 56 && g <= 60)
      dias.push({ ...base, session: null, intensity: null, source: 'carrera', raceKey: SARDEGNA.raceKey, kind: 'race', load: 4 })
    else if (g === 62)
      dias.push({ ...base, session: 'descanso_total', intensity: 'normal', source: 'orden', kind: 'train', load: 0 })
    else
      dias.push({
        ...base,
        session: 'fondo',
        intensity: 'normal',
        source: 'bloque',
        block: { code: BLOQUES[semana] ?? 'base', week: (semana + 1) as 1 | 2 | 3 | 4 },
        kind: 'train',
        load: 3,
      })
  }
  return dias
}

const viaje = (gameDay: number, race: PlanPreviewRace, direction: 'out' | 'back') => ({
  gameDay,
  raceKey: race.raceKey,
  raceName: race.name,
  country: race.country === null ? null : race.country.toLowerCase(),
  direction,
})

function mundo(mode: TrainingPlanResponse['mode']) {
  const stored: TrainingPlanResponse = {
    mode,
    plan: {
      startDay: 51,
      blocks: [...BLOQUES],
      focusAttr: null,
      intensity: 'normal',
      goalRaceId: null,
    },
    currentDay: 50,
  }
  const orders: OrdersResponse = {
    currentDay: 50,
    horizonDays: 28,
    orders: [{ gameDay: 62, session: 'descanso_total', intensity: 'normal' }],
    raceDays: [52, 56, 57, 58, 59, 60],
    travelDays: [
      viaje(51, VAR, 'out'),
      viaje(53, VAR, 'back'),
      viaje(55, SARDEGNA, 'out'),
      viaje(61, SARDEGNA, 'back'),
    ],
    days: [],
  }
  const preview: PlanPreview = { races: [VAR, SARDEGNA], days: losDias() }
  const team: TeamTraining = { plan: [], canEdit: false, teamName: null }
  return { stored, orders, preview, team }
}

function pinta(mode: TrainingPlanResponse['mode'] = 'mixto'): string {
  const { stored, orders, preview, team } = mundo(mode)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'off'))
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(key('rider', 'me'), RIDER)
  client.setQueryData(key('orders'), orders)
  client.setQueryData(['training-plan'], stored)
  client.setQueryData(['team-training'], team)
  const req = previewRequest(savedDraft(stored), ordersWindow(orders.orders, {}))
  client.setQueryData(key('plan-preview', JSON.stringify(req)), preview)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/me/training']}>
        <Training />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const texto = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

describe('el cuadro de entrenamiento (§10)', () => {
  it('lo que contesta va arriba: una sola respuesta, el Panel de las llegadas', () => {
    const s = pinta()
    expect(s.match(/data-answer=""/g)).toHaveLength(1)
    expect(s).toMatch(/<section data-ui="Panel"[^>]*data-answer=""[^>]*>.{0,200}How you&#x27;ll arrive/)
    expect(s.indexOf('How you&#x27;ll arrive')).toBeLessThan(s.indexOf('Your month'))
    expect(s.indexOf('Your month')).toBeLessThan(s.indexOf('Edit day by day'))
  })

  it('la línea de estado dice el modo y hasta cuándo dura el plan', () => {
    expect(texto(pinta())).toContain('Training Mixed · your plan runs Day 51 to Day 78')
  })

  it('una tarjeta por carrera, con su escala, cuándo y el viaje, y la instrucción de su tramo', () => {
    const s = pinta()
    const t = texto(s)
    expect(t).toContain('Race Var · .1 · one day Day 52 · in 2 days · travel Day 51 and Day 53')
    expect(t).toContain('Race Sardegna · .1 · 5 stages Days 56 to 60 · in 6 days · travel Day 55 and Day 61')
    expect(s).toContain(
      'aria-label="Race Var: you&#x27;ll arrive Loaded, 2 of 5, from too much training to too little training; best is Spot on"',
    )
    expect(t).toContain("Too much training: you'll start tired.")
    expect(t).toContain('A little tired: ready to race, not at your best.')
    expect(t).toContain('Only the start is forecast: later stages depend on how you race them.')
    expect(s).toContain('href="/world/races/race-var"')
  })

  it('las semanas del plan vivo, con su bloque, su tira y su resumen', () => {
    const s = pinta()
    const t = texto(s)
    expect(t).toContain('Week 1 · Days 51 to 57')
    expect(s).toContain('<option value="construccion" selected="">Build</option>')
    expect(s).toContain('aria-label="Week 1, days 51 to 57"')
    for (const l of ['Day 51: travel out', 'Day 52: race', 'Day 53: travel back', 'Day 54: hard training'])
      expect(s).toContain(`<span class="sr-only">${l}</span>`)
    expect(t).toContain('Week 2 · Days 58 to 64')
    // El 62 es `Full rest`, sin carga: la semana 2 entrena dos días, no tres.
    expect(t).toMatch(/1 training day .*2 training days .*7 training days/)
    expect(t).toContain('Load this month:')
  })

  it('la regla del modo, en una línea, y entera para el lector', () => {
    expect(pinta()).toContain(
      '<span class="sr-only">On a day, what wins: race, then travel, then your edit, then block, then team plan, then coach.</span>',
    )
  })

  it('el día a día, plegado: los viajes en un bloque y la orden con su Back to', () => {
    const s = pinta()
    const t = texto(s)
    expect(t).toContain('Show the 28 days')
    expect(t).toContain('Trip to Race Var (FR) · Days 51 to 53 · 3 days off training')
    expect(t).toContain('Trip to Race Sardegna (IT) · Days 55 to 61 · 7 days off training')
    expect(t).toMatch(/Day 62 Your edit .*Back to Specific/)
    expect(t).toContain('Week 1 · Days 51 to 57 · Build')
  })

  it('nunca un número interno: ni TSS ni Rusty', () => {
    const t = texto(pinta())
    expect(t).not.toMatch(/TSS|Rusty|\bGD\b/)
  })

  it('sin cambios no hay barra de guardar', () => {
    expect(pinta()).not.toContain('data-primary-action')
  })

  it('en Coach decides las semanas se ven sin elegir nada, y el día a día lo dice', () => {
    const s = pinta('entrenador')
    const t = texto(s)
    expect(t).toContain('Coach decides · your coach picks every day')
    expect(s).not.toContain('<option value="construccion"')
    expect(t).toContain('Coach mode: nothing you set here is used. Switch to Mixed to edit.')
    expect(t).toContain('Switch to Mixed')
    expect(s).toContain('aria-label="Week 1, days 51 to 57"')
  })
})
