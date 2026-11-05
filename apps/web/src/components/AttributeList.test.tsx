import { ATTRIBUTES, type Attribute } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AttributeList } from './AttributeList'

/**
 * LA LISTA DE ATRIBUTOS LEE LA FORMA DE PANTALLA (E3, docs/visual.md §13.5 y 13-a; PR 19b): las estrellas y
 * la marca le llegan hechas de la API, y la flecha, en su código. La web ya no tiene el valor del que salen.
 */

const propios = Object.fromEntries(
  ATTRIBUTES.map((a) => [a, a === 'MON' ? { stars: 3, mark: 1 } : { stars: 2, mark: 0 }]),
) as Record<Attribute, { stars: number; mark: number }>
const ajenos = Object.fromEntries(ATTRIBUTES.map((a) => [a, { stars: 2.5 }])) as Record<
  Attribute,
  { stars: number }
>
const cuenta = (s: string, texto: string) => s.split(texto).length - 1

describe('la lista de atributos (§13.5; 19b)', () => {
  it('el propio: sus estrellas, su marca y la flecha en el icono `trend` girado, con su texto (13-a)', () => {
    const html = renderToStaticMarkup(
      <AttributeList
        attributes={propios}
        detail={{ trend: { MON: 'sube_mucho', RES: 'baja', COL: 'sube' } }}
      />,
    )
    expect(cuenta(html, 'aria-label="3 of 5 stars"')).toBe(1)
    expect(cuenta(html, 'aria-label="2 of 5 stars"')).toBe(9)
    // la marca es la que manda la API: el MON en el segundo cuarto, el resto en el primero
    expect(cuenta(html, 'aria-label="2 of 4 through this band"')).toBe(1)
    expect(cuenta(html, 'aria-label="1 of 4 through this band"')).toBe(9)
    // la flecha: el icono girado hacia arriba, en diagonal o hacia abajo, y su texto para quien no lo ve
    expect(html).toMatch(/data-variant="trend"[^>]*aria-label="Improving fast"/)
    expect(html).toMatch(/data-variant="trend"[^>]*aria-label="Improving"/)
    expect(html).toMatch(/data-variant="trend"[^>]*aria-label="Slipping"/)
    expect(cuenta(html, 'rotate(-90 12 12)')).toBe(1)
    expect(cuenta(html, 'rotate(-45 12 12)')).toBe(1)
    expect(cuenta(html, 'rotate(45 12 12)')).toBe(1)
    // lo que no llega no se movió: `Steady`, sin girar
    expect(cuenta(html, 'aria-label="Steady"')).toBe(7)
    expect(html).toContain('title="Improving fast (last 28 days)"')
    // ningún glifo de flecha
    for (const g of ['↑', '↗', '→', '↘', '↓']) expect(html, g).not.toContain(g)
  })

  it('el ajeno: solo sus estrellas, sin marca ni flecha', () => {
    const html = renderToStaticMarkup(<AttributeList attributes={ajenos} />)
    expect(cuenta(html, 'aria-label="2.5 of 5 stars"')).toBe(10)
    expect(html).not.toContain('through this band')
    expect(html).not.toContain('data-variant="trend"')
  })
})
