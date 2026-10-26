import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Panel } from './Panel'

/**
 * `Panel` (E3, docs/visual.md §4.4; PR 9a): una `section` nombrada por su `h2` (o por `ariaLabel`, sin
 * título), sus dos variantes y `data-answer`, el que mira la prueba del teléfono (la comprobación 7).
 */

describe('Panel', () => {
  it('con título: la section la nombra su h2', () => {
    const s = renderToStaticMarkup(
      <Panel title="Your month">
        <p>body</p>
      </Panel>,
    )
    expect(s).toMatch(
      /^<section data-ui="Panel" data-variant="default" data-state="ready" aria-labelledby="([^"]+)"/,
    )
    const id = /aria-labelledby="([^"]+)"/.exec(s)?.[1] ?? ''
    expect(s).toContain(`<h2 id="${id}"`)
    expect(s).toContain('>Your month</h2>')
  })

  it('sin título, con su nombre en aria-label y sin h2', () => {
    const s = renderToStaticMarkup(
      <Panel ariaLabel="Your rider">
        <p>body</p>
      </Panel>,
    )
    expect(s).toContain('aria-label="Your rider"')
    expect(s).not.toContain('<h2')
  })

  it('sin título ni nombre no es un panel', () => {
    expect(() => renderToStaticMarkup(<Panel>body</Panel>)).toThrow()
  })

  it('bleed, para las tablas', () => {
    expect(
      renderToStaticMarkup(
        <Panel title="Standings" variant="bleed">
          <table />
        </Panel>,
      ),
    ).toContain('data-variant="bleed"')
  })

  it('answer: lo que contesta la pantalla', () => {
    expect(
      renderToStaticMarkup(
        <Panel title="How you'll arrive" answer>
          x
        </Panel>,
      ),
    ).toContain('data-answer=""')
    expect(renderToStaticMarkup(<Panel title="Plain">x</Panel>)).not.toContain('data-answer')
  })

  it('su acción, en la línea del título', () => {
    const s = renderToStaticMarkup(
      <Panel title="Your month" action={<a href="/me/races">All races</a>}>
        x
      </Panel>,
    )
    expect(s).toMatch(/<\/h2><a href="\/me\/races">All races<\/a>/)
  })
})
