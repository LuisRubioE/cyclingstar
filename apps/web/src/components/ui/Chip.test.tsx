import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Chip } from './Chip'

/**
 * `Chip` (E3, docs/visual.md §4.7; PR 9a, D-13): un `<span>` con su texto, siempre, y el icono de su
 * tono; nunca se pulsa.
 */

describe('Chip', () => {
  it('un span con su tono y su texto', () => {
    const s = renderToStaticMarkup(<Chip tone="good">Called up</Chip>)
    expect(s).toMatch(/^<span data-ui="Chip" data-variant="good" data-state="ready"/)
    expect(s).toMatch(/>Called up<\/span>$/)
    expect(s).not.toContain('<button')
  })

  it('el icono sale del tono, y no se lee: lo dice el texto', () => {
    const iconos = { good: 'check', warn: 'warning', bad: 'error', info: 'info' } as const
    for (const tone of ['good', 'warn', 'bad', 'info'] as const)
      expect(renderToStaticMarkup(<Chip tone={tone}>Text</Chip>)).toMatch(
        new RegExp(`data-variant="${iconos[tone]}"[^>]*aria-hidden="true"`),
      )
    for (const tone of ['neutral', 'accent'] as const)
      expect(renderToStaticMarkup(<Chip tone={tone}>Text</Chip>)).not.toContain('<svg')
  })

  it('sin texto no hay chapa: el tono solo no dice nada', () => {
    expect(() => renderToStaticMarkup(<Chip tone="info">{''}</Chip>)).toThrow()
    expect(() => renderToStaticMarkup(<Chip tone="info">{'  '}</Chip>)).toThrow()
  })
})
