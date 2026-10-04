import type { Instant, ProfileStrip as ProfileData } from '@cyclingstar/shared'
import {
  type Cursor,
  climbAheadText,
  climbCatText,
  shownGroupsOf,
} from '../../domain/broadcast/screen'

/**
 * EL PERFIL CON CURSORES (docs/retransmision.md §6.2; [DOC 2]): la cota por km de la cabecera a todo
 * el ancho, con los puertos sombreados y su categoría en la cima y las volantes marcadas, y un cursor
 * por grupo en su km del instante (que nunca vuelve atrás, D-04) con su número de carretera; el del
 * espectador, resaltado. Debajo, siempre, el puerto que viene. Ninguna marca de dónde pasa algo (§6.9).
 *
 * Con el reloj estimado del adaptador de la radio (§3.8), el cursor de todo grupo que no es la cabeza
 * va hueco, sin relleno: su posición es estimada. Con `prefers-reduced-motion`, los cursores saltan de
 * km en km sin animarse (D-57).
 *
 * Desde el 6a, los cursores siguen al grupo por su sucesor (D-03): los da el reproductor
 * (`cursorsOf`), con su identidad en pantalla como clave, así que un cambio de etiqueta no cambia de
 * cursor y una fuga cazada se funde con el de su cazador en lugar de desaparecer (ese cursor que se va
 * se pinta sin número). Sin ellos, un cursor por grupo con alguien dentro (`shownGroupsOf`).
 *
 * El componente y el tipo comparten nombre (§6.1): el tipo se importa con alias.
 */

const W = 600 // el ancho del dibujo; el alto, H: 6 a 1, unos 56 px de alto en un teléfono de 360
const H = 100
const TOP = 18 // sitio para las categorías y los números de los cursores
const BOTTOM = 96

export function ProfileStrip({
  profile,
  lengthKm,
  instant,
  clock,
  reducedMotion = false,
  cursors: given,
}: {
  profile: ProfileData
  lengthKm: number
  instant: Instant
  clock: 'exact' | 'estimated'
  reducedMotion?: boolean
  /** los del reproductor, que siguen al grupo por su sucesor (`cursorsOf`) */
  cursors?: readonly Cursor[]
}) {
  const alt = profile.altM.length > 0 ? profile.altM : [0, 0]
  const lo = Math.min(...alt)
  const hi = Math.max(...alt)
  const span = Math.max(50, hi - lo)
  const x = (km: number): number => (Math.min(Math.max(km, 0), lengthKm) / lengthKm) * W
  /** La cota en un km, entre las dos de la cabecera. */
  const altAt = (km: number): number => {
    const k = Math.min(Math.max(km, 0), alt.length - 1)
    const a = Math.floor(k)
    const f = k - a
    return (alt[a] ?? lo) * (1 - f) + (alt[Math.min(a + 1, alt.length - 1)] ?? lo) * f
  }
  const y = (km: number): number => BOTTOM - ((altAt(km) - lo) / span) * (BOTTOM - TOP)
  const lastKm = Math.min(lengthKm, alt.length - 1)
  const ridge: string[] = []
  for (let k = 0; k <= Math.floor(lastKm); k++) ridge.push(`${x(k).toFixed(1)},${y(k).toFixed(1)}`)
  ridge.push(`${x(lengthKm).toFixed(1)},${y(lastKm).toFixed(1)}`)
  const area = `M0,${H} L${ridge.join(' L')} L${W},${H} Z`
  /** El tramo del perfil entre dos km, cerrado contra el suelo. */
  const band = (from: number, to: number): string => {
    const pts: string[] = []
    for (let k = from; k < to; k += 0.5) pts.push(`${x(k).toFixed(1)},${y(k).toFixed(1)}`)
    pts.push(`${x(to).toFixed(1)},${y(to).toFixed(1)}`)
    return `M${x(from).toFixed(1)},${H} L${pts.join(' L')} L${x(to).toFixed(1)},${H} Z`
  }
  const ahead = climbAheadText(profile, instant.headKm)
  const drawn: readonly Cursor[] =
    given ??
    shownGroupsOf(instant).map((g) => ({
      key: String(g.g),
      g: g.g,
      km: g.km,
      number: g.number,
      own: g.own,
      ghost: 0,
    }))
  // de detrás a delante, para que la cabeza se pinte encima; los que se van, debajo de todo
  const cursors = [...drawn].sort((a, b) =>
    a.ghost !== b.ghost ? b.ghost - a.ghost : b.number - a.number,
  )
  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Stage profile, ${lengthKm.toFixed(1)} km`}
      >
        <path d={area} fill="#e2e8f0" />
        {profile.climbs.map((c) => (
          <g key={`${c.footKm}-${c.topKm}`}>
            <path d={band(c.footKm, c.topKm)} fill="#fcd34d" fillOpacity={0.55} />
            <text
              x={x(c.topKm)}
              y={Math.max(9, y(c.topKm) - 4)}
              fontSize={9}
              textAnchor="middle"
              fill="#92400e"
            >
              {climbCatText(c.cat).replace('Cat. ', '')}
            </text>
          </g>
        ))}
        {profile.sprintsKm.map((km) => (
          <line
            key={km}
            x1={x(km)}
            x2={x(km)}
            y1={H}
            y2={y(km)}
            stroke="#059669"
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        ))}
        {cursors.map((g) => {
          const km = reducedMotion ? Math.floor(g.km) : g.km
          const color = g.own ? '#06b6d4' : g.number === 1 ? '#4f46e5' : '#475569'
          const hollow = clock === 'estimated' && g.number > 1
          const motion = reducedMotion
            ? undefined
            : { transition: 'cx 0.25s linear, cy 0.25s linear' }
          return (
            <g key={g.key}>
              <circle
                data-cursor={g.ghost > 0 ? 'leaving' : g.number}
                cx={x(km)}
                cy={y(km)}
                r={g.own ? 6 : 5}
                fill={hollow ? 'none' : color}
                fillOpacity={g.ghost > 0 ? 0.5 : 1}
                stroke={color}
                strokeWidth={2}
                style={motion}
              />
              {g.ghost === 0 && (
                <text
                  x={x(km)}
                  y={Math.max(8, y(km) - 8)}
                  fontSize={8}
                  textAnchor="middle"
                  fill={color}
                >
                  {g.number}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {ahead !== null && <figcaption className="text-xs text-slate-500">{ahead}</figcaption>}
    </figure>
  )
}
