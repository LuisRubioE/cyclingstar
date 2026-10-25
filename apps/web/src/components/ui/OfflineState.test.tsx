import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OfflineState } from './OfflineState'

/**
 * `OfflineState` (E3, docs/visual.md §4.2 y §12.1; PR 4): lo que pinta una consulta en pausa por falta
 * de red, en el sitio del contenido. Render estático, como los demás tests de la web: `data-*`, ARIA y
 * el texto de pantalla.
 */
describe('OfflineState', () => {
  const html = renderToStaticMarkup(<OfflineState />)

  it('es un status con su data-ui y su data-state', () => {
    expect(html).toMatch(/^<div role="status" data-ui="OfflineState" data-state="offline"/)
  })

  it('dice que carga al volver la red', () => {
    expect(html.replace(/&#x27;/g, "'")).toContain("You're offline. This loads when you reconnect.")
  })

  it('el icono no se lee: el texto ya lo dice', () => {
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/)
  })
})
