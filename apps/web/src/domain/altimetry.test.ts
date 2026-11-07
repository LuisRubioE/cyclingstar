import {
  type AltimetryMarker,
  elevationProfile,
  renderAltimetrySvg,
  SEASON_CALENDAR,
  TEST_TOUR,
} from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import {
  type AltimetryDrawing,
  bannerLabels,
  DEFAULT_WIDTH_PX,
  LABEL_GAP_PX,
  type LabelItem,
  labelWidthPx,
  markerLabels,
  type PlacedLabel,
  parseAltimetry,
  placeLabels,
  shortBannerLabel,
} from './altimetry'

/**
 * LA ALTIMETRÍA EN EL TELÉFONO Y EN EL OSCURO (E3, paso 24a). El motor la manda como un SVG de 720 × 200 con
 * sus colores y su letra dentro, que a 360 se pinta a unos 4 px y en el oscuro no cambia de color. La web la
 * LEE y la vuelve a pintar con el sistema: estas pruebas generan altimetrías de verdad con el motor (un test
 * puede importarlo; una fuente no, `noEngine.test.ts`), así que si el motor cambia su forma, la web lo sabe.
 */

const todas = () =>
  SEASON_CALENDAR.flatMap((race) => race.stages.map((stage) => ({ race: race.id, stage })))

const leida = (svg: string): AltimetryDrawing => {
  const d = parseAltimetry(svg)
  if (d === null) throw new Error(`sin leer: ${svg.slice(0, 80)}`)
  return d
}

/** Lo que ocupa una etiqueta colocada, en px, a un ancho dado. */
function extension(l: PlacedLabel, widthPx: number): readonly [number, number] {
  const x = (l.xPct / 100) * widthPx
  const w = labelWidthPx(l.text)
  if (l.anchor === 'start') return [x, x + w]
  if (l.anchor === 'end') return [x - w, x]
  return [x - w / 2, x + w / 2]
}

/** Ninguna pareja del mismo renglón se pisa (con su hueco), y ninguna se sale del dibujo. */
function sinPisarse(labels: readonly PlacedLabel[], widthPx: number): void {
  for (const l of labels) {
    const [a, b] = extension(l, widthPx)
    expect(a).toBeGreaterThanOrEqual(-0.01)
    expect(b).toBeLessThanOrEqual(widthPx + 0.01)
  }
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) {
      const p = labels[i]!
      const q = labels[j]!
      if (p.row !== q.row) continue
      const [a, b] = extension(p, widthPx)
      const [c, d] = extension(q, widthPx)
      expect(b + LABEL_GAP_PX <= c || d + LABEL_GAP_PX <= a).toBe(true)
    }
}

