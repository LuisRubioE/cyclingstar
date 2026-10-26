import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Skeleton, SkeletonBar } from './Skeleton'

/**
 * `Skeleton` (E3, docs/visual.md §4.2; PR 10): sus cuatro formas, que no se leen; invisible antes de los
 * 300 ms, pero ya en su sitio; y `SkeletonBar`, la barra suelta dentro de un componente.
 */

const filas = (s: string) => (s.match(/data-row=""/g) ?? []).length

describe('Skeleton', () => {
  it('rows: cinco por defecto, y las que se pidan', () => {
    expect(filas(renderToStaticMarkup(<Skeleton shape={{ kind: 'rows' }} />))).toBe(5)
    expect(
      filas(renderToStaticMarkup(<Skeleton shape={{ kind: 'rows', rows: 3, rowHeight: 64 }} />)),
    ).toBe(3)
  })

  it('las cuatro formas, en data-variant, y ninguna se lee', () => {
    for (const kind of ['rows', 'panel', 'stat', 'header'] as const) {
      const s = renderToStaticMarkup(<Skeleton shape={{ kind }} />)
      expect(s).toMatch(
        new RegExp(
          `^<div data-ui="Skeleton" data-variant="${kind}" data-state="loading" aria-hidden="true"`,
        ),
      )
      expect(s.replace(/<[^>]+>/g, '')).toBe('')
    }
  })

  it('antes de los 300 ms: hidden, y ocupa su sitio', () => {
    const s = renderToStaticMarkup(<Skeleton shape={{ kind: 'panel' }} visible={false} />)
    expect(s).toContain('data-state="hidden"')
    expect(s.match(/data-bar=""/g)).toHaveLength(4)
  })

  it('SkeletonBar: la línea de 20 y la cifra de 40, que tampoco se leen', () => {
    for (const size of ['line', 'figure'] as const) {
      const s = renderToStaticMarkup(<SkeletonBar size={size} />)
      expect(s).toMatch(
        new RegExp(
          `^<span data-ui="Skeleton" data-variant="${size}" data-state="loading" aria-hidden="true"`,
        ),
      )
      expect(s.replace(/<[^>]+>/g, '')).toBe('')
    }
  })
})
