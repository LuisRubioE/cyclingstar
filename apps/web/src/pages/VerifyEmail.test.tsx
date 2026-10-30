import { describe, expect, it } from 'vitest'
import { PALETA, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { VerifyEmail } from './VerifyEmail'

/**
 * LA VUELTA DE LOS ENLACES DEL CORREO CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): su
 * cabecera, que dice qué pasó, y su `Panel`, que contesta, con sus dos salidas en `Button`.
 */

const pinta = (search: string) => pintaEn(`/verify-email${search}`, <VerifyEmail />)

describe('la vuelta de los enlaces del correo (§17.21; PR 21j)', () => {
  it('confirmado: su cabecera, su Panel, que contesta, y Continue, el primario, con Account al lado', () => {
    const html = pinta('')
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(titulo(html)).toBe('Email confirmed')
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(
      /<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="The link from your email"/,
    )
    expect(html).toContain('Your address is verified and you are signed in.')
    expect(pieza(html, 'Button', 'Continue')).toMatch(
      /^<a [^>]*data-variant="primary"[^>]*href="\/me\/profile"/,
    )
    expect(pieza(html, 'Button', 'Account')).toMatch(
      /^<a [^>]*data-variant="secondary"[^>]*href="\/account"/,
    )
  })

  it('el cambio de correo aprobado, falta el segundo enlace', () => {
    const html = pinta('?step=approved')
    expect(titulo(html)).toBe('Change approved')
    expect(html).toContain(
      'One step left: we have sent a link to your new address. Your email changes only when you open it.',
    )
    expect(pieza(html, 'Button', 'Continue')).toMatch(/href="\/me\/profile"/)
  })

  it('el enlace que ya no vale: lo que pasó, en role="alert", y Log in, el primario, que manda otro', () => {
    const html = pinta('?error=INVALID_TOKEN')
    expect(titulo(html)).toBe('That did not work')
    expect(html).toMatch(
      /<p role="alert"[^>]*>That link is not valid any more\. Ask for a new one\.<\/p>/,
    )
    expect(html).toContain('Logging in with an unconfirmed email sends you a fresh link.')
    expect(pieza(html, 'Button', 'Log in')).toMatch(/data-variant="primary"[^>]*href="\/login"/)
    expect(html).not.toContain('Continue')
    expect(pinta('')).not.toContain('role="alert"')
  })

  it('ninguna clase de la paleta, ni la marca de antes', () => {
    const html = pinta('') + pinta('?error=x')
    expect(html).not.toMatch(PALETA)
  })
})