describe('parseAltimetry: lee la altimetría del motor', () => {
  it('cada etapa de la temporada: el dibujo, una línea por banner con su etiqueta, y el total', () => {
    let etapas = 0
    for (const { stage } of todas()) {
      const svg = renderAltimetrySvg(stage.profile)
      const d = leida(svg)
      expect([d.width, d.height]).toEqual([720, 200])
      expect(d.area.split(' ').length).toBeGreaterThan(3)
      expect(d.curve.split(' ').length).toBeGreaterThan(1)
      expect(d.banners).toHaveLength((stage.profile.banners ?? []).length)
      // tantas etiquetas como textos de banner pinta el motor, y cada una con su clase
      const textos = (svg.match(/<text[^>]*fill="#(?:dc2626|16a34a)"/g) ?? []).length
      expect(d.banners.filter((b) => b.label !== null)).toHaveLength(textos)
      for (const b of d.banners) {
        if (b.kind === 'sprint') expect(b.label).toBe('Sprint')
        if (b.kind === 'climb') expect(b.label).toMatch(/^(?:Cat [1-4]|HC)$/)
        if (b.kind === 'minor') expect(b.label).toBeNull()
        expect(b.x).toBeGreaterThanOrEqual(24)
        expect(b.x).toBeLessThanOrEqual(696)
      }
      // el total es el último km del relieve que dibuja (suma tramo a tramo), no `stageLengthKm`: en 28 etapas,
      // con medio km, la coma flotante los redondea a lados distintos
      expect(d.total).toBe(`${Math.round(elevationProfile(stage.profile).at(-1)!.km)} km`)
      expect(d.markers).toEqual([])
      etapas++
    }
    expect(etapas).toBeGreaterThan(1000)
  })

  it('las cimas sin categoría se leen como menores, y las volantes como volantes', () => {
    const kinds = new Set(
      todas().flatMap(({ stage }) =>
        leida(renderAltimetrySvg(stage.profile)).banners.map((b) => b.kind),
      ),
    )
    expect([...kinds].sort()).toEqual(['climb', 'minor', 'sprint'])
  })

  it('las marcas del replay, en su orden, con su palabra y sobre la curva', () => {
    const profile = TEST_TOUR[0]!.profile
    const markers: AltimetryMarker[] = [
      { km: 10, label: 'attack' },
      { km: 60, label: 'break' },
      { km: 120, label: 'finish' },
    ]
    const d = leida(renderAltimetrySvg(profile, { markers }))
    expect(d.markers.map((m) => m.label)).toEqual(['attack', 'break', 'finish'])
    expect(d.markers[0]!.x).toBeLessThan(d.markers[1]!.x)
    for (const m of d.markers) {
      expect(m.y).toBeGreaterThanOrEqual(24)
      expect(m.y).toBeLessThanOrEqual(176)
    }
  })

  it('con título (la API no lo manda), el título no se lee como etiqueta de nada', () => {
    const stage = TEST_TOUR.find((s) => s.kind === 'reina')!
    const con = leida(renderAltimetrySvg(stage.profile, { title: stage.name }))
    const sin = leida(renderAltimetrySvg(stage.profile))
    expect(con).toEqual(sin)
  })

  it('una etiqueta va con la línea o el punto que sigue, si es de su mismo x; si no, no es de nadie', () => {
    const caja =
      '<svg viewBox="0 0 720 200"><polygon points="0,0 1,1"/><polyline points="0,0 1,1"/>'
    const d = leida(
      `${caja}<line x1="100" y1="24" x2="100" y2="176"/><text x="200">Cat 4</text>` +
        `<circle cx="300" cy="90" r="3"/><text x="300">attack</text><text x="300">break</text></svg>`,
    )
    expect(d.banners).toEqual([{ x: 100, top: 24, bottom: 176, kind: 'minor', label: null }])
    expect(d.markers).toEqual([{ x: 300, y: 90, label: 'attack' }])
    expect(d.total).toBeNull()
    // el título del motor (con su font-weight), tras una cota menor en el x 24, no es su etiqueta
    const titulo = leida(
      `${caja}<line x1="24.0" y1="24" x2="24.0" y2="176"/><text x="24" font-weight="600">Stage 1</text></svg>`,
    )
    expect(titulo.banners).toEqual([{ x: 24, top: 24, bottom: 176, kind: 'minor', label: null }])
  })

  it('sin el área o sin la curva, tampoco es una altimetría', () => {
    const caja = '<svg viewBox="0 0 720 200">'
    expect(parseAltimetry(`${caja}<polyline points="0,0 1,1"/></svg>`)).toBeNull()
    expect(parseAltimetry(`${caja}<polygon points="0,0 1,1"/></svg>`)).toBeNull()
  })

  it('lo que no es una altimetría da null', () => {
    for (const s of [
      '',
      '<svg/>',
      '<svg viewBox="0 0 720 200"></svg>',
      'hola',
      '<polyline points="1,2 3,4"/>',
    ])
      expect(parseAltimetry(s)).toBeNull()
  })
})

describe('shortBannerLabel: la forma corta, la del perfil de Watch', () => {
  it('Cat N da N; HC se queda; Sprint da S', () => {
    expect(['Cat 1', 'Cat 2', 'Cat 3', 'Cat 4', 'HC', 'Sprint'].map(shortBannerLabel)).toEqual([
      '1',
      '2',
      '3',
      '4',
      'HC',
      'S',
    ])
  })
})

describe('placeLabels: dos renglones, sin pisarse, por prioridad', () => {
  const item = (key: string, xPct: number, text: string, priority = 0): LabelItem => ({
    key,
    xPct,
    text,
    priority,
  })

  it('lejos, las dos en el primer renglón y centradas en su sitio', () => {
    const placed = placeLabels([item('a', 30, 'HC'), item('b', 70, 'HC')], 300)
    expect(placed.map((l) => [l.key, l.row, l.anchor])).toEqual([
      ['a', 0, 'middle'],
      ['b', 0, 'middle'],
    ])
  })

  it('juntas, la segunda sube al segundo renglón; una tercera que no cabe se queda sin etiqueta', () => {
    const placed = placeLabels(
      [item('a', 50, 'Cat 4'), item('b', 52, 'Cat 4'), item('c', 54, 'Cat 4')],
      300,
    )
    expect(placed.map((l) => [l.key, l.row])).toEqual([
      ['a', 0],
      ['b', 1],
    ])
  })

  it('si no caben, se queda la de más prioridad (la de número más bajo), aunque llegue después', () => {
    const placed = placeLabels(
      [item('a', 50, 'Cat 4', 4), item('b', 51, 'Cat 4', 4), item('c', 52, 'HC', 0)],
      300,
    )
    expect(placed.map((l) => l.key).sort()).toEqual(['a', 'c'])
    expect(placed.find((l) => l.key === 'c')?.row).toBe(0)
  })

  it('en los bordes, arrimadas hacia dentro para no salirse', () => {
    const placed = placeLabels([item('a', 1, 'Sprint'), item('b', 99, 'Sprint')], 300)
    expect(placed.map((l) => l.anchor)).toEqual(['start', 'end'])
    sinPisarse(placed, 300)
  })

  it('las fijas ocupan su sitio antes que nadie', () => {
    const fija: PlacedLabel = { ...item('t', 96, '199 km'), row: 0, anchor: 'end' }
    const placed = placeLabels([item('a', 95, 'attack')], 300, [fija])
    expect(placed).toEqual([{ ...item('a', 95, 'attack'), row: 1, anchor: 'end' }])
  })

  it('devuelve las colocadas en su orden de entrada, no en el de prioridad', () => {
    const placed = placeLabels([item('a', 20, 'Cat 4', 4), item('b', 80, 'HC', 0)], 300)
    expect(placed.map((l) => l.key)).toEqual(['a', 'b'])
  })
})

