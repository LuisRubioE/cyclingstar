import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import { type View, VISIONS, distance } from './colorMath.js'
import {
  BIB,
  BIB_CUFFS,
  BIB_PANELS,
  BIB_PANELS_SEEN,
  BIB_STRAPS,
  BIB_STYLES,
  type BibStyle,
  KIT_CHANGES_PER_SEASON,
  KIT_BASES,
  KIT_CODES,
  KIT_COLORS,
  KIT_CONTRAST_MIN,
  KIT_FIGURES,
  KIT_FIGURE_PATHS,
  KIT_MIN_DISTANCE,
  KIT_MIN_PX,
  KIT_PX,
  KIT_SECONDARIES,
  type KitBigSize,
  type KitCode,
  type KitFigure,
  type KitView,
  LEADER_JERSEY,
  LOGO_STAR,
  POCKETS,
  TORSO,
  TORSO_BACK,
  applySponsor,
  bibColors,
  bibPaint,
  bibStylesFor,
  canonicalKit,
  kitCode,
  kitCodeSchema,
  kitBackPath,
  kitSchema,
  nearestKitColor,
  parseKit,
  starTransform,
} from './kit.js'
import { type Point, flattenPath, insidePath, signedArea } from './kitGeometry.js'

/**
 * EL MAILLOT COMO DATO (E3, docs/visual.md §8.1, §8.3 y §16.2; PR 16a): el vocabulario de D-00e medido con
 * `colorMath.ts`, lo más fino de cada figura medido sobre sus `path`, y el código de ida y vuelta.
 */

const VIEWS: readonly View[] = [...VISIONS, 'gray']
const round1 = (x: number) => Math.round(x * 10) / 10

describe('shared: el tamaño del maillot (E3, §8.3; D-00b)', () => {
  it('ningún tamaño con nombre baja de KIT_MIN_PX, que es el de la fila', () => {
    expect(KIT_MIN_PX).toBe(28)
    expect(KIT_PX.row).toBe(KIT_MIN_PX)
    for (const px of Object.values(KIT_PX)) expect(px).toBeGreaterThanOrEqual(KIT_MIN_PX)
  })

  it('los tamaños van de menor a mayor: fila, tarjeta, equipo, página, cabecera y los dos grandes', () => {
    expect(Object.values(KIT_PX)).toEqual([28, 40, 48, 72, 96, 160, 320])
  })
})

describe('shared: el vocabulario de quince colores y siete figuras (E3, §8.1; D-00e)', () => {
  it('quince colores, trece de base (ni el amarillo ni el blanco) y siete figuras', () => {
    expect(Object.keys(KIT_COLORS)).toHaveLength(15)
    expect(KIT_SECONDARIES).toHaveLength(15)
    expect(KIT_BASES).toHaveLength(13)
    expect(KIT_BASES).not.toContain('yellow')
    expect(KIT_BASES).not.toContain('white')
    expect(KIT_FIGURES).toEqual(['plain', 'band', 'hoops', 'halves', 'yoke', 'sides', 'sash'])
  })

  it('los quince, a 12,3 o más en las tres dicromacias y a 10 o más en las cuatro visiones', () => {
    const names = Object.keys(KIT_COLORS) as (keyof typeof KIT_COLORS)[]
    const worst = Object.fromEntries(VIEWS.map((v) => [v, Number.POSITIVE_INFINITY])) as Record<
      View,
      number
    >
    let grayUnder10 = 0
    for (const [i, a] of names.entries())
      for (const b of names.slice(i + 1)) {
        for (const v of VIEWS)
          worst[v] = Math.min(worst[v], distance(KIT_COLORS[a], KIT_COLORS[b], v))
        if (distance(KIT_COLORS[a], KIT_COLORS[b], 'gray') < KIT_MIN_DISTANCE) grayUnder10++
      }
    for (const v of ['protan', 'deutan', 'tritan'] as const)
      expect(round1(worst[v])).toBeGreaterThanOrEqual(12.3)
    for (const v of VISIONS) expect(worst[v]).toBeGreaterThanOrEqual(KIT_MIN_DISTANCE)
    // en visión normal, el peor par pasa de 15,9 (los doce) a 14,7; en grises bajan 21 de 105, y para
    // eso está la regla de contraste
    expect(round1(worst.normal)).toBe(14.7)
    expect(grayUnder10).toBe(21)
  })

  it('1.105 códigos, 547 con contraste (base y segundo a 20 o más en las cinco vistas)', () => {
    expect(KIT_CODES).toHaveLength(13 + 6 * 13 * 14)
    expect(new Set(KIT_CODES).size).toBe(KIT_CODES.length)
    const contrastOk = KIT_CODES.filter((code) => {
      const kit = parseKit(code)!
      if (kit.figure === 'plain') return true
      return VIEWS.every(
        (v) => distance(KIT_COLORS[kit.base], KIT_COLORS[kit.secondary], v) >= KIT_CONTRAST_MIN,
      )
    })
    expect(contrastOk).toHaveLength(547)
  })
})

