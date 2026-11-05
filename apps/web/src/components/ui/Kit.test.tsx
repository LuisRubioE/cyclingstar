import {
  COLLAR,
  KIT_COLORS,
  KIT_FIGURE_PATHS,
  KIT_PX,
  type KitCode,
  type KitSize,
  SPONSOR_ZONES,
  TORSO,
} from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Kit, type KitProps } from './Kit'
import { KIT_INK, KIT_WHITE, type TextMeasure, TextMeasureContext, textU } from './kitText'

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

  it('el filete es de 1 u y sin color propio, que le pone el tema (el token kit-edge); surface lo fuerza', () => {
    // sin clases (D-10): sin `surface`, el trazo del filete no lleva `stroke`; con ella, el valor del token
    const filete = (s: string) =>
      /<path d="[^"]+" fill="none" stroke-width="1"([^>]*)>/.exec(s)?.[1]
    expect(filete(html('plain.green'))).not.toContain('stroke=')
    expect(filete(html('plain.green', 28, 'light'))).toContain('stroke="rgb(0 0 0 / 0.3)"')
    expect(filete(html('plain.green', 28, 'dark'))).toContain('stroke="rgb(255 255 255 / 0.6)"')
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

/** Letras de 0,6 em: `Voltra Energy` mide 94 px a 12 px, y `VE`, 14. */
const estrecha: TextMeasure = (text, _w, px) => text.length * 0.6 * px
const VOLTRA = { name: 'Voltra Energy', mark: 'VE', color: KIT_COLORS.blue }
const conMedida = (props: KitProps, medida: TextMeasure = estrecha) =>
  renderToStaticMarkup(
    <TextMeasureContext value={medida}>
      <Kit {...props} />
    </TextMeasureContext>,
  )

describe('Kit: el pecho y las zonas del patrocinador (E3, §8.10 y §9.9; PR 17c)', () => {
  it('de 28 a 96, solo por delante; por debajo de 72, el pecho no pinta nada y su nombre va en aria-label', () => {
    for (const size of [28, 40, 48] as const) {
      const s = conMedida({
        code: 'hoops.navy.yellow',
        teamName: 'Noord',
        size,
        sponsors: { chest: VOLTRA },
      })
      expect(s).toContain('data-view="front"')
      expect(s).not.toContain('<text')
      expect(s).not.toContain('data-zone')
      expect(s).toContain('aria-label="Noord kit, Voltra Energy on the chest"')
      expect(s).toContain('<title>Noord kit, Voltra Energy on the chest</title>')
    }
  })

  it('desde 72, el pecho de un color bajo la marca, centrada en (24, 28), a 12 px y 600', () => {
    const s = conMedida({
      code: 'hoops.navy.yellow',
      teamName: 'Noord',
      size: 72,
      sponsors: { chest: VOLTRA },
    })
    // los aros pisan el pecho: la banda de y 23 a 33 vuelve a la base, recortada por el torso
    expect(s).toMatch(/<path d="M0 23H48V33H0Z" fill="#172a5b" clip-path="url\(#[^)]+\)"/)
    expect(s).toContain(
      `<text data-zone="chest" x="24" y="28" text-anchor="middle" dominant-baseline="central" font-size="${textU(72)}" font-weight="600" fill="${KIT_WHITE}">VE</text>`,
    )
    // en `band`, la banda es su segundo color, y la marca va en la tinta que más contrasta con él
    const banda = conMedida({
      code: 'band.navy.yellow',
      teamName: 'Noord',
      size: 96,
      sponsors: { chest: VOLTRA },
    })
    expect(banda).not.toContain('d="M0 23H48V33H0Z" fill="#172a5b"')
    expect(banda).toContain(`fill="${KIT_INK}">VE</text>`)
    // la letra, a 12 px de pantalla: 8 u a 72 y 6 u a 96
    expect(textU(72)).toBe(8)
    expect(textU(96)).toBe(6)
  })

  it('en grande, cada zona en su caja: el nombre si cabe, en vertical en las mangas', () => {
    const s = conMedida({
      code: 'plain.red',
      teamName: 'Noord',
      size: 320,
      sponsors: { chest: VOLTRA, sleeves: VOLTRA },
    })
    expect(s).toContain('data-zone="chest" x="24" y="28"')
    expect(s).toContain('>Voltra Energy</text>')
    const mangas = [
      ...s.matchAll(
        /<text data-zone="sleeves" x="([\d.]+)" y="([\d.]+)"[^>]*transform="rotate\(-90 ([\d.]+) ([\d.]+)\)"[^>]*>VE<\/text>/g,
      ),
    ]
    expect(mangas).toHaveLength(2)
    for (const [m, box] of mangas.map((m, i) => [m, SPONSOR_ZONES.sleeves.boxes[i]!] as const)) {
      expect(Number(m[1])).toBe(box.x + box.w / 2)
      expect(Number(m[2])).toBe(box.y + box.h / 2)
    }
  })

  it('sin texto que quepa, en grande la caja llena del color de su ficha; en pequeño, nada', () => {
    const ancha: TextMeasure = () => 10_000
    const grande = conMedida(
      { code: 'plain.red', teamName: 'Noord', size: 160, sponsors: { chest: VOLTRA } },
      ancha,
    )
    expect(grande).toContain(
      `<rect data-zone="chest" x="14" y="23" width="20" height="10" fill="${KIT_COLORS.blue}"`,
    )
    const pequeno = conMedida(
      { code: 'plain.red', teamName: 'Noord', size: 96, sponsors: { chest: VOLTRA } },
      ancha,
    )
    expect(pequeno).not.toContain('data-zone')
  })
})
