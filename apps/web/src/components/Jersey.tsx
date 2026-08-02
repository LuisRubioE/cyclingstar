import { jerseyStyle } from './visuals'

/**
 * Maillot procedural (#5): SVG determinista a partir de la semilla del equipo. Sin edición todavía
 * (el editor llegará con los equipos de jugador); por ahora da identidad visual a los equipos NPC.
 */
export function Jersey({ seed, size = 28 }: { seed: string; size?: number }) {
  const { base, secondary, accent, pattern } = jerseyStyle(seed)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Team jersey"
      className="shrink-0"
    >
      {/* Torso del maillot: hombros, mangas y cuerpo. */}
      <path
        d="M16 8 L10 12 L7 20 L12 23 L14 18 L14 40 Q24 43 34 40 L34 18 L36 23 L41 20 L38 12 L32 8 Q24 12 16 8 Z"
        fill={base}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1"
      />
      {pattern === 'band' && <rect x="14" y="24" width="20" height="6" fill={secondary} />}
      {pattern === 'stripes' && (
        <>
          <rect x="14" y="18" width="20" height="3" fill={secondary} />
          <rect x="14" y="26" width="20" height="3" fill={secondary} />
          <rect x="14" y="34" width="20" height="3" fill={secondary} />
        </>
      )}
      {pattern === 'panels' && (
        <>
          <path d="M14 18 L20 18 L20 40 Q17 39.5 14 40 Z" fill={secondary} />
          <path d="M34 18 L28 18 L28 40 Q31 39.5 34 40 Z" fill={secondary} />
        </>
      )}
      {pattern === 'shoulders' && (
        <>
          <path d="M16 8 L10 12 L7 20 L12 23 L14 18 Z" fill={secondary} />
          <path d="M32 8 L38 12 L41 20 L36 23 L34 18 Z" fill={secondary} />
        </>
      )}
      {/* Cuello. */}
      <path d="M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z" fill={accent} opacity="0.85" />
    </svg>
  )
}
