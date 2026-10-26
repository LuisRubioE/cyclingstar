import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TripRow, type TripRowProps } from './TripRow'

/**
 * `TripRow` (E3, docs/visual.md §4.5 y §11.6; PR 9b): el viaje en un bloque, con su cabecera por nombre y
 * un tramo por fila, cada uno con su origen; en curso, `Now`.
 */

const VIAJE: TripRowProps = {
  race: 'Race Sardegna (IT)',
  meta: 'Days 55 to 61 · 7 days off training',
  legs: [
    { key: 'out', days: 'Day 55', what: 'Out' },
    { key: 'race', days: 'Days 56 to 60', what: 'Race' },
    { key: 'back', days: 'Day 61', what: 'Back' },
  ],
}
const texto = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

describe('TripRow', () => {
  it('un li con su cabecera por nombre', () => {
    const s = renderToStaticMarkup(<TripRow {...VIAJE} />)
    const id =
      /^<li data-ui="TripRow" data-variant="trip" data-state="ready" aria-labelledby="([^"]+)"/.exec(
        s,
      )?.[1]
    expect(id).toBeDefined()
    expect(texto(new RegExp(`<p id="${id}"[^>]*>(.*?)</p>`).exec(s)?.[1] ?? '')).toBe(
      'Trip to Race Sardegna (IT) · Days 55 to 61 · 7 days off training',
    )
  })

  it('el icono travel y un tramo por fila, con su origen', () => {
    const s = renderToStaticMarkup(<TripRow {...VIAJE} />)
    expect(s).toContain('data-ui="Icon" data-variant="travel"')
    const tramos = [...s.matchAll(/<li class[^>]*>(.*?)<\/li>/g)].map((m) => texto(m[1] ?? ''))
    expect(tramos).toEqual(['Day 55 Out', 'Days 56 to 60 Race', 'Day 61 Back'])
  })

  it('un descanso lleva lo que lo edita', () => {
    const s = renderToStaticMarkup(
      <TripRow
        {...VIAJE}
        legs={[
          {
            key: 'rest',
            days: 'Day 58',
            what: 'Rest',
            action: <button type="button">Edit</button>,
          },
        ]}
      />,
    )
    expect(texto(s)).toContain('Day 58 Rest Edit')
  })

  it('en curso: la cabecera dice Now', () => {
    const s = renderToStaticMarkup(<TripRow {...VIAJE} active />)
    expect(s).toContain('data-state="active"')
    expect(s).toMatch(/<p id="[^"]+"[^>]*>.*Now.*<\/p>/)
  })
})
