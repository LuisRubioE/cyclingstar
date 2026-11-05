import { readFileSync } from 'node:fs'
import {
  CHAMPION_RAINBOW,
  CHAMPION_SILVER,
  CHAMPION_STAR_EDGE,
  COLLAR,
  type JerseyKind,
  KIT_COLORS,
  KIT_FIGURE_PATHS,
  type KitCode,
  type KitSize,
  LEADER_DOTS,
  LEADER_JERSEY,
  LOGO_STAR,
  NATIONAL_FLAG_BOX,
  TORSO,
  WORLD_STAR,
  parseKit,
} from '@cyclingstar/shared'
import {
  type Rgb,
  type View,
  deltaE00Of,
  grayscale,
  linearToLab,
  parseColor,
  simulateCvd,
  srgbToLinear,
} from '@cyclingstar/shared/colorMath'
import {
  type Polygon,
  distanceToOutline,
  flattenPath,
  insidePath,
} from '@cyclingstar/shared/kitGeometry'
import type { LegacyJerseyStyle } from '@cyclingstar/shared/legacyJersey'
import { FLAG_CELL_PIXELS } from './flagCells.generated.js'

/**
 * LA DISTANCIA DIBUJADA ENTRE DOS MAILLOTS (E3, docs/visual.md §8.4; D-24, punto 1; PR 16a). Porta a
 * TypeScript el rasterizador del mapa 03 (`docs/diseno/e3-visual/mapas/03-maillots-medida.py`): cada
 * píxel del tamaño pedido se supermuestrea con 8 × 8 puntos contra las capas del dibujo (el torso, la
 * figura recortada por él, el filete y el cuello), que se mezclan en sRGB codificado sobre `#ffffff`, como
 * compone el navegador; cada píxel pasa por Machado 2009 en RGB lineal y por CIELAB D65 con `colorMath.ts`
 * (I-31), y la distancia es la media de ΔE00 píxel a píxel, pesada por la cobertura, la mayor de las dos
 * en cada píxel. La cobertura es la del dibujo sobre transparente (el alfa que mezclan sus capas), como la
 * midió el diseño en Chromium (`opciones/medidas.py`, `Dibujos`), y no la unión de máscaras del mapa 03.
 *
 * Solo servidor. Mide un maillot de equipo contra otro, contra un líder, una señal de campeón o el
 * aspecto de hoy (`legacyJerseyStyle`), que la traducción usa para conservar lo que la afición reconoce
 * (§8.6). La bandera del nacional es la única capa que no es un `path`: se muestrea de las celdas de 32 ×
 * 24 de `flagCells.generated.bin` (§9.5), que solo se leen si se pinta un nacional.
 *
 * `kitDistance.test.ts` lo compara con 50 pares del `kitDistance.golden.json` que escribió el script del
 * mapa 03 (`--golden`), a 0,5 o menos, porque el CI no tiene Python.
 */

/** Los puntos por lado de cada píxel (§8.4). */
export const KIT_SUPERSAMPLE = 8

/** El filete del maillot de equipo, el token `kit-edge` del tema claro: negro al 30 %, de 1 u (§8.3). */
export const KIT_EDGE = { color: '#000000', alpha: 0.3, widthU: 1 } as const
/** El de los líderes y los campeones, `kit-edge-strong`: negro al 35 %, de 1,5 u (§9.1, §9.7). */
export const LEADER_EDGE = { color: '#000000', alpha: 0.35, widthU: 1.5 } as const
/** El cuello, blanco al 85 % (§8.3). */
export const COLLAR_PAINT = { color: '#ffffff', alpha: 0.85 } as const

/**
 * El maillot de hoy, el que pinta `LegacyJersey` (`apps/web/src/components/ui/LegacyJersey.tsx`, el de
 * `Jersey.tsx` l. 17-54 congelado): sus patrones, sin recortar por el torso, y su filete más suave.
 * `kitDistance.test.ts` mira que siguen escritos así en la web.
 */
export const LEGACY_PATTERN_PATHS = {
  solid: [],
  band: ['M14 24 H34 V30 H14 Z'],
  stripes: ['M14 18 H34 V21 H14 Z', 'M14 26 H34 V29 H14 Z', 'M14 34 H34 V37 H14 Z'],
  panels: ['M14 18 L20 18 L20 40 Q17 39.5 14 40 Z', 'M34 18 L28 18 L28 40 Q31 39.5 34 40 Z'],
  shoulders: ['M16 8 L10 12 L7 20 L12 23 L14 18 Z', 'M32 8 L38 12 L41 20 L36 23 L34 18 Z'],
} as const satisfies Record<LegacyJerseyStyle['pattern'], readonly string[]>
export const LEGACY_EDGE = { color: '#000000', alpha: 0.18, widthU: 1 } as const

