import { describe, expect, it } from 'vitest'
import { PALETA, campo, estado, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { CheckInbox, Register } from './Register'

/**
 * CREAR LA CUENTA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en
 * `PageHeader`, el formulario en el `Panel` que contesta a la 32 (§7.3), y después, mirar el correo, con su
 * `Send it again`.
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

describe('mirar el correo (§17.21; PR 21j)', () => {
  const pintaBuzon = (resend?: 'sending' | 'sent' | 'failed') =>
    pintaEn(
      '/register',
      <CheckInbox
        email="ana@example.com"
        {...(resend === undefined ? {} : { initialResend: resend })}
      />,
    )

  it('su cabecera, el único h1, y su Panel, que contesta, con el correo al que fue el enlace', () => {
    const html = pintaBuzon()
    expect(titulo(html)).toBe('Check your inbox')
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(/<section data-ui="Panel"[^>]*aria-label="The link we sent"/)
    expect(html).toContain(
      'We have sent a link to <strong class="font-semibold text-ink">ana@example.com</strong>. Open it to confirm your email and start playing. It expires in one hour.',
    )
    expect(html).toContain(
      'Nothing there? Check the spam folder, or make sure the address above is right.',
    )
    expect(pieza(html, 'TextLink', 'Log in')).toMatch(/href="\/login"/)
  })

  it('reenviarlo, un Button secundario en reposo, con su región de estado vacía y en el lector desde el principio', () => {
    const html = pintaBuzon()
    expect(pieza(html, 'Button', 'Send it again')).toMatch(
      /data-variant="secondary" data-state="ready"/,
    )
    expect(html).toMatch(/<p role="status" class="[^"]*empty:sr-only[^"]*"><\/p>/)
    expect(html).not.toContain('role="alert"')
  })

  it('enviando, ocupado y sin decir nada todavía; enviado, lo dice su región; y si el servidor no lo manda, en alert', () => {
    const enviando = pintaBuzon('sending')
    expect(pieza(enviando, 'Button', 'Send it again')).toMatch(/aria-busy="true"/)
    expect(enviando).toMatch(/<p role="status"[^>]*><\/p>/)
    const enviado = pintaBuzon('sent')
    expect(enviado).toMatch(/<p role="status"[^>]*>Sent again\. Give it a minute to arrive\.<\/p>/)
    // enviado o fallido, el botón vuelve a estar en reposo, para mandar otro
    expect(pieza(enviado, 'Button', 'Send it again')).toMatch(/data-state="ready"/)
    const fallo = pintaBuzon('failed')
    expect(fallo).toMatch(
      /<p role="alert"[^>]*>Could not send it again\. Try again in a few minutes\.<\/p>/,
    )
    expect(fallo).toMatch(/<p role="status"[^>]*><\/p>/)
    expect(pieza(fallo, 'Button', 'Send it again')).toMatch(/data-state="ready"/)
  })
})
