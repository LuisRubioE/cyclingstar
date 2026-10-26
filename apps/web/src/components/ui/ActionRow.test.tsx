import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ActionRow, type ActionRowProps } from './ActionRow'

/**
 * `ActionRow` (E3, docs/visual.md §4.5; PR 9b): los dos renglones, en bloque, enlazan a la carrera, y el
 * botón queda fuera del enlace (Ruso-009); el botón lleva el nombre entero; deshabilitado, su porqué en
 * un tercer renglón enlazado; ocupado; y hecha, un `Chip`.
 */

const add = { label: 'Add', ariaLabel: 'Add Race Ardèche', onClick: () => undefined } as const
const pinta = (p: Partial<ActionRowProps> = {}) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ActionRow
        title="Race Ardèche .WT"
        meta="Day 59 · FR · Travel 336 · 2 days out, 2 back"
        href="/races/ardeche"
        action={add}
        {...p}
      />
    </MemoryRouter>,
  )

describe('ActionRow', () => {
  it('un li; el enlace es el bloque de los dos renglones, y el botón queda fuera', () => {
    const s = pinta()
    expect(s).toMatch(/^<li data-ui="ActionRow" data-variant="secondary" data-state="ready"/)
    expect(s.match(/<a /g)).toHaveLength(1)
    expect(s).toMatch(
      /<a [^>]*href="\/races\/ardeche"[^>]*><span[^>]*>Race Ardèche .WT<\/span><span[^>]*>Day 59 · FR · Travel 336 · 2 days out, 2 back<\/span><\/a>/,
    )
    expect(s.indexOf('</a>')).toBeLessThan(s.indexOf('<button'))
  })

  it('el botón lleva el nombre entero', () => {
    expect(pinta()).toMatch(/<button type="button" aria-label="Add Race Ardèche"/)
  })

  it('sin href, sin enlace', () => {
    const s = renderToStaticMarkup(
      <ActionRow title="Race Ardèche .WT" meta="Day 59" action={add} />,
    )
    expect(s).not.toContain('<a ')
  })

  it('deshabilitado: su porqué en un tercer renglón, enlazado al botón', () => {
    const s = pinta({ action: { ...add, disabledReason: 'Not enough money for the trip' } })
    expect(s).toContain('data-state="disabled"')
    const id = /<p id="([^"]+)"[^>]*>Not enough money for the trip<\/p>/.exec(s)?.[1]
    expect(id).toBeDefined()
    expect(s).toContain(`aria-disabled="true" aria-describedby="${id}"`)
  })

  it('ocupado: aria-busy, con su nombre y su texto, que cabe en la caja', () => {
    const s = pinta({ action: { ...add, busy: true } })
    expect(s).toContain('data-state="busy"')
    expect(s).toMatch(/<button type="button" aria-label="Add Race Ardèche" aria-busy="true"/)
  })

  it('con to, la acción es un enlace con aspecto de botón: Set orders lleva a las órdenes (PR 12a)', () => {
    const s = pinta({
      action: {
        label: 'Set orders',
        ariaLabel: 'Set orders for Race Var',
        to: '/me/orders?race=var',
      },
    })
    expect(s.match(/<a /g)).toHaveLength(2)
    expect(s).toMatch(
      /<a [^>]*aria-label="Set orders for Race Var"[^>]*href="\/me\/orders\?race=var"/,
    )
    expect(s).not.toContain('<button')
  })

  it('lo de más, debajo de los dos renglones: la retirada de una carrera en curso (PR 12a)', () => {
    const s = pinta({ extra: <button type="button">Abandon</button> })
    expect(s).toMatch(/<\/a><div data-extra=""[^>]*><button type="button">Abandon<\/button><\/div>/)
  })

  it('hecha: un Chip en lugar del botón', () => {
    const s = pinta({ done: { text: 'Called up', tone: 'good' } })
    expect(s).toContain('data-variant="done"')
    expect(s).not.toContain('<button')
    expect(s).toMatch(/data-ui="Chip" data-variant="good"[^>]*>.*Called up/)
  })
})
