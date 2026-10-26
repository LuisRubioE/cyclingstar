import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

/**
 * `PageHeader` (E3, docs/visual.md §4.4; PR 9a, I-32): el `h1`, uno; la vuelta en las de segundo nivel;
 * la línea de estado, un `<p>` y no una región viva; y cargando.
 */

const html = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('PageHeader', () => {
  it('el h1 y la línea de estado, un p', () => {
    const s = html(<PageHeader title="Training" status="Mixed · your plan runs Day 51 to Day 78" />)
    expect(s).toMatch(/^<header data-ui="PageHeader" data-variant="default" data-state="ready"/)
    expect(s.match(/<h1/g)).toHaveLength(1)
    expect(s).toContain('>Training</h1>')
    expect(s).toMatch(/<p [^>]*>Mixed · your plan runs Day 51 to Day 78<\/p>/)
    expect(s).not.toContain('aria-live')
  })

  it('la vuelta: un enlace al padre con su chevron, que no se lee', () => {
    const s = html(
      <PageHeader title="Race Valencia" back={{ to: '/world/races', label: 'Races' }} />,
    )
    expect(s).toContain('data-variant="back"')
    expect(s).toMatch(/<a [^>]*href="\/world\/races"[^>]*>.*Races<\/a>/)
    expect(s).toMatch(/data-variant="chevron-left"[^>]*aria-hidden="true"/)
  })

  it('cargando: la línea de estado es un esqueleto, que no se lee', () => {
    const s = html(<PageHeader title="Training" status="Mixed" loading />)
    expect(s).toContain('data-state="loading"')
    expect(s).not.toContain('>Mixed<')
    expect(s).toMatch(/<span aria-hidden="true"/)
  })

  it('sin línea de estado, solo el título', () => {
    expect(html(<PageHeader title="News" />)).not.toContain('<p')
  })
})
