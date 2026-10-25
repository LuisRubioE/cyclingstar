import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MACHADO_2009,
  RGB_TO_XYZ,
  VISIONS,
  WHITE_D65,
  deltaE00,
  distance,
  linearToLab,
  over,
  parseColor,
  simulateCvd,
  srgbToLinear,
  viewLab,
  wcagContrast,
} from './colorMath.js'

/**
 * EL COLOR, CONTRA COLOUR-SCIENCE (E3, docs/visual.md §3.9 y §16.2; PR 7, I-31). Los valores dorados de
 * `colorMath.golden.json` los escribe `docs/diseno/e3-visual/medidas/dorados-colorMath.py` con
 * colour-science 0.4.7 y el método de las medidas del diseño (`fundamentos.py`), y aquí se comparan a 0,01,
 * como pide §3.9: por debajo de eso, una cifra de §3 diría lo mismo con las dos implementaciones.
 */

interface Golden {
  readonly constantes: {
    readonly machado: Record<'protan' | 'deutan' | 'tritan', number[][]>
    readonly rgbToXyz: number[][]
    readonly blanco: number[]
  }
  readonly wcag: readonly { fg: string; bg: string; ratio: number }[]
  readonly mezcla: readonly { fg: string; bg: string; hex: string }[]
  readonly cvd: readonly {
    color: string
    vision: 'protan' | 'deutan' | 'tritan'
    lineal: [number, number, number]
  }[]
  readonly lab: readonly { color: string; lab: [number, number, number] }[]
  readonly deltaE00: readonly {
    a: string
    b: string
    vista: 'normal' | 'protan' | 'deutan' | 'tritan' | 'gray'
    de: number
  }[]
}

const golden = JSON.parse(
  readFileSync(new URL('./colorMath.golden.json', import.meta.url), 'utf8'),
) as Golden

/** A 0,01, como pide §3.9. */
const cerca = (recibido: number, esperado: number, que: string) =>
  expect(Math.abs(recibido - esperado), `${que}: ${recibido} y ${esperado}`).toBeLessThanOrEqual(
    0.01,
  )

describe('colorMath: las constantes, las de colour-science 0.4.7', () => {
  it('Machado 2009 con severidad 1, la de sRGB a XYZ y el blanco D65, con toda su precisión', () => {
    const iguales = (a: readonly (readonly number[])[], b: number[][]) =>
      a.forEach((fila, i) => fila.forEach((x, j) => expect(x).toBeCloseTo(b[i]![j]!, 12)))
    for (const v of ['protan', 'deutan', 'tritan'] as const)
      iguales(MACHADO_2009[v], golden.constantes.machado[v])
    iguales(RGB_TO_XYZ, golden.constantes.rgbToXyz)
    WHITE_D65.forEach((x, i) => expect(x).toBeCloseTo(golden.constantes.blanco[i]!, 12))
  })
})

describe('colorMath: wcagContrast', () => {
  it('la razón WCAG 2.x de cada pareja, con la transparencia mezclada sobre su fondo', () => {
    for (const { fg, bg, ratio } of golden.wcag)
      cerca(wcagContrast(fg, bg), ratio, `${fg} sobre ${bg}`)
  })

  it('no depende del orden: la razón es la misma en los dos sentidos', () => {
    expect(wcagContrast('#10202f', '#ffffff')).toBe(wcagContrast('#ffffff', '#10202f'))
  })

  it('un fondo con transparencia no tiene razón: depende de lo que haya detrás', () => {
    expect(() => wcagContrast('#10202f', 'rgb(0 0 0 / 0.5)')).toThrow()
  })
})

describe('colorMath: over, la mezcla en sRGB y a 8 bits, como el navegador', () => {
  it('da el color de colour-science para cada transparencia', () => {
    for (const { fg, bg, hex } of golden.mezcla) expect(over(fg, bg), `${fg} sobre ${bg}`).toBe(hex)
  })

  it('un color opaco no cambia', () => {
    expect(over('#0b6e8a', '#ffffff')).toBe('#0b6e8a')
  })
})

describe('colorMath: parseColor', () => {
  it('lee #rrggbb y rgb(r g b / a), los dos que usa el tema', () => {
    expect(parseColor('#FF8000')).toEqual({ rgb: [1, 128 / 255, 0], alpha: 1 })
    expect(parseColor('rgb(255 255 255 / 0.75)')).toEqual({ rgb: [1, 1, 1], alpha: 0.75 })
    expect(parseColor('rgb(16 32 47)')).toEqual({ rgb: [16 / 255, 32 / 255, 47 / 255], alpha: 1 })
  })

  it('lo demás no se adivina: lanza', () => {
    for (const malo of ['red', '#fff', 'rgb(1, 2, 3)', 'hsl(0 0% 0%)', '#12345g'])
      expect(() => parseColor(malo), malo).toThrow()
  })
})

describe('colorMath: simulateCvd, Machado 2009 en RGB lineal', () => {
  it('da lo de colour-science en las tres dicromacias', () => {
    for (const { color, vision, lineal } of golden.cvd) {
      const fuera = simulateCvd(srgbToLinear(parseColor(color).rgb), vision)
      fuera.forEach((x, i) => cerca(x, lineal[i]!, `${color} en ${vision}, canal ${i}`))
    }
  })

  it('la visión normal no toca nada, y el resultado queda en [0, 1]', () => {
    expect(simulateCvd([0.2, 0.5, 0.9], 'normal')).toEqual([0.2, 0.5, 0.9])
    for (const v of VISIONS)
      for (const x of simulateCvd([1, 0, 1], v)) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(1)
      }
  })
})

describe('colorMath: CIELAB D65 y deltaE00', () => {
  it('el Lab de cada color, el de colour-science', () => {
    for (const { color, lab } of golden.lab)
      linearToLab(srgbToLinear(parseColor(color).rgb)).forEach((x, i) =>
        cerca(x, lab[i]!, `${color}, componente ${i}`),
      )
  })

  it('el ΔE00 de cada pareja en las cuatro visiones y en grises', () => {
    for (const { a, b, vista, de } of golden.deltaE00)
      cerca(distance(a, b, vista), de, `${a}/${b} en ${vista}`)
  })

  it('deltaE00 es simétrica y vale 0 entre un color y él mismo', () => {
    const x = viewLab('#167a3a', 'normal')
    const y = viewLab('#b42318', 'deutan')
    expect(deltaE00(x, y)).toBeCloseTo(deltaE00(y, x), 12)
    expect(deltaE00(x, x)).toBe(0)
  })
})
