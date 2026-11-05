import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Expander } from './Expander'

/**
 * `Expander` (E3, docs/visual.md §14.4; PR 21n): una superficie que se pulsa entera para abrir o cerrar lo
 * suyo, con lo que lleve dentro, que un `Button` (texto o icono) no puede: la fila de un grupo de la barra de
 * `Watch` (Ruso-036). Un `<button>` a todo lo ancho, de 44 como mínimo, con `aria-expanded` y `aria-controls`.
 */

describe('Expander', () => {
  it('cerrado: un button con aria-expanded en false, su data-ui y su estado, y lo que lleva dentro', () => {
    const s = renderToStaticMarkup(
      <Expander expanded={false} controls="lista" onToggle={() => {}}>
        <span>Lead group</span>
        <span>+0:42</span>
      </Expander>,
    )
    expect(s).toMatch(
      /^<button type="button" data-ui="Expander" data-variant="default" data-state="closed"/,
    )
    expect(s).toContain('aria-expanded="false"')
    expect(s).toContain('aria-controls="lista"')
    expect(s).toContain('<span>Lead group</span><span>+0:42</span>')
    // de 44 como mínimo y a todo lo ancho (comprobación 5)
    expect(s).toMatch(/class="[^"]*\bmin-h-11\b[^"]*\bw-full\b/)
  })

  it('abierto: aria-expanded en true y su estado; sin controls, sin aria-controls', () => {
    const s = renderToStaticMarkup(
      <Expander expanded onToggle={() => {}}>
        <span>Bunch</span>
      </Expander>,
    )
    expect(s).toMatch(/data-state="open"/)
    expect(s).toContain('aria-expanded="true"')
    expect(s).not.toContain('aria-controls')
  })
})
