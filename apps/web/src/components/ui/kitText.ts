import {
  KIT_PX,
  KIT_SPONSOR_TEXT_MIN_PX,
  KIT_TEXT_MIN_PX,
  type KitSize,
  type KitView,
  SPONSOR_ZONES,
  type SponsorZone,
  type ZoneBox,
} from '@cyclingstar/shared'
import { wcagContrast } from '@cyclingstar/shared/colorMath'
import { type Polygon, flattenPath, insidePath } from '@cyclingstar/shared/kitGeometry'
import { createContext } from 'react'

/**
 * LO QUE SE ESCRIBE SOBRE UN MAILLOT (E3, docs/visual.md §8.10 y §9.9; PR 17c; 8-p, 8-s, 8-z). Si un texto
 * cabe entero en su caja a 12 px con su ancho medido (`fitsText`), qué pinta cada zona comprada (el nombre,
 * la marca, la caja llena o nada: `sponsorPaints`) y en qué tinta, `white` o `kit-ink`, la que más
 * contraste con todo lo que tiene debajo (`inkOn`). La medida es la del aparato, `measureText` de un
 * `canvas` con la letra de la página; los tests le pasan la suya con `TextMeasureContext`.
 */

/** El token `kit-ink`, `#10202f` en los dos modos (8-s): lo que se pinta encima del maillot. */
export const KIT_INK = '#10202f'
/** El blanco de lo que se pinta encima del maillot. */
export const KIT_WHITE = '#ffffff'

/** El ancho de un texto en px CSS, con la letra de la página, a `px` y con su peso. */
export type TextMeasure = (text: string, weight: number, px: number) => number

let lienzo: CanvasRenderingContext2D | null | undefined
const medidas = new Map<string, number>()

/** `measureText` de un `canvas` con la letra de `body`; sin `canvas` (el servidor), no cabe nada. */
export const canvasMeasure: TextMeasure = (text, weight, px) => {
  if (lienzo === undefined)
    lienzo =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  if (lienzo === null) return Number.POSITIVE_INFINITY
  const font = `${weight} ${px}px ${getComputedStyle(document.body).fontFamily}`
  const clave = `${font}|${text}`
  const hecha = medidas.get(clave)
  if (hecha !== undefined) return hecha
  lienzo.font = font
  const ancho = lienzo.measureText(text).width
  medidas.set(clave, ancho)
  return ancho
}

/** La medida con que `Kit` y `ChampionJersey` deciden: la del aparato, salvo en los tests. */
export const TextMeasureContext = createContext<TextMeasure>(canvasMeasure)

/** La letra de 12 px en las u del `viewBox` de 48 de un maillot de `size` px. */
export const textU = (size: KitSize): number => (KIT_TEXT_MIN_PX * 48) / size

/**
 * Si un texto cabe entero en una caja de un maillot de `size` px, a 12 px (8-z): a lo largo, su ancho
 * medido; de través, los 12 px de la letra. En vertical, a lo largo es el alto. Nunca se corta ni se pinta
 * más pequeño.
 */
export function fitsText(
  text: string,
  weight: number,
  box: ZoneBox,
  size: KitSize,
  measure: TextMeasure = canvasMeasure,
): boolean {
  const u = size / 48
  const along = (box.vertical ? box.h : box.w) * u
  const across = (box.vertical ? box.w : box.h) * u
  return across >= KIT_TEXT_MIN_PX && measure(text, weight, KIT_TEXT_MIN_PX) <= along
}

/** La tinta de mayor contraste mínimo con todos los colores de debajo; a la par, el blanco (§9.9). */
export function inkOn(backgrounds: readonly string[]): string {
  const peor = (ink: string) => Math.min(...backgrounds.map((bg) => wcagContrast(ink, bg)))
  return peor(KIT_WHITE) >= peor(KIT_INK) ? KIT_WHITE : KIT_INK
}

/** Lo que un patrocinador pone en una zona (§8.10, §9.9): su nombre, su marca de pecho y su color. */
export interface SponsorMark {
  readonly name: string
  readonly mark: string
  readonly color: string
}
export type KitSponsors = Partial<Readonly<Record<SponsorZone, SponsorMark>>>

/** El peso de lo que pinta un patrocinador: `caption` 600 (§9.9). */
export const SPONSOR_WEIGHT = 600

/** Si una zona se ve a un tamaño: el pecho desde 72 px; las demás, solo en las vistas grandes (§8.10). */
export const zoneShown = (zone: SponsorZone, size: KitSize): boolean =>
  zone === 'chest' ? size >= KIT_SPONSOR_TEXT_MIN_PX : size >= KIT_PX.showcase

/** Lo que pinta una caja comprada (8-p): un texto, la caja llena del color de su ficha, o nada. */
export type ZonePaint =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'fill'; readonly color: string }

export interface ZoneEntry {
  readonly zone: SponsorZone
  readonly box: ZoneBox
  readonly sponsor: SponsorMark
  readonly paint: ZonePaint
}

/**
 * Las cajas que se pintan en una vista (8-p): de cada zona comprada que se ve, el nombre si cabe; si no,
 * su marca si cabe; si no, en las vistas grandes, la caja llena; y en las pequeñas, nada, para que el
 * maillot de carrera siga siendo el del vocabulario. Las dos cajas de una zona pintan lo mismo: lo que
 * cabe en las dos.
 */
export function sponsorPaints(
  sponsors: KitSponsors,
  view: KitView,
  size: KitSize,
  measure: TextMeasure,
): ZoneEntry[] {
  const entries: ZoneEntry[] = []
  for (const [zone, { views, boxes }] of Object.entries(SPONSOR_ZONES) as [
    SponsorZone,
    (typeof SPONSOR_ZONES)[SponsorZone],
  ][]) {
    const sponsor = sponsors[zone]
    if (sponsor === undefined || !views.includes(view) || !zoneShown(zone, size)) continue
    const fits = (text: string) =>
      boxes.every((box) => fitsText(text, SPONSOR_WEIGHT, box, size, measure))
    const text = [sponsor.name, sponsor.mark].find(fits)
    const paint: ZonePaint | null =
      text !== undefined
        ? { kind: 'text', text }
        : size >= KIT_PX.showcase
          ? { kind: 'fill', color: sponsor.color }
          : null
    if (paint !== null) for (const box of boxes) entries.push({ zone, box, sponsor, paint })
  }
  return entries
}

const poligonos = new Map<string, Polygon[]>()
const poligonosDe = (d: string): Polygon[] => {
  let p = poligonos.get(d)
  if (p === undefined) {
    p = flattenPath(d)
    poligonos.set(d, p)
  }
  return p
}

/**
 * Los colores que caen bajo una caja de un maillot de dos colores: el segundo donde la caja pisa la región
 * de la figura, y la base donde no, mirado en una rejilla de 5 × 5 dentro de la caja.
 */
export function colorsUnder(
  box: ZoneBox,
  region: string | null,
  base: string,
  secondary: string | null,
): string[] {
  if (region === null || secondary === null) return [base]
  const shape = poligonosDe(region)
  const found = new Set<string>()
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 5; j++) {
      const x = box.x + (box.w * (i + 0.5)) / 5
      const y = box.y + (box.h * (j + 0.5)) / 5
      found.add(insidePath(shape, x, y) ? secondary : base)
    }
  return [...found]
}
