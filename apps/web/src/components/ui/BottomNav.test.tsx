import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BottomNav, type BottomNavItem } from './BottomNav'

/**
 * `BottomNav` (E3, docs/visual.md §4.4 y §6.3; PR 11): de tres a cinco destinos, cada uno con su icono en
 * su pastilla y sus dos rótulos, el largo y el corto, que la regla de contenedor elige (el corto en toda
 * celda de menos de 76 px, `@max-[4.75rem]:`; Ruso-014); el activo con `aria-current`; y con el teclado
 * abierto, escondida.
 */

const CINCO: readonly BottomNavItem[] = [
  { key: 'dashboard', to: '/', label: 'Dashboard', shortLabel: 'Home', icon: 'home' },
  { key: 'me', to: '/me/profile', label: 'My Rider', shortLabel: 'Rider', icon: 'rider' },
  { key: 'team', to: '/team/squad', label: 'My Team', shortLabel: 'Team', icon: 'team' },
  { key: 'world', to: '/world/races', label: 'World', shortLabel: 'World', icon: 'world' },
  { key: 'news', to: '/news', label: 'News', shortLabel: 'News', icon: 'news' },
]
const pinta = (items: readonly BottomNavItem[], activeKey: string | null, hidden = false) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <BottomNav items={items} activeKey={activeKey} hidden={hidden} />
    </MemoryRouter>,
  )

describe('BottomNav', () => {
  it('una nav con su nombre, en el ámbito oscuro', () => {
    expect(pinta(CINCO, 'me')).toMatch(
      /^<nav aria-label="Sections" data-ui="BottomNav" data-state="ready" data-surface="dark"/,
    )
  })

  it('el destino activo, con aria-current y su pastilla; los demás, sin ella', () => {
    const s = pinta(CINCO, 'me')
    expect(s).toMatch(/<a [^>]*aria-current="page" data-state="active"[^>]*href="\/me\/profile"/)
    expect(s.match(/aria-current/g)).toHaveLength(1)
    expect(s.match(/data-state="inactive"/g)).toHaveLength(4)
    expect(s.match(/data-pill="active"/g)).toHaveLength(1)
  })

  it('cada destino, su icono y sus dos rótulos, el largo y el corto', () => {
    const s = pinta(CINCO, null)
    for (const d of CINCO) {
      expect(s).toMatch(
        new RegExp(
          `href="${d.to}"[^>]*>.*?data-variant="${d.icon}".*?<span data-label="long"[^>]*>${d.label}</span><span data-label="short"[^>]*>${d.shortLabel}</span></a>`,
        ),
      )
    }
    expect(s).not.toContain('aria-current')
  })

  it('de tres a cinco destinos, y ni uno más ni uno menos', () => {
    for (const n of [3, 4, 5]) expect(pinta(CINCO.slice(0, n), null).match(/<li /g)).toHaveLength(n)
    expect(() => pinta(CINCO.slice(0, 2), null)).toThrow(/de tres a cinco/)
    const seis: readonly BottomNavItem[] = [
      ...CINCO,
      { key: 'help', to: '/how-to-play', label: 'How to play', shortLabel: 'Help', icon: 'info' },
    ]
    expect(() => pinta(seis, null)).toThrow(/de tres a cinco/)
  })

  it('con el teclado abierto, escondida', () => {
    expect(pinta(CINCO, 'me', true)).toMatch(/^<nav [^>]*data-state="hidden"/)
  })
})
