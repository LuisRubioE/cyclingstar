import { describe, expect, it } from 'vitest'
import { PALETA, pieza, pintaEn, respuestas } from './__fixtures__/markup'
import { HowToPlay } from './HowToPlay'

/**
 * CÓMO SE JUEGA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en
 * `PageHeader`, las tres ideas en su `Panel`, el primero la respuesta de la 33 (§7.3), sin sus emoji (3-d), y
 * las dos salidas en `Button`.
 */

const html = pintaEn('/how-to-play', <HowToPlay />)

describe('cómo se juega (§17.21; PR 21j)', () => {
  it('la cabecera, un PageHeader con lo que es el juego', () => {
    expect(html).toMatch(/<h1[^>]*>How to play<\/h1>/)
    expect(html).toContain('You are one professional cyclist, from age 18 to retirement.')
  })

  it('las tres ideas, cada una en su Panel con su título, y el primero, la respuesta', () => {
    const titulos = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    expect(titulos).toEqual([
      'Stars — how good you are',
      'Matches — your efforts in a race',
      'Form — training vs. freshness',
    ])
    expect(respuestas(html)).toBe(1)
    expect(pieza(html, 'Panel', 'Stars — how good you are')).toContain('data-answer=""')
  })

  it('las estrellas, las del catálogo; y ni los cerillos ni la gráfica en emoji (3-d)', () => {
    expect(pieza(html, 'Panel', 'Stars — how good you are')).toContain('data-ui="StarRating"')
    for (const g of ['🔥', '📈']) expect(html, g).not.toContain(g)
  })

  it('crear el corredor, el Button primary; las órdenes de entrenamiento, el secundario', () => {
    expect(pieza(html, 'Button', 'Create your rider')).toMatch(
      /^<a [^>]*data-variant="primary"[^>]*href="\/create"/,
    )
    expect(pieza(html, 'Button', 'Set training orders')).toMatch(
      /^<a [^>]*data-variant="secondary"[^>]*href="\/me\/training"/,
    )
  })

  it('ninguna clase de la paleta ni la caja de antes', () => {
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('rounded-2xl')
  })
})
