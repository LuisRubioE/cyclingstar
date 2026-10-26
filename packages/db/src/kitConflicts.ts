import { createHash } from 'node:crypto'
import {
  CHAMPION_RAINBOW,
  CHAMPION_SILVER,
  CHAMPION_STAR_EDGE,
  COLLAR,
  COUNTRIES,
  type JerseyKind,
  KIT_CHECK_SIZES,
  KIT_CODES,
  KIT_COLORS,
  KIT_CONTRAST_MIN,
  KIT_FIGURE_PATHS,
  KIT_MIN_DISTANCE,
  type KitCode,
  LEADER_DOTS,
  LEADER_JERSEY,
  LOGO_STAR,
  NATIONAL_FLAG_BOX,
  TORSO,
  WORLD_STAR,
  canonicalKit,
  parseKit,
} from '@cyclingstar/shared'
import { VISIONS, type View, type Vision, distance } from '@cyclingstar/shared/colorMath'
import { QUAD_SEGMENTS } from '@cyclingstar/shared/kitGeometry'
import { FLAG_CELL_PIXELS } from './flagCells.generated.js'
import {
  COLLAR_PAINT,
  KIT_EDGE,
  KIT_SUPERSAMPLE,
  type KitDrawing,
  type KitRaster,
  LEADER_EDGE,
  kitRaster,
  rasterDistance,
} from './kitDistance.js'

/**
 * LA TABLA DE CHOQUES (E3, docs/visual.md §8.4; I-07, D-24, punto 2; PR 16a). Para cada uno de los 1.105
 * códigos del vocabulario: si pasa la regla de contraste, qué señal reserva su dibujo (un líder, el
 * mundial, el continental o un nacional) y qué maillots permitidos le quedan a menos de 10, con su peor
 * visión. La escribe `buildKitConflicts` en `kitConflicts.generated.ts`, y `checkKit` y la traducción la
 * consultan sin rasterizar nunca en una petición.
 *
 * Todo a 28 px (`KIT_CHECK_SIZES`). Reserva un maillot quedar a menos de `KIT_MIN_DISTANCE` de una señal
 * en alguna de las cuatro visiones, y de un líder también en grises (8-q): entre un líder y un equipo
 * solo separa el color, porque el amarillo es liso como `plain` y el verde lleva la banda de `band`.
 *
 * `kitConflicts.test.ts` mira cada vez que la huella de la geometría es la de hoy y recalcula 50 entradas;
 * de noche, con `CS_BANCOS=1`, la tabla entera. Con `KIT_CONFLICTS_WRITE=1` la reescribe.
 */

/** Una señal que ningún maillot de equipo puede parecer (§8.1, §9). */
export interface KitSignal {
  /** 'leader:gc' | 'leader:points' | 'leader:kom' | 'champion:world' | 'champion:continental' | 'champion:<ISO-2>' */
  readonly id: string
  readonly drawing: KitDrawing
  /** los líderes cuentan también en grises (8-q) */
  readonly grayCounts: boolean
}

const LEADER_ORDER: readonly JerseyKind[] = ['gc', 'points', 'kom']

/** Las 138: los tres líderes, el mundial, el continental y los 133 nacionales, en este orden. */
export const KIT_SIGNALS: readonly KitSignal[] = [
  ...LEADER_ORDER.map((jersey): KitSignal => ({
    id: `leader:${jersey}`,
    drawing: { kind: 'leader', jersey },
    grayCounts: true,
  })),
  { id: 'champion:world', drawing: { kind: 'world' }, grayCounts: false },
  { id: 'champion:continental', drawing: { kind: 'continental' }, grayCounts: false },
  ...COUNTRIES.map((c) => c.code)
    .sort()
    .map((country): KitSignal => ({
      id: `champion:${country}`,
      drawing: { kind: 'national', country },
      grayCounts: false,
    })),
]

/** Lo que dice la tabla de un código. */
export interface KitConflictEntry {
  /** base y segundo color a `KIT_CONTRAST_MIN` o más en las cinco vistas */
  readonly contrastOk: boolean
  /** la señal que lo reserva, o null */
  readonly reserved: string | null
  /** los permitidos a menos de `KIT_MIN_DISTANCE` en alguna de las cuatro visiones, con la peor */
  readonly near: readonly (readonly [KitCode, Vision])[]
}

export interface KitConflictTable {
  readonly conflicts: Readonly<Record<KitCode, KitConflictEntry>>
  readonly allowed: readonly KitCode[]
  readonly geometryHash: string
}

const SIZE = KIT_CHECK_SIZES[0]
const ALL_VIEWS: readonly View[] = [...VISIONS, 'gray']

