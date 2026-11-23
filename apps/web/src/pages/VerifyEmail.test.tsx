import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PALETA, campo, pieza, pintaEn, respuestas, titulo } from './__fixtures__/markup'
import { VerifyEmail } from './VerifyEmail'

/**
 * LA PÁGINA DE BOTÓN DE CONFIRMAR (docs/cuenta.md §5.2; D-12, I-04, 5-h; PR 8 de E4), con el sistema (E3,
 * docs/visual.md §17.21): abrir el enlace no confirma nada hasta pulsar; el token, que va en el fragmento,
 * no sale en el marcado; y cada estado de la tabla de §5.2, con su texto exacto.
 */

/** La sesión que ve la página: la pregunta antes de hablar (§5.2 y §12.4; mapa 05 §5). */
const sesion = vi.hoisted(() => ({ user: { id: 'u1' } as { id: string } | null, isPending: false }))

vi.mock('../auth/client', () => ({
  authClient: {
    useSession: () => ({
      data: sesion.user ? { user: sesion.user } : null,
      isPending: sesion.isPending,
    }),
  },
}))

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFAYi5jIn0.firma'
const red = vi.fn()

beforeEach(() => {
  sesion.user = null
  sesion.isPending = false
  red.mockReset()
  vi.stubGlobal('fetch', red)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const pinta = (ruta: string, initial?: NonNullable<Parameters<typeof VerifyEmail>[0]>['initial']) =>
  pintaEn(`/verify-email${ruta}`, <VerifyEmail {...(initial === undefined ? {} : { initial })} />)

describe('la página de botón de confirmar (§5.2; PR 8)', () => {
  it('abrir el enlace no confirma nada: el botón espera, y nada sale a la red', () => {
    const html = pinta(`#token=${TOKEN}`)
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(titulo(html)).toBe('Confirm your email')
    expect(respuestas(html)).toBe(1)
    expect(html).toContain('Tap the button to finish creating your account.')
    expect(pieza(html, 'Button', 'Confirm my email')).toMatch(
      /^<button [^>]*data-variant="primary" data-state="ready"/,
    )
    expect(html).not.toContain('Email confirmed')
    expect(red).not.toHaveBeenCalled()
  })

  it('el token no sale en el marcado: ni en un enlace ni en un formulario', () => {
    expect(pinta(`#token=${TOKEN}`)).not.toContain(TOKEN)
  })

  /* La gracia de los enlaces viejos (LEGACY_LINK_GRACE_DAYS, hasta el PR 19). */
  it('el enlace viejo con ?token= también espera al botón', () => {
    const html = pinta(`?token=${TOKEN}`)
    expect(pieza(html, 'Button', 'Confirm my email')).toMatch(/data-state="ready"/)
    expect(red).not.toHaveBeenCalled()
  })

  it('pulsado, el botón ocupado con Confirming…', () => {
    const html = pinta(`#token=${TOKEN}`, { phase: 'busy' })
    expect(pieza(html, 'Button', 'Confirm my email')).toMatch(/aria-busy="true"/)
    expect(html).toContain('Confirming…')
  })

  it('confirmado y con sesión: el Notice good y Continue, que lleva a crear el corredor', () => {
    const html = pinta('', { phase: 'confirmed', signedIn: true })
    const aviso = pieza(html, 'Notice', 'Email confirmed')
    expect(aviso).toMatch(/data-variant="good"[^>]*role="status"/)
    expect(aviso).toContain('You&#x27;re in. Let&#x27;s create your rider.')
    expect(pieza(html, 'Button', 'Continue')).toMatch(
      /^<a [^>]*data-variant="primary"[^>]*href="\/me\/profile"/,
    )
    expect(html).not.toContain('Log in')
  })

  it('confirmado sin sesión (la cuenta ya lo estaba): no dice que la tiene, y lleva a Log in', () => {
    sesion.user = { id: 'u1' }
    const html = pinta('', { phase: 'confirmed', signedIn: false })
    expect(pieza(html, 'Notice', 'Email confirmed')).toContain('Log in to start playing.')
    expect(html).not.toContain('You&#x27;re in')
    expect(pieza(html, 'Button', 'Log in')).toMatch(/data-variant="primary"[^>]*href="\/login"/)
    expect(html).not.toContain('Continue')
  })

  it('el enlace viejo confirmado llega sin nada y con la sesión puesta', () => {
    sesion.user = { id: 'u1' }
    expect(pieza(pinta(''), 'Notice', 'Email confirmed')).toContain(
      'You&#x27;re in. Let&#x27;s create your rider.',
    )
  })

  it('caducado o usado: el texto de authErrorText, el correo y Send me a new link, y Log in', () => {
    for (const html of [pinta('', { phase: 'expired' }), pinta('?error=TOKEN_EXPIRED')]) {
      expect(html).toMatch(
        /<p role="alert"[^>]*>This link has expired or has already been used\.<\/p>/,
      )
      expect(html).toContain('Enter your email and we&#x27;ll send you a new one.')
      expect(campo(html, 'verify-email-address')).toMatch(/>Email<\/label>[\s\S]*type="email"/)
      expect(pieza(html, 'Button', 'Send me a new link')).toMatch(
        /^<button [^>]*type="submit"[^>]*data-variant="primary"/,
      )
      expect(pieza(html, 'Button', 'Log in')).toMatch(/href="\/login"/)
      expect(html).not.toContain('Confirm my email')
    }
  })

  it('sin token en el fragmento: incompleto, y pedir otro', () => {
    const html = pinta('')
    expect(html).toMatch(/<p role="alert"[^>]*>This link is incomplete\.<\/p>/)
    expect(html).toContain('Open it again from the email, or ask for a new one.')
    expect(pieza(html, 'Button', 'Send me a new link')).toMatch(/data-variant="primary"/)
    expect(html).not.toContain('Log in')
  })

  it('pedido otro: siempre la misma respuesta, en su región de estado', () => {
    expect(pinta('', { phase: 'incomplete', sent: true })).toMatch(
      /<div role="status"><p[^>]*>If that address has an approved account waiting for confirmation, a new link is on its way\.<\/p>/,
    )
  })

  it('mientras llega la sesión, su espera, y nada dicho todavía', () => {
    sesion.isPending = true
    const html = pinta('')
    expect(html).not.toContain('Email confirmed')
    expect(html).not.toContain('incomplete')
  })

  it('ninguna clase de la paleta, ni la marca de antes', () => {
    const html =
      pinta(`#token=${TOKEN}`) + pinta('', { phase: 'expired' }) + pinta('', { phase: 'confirmed' })
    expect(html).not.toMatch(PALETA)
  })
})
