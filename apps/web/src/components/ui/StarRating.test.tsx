import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StarRating, starsLabel, starsOf } from './StarRating'

/**
 * `StarRating` (E3, docs/visual.md §4.6; PR 9b): cinco estrellas de media en media en un solo SVG con su
 * nombre, `3.5 of 5 stars`; nunca la cifra interna a la vista.
 */

const estrellas = (s: string) => [...s.matchAll(/data-star="([a-z]+)"/g)].map((m) => m[1])

describe('StarRating', () => {
  it('un role="img" con su nombre, en la fila por defecto (16 por estrella)', () => {
    const s = renderToStaticMarkup(<StarRating value={3.5} />)
    expect(s).toMatch(
      /^<svg data-ui="StarRating" data-variant="row" data-state="ready" role="img" aria-label="3.5 of 5 stars" width="80" height="16"/,
    )
  })

  it('3,5: tres llenas, una media y una vacía, en orden', () => {
    expect(estrellas(renderToStaticMarkup(<StarRating value={3.5} />))).toEqual([
      'full',
      'full',
      'full',
      'half',
      'empty',
    ])
  })

  it('de media en media: lo de en medio va a la media más cercana, y fuera de 0 a 5 se recorta', () => {
    expect([3.2, 3.3, 3.75, 7, -1, Number.NaN].map(starsOf)).toEqual([3, 3.5, 4, 5, 0, 0])
    expect(starsLabel(4)).toBe('4 of 5 stars')
    expect(estrellas(renderToStaticMarkup(<StarRating value={0} />))).toEqual(
      Array(5).fill('empty'),
    )
    expect(estrellas(renderToStaticMarkup(<StarRating value={5} />))).toEqual(Array(5).fill('full'))
  })

  it('en la ficha, a 20', () => {
    expect(renderToStaticMarkup(<StarRating value={2} size={20} />)).toMatch(
      /data-variant="page"[^>]*aria-label="2 of 5 stars" width="100" height="20"/,
    )
  })

  it('nunca la cifra a la vista: ningún texto dentro', () => {
    expect(renderToStaticMarkup(<StarRating value={3.5} />).replace(/<[^>]+>/g, '')).toBe('')
  })
})
