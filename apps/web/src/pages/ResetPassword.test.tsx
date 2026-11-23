import { describe, expect, it } from 'vitest'
import { PALETA, campo, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { ResetPassword } from './ResetPassword'

/**
 * LA PÁGINA DE BOTÓN DE RECUPERAR (docs/cuenta.md §5.2 y §5.4; D-12, I-04; PR 8 de E4), con el sistema (E3,
 * docs/visual.md §17.21): el token en el fragmento, que no sale en el marcado; un solo campo con `Show`; y
 * el enlace gastado o incompleto, con lo que pasó y sus salidas.
 */

const TOKEN = 'Ab3dEf6hIj9kLm2nOp5qRs8t'

const pinta = (
  ruta: string,
  initial?: NonNullable<Parameters<typeof ResetPassword>[0]>['initial'],
) =>
  pintaEn(
    `/reset-password${ruta}`,
    <ResetPassword {...(initial === undefined ? {} : { initial })} />,
  )

describe('la página de botón de recuperar (§5.2; PR 8)', () => {
  it('con el token del fragmento: la contraseña nueva, un solo campo con Show y su ayuda', () => {
    const html = pinta(`#token=${TOKEN}`)
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(titulo(html)).toBe('Choose a new password')
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(/<section data-ui="Panel"[^>]*aria-label="Your new password"/)
    const nueva = campo(html, 'reset-password')
    expect(nueva).toMatch(
      />New password<\/label>[\s\S]*type="password"[^>]*autoComplete="new-password"/,
    )
    expect(nueva).toMatch(/<p [^>]*>At least 8 characters\.<\/p>/)
    expect(nueva).toMatch(/aria-pressed="false"[^>]*>Show</)
    expect(html).not.toContain('Repeat it')
    expect(pieza(html, 'Button', 'Save my new password')).toMatch(
      /^<button [^>]*type="submit"[^>]*data-variant="primary" data-state="ready"/,
    )
    // el token va en el cuerpo del POST al guardar, nunca en el marcado ni en una URL
    expect(html).not.toContain(TOKEN)
  })

  /* La gracia de los enlaces viejos (LEGACY_LINK_GRACE_DAYS, hasta el PR 19). */
  it('el enlace viejo, que la API trae con ?token=, también vale', () => {
    expect(campo(pinta(`?token=${TOKEN}`), 'reset-password')).toContain('New password')
  })

  it('lo que falta, en su campo; lo que dice el servidor, en role="alert"', () => {
    const corta = pinta(`#token=${TOKEN}`, {
      problem: { field: 'password', msg: 'Your password must be at least 8 characters.' },
    })
    expect(campo(corta, 'reset-password')).toMatch(/data-state="error"[\s\S]*at least 8/)
    expect(
      pinta(`#token=${TOKEN}`, { error: 'Something went wrong. Try again in a minute.' }),
    ).toMatch(/<p role="alert"[^>]*>Something went wrong\. Try again in a minute\.<\/p>/)
    expect(pinta(`#token=${TOKEN}`)).not.toContain('role="alert"')
  })

  it('caducado o usado: el texto de authErrorText, Log in y Ask for a new link', () => {
    for (const html of [pinta('', { phase: 'expired' }), pinta('?error=INVALID_TOKEN')]) {
      expect(respuestas(html)).toBe(1)
      expect(html).toMatch(
        /<p role="alert"[^>]*>This link has expired or has already been used\.<\/p>/,
      )
      expect(html).toContain('If you just set a new password, log in with it.')
      expect(pieza(html, 'Button', 'Log in')).toMatch(/data-variant="primary"[^>]*href="\/login"/)
      expect(pieza(html, 'Button', 'Ask for a new link')).toMatch(/href="\/forgot-password"/)
      expect(html).not.toContain('<form')
    }
  })

  it('sin token: incompleto, y pedir otro, el primario', () => {
    const html = pinta('')
    expect(html).toMatch(/<p role="alert"[^>]*>This link is incomplete\.<\/p>/)
    expect(html).toContain('Open it again from the email, or ask for a new one.')
    expect(pieza(html, 'Button', 'Ask for a new link')).toMatch(
      /^<a [^>]*data-variant="primary"[^>]*href="\/forgot-password"/,
    )
    expect(html).not.toContain('Log in')
  })

  it('ninguna clase de la paleta ni la caja de antes', () => {
    const html = pinta(`#token=${TOKEN}`) + pinta('') + pinta('', { phase: 'expired' })
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('rounded-2xl')
  })
})
