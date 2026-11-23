import type { WelcomeBack } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { pieza } from '../pages/__fixtures__/markup'
import { AwayBandView, BackNotice } from './AwayBand'
import { WelcomeBackView } from './WelcomeBack'

/**
 * `AwayBand` y `Welcome back` (docs/cuenta.md §14.3 y §14.5; PR 13 de E4), en estático: la banda, un `Notice`
 * `info` que no se cierra, con la fecha y `End now`; la vuelta, `good`; y `Welcome back`, `info` que se
 * cierra, con y sin corredor.
 */

const AHORA = new Date(2026, 10, 23, 12)
const nada = (): void => undefined
const pinta = (el: React.ReactElement): string =>
  renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>)

describe('AwayBand (§14.3)', () => {
  it('la fecha de vuelta y End now; no se cierra', () => {
    const markup = pinta(
      <AwayBandView awayUntil={new Date(2026, 11, 3).toISOString()} now={AHORA} onEnd={nada} />,
    )
    const aviso = pieza(markup, 'Notice', 'away until')
    expect(aviso).toContain('data-variant="info"')
    expect(aviso).toContain('>You&#x27;re away until 3 Dec</p>')
    expect(aviso).toContain('>End now</')
    expect(aviso).not.toContain('Dismiss')
    expect(markup).not.toContain('Notifications')
  })

  it('al terminar, el Notice good de la vuelta, que se cierra', () => {
    const markup = pinta(<BackNotice onDismiss={nada} />)
    expect(markup).toContain('data-variant="good"')
    expect(markup).toContain('>Welcome back.</p>')
    expect(markup).toContain('aria-label="Dismiss"')
  })
})

const VUELTA: WelcomeBack = {
  from: new Date(2026, 10, 11).toISOString(),
  days: 12,
  gameDays: 48,
  rider: { id: 'r1', name: 'Luca Bianchi', trainedDays: 41, stages: 3 },
  offers: { expired: 2, open: 1, firstExpiresAt: new Date(2026, 10, 29, 12).toISOString() },
}

describe('Welcome back (§14.5)', () => {
  it('con corredor: las cifras, las ofertas, See your rider y cerrar', () => {
    const markup = pinta(<WelcomeBackView data={VUELTA} now={AHORA} onDismiss={nada} />)
    expect(markup).toContain('data-variant="rider"')
    const aviso = pieza(markup, 'Notice', 'Welcome back')
    expect(aviso).toContain('data-variant="info"')
    expect(aviso).toContain(
      '<p>You were away 12 days (48 game days). Luca Bianchi trained on 41 of them and raced 3 stages.</p>',
    )
    expect(aviso).toContain('<p>2 contract offers expired. 1 is still open: answer by 29 Nov.</p>')
    expect(aviso).toMatch(/href="\/me\/profile"[^>]*>[\s\S]*?See your rider/)
    expect(aviso).toContain('aria-label="Dismiss"')
  })

  it('sin corredor: solo los días, sin See your rider', () => {
    const markup = pinta(
      <WelcomeBackView
        data={{ ...VUELTA, rider: null, offers: { expired: 0, open: 0, firstExpiresAt: null } }}
        now={AHORA}
        onDismiss={nada}
      />,
    )
    expect(markup).toContain('data-variant="no-rider"')
    expect(markup).toContain('<p>You were away 12 days.</p>')
    expect(markup).not.toContain('See your rider')
    expect(markup).toContain('aria-label="Dismiss"')
  })
})