describe('shared: el código del maillot (E3, §8.1)', () => {
  it('kitCode y parseKit, de ida y vuelta en los 1.105', () => {
    for (const code of KIT_CODES) {
      const kit = parseKit(code)
      expect(kit, code).not.toBeNull()
      expect(kitCode(kit!)).toBe(code)
      expect(kitSchema.parse(kit)).toEqual(kit)
    }
  })

  it('parseKit da null a lo que no es del vocabulario', () => {
    for (const code of [
      '',
      'plain',
      'plain.yellow',
      'plain.white',
      'plain.red.blue',
      'band.red',
      'band.red.red',
      'band.yellow.red',
      'stripes.red.blue',
      'hoops.navy.gold',
      'HOOPS.navy.yellow',
      'hoops.navy.yellow.red',
      'hoops..yellow',
      'constructor.red',
      'band.toString.red',
    ])
      expect(parseKit(code), code).toBeNull()
  })

  it('kitSchema: estricto, sin el segundo color igual a la base ni una base amarilla', () => {
    expect(
      kitSchema.safeParse({ figure: 'hoops', base: 'navy', secondary: 'yellow' }).success,
    ).toBe(true)
    expect(kitSchema.safeParse({ figure: 'hoops', base: 'navy', secondary: 'navy' }).success).toBe(
      false,
    )
    expect(kitSchema.safeParse({ figure: 'plain', base: 'yellow' }).success).toBe(false)
    expect(kitSchema.safeParse({ figure: 'plain', base: 'red', secondary: 'blue' }).success).toBe(
      false,
    )
    expect(kitSchema.safeParse({ figure: 'stripes', base: 'red', secondary: 'blue' }).success).toBe(
      false,
    )
  })

  it('canonicalKit: halves.blue.red da halves.red.blue, y sin espejo con el amarillo o el blanco', () => {
    expect(canonicalKit('halves.blue.red')).toBe('halves.red.blue')
    expect(canonicalKit('halves.red.blue')).toBe('halves.red.blue')
    expect(canonicalKit('halves.red.white')).toBe('halves.red.white')
    expect(canonicalKit('hoops.blue.red')).toBe('hoops.blue.red')
    expect(canonicalKit('plain.red')).toBe('plain.red')
    for (const code of KIT_CODES) expect(canonicalKit(canonicalKit(code))).toBe(canonicalKit(code))
    // los 13 × 12 `halves` de dos bases son 78 parejas: 1.105 códigos, 1.027 maillots
    expect(new Set(KIT_CODES.map(canonicalKit)).size).toBe(1105 - 78)
  })

  it('kitCodeSchema valida el código e infiere KitCode', () => {
    expect(kitCodeSchema.safeParse('hoops.navy.yellow').success).toBe(true)
    expect(kitCodeSchema.safeParse('hoops.navy.navy').success).toBe(false)
    expect(kitCodeSchema.safeParse(42).success).toBe(false)
    expectTypeOf<z.infer<typeof kitCodeSchema>>().toEqualTypeOf<KitCode>()
  })

  it('el culote: los cuatro de §8.10', () => {
    expect(BIB_STYLES).toEqual(['black', 'black.panel', 'base', 'base.panel'])
  })
})

