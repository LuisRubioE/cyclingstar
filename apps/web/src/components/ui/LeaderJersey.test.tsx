import {
  JERSEY_LABEL,
  KIT_FIGURE_PATHS,
  KIT_PX,
  LEADER_DOTS,
  LEADER_JERSEY,
  TORSO,
} from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LeaderJersey } from './LeaderJersey'

/**
 * `LeaderJersey` (E3, docs/visual.md §9.7; PR 17a): los tres de líder de `LEADER_JERSEY`, con las capas
 * que mide la distancia dibujada (`drawingLayers`): el cuerpo, la marca y el filete fuerte, sin cuello.
 */

describe('LeaderJersey', () => {
  it('cada uno con su texto en aria-label y en title, y su papel en data-kit', () => {
    for (const kind of ['gc', 'points', 'kom'] as const) {
      const s = renderToStaticMarkup(<LeaderJersey kind={kind} size={KIT_PX.row} />)
      expect(s).toMatch(/^<svg data-ui="LeaderJersey"/)
      expect(s).toContain(`data-variant="${kind}"`)
      expect(s).toContain(`data-kit="leader-${kind}"`)
      expect(s).toContain('role="img"')
      expect(s).toContain(`aria-label="${JERSEY_LABEL[kind]}"`)
      expect(s).toContain(`<title>${JERSEY_LABEL[kind]}</title>`)
      expect(s).toContain(`<path d="${TORSO}" fill="${LEADER_JERSEY[kind].base}"`)
      expect(s).toContain('width="28" height="28"')
    }
  })

  it('el amarillo, liso; el verde, la banda blanca de la región de band (de y 23 a 33), recortada por el torso', () => {
    const gc = renderToStaticMarkup(<LeaderJersey kind="gc" size={28} />)
    expect(gc.split('<path').length - 1).toBe(2) // el cuerpo y el filete
    expect(gc).not.toContain('<circle')
    const points = renderToStaticMarkup(<LeaderJersey kind="points" size={28} />)
    expect(KIT_FIGURE_PATHS.band).toBe('M0 23H48V33H0Z')
    expect(points).toMatch(
      new RegExp(`<path d="${KIT_FIGURE_PATHS.band}" fill="#ffffff" clip-path="url\\(#[^)]+\\)"`),
    )
  })

  it('el azul, cinco lunares blancos de radio 4 en los centros de hoy', () => {
    const kom = renderToStaticMarkup(<LeaderJersey kind="kom" size={28} />)
    const lunares = [
      ...kom.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="([^"]+)"/g),
    ]
    expect(lunares.map((m) => [Number(m[1]), Number(m[2])])).toEqual(LEADER_DOTS.map((d) => [...d]))
    expect(new Set(lunares.map((m) => `${m[3]} ${m[4]}`))).toEqual(new Set(['4 #ffffff']))
  })

  it('el filete fuerte de 1,5 u, sin color propio, sigue al tema (kit-edge-strong); surface lo fuerza; sin cuello', () => {
    const tema = renderToStaticMarkup(<LeaderJersey kind="gc" size={28} />)
    // sin clases (D-10): sin `surface`, el trazo no lleva `stroke`
    expect(/fill="none" stroke-width="1.5"([^>]*)>/.exec(tema)?.[1]).not.toContain('stroke=')
    expect(renderToStaticMarkup(<LeaderJersey kind="gc" size={28} surface="light" />)).toContain(
      'stroke="rgb(0 0 0 / 0.35)"',
    )
    expect(renderToStaticMarkup(<LeaderJersey kind="gc" size={28} surface="dark" />)).toContain(
      'stroke="rgb(255 255 255 / 0.6)"',
    )
    expect(tema).not.toContain('fill-opacity="0.85"')
  })

  it('a ningún tamaño por debajo de 28', () => {
    // @ts-expect-error 14 no es un KitSize (D-00b)
    renderToStaticMarkup(<LeaderJersey kind="gc" size={14} />)
    expect(renderToStaticMarkup(<LeaderJersey kind="kom" size={96} />)).toContain(
      'width="96" height="96"',
    )
  })
})
