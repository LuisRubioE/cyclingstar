import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

/**
 * `Button` (E3, docs/visual.md §4.3 y §4.1; PR 9a): cada estado con su `data-state` y su ARIA, nunca sus
 * clases (§4.1). Render estático, como los demás tests de la web.
 */

const html = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
/** El elemento con ese id, entero. */
const porId = (s: string, id: string) =>
  new RegExp(`<[a-z]+ id="${id.replace(/[^\w]/g, '\\$&')}"[^>]*>[^<]*<`).exec(s)?.[0] ?? ''

describe('Button', () => {
  it('ready: un button type="button", secondary por defecto, con su data-ui y su estado', () => {
    expect(html(<Button>Save plan</Button>)).toMatch(
      /^<button type="button" data-ui="Button" data-variant="secondary" data-state="ready"/,
    )
    expect(text(html(<Button>Save plan</Button>))).toBe('Save plan')
  })

  it('cada variante dice la suya', () => {
    for (const variant of ['primary', 'secondary', 'quiet', 'danger'] as const)
      expect(html(<Button variant={variant}>Go</Button>)).toContain(`data-variant="${variant}"`)
  })

  it('con icono, el icono no se lee: lo dice el texto', () => {
    const b = html(<Button icon="retry">Try again</Button>)
    expect(b).toMatch(/<svg data-ui="Icon" data-variant="retry"[^>]*aria-hidden="true"/)
    expect(text(b)).toBe('Try again')
  })

  it('solo icono: su nombre en aria-label, y nada que leer dentro', () => {
    const b = html(<Button icon="close" ariaLabel="Close" />)
    expect(b).toContain('aria-label="Close"')
    expect(text(b)).toBe('')
  })

  it('con un texto corto, el nombre entero en aria-label', () => {
    expect(html(<Button ariaLabel="Add Race Ardèche">Add</Button>)).toContain(
      'aria-label="Add Race Ardèche"',
    )
  })

  it('submit, para un formulario', () => {
    expect(html(<Button type="submit">Log in</Button>)).toMatch(/^<button type="submit"/)
  })

  it('con to, un enlace con aspecto de botón', () => {
    const b = html(<Button to="/me/training">Open the plan</Button>)
    expect(b).toMatch(/^<a [^>]*data-ui="Button"/)
    expect(b).toMatch(/^<a [^>]*href="\/me\/training"/)
  })

  it('ocupado: aria-busy, data-state busy, el indicador y busyLabel; el texto en reposo, invisible', () => {
    const b = html(
      <Button variant="primary" busy busyLabel="Saving…">
        Save plan
      </Button>,
    )
    expect(b).toContain('aria-busy="true"')
    expect(b).toContain('data-state="busy"')
    expect(b).toMatch(/<svg[^>]*aria-hidden="true"[^>]*animate-spin/)
    expect(text(b)).toBe('Save plan Saving…')
    expect(b).not.toContain('aria-disabled')
  })

  it('ocupado y sin busyLabel, el mismo texto', () => {
    expect(text(html(<Button busy>Retry</Button>))).toBe('Retry Retry')
  })

  it('ocupado no es un enlace: no navega mientras trabaja', () => {
    expect(
      html(
        <Button to="/x" busy>
          Go
        </Button>,
      ),
    ).toMatch(/^<button /)
  })

  it('deshabilitado: aria-disabled y nunca disabled, con el porqué debajo, enlazado', () => {
    const b = html(
      <Button variant="primary" disabledReason="Nothing to save yet. Change a day first.">
        Save plan
      </Button>,
    )
    expect(b).toMatch(/^<span data-ui="Button" data-variant="primary" data-state="disabled"/)
    expect(b).toContain('aria-disabled="true"')
    expect(b).not.toMatch(/ disabled[ =>]/)
    const id = /aria-describedby="([^"]+)"/.exec(b)?.[1] ?? ''
    expect(porId(b, id)).toContain('Nothing to save yet. Change a day first.')
    expect(b).not.toContain('title=')
  })
})
