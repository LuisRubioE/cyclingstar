import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppHeader, type AppHeaderProps } from './AppHeader'

/**
 * `AppHeader` (E3, docs/visual.md §4.4 y §6.3; PR 11): sus tres estados (con sesión, sin ella y sin
 * saberla, que pinta la del jugador, D-47), el logotipo como enlace a la portada con su nombre (Ruso-007;
 * sus 44 × 44 los mide la comprobación 5 de la prueba del teléfono), y el reloj del mundo con su frase
 * entera para el lector. Lo que solo se ve desde 640 lo dice `data-from`.
 */

const RELOJ = {
  text: 'Day 50 · S1 · 4h 56m',
  label: 'Day 50 of season 1. Next update in 4 hours 56 minutes.',
}
const pinta = (p: AppHeaderProps) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <AppHeader {...p} />
    </MemoryRouter>,
  )
const texto = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

describe('AppHeader', () => {
  it('con sesión: el logotipo a la portada, el reloj y Account, en el ámbito oscuro', () => {
    const s = pinta({ state: 'signed-in', clock: RELOJ })
    expect(s).toMatch(/^<header data-ui="AppHeader" data-state="signed-in" data-surface="dark"/)
    expect(s).toMatch(/<a [^>]*aria-label="Cycling Star home"[^>]*href="\/"/)
    // el logotipo no se lee: el nombre lo lleva el enlace
    expect(s).toMatch(/<svg [^>]*aria-hidden="true"/)
    expect(s).toMatch(/<a [^>]*aria-label="Account"[^>]*href="\/account"/)
    expect(s).not.toContain('Log in')
  })

  it('el reloj: su texto a la vista y la frase entera en su aria-label, siempre con sesión', () => {
    const s = pinta({ state: 'signed-in', clock: RELOJ })
    expect(s).toContain(
      'role="timer" aria-label="Day 50 of season 1. Next update in 4 hours 56 minutes."',
    )
    expect(texto(s)).toContain('Day 50 · S1 · 4h 56m')
    expect(s).not.toMatch(/role="timer"[^>]*data-from/)
  })

  it('Cycling Star junto al logotipo, solo desde 640', () => {
    expect(pinta({ state: 'signed-in', clock: RELOJ })).toMatch(
      /<span data-from="640"[^>]*>Cycling Star<\/span>/,
    )
  })

  it('sin sesión: Log in y Sign up, y el reloj solo desde 640 (4-k)', () => {
    const s = pinta({ state: 'signed-out', clock: RELOJ })
    expect(s).toMatch(/^<header data-ui="AppHeader" data-state="signed-out"/)
    expect(s).toMatch(/<a [^>]*href="\/login"[^>]*>.*Log in/)
    expect(s).toMatch(/<a [^>]*href="\/register"[^>]*>Sign up<\/a>/)
    expect(s).toMatch(/role="timer"[^>]*data-from="640"/)
    expect(s).not.toContain('aria-label="Account"')
  })

  it('sin saber la sesión, la del jugador (sin red, D-47)', () => {
    const s = pinta({ state: 'unknown', clock: RELOJ })
    expect(s).toMatch(/^<header data-ui="AppHeader" data-state="unknown"/)
    expect(s).toContain('aria-label="Account"')
    expect(s).not.toContain('Sign up')
  })

  it('sin /health todavía, sin reloj; y lo de debajo, la navegación, tras la banda', () => {
    const s = pinta({
      state: 'signed-in',
      clock: null,
      children: <nav aria-label="Rider sections" />,
    })
    expect(s).not.toContain('role="timer"')
    expect(s).toMatch(/<nav aria-label="Rider sections"><\/nav><\/header>$/)
  })

  it('el nivel 1, solo desde 640: por debajo lo lleva la BottomNav', () => {
    const s = pinta({
      state: 'signed-in',
      clock: RELOJ,
      sections: <nav aria-label="Sections" />,
      children: <nav aria-label="Rider sections" />,
    })
    expect(s).toMatch(
      /<div data-from="640"[^>]*><nav aria-label="Sections"><\/nav><\/div><nav aria-label="Rider sections">/,
    )
  })
})
