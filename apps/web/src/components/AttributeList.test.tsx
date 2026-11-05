import { ATTRIBUTES, type Attribute, type CeilingOpinion } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AttributeList } from './AttributeList'

/**
 * LA LISTA DE ATRIBUTOS LEE LA FORMA DE PANTALLA (E3, docs/visual.md §13.5 y 13-a; PR 19b): las estrellas y
 * la marca le llegan hechas de la API, y la flecha, en su código. La web ya no tiene el valor del que salen.
 *
 * Con el sistema desde el 21h (§4.6): diez filas de 44 en una lista, cada una con sus estrellas a 20, la marca
 * de cuatro pasos (los segmentos del `Meter`) y la flecha en la propia, y el porqué en su `InfoButton`, no en un
 * botón con un `dt` dentro (axe: `dlitem` y `definition-list`) ni con sus glifos `ⓘ` y `▲`; y la frase del
 * entrenador a la vista junto al atributo de techo más alto.
 */

const propios = Object.fromEntries(
  ATTRIBUTES.map((a) => [a, a === 'MON' ? { stars: 3, mark: 1 } : { stars: 2, mark: 0 }]),
) as Record<Attribute, { stars: number; mark: number }>
const ajenos = Object.fromEntries(ATTRIBUTES.map((a) => [a, { stars: 2.5 }])) as Record<
  Attribute,
  { stars: number }
>
const cuenta = (s: string, texto: string) => s.split(texto).length - 1
/** Lo que se ve sin abrir nada: fuera las cajas de los `InfoButton`, que van con `hidden`. */
const aLaVista = (s: string) => s.replace(/<span id="[^"]*" hidden=""[\s\S]*?<\/span><\/span>/g, '')

const opiniones = (top: CeilingOpinion, resto: CeilingOpinion) =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, a === 'MON' ? top : resto])) as Record<
    Attribute,
    CeilingOpinion
  >

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
    expect(cuenta(html, '>2 of 4 through this band<')).toBe(1)
    expect(cuenta(html, '>1 of 4 through this band<')).toBe(9)
    // la flecha: el icono girado hacia arriba, en diagonal o hacia abajo, y su texto para quien no lo ve
    expect(html).toMatch(/data-variant="trend"[^>]*aria-label="Improving fast"/)
    expect(html).toMatch(/data-variant="trend"[^>]*aria-label="Improving"/)
    expect(html).toMatch(/data-variant="trend"[^>]*aria-label="Slipping"/)
    expect(cuenta(html, 'rotate(-90 12 12)')).toBe(1)
    expect(cuenta(html, 'rotate(-45 12 12)')).toBe(1)
    expect(cuenta(html, 'rotate(45 12 12)')).toBe(1)
    // lo que no llega no se movió: `Steady`, sin girar
    expect(cuenta(html, 'aria-label="Steady"')).toBe(7)
    // ningún glifo de flecha
    for (const g of ['↑', '↗', '→', '↘', '↓']) expect(html, g).not.toContain(g)
  })

  it('el ajeno: solo sus estrellas, sin marca ni flecha', () => {
    const html = renderToStaticMarkup(<AttributeList attributes={ajenos} />)
    expect(cuenta(html, 'aria-label="2.5 of 5 stars"')).toBe(10)
    expect(html).not.toContain('through this band')
    expect(html).not.toContain('data-variant="trend"')
    expect(html).not.toContain('Coach:')
  })
})

