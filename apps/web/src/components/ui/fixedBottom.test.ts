import { describe, expect, it } from 'vitest'
import { fixedBottomVars } from './fixedBottom'

/**
 * Lo fijo de abajo (E3, docs/visual.md §4.9; PR 11): de los altos medidos de la `BottomNav` y de la
 * `ActionBar`, las dos variables del marco. `--action-bar-bottom`, el sitio de la `ActionBar`, encima de la
 * `BottomNav`; y `--fixed-bottom`, la suma, que el marco lleva de relleno para que nada quede debajo.
 */

describe('fixedBottomVars', () => {
  it('en el teléfono, la ActionBar sobre la BottomNav, y el relleno de las dos', () => {
    expect(fixedBottomVars({ nav: 56, bar: 60 })).toEqual({
      '--action-bar-bottom': '56px',
      '--fixed-bottom': '116px',
    })
  })

  it('desde 640, o con el teclado abierto, la BottomNav no está y mide 0', () => {
    expect(fixedBottomVars({ nav: 0, bar: 60 })).toEqual({
      '--action-bar-bottom': '0px',
      '--fixed-bottom': '60px',
    })
    expect(fixedBottomVars({ nav: 0, bar: 0 })).toEqual({
      '--action-bar-bottom': '0px',
      '--fixed-bottom': '0px',
    })
  })

  it('lo medido, hacia arriba: con la letra al doble o el área segura nada queda debajo', () => {
    expect(fixedBottomVars({ nav: 90.4, bar: 72.2 })).toEqual({
      '--action-bar-bottom': '91px',
      '--fixed-bottom': '163px',
    })
  })
})