describe('bannerLabels y markerLabels: lo que se pinta de cada altimetría', () => {
  const reina = leida(renderAltimetrySvg(TEST_TOUR.find((s) => s.kind === 'reina')!.profile))

  it('a todo lo ancho, la forma larga; en un teléfono, si no caben todas, la corta en todas', () => {
    const anchas = bannerLabels(reina, 700)
    expect(anchas.length).toBe(reina.banners.filter((b) => b.label !== null).length)
    expect(anchas.every((l) => /^(?:Cat [1-4]|HC|Sprint)$/.test(l.text))).toBe(true)
    // la de más etiquetas de la temporada, en un teléfono: la forma larga no cabe, así que la corta en todas
    const conEtiqueta = (d: AltimetryDrawing) => d.banners.filter((b) => b.label !== null).length
    const llena = todas()
      .map(({ stage }) => leida(renderAltimetrySvg(stage.profile)))
      .reduce((a, b) => (conEtiqueta(b) > conEtiqueta(a) ? b : a))
    expect(conEtiqueta(llena)).toBeGreaterThan(12)
    const estrechas = bannerLabels(llena, DEFAULT_WIDTH_PX)
    expect(estrechas.length).toBeGreaterThan(0)
    expect(estrechas.every((l) => /^(?:[1-4]|HC|S)$/.test(l.text))).toBe(true)
    expect(estrechas.length).toBeLessThanOrEqual(conEtiqueta(llena))
  })

  it('ninguna etapa de la temporada, a 240, 288, 320 ni 700 px, tiene dos etiquetas que se pisen', () => {
    for (const { stage } of todas()) {
      // las marcas de un replay (`buildMarkers`): el paso por cada banner, el ataque, la fuga, la caza y la meta
      const total = elevationProfile(stage.profile).at(-1)!.km
      const markers: AltimetryMarker[] = [
        ...(stage.profile.banners ?? []).map((b) => ({ km: b.km, label: 'banner' })),
        { km: total * 0.2, label: 'attack' },
        { km: total * 0.3, label: 'break' },
        { km: total * 0.7, label: 'caught' },
        { km: total, label: 'finish' },
      ].sort((a, b) => a.km - b.km)
      const d = leida(renderAltimetrySvg(stage.profile, { markers }))
      for (const ancho of [240, DEFAULT_WIDTH_PX, 320, 700]) {
        sinPisarse(bannerLabels(d, ancho), ancho)
        sinPisarse(markerLabels(d, ancho), ancho)
      }
    }
  })

  it('las marcas, abajo y con el total fijo a la derecha del primer renglón', () => {
    const d = leida(
      renderAltimetrySvg(TEST_TOUR[0]!.profile, {
        markers: [
          { km: 20, label: 'attack' },
          { km: 100, label: 'break' },
        ],
      }),
    )
    const labels = markerLabels(d, 700)
    expect(labels.map((l) => [l.text, l.row])).toEqual([
      [d.total, 0],
      ['attack', 0],
      ['break', 0],
    ])
    expect(labels[0]!.anchor).toBe('end')
  })

  it('el total ocupa su sitio: una marca bajo él baja al segundo renglón', () => {
    const d: AltimetryDrawing = { ...reina, markers: [{ x: 690, y: 100, label: 'attack' }] }
    expect(markerLabels(d, 700).map((l) => [l.key, l.row])).toEqual([
      ['total', 0],
      ['m0', 1],
    ])
  })

  it('si no caben, se quedan los puertos más duros y la volante la última', () => {
    const banner = (label: string) => ({
      x: 360,
      top: 24,
      bottom: 176,
      kind: 'climb' as const,
      label,
    })
    const d: AltimetryDrawing = {
      ...reina,
      banners: [{ ...banner('Sprint'), kind: 'sprint' }, banner('Cat 4'), banner('HC')],
    }
    expect(bannerLabels(d, 300).map((l) => l.text)).toEqual(['4', 'HC'])
  })

  it('sin total (no debería pasar), las marcas solas', () => {
    const d: AltimetryDrawing = {
      ...reina,
      total: null,
      markers: [{ x: 360, y: 100, label: 'attack' }],
    }
    expect(markerLabels(d, 700).map((l) => l.text)).toEqual(['attack'])
  })

  it('las marcas que repiten lo que ya se ve (el banner y la meta) ceden su sitio a las demás', () => {
    const d: AltimetryDrawing = {
      ...reina,
      total: null,
      markers: [
        { x: 360, y: 100, label: 'banner' },
        { x: 362, y: 100, label: 'finish' },
        { x: 364, y: 100, label: 'attack' },
      ],
    }
    expect(
      markerLabels(d, 300)
        .map((l) => l.text)
        .sort(),
    ).toEqual(['attack', 'finish'])
  })
})
