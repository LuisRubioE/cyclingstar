import { COUNTRIES } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Flag, flagWidth } from './Flag'
import { FLAG_CELLS } from './flagSprite.generated'

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
})
