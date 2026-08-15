import { JERSEY_LABEL, type JerseyKind, type RaceLeaders, jerseyOf } from '@cyclingstar/shared'
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
}

/**
 * EL COLOR Y LA MARCA DE CADA MAILLOT DE LÍDER.
 *
 * EL COLOR NO PUEDE SER LO ÚNICO QUE LOS DISTINGA. Amarillo, verde y azul son justo el trío que peor
 * separa una deuteranopia o una protanopia (el 8 % de los hombres), y a 14 px un icono de color sin
 * más es indistinguible. Así que cada maillot lleva además una MARCA de forma, que se lee igual en
 * escala de grises:
 *
 * - amarillo (general): liso, sin nada. Es el importante y el que más se ve.
 * - verde (puntos): una banda horizontal en el pecho.
 * - azul (montaña): lunares, la marca universal del maillot de escalador.
 *
 * Y la tercera vía, la que de verdad cierra el asunto: TEXTO. Cada maillot es un `role="img"` con
 * `aria-label` («Race leader», «Points leader», «Mountains leader») para el lector de pantalla, y
 * un `<title>` con el mismo texto, que los navegadores enseñan como globo al pasar el ratón. Nadie
 * tiene que adivinar un color.
 */
const LEADER_JERSEY: Record<JerseyKind, { base: string; mark: string; pattern: string }> = {
  gc: { base: '#facc15', mark: '#facc15', pattern: 'plain' },
  points: { base: '#16a34a', mark: '#bbf7d0', pattern: 'band' },
  kom: { base: '#2563eb', mark: '#ffffff', pattern: 'dots' },
}

/** Los lunares del maillot de la montaña, en la misma rejilla del torso. */
const DOTS: readonly [number, number][] = [
  [19, 22],
  [29, 22],
  [24, 29],
  [19, 36],
  [29, 36],
]

/**
 * Maillot de líder: la misma silueta que el de equipo, en color plano. Pequeño y alineado con el
 * texto, para que quepa dentro de una frase de la crónica y en una fila de tabla sin desmontarla.
 */
export function LeaderJersey({
  kind,
  size = 15,
  className = '',
}: {
  kind: JerseyKind
  size?: number
  className?: string
}) {
  const { base, mark, pattern } = LEADER_JERSEY[kind]
  const label = JERSEY_LABEL[kind]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={label}
      className={`inline-block shrink-0 align-text-bottom ${className}`}
    >
      <title>{label}</title>
      <path d={TORSO} fill={base} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
      {pattern === 'band' && <rect x="14" y="25" width="20" height="7" fill={mark} />}
      {pattern === 'dots' &&
        DOTS.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" fill={mark} />)}
    </svg>
  )
}

/**
 * El maillot que lleva ESTE corredor, si lleva alguno. Es el atajo que usan todas las tablas: se
 * les pasa el juego de líderes de la clasificación que están enseñando y cada fila se marca sola.
 * Sin líderes (etapa 1, carrera de un día, carrera sin correr) no pinta nada.
 */
export function RiderJersey({
  leaders,
  riderId,
  className = 'mr-1',
}: {
  leaders: RaceLeaders | undefined
  riderId: string
  className?: string
}) {
  const kind = jerseyOf(leaders, riderId)
  return kind ? <LeaderJersey kind={kind} className={className} /> : null
}
