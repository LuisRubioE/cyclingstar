import { readFileSync } from 'node:fs'
import { KIT_COLORS } from '@cyclingstar/shared'
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
/** En el modo oscuro, lo que no redefine es lo del claro: `white`, `navy`, `navy-dark`, `gold`… (§3.3). */
const oscuro: Readonly<Record<string, string>> = { ...claro, ...(tokens.dark?.color ?? {}) }

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
  // el Meter: los segmentos llenos, en accent, contra los vacíos, en line (§4), que es el separador
  // decorativo y no pide umbral por sí solo
  ['accent', 'line', GRAFICO],
  // cyan, la marca: un gráfico sobre blanco, nunca texto (§3.1)
  ['cyan', 'white', GRAFICO],
  // el deshabilitado, exento
  ...sobre('disabled-ink', ['disabled-bg', 'surface'], DESHABILITADO),
  // los filetes del maillot, contra sus suelos
  ...sobre('kit-edge', ['surface', 'surface-2', 'canvas', 'own-tint'], 2.09),
  ...sobre('kit-edge-strong', ['surface', 'surface-2', 'canvas', 'own-tint'], 2.41),
  // el logotipo (PR 21n): su trazo, un gráfico (WCAG 1.4.11), donde se pinta en el claro (la portada); la
  // estrella ámbar, 1,91 sobre canvas, queda fuera: es parte de la marca, que E3 no redibuja (§18.3), y lo
  // que dice que es el logotipo es la bicicleta
  ...sobre('logo', ['canvas', 'surface'], GRAFICO),
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
  // el Meter, como en el claro: accent contra line (§3.3)
  ['accent', 'line', GRAFICO],
  ...sobre('kit-edge', ['navy-dark', 'navy', 'bad'], GRAFICO),
  ...sobre('kit-edge-strong', ['navy-dark', 'navy', 'bad'], GRAFICO),
  // el logotipo en la cabecera, que es navy (PR 21n): es lo único que se ve del enlace a la portada por
  // debajo de 640, y ahí cuenta como gráfico (WCAG 1.4.11), el trazo y la estrella
  ...sobre('logo', ['navy'], GRAFICO),
  ...sobre('logo-star', ['navy'], GRAFICO),
]

/**
 * §3.3, el modo oscuro (paso 23): las 57 parejas de `docs/diseno/e3-visual/medidas/oscuro.txt`, con los
 * umbrales de §3.1 y SIN la exención del deshabilitado: `disabled-ink` sobre `disabled-bg`, a 4,5.
 */
const OSCURO: readonly Pareja[] = [
  ...sobre(
    'ink',
    ['canvas', 'surface', 'surface-2', 'good-bg', 'warn-bg', 'bad-bg', 'info-bg', 'own-tint'],
    TEXTO,
  ),
  ...sobre(
    'ink-2',
    ['canvas', 'surface', 'surface-2', 'good-bg', 'warn-bg', 'bad-bg', 'info-bg', 'own-tint'],
    TEXTO,
  ),
  ...sobre('ink-3', ['surface', 'canvas', 'info-bg', 'own-tint'], TEXTO),
  ...sobre('accent', ['surface', 'canvas', 'surface-2', 'info-bg'], TEXTO),
  ...sobre('on-accent', ['accent', 'accent-strong'], TEXTO),
  ...sobre('gold-ink', ['surface', 'surface-2'], TEXTO),
  ...sobre('good', ['surface', 'good-bg'], TEXTO),
  ...sobre('warn', ['surface', 'warn-bg'], TEXTO),
  ...sobre('bad', ['surface', 'bad-bg'], TEXTO),
  ['on-bad', 'bad', TEXTO],
  ['disabled-ink', 'disabled-bg', TEXTO],
  ...TRAMOS.map((t): Pareja => ['on-arrival', t, TEXTO]),
  // los bordes, los controles, los tramos y los gráficos
  ...sobre('line-strong', ['surface', 'canvas', 'surface-2'], GRAFICO),
  ...sobre('focus', ['canvas', 'surface', 'surface-2'], GRAFICO),
  ['accent', 'line', GRAFICO],
  ['gold', 'surface', GRAFICO],
  ...sobre('own', ['own-tint', 'surface'], GRAFICO),
  ['good', 'good-bg', GRAFICO],
  ...TRAMOS.map((t): Pareja => [t, 'surface', GRAFICO]),
]

/**
 * Lo que el modo también redefine y la tabla de §3.3 mide aparte: el filete del maillot, claro sobre los
 * fondos del modo (§9.10), y el logotipo, el de la cabecera también en la portada (PR 21n).
 */
