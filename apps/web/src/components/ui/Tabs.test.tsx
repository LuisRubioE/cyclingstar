import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { tabId as tabIdDeHoy } from '../Tabs'
import { Tabs, tabId } from './Tabs'

/**
 * `Tabs` (E3, docs/visual.md §4.4; PR 9a): con `options`, el patrón de `components/Tabs.tsx` (`tablist`,
 * `tab` con `aria-selected` e índice móvil); con `items`, enlaces con `aria-current="page"`; y `nav`, en
 * el ámbito oscuro.
 */

const OPCIONES = [
  { key: 'profile', label: 'Profile' },
  { key: 'training', label: 'Training' },
  { key: 'orders', label: 'Race orders' },
] as const
const change = () => undefined

describe('Tabs con options: el tablist', () => {
  const s = renderToStaticMarkup(
    <Tabs
      label="Rider sections"
      options={OPCIONES}
      value="training"
      onChange={change}
      panelId="rider"
    />,
  )

  it('un tablist con su nombre, en el aspecto page por defecto', () => {
    expect(s).toMatch(/^<div data-ui="Tabs" data-variant="page" data-state="ready"/)
    expect(s).toContain('role="tablist" aria-label="Rider sections"')
  })

  it('la activa: aria-selected, la única en el orden de tabulación', () => {
    expect(s).toMatch(
      /role="tab" aria-selected="true" tabindex="0" data-state="active" id="rider-tab-training" aria-controls="rider"/,
    )
    expect(s.match(/aria-selected="false" tabindex="-1" data-state="inactive"/g)).toHaveLength(2)
  })

  it('los ids, los de components/Tabs.tsx, para su TabPanel', () => {
    expect(tabId('rider', 'orders')).toBe(tabIdDeHoy('rider', 'orders'))
  })
})

describe('Tabs con items: los enlaces', () => {
  const s = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/me/training']}>
      <Tabs
        label="My Rider"
        variant="nav"
        items={[
          { to: '/me/profile', label: 'Profile' },
          { to: '/me/training', label: 'Training' },
        ]}
      />
    </MemoryRouter>,
  )

  it('una nav con su nombre, en el ámbito oscuro', () => {
    expect(s).toMatch(
      /^<nav aria-label="My Rider" data-ui="Tabs" data-variant="nav" data-state="ready" data-surface="dark"/,
    )
  })

  it('la activa, la de la ruta, con aria-current="page"', () => {
    expect(s).toMatch(/<a [^>]*aria-current="page" data-state="active"[^>]*href="\/me\/training"/)
    expect(s.match(/aria-current/g)).toHaveLength(1)
    expect(s).toMatch(/data-state="inactive"[^>]*href="\/me\/profile"/)
  })
})
