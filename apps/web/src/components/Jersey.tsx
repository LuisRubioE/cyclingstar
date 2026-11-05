import { type RaceLeaders, jerseyOf } from '@cyclingstar/shared'
import { memo } from 'react'
import { LeaderJersey } from './ui/LeaderJersey'
import { jerseyStyle } from './visuals'

/**
 * La SILUETA del maillot: hombros, mangas y cuerpo. Una sola, compartida por el maillot de equipo y
 * por los maillots de líder, para que un maillot sea siempre la misma forma en toda la web.
 */
const TORSO =
  'M16 8 L10 12 L7 20 L12 23 L14 18 L14 40 Q24 43 34 40 L34 18 L36 23 L41 20 L38 12 L32 8 Q24 12 16 8 Z'

/**
 * Maillot procedural (#5): SVG determinista a partir de la semilla del equipo. Sin edición todavía
 * (el editor llegará con los equipos de jugador); por ahora da identidad visual a los equipos NPC.
 *
 * `data-kit` es lo que busca la comprobación 10 de la prueba del teléfono (E3, docs/visual.md §7.1;
 * 7-g): ninguno por debajo de 28 px. Desde el 17a los maillots de líder y de campeón son los del
 * catálogo (`ui/LeaderJersey.tsx` y `ui/ChampionJersey.tsx`), y desde el 17b no lo pinta ninguna página:
 * la identidad enseña el maillot vigente con `TeamJersey`, y el panel de las doce semillas se fue. Queda
 * como el dibujo de referencia que `ui/LegacyJersey.test.tsx` compara con `LegacyJersey`.
 */
export const Jersey = memo(function Jersey({ seed, size = 28 }: { seed: string; size?: number }) {
  const { base, secondary, accent, pattern } = jerseyStyle(seed)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Team jersey"
      className="shrink-0"
      data-kit="team"
    >
      {/* Torso del maillot: hombros, mangas y cuerpo. */}
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
      {/* Cuello. */}
      <path d="M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z" fill={accent} opacity="0.85" />
    </svg>
  )
})

/**
 * El maillot que lleva ESTE corredor, si lleva alguno. Es el atajo que usan todas las tablas: se
 * les pasa el juego de líderes de la clasificación que están enseñando y cada fila se marca sola.
 * Sin líderes (etapa 1, carrera de un día, carrera sin correr) no pinta nada.
 */
export function RiderJersey({
  leaders,
  riderId,
}: {
  leaders: RaceLeaders | undefined
  riderId: string
}) {
  const kind = jerseyOf(leaders, riderId)
  // desde el 17a, el `LeaderJersey` del catálogo, a 28 px (D-00b)
  return kind ? <LeaderJersey kind={kind} size={28} /> : null
}