const OSCURO_APARTE: readonly Pareja[] = [
  ...sobre('kit-edge', ['canvas', 'surface', 'surface-2', 'own-tint'], GRAFICO),
  ...sobre('kit-edge-strong', ['canvas', 'surface', 'surface-2', 'own-tint'], GRAFICO),
  ...sobre('logo', ['canvas', 'surface'], GRAFICO),
  ...sobre('logo-star', ['canvas', 'surface'], GRAFICO),
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

  it('el modo oscuro no declara nada que el ámbito no declare (3-j)', () => {
    const delModo = Object.keys(tokens.dark?.color ?? {})
    expect(delModo.length).toBeGreaterThan(0)
    expect(delModo.filter((t) => !(t in tokens.darkScope.color))).toEqual([])
  })

  it('dentro del ámbito, lo que el modo redefine vale lo del ámbito oscuro o lo del claro, nunca otra cosa (3-j)', () => {
    const raros = Object.entries(tokens.dark?.color ?? {}).filter(
      ([t, v]) => tokens.darkScope.color[t] !== v && tokens.darkScope.color[t] !== claro[t],
    )
    expect(raros).toEqual([])
    // canvas, por ejemplo, vuelve al claro: el ámbito no lo pinta como el modo
    expect(tokens.darkScope.color.canvas).toBe(claro.canvas)
  })
})

describe('el modo oscuro (§3.3; paso 23)', () => {
  it('tokens.json lo lleva: index.css tiene su bloque', () => {
    expect(tokens.dark).toBeDefined()
  })

  it('las 57 parejas de oscuro.txt: ninguna baja de su umbral, y el deshabilitado sin su exención', () => {
    expect(OSCURO).toHaveLength(57)
    expect(OSCURO).toContainEqual(['disabled-ink', 'disabled-bg', TEXTO])
    expect(bajan(oscuro, OSCURO)).toEqual([])
  })

  it('el filete del maillot y el logotipo, sobre los fondos del modo', () => {
    expect(bajan(oscuro, OSCURO_APARTE)).toEqual([])
  })

  it('las cifras de §3.3 salen: ink sobre canvas 17,58; el deshabilitado 4,61; on-accent sobre accent-strong 9,21', () => {
    expect(wcagContrast(oscuro.ink!, oscuro.canvas!)).toBeCloseTo(17.58, 2)
    expect(wcagContrast(oscuro['disabled-ink']!, oscuro['disabled-bg']!)).toBeCloseTo(4.61, 2)
    expect(wcagContrast(oscuro['on-accent']!, oscuro['accent-strong']!)).toBeCloseTo(9.21, 2)
  })

  it('no cambian white, navy, navy-dark, on-navy-2, cyan ni gold: la cabecera, la barra y las marcas, iguales', () => {
    const delModo = tokens.dark?.color ?? {}
    for (const t of ['white', 'navy', 'navy-dark', 'on-navy-2', 'cyan', 'gold'])
      expect(delModo[t], t).toBeUndefined()
  })
})

/**
 * EL LOGOTIPO (§18.3 y §14.7; D20; PR 21n): una marca que E3 no redibuja. Sus dos colores de siempre en el
 * claro; en el ámbito oscuro, los de la imagen de compartir, porque la cabecera es navy y el índigo de su
 * trazo ahí no se veía. Sus parejas, en CLARO y AMBITO; aquí, lo que las explica y lo que las ata.
 */
describe('el logotipo (§18.3; PR 21n)', () => {
  it('en el claro, los de siempre: el trazo índigo y la estrella ámbar', () => {
    expect(claro.logo).toBe('#4f46e5')
    expect(claro['logo-star']).toBe('#f59e0b')
  })

  it('en el ámbito oscuro se ve: su trazo y su estrella pasan de 3:1 sobre navy, donde el índigo daba 1,87', () => {
    expect(wcagContrast(claro.logo!, claro.navy!)).toBeCloseTo(1.87, 2)
    expect(wcagContrast(ambito.logo!, ambito.navy!)).toBeGreaterThanOrEqual(GRAFICO)
    expect(wcagContrast(ambito['logo-star']!, ambito.navy!)).toBeGreaterThanOrEqual(GRAFICO)
  })

  it('en el ámbito oscuro, blanco y gold, los de la imagen de compartir (§14.7): si gold cambia, lo sigue', () => {
    expect(ambito.logo).toBe(ambito.white)
    expect(ambito['logo-star']).toBe(ambito.gold)
  })
})

