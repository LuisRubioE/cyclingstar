import { renderAltimetrySvg, TEST_TOUR } from '@cyclingstar/engine'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { bannerLabels, DEFAULT_WIDTH_PX, markerLabels, parseAltimetry } from '../domain/altimetry'
import { Altimetry } from './Altimetry'

/**
 * LA ALTIMETRÍA CON EL SISTEMA (E3, paso 24a): el dibujo del motor, vuelto a pintar con tokens, que cambian
 * con el modo, y sin `<text>` dentro, porque uno de su `viewBox` de 720 se pinta a unos 4 px en un teléfono
 * (14-h); las etiquetas, en `caption` en una capa encima sin `viewBox`, donde la letra se pinta a su tamaño,
 * las que `bannerLabels` y `markerLabels` colocan; y su nombre, el de la página. Sin la cadena del motor
 * dentro: nada de `dangerouslySetInnerHTML`.
 */

const reina = TEST_TOUR.find((s) => s.kind === 'reina')!.profile
const conMarcas = renderAltimetrySvg(reina, {
  markers: [
    { km: 30, label: 'attack' },
    { km: 90, label: 'caught' },
  ],
})
const pinta = (svg: string, extra: Partial<Parameters<typeof Altimetry>[0]> = {}) =>
  renderToStaticMarkup(
    <Altimetry svg={svg} label="Elevation profile of Stage 5, 180 km" {...extra} />,
  )