describe('la lista de atributos con el sistema (§4.6; PR 21h)', () => {
  it('diez filas de 44 en una lista, con sus estrellas a 20 y la marca en los segmentos del Meter', () => {
    const html = renderToStaticMarkup(<AttributeList attributes={propios} detail={{}} />)
    expect(html).toMatch(/^<ul/)
    // cada fila, de 44: la `li` misma, no los `InfoButton` que lleva dentro (la revisión del 21h)
    expect(cuenta(html, '<li class="')).toBe(10)
    expect(cuenta(html, '<li class="flex min-h-11 ')).toBe(10)
    expect(cuenta(html, 'data-ui="StarRating" data-variant="page"')).toBe(10)
    // la marca: cuatro segmentos por atributo, los llenos del MON, dos
    expect(cuenta(html, 'data-segment=')).toBe(40)
    expect(cuenta(html, 'data-segment="on"')).toBe(11)
  })

  it('el porqué de cada atributo, en su InfoButton: qué es y con qué se entrena; sin dt dentro de un botón ni glifos', () => {
    const html = renderToStaticMarkup(<AttributeList attributes={ajenos} />)
    expect(cuenta(html, 'data-ui="InfoButton"')).toBe(10)
    expect(html).toContain('aria-label="About Endurance"')
    expect(html).toContain('Improve with:')
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<dt/)
    expect(html).not.toContain('<dl')
    for (const g of ['ⓘ', '▲']) expect(html, g).not.toContain(g)
  })

  it('la flecha, en su tono y sin title; su porqué, en la caja: los 28 días', () => {
    const html = renderToStaticMarkup(
      <AttributeList attributes={propios} detail={{ trend: { MON: 'sube_mucho', RES: 'baja' } }} />,
    )
    expect(html).not.toContain('title=')
    expect(html).toMatch(
      /class="text-good"[^>]*>(?:<[^>]+>)*<svg[^>]*data-variant="trend"[^>]*aria-label="Improving fast"/,
    )
    expect(html).toMatch(
      /class="text-bad"[^>]*>(?:<[^>]+>)*<svg[^>]*data-variant="trend"[^>]*aria-label="Slipping"/,
    )
    expect(html).toContain('Last 28 days: Improving fast')
    expect(html).not.toMatch(
      /\b(?:bg|text|border|ring|fill|stroke|from|to|divide)-(?:slate|indigo|emerald|amber|rose|cyan|red|orange)-\d/,
    )
  })

  it('mientras no llega la tendencia, ni flecha ni sus 28 días: no dice Steady de lo que aún no sabe', () => {
    const html = renderToStaticMarkup(
      <AttributeList attributes={propios} detail={{ opinion: opiniones('lo_tuyo', 'normal') }} />,
    )
    expect(html).not.toContain('data-variant="trend"')
    expect(html).not.toContain('Last 28 days')
    // la marca y la opinión, que no la esperan, sí
    expect(cuenta(html, 'through this band<')).toBe(10)
    expect(html).toContain('This is your thing')
  })

  it('la frase del entrenador, a la vista junto al atributo de techo más alto: lo_tuyo', () => {
    const html = renderToStaticMarkup(
      <AttributeList attributes={propios} detail={{ opinion: opiniones('lo_tuyo', 'normal') }} />,
    )
    const vista = aLaVista(html)
    expect(cuenta(vista, 'This is your thing: your biggest potential is here.')).toBe(1)
    // en la fila del MON, la de Mountain
    expect(vista).toMatch(/Mountain<[\s\S]*?This is your thing[\s\S]*?<\/li>/)
    expect(vista).not.toMatch(/Mountain<[\s\S]*?<\/li>[\s\S]*?This is your thing/)
    // las demás opiniones, solo en sus cajas
    expect(vista).not.toContain('More or less in line with the rest of you.')
    expect(html).toContain('More or less in line with the rest of you.')
  })

  it('en la primera lectura, la de asoma, que también es la del techo más alto; con apunta, varias, ninguna', () => {
    const primera = aLaVista(
      renderToStaticMarkup(
        <AttributeList attributes={propios} detail={{ opinion: opiniones('asoma', 'pronto') }} />,
      ),
    )
    expect(cuenta(primera, 'There seems to be something here.')).toBe(1)
    const formandose = aLaVista(
      renderToStaticMarkup(
        <AttributeList attributes={propios} detail={{ opinion: opiniones('apunta', 'quiza') }} />,
      ),
    )
    // sin el apóstrofo, que el HTML escapa (`&#x27;`)
    expect(formandose).not.toContain('real room for you to grow here.')
    expect(formandose).toContain('data-ui="InfoButton"')
  })
})
