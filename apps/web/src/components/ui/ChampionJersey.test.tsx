import {
  CHAMPION_RAINBOW,
  CHAMPION_SILVER,
  CHAMPION_STAR_EDGE,
  type ChampionTitle,
  KIT_PX,
  type KitSize,
  LOGO_STAR,
  TORSO,
  WORLD_STAR,
  starTransform,
} from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ChampionJersey } from './ChampionJersey'
import { FLAG_INK } from './flagInk.generated'
import { FLAG_CELLS } from './flagSprite.generated'
import { loadFlagSvg } from './flagSvg'

/**
 * `ChampionJersey` (E3, docs/visual.md §9.1 y §9.5; PR 17a; §16.2): el nacional, su bandera sin estrella
 * y sus dos letras solo desde 72 px; el mundial, su estrella en arcoíris sin letras; el continental, la
 * estrella en plata; con las capas que mide la distancia dibujada y `data-kit` en cada `<svg>`.
 */

const title = (over: Partial<ChampionTitle> = {}): ChampionTitle => ({
  scope: 'national',
  country: 'ES',
  discipline: 'road',
  category: 'elite',
  season: 0,
  validFromDay: 179,
  validToDay: 543,
  source: { raceKey: 'nc-es-road:s0', stageDay: 1 },
  provisional: true,
  ...over,
})
const WORLD = title({ scope: 'world', country: null })
const html = (t: ChampionTitle, size: KitSize = KIT_PX.row, surface?: 'light' | 'dark') =>
  renderToStaticMarkup(
    <ChampionJersey title={t} size={size} {...(surface === undefined ? {} : { surface })} />,
  )

describe('ChampionJersey', () => {
  it('un role="img" con el texto de su título, su alcance en data-variant y data-kit', () => {
    const s = html(title())
    expect(s).toMatch(/^<svg data-ui="ChampionJersey" data-variant="national" data-state="ready"/)
    expect(s).toContain('data-kit="champion-national"')
    expect(s).toContain('aria-label="Champion of Spain"')
    expect(s).toContain('<title>Champion of Spain</title>')
    expect(html(WORLD)).toContain('aria-label="World champion"')
    expect(html(title({ scope: 'continental', country: null }))).toContain(
      'aria-label="Continental champion"',
    )
    // ruta y crono, élite y sub-23 comparten el dibujo, y los separa el texto
    expect(html(title({ country: 'IT', discipline: 'itt' }))).toContain(
      'aria-label="Time trial champion of Italy"',
    )
    expect(html(title({ country: 'IT', category: 'u23' }))).toContain(
      'aria-label="U23 champion of Italy"',
    )
  })

  it('el mundial: el cuerpo blanco y la estrella en arcoíris en diagonal, con su filo navy-dark de 1,5 u', () => {
    const s = html(WORLD)
    expect(s).toContain(`<path d="${TORSO}" fill="#ffffff"`)
    const grad =
      /<linearGradient id="([^"]+)" x1="0" y1="0" x2="1" y2="1">(.*?)<\/linearGradient>/.exec(s)
    expect(grad).not.toBeNull()
    const stops = [...(grad?.[2] ?? '').matchAll(/<stop offset="([\d.]+)" stop-color="([^"]+)"/g)]
    expect(stops.map((m) => [Number(m[1]), m[2]])).toEqual(
      CHAMPION_RAINBOW.map((c, i) => [i / 5, c]),
    )
    const estrella = new RegExp(
      `<path d="${LOGO_STAR}" transform="${starTransform(18, 24, 28.5).replace(/[()]/g, '\\$&')}" fill="url\\(#${grad?.[1]}\\)" stroke="${CHAMPION_STAR_EDGE}" stroke-width="([\\d.]+)" stroke-linejoin="round"`,
    )
    const m = estrella.exec(s)
    expect(m).not.toBeNull()
    // 1,5 u en el maillot: en las u de la estrella, que va a 18/22
    expect(Number(m?.[1]) * (WORLD_STAR.widthU / 22)).toBeCloseTo(1.5, 10)
  })

  it('el continental, la misma estrella en plata y sin degradado', () => {
    const s = html(title({ scope: 'continental', country: null }))
    expect(s).toContain(`fill="${CHAMPION_SILVER}"`)
    expect(s).not.toContain('linearGradient')
    expect(s).toContain(`d="${LOGO_STAR}"`)
  })

  it('el nacional: su bandera recortada por el torso, de la celda entera del sprite, sin estrella', () => {
    const s = html(title())
    expect(s).not.toContain(LOGO_STAR)
    const [col, row] = FLAG_CELLS.ES!
    expect(s).toContain(
      `<svg x="1.3333333333333333" y="8" width="45.333333333333336" height="34" viewBox="${col * 64 + 2} ${row * 48 + 2} 60 44" preserveAspectRatio="none">`,
    )
    expect(s).toMatch(/<g clip-path="url\(#[^)]+-torso\)" data-flag="sprite">/)
    expect(s).toContain('<image href="')
  })

  it('las dos letras del país solo desde 72 px, en blanco o en navy-dark según su campo, con el filo del otro', () => {
    for (const size of [28, 40, 48] as const) expect(html(title(), size)).not.toContain('<text')
    expect(FLAG_INK.ES).toBe('white')
    expect(html(title(), 72)).toMatch(
      /<text x="24" y="38.5" text-anchor="middle" font-size="8" font-weight="700" letter-spacing="0.04em" fill="#ffffff" stroke="#0b2740" stroke-width="2" stroke-linejoin="round" paint-order="stroke">ES<\/text>/,
    )
    expect(FLAG_INK.AD).toBe('navy-dark')
    expect(html(title({ country: 'AD' }), 96)).toContain(
      'fill="#0b2740" stroke="#ffffff" stroke-width="2"',
    )
    // el mundial no lleva letras: es el campeón del mundo, no de un país (D-00f)
    for (const size of [28, 72, 96] as const) expect(html(WORLD, size)).not.toContain('<text')
  })

  it('desde 72 px, el SVG de su bandera cuando ha llegado; por debajo, siempre la celda', async () => {
    expect(html(title(), 72)).toContain('data-flag="sprite"')
    const url = await loadFlagSvg('ES')
    expect(url).toMatch(/es\.svg/)
    const grande = html(title(), 72)
    expect(grande).toContain('data-flag="svg"')
    expect(grande).toContain(
      `<image href="${url}" x="1.3333333333333333" y="8" width="45.333333333333336" height="34" preserveAspectRatio="xMidYMid slice">`,
    )
    expect(html(title(), 48)).toContain('data-flag="sprite"')
    expect(await loadFlagSvg('ZZ')).toBeNull()
  })

  it('el filete fuerte, sin color propio, sigue al tema; surface lo fuerza', () => {
    // sin clases (D-10): sin `surface`, el trazo del filete no lleva `stroke`
    expect(/fill="none" stroke-width="1.5"([^>]*)>/.exec(html(title()))?.[1]).not.toContain(
      'stroke=',
    )
    expect(html(title(), 28, 'dark')).toContain('stroke="rgb(255 255 255 / 0.6)"')
    expect(html(WORLD, 28, 'light')).toContain('stroke="rgb(0 0 0 / 0.35)"')
  })
})
