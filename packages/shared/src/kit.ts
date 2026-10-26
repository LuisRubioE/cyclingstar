import { z } from 'zod'
import { distance } from './colorMath.js'
import type { JerseyKind } from './jerseys.js'

/**
 * EL MAILLOT COMO DATO (E3, docs/visual.md §8 y §9; PR 2b y PR 16a). Un maillot es una figura, un color
 * base y un segundo color, por nombre, de un vocabulario cerrado de quince colores y siete figuras
 * (D-00e), y no un sorteo de la semilla del equipo. Lo dibuja la web, lo valida la API y lo reparte
 * `packages/db`, así que vive aquí, en el barril (D-02).
 *
 * Lo que hay: el vocabulario y su código (`plain.red`, `hoops.navy.yellow`), la geometría del dibujo en
 * la rejilla de 48 u de `TORSO`, las reglas (el contraste y la distancia mínima), las señales que ningún
 * maillot de equipo puede parecer (los tres líderes, el mundial y el continental, y el nacional, que
 * viste su bandera) y lo que E8 venderá a un patrocinador. Lo del maillot en grande (§8.10) entra en el
 * 17c, y `KIT_CHANGES_PER_SEASON` en el 18a.
 *
 * El tamaño en pantalla nació en el PR 2b, porque la comprobación 10 de la prueba del teléfono importa
 * `KIT_MIN_PX` (§7.1) antes de que existiera el vocabulario (15-a).
 */

// ------------------------------------------------------------------------------------ el tamaño

/** El maillot más pequeño que se pinta, en píxeles CSS, de alto y de ancho (D-00b). */
export const KIT_MIN_PX = 28

/** Los tamaños con nombre: la fila de una lista, la tarjeta, el equipo, la página y la cabecera. */
export const KIT_PX = { row: 28, card: 40, team: 48, page: 72, hero: 96 } as const

/** Un tamaño de maillot: uno de `KIT_PX`, ninguno por debajo de `KIT_MIN_PX`. */
export type KitSize = (typeof KIT_PX)[keyof typeof KIT_PX]

// ------------------------------------------------------------------------------- el vocabulario

/**
 * Los quince colores (D-00e): los doce de telefono §6.1 y tres elegidos por medida (`taupe`, `brown` y
 * `plum`; `docs/diseno/e3-visual/medidas/medir28.py`). El amarillo y el blanco, solo de segundo color: un
 * cuerpo amarillo es el del líder y uno blanco, el del campeón.
 */
export const KIT_COLORS = {
  black: '#1b1d21',
  navy: '#172a5b',
  blue: '#0f6de9',
  sky: '#4cc3ff',
  teal: '#0f9e8f',
  green: '#236102',
  orange: '#f48d32',
  red: '#c62639',
  pink: '#f7418a',
  purple: '#4e2cae',
  taupe: '#876969',
  brown: '#4b1e0f',
  plum: '#5a4b5a',
  yellow: '#ffd60a',
  white: '#ffffff',
} as const
export type KitColorName = keyof typeof KIT_COLORS
export type KitBase = Exclude<KitColorName, 'yellow' | 'white'>
/** Cualquiera de los quince, menos el de la base, que comprueba `kitSchema`. */
export type KitSecondary = KitColorName
export const KIT_SECONDARIES = Object.keys(KIT_COLORS) as [KitColorName, ...KitColorName[]]
const isBase = (c: KitColorName): c is KitBase => c !== 'yellow' && c !== 'white'
export const KIT_BASES = KIT_SECONDARIES.filter(isBase) as [KitBase, ...KitBase[]]

/** Las siete figuras (D-00e): las seis de D-20 y la diagonal, que vuelve porque ya no es la de campeón. */
export const KIT_FIGURES = ['plain', 'band', 'hoops', 'halves', 'yoke', 'sides', 'sash'] as const
export type KitFigure = (typeof KIT_FIGURES)[number]
type Figured = Exclude<KitFigure, 'plain'>
const FIGURED = ['band', 'hoops', 'halves', 'yoke', 'sides', 'sash'] as const satisfies Figured[]

export type Kit =
  | { readonly figure: 'plain'; readonly base: KitBase }
  | { readonly figure: Figured; readonly base: KitBase; readonly secondary: KitSecondary }
/** `plain.red`, `hoops.navy.yellow`. */
export type KitCode = `plain.${KitBase}` | `${Figured}.${KitBase}.${KitSecondary}`

const base = z.enum(KIT_BASES)
const secondary = z.enum(KIT_SECONDARIES)
const figured = z.enum(FIGURED)
export const kitSchema = z.discriminatedUnion('figure', [
  z.strictObject({ figure: z.literal('plain'), base }),
  z.strictObject({ figure: figured, base, secondary }).refine((k) => k.secondary !== k.base),
]) satisfies z.ZodType<Kit>

const isFigure = (s: string): s is KitFigure => (KIT_FIGURES as readonly string[]).includes(s)
const isColor = (s: string): s is KitColorName => Object.hasOwn(KIT_COLORS, s)