describe('shared: las figuras, medidas sobre su path (E3, §8.1)', () => {
  const torso = flattenPath(TORSO)

  /**
   * Los tramos de color a lo largo de una recta, dentro del torso: el segundo color (`sec`) o la base. Los
   * del segundo cuentan todos; los de la base, solo entre dos del segundo (un hueco), porque la base que
   * llega al borde del torso es el cuerpo y no una franja.
   */
  const thinnest = (figure: KitFigure, from: Point, to: Point): number => {
    const region = flattenPath(KIT_FIGURE_PATHS[figure] ?? '')
    const length = Math.hypot(to[0] - from[0], to[1] - from[1])
    const step = 0.005
    const runs: { cls: 'out' | 'sec' | 'base'; length: number }[] = []
    for (let s = 0; s <= length; s += step) {
      const x = from[0] + ((to[0] - from[0]) * s) / length
      const y = from[1] + ((to[1] - from[1]) * s) / length
      const cls = !insidePath(torso, x, y) ? 'out' : insidePath(region, x, y) ? 'sec' : 'base'
      const lastRun = runs[runs.length - 1]
      if (lastRun?.cls === cls) lastRun.length += step
      else runs.push({ cls, length: step })
    }
    let best = Number.POSITIVE_INFINITY
    for (const [i, run] of runs.entries()) {
      const gap = run.cls === 'base' && runs[i - 1]?.cls === 'sec' && runs[i + 1]?.cls === 'sec'
      if (run.cls === 'sec' || gap) best = Math.min(best, run.length)
    }
    return best
  }

  // por el centro del pecho: en vertical las figuras de franjas horizontales, en horizontal las de
  // franjas verticales, y la diagonal por su perpendicular, que pasa por (24, 26)
  const normal = (() => {
    const [dx, dy] = [28, 32]
    const l = Math.hypot(dx, dy)
    return [-dy / l, dx / l] as const
  })()
  const SCANS: Record<Exclude<KitFigure, 'plain'>, readonly [Point, Point]> = {
    band: [
      [24, 0],
      [24, 48],
    ],
    hoops: [
      [24, 0],
      [24, 48],
    ],
    yoke: [
      [24, 0],
      [24, 48],
    ],
    halves: [
      [0, 29],
      [48, 29],
    ],
    sides: [
      [0, 29],
      [48, 29],
    ],
    sash: [
      [24 - 24 * normal[0], 26 - 24 * normal[1]],
      [24 + 24 * normal[0], 26 + 24 * normal[1]],
    ],
  }

  it('lo más fino de cada figura, el de la tabla de §8.1; el de todas, 6 u (3,50 px a 28)', () => {
    const measured = Object.fromEntries(
      Object.entries(SCANS).map(([figure, [from, to]]) => [
        figure,
        round1(thinnest(figure as KitFigure, from, to)),
      ]),
    )
    // band 5,83 px; hoops 4,08 de aro y 3,50 de hueco; halves 5,83; yoke 5,25 bajo el cuello (9 u);
    // sides 4,08 de costado y 3,50 de cuerpo; sash 5,83
    expect(measured).toEqual({ band: 10, hoops: 6, halves: 10, yoke: 9, sides: 6, sash: 10 })
    const all = Math.min(...Object.values(measured))
    expect(all).toBe(6)
    expect(round1((all * KIT_PX.row) / 48)).toBe(3.5)
  })

  it('ninguna figura con lunares ni estrella: polígonos de cinco lados o menos, sin curvas', () => {
    expect(Object.keys(KIT_FIGURE_PATHS)).toEqual([...KIT_FIGURES])
    expect(KIT_FIGURE_PATHS.plain).toBeNull()
    for (const figure of KIT_FIGURES) {
      const d = KIT_FIGURE_PATHS[figure]
      if (d === null) continue
      expect(d, figure).not.toMatch(/[AaCcQqSsTt]/)
      expect(d).not.toContain(LOGO_STAR)
      for (const polygon of flattenPath(d)) expect(polygon.length, figure).toBeLessThanOrEqual(5)
    }
  })

  it('los subtrayectos de cada figura, en el mismo sentido: con nonzero, su unión sin huecos', () => {
    for (const figure of KIT_FIGURES) {
      const d = KIT_FIGURE_PATHS[figure]
      if (d === null) continue
      const signs = new Set(flattenPath(d).map((p) => Math.sign(signedArea(p))))
      expect(signs.size, figure).toBe(1)
    }
    // el hombro izquierdo de yoke: dentro, aunque lo pise el rectángulo
    expect(insidePath(flattenPath(KIT_FIGURE_PATHS.yoke!), 12, 15)).toBe(true)
  })
})

describe('shared: las señales (E3, §9.1 y §9.7)', () => {
  it('la estrella del logotipo, a su sitio: 18 u de ancho en (24, 28,5)', () => {
    expect(starTransform(18, 24, 28.5)).toBe(
      `translate(24 28.5) scale(${18 / 22}) translate(-36 -12.5)`,
    )
  })

  it('los tres líderes: el amarillo liso, el verde con la banda blanca y el azul con lunares', () => {
    expect(LEADER_JERSEY.gc.mark).toBeNull()
    expect(LEADER_JERSEY.points.mark).toEqual({ kind: 'band', fill: '#ffffff' })
    expect(LEADER_JERSEY.kom.mark).toEqual({ kind: 'dots', fill: '#ffffff', radiusU: 4 })
  })
})

