import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Stat, statFigure } from './Stat'

/**
 * `Stat` (E3, docs/visual.md §4.4; PR 9a): un `<dl>` con su `<dt>` y su `<dd>` (hoy fallan `dlitem` y
 * `definition-list`); el dinero, siempre con su signo, y el cero sin él (D-13).
 */

const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

describe('Stat', () => {
  it('un dl con su dt y su dd', () => {
    const s = renderToStaticMarkup(<Stat label="Balance" value={6173210} />)
    expect(s).toMatch(
      /^<dl data-ui="Stat" data-variant="default" data-state="ready"[^>]*><dt[^>]*>Balance<\/dt><dd[^>]*>6,173,210<\/dd><\/dl>$/,
    )
  })

  it('el dinero con signo: +780 y −80; el cero, sin signo', () => {
    expect(text(renderToStaticMarkup(<Stat label="Weekly net" value={780} signed />))).toBe(
      'Weekly net +780',
    )
    expect(text(renderToStaticMarkup(<Stat label="Weekly net" value={-80} signed />))).toBe(
      'Weekly net −80',
    )
    expect(text(renderToStaticMarkup(<Stat label="Weekly net" value={0} signed />))).toBe(
      'Weekly net 0',
    )
    expect(renderToStaticMarkup(<Stat label="Weekly net" value={0} signed />)).toContain(
      'data-variant="signed"',
    )
  })

  it('el cero, del color de una cifra cualquiera, y no del de una pérdida', () => {
    expect(statFigure(0, true).tone).toBe(statFigure(12, false).tone)
    expect(statFigure(-80, true).tone).not.toBe(statFigure(80, true).tone)
  })

  it('un texto, tal cual', () => {
    expect(text(renderToStaticMarkup(<Stat label="Role" value="Climber" />))).toBe('Role Climber')
  })

  it('cargando: el esqueleto, que no se lee, y no la cifra', () => {
    const s = renderToStaticMarkup(<Stat label="Balance" value={10} loading />)
    expect(s).toContain('data-state="loading"')
    expect(text(s)).toBe('Balance')
    expect(s).toContain(
      'data-ui="Skeleton" data-variant="figure" data-state="loading" aria-hidden="true"',
    )
  })
})
