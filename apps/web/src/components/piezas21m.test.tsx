import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PALETA, cuantas, pieza } from '../pages/__fixtures__/markup'
import { ErrorBoundary } from './ErrorBoundary'
import { RIDER_LINK_CLASS } from './RiderName'
import { RevealConfirm } from './StageGate'

/**
 * LAS PIEZAS QUE QUEDABAN, CON EL SISTEMA (E3, docs/visual.md §17.21; PR 21m): la pantalla de un error, con
 * los `Button` del catálogo y los tokens, donde iban dos botones a mano en la paleta; la casilla de la puerta
 * del velo, el `Checkbox` del catálogo, donde iba un `input` a mano (ui/3); y el enlace del nombre de un
 * corredor, con los tokens.
 */

const pinta = (node: React.ReactNode) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('la pantalla de un error', () => {
  // la pinta su `render` con el error ya cogido: en estático, React no coge errores
  const fallo = () => {
    const b = new ErrorBoundary({ children: null })
    b.state = { error: new Error('boom') }
    return pinta(b.render())
  }

  it('su título y su texto con los tokens, y el mensaje del error', () => {
    const s = fallo()
    expect(s).toMatch(/<h1[^>]*>Something went wrong<\/h1>/)
    expect(s).toContain('boom')
    expect(s).not.toMatch(PALETA)
  })

  it('volver a probar, el Button primario, y recargar, el secundario; ninguno a mano', () => {
    const s = fallo()
    expect(pieza(s, 'Button', 'Try again')).toMatch(/data-variant="primary"/)
    expect(pieza(s, 'Button', 'Reload the page')).toMatch(/data-variant="secondary"/)
    expect(cuantas(s, /<button(?![^>]*data-ui=)/)).toBe(0)
  })
})

describe('la puerta del velo', () => {
  it('no volver a preguntar, el Checkbox del catálogo, y ningún input a mano (ui/3)', () => {
    const s = pinta(
      <RevealConfirm
        stageDay={3}
        also={[]}
        busy={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(pieza(s, 'Checkbox', 'Don&#x27;t ask again')).toMatch(/data-state="inactive"/)
    // la única casilla, la de dentro del `Checkbox`
    expect(cuantas(s, /type="checkbox"/)).toBe(1)
    expect(pieza(s, 'Checkbox', 'Don&#x27;t ask again')).toContain('type="checkbox"')
    expect(s).not.toMatch(PALETA)
  })
})

describe('el enlace del nombre de un corredor', () => {
  it('con los tokens, sin la paleta', () => {
    expect(RIDER_LINK_CLASS).not.toMatch(PALETA)
  })
})