/** El ΔE00 entre los cuatro tonos de un tema, en las cuatro visiones y en grises, a una décima. */
function tonosDE(tema: Readonly<Record<string, string>>): Record<string, Record<string, number>> {
  const tono: Readonly<Record<string, string>> = {
    good: tema.good!,
    warn: tema.warn!,
    bad: tema.bad!,
    info: tema.accent!,
  }
  const vistas: readonly View[] = [...VISIONS, 'gray']
  const filas: Record<string, Record<string, number>> = {}
  const nombres = Object.keys(tono)
  for (const [i, a] of nombres.entries())
    for (const b of nombres.slice(i + 1))
      filas[`${a}/${b}`] = Object.fromEntries(
        vistas.map((v) => [v, Number(distance(tono[a]!, tono[b]!, v).toFixed(1))]),
      )
  return filas
}

describe('el ΔE00 de los tonos, informado (§3.2): lo que distingue es el icono y la palabra', () => {
  it('en el oscuro, también (§3.3): good y bad a 3,6 en deuteranopía, bad e info a 0,2 en grises', () => {
    const filas = tonosDE(oscuro)
    console.table(filas)
    expect(filas['good/bad']?.deutan).toBe(3.6)
    expect(filas['bad/info']?.gray).toBe(0.2)
  })

  it('se calcula en las cuatro visiones y en grises', () => {
    const filas = tonosDE(claro)
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

/**
 * CADA COLOR DEL TEMA, CON SU PAREJA (§5.5; paso 22): un token entra en el `@theme` con su contraste contra el
 * fondo en que se usa, y lo que el ámbito oscuro redefine, con el suyo ahí; basta con que salga en una
 * pareja, de color o de fondo. `kit-ink` tiene la suya aparte, contra los quince colores del maillot, y la
 * estrella del logotipo en el claro, ninguna: es parte de la marca, que E3 no redibuja (§18.3).
 */
const PAREJA_APARTE: Readonly<Record<string, string>> = {
  'kit-ink': 'contra los quince colores del maillot, con white (§3.1 y §9.9; abajo)',
}
const SIN_PAREJA: Readonly<Record<string, string>> = {
  'logo-star': 'la estrella ámbar del logotipo en el claro, parte de la marca (§18.3)',
}

/** Los tokens que salen en alguna pareja, de color o de fondo. */
const nombrados = (parejas: readonly Pareja[]): Set<string> =>
  new Set(parejas.flatMap(([color, fondo]) => [color, fondo]))

describe('cada color del tema tiene su pareja (§5.5; paso 22)', () => {
  it('en el claro, todos: la estrella del logotipo, fuera, y kit-ink, contra el maillot', () => {
    const con = nombrados(CLARO)
    const sueltos = Object.keys(claro).filter(
      (t) => !con.has(t) && !(t in PAREJA_APARTE) && !(t in SIN_PAREJA),
    )
    expect(sueltos).toEqual([])
  })

  it('en el modo oscuro, todo lo que redefine (paso 23)', () => {
    const con = nombrados([...OSCURO, ...OSCURO_APARTE])
    const delModo = Object.keys(tokens.dark?.color ?? {})
    expect(delModo.length).toBeGreaterThan(0)
    expect(delModo.filter((t) => !con.has(t))).toEqual([])
  })

  it('en el ámbito oscuro, todo lo que redefine', () => {
    const con = nombrados(AMBITO)
    expect(Object.keys(tokens.darkScope.color).filter((t) => !con.has(t))).toEqual([])
  })

  it('las excepciones son tokens del claro, y sin pareja en CLARO: la lista no se queda vieja', () => {
    const con = nombrados(CLARO)
    for (const t of [...Object.keys(PAREJA_APARTE), ...Object.keys(SIN_PAREJA)]) {
      expect(claro[t], t).toBeDefined()
      expect(con.has(t), t).toBe(false)
    }
  })
})

/** Lo que se pinta sobre el maillot (§3.1, §9.9; 8-s): `white` o `kit-ink`, el que más contraste. */
describe('kit-ink, sobre el maillot (§3.1 y §9.9; paso 22)', () => {
  it('white o kit-ink pasan de 4,5:1 sobre cada uno de los quince colores, y el peor da el 4,79 de §3.1', () => {
    const mejor = Object.values(KIT_COLORS).map((c) =>
      Math.max(wcagContrast(claro['kit-ink']!, c), wcagContrast(claro.white!, c)),
    )
    expect(mejor).toHaveLength(15)
    expect(Math.min(...mejor)).toBeGreaterThanOrEqual(TEXTO)
    expect(Math.min(...mejor)).toBeCloseTo(4.79, 2)
  })
})
