import { describe, expect, it } from 'vitest'
import { pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { AccountBirthDate } from './AccountBirthDate'
import { needsBirthDate } from '../components/ProtectedRoute'

/**
 * LA PUERTA DE LA FECHA EN LA WEB (docs/cuenta.md §4.5; D-09; PR 9 de E4): la cuenta de hoy, sin fecha, la da
 * al entrar; con menos de 16, la página ofrece borrar la cuenta.
 */

const pinta = (initial?: Parameters<typeof AccountBirthDate>[0]) =>
  pintaEn('/account/birth-date', <AccountBirthDate {...(initial ?? {})} />)

describe('la puerta de la fecha', () => {
  it('One more thing, su línea, la fecha y Save and continue', () => {
    const html = pinta()
    expect(titulo(html)).toBe('One more thing')
    expect(html).toContain(
      'We now ask everyone for their date of birth. Cycling Star is for people aged 16 or over.',
    )
    expect(respuestas(html)).toBe(1)
    expect(pieza(html, 'DateField', 'Date of birth')).toContain('autoComplete="bday-month"')
    expect(pieza(html, 'Button', 'Save and continue')).toMatch(/type="submit"/)
  })

  it('el error, en la fecha', () => {
    const html = pinta({ initial: { error: 'Your date of birth is already saved.' } })
    expect(pieza(html, 'DateField', 'Date of birth')).toMatch(
      /data-state="error"[\s\S]*Your date of birth is already saved\./,
    )
  })

  it('el menor ya registrado: no puede seguir, y Delete account lleva a /account/delete', () => {
    const html = pinta({ initial: { underage: true } })
    expect(html).toContain(
      'Cycling Star is for people aged 16 or over, so this account can&#x27;t stay open. You can delete it here.',
    )
    expect(pieza(html, 'Button', 'Delete account')).toMatch(/href="\/account\/delete"/)
    expect(html).not.toContain('<form')
  })

  it('ProtectedRoute lleva a la puerta solo sin fecha, y no desde borrar la cuenta ni desde la puerta', () => {
    expect(needsBirthDate(false, '/me/profile')).toBe(true)
    expect(needsBirthDate(false, '/account')).toBe(true)
    expect(needsBirthDate(false, '/account/delete')).toBe(false)
    expect(needsBirthDate(false, '/account/birth-date')).toBe(false)
    expect(needsBirthDate(true, '/me/profile')).toBe(false)
    // sin saberlo (sin red), la página se pinta: la API tiene su propia puerta
    expect(needsBirthDate(undefined, '/me/profile')).toBe(false)
  })
})
