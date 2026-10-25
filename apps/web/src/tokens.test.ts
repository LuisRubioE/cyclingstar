import { readFileSync } from 'node:fs'
import { distance, type View, VISIONS, wcagContrast } from '@cyclingstar/shared/colorMath'
import { describe, expect, it } from 'vitest'

/**
 * EL TEMA, PAREJA A PAREJA (E3, docs/visual.md §3.1 a §3.3 y §16.2; PR 7). Cada pareja de texto y fondo de
 * las tablas, en el tema claro y en el ámbito oscuro, con la razón WCAG 2.x de `colorMath.ts`, que mezcla
 * en sRGB los colores con transparencia sobre su fondo, como el navegador. Los valores salen de
 * `packages/shared/tokens.json`, que escribe `scripts/tokens-json.mjs` del `index.css` de hoy (lo vigila
 * `generados.test.ts`): un solo lector del CSS para los dos.
 *
 * Los umbrales (§3.1): 4,5 un texto; 3 un borde, un control, un tramo o un gráfico (WCAG 1.4.11); 3 el
 * texto deshabilitado, que WCAG 1.4.3 exime; y los filetes del maillot en el claro, contra sus suelos
 * medidos, 2,09 y 2,41, exentos de 3:1 (A-L1-007). El ΔE00 de los tonos se informa y no decide (§3.2).
 */

interface Tokens {
  readonly light: { readonly color: Readonly<Record<string, string>> }
  readonly dark?: { readonly color: Readonly<Record<string, string>> }
  readonly darkScope: { readonly color: Readonly<Record<string, string>> }
}

const tokens = JSON.parse(
  readFileSync(new URL('../../../packages/shared/tokens.json', import.meta.url), 'utf8'),
) as Tokens

const claro = tokens.light.color
/** En el ámbito, lo que no redefine es lo del claro: `navy`, `navy-dark`, `bad`, `gold`… (§3.3). */
const ambito: Readonly<Record<string, string>> = { ...claro, ...tokens.darkScope.color }

const TEXTO = 4.5
const GRAFICO = 3
const DESHABILITADO = 3

/** Una pareja de las tablas: el color, sobre qué fondo y su umbral. */
type Pareja = readonly [color: string, fondo: string, umbral: number]

const sobre = (color: string, fondos: readonly string[], umbral: number): Pareja[] =>
  fondos.map((fondo) => [color, fondo, umbral] as const)

const TONOS = ['good-bg', 'warn-bg', 'bad-bg', 'info-bg'] as const
const TRAMOS = [
  'arrival-cooked',
  'arrival-loaded',
  'arrival-fine',
  'arrival-spoton',
  'arrival-rusty',
] as const

/** §3.1 y §3.2, el tema claro. */
const CLARO: readonly Pareja[] = [
  // los textos
  ...sobre('ink', ['surface', 'canvas', ...TONOS, 'own-tint'], TEXTO),
  ...sobre('ink-2', ['surface', 'canvas', 'surface-2', ...TONOS, 'own-tint'], TEXTO),
  ...sobre('ink-3', ['surface', 'canvas', 'surface-2', 'own-tint', 'info-bg'], TEXTO),
  ...sobre('white', ['navy', 'navy-dark', 'bad'], TEXTO),
  ...sobre('on-navy-2', ['navy', 'navy-dark'], TEXTO),
  ...sobre('accent', ['surface', 'canvas', 'surface-2', 'info-bg'], TEXTO),
  ...sobre('on-accent', ['accent', 'accent-strong'], TEXTO),
  ['gold-ink', 'surface', TEXTO],
  ['ink', 'gold', TEXTO],
  ...sobre('good', ['surface', 'good-bg'], TEXTO),
  ...sobre('warn', ['surface', 'warn-bg'], TEXTO),
  ...sobre('bad', ['surface', 'bad-bg'], TEXTO),
  ['on-bad', 'bad', TEXTO],
  ...TRAMOS.map((t): Pareja => ['on-arrival', t, TEXTO]),
  // los bordes, los controles, los tramos y los gráficos
  ...sobre('line-strong', ['surface', 'canvas', 'surface-2'], GRAFICO),
  ...sobre('focus', ['surface', 'canvas'], GRAFICO),
  ...sobre('own', ['surface', 'own-tint'], GRAFICO),
  ...TRAMOS.map((t): Pareja => [t, 'surface', GRAFICO]),
  ...sobre('gold', ['navy-dark', 'navy'], GRAFICO),
  ['navy-dark', 'gold', GRAFICO],
  // el deshabilitado, exento
  ...sobre('disabled-ink', ['disabled-bg', 'surface'], DESHABILITADO),
  // los filetes del maillot, contra sus suelos
  ...sobre('kit-edge', ['surface', 'surface-2', 'canvas', 'own-tint'], 2.09),
  ...sobre('kit-edge-strong', ['surface', 'surface-2', 'canvas', 'own-tint'], 2.41),
]

