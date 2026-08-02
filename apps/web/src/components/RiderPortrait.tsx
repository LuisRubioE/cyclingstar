import { JERSEY_COLORS, SKIN_TONES, pickFrom, seededPicker } from './visuals'

/**
 * Retrato procedural del corredor (#6): avatar de ciclista (casco + gafas + maillot) derivado de
 * forma determinista del id. Da cara reconocible a cada corredor sin almacenar imágenes.
 */
export function RiderPortrait({ seed, size = 40 }: { seed: string; size?: number }) {
  const r = seededPicker(`face:${seed}`)
  const skin = pickFrom(SKIN_TONES, r())
  const helmet = pickFrom(JERSEY_COLORS, r())
  const jersey = pickFrom(JERSEY_COLORS, r())
  const bg = pickFrom(['#eef2ff', '#f0fdf4', '#fef2f2', '#fefce8', '#f0f9ff', '#faf5ff'], r())
  const stubble = r() > 0.6

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Rider portrait"
      className="shrink-0 rounded-full"
    >
      <rect width="48" height="48" fill={bg} />
      {/* Hombros / maillot. */}
      <path d="M8 48 Q8 36 24 36 Q40 36 40 48 Z" fill={jersey} />
      {/* Cuello y cara. */}
      <rect x="21" y="30" width="6" height="6" fill={skin} />
      <ellipse cx="24" cy="24" rx="9" ry="10" fill={skin} />
      {stubble && (
        <path d="M15 26 Q24 34 33 26 Q33 32 24 34 Q15 32 15 26 Z" fill="rgba(0,0,0,0.12)" />
      )}
      {/* Gafas de sol. */}
      <path d="M15 22 Q24 20 33 22 L33 24 Q29 27 24 26 Q19 27 15 24 Z" fill="rgba(15,23,42,0.85)" />
      {/* Casco. */}
      <path d="M13 21 Q13 9 24 9 Q35 9 35 21 Q30 16 24 16 Q18 16 13 21 Z" fill={helmet} />
      <path d="M13 21 Q24 18 35 21 L35 22 Q24 19 13 22 Z" fill="rgba(255,255,255,0.55)" />
      {/* Ventilaciones del casco. */}
      <rect x="20" y="12" width="2" height="4" rx="1" fill="rgba(0,0,0,0.18)" />
      <rect x="26" y="12" width="2" height="4" rx="1" fill="rgba(0,0,0,0.18)" />
    </svg>
  )
}