/** Lo que se dibuja para medir. */
export type KitDrawing =
  | { readonly kind: 'kit'; readonly code: KitCode }
  | { readonly kind: 'leader'; readonly jersey: JerseyKind }
  | { readonly kind: 'world' }
  | { readonly kind: 'continental' }
  | { readonly kind: 'national'; readonly country: string }
  | { readonly kind: 'legacy'; readonly style: LegacyJerseyStyle }
  | { readonly kind: 'layers'; readonly key: string; readonly layers: readonly KitLayer[] }

/** Una forma: un `path` (con su escala y traslado), unos círculos o la intersección con otra. */
export type KitShape =
  | {
      readonly kind: 'path'
      readonly d: string
      /** `translate(cx cy) scale(s) translate(-ox -oy)`, como `starTransform` */
      readonly transform?: { readonly cx: number; readonly cy: number; readonly s: number }
    }
  | {
      readonly kind: 'circles'
      readonly centers: readonly (readonly [number, number])[]
      r: number
    }
  | { readonly kind: 'rect'; readonly x: number; readonly y: number; w: number; h: number }

/** Cómo se pinta una capa: un color con su opacidad, el degradado de la estrella o una bandera. */
export type KitPaint =
  | { readonly kind: 'solid'; readonly color: string; readonly alpha: number }
  | { readonly kind: 'rainbow' }
  | { readonly kind: 'flag'; readonly country: string }

/** Una capa: el relleno de una forma (recortado por otra, si lleva `clip`) o su trazo, de `widthU` u. */
export interface KitLayer {
  readonly mode: 'fill' | 'stroke'
  readonly shape: KitShape
  readonly clip?: KitShape
  readonly widthU?: number
  readonly paint: KitPaint
}

// ------------------------------------------------------------------------------- las capas

const pathShape = (d: string): KitShape => ({ kind: 'path', d })
const TORSO_SHAPE = pathShape(TORSO)
const solid = (color: string, alpha = 1): KitPaint => ({ kind: 'solid', color, alpha })

/** La estrella del logotipo a su sitio: la del mundial y la del continental (§9.1). */
const STAR_SHAPE: KitShape = {
  kind: 'path',
  d: LOGO_STAR,
  transform: { cx: WORLD_STAR.cx, cy: WORLD_STAR.cy, s: WORLD_STAR.widthU / 22 },
}

function torsoLayers(base: string, edge: { color: string; alpha: number; widthU: number }) {
  return {
    body: { mode: 'fill', shape: TORSO_SHAPE, paint: solid(base) } as const,
    edge: {
      mode: 'stroke',
      shape: TORSO_SHAPE,
      widthU: edge.widthU,
      paint: solid(edge.color, edge.alpha),
    } as const,
  }
}

const collarLayer: KitLayer = {
  mode: 'fill',
  shape: pathShape(COLLAR),
  paint: solid(COLLAR_PAINT.color, COLLAR_PAINT.alpha),
}

