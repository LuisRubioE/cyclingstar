import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

/**
 * `EmptyState` (E3, docs/visual.md §4.2; PR 10): el icono, el porqué y la acción, si la hay; sin caja
 * discontinua; y sin porqué no se pinta.
 */

describe('EmptyState', () => {
  it('el icono y el porqué', () => {
    const s = renderToStaticMarkup(
      <EmptyState text="No races in the next four weeks. This month is for building." />,
    )
    expect(s).toMatch(/^<div data-ui="EmptyState" data-variant="info" data-state="empty"/)
    expect(s).toContain('data-ui="Icon" data-variant="info"')
    expect(s).toContain('No races in the next four weeks. This month is for building.')
  })

  it('con su acción', () => {
    const s = renderToStaticMarkup(
      <EmptyState
        icon="race"
        text="You haven't entered a race yet."
        action={<a href="/races">Find a race</a>}
      />,
    )
    expect(s).toContain('data-variant="race"')
    expect(s).toContain('<a href="/races">Find a race</a>')
  })

  it('un vacío sin porqué no se pinta', () => {
    expect(() => renderToStaticMarkup(<EmptyState text=" " />)).toThrow(/un vacío dice por qué/)
  })
})