/** La regla de contraste (I-25): la base y el segundo color, a 20 o más en las cinco vistas. */
export function kitContrastOk(code: KitCode): boolean {
  const kit = parseKit(code)
  if (kit === null) return false
  if (kit.figure === 'plain') return true
  const [a, b] = [KIT_COLORS[kit.base], KIT_COLORS[kit.secondary]]
  return ALL_VIEWS.every((v) => distance(a, b, v) >= KIT_CONTRAST_MIN)
}

const kitDrawing = (code: KitCode): KitDrawing => ({ kind: 'kit', code })

/** La menor de las cuatro visiones y cuál es. */
function worstVision(a: KitRaster, b: KitRaster): { d: number; vision: Vision } {
  let best = { d: Number.POSITIVE_INFINITY, vision: 'normal' as Vision }
  for (const vision of VISIONS) {
    const d = rasterDistance(a, b, vision)
    if (d < best.d) best = { d, vision }
  }
  return best
}

/**
 * La señal que reserva un maillot, o null, en el orden en que la cuenta el diseño: un líder en las cuatro
 * visiones, un líder en grises, el mundial o el continental, y un nacional; dentro de cada una, la más
 * cercana.
 */
export function kitReservedBy(code: KitCode): string | null {
  const kit = kitRaster(kitDrawing(code), SIZE)
  const tiers: { d: number; id: string }[][] = [[], [], [], []]
  for (const signal of KIT_SIGNALS) {
    const s = kitRaster(signal.drawing, SIZE)
    const { d } = worstVision(kit, s)
    const tier = signal.id.startsWith('leader:')
      ? 0
      : signal.id === 'champion:world' || signal.id === 'champion:continental'
        ? 2
        : 3
    if (d < KIT_MIN_DISTANCE) tiers[tier]!.push({ d, id: signal.id })
    if (signal.grayCounts) {
      const g = rasterDistance(kit, s, 'gray')
      if (g < KIT_MIN_DISTANCE) tiers[1]!.push({ d: g, id: signal.id })
    }
  }
  for (const tier of tiers) {
    if (tier.length === 0) continue
    tier.sort((a, b) => a.d - b.d || a.id.localeCompare(b.id))
    return tier[0]!.id
  }
  return null
}

/** Los permitidos a menos de 10 de un código, con su peor visión, en el orden de `allowed`. */
export function kitNear(
  code: KitCode,
  allowed: readonly KitCode[],
): readonly (readonly [KitCode, Vision])[] {
  const kit = kitRaster(kitDrawing(code), SIZE)
  const out: (readonly [KitCode, Vision])[] = []
  for (const other of allowed) {
    if (other === code) continue
    const { d, vision } = worstVision(kit, kitRaster(kitDrawing(other), SIZE))
    if (d < KIT_MIN_DISTANCE) out.push([other, vision])
  }
  return out
}

/** La entrada de un código, calculada de nuevo contra los permitidos que se le den. */
export function kitConflictEntry(code: KitCode, allowed: readonly KitCode[]): KitConflictEntry {
  if (!kitContrastOk(code)) return { contrastOk: false, reserved: null, near: [] }
  return { contrastOk: true, reserved: kitReservedBy(code), near: kitNear(code, allowed) }
}

/**
 * La huella de todo lo que decide la tabla: la geometría, los colores, el filete, el cuello, las 138
 * señales con las celdas de las banderas, el tamaño, el supermuestreo y los dos umbrales. Una figura
 * retocada sin regenerar la tabla hace caer `kitConflicts.test.ts`.
 */
export function kitGeometryHash(): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        size: SIZE,
        supersample: KIT_SUPERSAMPLE,
        quadSegments: QUAD_SEGMENTS,
        torso: TORSO,
        collar: COLLAR,
        figures: KIT_FIGURE_PATHS,
        colors: KIT_COLORS,
        kitEdge: KIT_EDGE,
        leaderEdge: LEADER_EDGE,
        collarPaint: COLLAR_PAINT,
        leaders: LEADER_JERSEY,
        leaderDots: LEADER_DOTS,
        logoStar: LOGO_STAR,
        worldStar: WORLD_STAR,
        rainbow: CHAMPION_RAINBOW,
        starEdge: CHAMPION_STAR_EDGE,
        silver: CHAMPION_SILVER,
        flagBox: NATIONAL_FLAG_BOX,
        flagCells: FLAG_CELL_PIXELS.sha256,
        signals: KIT_SIGNALS.map((s) => s.id),
        minDistance: KIT_MIN_DISTANCE,
        contrastMin: KIT_CONTRAST_MIN,
      }),
    )
    .digest('hex')
}

