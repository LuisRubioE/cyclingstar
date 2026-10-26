import { describe, expect, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import { type View, VISIONS, distance } from './colorMath.js'
import {
  BIB_STYLES,
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
  type KitCode,
  type KitFigure,
  LEADER_JERSEY,
  LOGO_STAR,
  TORSO,
  applySponsor,
  canonicalKit,
  kitCode,
  kitCodeSchema,
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

  it('los tamaños van de menor a mayor: fila, tarjeta, equipo, página y cabecera', () => {
    expect(Object.values(KIT_PX)).toEqual([28, 40, 48, 72, 96])
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
