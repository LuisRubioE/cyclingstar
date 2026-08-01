/**
 * Maillot paramétrico en SVG desde una semilla (SPEC 7.1). Puro y determinista: colores y patrón
 * salen del RNG sembrado, sin imitar identidades reales. Un tronco con mangas y un patrón simple
 * (liso, bandas, franja central o hombros), suficiente para distinguir equipos de un vistazo.
 */
import { seededRng } from '@cyclingstar/shared'

const PALETTE = [
  '#e11d48',
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#0f172a',
  '#ea580c',
  '#4d7c0f',
]
const PATTERNS = ['solid', 'bands', 'stripe', 'shoulders'] as const

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!
}

/** Silueta de maillot: dos mangas y un tronco, como un rectángulo con hombros. */
function jerseyPath(): string {
  // Coordenadas en un lienzo 0..100 x 0..120.
  return 'M30,18 L44,10 Q50,7 56,10 L70,18 L84,30 L74,44 L66,38 L66,110 Q50,116 34,110 L34,38 L26,44 L16,30 Z'
}

export function renderJerseySvg(seed: string, size = 96): string {
  const rng = seededRng(`jersey:${seed}`)
  const base = pick(PALETTE, rng)
  let accent = pick(PALETTE, rng)
  if (accent === base) accent = PALETTE[(PALETTE.indexOf(base) + 3) % PALETTE.length]!
  const pattern = pick(PATTERNS, rng)
  const clipId = `j${Math.floor(rng() * 1e6)}`

  const overlay =
    pattern === 'bands'
      ? `<rect x="0" y="40" width="100" height="14" fill="${accent}"/><rect x="0" y="66" width="100" height="14" fill="${accent}"/>`
      : pattern === 'stripe'
        ? `<rect x="42" y="0" width="16" height="120" fill="${accent}"/>`
        : pattern === 'shoulders'
          ? `<rect x="0" y="0" width="100" height="34" fill="${accent}"/>`
          : ''

  return [
    `<svg viewBox="0 0 100 120" width="${size}" height="${(size * 120) / 100}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Team jersey">`,
    `<defs><clipPath id="${clipId}"><path d="${jerseyPath()}"/></clipPath></defs>`,
    `<g clip-path="url(#${clipId})"><rect x="0" y="0" width="100" height="120" fill="${base}"/>${overlay}</g>`,
    `<path d="${jerseyPath()}" fill="none" stroke="#0f172a" stroke-opacity="0.25" stroke-width="2"/>`,
    `</svg>`,
  ].join('')
}
