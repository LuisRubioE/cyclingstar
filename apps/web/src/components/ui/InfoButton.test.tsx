import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InfoButton } from './InfoButton'

/**
 * `InfoButton` (E3, docs/visual.md §4.3; PR 9a): `closed` y `open`, con `aria-expanded` y `aria-controls`
 * a la caja del porqué, que está siempre en el árbol (oculta cerrada).
 */

const html = (defaultOpen: boolean) =>
  renderToStaticMarkup(
    <InfoButton label="About travel days" defaultOpen={defaultOpen}>
      You don&apos;t train on travel days: 1 out, 1 back.
    </InfoButton>,
  )
const controls = (s: string) => /aria-controls="([^"]+)"/.exec(s)?.[1] ?? 'nada'

describe('InfoButton', () => {
  it('closed: el botón con su nombre concreto y el porqué, oculto', () => {
    const s = html(false)
    expect(s).toMatch(/^<span data-ui="InfoButton" data-variant="default" data-state="closed"/)
    expect(s).toContain('aria-label="About travel days" aria-expanded="false"')
    expect(s).toMatch(new RegExp(`<span id="${controls(s)}" hidden=""`))
    expect(s).toMatch(/data-variant="info"[^>]*aria-hidden="true"/)
  })

  it('open: aria-expanded y el porqué a la vista, en el flujo', () => {
    const s = html(true)
    expect(s).toContain('data-state="open"')
    expect(s).toContain('aria-expanded="true"')
    expect(s).not.toContain('hidden=""')
    expect(s.replace(/&#x27;/g, "'")).toContain("You don't train on travel days: 1 out, 1 back.")
  })

  it('nunca en un title', () => {
    expect(html(true)).not.toContain('title=')
  })
})
