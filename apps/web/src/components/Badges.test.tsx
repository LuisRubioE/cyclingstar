import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { healthWith } from '../pages/__fixtures__/world'
import { horizonKey } from '../queryClient'
import { Badges } from './Badges'

/**
 * LOS LOGROS DEL CORREDOR (#95), con el sistema (E3, docs/visual.md §4.6; PR 21h): su `Panel`, cada logro con
 * su emoji, que es contenido (§3.7), su nombre y su porqué a la vista, que antes vivía en un `title` que el dedo
 * no abre (ui/4). Sin logros, nada.
 */

const LOGROS = [
  { id: 'first-win', label: 'First win', icon: '🏆', desc: 'Won a race for the first time.' },
  { id: 'gc', label: 'Overall winner', icon: '🥇', desc: 'Won a stage race overall.' },
]

function pinta(badges: typeof LOGROS): string {
  const client = new QueryClient()
  client.setQueryData(['health'], healthWith('on', 'off'))
  client.setQueryData(horizonKey(['badges', 'r-1'], 'world'), badges)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Badges riderId="r-1" />
    </QueryClientProvider>,
  )
}

describe('Badges (§4.6; PR 21h)', () => {
  it('su Panel, cada logro con su emoji, su nombre y su porqué a la vista; ningún title', () => {
    const html = pinta(LOGROS)
    expect(html).toMatch(/^<section data-ui="Panel"[\s\S]*?<h2[^>]*>Badges<\/h2>/)
    expect(html.match(/<li/g)).toHaveLength(2)
    expect(html).toMatch(
      /<span aria-hidden="true"[^>]*>🏆<\/span>[\s\S]*?First win[\s\S]*?Won a race for the first time\./,
    )
    expect(html).not.toContain('title=')
    expect(html).not.toMatch(
      /\\b(?:bg|text|border|ring|fill|stroke|from|to|divide)-(?:slate|indigo|emerald|amber|rose|cyan|red|orange)-\\d/,
    )
  })

  it('sin logros, nada', () => {
    expect(pinta([])).toBe('')
  })
})
