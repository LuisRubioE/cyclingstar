import type { StageReplay as StageReplayData } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { stageReportKey } from '../api/broadcast'
import { stageReplayKey } from '../api/results'
import { StageReportPage } from './StageReport'
import { healthWith, horizonWith } from './__fixtures__/world'

/**
 * EL ACTA PÚBLICA (E2, docs/retransmision.md §11.10; E3, docs/visual.md §14.6; PR 20), en estático con la
 * caché ya llena: la ficha de la etapa y su acta. La fila de saltos lleva a `Classifications` solo en una
 * carrera por etapas: en una de un día la etapa ES la carrera, su enlace acaba en la ficha de la carrera,
 * que no tiene esas clasificaciones (la revisión del 20).
 */

const REV = '200.1'

function report(raceId: string, stageCount: number): string {
  const data: StageReplayData = {
    day: 1,
    name: 'Stage 1',
    km: 191,
    run: true,
    race: { id: raceId, name: 'Race Jaén', country: 'ES', stageCount },
    altimetry: '<svg/>',
    champions: {},
    results: [],
    chronicle: [],
    watch: { known: true, reachedS: null, gate: null, seen: true },
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'on'))
  client.setQueryData(['horizon'], horizonWith({ rev: REV }))
  client.setQueryData(['admin-whoami'], null)
  client.setQueryData(['race-startlist', raceId], { upcoming: false, teams: [], freeAgents: [] })
  client.setQueryData(stageReplayKey(raceId, 1, false, REV), data)
  client.setQueryData(stageReportKey(raceId, 1, undefined, false, REV), data)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/world/races/${raceId}/stages/1/report`]}>
        <Routes>
          <Route path="/world/races/:raceId/stages/:day/report" element={<StageReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Los enlaces de la fila de saltos, por su texto. */
const jumps = (markup: string): string[] => {
  const nav = /<nav aria-label="Report sections"[\s\S]*?<\/nav>/.exec(markup)?.[0] ?? ''
  return [...nav.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1] ?? '')
}

describe('el acta pública: la fila de saltos (§14.6; 14-c)', () => {
  it('en una carrera por etapas, Result, Classifications y Chronicle', () => {
    expect(jumps(report('race-france', 21))).toEqual(['Result', 'Classifications', 'Chronicle'])
  })

  it('en una de un día, sin Classifications: su enlace llevaría a la ficha, que no las tiene', () => {
    expect(jumps(report('race-jaen', 1))).toEqual(['Result', 'Chronicle'])
  })
})
