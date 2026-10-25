/**
 * EL COLOR, MEDIDO (E3, docs/visual.md §3.9; PR 7, I-31): la razón de contraste de WCAG 2.x, los tres
 * daltonismos de Machado 2009 y la distancia CIEDE2000, en una sola implementación para todo lo que mide
 * colores: `tokens.test.ts`, `kit.test.ts` y el servidor, que reparte los maillots (§8.4). Así no hay dos
 * cifras distintas para lo mismo.
 *
 * Fuera del barril, para que no viaje a la web (H-03): se importa como `@cyclingstar/shared/colorMath`,
 * su entrada en `exports` de `package.json`.
 *
 * El método es el de las medidas del diseño (`docs/diseno/e3-visual/medidas/fundamentos.py`), y
 * `colorMath.test.ts` lo compara a 0,01 con colour-science 0.4.7 (`dorados-colorMath.py`): la razón WCAG
 * 2.x con la luminancia relativa de sRGB; los colores con transparencia, mezclados en sRGB sobre su fondo
 * y redondeados a 8 bits, como el navegador; Machado 2009 con severidad 1 en RGB lineal, recortado a
 * [0, 1]; los grises, la luminancia de Rec. 709 en los tres canales; y CIELAB con el blanco de sRGB (D65).
 */

/** Las cuatro visiones que se miden: la normal y las tres dicromacias. */
export type Vision = 'normal' | 'protan' | 'deutan' | 'tritan'
export const VISIONS: readonly Vision[] = ['normal', 'protan', 'deutan', 'tritan']

/** Lo que se mira: una visión, o los grises, que se informan y no deciden (§3.2). */
export type View = Vision | 'gray'

/** Tres canales de 0 a 1, de sRGB codificado o lineal según la función. */
export type Rgb = readonly [number, number, number]

/** L*, a* y b*. */
export type Lab = readonly [number, number, number]

/** Un color del tema: sus canales sRGB y su transparencia. */
export interface Color {
  readonly rgb: Rgb
  readonly alpha: number
}

type Matrix = readonly [Rgb, Rgb, Rgb]

/** Machado, Oliveira y Fernandes (2009), severidad 1, las de colour-science 0.4.7. */
export const MACHADO_2009: Readonly<Record<Exclude<Vision, 'normal'>, Matrix>> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
}

/** De sRGB lineal a XYZ, la de colour-science 0.4.7 (de los primarios y el blanco de sRGB). */
export const RGB_TO_XYZ: Matrix = [
  [0.4124, 0.3576, 0.1805],
  [0.2126, 0.7152, 0.0722],
  [0.0193, 0.1192, 0.9505],
]

/** El blanco de referencia de sRGB, D65, en XYZ. */
export const WHITE_D65: Rgb = [0.9504559270516716, 1.0, 1.0890577507598784]

/** Los coeficientes de la luminancia de Rec. 709, los de WCAG 2.x. */
const REC_709: Rgb = [0.2126, 0.7152, 0.0722]

const dot = (a: Rgb, b: Rgb): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const apply = (m: Matrix, v: Rgb): Rgb => [dot(m[0], v), dot(m[1], v), dot(m[2], v)]
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** Lee los dos formatos del tema: `#rrggbb` y `rgb(r g b)` o `rgb(r g b / a)`. Lo demás lanza. */
export function parseColor(css: string): Color {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(css)
  if (hex)
    return {
      rgb: [hex[1]!, hex[2]!, hex[3]!].map((h) => parseInt(h, 16) / 255) as unknown as Rgb,
      alpha: 1,
    }
  const fn = /^rgb\((\d{1,3}) (\d{1,3}) (\d{1,3})(?: \/ (0|1|0?\.\d+))?\)$/.exec(css)
  if (fn) {
    const rgb = [fn[1]!, fn[2]!, fn[3]!].map((c) => Number(c) / 255) as unknown as Rgb
    if (rgb.some((c) => c > 1)) throw new Error(`Color fuera de rango: ${css}`)
    return { rgb, alpha: fn[4] === undefined ? 1 : Number(fn[4]) }
  }
  throw new Error(`Color que el tema no usa: ${css}`)
}

/**
 * Al entero más cercano y, en el empate, al par, como el `round` de Python con que se midió el diseño
 * (`fundamentos.py`). Importa: el negro al 30 % sobre blanco cae en 178,5 justos.
 */
function roundHalfEven(x: number): number {
  const r = Math.round(x)
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r
}

