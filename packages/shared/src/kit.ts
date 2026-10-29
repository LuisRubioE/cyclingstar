import { z } from 'zod'
import { type View, VISIONS, distance } from './colorMath.js'
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
 * viste su bandera), lo que E8 venderá a un patrocinador y, desde el 17c, el maillot en grande (§8.10):
 * la espalda, el culote y las zonas con nombre. `KIT_CHANGES_PER_SEASON` entra en el 18a.
 *
 * El tamaño en pantalla nació en el PR 2b, porque la comprobación 10 de la prueba del teléfono importa
 * `KIT_MIN_PX` (§7.1) antes de que existiera el vocabulario (15-a).
 */

// ------------------------------------------------------------------------------------ el tamaño

/** El maillot más pequeño que se pinta, en píxeles CSS, de alto y de ancho (D-00b). */
export const KIT_MIN_PX = 28

/**
 * Los tamaños con nombre: la fila de una lista, la tarjeta, el equipo, la página y la cabecera, y los dos
 * del maillot en grande (D-00g, §8.10): `showcase` en la ficha del equipo y `poster` en la `Sheet`.
 */
export const KIT_PX = {
  row: 28,
  card: 40,
  team: 48,
  page: 72,
  hero: 96,
  showcase: 160,
  poster: 320,
} as const

/** Un tamaño de maillot: uno de `KIT_PX`, ninguno por debajo de `KIT_MIN_PX`. */
export type KitSize = (typeof KIT_PX)[keyof typeof KIT_PX]
/** Los dos únicos de las vistas de detrás y del culote (§8.10). */
export type KitBigSize = typeof KIT_PX.showcase | typeof KIT_PX.poster
/** De 28 a 96 px, solo `front`; `back` y `bib`, solo en `KitBigSize`. */
export type KitView = 'front' | 'back' | 'bib'

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
/** Las cinco vistas de la regla de contraste: las cuatro visiones y los grises (I-25). */
const CONTRAST_VIEWS: readonly View[] = [...VISIONS, 'gray']

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

// ------------------------------------------------------------- el maillot en grande (§8.10)

/** La espalda: la silueta de `TORSO` con el escote más alto, el control en y 10, y sin cuello (8-n). */
export const TORSO_BACK =
  'M16 8 L10 12 L7 20 L12 23 L14 18 L14 40 Q24 43 34 40 L34 18 L36 23 L41 20 L38 12 L32 8 Q24 10 16 8 Z'

/**
 * La figura vista desde detrás (8-n): la de delante reflejada, x → 48 − x. Las cinco simétricas quedan
 * igual; `halves` pasa a la izquierda y `sash` baja del hombro derecho a la cadera izquierda, porque la
 * banda da la vuelta al cuerpo.
 */
const KIT_BACK_FIGURE_PATHS: Readonly<Record<KitFigure, string | null>> = {
  ...KIT_FIGURE_PATHS,
  halves: 'M0 0H24V48H0Z',
  sash: 'M34.24 6.71 L6.24 38.71 L13.76 45.29 L41.76 13.29 Z',
}

/** La región del segundo color de una figura en la espalda, que se pinta recortada por `TORSO_BACK`. */
export function kitBackPath(figure: KitFigure): string | null {
  return KIT_BACK_FIGURE_PATHS[figure]
}

/** Los tres bolsillos, en trazos de 0,5 u y `rgba(0,0,0,0.3)`. */
export const POCKETS = 'M14.5 33.5H33.5 M20.8 33.5V40.5 M27.2 33.5V40.5'
/** El nombre del equipo, sobre los hombros: solo si cabe a 12 px con su ancho medido, nunca cortado. */
export const BACK_NAME_BOX: ZoneBox = { x: 12, y: 11, w: 24, h: 5 }
/** El sitio del dorsal, sobre los bolsillos: solo con dorsal, y ningún patrocinador lo ocupa. */
export const BACK_NUMBER_BOX: ZoneBox = { x: 18, y: 28, w: 12, h: 8 }

/** El culote, en su `viewBox` de 48: el cuerpo y las dos perneras (8-o). */
export const BIB = 'M12 8 L36 8 L38 40 L26 40 L24 26 L22 40 L10 40 Z'
/** Los tirantes, del color del cuerpo. */
export const BIB_STRAPS = 'M15 8 L16.5 1 L19.5 1 L18.5 8 Z M33 8 L31.5 1 L28.5 1 L29.5 8 Z'
/** Los paneles de los costados, 4 u por fuera de cada pernera. */
export const BIB_PANELS = 'M12 8 L16 8 L14 40 L10 40 Z M36 8 L32 8 L34 40 L38 40 Z'
/** Los puños, de y 37 a 40, que se pintan recortados por `BIB`: quedan las dos perneras. */
export const BIB_CUFFS = 'M0 37H48V40H0Z'

/** El culote (§8.10): el de la `0052` lo guarda en `teams.bib` con un `check` a estos cuatro (8-o). */
export const BIB_STYLES = ['black', 'black.panel', 'base', 'base.panel'] as const
export type BibStyle = (typeof BIB_STYLES)[number]

/** Los colores del culote, por su nombre: el cuerpo (y los tirantes) y los paneles, si se ven. */
export interface BibColors {
  readonly body: KitColorName
  readonly panels: KitColorName | null
}

/**
 * Los colores de un estilo sobre un maillot: el cuerpo negro o de la base; los paneles, del segundo color,
 * o de la base en un `plain`. Un estilo que no ofrece `bibStylesFor` también se pinta, porque `teams.bib`
 * puede venir de un maillot anterior: unos paneles del color del cuerpo no se ven, y no se pintan.
 */
