import { describe, expect, it } from 'vitest'
import { PALETA, campo, pieza, pintaEn, respuestas } from './__fixtures__/markup'
import { CheckInbox, Register } from './Register'

/**
 * CREAR LA CUENTA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en
 * `PageHeader`, el formulario en el `Panel` que contesta a la 32 (§7.3), y después, mirar el correo, con su
 * `Send it again`.
 */

const pinta = (initial?: NonNullable<Parameters<typeof Register>[0]>['initial']) =>
  pintaEn('/register', <Register {...(initial === undefined ? {} : { initial })} />)

describe('crear la cuenta (§17.21; PR 21j)', () => {
  it('la cabecera, un PageHeader con su línea, en el ancho de los formularios', () => {
    const html = pinta()
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(html).toMatch(/<h1[^>]*>Create your account<\/h1>/)
    expect(html).toContain('>Start building your rider.</p>')
  })

  it('una sola respuesta, el Panel del registro', () => {
    const html = pinta()
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(
      /<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="Create your account"/,
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

  it('crearla, un Button primary que envía; con cuenta, un TextLink a entrar', () => {
    const html = pinta()
    expect(pieza(html, 'Button', 'Create account')).toMatch(
      /^<button [^>]*type="submit"[^>]*data-variant="primary"/,
    )
    expect(pieza(html, 'TextLink', 'Log in')).toMatch(/href="\/login"/)
    expect(html).toContain('Already have an account?')
  })

  it('lo que falta, en su campo; lo que dice el servidor, en role="alert"', () => {
    const corta = 'Your password must be at least 8 characters.'
    const html = pinta({ problem: { field: 'password', msg: corta } })
    expect(campo(html, 'register-password')).toMatch(/data-state="error"[\s\S]*Your password must/)
    expect(pinta({ error: 'Could not create your account.' })).toMatch(
      /<p role="alert"[^>]*>Could not create your account\.<\/p>/,
    )
  })

  it('ninguna clase de la paleta ni la caja de antes', () => {
    const html = pinta({ error: 'x' })
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('rounded-2xl')
  })
})

describe('mirar el correo (§17.21; PR 21j)', () => {
  const pintaBuzon = (resend?: 'sending' | 'sent') =>
    pintaEn(
      '/register',
      <CheckInbox
        email="ana@example.com"
        {...(resend === undefined ? {} : { initialResend: resend })}
      />,
    )

  it('su cabecera y su Panel, que contesta, con el correo al que fue el enlace', () => {
    const html = pintaBuzon()
    expect(html).toMatch(/<h1[^>]*>Check your inbox<\/h1>/)
    expect(respuestas(html)).toBe(1)
    expect(html).toContain(
      'We have sent a link to <strong class="font-semibold text-ink">ana@example.com</strong>. Open it to confirm your email and start playing. It expires in one hour.',
    )
    expect(html).toContain(
      'Nothing there? Check the spam folder, or make sure the address above is right.',
    )
    expect(pieza(html, 'TextLink', 'Log in')).toMatch(/href="\/login"/)
  })

  it('reenviarlo, un Button secundario; enviando, ocupado; enviado, lo dice su región de estado, que está desde el principio', () => {
    expect(pieza(pintaBuzon(), 'Button', 'Send it again')).toMatch(/data-variant="secondary"/)
    expect(pieza(pintaBuzon('sending'), 'Button', 'Send it again')).toMatch(/aria-busy="true"/)
    expect(pintaBuzon()).toMatch(/<p role="status"[^>]*><\/p>/)
    expect(pintaBuzon('sent')).toMatch(
      /<p role="status"[^>]*>Sent again\. Give it a minute to arrive\.<\/p>/,
    )
  })
})