/** Las capas de un dibujo, en el orden en que se pintan. */
export function drawingLayers(drawing: KitDrawing): readonly KitLayer[] {
  switch (drawing.kind) {
    case 'kit': {
      const kit = parseKit(drawing.code)
      if (kit === null) throw new Error(`kitDistance: ${drawing.code} no es del vocabulario`)
      const { body, edge } = torsoLayers(KIT_COLORS[kit.base], KIT_EDGE)
      const region = KIT_FIGURE_PATHS[kit.figure]
      const figure: KitLayer[] =
        kit.figure === 'plain' || region === null
          ? []
          : [
              {
                mode: 'fill',
                shape: pathShape(region),
                clip: TORSO_SHAPE,
                paint: solid(KIT_COLORS[kit.secondary]),
              },
            ]
      return [body, ...figure, edge, collarLayer]
    }
    case 'leader': {
      const spec = LEADER_JERSEY[drawing.jersey]
      const { body, edge } = torsoLayers(spec.base, LEADER_EDGE)
      const mark: KitLayer[] = []
      if (spec.mark?.kind === 'band')
        mark.push({
          mode: 'fill',
          shape: pathShape(KIT_FIGURE_PATHS.band!),
          clip: TORSO_SHAPE,
          paint: solid(spec.mark.fill),
        })
      if (spec.mark?.kind === 'dots')
        mark.push({
          mode: 'fill',
          shape: { kind: 'circles', centers: LEADER_DOTS, r: spec.mark.radiusU },
          paint: solid(spec.mark.fill),
        })
      // los líderes no llevan cuello: el de hoy (`Jersey.tsx` l. 92-119) tampoco
      return [body, ...mark, edge]
    }
    case 'world':
    case 'continental': {
      const { body, edge } = torsoLayers('#ffffff', LEADER_EDGE)
      return [
        body,
        edge,
        collarLayer,
        {
          mode: 'fill',
          shape: STAR_SHAPE,
          paint: drawing.kind === 'world' ? { kind: 'rainbow' } : solid(CHAMPION_SILVER),
        },
        {
          mode: 'stroke',
          shape: STAR_SHAPE,
          widthU: WORLD_STAR.edgeU,
          paint: solid(CHAMPION_STAR_EDGE),
        },
      ]
    }
    case 'national': {
      const { body, edge } = torsoLayers('#ffffff', LEADER_EDGE)
      const box = NATIONAL_FLAG_BOX
      return [
        body,
        {
          mode: 'fill',
          shape: { kind: 'rect', x: box.x, y: box.y, w: box.width, h: box.height },
          clip: TORSO_SHAPE,
          paint: { kind: 'flag', country: drawing.country },
        },
        edge,
        collarLayer,
      ]
    }
    case 'legacy': {
      const { style } = drawing
      const { body, edge } = torsoLayers(style.base, LEGACY_EDGE)
      return [
        body,
        edge,
        ...LEGACY_PATTERN_PATHS[style.pattern].map((d): KitLayer => ({
          mode: 'fill',
          shape: pathShape(d),
          paint: solid(style.secondary),
        })),
        { ...collarLayer, paint: solid(style.accent, COLLAR_PAINT.alpha) },
      ]
    }
    case 'layers':
      return drawing.layers
  }
}

/** La clave de un dibujo, para no pintarlo dos veces. */
export function drawingKey(drawing: KitDrawing): string {
  switch (drawing.kind) {
    case 'kit':
      return `kit:${drawing.code}`
    case 'leader':
      return `leader:${drawing.jersey}`
    case 'world':
    case 'continental':
      return drawing.kind
    case 'national':
      return `national:${drawing.country}`
    case 'legacy': {
      const { base, secondary, accent, pattern } = drawing.style
      return `legacy:${pattern}:${base}:${secondary}:${accent}`
    }
    case 'layers':
      return `layers:${drawing.key}`
  }
}

// --------------------------------------------------------------------------- las máscaras

/** Las coordenadas, en u, de los puntos de muestra de un lado: (k + 0,5) / 8 de cada píxel. */
function sampleCoords(size: number): Float64Array {
  const n = size * KIT_SUPERSAMPLE
  const out = new Float64Array(n)
  for (let k = 0; k < n; k++) out[k] = ((k + 0.5) / n) * 48
  return out
}

function shapeKey(shape: KitShape): string {
  return JSON.stringify(shape)
}

const polygonsCache = new Map<string, Polygon[]>()

/** Los polígonos de un `path`, en u del maillot, con su escala y su traslado. */
function shapePolygons(shape: Extract<KitShape, { kind: 'path' }>): Polygon[] {
  const key = shapeKey(shape)
  const hit = polygonsCache.get(key)
  if (hit) return hit
  const t = shape.transform
  const raw = flattenPath(shape.d)
  const polygons = t
    ? raw.map((p) => p.map(([x, y]) => [t.cx + (x - 36) * t.s, t.cy + (y - 12.5) * t.s] as const))
    : raw
  polygonsCache.set(key, polygons)
  return polygons
}

const maskCache = new Map<string, Uint8Array>()