/** La tabla entera: de 1 a 2 minutos (§8.4), por eso se genera y no se calcula al arrancar. */
export function buildKitConflicts(): KitConflictTable {
  const contrast = KIT_CODES.filter(kitContrastOk)
  const reserved = new Map(contrast.map((code) => [code, kitReservedBy(code)] as const))
  const allowed = contrast.filter((code) => reserved.get(code) === null)
  const allowedSet = new Set(allowed)
  const near = new Map<KitCode, (readonly [KitCode, Vision])[]>(contrast.map((c) => [c, []]))
  // los pares, una vez cada uno: si los dos están reservados, no le importan a nadie
  for (const [i, a] of contrast.entries()) {
    const ra = kitRaster(kitDrawing(a), SIZE)
    for (const b of contrast.slice(i + 1)) {
      if (!allowedSet.has(a) && !allowedSet.has(b)) continue
      const { d, vision } = worstVision(ra, kitRaster(kitDrawing(b), SIZE))
      if (d >= KIT_MIN_DISTANCE) continue
      if (allowedSet.has(b)) near.get(a)!.push([b, vision])
      if (allowedSet.has(a)) near.get(b)!.push([a, vision])
    }
  }
  const order = new Map(allowed.map((code, i) => [code, i]))
  const conflicts = Object.fromEntries(
    KIT_CODES.map((code) => {
      if (!reserved.has(code)) return [code, { contrastOk: false, reserved: null, near: [] }]
      const list = near.get(code)!.sort((x, y) => order.get(x[0])! - order.get(y[0])!)
      return [code, { contrastOk: true, reserved: reserved.get(code) ?? null, near: list }]
    }),
  ) as Record<KitCode, KitConflictEntry>
  return { conflicts, allowed, geometryHash: kitGeometryHash() }
}

/** Cuántos permitidos y cuántos maillots distintos, contando cada `halves` y su espejo como uno. */
export function kitAllowedCounts(allowed: readonly KitCode[]): {
  allowed: number
  distinct: number
} {
  return { allowed: allowed.length, distinct: new Set(allowed.map(canonicalKit)).size }
}

const VISION_LETTER: Record<Vision, string> = { normal: 'n', protan: 'p', deutan: 'd', tritan: 't' }

/**
 * El fichero de la tabla. Compacto, porque son miles de vecinos: cada entrada es una cadena,
 * `<contraste>|<señal>|<vecino>:<visión>,…`, que `kitConflicts.generated.ts` lee al cargar.
 */
export function kitConflictsSource(table: KitConflictTable): string {
  const { allowed, distinct } = kitAllowedCounts(table.allowed)
  const rows = KIT_CODES.map((code) => {
    const e = table.conflicts[code]
    const near = e.near.map(([c, v]) => `${c}:${VISION_LETTER[v]}`).join(',')
    return `  '${code}|${e.contrastOk ? 1 : 0}|${e.reserved ?? ''}|${near}',`
  })
  return `/**
 * GENERADO por \`buildKitConflicts\` (\`packages/db/src/kitConflicts.ts\`): no se edita a mano (E3,
 * docs/visual.md §8.4; PR 16a). Se reescribe con
 *
 *   KIT_CONFLICTS_WRITE=1 pnpm exec vitest run packages/db/src/kitConflicts.test.ts
 *
 * ${KIT_CODES.length} códigos; ${allowed} permitidos, ${distinct} distintos.
 */

import type { KitCode } from '@cyclingstar/shared'
import type { Vision } from '@cyclingstar/shared/colorMath'
import type { KitConflictEntry } from './kitConflicts.js'

/** La huella de la geometría con que se hizo (\`kitGeometryHash\`). */
export const KIT_GEOMETRY_HASH = '${table.geometryHash}'

/** Cada código: \`<código>|<contraste 1 o 0>|<señal que lo reserva>|<vecino>:<visión n, p, d o t>,…\`. */
const ROWS: readonly string[] = [
${rows.join('\n')}
]

const VISION: Readonly<Record<string, Vision>> = { n: 'normal', p: 'protan', d: 'deutan', t: 'tritan' }

/** La tabla de choques: una entrada por código. */
export const KIT_CONFLICTS: Readonly<Record<KitCode, KitConflictEntry>> = Object.fromEntries(
  ROWS.map((row) => {
    const [code, contrast, reserved, near] = row.split('|') as [KitCode, string, string, string]
    const entry: KitConflictEntry = {
      contrastOk: contrast === '1',
      reserved: reserved === '' ? null : reserved,
      near:
        near === ''
          ? []
          : near.split(',').map((n) => {
              const [c, v] = n.split(':') as [KitCode, string]
              return [c, VISION[v]!] as const
            }),
    }
    return [code, entry]
  }),
) as Record<KitCode, KitConflictEntry>

/** Los permitidos: pasan el contraste y no los reserva ninguna señal. */
export const KIT_ALLOWED: readonly KitCode[] = [
${table.allowed.map((c) => `  '${c}',`).join('\n')}
]
`
}
