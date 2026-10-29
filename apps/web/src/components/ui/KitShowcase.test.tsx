import { KIT_COLORS } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KitSheet, KitShowcase } from './KitShowcase'

/**
 * `KitShowcase` (E3, docs/visual.md §4.4 y §8.10; PR 17c; 8-w): las tres vistas en `Tabs` `page` sobre un
 * `Kit` de 160 dentro de un `button` que abre la `Sheet` con el de 320 y las mismas pestañas; y `hidden`,
 * sin maillot guardado, el dibujo de antes, solo por delante y sin pestañas.
 */

const NOORD = { name: 'Noord Cycling', kit: 'hoops.navy.yellow' } as const

describe('KitShowcase', () => {
  const s = renderToStaticMarkup(
    <KitShowcase team={NOORD} bib="black">
      <p>1,207 season points</p>
    </KitShowcase>,
  )

  it('ready: las tres pestañas, Front la activa', () => {
    expect(s).toMatch(/^<div data-ui="KitShowcase" data-variant="default" data-state="ready"/)
    expect(s).toContain('role="tablist" aria-label="Kit views"')
    const pestanas = [...s.matchAll(/role="tab" aria-selected="(true|false)"[^>]*>([^<]+)</g)]
    expect(pestanas.map((m) => [m[2], m[1]])).toEqual([
      ['Front', 'true'],
      ['Back', 'false'],
      ['Shorts', 'false'],
    ])
  })

  it('el maillot de 160, por delante, en el panel de la pestaña, dentro de su botón', () => {
    const panel = /<div id="([^"]+)" role="tabpanel" aria-labelledby="([^"]+)">/.exec(s)
    expect(panel?.[2]).toBe(`${panel?.[1]}-tab-front`)
    expect(s).toMatch(
      /<button type="button" aria-label="Show the kit full screen"[^>]*><svg data-ui="Kit" data-variant="hoops"/,
    )
    expect(s).toMatch(/data-view="front" width="160" height="160"/)
    expect(s).toContain('aria-label="Noord Cycling kit"')
  })

  it('lo de su derecha lo pone quien lo pinta; la hoja, cerrada, no se pinta', () => {
    expect(s).toContain('<p>1,207 season points</p>')
    expect(s).not.toContain('<dialog')
  })

  it('hidden: sin maillot guardado, el dibujo de antes a 160, sin pestañas ni botón', () => {
    const h = renderToStaticMarkup(
      <KitShowcase team={{ name: 'Noord Cycling', legacySeed: 'seed' }} bib="black" />,
    )
    expect(h).toMatch(/^<div data-ui="KitShowcase" data-variant="default" data-state="hidden"/)
    expect(h).toContain('data-kit="team"')
    expect(h).toContain('width="160" height="160"')
    expect(h).not.toContain('role="tab"')
    expect(h).not.toContain('<button')
  })
})

describe('KitShowcase compact: las pestañas, en la hoja (8-x)', () => {
  const c = renderToStaticMarkup(
    <KitShowcase team={NOORD} bib="black" variant="compact">
      <p>Budget 6,236,433</p>
    </KitShowcase>,
  )

  it('el maillot de 160 solo por delante, en su botón, sin pestañas encima', () => {
    expect(c).toMatch(/^<div data-ui="KitShowcase" data-variant="compact" data-state="ready"/)
    expect(c).not.toContain('role="tab"')
    expect(c).not.toContain('role="tabpanel"')
    expect(c).toMatch(
      /<button type="button" aria-label="Show the kit full screen"[^>]*><svg[^>]*data-view="front" width="160"/,
    )
    expect(c).toContain('<p>Budget 6,236,433</p>')
  })
})

describe('KitSheet: el maillot a 320', () => {
  const hoja = (view: 'front' | 'back' | 'bib') =>
    renderToStaticMarkup(
      <KitSheet
        code={NOORD.kit}
        teamName={NOORD.name}
        bib="base.panel"
        sponsors={undefined}
        view={view}
        onView={() => undefined}
        open
        onClose={() => undefined}
      />,
    )

  it('la hoja con su título y las mismas pestañas, con la vista elegida', () => {
    const s = hoja('back')
    expect(s).toMatch(/^<dialog data-ui="Sheet"/)
    expect(s).toMatch(/<h2 [^>]*>Noord Cycling kit<\/h2>/)
    expect(s).toMatch(/role="tab" aria-selected="true"[^>]*>Back</)
    expect(s).toMatch(/data-view="back" width="320" height="320"/)
    // la espalda del equipo deja libre el sitio del dorsal
    expect(s).not.toContain('data-back="number"')
  })

  it('el culote, con su estilo', () => {
    const s = hoja('bib')
    expect(s).toMatch(/data-view="bib" width="320" height="320"/)
    expect(s).toContain(`fill="${KIT_COLORS.yellow}"`)
  })
})
