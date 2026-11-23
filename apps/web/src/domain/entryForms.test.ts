import { describe, expect, it } from 'vitest'
import {
  MIN_PASSWORD,
  emailProblem,
  loginProblem,
  newPasswordProblem,
  birthDateEntryProblem,
  registerProblem,
} from './entryForms'

/**
 * LO QUE FALTA EN UN FORMULARIO DE LA ENTRADA (E3, PR 21j), fuera de las páginas para probarlo sin pulsar: lo
 * dice el campo, con su rótulo, y no un globo del navegador (§4.3), como en `Account` (21f).
 */

describe('entrar', () => {
  it('sin correo, lo dice el correo; sin contraseña, la contraseña; con los dos, nada', () => {
    expect(loginProblem('', 'x')).toEqual({ field: 'email', msg: 'Enter your email.' })
    expect(loginProblem('   ', 'x')).toEqual({ field: 'email', msg: 'Enter your email.' })
    expect(loginProblem('ana@example.com', '')).toEqual({
      field: 'password',
      msg: 'Enter your password.',
    })
    expect(loginProblem('ana@example.com', 'x')).toBeNull()
    // sin nada, lo primero que falta: el correo
    expect(loginProblem('', '')?.field).toBe('email')
  })
})

describe('crear la cuenta', () => {
  it('sin correo, el correo; con una contraseña de menos de ocho, la contraseña', () => {
    expect(registerProblem('', '12345678')).toEqual({ field: 'email', msg: 'Enter your email.' })
    expect(registerProblem('ana@example.com', '1234567')).toEqual({
      field: 'password',
      msg: 'Your password must be at least 8 characters.',
    })
    expect(registerProblem('ana@example.com', '12345678')).toBeNull()
    expect(registerProblem('  ', '12345678')?.field).toBe('email')
    expect(registerProblem('', '1')?.field).toBe('email')
    expect(MIN_PASSWORD).toBe(8)
  })
})

describe('la fecha de nacimiento (docs/cuenta.md §4.8; PR 9 de E4)', () => {
  const HOY = new Date('2026-11-23T12:00:00Z')
  const f = (day: string, month: string, year: string) =>
    birthDateEntryProblem({ day, month, year }, HOY)

  it('falta un trozo: lo dice, y el foco va al primero vacío', () => {
    expect(f('', '', '')).toEqual({
      kind: 'missing',
      part: 'day',
      msg: 'Enter your date of birth.',
    })
    expect(f('1', '', '2000')).toEqual({
      kind: 'missing',
      part: 'month',
      msg: 'Enter your date of birth.',
    })
    expect(f('1', '7', ' ')?.kind).toBe('missing')
  })

  it('imposible, futura o anterior a 1900: Enter a real date of birth.', () => {
    for (const [d, m, y] of [
      ['31', '4', '2001'],
      ['29', '2', '2023'],
      ['1', '1', '1899'],
      ['24', '11', '2026'],
      ['x', '1', '2000'],
    ] as const)
      expect(f(d, m, y), `${d}/${m}/${y}`).toEqual({
        kind: 'invalid',
        msg: 'Enter a real date of birth.',
      })
  })

  it('menos de 16: la pantalla del menor; 16 cumplidos hoy, nada', () => {
    expect(f('24', '11', '2010')).toEqual({ kind: 'underage' })
    expect(f('23', '11', '2010')).toBeNull()
    expect(f('1', '7', '1990')).toBeNull()
  })
})

describe('pedir el enlace', () => {
  it('sin correo, lo dice el correo', () => {
    expect(emailProblem(' ')).toEqual({ field: 'email', msg: 'Enter your email.' })
    expect(emailProblem('ana@example.com')).toBeNull()
  })
})

describe('la contraseña nueva', () => {
  it('de menos de ocho, la nueva; distinta de la repetida, la repetida; iguales y largas, nada', () => {
    expect(newPasswordProblem('1234567', '1234567')).toEqual({
      field: 'password',
      msg: 'Your password must be at least 8 characters.',
    })
    expect(newPasswordProblem('12345678', '12345679')).toEqual({
      field: 'confirm',
      msg: 'The two passwords do not match.',
    })
    expect(newPasswordProblem('12345678', '12345678')).toBeNull()
    // corta y distinta: primero, que es corta
    expect(newPasswordProblem('1', '2')?.field).toBe('password')
  })
})
