/**
 * LA GEOMETRÍA DEL MAILLOT, PARA MEDIRLA (E3, docs/visual.md §8.1 y §8.4; PR 16a). Los `path` de
 * `kit.ts` (`TORSO`, `COLLAR` y `KIT_FIGURE_PATHS`) convertidos en polígonos, con las dos preguntas que
 * hacen los que miden: si un punto cae dentro, con la regla `nonzero` del SVG, que es la de `fill` por
 * defecto, y a qué distancia queda del contorno, que es lo que pinta un trazo con unión redonda.
 *
 * Lo usan la distancia dibujada de `packages/db` (`kitDistance.ts`) y `kit.test.ts`, que mide lo más
 * fino de cada figura. Fuera del barril, como `colorMath.ts`, porque la web dibuja con SVG y no lo
 * necesita: se importa como `@cyclingstar/shared/kitGeometry`.
 *
 * Entiende lo que escriben esos `path`: `M`, `L`, `H`, `V`, `Q` y `Z`, absolutos. Las curvas se parten
 * en `QUAD_SEGMENTS` tramos, los del rasterizador del mapa 03 (`mapas/03-maillots-medida.py`, `flatten`).
 */

export type Point = readonly [number, number]
export type Polygon = readonly Point[]

/** Los tramos en que se parte cada curva cuadrática: los del mapa 03. */
export const QUAD_SEGMENTS = 12

/** Un `path` absoluto con `M`, `L`, `H`, `V`, `Q` y `Z`, en polígonos cerrados (uno por subtrayecto). */
export function flattenPath(d: string, quadSegments: number = QUAD_SEGMENTS): Polygon[] {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  const polygons: Point[][] = []
  let current: Point[] = []
  let command = ''
  let i = 0
  const number = (): number => {
    const t = tokens[i++]
    const v = t === undefined ? Number.NaN : Number(t)
    if (!Number.isFinite(v)) throw new Error(`kitGeometry: falta un número en «${d}»`)
    return v
  }
  const last = (): Point => {
    const p = current[current.length - 1]
    if (p === undefined) throw new Error(`kitGeometry: un tramo sin punto de partida en «${d}»`)
    return p
  }
  const close = () => {
    if (current.length > 0) polygons.push(current)
    current = []
  }
  while (i < tokens.length) {
    const t = tokens[i]!
    if (/[A-Za-z]/.test(t)) {
      if (!'MLHVQZ'.includes(t)) throw new Error(`kitGeometry: «${t}» no se entiende en «${d}»`)
      command = t
      i++
      if (command === 'Z') close()
      else if (command === 'M') close()
      continue
    }
    switch (command) {
      case 'M':
      case 'L':
        current.push([number(), number()])
        break
      case 'H':
        current.push([number(), last()[1]])
        break
      case 'V':
        current.push([last()[0], number()])
        break
      case 'Q': {
        const [x0, y0] = last()
        const [cx, cy, x, y] = [number(), number(), number(), number()]
        for (let s = 1; s <= quadSegments; s++) {
          const u = s / quadSegments
          current.push([
            (1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u * u * x,
            (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u * u * y,
          ])
        }
        break
      }
      default:
        throw new Error(`kitGeometry: un número sin orden en «${d}»`)
    }
  }
  close()
  return polygons
}

/** El área con signo de un polígono (la del cordón de zapato): su signo dice el sentido en que se recorre. */
export function signedArea(polygon: Polygon): number {
  let sum = 0
  for (let k = 0; k < polygon.length; k++) {
    const [x1, y1] = polygon[k]!
    const [x2, y2] = polygon[(k + 1) % polygon.length]!
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

/** El número de vueltas de los polígonos alrededor de un punto (regla `nonzero`: dentro si no es 0). */
export function windingNumber(polygons: readonly Polygon[], x: number, y: number): number {
  let winding = 0
  for (const polygon of polygons) {
    const n = polygon.length
    for (let k = 0; k < n; k++) {
      const [x1, y1] = polygon[k]!
      const [x2, y2] = polygon[(k + 1) % n]!
      if (y1 <= y) {
        if (y2 > y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) > 0) winding++
      } else if (y2 <= y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) < 0) winding--
    }
  }
  return winding
}

/** Si un punto cae dentro, con la regla `nonzero` del SVG. */
export function insidePath(polygons: readonly Polygon[], x: number, y: number): boolean {
  return windingNumber(polygons, x, y) !== 0
}

/** La distancia de un punto al contorno de los polígonos: un trazo de ancho w pinta lo que queda a w/2. */
export function distanceToOutline(polygons: readonly Polygon[], x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY
  for (const polygon of polygons) {
    const n = polygon.length
    for (let k = 0; k < n; k++) {
      const [x1, y1] = polygon[k]!
      const [x2, y2] = polygon[(k + 1) % n]!
      const dx = x2 - x1
      const dy = y2 - y1
      const l2 = dx * dx + dy * dy
      const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((x - x1) * dx + (y - y1) * dy) / l2))
      const ex = x - (x1 + t * dx)
      const ey = y - (y1 + t * dy)
      best = Math.min(best, ex * ex + ey * ey)
    }
  }
  return Math.sqrt(best)
}