describe('shared: lo que compra el patrocinador (E3, §9.9)', () => {
  it('el ejemplo de §9.9: el rojo #d0021b va al red, y hoops.navy.yellow pasa a hoops.navy.red', () => {
    expect(nearestKitColor('#d0021b', 'secondary')).toBe('red')
    expect(
      kitCode(applySponsor(parseKit('hoops.navy.yellow')!, { zone: 'secondary', color: 'red' })),
    ).toBe('hoops.navy.red')
  })

  it('la base, solo de las trece; y ningún segundo color en un liso', () => {
    expect(nearestKitColor('#ffe000', 'base')).not.toBe('yellow')
    expect(nearestKitColor('#ffe000', 'secondary')).toBe('yellow')
    expect(kitCode(applySponsor(parseKit('plain.red')!, { zone: 'base', color: 'navy' }))).toBe(
      'plain.navy',
    )
    expect(() =>
      applySponsor(parseKit('plain.red')!, { zone: 'secondary', color: 'white' }),
    ).toThrow()
    expect(() =>
      applySponsor(parseKit('hoops.navy.yellow')!, { zone: 'base', color: 'yellow' }),
    ).toThrow()
    expect(() =>
      applySponsor(parseKit('hoops.navy.yellow')!, { zone: 'secondary', color: 'navy' }),
    ).toThrow()
  })
})

/** Un `path` de polígonos como conjunto, sin el punto de partida ni el sentido de cada uno. */
function regionsOf(d: string): string[] {
  const norm = (poly: readonly Point[]): string => {
    const pts = poly.map(([x, y]) => `${+x.toFixed(4)},${+y.toFixed(4)}`)
    const rotations = (ps: string[]) =>
      ps.map((_, k) => [...ps.slice(k), ...ps.slice(0, k)].join(' '))
    return [...rotations(pts), ...rotations([...pts].reverse())].sort()[0]!
  }
  return flattenPath(d).map(norm).sort()
}
/** El mismo `path` visto desde detrás: x → 48 − x. */
const mirrored = (d: string): string =>
  d.replace(/([MLH])\s*(-?[\d.]+)/g, (_, cmd: string, x: string) => `${cmd}${48 - Number(x)}`)

