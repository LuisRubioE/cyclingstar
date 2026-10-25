import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Segmented } from './Segmented'

/**
 * `Segmented` (E3, docs/visual.md §4.3; PR 9a): un `radiogroup` con índice móvil; cada opción `active` o
 * `inactive`; deshabilitado, con su porqué. De 2 a 4 opciones.
 */

const MODOS = [
  { key: 'coach', label: 'Coach decides' },
  { key: 'mixed', label: 'Mixed' },
  { key: 'me', label: 'I decide' },
] as const
type Modo = (typeof MODOS)[number]['key']
const change = () => undefined
const html = (value: Modo, disabledReason?: string) =>
  renderToStaticMarkup(
    <Segmented
      label="Who decides your training"
      options={MODOS}
      value={value}
      onChange={change}
      {...(disabledReason !== undefined ? { disabledReason } : {})}
    />,
  )

describe('Segmented', () => {
  it('un radiogroup con su nombre; la activa, la única en el orden de tabulación', () => {
    const s = html('mixed')
    expect(s).toMatch(/^<div data-ui="Segmented" data-variant="default" data-state="ready"/)
    expect(s).toContain('role="radiogroup" aria-label="Who decides your training"')
    expect(s.match(/role="radio"/g)).toHaveLength(3)
    expect(s).toMatch(/aria-checked="true" tabindex="0" data-state="active"[^>]*>Mixed</)
    expect(s.match(/aria-checked="false" tabindex="-1" data-state="inactive"/g)).toHaveLength(2)
  })

  it('deshabilitado: el grupo lo dice y da su porqué, enlazado', () => {
    const s = html('coach', 'Coach mode: the coach sets every day.')
    expect(s).toContain('data-state="disabled"')
    const id = /aria-disabled="true" aria-describedby="([^"]+)"/.exec(s)?.[1] ?? ''
    expect(s).toContain(`id="${id}"`)
    expect(s).toContain('Coach mode: the coach sets every day.')
  })

  it('de 2 a 4 opciones: con una o con cinco, no es un Segmented', () => {
    const una = [{ key: 'a', label: 'A' }] as const
    expect(() =>
      renderToStaticMarkup(<Segmented label="x" options={una} value="a" onChange={change} />),
    ).toThrow()
    const cinco = ['a', 'b', 'c', 'd', 'e'].map((k) => ({ key: k, label: k }))
    expect(() =>
      renderToStaticMarkup(<Segmented label="x" options={cinco} value="a" onChange={change} />),
    ).toThrow()
  })
})
