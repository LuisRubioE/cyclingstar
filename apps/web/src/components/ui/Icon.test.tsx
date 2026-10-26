import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'
import { ICONS } from './icons'
import type { IconName } from './types'

/**
 * `Icon` (E3, docs/visual.md §3.7 y §4.6; PR 9a): los 26, a 16, 20 o 24, en `currentColor`; con `label`
 * se leen y sin él no (D-07); y la flecha de `trend`, girada en pasos de 45°.
 */

describe('Icon', () => {
  it('sin label, no se lee', () => {
    const s = renderToStaticMarkup(<Icon name="home" />)
    expect(s).toMatch(
      /^<svg data-ui="Icon" data-variant="home" data-state="ready" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"/,
    )
    expect(s).toContain('aria-hidden="true"')
    expect(s).not.toContain('role=')
  })

  it('con label, una imagen con su nombre', () => {
    const s = renderToStaticMarkup(<Icon name="account" label="Account" size={24} />)
    expect(s).toContain('role="img" aria-label="Account"')
    expect(s).toContain('width="24" height="24"')
    expect(s).not.toContain('aria-hidden')
  })

  it('trend, girada en pasos de 45° sobre su centro', () => {
    expect(renderToStaticMarkup(<Icon name="trend" turn={-45} />)).toContain(
      '<g transform="rotate(-45 12 12)">',
    )
    expect(renderToStaticMarkup(<Icon name="trend" />)).not.toContain('<g transform')
  })

  it('los 26 pintan algo', () => {
    const nombres = Object.keys(ICONS) as IconName[]
    expect(nombres).toHaveLength(26)
    for (const name of nombres)
      expect(renderToStaticMarkup(<Icon name={name} size={16} />), name).toMatch(
        /<svg[^>]*><(path|circle|rect|line|polyline|polygon|ellipse) /,
      )
  })
})
