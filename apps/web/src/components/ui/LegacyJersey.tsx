import type { KitSize } from '@cyclingstar/shared'
import { legacyJerseyStyle } from '@cyclingstar/shared/legacyJersey'
import { memo } from 'react'

/**
 * EL MAILLOT DE HOY, CONGELADO (E3, docs/visual.md §8.6; PR 9b; Rcodigo-055 y Rcodigo-068). El dibujo de
 * `Jersey` (`components/Jersey.tsx` l. 17-54) sin cambiar su aspecto, con el estilo de
 * `legacyJerseyStyle`: lo pintan `RiderLabel` hasta el 17a y, para siempre, lo que se corrió antes de la
 * traducción, que no se repinta (O-21). A 28 px o más, como todos (`KitSize`, D-00b), y con `data-kit`,
 * que es lo que busca la comprobación 10 de la prueba del teléfono. Con el nombre del equipo, el lector
 * lo dice (`Mistral Racing kit`, §9.10); sin él, `Team jersey`, como hoy.
 */

/** La silueta de todos los maillots de hoy: hombros, mangas y cuerpo, en el `viewBox` de 48. */
const TORSO =
  'M16 8 L10 12 L7 20 L12 23 L14 18 L14 40 Q24 43 34 40 L34 18 L36 23 L41 20 L38 12 L32 8 Q24 12 16 8 Z'

export interface LegacyJerseyProps {
  /** la semilla del dibujo: `coalesce(jersey_style_seed, jersey_seed)` (§8.9) */
  readonly seed: string
  readonly size: KitSize
  /** el nombre del equipo, para el lector */
  readonly team?: string
}

export const LegacyJersey = memo(function LegacyJersey({ seed, size, team }: LegacyJerseyProps) {
  const { base, secondary, accent, pattern } = legacyJerseyStyle(seed)
  return (
    <svg
      data-ui="LegacyJersey"
      data-variant={pattern}
      data-state="ready"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={team === undefined ? 'Team jersey' : `${team} kit`}
      className="shrink-0"
      data-kit="team"
    >
      <path d={TORSO} fill={base} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
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
      <path d="M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z" fill={accent} opacity="0.85" />
    </svg>
  )
})