/** El maillot de un código, o `null` si el código no es del vocabulario. */
export function parseKit(code: string): Kit | null {
  const [figure, b, s, ...rest] = code.split('.')
  if (figure === undefined || b === undefined || rest.length > 0 || !isFigure(figure)) return null
  if (!isColor(b) || !isBase(b)) return null
  if (figure === 'plain') return s === undefined ? { figure, base: b } : null
  if (s === undefined || !isColor(s) || s === b) return null
  return { figure, base: b, secondary: s }
}

/** El código de un maillot: lo contrario de `parseKit`. */
export function kitCode(kit: Kit): KitCode {
  return kit.figure === 'plain' ? `plain.${kit.base}` : `${kit.figure}.${kit.base}.${kit.secondary}`
}

/**
 * El maillot canónico: el mismo para `halves.red.blue` y `halves.blue.red`, que son uno visto de frente y
 * de espaldas (8-k). De los dos, el que lleva de segundo color el que va antes en `KIT_COLORS`: así
 * `halves.blue.red` da `halves.red.blue`. Con el amarillo o el blanco no hay espejo, porque no son de base.
 */
export function canonicalKit(code: KitCode): KitCode {
  const kit = parseKit(code)
  if (kit === null || kit.figure !== 'halves' || !isBase(kit.secondary)) return code
  const order = (c: KitColorName) => KIT_SECONDARIES.indexOf(c)
  return order(kit.secondary) < order(kit.base)
    ? code
    : kitCode({ figure: 'halves', base: kit.secondary, secondary: kit.base })
}

/** El código, validado: infiere `KitCode` y pasa el serializador de la API sin `transform` (§8.1). */
export const kitCodeSchema = z.custom<KitCode>((v) => typeof v === 'string' && parseKit(v) !== null)

/** Todos los códigos del vocabulario, en su orden: los 13 lisos y, por figura, cada base con cada segundo. */
export const KIT_CODES: readonly KitCode[] = KIT_FIGURES.flatMap((figure) =>
  figure === 'plain'
    ? KIT_BASES.map((b): KitCode => `plain.${b}`)
    : KIT_BASES.flatMap((b) =>
        KIT_SECONDARIES.filter((s) => s !== b).map((s): KitCode => `${figure}.${b}.${s}`),
      ),
)

// --------------------------------------------------------------------------------- las reglas

/** Se mide solo a 28 px, el mínimo de un maillot (D-00b). */
export const KIT_CHECK_SIZES = [28] as const
/** El ΔE00 dibujado mínimo entre rivales y con lo reservado, en las cuatro visiones (D-24). */
export const KIT_MIN_DISTANCE = 10
/** El ΔE00 mínimo entre la base y el segundo color, en las cinco vistas, para que la figura no desaparezca. */
export const KIT_CONTRAST_MIN = 20

// --------------------------------------------------------------------------------- el dibujo

/** La silueta del maillot, en la rejilla de 48 u: hombros, mangas y cuerpo (`Jersey.tsx` l. 10-11). */
export const TORSO =
  'M16 8 L10 12 L7 20 L12 23 L14 18 L14 40 Q24 43 34 40 L34 18 L36 23 L41 20 L38 12 L32 8 Q24 12 16 8 Z'
/** El cuello, blanco al 85 % (`Jersey.tsx` l. 51). */
export const COLLAR = 'M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z'

/**
 * La región del segundo color de cada figura, que se pinta recortada por `TORSO` (§8.1). Lo más fino mide
 * 6 u, 3,50 px a 28: el hueco de los aros y el cuerpo entre costados (`kit.test.ts` lo mide). En `yoke`,
 * la manga izquierda de `Jersey.tsx` l. 46 va recorrida al revés, en el mismo sentido que el rectángulo:
 * con la regla `nonzero` de `fill`, dos subtrayectos en sentidos contrarios dejan un hueco donde se pisan.
 */
export const KIT_FIGURE_PATHS: Readonly<Record<KitFigure, string | null>> = {
  plain: null,
  band: 'M0 23H48V33H0Z',
  hoops: 'M0 17H48V24H0Z M0 30H48V37H0Z',
  halves: 'M24 0H48V48H24Z',
  yoke: 'M0 0H48V19H0Z M16 8 L14 18 L12 23 L7 20 L10 12 Z M32 8 L38 12 L41 20 L36 23 L34 18 Z',
  sides: 'M0 0H21V48H0Z M27 0H48V48H27Z',
  sash: 'M13.76 6.71 L41.76 38.71 L34.24 45.29 L6.24 13.29 Z',
}

/** El culote (§8.10): el de la `0052` lo guarda en `teams.bib` con un `check` a estos cuatro (8-o). */
export const BIB_STYLES = ['black', 'black.panel', 'base', 'base.panel'] as const
export type BibStyle = (typeof BIB_STYLES)[number]

// ------------------------------------------------------------------------ la señal de campeón

/** La estrella del logotipo (`Logo.tsx` l. 30-32), en su `viewBox` de 72 × 60; mide 22 × 21 u. */
export const LOGO_STAR =
  'M36 2 L39.2 9.2 L47 10 L41.2 15.3 L42.9 23 L36 19.1 L29.1 23 L30.8 15.3 L25 10 L32.8 9.2 Z'
