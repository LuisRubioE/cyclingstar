import { type Instant, type ProfileStrip as ProfileData, shownGroupsOf } from '@cyclingstar/shared'
import { type MouseEvent, memo, useMemo } from 'react'
import { type Cursor, climbAheadText, climbCatText } from '../../domain/broadcast/screen'
import { kmAtRatio } from './KmBar'

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
 *
 * Desde el PR 20 (E3, docs/visual.md §14.4; Ruso-039, 14-h): los colores son tokens (`line` el relieve,
 * `gold` los puertos, `ink-3` las volantes y los cursores, `accent` el de la cabeza y `gold` el del
 * espectador), y las cotas salen del dibujo. El dibujo es un `viewBox` de 600 que se pinta a 310 px a
 * 360, así que un `<text>` de dentro no llegaba a 12 px; las categorías y los números van en una capa
 * encima, un SVG sin `viewBox` con `x` e `y` en porcentaje, donde la letra se pinta a su tamaño.
 *
 * Desde W3 (la revisión de `Watch` del dueño, su punto 6; §8.5): con `onSeekKm`, el dibujo se toca y lleva
 * al km tocado, delante o detrás, como la barra de progreso. Solo para el puntero: para el lector y el
 * teclado sigue siendo una imagen, y su mando es la barra (`KmBar`), que hace lo mismo.
 */

const W = 600 // el ancho del dibujo; el alto, H: 6 a 1, unos 56 px de alto en un teléfono de 360
const H = 100
const TOP = 18 // sitio para las categorías y los números de los cursores
const BOTTOM = 96

/**
 * EL DIBUJO QUE NO SE MUEVE (10b, los arreglos; §18.5): la cota, los puertos con su categoría y las
 * volantes, una vez por etapa. Los cursores cambian a `barHz` y lo demás de la pantalla a `overlayHz`;
 * rehacer en cada pintura los caminos del perfil (un punto por km, y por medio km en los puertos) era
 * trabajo de más en cada commit de React, el que se juntaba con el estilo y la maquetación en las tareas
 * largas. Lo que se pinta es lo mismo.
 */
function reliefOf(profile: ProfileData, lengthKm: number) {
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
  const relief = (
    <>
      <path d={area} className="fill-line" />
      {profile.climbs.map((c) => (
        <path
          key={`${c.footKm}-${c.topKm}`}
          d={band(c.footKm, c.topKm)}
          className="fill-gold"
          fillOpacity={0.35}
        />
      ))}
      {profile.sprintsKm.map((km) => (
        <line
          key={km}
          x1={x(km)}
          x2={x(km)}
          y1={H}
          y2={y(km)}
          className="stroke-ink-3"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
      ))}
    </>
  )
  /** Las categorías en la cima de cada puerto, en porcentaje del dibujo (el alto, `H`, es 100). */
  const climbLabels = profile.climbs.map((c) => ({
    key: `${c.footKm}-${c.topKm}`,
    xPct: (x(c.topKm) / W) * 100,
    yPct: y(c.topKm),
    text: climbCatText(c.cat).replace('Cat. ', ''),
  }))
  return { x, y, relief, climbLabels }
}

/** El color de un cursor: el del espectador en `gold`, la cabeza en `accent` y los demás en `ink-3`. */
function cursorTone(c: Cursor): {
  readonly fill: string
  readonly stroke: string
  readonly label: string
} {
  if (c.own) return { fill: 'fill-gold', stroke: 'stroke-gold', label: 'fill-gold-ink' }
  if (c.number === 1) return { fill: 'fill-accent', stroke: 'stroke-accent', label: 'fill-accent' }
  return { fill: 'fill-ink-3', stroke: 'stroke-ink-3', label: 'fill-ink-3' }
}

/** Sin cambios en sus props (los cursores y la barra cambian a `barHz`), no se pinta otra vez (10b). */
export const ProfileStrip = memo(function ProfileStrip({
  profile,
  lengthKm,
  instant,
  clock,
  reducedMotion = false,
  cursors: given,
  onSeekKm,
}: {
  profile: ProfileData
  lengthKm: number
  instant: Instant
  clock: 'exact' | 'estimated'
  reducedMotion?: boolean
  /** los del reproductor, que siguen al grupo por su sucesor (`cursorsOf`) */
  cursors?: readonly Cursor[]
  /** un toque en un km del dibujo (W3); sin él, el perfil no se toca */
  onSeekKm?: (km: number) => void
}) {
  const { x, y, relief, climbLabels } = useMemo(
    () => reliefOf(profile, lengthKm),
    [profile, lengthKm],
  )
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
  const kmOf = (g: Cursor): number => (reducedMotion ? Math.floor(g.km) : g.km)
  return (
    <figure className="space-y-1">
      {/* el margen de arriba deja sitio a la cota de la cima más alta, que a 12 px sale del dibujo */}
      <div
        className={`relative mt-3${onSeekKm === undefined ? '' : ' cursor-pointer'}`}
        {...(onSeekKm === undefined
          ? {}
          : {
              'data-seek': 'km',
              onClick: (e: MouseEvent<HTMLDivElement>) => {
                // el dibujo va de la salida a la meta a todo el ancho: la proporción tocada es la del km
                const r = e.currentTarget.getBoundingClientRect()
                const km = kmAtRatio(
                  r.width > 0 ? (e.clientX - r.left) / r.width : Number.NaN,
                  lengthKm,
                )
                if (km !== null) onSeekKm(km)
              },
            })}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Stage profile, ${lengthKm.toFixed(1)} km`}
        >
          {relief}
          {cursors.map((g) => {
            const km = kmOf(g)
            const hollow = clock === 'estimated' && g.number > 1
            const tone = cursorTone(g)
            // se mueven a lo largo del perfil en 250 ms, salvo con menos movimiento (`transition-center`,
            // de index.css: solo `cx` y `cy`; sin style desde el PR 21n, ui/9)
            const motion = reducedMotion ? '' : ' transition-center duration-250 ease-linear'
            return (
              <circle
                key={g.key}
                data-cursor={g.ghost > 0 ? 'leaving' : g.number}
                cx={x(km)}
                cy={y(km)}
                r={g.own ? 6 : 5}
                className={`${hollow ? tone.stroke : `${tone.fill} ${tone.stroke}`}${motion}`}
                fill={hollow ? 'none' : undefined}
                fillOpacity={g.ghost > 0 ? 0.5 : 1}
                strokeWidth={2}
              />
            )
          })}
        </svg>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          {climbLabels.map((l) => (
            <text
              key={l.key}
              data-label="climb"
              x={`${l.xPct}%`}
              y={`${l.yPct}%`}
              dy={-4}
              textAnchor="middle"
              className="fill-gold-ink text-caption font-semibold"
            >
              {l.text}
            </text>
          ))}
          {cursors
            .filter((g) => g.ghost === 0)
            .map((g) => {
              const km = kmOf(g)
              return (
                <text
                  key={g.key}
                  data-label="cursor"
                  x={`${(x(km) / W) * 100}%`}
                  y={`${y(km)}%`}
                  dy={-7}
                  textAnchor="middle"
                  className={`${cursorTone(g).label} text-caption font-semibold tabular-nums`}
                >
                  {g.number}
                </text>
              )
            })}
        </svg>
      </div>
      {ahead !== null && <figcaption className="text-caption text-ink-2">{ahead}</figcaption>}
    </figure>
  )
})