/** Qué puntos de muestra cubre una forma rellena (o su trazo de `widthU` u), a un tamaño. */
function shapeMask(shape: KitShape, size: number, strokeU?: number): Uint8Array {
  const key = `${size}|${strokeU ?? 'fill'}|${shapeKey(shape)}`
  const hit = maskCache.get(key)
  if (hit) return hit
  const coords = sampleCoords(size)
  const n = coords.length
  const mask = new Uint8Array(n * n)
  if (shape.kind === 'circles') {
    if (strokeU !== undefined) throw new Error('kitDistance: los círculos no llevan trazo')
    const r2 = shape.r * shape.r
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const x = coords[i]!
        const y = coords[j]!
        if (shape.centers.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= r2))
          mask[j * n + i] = 1
      }
  } else if (shape.kind === 'rect') {
    if (strokeU !== undefined) throw new Error('kitDistance: los rectángulos no llevan trazo')
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const x = coords[i]!
        const y = coords[j]!
        if (x >= shape.x && x < shape.x + shape.w && y >= shape.y && y < shape.y + shape.h)
          mask[j * n + i] = 1
      }
  } else {
    const polygons = shapePolygons(shape)
    const half = strokeU === undefined ? 0 : strokeU / 2
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const x = coords[i]!
        const y = coords[j]!
        const hitIt =
          strokeU === undefined
            ? insidePath(polygons, x, y)
            : distanceToOutline(polygons, x, y) <= half
        if (hitIt) mask[j * n + i] = 1
      }
  }
  maskCache.set(key, mask)
  return mask
}

/** La máscara de una capa: su forma, o su trazo, y su recorte. */
function layerMask(layer: KitLayer, size: number): Uint8Array {
  const own = shapeMask(
    layer.shape,
    size,
    layer.mode === 'stroke' ? (layer.widthU ?? 1) : undefined,
  )
  if (layer.clip === undefined) return own
  const key = `${size}|clip|${layer.mode}|${layer.widthU ?? ''}|${shapeKey(layer.shape)}|${shapeKey(layer.clip)}`
  const hit = maskCache.get(key)
  if (hit) return hit
  const clip = shapeMask(layer.clip, size)
  const mask = new Uint8Array(own.length)
  for (let k = 0; k < own.length; k++) mask[k] = own[k]! & clip[k]!
  maskCache.set(key, mask)
  return mask
}

// --------------------------------------------------------------------------- las pinturas

let flagPixels: Buffer | null = null

/** El RGB de las celdas de las banderas: se lee la primera vez que se pinta un nacional. */
function flagCells(): Buffer {
  if (flagPixels === null) {
    // desde src (los tests) y desde dist (compilado), el .bin está en src
    const bin = readFileSync(new URL('../src/flagCells.generated.bin', import.meta.url))
    const { width, height, codes } = FLAG_CELL_PIXELS
    if (bin.length !== codes.length * width * height * 3)
      throw new Error(`kitDistance: flagCells.generated.bin mide ${bin.length} bytes`)
    flagPixels = bin
  }
  return flagPixels
}

const RAINBOW: readonly Rgb[] = CHAMPION_RAINBOW.map((c) => parseColor(c).rgb)
/** El rectángulo de la estrella del logotipo, en sus unidades: el `objectBoundingBox` del degradado. */
const STAR_BOX = (() => {
  const points = flattenPath(LOGO_STAR).flat()
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  }
})()

/** Una pintura, lista para pedirle el color de un punto. */
type Painter = (x: number, y: number, out: Float64Array) => void

function painter(paint: KitPaint): { alpha: number; at: Painter } {
  if (paint.kind === 'solid') {
    const { rgb, alpha } = parseColor(paint.color)
    return {
      alpha: paint.alpha * alpha,
      at: (_x, _y, out) => {
        out[0] = rgb[0]
        out[1] = rgb[1]
        out[2] = rgb[2]
      },
    }
  }
  if (paint.kind === 'rainbow') {
    // `linearGradient` de (0, 0) a (1, 1) en el rectángulo de la estrella, con seis paradas iguales y
    // la interpolación en sRGB, la del navegador
    const s = WORLD_STAR.widthU / 22
    return {
      alpha: 1,
      at: (x, y, out) => {
        const lx = (x - WORLD_STAR.cx) / s + 36
        const ly = (y - WORLD_STAR.cy) / s + 12.5
        const t = Math.min(
          1,
          Math.max(0, ((lx - STAR_BOX.x) / STAR_BOX.w + (ly - STAR_BOX.y) / STAR_BOX.h) / 2),
        )
        const f = t * (RAINBOW.length - 1)
        const k = Math.min(RAINBOW.length - 2, Math.floor(f))
        const u = f - k
        const a = RAINBOW[k]!
        const b = RAINBOW[k + 1]!
        for (let c = 0; c < 3; c++) out[c] = a[c]! * (1 - u) + b[c]! * u
      },
    }
  }
  const index = (FLAG_CELL_PIXELS.codes as readonly string[]).indexOf(paint.country)
  if (index < 0) throw new Error(`kitDistance: sin bandera para ${paint.country}`)
  const cells = flagCells()
  const { width, height } = FLAG_CELL_PIXELS
  const box = NATIONAL_FLAG_BOX
  const offset = index * width * height * 3
  return {
    alpha: 1,
    at: (x, y, out) => {
      // la celda entera en la caja (las dos a 4:3), al vecino más cercano
      const cx = Math.min(width - 1, Math.max(0, Math.floor(((x - box.x) / box.width) * width)))
      const cy = Math.min(height - 1, Math.max(0, Math.floor(((y - box.y) / box.height) * height)))
      const p = offset + (cy * width + cx) * 3
      out[0] = cells[p]! / 255
      out[1] = cells[p + 1]! / 255
      out[2] = cells[p + 2]! / 255
    },
  }
}

