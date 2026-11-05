import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PALETA } from '../pages/__fixtures__/markup'
import { VeilNoticeView } from './VeilNotice'

/**
 * EL AVISO DEL VELO, CON EL SISTEMA (E3, docs/visual.md §4.7 y §17.21; PR 21l): su lógica es de E2 y no se
 * toca; su aspecto, un `Notice` `info` fijo (`role="note"`), con lo que dice en su título y su salida en la
 * acción: `Manage`, a los ajustes del alcance, o `Sign in`, para quien lee sin sesión (14-i). Iba en una caja
 * `amber` a mano, con un `·` entre el texto y el enlace.
 */

const pinta = (kind: 'ranking' | 'results', text: string | null) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <VeilNoticeView kind={kind} text={text} />
    </MemoryRouter>,
  )

describe('VeilNotice', () => {
  it('con su número: un Notice info fijo, lo que dice en su título y Manage, a los ajustes del alcance', () => {
    const s = pinta('results', "Results from 3 stages you haven't watched are hidden")
    expect(s).toMatch(/^<div data-ui="Notice" data-variant="info" data-state="ready" role="note"/)
    expect(s).toContain(
      '<p class="text-body font-semibold text-ink">Results from 3 stages you haven&#x27;t watched are hidden</p>',
    )
    expect(s).toMatch(/<a [^>]*href="\/account#spoilers"[^>]*>(?:(?!<\/a>)[\s\S])*Manage/)
    expect(s).not.toContain('Sign in')
    expect(s).not.toContain('>·<')
    expect(s).not.toMatch(PALETA)
  })

  it('sin sesión y sin número: lo que dice cada página, y Sign in', () => {
    expect(pinta('ranking', null)).toContain('>World ranking · as you know it</p>')
    const s = pinta('results', null)
    expect(s).toContain('>Results from stages you haven&#x27;t watched are hidden</p>')
    expect(s).toMatch(/<a [^>]*href="\/login"[^>]*>(?:(?!<\/a>)[\s\S])*Sign in/)
    expect(s).not.toContain('Manage')
    expect(s).not.toMatch(PALETA)
  })
})
