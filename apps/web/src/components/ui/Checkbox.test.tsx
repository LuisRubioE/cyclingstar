import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox'

/**
 * `Checkbox` (E3, PR 21i): la casilla, que el catálogo no tenía y pide lo que se marca de varios a la vez (los
 * equipos con los que no se tira, en la pantalla de órdenes). Una fila de 44 con su rótulo a la vista; el
 * `input` nativo, invisible, la cubre entera, y la caja de 24 la pinta su vecina, con el anillo del foco.
 */

const change = () => undefined
const html = (checked: boolean) =>
  renderToStaticMarkup(<Checkbox label="Team Sol" checked={checked} onChange={change} />)

describe('Checkbox', () => {
  it('una fila de 44 con su rótulo a la vista, que nombra a la casilla', () => {
    const s = html(false)
    expect(s).toMatch(
      /^<label data-ui="Checkbox" data-variant="default" data-state="off" class="[^"]*min-h-11/,
    )
    expect(s).toMatch(/<input type="checkbox"[^>]*>[\s\S]*Team Sol<\/span><\/label>$/)
  })

  it('el input nativo cubre la fila entera, invisible, y la caja que se ve es para el ojo', () => {
    const s = html(false)
    const input = /<input[^>]*>/.exec(s)?.[0] ?? ''
    expect(input).toContain('absolute inset-0')
    expect(input).toContain('opacity-0')
    expect(input).not.toContain('checked=""')
    expect(s).toMatch(/<span aria-hidden="true" class="[^"]*size-6[^"]*border-line-strong/)
    // el anillo del foco, en la caja, que es lo que se ve
    expect(s).toContain('peer-focus-visible:outline-focus')
    expect(s).not.toContain('data-variant="check"')
  })

  it('marcada: su estado, la caja en accent y su check', () => {
    const s = html(true)
    expect(s).toContain('data-state="on"')
    expect(/<input[^>]*>/.exec(s)?.[0]).toContain('checked=""')
    expect(s).toMatch(/<span aria-hidden="true" class="[^"]*bg-accent[^"]*text-on-accent/)
    expect(s).toContain('data-variant="check"')
  })

  it('sin colores de la paleta ni title', () => {
    const s = html(true) + html(false)
    expect(s).not.toMatch(/\b(?:slate|indigo|emerald|amber|rose|cyan|red|orange)-\d/)
    expect(s).not.toContain('title=')
  })
})
