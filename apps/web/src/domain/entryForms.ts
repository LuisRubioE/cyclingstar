/**
 * LO QUE FALTA EN UN FORMULARIO DE LA ENTRADA (E3, PR 21j): entrar, crear la cuenta, pedir el enlace y elegir la
 * contraseña nueva. Lo dice el campo, con su rótulo y su error (`Field`, §4.3), y no el globo del navegador de
 * `required` y `minLength`, que el lector no siempre oye y que `TextField` dejaba a cada página; como en
 * `Account` (21f). Fuera de las páginas para probarlo sin pulsar: sus tests pintan en estático.
 */

/** El campo en el que se dice lo que falta, y lo que se dice. */
export interface FieldProblem<F extends string> {
  readonly field: F
  readonly msg: string
}

/** Lo que pide better-auth, por defecto, a una contraseña, y lo que dice cada ayuda (`At least 8 characters.`). */
export const MIN_PASSWORD = 8

const SIN_CORREO = 'Enter your email.'
const CORTA = `Your password must be at least ${MIN_PASSWORD} characters.`

/** Entrar: el correo y la contraseña, los dos. */
export function loginProblem(
  email: string,
  password: string,
): FieldProblem<'email' | 'password'> | null {
  if (email.trim() === '') return { field: 'email', msg: SIN_CORREO }
  if (password === '') return { field: 'password', msg: 'Enter your password.' }
  return null
}

/** Crear la cuenta: el correo, y una contraseña de ocho como poco. */
export function registerProblem(
  email: string,
  password: string,
): FieldProblem<'email' | 'password'> | null {
  if (email.trim() === '') return { field: 'email', msg: SIN_CORREO }
  if (password.length < MIN_PASSWORD) return { field: 'password', msg: CORTA }
  return null
}

/** Pedir el enlace de la contraseña: el correo. */
export function emailProblem(email: string): FieldProblem<'email'> | null {
  return email.trim() === '' ? { field: 'email', msg: SIN_CORREO } : null
}

/** La contraseña nueva: de ocho como poco, y la repetida, igual. */
export function newPasswordProblem(
  password: string,
  confirm: string,
): FieldProblem<'password' | 'confirm'> | null {
  if (password.length < MIN_PASSWORD) return { field: 'password', msg: CORTA }
  if (password !== confirm) return { field: 'confirm', msg: 'The two passwords do not match.' }
  return null
}