const svgs = (markup: string) => [...markup.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((m) => m[0])
const textos = (markup: string) =>
  [...markup.matchAll(/<text[^>]*data-label="(\w+)"[^>]*>([^<]*)<\/text>/g)].map((m) => [
    m[1],
    m[2],
  ])

describe('Altimetry (paso 24a)', () => {
  it('una imagen con el nombre de la página', () => {
    const markup = pinta(conMarcas)
    expect(markup).toMatch(
      /^<figure[^>]*role="img"[^>]*aria-label="Elevation profile of Stage 5, 180 km"/,
    )
    expect(markup).not.toContain('Altimetría')
  })

  it('el dibujo, sin <text> ni colores fijos: todo con tokens, que el modo oscuro redefine', () => {
    const markup = pinta(conMarcas)
    const [dibujo, capa] = svgs(markup)
    expect(dibujo).toMatch(/viewBox="0 0 720 200"/)
    expect(dibujo).not.toContain('<text')
    expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(markup).not.toMatch(/\b(?:fill|stroke)="(?!none")/)
    expect(markup).not.toContain('font-size')
    expect(dibujo).toContain('class="fill-line"')
    expect(dibujo).toMatch(/<polyline[^>]*class="stroke-accent"/)
    expect(dibujo).toMatch(/<line[^>]*data-banner="climb"[^>]*class="stroke-gold-ink"/)
    expect(capa).not.toContain('viewBox')
  })

  it('las líneas no engordan ni adelgazan con el ancho: su trazo, en px de pantalla', () => {
    const [dibujo] = svgs(pinta(conMarcas))
    const lineas = [...(dibujo ?? '').matchAll(/<(?:line|polyline)\b[^>]*>/g)].map((m) => m[0])
    expect(lineas.length).toBeGreaterThan(1)
    for (const l of lineas) expect(l).toContain('vector-effect="non-scaling-stroke"')
  })

  it('las etiquetas, en la capa, a 12 px: las que colocan bannerLabels y markerLabels al ancho de un teléfono', () => {
    const markup = pinta(conMarcas)
    const d = parseAltimetry(conMarcas)!
    const esperadas = [
      ...bannerLabels(d, DEFAULT_WIDTH_PX).map((l) => [
        /^(?:Sprint|S)$/.test(l.text) ? 'sprint' : 'climb',
        l.text,
      ]),
      ...markerLabels(d, DEFAULT_WIDTH_PX).map((l) => [
        l.key === 'total' ? 'total' : 'marker',
        l.text,
      ]),
    ]
    expect(esperadas.length).toBeGreaterThan(3)
    expect(textos(markup)).toEqual(esperadas)
    for (const t of markup.match(/<text[^>]*>/g) ?? []) expect(t).toContain('text-caption')
    // las de los banners, en lo alto de su línea (24 de 200); las de abajo, bajo el dibujo
    // y sus renglones en em, que crecen con la letra: arriba, 6 px sobre la línea y 14 más; abajo, 13 bajo el dibujo
    for (const t of markup.match(/<text[^>]*data-label="(?:climb|sprint)"[^>]*>/g) ?? []) {
      expect(t).toContain('y="12.00%"')
      expect(t).toMatch(/dy="-(?:0\.500|1\.667)em"/)
    }
    for (const t of markup.match(/<text[^>]*data-label="(?:marker|total)"[^>]*>/g) ?? []) {
      expect(t).toContain('y="100%"')
      expect(t).toMatch(/dy="(?:1\.083|2\.250)em"/)
    }
  })

  it('cada etiqueta con su tinta: los puertos en gold-ink, las volantes en ink-2, las marcas en ink y el total en ink-3', () => {
    const markup = pinta(conMarcas)
    const tinta = (kind: string) =>
      new RegExp(`<text[^>]*data-label="${kind}"[^>]*class="([^"]*)"`).exec(markup)?.[1] ?? ''
    expect(tinta('climb')).toContain('fill-gold-ink')
    expect(tinta('marker')).toContain('fill-ink')
    expect(tinta('total')).toContain('fill-ink-3')
    const volante = renderAltimetrySvg({
      segments: [{ km: 100, tipo: 'llano' }],
      banners: [{ km: 50, tipo: 'meta_volante' }],
    })
    expect(
      new RegExp('<text[^>]*data-label="sprint"[^>]*class="([^"]*)"').exec(pinta(volante))?.[1],
    ).toContain('fill-ink-2')
  })

  it('los puntos de las marcas, en la capa, de un tamaño fijo en pantalla', () => {
    const capa = svgs(pinta(conMarcas))[1] ?? ''
    const puntos = [...capa.matchAll(/<circle[^>]*>/g)].map((m) => m[0])
    expect(puntos).toHaveLength(2)
    for (const p of puntos) {
      expect(p).toMatch(/cx="[\d.]+%"/)
      expect(p).toContain('class="fill-ink"')
    }
  })

  it('sin marcas, solo el total abajo; con ellas, sitio para dos renglones', () => {
    const sin = pinta(renderAltimetrySvg(reina))
    expect(textos(sin).filter(([k]) => k === 'marker')).toEqual([])
    expect(sin).toMatch(/^<figure class="pt-6 pb-4" role="img"/)
    expect(pinta(conMarcas)).toMatch(/^<figure class="pt-6 pb-8" role="img"/)
  })

  it('una cota menor, en line-strong y sin etiqueta', () => {
    const menor = renderAltimetrySvg({
      segments: [
        { km: 40, tipo: 'llano' },
        { km: 2, tipo: 'puerto', tramos: [{ km: 2, g: 2 }] },
        { km: 40, tipo: 'llano' },
      ],
      banners: [{ km: 42, tipo: 'cima' }],
    })
    const markup = pinta(menor)
    expect(markup).toMatch(/<line[^>]*data-banner="minor"[^>]*class="stroke-line-strong"/)
    expect(textos(markup).filter(([k]) => k === 'climb')).toEqual([])
  })

  it('lo que no se puede leer da su respaldo, o nada', () => {
    expect(pinta('<svg/>')).toBe('')
    expect(pinta('', { fallback: <p>No profile available for this stage.</p> })).toBe(
      '<p>No profile available for this stage.</p>',
    )
  })

  it('con su clase de fuera, en la figura, y después el sitio de sus etiquetas', () => {
    expect(pinta(conMarcas, { className: 'mt-2' })).toMatch(/^<figure class="mt-2 pt-6 pb-8"/)
  })
})
