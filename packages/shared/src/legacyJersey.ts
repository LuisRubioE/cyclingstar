/**
 * EL MAILLOT DE HOY, CONGELADO (E3, docs/visual.md §8.6; PR 9b; Rcodigo-055 y Rcodigo-068). Es el
 * `jerseyStyle` que pintaba la web (`apps/web/src/components/visuals.ts` l. 8-83, en `a71c673`), movido
 * aquí sin cambiar una cifra: sus 14 colores, sus cinco patrones, su FNV-1a de 32 bits y su xorshift32.
 *
 * Vive en `packages/shared`, fuera del barril y con su entrada en `exports`
 * (`@cyclingstar/shared/legacyJersey`, §3.9), porque lo necesitan dos lados: la web, que pinta con él lo
 * que se corrió antes de la traducción y, hasta el 17b, todas las equipaciones (`LegacyJersey`); y la
 * traducción de `packages/db` (16b), que busca para cada equipo el maillot nuevo más parecido a su aspecto
 * de hoy y no puede importar de la web. **No se cambia nunca**: lo grabado se pinta con esto, y
 * `legacyJersey.test.ts` lo compara con la tabla dorada que se sacó del de la web antes de moverlo.
 */

/** FNV-1a de 32 bits de una cadena, el de la web. */
function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** La secuencia de una semilla, en [0, 1]: xorshift32 desde su hash (o desde 1 si el hash es 0). */
function picker(seed: string): () => number {
  let state = hash(seed) || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0xffffffff
  }
}

function pick<T>(arr: readonly T[], r: number): T {
  const item = arr[Math.min(arr.length - 1, Math.floor(r * arr.length))]
  if (item === undefined) throw new Error('legacyJersey: una lista vacía')
  return item
}

/** Los 14 colores del maillot de hoy, en su orden: el orden es parte del sorteo. */
export const LEGACY_JERSEY_COLORS = [
  '#e11d48', // rose
  '#2563eb', // blue
  '#16a34a', // green
  '#f59e0b', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#db2777', // pink
  '#ea580c', // orange
  '#0d9488', // teal
  '#4f46e5', // indigo
  '#65a30d', // lime
  '#dc2626', // red
  '#1e293b', // slate (near-black)
  '#0ea5e9', // sky
] as const

export type LegacyJerseyPattern = 'solid' | 'band' | 'stripes' | 'panels' | 'shoulders'

/** Los cinco patrones, en su orden. */
export const LEGACY_JERSEY_PATTERNS: readonly LegacyJerseyPattern[] = [
  'solid',
  'band',
  'stripes',
  'panels',
  'shoulders',
]

export interface LegacyJerseyStyle {
  readonly base: string
  readonly secondary: string
  /** el cuello: blanco en todos */
  readonly accent: string
  readonly pattern: LegacyJerseyPattern
}

/**
 * Los estilos ya calculados, por semilla (E2, 10b, los arreglos): la barra de `Watch` pinta los mismos
 * maillots cuatro veces por segundo. El mismo objeto para la misma semilla.
 */
const styles = new Map<string, LegacyJerseyStyle>()

/** El aspecto de hoy de la semilla de un equipo: el color base, el segundo y el patrón. */
export function legacyJerseyStyle(seed: string): LegacyJerseyStyle {
  const hit = styles.get(seed)
  if (hit !== undefined) return hit
  const r = picker(seed)
  const base = pick(LEGACY_JERSEY_COLORS, r())
  let secondary: string = pick(LEGACY_JERSEY_COLORS, r())
  if (secondary === base) secondary = pick(LEGACY_JERSEY_COLORS, r())
  const style: LegacyJerseyStyle = {
    base,
    secondary,
    accent: '#ffffff',
    pattern: pick(LEGACY_JERSEY_PATTERNS, r()),
  }
  styles.set(seed, style)
  return style
}
