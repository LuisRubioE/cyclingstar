import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Field, type FieldProps } from './Field'

/**
 * `Field` (E3, docs/visual.md §4.3; PR 9a): sus tres variantes y sus estados, con su `data-state` y su
 * ARIA. Nunca un campo sin rótulo, y la ayuda, el error y el porqué, enlazados con `aria-describedby`.
 */

const change = () => undefined
const html = (props: FieldProps) => renderToStaticMarkup(<Field {...props} />)
const input = (extra: Partial<FieldProps> = {}) =>
  html({
    kind: 'input',
    id: 'team-name',
    label: 'Name',
    value: 'Mistral',
    onChange: change,
    ...extra,
  } as FieldProps)
/** Los ids de `aria-describedby` del control. */
const describedBy = (s: string) =>
  (/<(?:input|select|textarea) [^>]*aria-describedby="([^"]+)"/.exec(s)?.[1] ?? '').split(' ')
const textoDe = (s: string, id: string) =>
  new RegExp(`id="${id.replace(/[^\w]/g, '\\$&')}"[^>]*>(.*?)</p>`)
    .exec(s)?.[1]
    ?.replace(/<[^>]+>/g, '')

describe('Field', () => {
  it('input: el rótulo encima, enlazado con for, y el control con su id', () => {
    const f = input()
    expect(f).toMatch(/^<div data-ui="Field" data-variant="input" data-state="ready"/)
    expect(f).toContain('<label for="team-name"')
    expect(f).toMatch(/<input id="team-name"[^>]*type="text"[^>]*value="Mistral"/)
  })

  it('la ayuda, debajo y enlazada', () => {
    const f = input({ help: 'Up to 40 characters.' })
    const [id] = describedBy(f)
    expect(textoDe(f, id ?? '')).toBe('Up to 40 characters.')
  })

  it('error: aria-invalid, data-state error y el error enlazado, con su icono', () => {
    const f = input({ error: 'Must be 2 to 40 characters.' })
    expect(f).toContain('data-state="error"')
    expect(f).toContain('aria-invalid="true"')
    const [id] = describedBy(f)
    expect(textoDe(f, id ?? '')).toBe('Must be 2 to 40 characters.')
    expect(f).toMatch(/data-variant="error"[^>]*aria-hidden="true"/)
  })

  it('deshabilitado: aria-disabled y de solo lectura, con su porqué, nunca disabled', () => {
    const f = input({ disabledReason: 'Only the manager can rename the team.' })
    expect(f).toContain('data-state="disabled"')
    expect(f).toContain('aria-disabled="true"')
    expect(f).toContain('readOnly=""')
    expect(f).not.toMatch(/ disabled[ =>]/)
    const [id] = describedBy(f)
    expect(textoDe(f, id ?? '')).toBe('Only the manager can rename the team.')
  })

  it('select: nativo, con sus opciones y el chevron, que no se lee', () => {
    const f = html({
      kind: 'select',
      id: 'week-1',
      label: 'Week 1',
      value: 'build',
      onChange: change,
      options: [
        { value: 'build', label: 'Build' },
        { value: 'rest', label: 'Rest' },
      ],
    })
    expect(f).toContain('data-variant="select"')
    expect(f).toMatch(/<select id="week-1"/)
    expect(f).toContain('<option value="build" selected="">Build</option>')
    expect(f).toMatch(/data-variant="chevron-down"[^>]*aria-hidden="true"/)
  })

  it('textarea', () => {
    const f = html({ kind: 'textarea', id: 'note', label: 'Note', value: '', onChange: change })
    expect(f).toContain('data-variant="textarea"')
    expect(f).toMatch(/<textarea id="note"/)
  })

  it('con el título de la fila por rótulo: no pinta otro y lo nombra', () => {
    const f = input({ labelledBy: 'day-12-title' })
    expect(f).not.toContain('<label')
    expect(f).toContain('aria-labelledby="day-12-title"')
  })

  it('inline: el rótulo y el control, en el mismo renglón', () => {
    const f = input({ inline: true })
    expect(f).toContain('<label for="team-name"')
  })
})
