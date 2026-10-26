import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ShowAllRows } from './ShowAllRows'

/**
 * `ShowAllRows` (E3, docs/visual.md §4.5; PR 12a): el `Show all 85` de las listas de más de 20 filas, a todo
 * lo ancho y de 44, con `aria-expanded`; plegado otra vez, `Show top 20`. Con 20 o menos, no se pinta.
 */

const nada = () => undefined

describe('ShowAllRows', () => {
  it('con más de 20, Show all y cuántas son', () => {
    const s = renderToStaticMarkup(<ShowAllRows total={85} expanded={false} onToggle={nada} />)
    expect(s).toMatch(/^<button type="button" aria-expanded="false" data-ui="ShowAllRows"/)
    expect(s).toContain('Show all 85')
  })

  it('abierta, Show top 20', () => {
    const s = renderToStaticMarkup(<ShowAllRows total={85} expanded onToggle={nada} />)
    expect(s).toContain('aria-expanded="true"')
    expect(s).toContain('Show top 20')
  })

  it('con 20 o menos, nada', () => {
    expect(renderToStaticMarkup(<ShowAllRows total={20} expanded={false} onToggle={nada} />)).toBe(
      '',
    )
  })
})