/** §3.3, el ámbito oscuro. */
const AMBITO: readonly Pareja[] = [
  ...sobre('ink', ['surface', 'surface-2'], TEXTO),
  ...sobre('ink-2', ['surface', 'surface-2'], TEXTO),
  ...sobre('ink-3', ['surface', 'surface-2'], TEXTO),
  ...sobre('accent', ['surface', 'surface-2'], TEXTO),
  ...sobre('on-accent', ['accent', 'accent-strong'], TEXTO),
  // exento como en el claro (§3.1); sin la exención, solo el modo oscuro (D-00i, paso 23)
  ['disabled-ink', 'disabled-bg', DESHABILITADO],
  ...sobre('line-strong', ['surface', 'surface-2', 'disabled-bg'], GRAFICO),
  ...sobre('focus', ['surface', 'surface-2'], GRAFICO),
  ...sobre('gold', ['surface', 'surface-2'], GRAFICO),
  ...sobre('kit-edge', ['navy-dark', 'navy', 'bad'], GRAFICO),
  ...sobre('kit-edge-strong', ['navy-dark', 'navy', 'bad'], GRAFICO),
]

/** Las que bajan de su umbral, con su razón. */
function bajan(tema: Readonly<Record<string, string>>, parejas: readonly Pareja[]): string[] {
  const fuera: string[] = []
  for (const [color, fondo, umbral] of parejas) {
    const c = tema[color]
    const f = tema[fondo]
    if (c === undefined || f === undefined) {
      fuera.push(`${color} sobre ${fondo}: falta un token`)
      continue
    }
    const r = wcagContrast(c, f)
    if (r < umbral) fuera.push(`${color} sobre ${fondo}: ${r.toFixed(2)} < ${umbral}`)
  }
  return fuera
}

describe('el tema claro (§3.1 y §3.2)', () => {
  it('ningún texto baja de 4,5:1, ni un borde, un tramo o un gráfico de 3:1, ni los filetes de sus suelos', () => {
    expect(bajan(claro, CLARO)).toEqual([])
  })

  it('las cifras de §3.1 salen: ink sobre surface 16,54; ink-3 sobre canvas 5,28; on-navy-2 sobre navy 8,15', () => {
    expect(wcagContrast(claro.ink!, claro.surface!)).toBeCloseTo(16.54, 2)
    expect(wcagContrast(claro['ink-3']!, claro.canvas!)).toBeCloseTo(5.28, 2)
    expect(wcagContrast(claro['on-navy-2']!, claro.navy!)).toBeCloseTo(8.15, 2)
  })

  it('el texto deshabilitado está por debajo de 4,5 sobre su fondo: por eso se le exime, y no se le aplica', () => {
    expect(wcagContrast(claro['disabled-ink']!, claro['disabled-bg']!)).toBeLessThan(TEXTO)
  })
})

describe('el ámbito oscuro (§3.3)', () => {
  it('ninguna pareja baja de su umbral', () => {
    expect(bajan(ambito, AMBITO)).toEqual([])
  })

  it('las cifras de §3.3 salen: ink-2 sobre surface 9,10; accent sobre surface-2 5,29', () => {
    expect(wcagContrast(ambito['ink-2']!, ambito.surface!)).toBeCloseTo(9.1, 2)
    expect(wcagContrast(ambito.accent!, ambito['surface-2']!)).toBeCloseTo(5.29, 2)
  })

  it('el modo oscuro no declara nada que el ámbito no declare (3-j; el modo llega en el paso 23)', () => {
    const oscuro = Object.keys(tokens.dark?.color ?? {})
    expect(oscuro.filter((t) => !(t in tokens.darkScope.color))).toEqual([])
  })
})

describe('el ΔE00 de los tonos, informado (§3.2): lo que distingue es el icono y la palabra', () => {
  it('se calcula en las cuatro visiones y en grises', () => {
    const tono: Readonly<Record<string, string>> = {
      good: claro.good!,
      warn: claro.warn!,
      bad: claro.bad!,
      info: claro.accent!,
    }
    const vistas: readonly View[] = [...VISIONS, 'gray']
    const filas: Record<string, Record<string, number>> = {}
    const nombres = Object.keys(tono)
    for (const [i, a] of nombres.entries())
      for (const b of nombres.slice(i + 1))
        filas[`${a}/${b}`] = Object.fromEntries(
          vistas.map((v) => [v, Number(distance(tono[a]!, tono[b]!, v).toFixed(1))]),
        )
    console.table(filas)
    // la cifra de §3.2 para good/warn, la primera de la tabla
    expect(filas['good/warn']).toEqual({
      normal: 42.1,
      protan: 10.1,
      deutan: 9.6,
      tritan: 51.6,
      gray: 4.3,
    })
  })
})