export function bibColors(kit: Kit, style: BibStyle): BibColors {
  const body = style === 'black' || style === 'black.panel' ? 'black' : kit.base
  const panel = kit.figure === 'plain' ? kit.base : kit.secondary
  return { body, panels: style.endsWith('.panel') && panel !== body ? panel : null }
}

/** Lo mismo en hexadecimal, con los puños: como los paneles, o como el cuerpo si no hay paneles. */
export interface BibPaint {
  readonly body: string
  readonly panels: string | null
  readonly cuffs: string
}

export function bibPaint(kit: Kit, style: BibStyle): BibPaint {
  const { body, panels } = bibColors(kit, style)
  const hex = panels === null ? null : KIT_COLORS[panels]
  return { body: KIT_COLORS[body], panels: hex, cuffs: hex ?? KIT_COLORS[body] }
}

/**
 * Los estilos que se ofrecen para un maillot (§8.10): sin `base` si la base es `black`, que sería el
 * negro, y sin los paneles que no pasan la regla de contraste (`KIT_CONTRAST_MIN` en las cinco vistas),
 * como `base.panel` en un `plain`, con los paneles del color del cuerpo.
 */
export function bibStylesFor(kit: Kit): BibStyle[] {
  return BIB_STYLES.filter((style) => {
    if (kit.base === 'black' && style.startsWith('base')) return false
    if (!style.endsWith('.panel')) return true
    const { body, panels } = bibPaint(kit, style)
    return (
      panels !== null && CONTRAST_VIEWS.every((v) => distance(body, panels, v) >= KIT_CONTRAST_MIN)
    )
  })
}

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

/** Las zonas con nombre que un patrocinador puede comprar (D-30, D-00g; §8.10). */
export type SponsorZone = 'chest' | 'back' | 'sleeves' | 'bibSides'

/** Una caja en el `viewBox` de 48 de su vista; `vertical`, con el texto a lo largo del alto. */
export interface ZoneBox {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly vertical?: true
}

/**
 * Las cajas de cada zona y las vistas en que se ven (§8.10): el pecho, delante; la espalda, detrás; las
 * mangas, en las dos; los costados del culote, en el suyo. Cada caja cae dentro de su silueta
 * (`sponsorZones.test.ts`).
 */
export const SPONSOR_ZONES: Readonly<
  Record<SponsorZone, { readonly views: readonly KitView[]; readonly boxes: readonly ZoneBox[] }>
> = {
  chest: { views: ['front'], boxes: [{ x: 14, y: 23, w: 20, h: 10 }] },
  back: { views: ['back'], boxes: [{ x: 14, y: 18, w: 20, h: 9 }] },
  sleeves: {
    views: ['front', 'back'],
    boxes: [
      { x: 10, y: 13, w: 3.5, h: 6, vertical: true },
      { x: 34.5, y: 13, w: 3.5, h: 6, vertical: true },
    ],
  },
  bibSides: {
    views: ['bib'],
    boxes: [
      { x: 11.65, y: 14, w: 2.7, h: 20, vertical: true },
      { x: 33.65, y: 14, w: 2.7, h: 20, vertical: true },
    ],
  },
}

/** La letra más pequeña que se pinta, también sobre un maillot: la `MIN_FONT_PX` de la web. */
export const KIT_TEXT_MIN_PX = 12
/** La mayúscula más ancha medida, la `W` a 600 de DejaVu Sans, en em (8-z). */
export const KIT_CAPITAL_EM = 1.07

/**
 * Las mayúsculas que caben en una caja a un tamaño, en el peor caso (8-z): 1,07 em por letra a 12 px, a
 * lo largo del ancho (del alto en `vertical`), y ninguna si lo otro no da los 12 px de la letra. Lo que se
 * pinta lo decide el ancho medido de cada texto (`fitsText`, en la web).
 */
export function zoneCapacity(box: ZoneBox, size: KitSize): number {
  const u = size / 48
  const along = (box.vertical ? box.h : box.w) * u
  const across = (box.vertical ? box.w : box.h) * u
  if (across < KIT_TEXT_MIN_PX) return 0
  return Math.floor(along / (KIT_CAPITAL_EM * KIT_TEXT_MIN_PX))
}

/** Lo que se le puede comprar al maillot (§9.9): un color, o una de las zonas con nombre (§8.10). */
export type KitZone = 'base' | 'secondary' | SponsorZone

export interface SponsorOffer {
  readonly zone: KitZone
  /** 'base' o 'secondary': el color del vocabulario más cercano al de su marca */
  readonly color?: KitColorName
  /** las zonas con nombre: el patrocinador de la lista cerrada (DD-19) */
  readonly sponsorId?: string
}

/**
 * El maillot con la oferta puesta; lanza si la zona no existe en ese maillot ('secondary' en un 'plain').
 * Una zona con nombre no cambia el `Kit`, el mismo objeto: el nombre del patrocinador viaja aparte (§9.9).
 */
export function applySponsor(kit: Kit, offer: SponsorOffer): Kit {
  if (offer.zone !== 'base' && offer.zone !== 'secondary') {
    if (offer.sponsorId === undefined)
      throw new Error(`applySponsor: la zona ${offer.zone} pide un patrocinador`)
    return kit
  }
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
export function nearestKitColor(hex: string, zone: 'base' | 'secondary'): KitColorName {
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
