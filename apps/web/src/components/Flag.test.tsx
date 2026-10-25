import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Flag } from './Flag'
import { FLAG_CELLS, FLAG_SPRITE } from './ui/flagSprite.generated'

/**
 * `Flag` (E3, docs/visual.md §4.6 y §12.2; PR 6, D-49): la bandera del sprite, con el nombre del país,
 * y el hueco de su ancho cuando no hay país. Render estático: el HTML, sus atributos y su estilo.
 */
describe('Flag', () => {
  it('es una imagen con el nombre del país', () => {
    const html = renderToStaticMarkup(<Flag code="es" />)
    expect(html).toMatch(/^<span[^>]* role="img"/)
    expect(html).toContain('aria-label="Spain"')
    expect(html).toContain('title="Spain"')
  })

  it('pinta del sprite, en la celda de su país, a la altura que se pide', () => {
    const html = renderToStaticMarkup(<Flag code="ES" size={16} />)
    expect(html).toContain('class="flag"')
    expect(html).toMatch(/background-image:url\([^)]*flags[^)]*\.webp\)/)
    expect(html).toContain('font-size:16px')
    const [col, row] = FLAG_CELLS.ES!
    const { cols, rows, width, height, margin } = FLAG_SPRITE
    // en em, con cuatro decimales: la caja mide 4/3 em de ancho y 1 de alto, y enseña su celda sin el
    // anillo que repite el borde de la bandera, que ha de medir al menos 1,5 píxeles (lo medido)
    const em = (n: number) => `${Number(n.toFixed(4))}em`
    const porX = 4 / 3 / (width - 2 * margin)
    const porY = 1 / (height - 2 * margin)
    expect(margin).toBeGreaterThanOrEqual(1.5)
    expect(html).toContain(
      `background-position:${em(-(col * width + margin) * porX)} ${em(-(row * height + margin) * porY)}`,
    )
    expect(html).toContain(`background-size:${em(cols * width * porX)} ${em(rows * height * porY)}`)
  })

  it('no carga flag-icons: ninguna clase fi', () => {
    expect(renderToStaticMarkup(<Flag code="fr" />)).not.toMatch(/\bfi\b/)
  })

  it('sin país, o con uno que el juego no tiene, un hueco de su ancho que no se lee', () => {
    for (const code of [null, undefined, '', '  ', 'ZZ']) {
      const html = renderToStaticMarkup(<Flag code={code} size={12} />)
      expect(html).toMatch(/^<span[^>]* aria-hidden="true"/)
      expect(html).not.toContain('role="img"')
      expect(html).not.toContain('🏳')
      expect(html).toContain('font-size:12px')
      expect(html).toContain('class="flag"')
    }
  })

  it('su caja tiene renglón: el ::before de .flag es un espacio que no se colapsa, como el de .fi', () => {
    // con un espacio normal la caja mide 0 de alto y la bandera no se ve, y el HTML no lo dice
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'),
      'utf8',
    )
    expect(css).toMatch(/\.flag::before\s*\{\s*content:\s*'\\00a0';\s*\}/)
  })

  it('las clases de quien la usa se suman', () => {
    expect(renderToStaticMarkup(<Flag code="it" className="mr-1" />)).toContain('class="flag mr-1"')
  })
})
