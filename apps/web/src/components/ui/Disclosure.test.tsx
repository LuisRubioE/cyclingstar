import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Disclosure } from './Disclosure'

/**
 * `Disclosure` (E3, docs/visual.md §4.3; PR 9a, I-33): `closed` y `open`; el botón dice qué hace, y la
 * región, nombrada por él, está siempre en el árbol.
 */

const html = (defaultOpen: boolean) =>
  renderToStaticMarkup(
    <Disclosure showLabel="Show the 28 days" hideLabel="Hide the 28 days" defaultOpen={defaultOpen}>
      <p>the days</p>
    </Disclosure>,
  )

describe('Disclosure', () => {
  it('closed: Show, aria-expanded false y la región oculta, nombrada por el botón', () => {
    const s = html(false)
    expect(s).toMatch(/^<div data-ui="Disclosure" data-variant="default" data-state="closed"/)
    const boton =
      /<button type="button" id="([^"]+)" aria-expanded="false" aria-controls="([^"]+)"/.exec(s)
    expect(boton).not.toBeNull()
    const [, buttonId, regionId] = boton ?? []
    expect(s).toContain(
      `<div id="${regionId}" role="region" aria-labelledby="${buttonId}" hidden="">`,
    )
    expect(s).toContain('Show the 28 days')
  })

  it('sin región (region={false}), para muchos a la vez: el botón gobierna lo plegado y no hay punto de referencia (PR 21b)', () => {
    const s = renderToStaticMarkup(
      <Disclosure showLabel="3 stages" hideLabel="Hide the stages" region={false}>
        <p>the stages</p>
      </Disclosure>,
    )
    const regionId = /aria-controls="([^"]+)"/.exec(s)?.[1] ?? ''
    expect(s).toContain(`<div id="${regionId}" hidden="">`)
    expect(s).not.toContain('role="region"')
  })

  it('open: Hide, aria-expanded true y la región a la vista', () => {
    const s = html(true)
    expect(s).toContain('data-state="open"')
    expect(s).toContain('aria-expanded="true"')
    expect(s).toContain('Hide the 28 days')
    expect(s).not.toContain('hidden=""')
    expect(s).toContain('<p>the days</p>')
  })
})
