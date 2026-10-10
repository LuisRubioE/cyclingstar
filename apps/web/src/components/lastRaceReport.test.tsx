import type { ChronicleEntry, RiderRaceReport } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { type LastRace, lastRaceKey } from '../api/lastRace'
import { healthWith } from '../pages/__fixtures__/world'
import { LastRaceReport } from './LastRaceReport'

/**
 * `YOUR LAST RACE` CON LOS MOMENTOS DEL CORREDOR (E2, docs/retransmision.md §12.9, 12-k; paso 12), en
 * estático con la caché ya llena. «What happened to you» son las líneas del acta en que sale el corredor
 * (`report.moments`), redactadas como el acta: con su bandera y su nombre enlazado a la ficha, y nunca la
 * clave cruda de una plantilla, que es lo que `personalNarration` pintaba en las que no conocía. Los
 * `personalEvents` de la etapa re-simulada ya no se pintan. Lo que la API pone en `moments` lo prueba
 * `apps/api/src/routes/lastRace.test.ts`.
 */

const ANA = { id: 'r-ana', name: 'Ana Ruiz', bib: 41, team: 'Team Sol', country: 'ES' }

const report = (over: Partial<RiderRaceReport> = {}): RiderRaceReport => ({
  raceName: 'Race France',
  stageName: 'Stage 3',
  raceId: 'race-france:s0',
  stageDay: 3,
  from: null,
  to: null,
  orders: null,
  position: 12,
  fieldSize: 120,
  timeGapToWinnerS: 34,
  sprintPoints: 0,
  komPoints: 0,
  bonusS: 0,
  winnerName: 'Bea Soler',
  // los de la etapa re-simulada: se siguen mandando y ya no se pintan
  personalEvents: [{ km: 88, plantilla: 'peloton_selection' }],
  story: [],
  ...over,
})

function card(last: LastRace): string {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['health'], healthWith('on', 'off'))
  client.setQueryData(lastRaceKey('world'), last)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LastRaceReport />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Your last race: los momentos del corredor (§12.9, 12-k)', () => {
  it('pinta las líneas del acta en que sale, con su bandera y su nombre enlazado; nunca la clave cruda', () => {
    const moments: ChronicleEntry[] = [
      { km: 87, tS: 7000, plantilla: 'attack_reeled', protagonists: [ANA] },
      { km: 152, tS: 12000, plantilla: 'rider_sits_up', protagonists: [ANA], datos: { toGo: 18 } },
    ]
    const html = card({ report: report({ moments }), ready: null })
    expect(html).toContain('What happened to you')
    expect(html).toContain('km 87')
    expect(html).toContain('km 152')
    expect(html).toContain('href="/world/riders/r-ana"')
    expect(html).toContain('Ana Ruiz')
    expect(html).toContain('fi-es') // la bandera, la misma <Flag/> del resto de la web
    expect(html).not.toContain('attack_reeled')
    expect(html).not.toContain('rider_sits_up')
    // los momentos de la etapa re-simulada ya no salen
    expect(html).not.toContain('km 88')
    expect(html).not.toContain('peloton_selection')
  })

  it('sin momentos, el corredor fue en el grupo sin un movimiento que contar', () => {
    for (const moments of [[], undefined]) {
      const html = card({ report: report(moments === undefined ? {} : { moments }), ready: null })
      expect(html).toContain('You rode in the bunch without a decisive move.')
      expect(html).not.toContain('peloton_selection')
    }
  })
})
