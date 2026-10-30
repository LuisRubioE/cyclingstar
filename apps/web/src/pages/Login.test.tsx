import { describe, expect, it } from 'vitest'
import { PALETA, campo, pieza, pintaEn, respuestas } from './__fixtures__/markup'
import { Login } from './Login'

/**
 * ENTRAR CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en `PageHeader`, el
 * formulario en el `Panel` que contesta a la 31 (§7.3), cada campo en su `Field` y entrar en un `Button`; lo
 * que falta lo dice su campo, y lo que dice el servidor, debajo.
 */

const pinta = (initial?: NonNullable<Parameters<typeof Login>[0]>['initial']) =>
  pintaEn('/login', <Login {...(initial === undefined ? {} : { initial })} />)

describe('entrar (§17.21; PR 21j)', () => {
  it('la cabecera, un PageHeader con su bienvenida, en el ancho de los formularios', () => {
    const html = pinta()
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(html).toMatch(/<header data-ui="PageHeader"[\s\S]*?<h1[^>]*>Log in<\/h1>/)
    expect(html).toContain('>Welcome back.</p>')
  })

  it('una sola respuesta, el Panel del acceso', () => {
    const html = pinta()
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(/<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="Log in"/)
  })

  it('el correo y la contraseña, cada uno en su Field, con su rótulo a la vista y su autocompletado', () => {
    const html = pinta()
    const correo = campo(html, 'login-email')
    expect(correo).toMatch(/<label for="login-email"[^>]*>Email<\/label>/)
    expect(correo).toMatch(/<input [^>]*type="email"[^>]*autoComplete="email"/)
    const clave = campo(html, 'login-password')
    expect(clave).toMatch(/<label for="login-password"[^>]*>Password<\/label>/)
    expect(clave).toMatch(/<input [^>]*type="password"[^>]*autoComplete="current-password"/)
  })

  it('entrar, un Button primary que envía; la contraseña olvidada y la cuenta nueva, dos TextLink', () => {
    const html = pinta()
    expect(pieza(html, 'Button', 'Log in<')).toMatch(
      /^<button [^>]*type="submit"[^>]*data-ui="Button" data-variant="primary"/,
    )
    expect(pieza(html, 'TextLink', 'Forgot your password?')).toMatch(/href="\/forgot-password"/)
    expect(pieza(html, 'TextLink', 'Sign up')).toMatch(/href="\/register"/)
    expect(html).toContain('No account yet?')
  })

  it('lo que falta, en su campo, con su error', () => {
    const html = pinta({ problem: { field: 'password', msg: 'Enter your password.' } })
    expect(campo(html, 'login-password')).toMatch(
      /data-state="error"[\s\S]*aria-invalid="true"[\s\S]*Enter your password\./,
    )
    expect(campo(html, 'login-email')).toContain('data-state="ready"')
  })

  it('el fallo del servidor, debajo, en role="alert"', () => {
    expect(pinta({ error: 'Wrong email or password.' })).toMatch(
      /<p role="alert"[^>]*>Wrong email or password\.<\/p>/,
    )
    expect(pinta()).not.toContain('role="alert"')
  })

  it('sin el correo confirmado, un Notice warn que lo dice, con el correo al que va el enlace nuevo', () => {
    const notice = pieza(
      pinta({ email: 'ana@example.com', unverified: true }),
      'Notice',
      'Confirm your email first',
    )
    // insertado ya lleno, un `status` no siempre se oye; es lo que contestó el envío
    expect(notice).toMatch(/data-variant="warn"[^>]*role="alert"/)
    expect(notice).toContain('We have just sent a new link to ana@example.com.')
    expect(pinta()).not.toContain('data-ui="Notice"')
  })

  it('ningún campo ni botón a mano, y ninguna clase de la paleta ni la caja de antes', () => {
    const html = pinta({ email: 'ana@example.com', unverified: true, error: 'x' })
    expect(html.match(/<input/g)?.length).toBe(2)
    expect(html.match(/<div data-ui="Field"/g)?.length).toBe(2)
    expect(html.match(/<button/g)?.length).toBe(
      html.match(/<button [^>]*data-ui="Button"/g)?.length,
    )
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('rounded-2xl')
  })
})
