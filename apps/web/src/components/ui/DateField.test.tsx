import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DateField, type DateFieldProps, toIsoDate } from './DateField'

/**
 * `DateField` (docs/cuenta.md §12.5; D-04, D-56): tres campos numéricos, `Day`, `Month` y `Year`, con su
 * `autocomplete` de fecha de nacimiento; sus cuatro estados (vacío, lleno, con error y deshabilitado) y
 * `toIsoDate`, que no valida: solo rellena con ceros.
 */

const VACIO = { day: '', month: '', year: '' }
const html = (extra: Partial<DateFieldProps> = {}) =>
  renderToStaticMarkup(
    <DateField
      id="dob"
      label="Date of birth"
      hint="We only use it to check you're old enough to play."
      value={VACIO}
      onChange={() => undefined}
      {...extra}
    />,
  )
/** Los `<input>` del campo, en orden. */
const inputs = (s: string) => s.match(/<input [^>]*>/g) ?? []

describe('DateField', () => {
  it('vacío: tres campos numéricos con su rótulo, su tope y su autocomplete', () => {
    const f = html()
    expect(f).toMatch(/^<fieldset data-ui="DateField" data-state="ready"/)
    expect(f).toContain('Date of birth</legend>')
    const [d, m, y] = inputs(f)
    for (const [campo, id, max, auto] of [
      [d, 'dob-day', '2', 'bday-day'],
      [m, 'dob-month', '2', 'bday-month'],
      [y, 'dob-year', '4', 'bday-year'],
    ] as const) {
      expect(campo).toContain(`id="${id}"`)
      expect(campo).toContain('inputMode="numeric"')
      expect(campo).toContain('pattern="[0-9]*"')
      expect(campo).toContain(`maxLength="${max}"`)
      expect(campo).toContain(`autoComplete="${auto}"`)
      expect(campo).toContain('value=""')
      expect(campo).not.toContain('aria-invalid')
    }
    for (const r of ['Day', 'Month', 'Year']) expect(f).toContain(`>${r}</label>`)
    expect(f).toContain('We only use it to check you&#x27;re old enough to play.')
    // los anchos de §12.5: 64, 64 y 96
    expect(d).toContain('w-16')
    expect(y).toContain('w-24')
  })

  it('lleno: cada campo con su valor', () => {
    const f = html({ value: { day: '1', month: '7', year: '2008' } })
    const [d, m, y] = inputs(f)
    expect(d).toContain('value="1"')
    expect(m).toContain('value="7"')
    expect(y).toContain('value="2008"')
  })

  it('con error: los tres con aria-invalid y aria-describedby al mensaje', () => {
    const f = html({ error: 'Enter a real date of birth.' })
    expect(f).toMatch(/data-state="error"/)
    const id =
      /<p id="([^"]+)"[^>]*>(?:<svg[\s\S]*?<\/svg>)?Enter a real date of birth\.<\/p>/.exec(f)?.[1]
    expect(id).toBeTruthy()
    for (const campo of inputs(f)) {
      expect(campo).toContain('aria-invalid="true"')
      expect(campo).toMatch(new RegExp(`aria-describedby="[^"]*${id!.replace(/[^\w]/g, '\\$&')}`))
    }
  })

  it('deshabilitado: los tres sin cambiarse', () => {
    const f = html({ disabled: true, value: { day: '9', month: '9', year: '1999' } })
    expect(f).toMatch(/data-state="disabled"/)
    for (const campo of inputs(f)) expect(campo).toContain('disabled=""')
  })
})

describe('toIsoDate', () => {
  it('1, 7, 2008 da 2008-07-01', () => {
    expect(toIsoDate({ day: '1', month: '7', year: '2008' })).toBe('2008-07-01')
  })

  it('con un trozo vacío, null; con espacios, recortados', () => {
    expect(toIsoDate({ day: '', month: '7', year: '2008' })).toBeNull()
    expect(toIsoDate({ day: '1', month: ' ', year: '2008' })).toBeNull()
    expect(toIsoDate({ day: '1', month: '7', year: '' })).toBeNull()
    expect(toIsoDate({ day: ' 31 ', month: '12', year: '1999' })).toBe('1999-12-31')
  })

  it('no valida: 31 de febrero sale tal cual, y lo rechaza birthDateSchema', () => {
    expect(toIsoDate({ day: '31', month: '2', year: '2001' })).toBe('2001-02-31')
    expect(toIsoDate({ day: '1', month: '7', year: '8' })).toBe('0008-07-01')
  })
})
