import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PALETA, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { VerifyEmail } from './VerifyEmail'

/**
 * LA VUELTA DE LOS ENLACES DEL CORREO CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): su
 * cabecera, que dice qué pasó, y su `Panel`, que contesta, con sus dos salidas en `Button`.
 */

/** La sesión que ve la página: la pregunta antes de hablar (docs/cuenta.md §12.4; mapa 05 §5). */
const sesion = vi.hoisted(() => ({ user: { id: 'u1' } as { id: string } | null, isPending: false }))

vi.mock('../auth/client', () => ({
  authClient: {
    useSession: () => ({
      data: sesion.user ? { user: sesion.user } : null,
      isPending: sesion.isPending,
    }),
  },
}))

beforeEach(() => {
  sesion.user = { id: 'u1' }
  sesion.isPending = false
})

const pinta = (search: string) => pintaEn(`/verify-email${search}`, <VerifyEmail />)

describe('la vuelta de los enlaces del correo (§17.21; PR 21j)', () => {
  it('confirmado y con sesión: el final, un Notice good en role="status", y Continue, el primario, con Account al lado', () => {
    const html = pinta('')
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(titulo(html)).toBe('Confirm your email')
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(
      /<section data-ui="Panel"[^>]*data-answer=""[^>]*aria-label="The link from your email"/,
    )
    const aviso = pieza(html, 'Notice', 'Email confirmed')
    expect(aviso).toMatch(/data-variant="good"[^>]*role="status"/)
    // el apóstrofo, escapado por React
    expect(aviso).toContain('You&#x27;re in. Let&#x27;s create your rider.')
    expect(html).not.toContain('Log in')
    expect(html).not.toContain('signed in')
    expect(pieza(html, 'Button', 'Continue')).toMatch(
      /^<a [^>]*data-variant="primary"[^>]*href="\/me\/profile"/,
    )
    expect(pieza(html, 'Button', 'Account')).toMatch(
      /^<a [^>]*data-variant="secondary"[^>]*href="\/account"/,
    )
  })

  it('confirmado y sin sesión: no dice que la tiene, y lleva a Log in (captura 22)', () => {
    sesion.user = null
    const html = pinta('')
    const aviso = pieza(html, 'Notice', 'Email confirmed')
    expect(aviso).toMatch(/data-variant="good"[^>]*role="status"/)
    expect(aviso).toContain('Log in to start playing.')
    expect(html).not.toContain('signed in')
    expect(html).not.toContain('You&#x27;re in')
    expect(pieza(html, 'Button', 'Log in')).toMatch(/data-variant="primary"[^>]*href="\/login"/)
    expect(html).not.toContain('Continue')
    expect(html).not.toContain('href="/account"')
  })

  it('mientras llega la sesión, su espera, y nada dicho todavía', () => {
    sesion.isPending = true
    const html = pinta('')
    expect(html).not.toContain('Email confirmed')
    expect(html).not.toContain('Log in')
  })

  it('el cambio de correo aprobado, falta el segundo enlace', () => {
    const html = pinta('?step=approved')
    expect(titulo(html)).toBe('Change approved')
    expect(html).toContain(
      'One step left: we have sent a link to your new address. Your email changes only when you open it.',
    )
    expect(pieza(html, 'Button', 'Continue')).toMatch(/href="\/me\/profile"/)
  })

  it('el enlace que ya no vale, sin sesión: lo que pasó, en role="alert", y Log in, el primario, que manda otro', () => {
    sesion.user = null
    const html = pinta('?error=INVALID_TOKEN')
    expect(titulo(html)).toBe('That did not work')
    expect(html).toMatch(
      /<p role="alert"[^>]*>This link has expired or has already been used\.<\/p>/,
    )
    expect(html).toContain('Logging in with an unconfirmed email sends you a fresh link.')
    expect(pieza(html, 'Button', 'Log in')).toMatch(/data-variant="primary"[^>]*href="\/login"/)
    expect(html).not.toContain('Continue')
    expect(pinta('')).not.toContain('role="alert"')
  })

  it('el enlace que ya no vale, con sesión: no le pide entrar a quien ya está dentro', () => {
    const html = pinta('?error=EMAIL_ALREADY_VERIFIED')
    expect(html).toContain('role="alert"')
    expect(html).not.toContain('Log in')
    expect(html).not.toContain('Logging in')
    expect(pieza(html, 'Button', 'Continue')).toMatch(/data-variant="primary"/)
  })

  it('ninguna clase de la paleta, ni la marca de antes', () => {
    const html = pinta('') + pinta('?error=x')
    expect(html).not.toMatch(PALETA)
  })
})
