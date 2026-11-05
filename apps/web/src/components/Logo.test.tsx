import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

/**
 * EL LOGOTIPO (E3, docs/visual.md §18.3 y §14.7; D20; PR 21n): el dibujo de siempre, sin un hexadecimal
 * (ui/8). Sus dos colores son dos tokens, `logo` (el trazo) y `logo-star` (la estrella): los de siempre en el
 * claro y, en el ámbito oscuro, los de la imagen de compartir, que lo pinta sobre el mismo navy que la
 * cabecera. Las cuatro clases son el contrato con `scripts/og-image.mjs`, que las colorea para la imagen: por
 * eso, y solo por eso, se miran aquí.
 */
describe('Logo', () => {
  it('sin un hexadecimal, con sus dos tokens: el trazo, los bujes y la estrella', () => {
    const s = renderToStaticMarkup(<Logo />)
    expect(s).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(s.match(/class="stroke-logo"/g)?.length).toBe(5)
    expect(s.match(/class="fill-logo"/g)?.length).toBe(2)
    expect(s.match(/class="fill-logo-star stroke-logo-star"/g)?.length).toBe(1)
  })

  it('se lee como Cycling Star; decorativo, dentro de un enlace que ya lo dice, no se lee', () => {
    expect(renderToStaticMarkup(<Logo />)).toContain('role="img" aria-label="Cycling Star"')
    const d = renderToStaticMarkup(<Logo decorative />)
    expect(d).toContain('aria-hidden="true"')
    expect(d).not.toContain('aria-label')
  })
})
