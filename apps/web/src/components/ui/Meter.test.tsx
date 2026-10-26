import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Meter, meterText } from './Meter'

/**
 * `Meter` (E3, docs/visual.md §4.8; PR 9b): cuatro segmentos y la palabra, nunca la cifra; con cinco, los
 * cerillos (`3 of 5`); sin dato, `No data yet`. Un `role="meter"` con su valor en palabras.
 */

const segmentos = (s: string) => [...s.matchAll(/data-segment="(on|off)"/g)].map((m) => m[1])
const texto = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

describe('Meter', () => {
  it('cuatro pasos: el meter con su palabra, y la palabra a la vista', () => {
    const s = renderToStaticMarkup(<Meter label="Freshness" value={1} valueText="low" />)
    expect(s).toMatch(
      /^<div data-ui="Meter" data-variant="level" data-state="ready" role="meter" aria-label="Freshness" aria-valuemin="0" aria-valuemax="4" aria-valuenow="1" aria-valuetext="low"/,
    )
    expect(segmentos(s)).toEqual(['on', 'off', 'off', 'off'])
    expect(texto(s)).toBe('Freshness: low')
  })

  it('los cerillos: cinco pasos y `3 of 5`', () => {
    const s = renderToStaticMarkup(<Meter label="Matches" value={3} steps={5} />)
    expect(s).toContain('data-variant="count"')
    expect(s).toContain('aria-valuemax="5" aria-valuenow="3" aria-valuetext="3 of 5"')
    expect(segmentos(s)).toEqual(['on', 'on', 'on', 'off', 'off'])
    expect(texto(s)).toBe('Matches: 3 of 5')
  })

  it('vacío: sin dato, los segmentos apagados y `No data yet`', () => {
    const s = renderToStaticMarkup(<Meter label="Freshness" value={null} />)
    expect(s).toContain('data-state="empty"')
    expect(s).toContain('aria-valuenow="0" aria-valuetext="No data yet"')
    expect(segmentos(s)).toEqual(['off', 'off', 'off', 'off'])
    expect(texto(s)).toBe('Freshness: No data yet')
  })

  it('nunca la cifra: con cuatro pasos, sin palabra, no se pinta', () => {
    expect(() => meterText(2, 4)).toThrow(/la palabra es obligatoria/)
  })

  it('lo de fuera de 0 a los pasos se recorta', () => {
    expect(
      segmentos(renderToStaticMarkup(<Meter label="Load" value={9} valueText="hard" />)),
    ).toEqual(['on', 'on', 'on', 'on'])
  })
})
