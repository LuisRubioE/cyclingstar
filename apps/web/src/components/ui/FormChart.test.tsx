import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FormChart, formChartLabel, formChartTicks } from './FormChart'

/**
 * LA GRÁFICA DEL FONDO Y LA FRESCURA (E3, docs/visual.md §4.8; PR 21h; Rcobertura-013, 14-h), un caso por
 * estado, mirando su `data-state` y su ARIA: noventa días de 0 a 100, el fondo continuo de 2 px en `accent`
 * y la frescura discontinua (4 y 3) en `gold-ink`, para que no se distingan solo por el color (D-13); los
 * rótulos de los dos ejes en HTML, junto al dibujo, y ningún `<text>` dentro del SVG; y la última lectura
 * en palabras en su nombre.
 */

const dias = (n: number, desde = 1) =>
  Array.from({ length: n }, (_, i) => ({
    gameDay: desde + i,
    fitness: i === n - 1 ? 65 : 40,
    freshness: i === n - 1 ? 30 : 70,
  }))

const pinta = (node: Parameters<typeof FormChart>[0]) => renderToStaticMarkup(<FormChart {...node} />)
const svg = (markup: string) => /<svg[\s\S]*?<\/svg>/.exec(markup)?.[0] ?? ''

describe('FormChart (§4.8; PR 21h)', () => {
  it('ready: una imagen con su nombre y la última lectura en palabras', () => {
    const markup = pinta({ points: dias(90) })
    expect(markup).toMatch(/^<figure data-ui="FormChart" data-variant="default" data-state="ready"/)
    expect(markup).toContain('role="img"')
    expect(markup).toContain(
      'aria-label="Fitness and freshness, last 90 days. Fitness: good, Freshness: low"',
    )
  })

  it('el fondo, continuo de 2 px en accent; la frescura, discontinua (4 y 3) en gold-ink; sin estirar el trazo', () => {
    const dibujo = svg(pinta({ points: dias(90) }))
    const lineas = dibujo.match(/<polyline[^>]*>/g) ?? []
    expect(lineas).toHaveLength(2)
    const [fondo = '', frescura = ''] = lineas
    expect(fondo).toContain('class="text-accent"')
    expect(fondo).toContain('stroke-width="2"')
    expect(fondo).not.toContain('stroke-dasharray')
    expect(frescura).toContain('class="text-gold-ink"')
    expect(frescura).toContain('stroke-dasharray="4 3"')
    for (const l of lineas) expect(l).toContain('vector-effect="non-scaling-stroke"')
    expect(dibujo).toContain('preserveAspectRatio="none"')
  })

  it('ningún <text> en el SVG: los rótulos de los dos ejes, en HTML (14-h)', () => {
    const markup = pinta({ points: dias(90) })
    expect(svg(markup)).not.toContain('<text')
    const fuera = markup.replace(svg(markup), '')
    for (const v of ['100', '50', '0']) expect(fuera).toMatch(new RegExp(`>${v}</span>`))
  })

  it('el eje de los días: tres marcas con su día de la temporada, y nunca GD', () => {
    const markup = pinta({ points: dias(90) })
    const marcas = [...markup.matchAll(/>(Day \d+)</g)].map((m) => m[1])
    expect(marcas).toEqual(['Day 16', 'Day 46', 'Day 75'])
    expect(markup).not.toContain('GD')
    // en una segunda temporada, el día de esa temporada, no el absoluto
    const segunda = pinta({ points: dias(90, 365) })
    expect([...segunda.matchAll(/>(Day \d+)</g)].map((m) => m[1])).toEqual([
      'Day 16',
      'Day 46',
      'Day 75',
    ])
  })

  it('la leyenda, debajo, con el trazo de muestra de cada una', () => {
    const markup = pinta({ points: dias(90) })
    // lo que va detrás del dibujo: la leyenda, con su muestra delante de cada nombre
    const leyenda = markup.slice(markup.indexOf('</svg>') + '</svg>'.length)
    const muestras = [...leyenda.matchAll(/<line([^>]*)>[\s\S]*?(Fitness|Freshness)</g)]
    expect(muestras.map((m) => m[2])).toEqual(['Fitness', 'Freshness'])
    const [fondo = '', frescura = ''] = muestras.map((m) => m[1] ?? '')
    expect(fondo).toContain('class="text-accent"')
    expect(fondo).not.toContain('stroke-dasharray')
    expect(frescura).toContain('class="text-gold-ink"')
    expect(frescura).toContain('stroke-dasharray="4 3"')
  })

  it('empty: con menos de dos días, No data yet, sin dibujo', () => {
    for (const points of [[], dias(1)]) {
      const markup = pinta({ points })
      expect(markup).toContain('data-state="empty"')
      expect(markup).toContain('No data yet')
      expect(markup).not.toContain('<polyline')
    }
  })

  it('loading: su Skeleton panel, con su estado para el lector', () => {
    const markup = pinta({ points: [], loading: true })
    expect(markup).toContain('data-state="loading"')
    expect(markup).toContain('role="status"')
    expect(markup).toContain('data-ui="Skeleton"')
  })

  it('con menos de noventa días, su nombre dice los que hay', () => {
    expect(formChartLabel(dias(30))).toBe(
      'Fitness and freshness, last 30 days. Fitness: good, Freshness: low',
    )
  })

  it('las marcas, a 1/6, 1/2 y 5/6 del tramo', () => {
    expect(formChartTicks(1, 90)).toEqual([16, 46, 75])
    expect(formChartTicks(10, 16)).toEqual([11, 13, 15])
  })

  it('el layout, en su raíz', () => {
    expect(pinta({ points: dias(90), layout: 'mt-3' })).toMatch(/^<figure[^>]*class="[^"]*mt-3/)
  })
})
