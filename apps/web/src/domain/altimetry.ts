/**
 * LA ALTIMETRÍA DEL MOTOR, LEÍDA (E3, paso 24a). El motor manda la altimetría de una etapa como un SVG
 * autocontenido (`renderAltimetrySvg`, SPEC Paso 28): un `viewBox` de 720 × 200 con sus colores fijos y su
 * letra dentro, de 10 a 12 unidades, que a 360 de ancho se pinta a unos 4 px (la comprobación 3 de §7.1) y que
 * en el modo oscuro no cambia de color. Aquí se lee, sin DOM, lo que la web necesita para pintarla con el
 * sistema (`components/Altimetry.tsx`): el relieve, las líneas de los banners con su etiqueta, las marcas
 * del replay y el total. Lo que es cada cosa se lee de su forma, no de su color (ui/8: en la web no se
 * escribe un hexadecimal, y así un cambio de paleta del motor no la rompe); las pruebas lo leen de
 * altimetrías de verdad, generadas con el motor, así que si el motor cambia su forma, la web lo sabe. Y se
 * colocan las etiquetas, que a 12 px no caben todas en un teléfono (14-h; §17.24).
 */

/** Lo que es cada línea vertical: un puerto con categoría, una meta volante o una cota menor sin rótulo. */
export type BannerKind = 'climb' | 'sprint' | 'minor'

export interface AltimetryBanner {
  /** en unidades del `viewBox`, como `top` y `bottom` */
  readonly x: number
  readonly top: number
  readonly bottom: number
  readonly kind: BannerKind
  /** `Cat 1` a `Cat 4`, `HC` o `Sprint`; null en una cota menor, que el motor no rotula */
  readonly label: string | null
}

/** Un momento del replay sobre la curva (`buildMarkers` de la API): su punto y su palabra. */
export interface AltimetryMark {
  readonly x: number
  readonly y: number
  readonly label: string | null
}

export interface AltimetryDrawing {
  readonly width: number
  readonly height: number
  /** los `points` del área bajo la curva y de la curva, tal cual */
  readonly area: string
  readonly curve: string
  readonly banners: readonly AltimetryBanner[]
  readonly markers: readonly AltimetryMark[]
  /** «199 km», y dónde acaba (con `text-anchor="end"`) */
  readonly total: string | null
  readonly totalX: number | null
}

const ETIQUETA = /<(svg|polygon|polyline|line|circle|text)\b([^>]*)>/g
const ATRIBUTO = /([\w:-]+)="([^"]*)"/g

function atributos(s: string): ReadonlyMap<string, string> {
  return new Map([...s.matchAll(ATRIBUTO)].map((m) => [m[1] ?? '', m[2] ?? '']))
}

