import { describe, expect, it } from 'vitest'
import { PALETA, campo, cuantas, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { Login } from './Login'

/**
 * ENTRAR CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en `PageHeader`, el
 * formulario en el `Panel` que contesta a la 31 (§7.3), cada campo en su `Field` y entrar en un `Button`; lo
 * que falta lo dice su campo, y lo que dice el servidor, debajo.
 */

const pinta = (initial?: NonNullable<Parameters<typeof Login>[0]>['initial']) =>
  pintaEn('/login', <Login {...(initial === undefined ? {} : { initial })} />)

describe('entrar (§17.21; PR 21j)', () => {
  it('la cabecera, un PageHeader con su bienvenida y el único h1, en el ancho de los formularios', () => {
    const html = pinta()
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(titulo(html)).toBe('Log in')
    expect(html).toContain('>Welcome back.</p>')
  })

  it('una sola respuesta, el Panel del acceso, con un nombre que no repite el del título', () => {
    const html = pinta()
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(
      /<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="Your email and password"/,
    )
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

  it('entrar, un Button primary que envía, en reposo; la contraseña olvidada y la cuenta nueva, dos TextLink', () => {
    const html = pinta()
    expect(pieza(html, 'Button', 'Log in<')).toMatch(
      /^<button [^>]*type="submit"[^>]*data-ui="Button" data-variant="primary" data-state="ready"/,
    )
    expect(pieza(html, 'TextLink', 'Forgot your password?')).toMatch(/href="\/forgot-password"/)
    expect(pieza(html, 'TextLink', 'Sign up')).toMatch(/href="\/register"/)
    expect(html).toContain('No account yet?')
  })

  it('lo que falta, en su campo, con su error, y solo en el suyo', () => {
    const sinClave = pinta({ problem: { field: 'password', msg: 'Enter your password.' } })
    expect(campo(sinClave, 'login-password')).toMatch(
      /data-state="error"[\s\S]*aria-invalid="true"[\s\S]*Enter your password\./,
    )
    expect(campo(sinClave, 'login-email')).toContain('data-state="ready"')
    const sinCorreo = pinta({ problem: { field: 'email', msg: 'Enter your email.' } })
    expect(campo(sinCorreo, 'login-email')).toMatch(/data-state="error"[\s\S]*Enter your email\./)
    expect(campo(sinCorreo, 'login-password')).toContain('data-state="ready"')
  })

  it('el fallo del servidor, debajo, en role="alert"; sin fallo, ningún alert', () => {
    expect(pinta({ error: 'Wrong email or password.' })).toMatch(
      /<p role="alert"[^>]*>Wrong email or password\.<\/p>/,
    )
    expect(pinta()).not.toContain('role="alert"')
  })

  it('sin el correo confirmado, un Notice warn en alert con el correo del envío, no el que se escribe después', () => {
    const notice = pieza(
      pinta({ email: 'otra@example.com', unverified: 'ana@example.com' }),
      'Notice',
      'Confirm your email first',
    )
    // insertado ya lleno, un `status` no siempre se oye; es lo que contestó el envío
    expect(notice).toMatch(/data-variant="warn"[^>]*role="alert"/)
    expect(notice).toContain('We have just sent a new link to ana@example.com.')
    expect(pinta()).not.toContain('data-ui="Notice"')
  })

  it('ningún campo ni botón a mano, y ninguna clase de la paleta ni la caja de antes', () => {
    const html = pinta({ unverified: 'ana@example.com', error: 'x' })
    expect(cuantas(html, /<input/)).toBe(2)
    expect(cuantas(html, /<div data-ui="Field"/)).toBe(2)
    expect(cuantas(html, /<button/)).toBeGreaterThan(0)
    expect(cuantas(html, /<button/)).toBe(cuantas(html, /<button [^>]*data-ui="Button"/))
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('rounded-2xl')
  })
})
