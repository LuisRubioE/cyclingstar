/**
 * Utilidades de identidad visual determinista (#5 maillots, #6 retratos). A partir de una semilla
 * (jerseySeed de un equipo, id de un corredor) se derivan colores y variantes de forma estable, de
 * modo que el mismo equipo/corredor siempre se ve igual, sin guardar nada.
 */

/** Hash entero estable (FNV-1a de 32 bits) de una cadena. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Generador determinista de enteros a partir de una semilla (secuencia estable). */
export function seededPicker(seed: string): () => number {
  let state = hashSeed(seed) || 1
  return () => {
    // xorshift32
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0xffffffff
  }
}

export function pickFrom<T>(arr: readonly T[], r: number): T {
  return arr[Math.min(arr.length - 1, Math.floor(r * arr.length))]!
}

/** Paleta de colores de maillot, vivos y con buen contraste. */
export const JERSEY_COLORS = [
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

/** Tonos de piel para los retratos. */
export const SKIN_TONES = ['#f2d3b6', '#e8b895', '#d29d78', '#a9714f', '#7b4b2e'] as const

export type JerseyPattern = 'solid' | 'band' | 'stripes' | 'panels' | 'shoulders'
export const JERSEY_PATTERNS: JerseyPattern[] = ['solid', 'band', 'stripes', 'panels', 'shoulders']

export interface JerseyStyle {
  base: string
  secondary: string
  accent: string
  pattern: JerseyPattern
}

/** Estilo de maillot determinista a partir de la semilla del equipo. */
export function jerseyStyle(seed: string): JerseyStyle {
  const r = seededPicker(seed)
  const base = pickFrom(JERSEY_COLORS, r())
  let secondary = pickFrom(JERSEY_COLORS, r())
  if (secondary === base) secondary = pickFrom(JERSEY_COLORS, r())
  const accent = '#ffffff'
  const pattern = pickFrom(JERSEY_PATTERNS, r())
  return { base, secondary, accent, pattern }
}
