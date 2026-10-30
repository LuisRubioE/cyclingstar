import type { BlockReport as Informe } from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { healthWith } from '../pages/__fixtures__/world'
import { horizonKey } from '../queryClient'
import { BlockReport } from './BlockReport'

/**
 * DE DÓNDE SALIÓ CADA PUNTO EN LAS ÚLTIMAS CUATRO SEMANAS (docs/entrenamiento.md §4.6), con el sistema (E3,
 * docs/visual.md §4.6; PR 21h): su `Panel`, cada atributo con su total en su tono y de dónde vino, y las sesiones
 * con su nombre, también las de carrera, que decían su clave cruda (`carrera:race-jaen:e1 ×1`). El
 * `0 race days` de la cabecera es el DD-24 de E2, que E3 no toca (§17, l. 3637).
 */

const INFORME: Informe = {
  rows: [
    {
      attr: 'RES',
      total: 4.1,
      bySource: [
        { source: 'entrenamiento', delta: 4.4 },
        { source: 'declive', delta: -0.3 },
      ],
    },
    { attr: 'SPR', total: -0.6, bySource: [{ source: 'detraining', delta: -0.6 }] },
  ],
  trainingDays: 28,
  raceDays: 0,
  sessions: [
    { activity: 'fondo', days: 9 },
    { activity: 'carrera:race-jaen:e1', days: 1 },
    { activity: 'carrera', days: 2 },
  ],
}

function pinta(report: Informe | null): string {
  const client = new QueryClient()
  client.setQueryData(['health'], healthWith('on', 'off'))
  client.setQueryData(horizonKey(['block-report'], 'world'), report)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <BlockReport />
    </QueryClientProvider>,
  )
}

describe('Last 4 weeks (§4.6; PR 21h)', () => {
  it('su Panel, con los días de la cabecera tal cual (DD-24)', () => {
    const html = pinta(INFORME)
    expect(html).toMatch(/^<section data-ui="Panel"[\s\S]*?<h2[^>]*>Last 4 weeks<\/h2>/)
    expect(html).toContain('28 training days · 0 race days')
  })

  it('cada atributo, con su total en su tono y de dónde vino', () => {
    const html = pinta(INFORME)
    expect(html).toMatch(/Endurance<[\s\S]*?class="[^"]*text-good[^"]*"[^>]*>\+4\.1</)
    expect(html).toMatch(/Sprint<[\s\S]*?class="[^"]*text-bad[^"]*"[^>]*>−0\.6</)
    expect(html).toContain('+4.4 training · −0.3 age')
    expect(html).not.toMatch(
      /\\b(?:bg|text|border|ring|fill|stroke|from|to|divide)-(?:slate|indigo|emerald|amber|rose|cyan|red|orange)-\\d/,
    )
  })

  it('las sesiones, con su nombre: la de carrera, con su etapa, y nunca su clave', () => {
    const html = pinta(INFORME)
    expect(html).toContain('Jaen · Stage 1 ×1')
    expect(html).toContain('Race days ×2')
    expect(html).not.toContain('carrera:')
  })

  it('sin nada que contar, lo dice', () => {
    const html = pinta({ ...INFORME, rows: [] })
    expect(html).toContain('Nothing moved in the last four weeks.')
  })
})
