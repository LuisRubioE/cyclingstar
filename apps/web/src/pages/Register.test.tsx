import { describe, expect, it } from 'vitest'
import { PALETA, campo, estado, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { CheckInbox, Register } from './Register'

/**
 * CREAR LA CUENTA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en
 * `PageHeader`, el formulario en el `Panel` que contesta a la 32 (§7.3), y después, desde el PR 5 de E4, la
 * petición recibida (`CheckInbox`), sin `Send it again`.
 */

const pinta = (initial?: NonNullable<Parameters<typeof Register>[0]>['initial']) =>
  pintaEn('/register', <Register {...(initial === undefined ? {} : { initial })} />)

describe('crear la cuenta (§17.21; PR 21j)', () => {
  it('la cabecera, un PageHeader con su línea y el único h1, en el ancho de los formularios', () => {
    const html = pinta()
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(titulo(html)).toBe('Create your account')
    expect(html).toContain('>Start building your rider.</p>')
  })

  it('una sola respuesta, el Panel del registro, con un nombre que no repite el del título', () => {
    const html = pinta()
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(
      /<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="Your email and password"/,
    )
  })

  it('el correo y la contraseña en su Field, con su rótulo, su autocompletado y, la contraseña, su ayuda', () => {
    const html = pinta()
    expect(campo(html, 'register-email')).toMatch(/>Email<\/label>[\s\S]*type="email"/)
    const clave = campo(html, 'register-password')
    expect(clave).toMatch(/>Password<\/label>/)
    expect(clave).toMatch(/type="password"[^>]*autoComplete="new-password"/)
    expect(clave).toMatch(/<p [^>]*>At least 8 characters\.<\/p>/)
  })

  it('crearla, un Button primary que envía, en reposo; con cuenta, un TextLink a entrar', () => {
    const html = pinta()
    expect(pieza(html, 'Button', 'Create account')).toMatch(
      /^<button [^>]*type="submit"[^>]*data-variant="primary" data-state="ready"/,
    )
    expect(pieza(html, 'TextLink', 'Log in')).toMatch(/href="\/login"/)
    expect(html).toContain('Already have an account?')
  })

  it('lo que falta, en su campo y solo en el suyo; lo que dice el servidor, en role="alert", y sin fallo, ninguno', () => {
    const corta = 'Your password must be at least 8 characters.'
    const html = pinta({ problem: { field: 'password', msg: corta } })
    expect(campo(html, 'register-password')).toMatch(/data-state="error"[\s\S]*Your password must/)
    expect(estado(campo(html, 'register-email'))).toBe('ready')
    const sinCorreo = pinta({ problem: { field: 'email', msg: 'Enter your email.' } })
    expect(campo(sinCorreo, 'register-email')).toMatch(
      /data-state="error"[\s\S]*Enter your email\./,
    )
    expect(estado(campo(sinCorreo, 'register-password'))).toBe('ready')
    expect(pinta({ error: 'Could not create your account.' })).toMatch(
      /<p role="alert"[^>]*>Could not create your account\.<\/p>/,
    )
    expect(pinta()).not.toContain('role="alert"')
  })

  it('ninguna clase de la paleta ni la caja de antes', () => {
    const html = pinta({ error: 'x' })
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('rounded-2xl')
  })
})

describe('la petición recibida (docs/cuenta.md §4.9 y §5.3; PR 5)', () => {
  const pintaBuzon = () => pintaEn('/register', <CheckInbox email="ana@example.com" />)

  it('su cabecera, Request received, el único h1, y su Panel, que contesta, con el correo al que irá el enlace', () => {
    const html = pintaBuzon()
    expect(titulo(html)).toBe('Request received')
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(/<section data-ui="Panel"[^>]*aria-label="Your request"/)
    expect(html).toContain(
      'An administrator reviews new accounts by hand, a few each day. When yours is approved, we&#x27;ll email <strong class="font-semibold text-ink">ana@example.com</strong> a link to finish signing up. The link expires in 24 hours.',
    )
    // la vida del enlace de confirmar es EMAIL_JWT_TTL_S (docs/cuenta.md §5.1 y §5.3; PR 8)
    expect(html).not.toContain('one hour')
    expect(html).toContain('Nothing yet? Check the spam folder once you&#x27;ve been approved.')
    expect(pieza(html, 'TextLink', 'Log in')).toMatch(/href="\/login"/)
  })

  it('sin Send it again: no hay nada que reenviar hasta que un administrador apruebe', () => {
    const html = pintaBuzon()
    expect(html).not.toContain('Send it again')
    expect(html).not.toContain('role="alert"')
  })
})

describe('Register y CheckInbox en E4 (docs/cuenta.md §5.3 y §12.3; PR 1)', () => {
  it('con el correo que espera (cs.pendingEmail), CheckInbox y no el formulario: sobrevive a recargar', () => {
    const html = pinta({ pending: 'ana@example.com' })
    expect(titulo(html)).toBe('Request received')
    expect(html).toContain('ana@example.com')
    expect(html).not.toContain('<form')
  })

  it('CheckInbox: Start again, y la línea de quien ya tenía cuenta', () => {
    const html = pintaEn('/register', <CheckInbox email="ana@example.com" />)
    expect(html).toContain('Wrong address?')
    expect(pieza(html, 'Button', 'Start again')).toMatch(/data-variant="quiet"/)
    expect(html).toContain(
      'Already have an account with this email? Nothing is sent: log in or reset your password.',
    )
  })

  it('crear la cuenta tras un 429: el botón deshabilitado con su cuenta atrás; la contraseña con Show', () => {
    const html = pinta({ waitS: 60 })
    expect(html).toContain('You can try again in 1:00.')
    expect(html).toMatch(/<button [^>]*type="submit"[^>]*aria-disabled="true"/)
    expect(campo(pinta(), 'register-password')).toMatch(/aria-pressed="false"[^>]*>Show</)
  })
})
