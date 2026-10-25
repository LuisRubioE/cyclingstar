import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TextLink } from './TextLink'

/**
 * `TextLink` (E3, docs/visual.md §4.3; PR 9a): un enlace con su variante; en una frase, `data-inline-link`,
 * el que lee la prueba del teléfono para pedirle 24 px y no 44 (la comprobación 5).
 */

const html = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('TextLink', () => {
  it('un enlace, en default por defecto', () => {
    const s = html(<TextLink to="/world/races/race-sardegna">Race Sardegna</TextLink>)
    expect(s).toMatch(/^<a [^>]*href="\/world\/races\/race-sardegna" data-ui="TextLink" data-variant="default" data-state="ready"/)
    expect(s).toMatch(/>Race Sardegna<\/a>$/)
  })

  it('rider: el nombre de un corredor', () => {
    expect(html(<TextLink to="/world/riders/x" variant="rider">José Quintáns</TextLink>)).toContain('data-variant="rider"')
  })

  it('en una frase, data-inline-link; fuera de ella, no', () => {
    expect(html(<TextLink to="/x" inline>the plan</TextLink>)).toContain('data-inline-link=""')
    expect(html(<TextLink to="/x">the plan</TextLink>)).not.toContain('data-inline-link')
  })
})
