import type { HorizonSummary, RaceView, StageReplay as StageReplayData } from '@cyclingstar/shared'
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
  watch: { known: false, reachedS: null, gate: { k: 'not_seen' }, seen: false },
}
const seenStage: StageReplayData = {
  ...veiledStage,
  results: [],
  chronicle: [],
  watch: { known: true, reachedS: null, gate: null, seen: true },
}

function page(
  url: string,
  {
    watch = 'on',
    view,
    horizon = horizonWith({ rev: REV }),
    stage,
  }: {
    watch?: 'on' | 'off'
    view: RaceView
    horizon?: HorizonSummary
    stage?: StageReplayData
  },
): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const raceId = view.race.id
  client.setQueryData(['health'], healthWith(watch, 'on'))
  client.setQueryData(['horizon'], horizon)
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(['race-prefs'], [])
  client.setQueryData(raceViewKey(raceId, false, REV), view)
  if (stage !== undefined) {
    client.setQueryData(stageReplayKey(raceId, 1, false, REV), stage)
    client.setQueryData(
      broadcastHeadKey(raceId, 1, undefined, false, REV),
      broadcastHeadWith(raceId, 1),
    )
    client.setQueryData(['painted-radio', raceId, 1, 0], [])
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
      expiresOnDay: 135,
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
    expect(tabsOf(markup)).toEqual(['Watch', 'Route', 'Report', 'Race Radio', 'Roll of honour'])
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

  it('la Race Radio de la carrera sin ver ya no dice que se corrió sin radio (nota 6 del 11a)', () => {
    const markup = page(`/world/races/${SANREMO}?tab=radio`, {
      view: sanremo,
      horizon: sanremoVeil,
      stage: veiledStage,
    })
    expect(markup).not.toContain('before the race radio was recorded')
    // con línea grabada, la radio hasta lo pintado (11a), y con nada visto todavía, sin fotos
    expect(markup).toContain('the race radio fills in as far as you&#x27;ve watched')
  })

  it('vista o revelada: abre en Report y deja Watch al final', () => {
    const markup = page(`/world/races/${SANREMO}`, { view: sanremo, stage: seenStage })
    expect(tabsOf(markup)).toEqual(['Report', 'Race Radio', 'Route', 'Roll of honour', 'Watch'])
    expect(selectedOf(markup)).toBe('Report')
  })

  it('con Watch apagado (el jugador hasta el encendido): las de hoy, Result primero y Story al lado', () => {
    const markup = page(`/world/races/${SANREMO}`, { watch: 'off', view: sanremo })
    expect(tabsOf(markup)).toEqual(['Result', 'Story', 'Race Radio', 'Route', 'Roll of honour'])
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
        expiresOnDay: 263,
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
    expect(markup).toContain('aria-label="3 stages ready to watch"')
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
          expiresOnDay: 263,
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