// ----------------------------------------------------------------------------- el dibujo

/**
 * Un dibujo a un tamaño: el color de cada píxel sobre blanco, su cobertura y su CIELAB en cada vista. Los
 * colores van en una paleta, porque los interiores lisos repiten el mismo: cada píxel dice el suyo
 * (`index`), y el CIELAB se calcula una vez por color de la paleta.
 */
export interface KitRaster {
  readonly size: number
  /** sRGB codificado sobre `#ffffff`, de 0 a 1, tres por píxel */
  readonly rgb: Float64Array
  /** la cobertura de cada píxel: el alfa del dibujo sobre transparente */
  readonly alpha: Float64Array
  /** el color de cada píxel en la paleta */
  readonly index: Uint16Array
  /** cuántos colores distintos tiene */
  readonly paletteSize: number
  /** el CIELAB de cada color de la paleta en una vista, tres por color: se calcula la primera vez */
  lab(view: View): Float64Array
}

function rasterize(layers: readonly KitLayer[], size: number): KitRaster {
  const n = size * KIT_SUPERSAMPLE
  const coords = sampleCoords(size)
  const masks = layers.map((layer) => layerMask(layer, size))
  const painters = layers.map((layer) => painter(layer.paint))
  const constant = layers.map((layer) => layer.paint.kind === 'solid')
  const rgb = new Float64Array(size * size * 3)
  const alpha = new Float64Array(size * size)
  const color = new Float64Array(3)
  // los colores lisos, una vez
  const solids = painters.map((p, li) => {
    if (!constant[li]) return null
    const c = new Float64Array(3)
    p.at(0, 0, c)
    return c
  })
  for (let j = 0; j < n; j++) {
    const row = Math.floor(j / KIT_SUPERSAMPLE) * size
    for (let i = 0; i < n; i++) {
      const k = j * n + i
      let r = 1
      let g = 1
      let b = 1
      let a = 0
      for (let li = 0; li < layers.length; li++) {
        if (masks[li]![k] === 0) continue
        const p = painters[li]!
        let c = solids[li]
        if (c === null || c === undefined) {
          p.at(coords[i]!, coords[j]!, color)
          c = color
        }
        const al = p.alpha
        r = r * (1 - al) + c[0]! * al
        g = g * (1 - al) + c[1]! * al
        b = b * (1 - al) + c[2]! * al
        a = al + a * (1 - al)
      }
      const px = row + Math.floor(i / KIT_SUPERSAMPLE)
      rgb[px * 3] = rgb[px * 3]! + r
      rgb[px * 3 + 1] = rgb[px * 3 + 1]! + g
      rgb[px * 3 + 2] = rgb[px * 3 + 2]! + b
      alpha[px] = alpha[px]! + a
    }
  }
  const samples = KIT_SUPERSAMPLE * KIT_SUPERSAMPLE
  for (let p = 0; p < rgb.length; p++) rgb[p] = rgb[p]! / samples
  for (let p = 0; p < alpha.length; p++) alpha[p] = alpha[p]! / samples
  // la paleta: los colores distintos, y el de cada píxel
  const index = new Uint16Array(alpha.length)
  const known = new Map<string, number>()
  const palette: number[] = []
  for (let p = 0; p < alpha.length; p++) {
    const key = `${rgb[p * 3]},${rgb[p * 3 + 1]},${rgb[p * 3 + 2]}`
    let k = known.get(key)
    if (k === undefined) {
      k = palette.length / 3
      known.set(key, k)
      palette.push(rgb[p * 3]!, rgb[p * 3 + 1]!, rgb[p * 3 + 2]!)
    }
    index[p] = k
  }
  const paletteSize = palette.length / 3
  const labs = new Map<View, Float64Array>()
  return {
    size,
    rgb,
    alpha,
    index,
    paletteSize,
    lab(view: View) {
      const hit = labs.get(view)
      if (hit) return hit
      const out = new Float64Array(palette.length)
      for (let k = 0; k < paletteSize; k++) {
        const linear = srgbToLinear([palette[k * 3]!, palette[k * 3 + 1]!, palette[k * 3 + 2]!])
        const seen = view === 'gray' ? grayscale(linear) : simulateCvd(linear, view)
        const [L, A, B] = linearToLab(seen)
        out[k * 3] = L
        out[k * 3 + 1] = A
        out[k * 3 + 2] = B
      }
      labs.set(view, out)
      return out
    },
  }
}

