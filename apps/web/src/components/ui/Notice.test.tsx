import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Notice } from './Notice'

/**
 * `Notice` (E3, docs/visual.md §4.7; PR 9a, D-13): sus cuatro tonos, cada uno con su icono (la silueta,
 * no solo el color), su papel, el título obligatorio, la acción y cerrar, que solo tienen `info` y `good`.
 */

const html = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('Notice', () => {
  it('cada tono con su icono, que no se lee: lo dice el título', () => {
    const iconos = { info: 'info', good: 'check', warn: 'warning', bad: 'error' } as const
    for (const tone of ['info', 'good', 'warn', 'bad'] as const) {
      const s = html(<Notice tone={tone} title="Title" />)
      expect(s).toMatch(
        new RegExp(`^<div data-ui="Notice" data-variant="${tone}" data-state="ready" role="note"`),
      )
      expect(s).toMatch(new RegExp(`data-variant="${iconos[tone]}"[^>]*aria-hidden="true"`))
    }
  })

  it('su papel: note fijo, status si llega después, alert tras un fallo', () => {
    expect(html(<Notice tone="info" title="T" role="status" />)).toContain('role="status"')
    expect(html(<Notice tone="bad" title="T" role="alert" />)).toContain('role="alert"')
  })

  it('el título y el texto', () => {
    const s = html(
      <Notice tone="info" title="Coach mode: nothing you set here is used.">
        Switch to Mixed to edit.
      </Notice>,
    )
    expect(s).toContain('>Coach mode: nothing you set here is used.</p>')
    expect(s).toContain('Switch to Mixed to edit.')
  })

  it('la acción, un botón quiet o un enlace', () => {
    const enlace = html(
      <Notice tone="info" title="T" action={{ label: 'Manage', to: '/account' }} />,
    )
    expect(enlace).toMatch(/<a [^>]*data-ui="Button" data-variant="quiet"/)
    expect(enlace).toMatch(/<a [^>]*href="\/account"/)
    expect(
      html(<Notice tone="warn" title="T" action={{ label: 'Retry', onClick: () => undefined }} />),
    ).toMatch(/<button type="button" data-ui="Button" data-variant="quiet"/)
  })

  it('la acción, ocupada mientras hace lo suyo (busy): el indicador y aria-busy, como un Button (la revisión del 21f)', () => {
    const ocupada = html(
      <Notice
        tone="warn"
        title="T"
        action={{ label: 'Send', onClick: () => undefined, busy: true }}
      />,
    )
    expect(ocupada).toMatch(
      /<button type="button" data-ui="Button" data-variant="quiet" data-state="busy" aria-busy="true"/,
    )
    expect(
      html(<Notice tone="warn" title="T" action={{ label: 'Send', onClick: () => undefined }} />),
    ).not.toContain('aria-busy')
    // y con lo que dice ocupada, si lo lleva (PR 21k)
    expect(
      html(
        <Notice
          tone="info"
          title="T"
          action={{
            label: 'Take control',
            onClick: () => undefined,
            busy: true,
            busyLabel: 'Taking over…',
          }}
        />,
      ),
    ).toContain('Taking over…')
  })

  it('cerrar, solo en info y good', () => {
    expect(html(<Notice tone="good" title="T" onDismiss={() => undefined} />)).toContain(
      'aria-label="Dismiss"',
    )
    expect(() => html(<Notice tone="warn" title="T" onDismiss={() => undefined} />)).toThrow()
    expect(() => html(<Notice tone="bad" title="T" onDismiss={() => undefined} />)).toThrow()
  })
})
