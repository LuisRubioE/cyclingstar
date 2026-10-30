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
    expect(html).toContain('aria-label="Spain"') // la bandera, la misma <Flag/> del resto de la web
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

describe('Your last race con el sistema (E3, docs/visual.md §4.6; PR 21h)', () => {
  it('su Panel, con la carrera, la etapa y su recorrido, y el veredicto', () => {
    const html = card({ report: report({ from: 'Lyon', to: 'Grenoble' }), ready: null })
    expect(html).toMatch(/^<section data-ui="Panel"[\s\S]*?<h2[^>]*>Your last race<\/h2>/)
    // la etapa y su recorrido, como toda etapa (§4.10): `Stage 3 · Gandia → Alcoi`
    expect(html).toMatch(/Race France · Stage 3 · <span data-ui="StageRoute"[^>]*>Lyon → Grenoble</)
    expect(html).toContain('A strong ride near the front.')
    // sin ciudades, la etapa sola, sin su ·
    expect(card({ report: report(), ready: null })).toContain('Race France · Stage 3</p>')
  })

  it('sus cuatro cifras, en Stat', () => {
    const html = card({ report: report({ sprintPoints: 4 }), ready: null })
    const cifras = [
      ...html.matchAll(/<dl data-ui="Stat"[\s\S]*?<dt[^>]*>([^<]+)<\/dt><dd[^>]*>([^<]+)<\/dd>/g),
    ]
    expect(cifras.map((m) => [m[1], m[2]])).toEqual([
      ['Placing', '12 / 120'],
      ['Gap to winner', '+0:34'],
      ['Sprint pts', '4'],
      ['Mountain pts', '0'],
    ])
  })

  it('quien llega con el ganador, s.t. (§4.10), y no +0:00', () => {
    const html = card({ report: report({ position: 5, timeGapToWinnerS: 0 }), ready: null })
    expect(html).toMatch(/<dt[^>]*>Gap to winner<\/dt><dd[^>]*>s\.t\.<\/dd>/)
    expect(html).not.toContain('+0:00')
  })

  it('el ganador, con el icono race y no con 🏁; sin colores de la paleta', () => {
    const html = card({ report: report(), ready: null })
    expect(html).toMatch(/data-variant="race"[\s\S]*?Bea Soler[\s\S]*?took the win\./)
    expect(html).not.toContain('🏁')
    expect(html).not.toMatch(
      /\b(?:bg|text|border|ring|fill|stroke|from|to|divide)-(?:slate|indigo|emerald|amber|rose|cyan|red|orange)-\d/,
    )
    expect(html).not.toContain('rounded-2xl')
  })

  it('velada, la de LastRaceReady, con su título', () => {
    const html = card({
      report: null,
      ready: {
        raceName: 'Race France',
        season: 0,
        stageDay: 8,
        stageCount: 21,
        km: 180,
        label: 'Flat',
        stageKind: 'llana',
      },
    })
    expect(html).toMatch(/<h2[^>]*>Your last race<\/h2>/)
    expect(html).toContain('Race France, Stage 8 · Ready to watch')
  })
})