/** `#rrggbb` de unos canales sRGB, a 8 bits. */
export function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((c) =>
      roundHalfEven(clamp01(c) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/**
 * El color tal como lo pinta el navegador sobre un fondo opaco: con transparencia, mezclado en sRGB
 * codificado y a 8 bits; opaco, el mismo.
 */
export function over(fg: string, bg: string): string {
  const f = parseColor(fg)
  const b = parseColor(bg)
  if (b.alpha !== 1)
    throw new Error(`Un fondo con transparencia depende de lo que haya detrás: ${bg}`)
  const a = f.alpha
  return toHex([0, 1, 2].map((i) => f.rgb[i]! * a + b.rgb[i]! * (1 - a)) as unknown as Rgb)
}

/** De sRGB codificado a lineal (la curva de sRGB). */
export function srgbToLinear(rgb: Rgb): Rgb {
  return rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as unknown as Rgb
}

/** La luminancia relativa de WCAG 2.x de un color opaco. */
export function relativeLuminance(color: string): number {
  const c = parseColor(color)
  if (c.alpha !== 1)
    throw new Error(`La luminancia de un color con transparencia depende de su fondo: ${color}`)
  return dot(srgbToLinear(c.rgb), REC_709)
}

/**
 * La razón de contraste de WCAG 2.x entre un color y su fondo, en cualquier orden. Si el color lleva
 * transparencia, se mezcla antes sobre el fondo, que ha de ser opaco.
 */
export function wcagContrast(fg: string, bg: string): number {
  const [x, y] = [relativeLuminance(over(fg, bg)), relativeLuminance(over(bg, '#ffffff'))].sort(
    (p, q) => q - p,
  )
  return (x! + 0.05) / (y! + 0.05)
}

/** El color en RGB lineal tal como lo ve una visión: Machado 2009, severidad 1, recortado a [0, 1]. */
export function simulateCvd(linear: Rgb, vision: Vision): Rgb {
  if (vision === 'normal') return linear
  return apply(MACHADO_2009[vision], linear).map(clamp01) as unknown as Rgb
}

/** Los grises: la luminancia de Rec. 709 en los tres canales. */
export function grayscale(linear: Rgb): Rgb {
  const y = dot(linear, REC_709)
  return [y, y, y]
}

/** De RGB lineal a CIELAB con el blanco D65 de sRGB. */
export function linearToLab(linear: Rgb): Lab {
  const xyz = apply(RGB_TO_XYZ, linear)
  const f = (t: number) => (t > (24 / 116) ** 3 ? Math.cbrt(t) : (841 / 108) * t + 16 / 116)
  const [fx, fy, fz] = [0, 1, 2].map((i) => f(xyz[i]! / WHITE_D65[i]!))
  return [116 * fy! - 16, 500 * (fx! - fy!), 200 * (fy! - fz!)]
}

/** El Lab de un color opaco en una visión, o en grises. */
export function viewLab(color: string, view: View): Lab {
  const c = parseColor(color)
  if (c.alpha !== 1)
    throw new Error(`Un color con transparencia se mezcla antes sobre su fondo: ${color}`)
  const linear = srgbToLinear(c.rgb)
  return linearToLab(view === 'gray' ? grayscale(linear) : simulateCvd(linear, view))
}

const rad = (deg: number) => (deg * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** CIEDE2000 entre dos Lab, con kL = kC = kH = 1 (Sharma, Wu y Dalal, 2005). */
export function deltaE00([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cm7 = ((C1 + C2) / 2) ** 7
  const G = 0.5 * (1 - Math.sqrt(Cm7 / (Cm7 + 25 ** 7)))
  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)
  const hue = (b: number, a: number) =>
    b === 0 && a === 0 ? 0 : (deg(Math.atan2(b, a)) + 360) % 360
  const h1p = hue(b1, a1p)
  const h2p = hue(b2, a2p)
  const neutro = C1p * C2p === 0
  let dh = neutro ? 0 : h2p - h1p
  if (dh > 180) dh -= 360
  else if (dh < -180) dh += 360
  const dL = L2 - L1
  const dC = C2p - C1p
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dh / 2))
  const Lm = (L1 + L2) / 2
  const Cm = (C1p + C2p) / 2
  const hm = neutro
    ? h1p + h2p
    : Math.abs(h1p - h2p) <= 180
      ? (h1p + h2p) / 2
      : (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2
  const T =
    1 -
    0.17 * Math.cos(rad(hm - 30)) +
    0.24 * Math.cos(rad(2 * hm)) +
    0.32 * Math.cos(rad(3 * hm + 6)) -
    0.2 * Math.cos(rad(4 * hm - 63))
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2))
  const RC = 2 * Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7))
  const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2)
  const SC = 1 + 0.045 * Cm
  const SH = 1 + 0.015 * Cm * T
  const RT = -Math.sin(rad(2 * dTheta)) * RC
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH))
}

/** El ΔE00 entre dos colores opacos tal como los ve una visión, o en grises. */
export function distance(a: string, b: string, view: View): number {
  return deltaE00(viewLab(a, view), viewLab(b, view))
}
