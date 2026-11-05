import { COUNTRIES } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Flag, flagWidth } from './Flag'
import { FLAG_CELLS, FLAG_SPRITE } from './flagSprite.generated'

/**
 * `Flag` (E3, docs/visual.md §4.6; PR 9b): la bandera del sprite a 21 × 16 en una fila, o a 12 o 24 de
 * alto, con el nombre del país para el lector; sin país, el hueco de su ancho, que no se lee.
 */

describe('Flag', () => {
  it('lista: un role="img" con el nombre del país, a 21 × 16 por defecto', () => {
    const s = renderToStaticMarkup(<Flag country="ES" />)
    expect(s).toMatch(
      /^<span data-ui="Flag" data-variant="sprite" data-state="ready" role="img" aria-label="Spain"/,
    )
    expect(s).toContain('width:21px;height:16px')
  })

  it('las tres alturas, en 4:3: 16 × 12, 21 × 16 y 32 × 24', () => {
    expect([12, 16, 24].map((h) => flagWidth(h as 12 | 16 | 24))).toEqual([16, 21, 32])
    expect(renderToStaticMarkup(<Flag country="FR" height={24} />)).toContain(
      'width:32px;height:24px',
    )
  })

  it('el filete line de 1 px, por dentro', () => {
    expect(renderToStaticMarkup(<Flag country="IT" />)).toContain(
      'box-shadow:inset 0 0 0 1px var(--color-line)',
    )
  })

  it('el código, en minúscula o con espacios, vale igual', () => {
    expect(renderToStaticMarkup(<Flag country=" es " />)).toContain('aria-label="Spain"')
  })

  it('vacía: sin país, o con uno que no está, el hueco de su ancho, que no se lee', () => {
    for (const country of [null, undefined, '', 'XX']) {
      const s = renderToStaticMarkup(<Flag country={country} />)
      expect(s).toMatch(
        /^<span data-ui="Flag" data-variant="sprite" data-state="empty" aria-hidden="true"/,
      )
      expect(s).not.toContain('role="img"')
      expect(s).toContain('width:21px;height:16px')
    }
  })

  it('las 133 del juego tienen su celda en el sprite', () => {
    expect(COUNTRIES).toHaveLength(133)
    for (const c of COUNTRIES) expect(FLAG_CELLS[c.code], c.code).toBeDefined()
  })

  it('pinta su celda del sprite, sin el anillo que repite el borde, a 12 y a 16 de alto (del test de la de antes)', () => {
    // el anillo mide 1,5 px como poco (lo medido): lo que el filtrado coja de fuera es el borde de la propia
    // bandera y nunca la vecina; la de antes lo probaba en em, y con el 21n solo queda esta (revisión del 21n)
    const { cols, rows, width, height: alto, margin } = FLAG_SPRITE
    expect(margin).toBeGreaterThanOrEqual(1.5)
    const px = (n: number) => `${Number(n.toFixed(3))}px`
    for (const code of ['ES', 'FR'] as const)
      for (const h of [12, 16] as const) {
        const [col, row] = FLAG_CELLS[code]!
        const sx = flagWidth(h) / (width - 2 * margin)
        const sy = h / (alto - 2 * margin)
        const html = renderToStaticMarkup(<Flag country={code} height={h} />)
        expect(html, `${code} ${h}`).toContain(
          `background-position:${px(-(col * width + margin) * sx)} ${px(-(row * alto + margin) * sy)}`,
        )
        expect(html, `${code} ${h}`).toContain(
          `background-size:${px(cols * width * sx)} ${px(rows * alto * sy)}`,
        )
      }
  })
})