/** El espectro natural, de rojo a violeta, en degradado continuo y en diagonal (aceptado por el dueño). */
export const CHAMPION_RAINBOW = [
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#5e35b1',
] as const
/** `navy-dark`: el filo de la estrella, que añadió el orquestador y aceptó el dueño (DD-21, D-00l). */
export const CHAMPION_STAR_EDGE = '#0b2740'
/** La estrella del continental, provisional hasta que E12 decida los continentes. */
export const CHAMPION_SILVER = '#c0c7d2'
/** La estrella del mundial y del continental; el nacional no lleva (D-00m). */
export const WORLD_STAR = { widthU: 18, cx: 24, cy: 28.5, edgeU: 1.5 } as const
/** Las dos letras del país: centradas en x 24, base en y 38,5, de 8 u a 700, filo de 2 u debajo. */
export const NATIONAL_CODE = { x: 24, y: 38.5, sizeU: 8, edgeU: 2, minPx: 72 } as const
/** La caja de la bandera: el alto del torso (de y 8 a 42) a 4:3, centrada en x 24, mangas dentro. */
export const NATIONAL_FLAG_BOX = { x: 4 / 3, y: 8, width: 136 / 3, height: 34 } as const

/** Lo que mide la estrella del logotipo de ancho, en sus unidades. */
const LOGO_STAR_WIDTH_U = 22
/** Su centro, en sus unidades. */
const LOGO_STAR_CENTER = [36, 12.5] as const

/** `translate(cx cy) scale(widthU / 22) translate(-36 -12.5)`: la estrella del logotipo, a su sitio. */
export function starTransform(widthU: number, cx: number, cy: number): string {
  const [x, y] = LOGO_STAR_CENTER
  return `translate(${cx} ${cy}) scale(${widthU / LOGO_STAR_WIDTH_U}) translate(${-x} ${-y})`
}

// -------------------------------------------------------------------------------- los líderes

/** Los centros de los cinco lunares de la montaña (`Jersey.tsx` l. 80-86). */
export const LEADER_DOTS = [
  [19, 22],
  [29, 22],
  [24, 29],
  [19, 36],
  [29, 36],
] as const

/** Los tres de líder (D-28): el amarillo liso, el verde con la banda de `band` y el azul con lunares. */
export const LEADER_JERSEY = {
  gc: { base: '#facc15', mark: null },
  points: { base: '#16a34a', mark: { kind: 'band', fill: '#ffffff' } },
  kom: { base: '#2563eb', mark: { kind: 'dots', fill: '#ffffff', radiusU: 4 } },
} as const satisfies Record<JerseyKind, { readonly base: string; readonly mark: object | null }>

// ---------------------------------------------------------------------------- el patrocinador

/** Por debajo, ninguna marca de patrocinador en el pecho: el nombre va en `aria-label` y `<title>`. */
export const KIT_SPONSOR_TEXT_MIN_PX = 72

/** Lo que se le puede comprar al maillot (§9.9): un color; las zonas con nombre llegan con el 17c. */
export type KitZone = 'base' | 'secondary'

export interface SponsorOffer {
  readonly zone: KitZone
  /** 'base' o 'secondary': el color del vocabulario más cercano al de su marca */
  readonly color?: KitColorName
  /** 'chest': el patrocinador de la lista cerrada (DD-19), desde el 17c */
  readonly sponsorId?: string
}

/** El maillot con la oferta puesta; lanza si la zona no existe en ese maillot ('secondary' en un 'plain'). */
export function applySponsor(kit: Kit, offer: SponsorOffer): Kit {
  const color = offer.color
  if (color === undefined) throw new Error(`applySponsor: la zona ${offer.zone} pide un color`)
  if (offer.zone === 'base') {
    if (!isBase(color)) throw new Error(`applySponsor: ${color} no es un color de base`)
    if (kit.figure === 'plain') return { figure: 'plain', base: color }
    if (kit.secondary === color)
      throw new Error(`applySponsor: ${color} ya es el segundo color de ${kitCode(kit)}`)
    return { ...kit, base: color }
  }
  if (kit.figure === 'plain')
    throw new Error(`applySponsor: ${kitCode(kit)} no tiene segundo color`)
  if (kit.base === color) throw new Error(`applySponsor: ${color} ya es la base de ${kitCode(kit)}`)
  return { ...kit, secondary: color }
}

/** El color de `KIT_COLORS` (de `KIT_BASES` para la base) a menor ΔE00 en visión normal. */
export function nearestKitColor(hex: string, zone: KitZone): KitColorName {
  const pool: readonly KitColorName[] = zone === 'base' ? KIT_BASES : KIT_SECONDARIES
  let best = pool[0]!
  let bestDistance = Number.POSITIVE_INFINITY
  for (const name of pool) {
    const d = distance(hex, KIT_COLORS[name], 'normal')
    if (d < bestDistance) {
      best = name
      bestDistance = d
    }
  }
  return best
}
