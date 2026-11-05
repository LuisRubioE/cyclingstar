import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RoleEditor, afterRoleChange } from './RoleEditor'

/**
 * CAMBIAR EL PAPEL DECLARADO (#50), con el sistema (E3, docs/visual.md §4.6; PR 21h): cerrado, el papel y
 * `Change role`, un `Button` `quiet` de 44 en lugar del texto de 12 px; abierto, su explicación, el `Field`
 * `select` con su rótulo, `Save` (`primary`) y `Cancel` (`quiet`). Ningún control a mano ni color de la
 * paleta.
 */

const pinta = (defaultOpen = false) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <RoleEditor current="escalada" defaultOpen={defaultOpen} />
    </QueryClientProvider>,
  )

describe('RoleEditor (§4.6; PR 21h)', () => {
  it('cerrado: el papel y Change role, un Button quiet de 44', () => {
    const html = pinta()
    expect(html).toContain('Climber')
    expect(html).toMatch(
      /<button[^>]*data-ui="Button" data-variant="quiet"[^>]*>[\s\S]*?Change role/,
    )
    expect(html).not.toMatch(
      /\b(?:bg|text|border|ring|fill|stroke|from|to|divide)-(?:slate|indigo|emerald|amber|rose|cyan|red|orange)-\d/,
    )
  })

  it('abierto: su explicación, el Field select con su rótulo y sus cinco papeles, Save y Cancel', () => {
    const html = pinta(true)
    expect(html).toContain('Pick a new role.')
    expect(html).toMatch(/data-ui="Field"[\s\S]*?<label[^>]*>Role<\/label>[\s\S]*?<select/)
    expect(html.match(/<option/g)).toHaveLength(5)
    expect(html).toMatch(/data-ui="Button" data-variant="primary"[^>]*>[\s\S]*?Save/)
    expect(html).toMatch(/data-ui="Button" data-variant="quiet"[^>]*>[\s\S]*?Cancel/)
    expect(html).not.toMatch(
      /\b(?:bg|text|border|ring|fill|stroke|from|to|divide)-(?:slate|indigo|emerald|amber|rose|cyan|red|orange)-\d/,
    )
    expect(html).not.toContain('rounded-lg')
  })
})

describe('tras guardar el papel (la revisión del 21h)', () => {
  it('se vuelve a pedir el corredor propio y su ficha pública, de donde salen el papel de la cabecera y el del editor', async () => {
    const qc = new QueryClient()
    const claves = [
      ['rider', 'me', 'world'],
      ['public-rider', 'p1', 'world'],
      ['public-rider', 'p1', 'results', 'world'],
      ['health'],
    ]
    for (const k of claves) qc.setQueryData(k, {})
    await afterRoleChange(qc)
    expect(claves.map((k) => qc.getQueryState(k)?.isInvalidated)).toEqual([true, true, true, false])
  })
})
