import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ShowAllRows, toggled } from './ShowAllRows'

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

  it('toggled: la clave entra si no estaba y sale si estaba, en un conjunto nuevo (PR 21l)', () => {
    const vacio: ReadonlySet<string> = new Set()
    const uno = toggled(vacio, 'WT')
    expect([...uno]).toEqual(['WT'])
    expect(vacio.size).toBe(0)
    expect(uno).not.toBe(vacio)
    const dos = toggled(uno, 'PRS')
    expect([...dos].sort()).toEqual(['PRS', 'WT'])
    expect([...toggled(dos, 'WT')]).toEqual(['PRS'])
  })
})