function numero(a: ReadonlyMap<string, string>, k: string): number | null {
  const v = a.get(k)
  if (v === undefined || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

interface Leido {
  x: number
  label: string | null
}

interface BannerLeido extends Leido {
  top: number
  bottom: number
}

/** De qué es una línea, por su etiqueta: `Sprint`, una volante; ninguna, una cota menor; otra, un puerto. */
function bannerKind(label: string | null): BannerKind {
  if (label === null) return 'minor'
  return label === 'Sprint' ? 'sprint' : 'climb'
}

/**
 * Lee la altimetría del motor; null si no lo es (sin `viewBox`, sin el área o sin la curva). Los atributos
 * se leen en cualquier orden. Como la escribe el motor: cada línea vertical es un banner, y la etiqueta que
 * la sigue con su mismo `x`, la suya (una línea sin ella es una cota menor); cada punto es una marca, con la
 * etiqueta que lo sigue; y el texto anclado al final (`text-anchor="end"`) es el total. El título, que la API
 * no manda, se reconoce por su `font-weight` y no se lee.
 */
export function parseAltimetry(svg: string): AltimetryDrawing | null {
  let width: number | null = null
  let height: number | null = null
  let area: string | null = null
  let curve: string | null = null
  let total: string | null = null
  let totalX: number | null = null
  const banners: BannerLeido[] = []
  const markers: (Leido & { y: number })[] = []
  // lo último que se leyó, por si lo que sigue es su etiqueta
  let previo: Leido | null = null
  for (const m of svg.matchAll(ETIQUETA)) {
    const a = atributos(m[2] ?? '')
    const anterior = previo
    previo = null
    switch (m[1]) {
      case 'svg': {
        const caja = (a.get('viewBox') ?? '')
          .trim()
          .split(/[\s,]+/)
          .map(Number)
        if (caja.length === 4 && caja.every(Number.isFinite) && caja[2]! > 0 && caja[3]! > 0) {
          width = caja[2]!
          height = caja[3]!
        }
        break
      }
      case 'polygon':
        area = a.get('points') ?? null
        break
      case 'polyline':
        curve = a.get('points') ?? null
        break
      case 'line': {
        const x = numero(a, 'x1')
        const y1 = numero(a, 'y1')
        const y2 = numero(a, 'y2')
        if (x === null || y1 === null || y2 === null) break
        const b: BannerLeido = { x, top: Math.min(y1, y2), bottom: Math.max(y1, y2), label: null }
        banners.push(b)
        previo = b
        break
      }
      case 'circle': {
        const x = numero(a, 'cx')
        const y = numero(a, 'cy')
        if (x === null || y === null) break
        const p = { x, y, label: null }
        markers.push(p)
        previo = p
        break
      }
      case 'text': {
        const desde = (m.index ?? 0) + m[0].length
        const hasta = svg.indexOf('</text>', desde)
        const texto = hasta < 0 ? '' : svg.slice(desde, hasta).trim()
        const x = numero(a, 'x')
        // el título (con su `font-weight`), que la API no manda: detrás de una cota menor en el x 24 se le pegaría
        if (texto === '' || x === null || a.has('font-weight')) break
        if (a.get('text-anchor') === 'end') {
          total = texto
          totalX = x
        } else if (anterior !== null && anterior.x === x && anterior.label === null) {
          anterior.label = texto
        }
        break
      }
    }
  }
  if (width === null || height === null || area === null || curve === null) return null
  return {
    width,
    height,
    area,
    curve,
    banners: banners.map(({ x, top, bottom, label }) => ({
      x,
      top,
      bottom,
      kind: bannerKind(label),
      label,
    })),
    markers,
    total,
    totalX,
  }
}

/** La forma corta de una etiqueta de banner, la del perfil de `Watch` (`ProfileStrip`): `4`, `HC`, `S`. */
export function shortBannerLabel(label: string): string {
  if (label === 'Sprint') return 'S'
  return /^Cat (\d)$/.exec(label)?.[1] ?? label
}

/** Qué se queda si no caben: `HC`, luego las categorías de la 1 a la 4 y, la última, la volante. */
function prioridadDeBanner(label: string): number {
  if (label === 'HC') return 0
  const cat = /^Cat (\d)$/.exec(label)?.[1]
  return cat === undefined ? 5 : Number(cat)
}

/**
 * Las marcas que repiten lo que ya se ve ceden su sitio: el paso por un banner (su línea ya está, con su
 * etiqueta) y la meta (el final del dibujo); las demás (`attack`, `break`, `caught`) van antes.
 */
const PRIORIDAD_DE_MARCA: Readonly<Record<string, number>> = { finish: 1, banner: 2 }

/**
 * LA LETRA DE LAS ETIQUETAS: `caption`, 12 px, la mínima (`MIN_FONT_PX`). Para colocarlas sin medirlas, su
 * ancho se estima por lo alto: 8 px por carácter (en DejaVu Sans a 12 px, una cifra mide 7,6 y la `H` en
 * negrita 10; «Cat 4» en negrita, unos 35 de los 40 estimados), y entre dos, un hueco de 6.
 */
export const LABEL_CHAR_PX = 8
export const LABEL_GAP_PX = 6
/** Dos renglones arriba (los banners) y dos abajo (las marcas y el total). */
export const LABEL_ROWS = 2
/** El ancho del dibujo mientras no se ha medido (en las pruebas, sin `ResizeObserver`): el de un teléfono. */
export const DEFAULT_WIDTH_PX = 288

export function labelWidthPx(text: string): number {
  return text.length * LABEL_CHAR_PX
}

export interface LabelItem {
  readonly key: string
  /** el sitio de la etiqueta, en porcentaje del ancho del dibujo */
  readonly xPct: number
  readonly text: string
  /** cuanto más bajo, más importante */
  readonly priority: number
}

export interface PlacedLabel extends LabelItem {
  readonly row: number
  readonly anchor: 'start' | 'middle' | 'end'
}

/** Centrada en su sitio; cerca de un borde, arrimada hacia dentro para no salirse del dibujo. */
function anclaje(xPx: number, w: number, widthPx: number): PlacedLabel['anchor'] {
  if (xPx - w / 2 < 0) return 'start'
  if (xPx + w / 2 > widthPx) return 'end'
  return 'middle'
}

function tramo(xPx: number, w: number, anchor: PlacedLabel['anchor']): readonly [number, number] {
  if (anchor === 'start') return [xPx, xPx + w]
  if (anchor === 'end') return [xPx - w, xPx]
  return [xPx - w / 2, xPx + w / 2]
}

/**
 * Coloca las etiquetas a un ancho dado: por prioridad (y, a igual prioridad, en su orden), cada una en el
 * primer renglón donde no pise a ninguna, con su hueco; la que no cabe en ninguno se queda sin etiqueta. Las
 * fijas (`fixed`) ocupan su sitio antes que nadie y no se devuelven. Devuelve las colocadas en su orden.
 */
export function placeLabels(
  items: readonly LabelItem[],
  widthPx: number,
  fixed: readonly PlacedLabel[] = [],
): PlacedLabel[] {
  const ocupado: (readonly [number, number])[][] = Array.from({ length: LABEL_ROWS }, () => [])
  for (const f of fixed) {
    const w = labelWidthPx(f.text)
    ocupado[f.row]?.push(tramo((f.xPct / 100) * widthPx, w, f.anchor))
  }
  const orden = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => a.item.priority - b.item.priority || a.i - b.i)
  const colocadas = new Map<number, PlacedLabel>()
  for (const { item, i } of orden) {
    const xPx = (item.xPct / 100) * widthPx
    const w = labelWidthPx(item.text)
    const anchor = anclaje(xPx, w, widthPx)
    const [a, b] = tramo(xPx, w, anchor)
    const row = ocupado.findIndex((renglon) =>
      renglon.every(([c, d]) => b + LABEL_GAP_PX <= c || d + LABEL_GAP_PX <= a),
    )
    if (row < 0) continue
    ocupado[row]!.push([a, b])
    colocadas.set(i, { ...item, row, anchor })
  }
  return items.flatMap((_, i) => {
    const p = colocadas.get(i)
    return p === undefined ? [] : [p]
  })
}

/**
 * Las etiquetas de los banners, arriba: la forma larga (`Cat 4`, `Sprint`) si caben todas; si no, la corta
 * en todas (`4`, `S`), para que un mismo dibujo no mezcle las dos; lo que aun así no cabe se queda sin
 * etiqueta, y su línea sigue. Medido con la temporada entera a 240 px: con la larga se pisaban el 63 % de
 * las parejas vecinas, y con la corta, el 11 %.
 */
export function bannerLabels(d: AltimetryDrawing, widthPx: number): PlacedLabel[] {
  const items: LabelItem[] = d.banners.flatMap((b, i) =>
    b.label === null
      ? []
      : [
          {
            key: `b${i}`,
            xPct: (b.x / d.width) * 100,
            text: b.label,
            priority: prioridadDeBanner(b.label),
          },
        ],
  )
  const largas = placeLabels(items, widthPx)
  if (largas.length === items.length) return largas
  return placeLabels(
    items.map((item) => ({ ...item, text: shortBannerLabel(item.text) })),
    widthPx,
  )
}

/** Las etiquetas de abajo: el total, fijo a la derecha del primer renglón, y las marcas del replay. */
export function markerLabels(d: AltimetryDrawing, widthPx: number): PlacedLabel[] {
  const fixed: PlacedLabel[] =
    d.total === null || d.totalX === null
      ? []
      : [
          {
            key: 'total',
            xPct: (d.totalX / d.width) * 100,
            text: d.total,
            priority: -1,
            row: 0,
            anchor: 'end',
          },
        ]
  const items: LabelItem[] = d.markers.flatMap((m, i) =>
    m.label === null
      ? []
      : [
          {
            key: `m${i}`,
            xPct: (m.x / d.width) * 100,
            text: m.label,
            priority: PRIORIDAD_DE_MARCA[m.label] ?? 0,
          },
        ],
  )
  return [...fixed, ...placeLabels(items, widthPx, fixed)]
}
