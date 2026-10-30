import { describe, expect, it } from 'vitest'
import { PALETA, campo, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { ForgotPassword } from './ForgotPassword'

/**
 * PEDIR EL ENLACE DE LA CONTRASEÑA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): su
 * cabecera, el `Panel` que contesta, con el correo en su `Field`, y lo que pasa después, en su región de estado.
 */

const pinta = (initial?: NonNullable<Parameters<typeof ForgotPassword>[0]>['initial']) =>
  pintaEn('/forgot-password', <ForgotPassword {...(initial === undefined ? {} : { initial })} />)

const INSTRUCCION = 'Give us your email and we will send you a link to set a new one.'

describe('la contraseña olvidada (§17.21; PR 21j)', () => {
  it('la cabecera, con su instrucción, y una sola respuesta, su Panel, en el ancho de los formularios', () => {
    const html = pinta()
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(titulo(html)).toBe('Forgot your password?')
    expect(html).toContain(`>${INSTRUCCION}</p>`)
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(/<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="Your email"/)
  })

  it('el correo en su Field, y pedirlo, un Button primary que envía, en reposo', () => {
    const html = pinta()
    expect(campo(html, 'forgot-email')).toMatch(
      />Email<\/label>[\s\S]*type="email"[^>]*autoComplete="email"/,
    )
    expect(pieza(html, 'Button', 'Send me a link')).toMatch(
      /^<button [^>]*type="submit"[^>]*data-variant="primary" data-state="ready"/,
    )
    expect(pieza(html, 'TextLink', 'Back to log in')).toMatch(/href="\/login"/)
  })

  it('lo que falta, en su campo', () => {
    expect(
      campo(pinta({ problem: { field: 'email', msg: 'Enter your email.' } }), 'forgot-email'),
    ).toMatch(/data-state="error"[\s\S]*Enter your email\./)
  })

  it('pedido: lo dice la región de estado, que está en el lector desde el principio; y se van el formulario y la instrucción', () => {
    expect(pinta()).toMatch(/<div role="status" class="[^"]*empty:sr-only[^"]*"><\/div>/)
    const html = pinta({ email: 'ana@example.com', sent: true })
    expect(html).toMatch(
      /<div role="status"[^>]*><p[^>]*>If there is an account for <strong[^>]*>ana@example\.com<\/strong>, a link to choose a new password is on its way\. It expires in one hour\.<\/p>/,
    )
    expect(html).toContain(
      'Nothing in your inbox? Check the spam folder before asking for another one.',
    )
    expect(html).not.toContain('<form')
    expect(html).not.toContain(INSTRUCCION)
  })

  it('ninguna clase de la paleta ni la caja de antes', () => {
    const html = pinta() + pinta({ email: 'a', sent: true })
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('rounded-2xl')
  })
})