const rasterCache = new Map<string, KitRaster>()

/** Un dibujo a un tamaño, pintado una vez por proceso. */
export function kitRaster(drawing: KitDrawing, size: number): KitRaster {
  const key = `${size}|${drawingKey(drawing)}`
  const hit = rasterCache.get(key)
  if (hit) return hit
  const raster = rasterize(drawingLayers(drawing), size)
  rasterCache.set(key, raster)
  return raster
}

/** Suelta lo pintado (los tests que miden el coste empiezan de cero). */
export function clearKitRasterCache(): void {
  rasterCache.clear()
}

/**
 * Lo ya calculado de una pareja de dibujos: el ΔE00 de cada pareja de colores de sus paletas, con el
 * sello de la llamada que lo calculó. Se reutiliza de una llamada a otra, para no crear nada.
 */
let memoValue = new Float64Array(1 << 16)
let memoStamp = new Uint32Array(1 << 16)
let stamp = 0

/** La distancia entre dos dibujos ya pintados, en una vista: cada pareja de colores, una vez. */
export function rasterDistance(a: KitRaster, b: KitRaster, view: View): number {
  if (a.size !== b.size) throw new Error('kitDistance: dos dibujos de distinto tamaño')
  const la = a.lab(view)
  const lb = b.lab(view)
  const pb = b.paletteSize
  const cells = a.paletteSize * pb
  if (cells > memoValue.length) {
    let length = memoValue.length
    while (length < cells) length *= 2
    memoValue = new Float64Array(length)
    memoStamp = new Uint32Array(length)
    stamp = 0
  }
  if (++stamp === 0xffffffff) {
    memoStamp.fill(0)
    stamp = 1
  }
  let sum = 0
  let weight = 0
  for (let p = 0; p < a.alpha.length; p++) {
    const w = Math.max(a.alpha[p]!, b.alpha[p]!)
    if (w === 0) continue
    const ia = a.index[p]!
    const ib = b.index[p]!
    const key = ia * pb + ib
    let d: number
    if (memoStamp[key] === stamp) d = memoValue[key]!
    else {
      const qa = ia * 3
      const qb = ib * 3
      d = deltaE00Of(la[qa]!, la[qa + 1]!, la[qa + 2]!, lb[qb]!, lb[qb + 1]!, lb[qb + 2]!)
      memoValue[key] = d
      memoStamp[key] = stamp
    }
    sum += d * w
    weight += w
  }
  return weight === 0 ? 0 : sum / weight
}

const ALL_VIEWS: readonly View[] = ['normal', 'protan', 'deutan', 'tritan', 'gray']

/** La distancia dibujada entre dos dibujos, en las cinco vistas: las cuatro visiones y los grises. */
export function drawnDistance(
  a: KitDrawing,
  b: KitDrawing,
  size: number = 28,
  views: readonly View[] = ALL_VIEWS,
): Partial<Record<View, number>> {
  const ra = kitRaster(a, size)
  const rb = kitRaster(b, size)
  return Object.fromEntries(views.map((v) => [v, rasterDistance(ra, rb, v)]))
}

/** La distancia dibujada entre dos maillots del vocabulario, en las cinco vistas. */
export function kitDistance(a: KitCode, b: KitCode, size: KitSize = 28): Record<View, number> {
  return drawnDistance({ kind: 'kit', code: a }, { kind: 'kit', code: b }, size) as Record<
    View,
    number
  >
}
