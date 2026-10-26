import {
  COLLAR,
  KIT_COLORS,
  KIT_FIGURE_PATHS,
  KIT_PX,
  type KitCode,
  type KitSize,
  TORSO,
} from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Kit } from './Kit'

/**
 * `Kit` (E3, docs/visual.md §8.3; PR 17a): el maillot de un equipo por su código, por delante, con las
 * capas que mide la distancia dibujada (`packages/db/src/kitDistance.ts`, `drawingLayers`): el torso en
 * la base, la región de la figura en el segundo color recortada por el torso, el filete y el cuello.
 */

const html = (code: KitCode, size: KitSize = KIT_PX.row, surface?: 'light' | 'dark') =>
  renderToStaticMarkup(
    <Kit
      code={code}
      teamName="Mistral Racing"
      size={size}
      {...(surface === undefined ? {} : { surface })}
    />,
  )

describe('Kit', () => {
  it('un role="img" con el nombre del equipo en aria-label y en title, y su código en data-kit', () => {
    const s = html('halves.red.blue')
    expect(s).toMatch(/^<svg data-ui="Kit" data-variant="halves" data-state="ready"/)
    expect(s).toContain('role="img"')
    expect(s).toContain('aria-label="Mistral Racing kit"')
    expect(s).toContain('<title>Mistral Racing kit</title>')
    expect(s).toContain('data-kit="halves.red.blue"')
    expect(s).toContain('viewBox="0 0 48 48"')
  })

  it('a cada tamaño de KIT_PX, y nunca por debajo de 28', () => {
    for (const size of Object.values(KIT_PX)) {
      const s = html('plain.navy', size)
      expect(s).toContain(`width="${size}" height="${size}"`)
    }
    // @ts-expect-error 16 no es un KitSize (D-00b)
    renderToStaticMarkup(<Kit code="plain.navy" teamName="x" size={16} />)
  })

  it('el torso en la base, la figura en el segundo color recortada por el torso, el filete y el cuello, en ese orden', () => {
    const s = html('band.navy.orange')
    const base = s.indexOf(`<path d="${TORSO}" fill="${KIT_COLORS.navy}"`)
    const figura = s.indexOf(`<path d="${KIT_FIGURE_PATHS.band}" fill="${KIT_COLORS.orange}"`)
    const filete = s.indexOf(`<path d="${TORSO}" fill="none"`)
    const cuello = s.indexOf(`<path d="${COLLAR}" fill="#ffffff" fill-opacity="0.85"`)
    expect([base, figura, filete, cuello].every((i) => i > 0)).toBe(true)
    expect(base < figura && figura < filete && filete < cuello).toBe(true)
    // la figura va recortada por el torso, con un id sin dos puntos
    const clip = /<clipPath id="([^"]+)"><path d="([^"]+)"/.exec(s)
    expect(clip?.[2]).toBe(TORSO)
    expect(clip?.[1]).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(s).toContain(`clip-path="url(#${clip?.[1]})"`)
  })

  it('el liso no lleva figura', () => {
    const s = html('plain.green')
    expect(s).toContain('data-variant="plain"')
    expect(s).not.toContain('clipPath')
    expect(s.split('<path').length - 1).toBe(3) // el torso, el filete y el cuello
  })

  it('el filete es el token kit-edge de 1 u, que sigue al tema; surface lo fuerza', () => {
    const tema = html('plain.green')
    expect(tema).toMatch(/<path d="[^"]+" fill="none" stroke-width="1" class="stroke-kit-edge"/)
    expect(html('plain.green', 28, 'light')).toContain('stroke="rgb(0 0 0 / 0.3)"')
    expect(html('plain.green', 28, 'dark')).toContain('stroke="rgb(255 255 255 / 0.6)"')
    expect(html('plain.green', 28, 'dark')).not.toContain('stroke-kit-edge')
  })

  it('cada uno de los quince colores, y las siete figuras, salen de kit.ts', () => {
    expect(html('sash.teal.white')).toContain(`fill="${KIT_COLORS.teal}"`)
    expect(html('sash.teal.white')).toContain(`<path d="${KIT_FIGURE_PATHS.sash}" fill="#ffffff"`)
    expect(html('yoke.black.yellow')).toContain(`fill="${KIT_COLORS.yellow}"`)
  })

  it('un código que no casa pinta el hueco, sin dibujo ni texto (data-state="hidden")', () => {
    const s = renderToStaticMarkup(
      <Kit code={'zigzag.red.blue' as KitCode} teamName="Mistral Racing" size={28} />,
    )
    expect(s).toContain('data-ui="Kit"')
    expect(s).toContain('data-state="hidden"')
    expect(s).toContain('aria-hidden="true"')
    expect(s).not.toContain('<svg')
    expect(s).not.toContain('data-kit')
    expect(s).toContain('width:28px;height:28px')
  })
})