describe('shared: el maillot en grande (E3, §8.10; PR 17c)', () => {
  it('showcase (160) y poster (320) entran en KIT_PX; la espalda y el culote, solo a esos dos', () => {
    expect(KIT_PX).toEqual({
      row: 28,
      card: 40,
      team: 48,
      page: 72,
      hero: 96,
      showcase: 160,
      poster: 320,
    })
    expectTypeOf<KitBigSize>().toEqualTypeOf<160 | 320>()
    expectTypeOf<KitView>().toEqualTypeOf<'front' | 'back' | 'bib'>()
  })

  it('TORSO_BACK es la silueta de delante con el escote más alto, el control en y 10', () => {
    expect(TORSO_BACK).toBe(TORSO.replace('Q24 12 16 8 Z', 'Q24 10 16 8 Z'))
    expect(TORSO_BACK).not.toBe(TORSO)
  })

  it('la espalda de las siete figuras es la de delante reflejada: halves y sash al otro lado, las demás igual', () => {
    for (const figure of KIT_FIGURES) {
      const front = KIT_FIGURE_PATHS[figure]
      const back = kitBackPath(figure)
      if (front === null) {
        expect(back).toBeNull()
        continue
      }
      expect(regionsOf(back!), figure).toEqual(regionsOf(mirrored(front)))
    }
    expect(kitBackPath('halves')).toBe('M0 0H24V48H0Z')
    expect(kitBackPath('sash')).toBe('M34.24 6.71 L6.24 38.71 L13.76 45.29 L41.76 13.29 Z')
    for (const figure of ['band', 'hoops', 'yoke', 'sides'] as const)
      expect(kitBackPath(figure)).toBe(KIT_FIGURE_PATHS[figure])
  })

  it('los bolsillos y el culote, con los trazos de §8.10', () => {
    expect(POCKETS).toBe('M14.5 33.5H33.5 M20.8 33.5V40.5 M27.2 33.5V40.5')
    expect(BIB).toBe('M12 8 L36 8 L38 40 L26 40 L24 26 L22 40 L10 40 Z')
    expect(BIB_STRAPS).toBe('M15 8 L16.5 1 L19.5 1 L18.5 8 Z M33 8 L31.5 1 L28.5 1 L29.5 8 Z')
    expect(BIB_PANELS).toBe('M12 8 L16 8 L14 40 L10 40 Z M36 8 L32 8 L34 40 L38 40 Z')
    // los paneles, 4 u por fuera de cada pernera, dentro del culote
    const bib = flattenPath(BIB)
    for (const poly of flattenPath(BIB_PANELS)) {
      const [cx, cy] = poly.reduce(
        ([x, y], [px, py]) => [x + px / poly.length, y + py / poly.length],
        [0, 0],
      )
      expect(insidePath(bib, cx, cy)).toBe(true)
    }
  })

  it('el culote: el cuerpo negro o de la base, los paneles del segundo color, y los puños como los paneles', () => {
    const hoops = parseKit('hoops.navy.yellow')!
    const paint = (style: BibStyle) => bibPaint(hoops, style)
    expect(paint('black')).toEqual({
      body: KIT_COLORS.black,
      panels: null,
      cuffs: KIT_COLORS.black,
    })
    expect(paint('black.panel')).toEqual({
      body: KIT_COLORS.black,
      panels: KIT_COLORS.yellow,
      cuffs: KIT_COLORS.yellow,
    })
    expect(paint('base')).toEqual({ body: KIT_COLORS.navy, panels: null, cuffs: KIT_COLORS.navy })
    expect(paint('base.panel')).toEqual({
      body: KIT_COLORS.navy,
      panels: KIT_COLORS.yellow,
      cuffs: KIT_COLORS.yellow,
    })
    // un liso con cuerpo negro lleva los paneles en su base
    expect(bibPaint(parseKit('plain.red')!, 'black.panel')).toMatchObject({
      panels: KIT_COLORS.red,
      cuffs: KIT_COLORS.red,
    })
    // y por su nombre, para escribirlo; unos paneles del color del cuerpo no se ven
    expect(bibColors(hoops, 'base.panel')).toEqual({ body: 'navy', panels: 'yellow' })
    expect(bibColors(parseKit('plain.red')!, 'base.panel')).toEqual({ body: 'red', panels: null })
    expect(bibPaint(parseKit('plain.red')!, 'base.panel')).toEqual({
      body: KIT_COLORS.red,
      panels: null,
      cuffs: KIT_COLORS.red,
    })
  })

  it('BIB_PANELS_SEEN es la regla de contraste ya contada: lo que pasa en las cinco vistas, y nada más (18b)', () => {
    for (const body of KIT_BASES)
      expect(BIB_PANELS_SEEN[body], body).toEqual(
        KIT_SECONDARIES.filter(
          (p) =>
            p !== body &&
            VIEWS.every((v) => distance(KIT_COLORS[body], KIT_COLORS[p], v) >= KIT_CONTRAST_MIN),
        ),
      )
  })

  it('no se ofrece lo que no pasa la regla de contraste: ni base.panel en un liso, ni base con base negra', () => {
    expect(bibStylesFor(parseKit('hoops.navy.yellow')!)).toEqual([...BIB_STYLES])
    expect(bibStylesFor(parseKit('plain.red')!)).toEqual(['black', 'black.panel', 'base'])
    expect(bibStylesFor(parseKit('plain.black')!)).toEqual(['black'])
    expect(bibStylesFor(parseKit('hoops.black.yellow')!)).toEqual(['black', 'black.panel'])
    // los paneles del segundo color, solo si contrastan con el cuerpo en las cinco vistas
    for (const code of KIT_CODES) {
      const kit = parseKit(code)!
      for (const style of bibStylesFor(kit)) {
        const { body, panels } = bibPaint(kit, style)
        if (panels !== null)
          for (const v of VIEWS)
            expect(distance(body, panels, v), `${code} ${style} ${v}`).toBeGreaterThanOrEqual(
              KIT_CONTRAST_MIN,
            )
      }
    }
  })

  it('un cambio de maillot por temporada (D-00k; 18a)', () => {
    expect(KIT_CHANGES_PER_SEASON).toBe(1)
  })

  it('una zona con nombre no cambia el Kit: el nombre del patrocinador viaja aparte (§9.9)', () => {
    const kit = parseKit('hoops.navy.yellow')!
    for (const zone of ['chest', 'back', 'sleeves', 'bibSides'] as const) {
      expect(applySponsor(kit, { zone, sponsorId: 'sponsor-1' })).toBe(kit)
      expect(() => applySponsor(kit, { zone })).toThrow()
    }
  })

  it('los puños, de y 37 a 40, recortados por el culote: uno en cada pernera, nada entre las dos', () => {
    expect(BIB_CUFFS).toBe('M0 37H48V40H0Z')
    const bib = flattenPath(BIB)
    expect(insidePath(bib, 16, 38.5)).toBe(true)
    expect(insidePath(bib, 32, 38.5)).toBe(true)
    expect(insidePath(bib, 24, 38.5)).toBe(false)
  })
})
