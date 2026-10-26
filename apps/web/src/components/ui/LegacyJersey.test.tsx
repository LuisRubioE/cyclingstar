import { legacyJerseyStyle } from '@cyclingstar/shared/legacyJersey'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import golden from '../../../../../packages/shared/src/legacyJersey.golden.json'
import { Jersey } from '../Jersey'
import { LegacyJersey } from './LegacyJersey'

/**
 * `LegacyJersey` (E3, docs/visual.md §8.6; PR 9b): el dibujo de `Jersey` sin cambiar su aspecto. Mientras
 * `Jersey` exista (hasta el 17b), cada una de las 219 semillas de la génesis sale con el mismo marcado que
 * él, quitados los tres `data-*` del catálogo; y su `data-kit`, que cuenta la comprobación 10.
 */

const SEMILLAS = Object.keys(golden.semillas)
const sinCatalogo = (s: string) => s.replace(/ data-(ui|variant|state)="[^"]*"/g, '')

describe('LegacyJersey', () => {
  it('el mismo dibujo que Jersey, semilla a semilla, a 28 y a 40', () => {
    for (const seed of SEMILLAS)
      for (const size of [28, 40] as const)
        expect(
          sinCatalogo(renderToStaticMarkup(<LegacyJersey seed={seed} size={size} />)),
          seed,
        ).toBe(renderToStaticMarkup(<Jersey seed={seed} size={size} />))
  })

  it('los cinco patrones, en data-variant', () => {
    const vistos = new Set(
      SEMILLAS.map(
        (seed) =>
          /data-variant="([a-z]+)"/.exec(
            renderToStaticMarkup(<LegacyJersey seed={seed} size={28} />),
          )?.[1],
      ),
    )
    expect(vistos).toEqual(new Set(['solid', 'band', 'stripes', 'panels', 'shoulders']))
    const seed = SEMILLAS[0] ?? ''
    expect(renderToStaticMarkup(<LegacyJersey seed={seed} size={28} />)).toContain(
      `data-variant="${legacyJerseyStyle(seed).pattern}"`,
    )
  })

  it('con el nombre del equipo, el lector lo dice; sin él, Team jersey', () => {
    const s = renderToStaticMarkup(<LegacyJersey seed="x" size={28} team="Mistral Racing" />)
    expect(s).toMatch(
      /^<svg data-ui="LegacyJersey" data-variant="[a-z]+" data-state="ready" width="28" height="28" viewBox="0 0 48 48" role="img" aria-label="Mistral Racing kit"/,
    )
    expect(renderToStaticMarkup(<LegacyJersey seed="x" size={28} />)).toContain(
      'aria-label="Team jersey"',
    )
  })

  it('lleva data-kit="team", y por debajo de 28 no compila', () => {
    expect(renderToStaticMarkup(<LegacyJersey seed="x" size={28} />)).toContain('data-kit="team"')
    // @ts-expect-error: 14 no es un KitSize (D-00b)
    expect(renderToStaticMarkup(<LegacyJersey seed="x" size={14} />)).toContain('width="14"')
  })
})
