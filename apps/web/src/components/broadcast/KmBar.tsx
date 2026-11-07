import { BROADCAST } from '@cyclingstar/shared'
import { type KeyboardEvent, type MouseEvent, useRef } from 'react'

/**
 * LA BARRA DE PROGRESO EN KM (docs/retransmision.md §8.5, D-20; W3, la revisión de `Watch` del dueño, su
 * punto 6: «hacer clic en un punto e ir para alante o para atrás»). E2 la diseñó y nunca se construyó: va en
 * km, uniforme, con marcas solo del recorrido (los puertos, de su pie a su cima, y las volantes, de
 * `ProfileStrip`), la cabeza pintada y, más claro, lo alcanzado; nunca un suceso ni la duración, que dirían
 * dónde pasa algo o cuánto queda (D-17). Tocarla en un km lleva a él: delante, como un salto; detrás, como
 * `−5 km` a ese km (lo decide `kmSeekOf`, en el reproductor). Es un `slider` para el lector y el teclado:
 * las flechas mueven `seekStepKm`, Inicio va a la salida y Fin al último km, que ningún salto cruza (8-j);
 * desde el último km, o tras la meta, Fin se queda donde está.
 *
 * Con los mandos escondidos, el primer toque solo los enseña, como en el reproductor de vídeo de un
 * teléfono (`tapSeeks`): la barra es el objetivo más ancho de esa zona y no salta sin verse. Tras un toque
 * no se queda con el foco, para que los mandos se vuelvan a esconder (8-p habla del foco del teclado).
 *
 * Sin `style` (ui/9): un SVG sin `viewBox`, con los km en porcentaje en sus atributos, como las cotas del
 * perfil. Mide 44 px de alto para el dedo; la barra que se ve, 6.
 */

/** El km de un toque, por la proporción del ancho tocada, recortada a la etapa; null si no es un número. */
export function kmAtRatio(ratio: number, lengthKm: number): number | null {
  if (!Number.isFinite(ratio)) return null
  return Math.min(Math.max(ratio, 0), 1) * lengthKm
}

/**
 * El km de una tecla del slider (§8.5, 8-p): las flechas, `seekStepKm`; Inicio, 0; Fin, el último km, o
 * donde está la cabeza si ya lo ha pasado: Fin nunca vuelve atrás.
 */
export function kmForKey(key: string, headKm: number, lengthKm: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return headKm + BROADCAST.seekStepKm
    case 'ArrowLeft':
    case 'ArrowDown':
      return Math.max(0, headKm - BROADCAST.seekStepKm)
    case 'Home':
      return 0
    case 'End':
      return Math.max(headKm, lengthKm - 1, 0)
    default:
      return null
  }
}

/**
 * ¿Salta un toque? Con la barra encendida, con los mandos a la vista cuando el dedo bajó (si no, el toque
 * solo los enseña) y con un puntero de verdad: un clic sin él (`detail` 0, el de un lector de pantalla o
 * uno programado) caería en el centro de la barra, y el lector la mueve con sus propias acciones.
 */
export function tapSeeks(enabled: boolean, armedAtDown: boolean, detail: number): boolean {
  return enabled && armedAtDown && detail > 0
}

export interface KmBarClimb {
  readonly footKm: number
  readonly topKm: number
}

export function KmBar({
  lengthKm,
  headKm,
  reachedKm,
  climbs,
  sprintsKm,
  enabled,
  armed = true,
  describedBy,
  onSeekKm,
}: {
  lengthKm: number
  /** el km pintado de la cabeza */
  headKm: number
  /** el de la cabeza en lo alcanzado (tras volver atrás, por delante de lo pintado) */
  reachedKm: number
  /** los puertos del recorrido, de `ProfileStrip` */
  climbs: readonly KmBarClimb[]
  /** las volantes, de `ProfileStrip` */
  sprintsKm: readonly number[]
  /** se puede tocar (`kmSeekable`); apagada, se oye y no hace nada */
  enabled: boolean
  /** los mandos a la vista: con ellos escondidos, el primer toque solo los enseña */
  armed?: boolean
  /** la leyenda que la explica, en el cierre */
  describedBy?: string
  /** el km tocado o tecleado: el reproductor decide si es un salto, volver atrás o nada */
  onSeekKm: (km: number) => void
}) {
  const length = lengthKm > 0 ? lengthKm : 1
  const clamp = (km: number): number => Math.min(Math.max(km, 0), length)
  const pct = (km: number): string => `${(clamp(km) / length) * 100}%`
  const head = clamp(headKm)
  const reached = Math.max(head, clamp(reachedKm))
  // cómo estaban los mandos cuando bajó el dedo: el toque que los enseña llega a la página antes del clic
  const armedAtDown = useRef(true)
  const onClick = (e: MouseEvent<HTMLDivElement>): void => {
    const seeks = tapSeeks(enabled, armedAtDown.current, e.detail)
    armedAtDown.current = true
    if (!seeks) return
    const r = e.currentTarget.getBoundingClientRect()
    const km = kmAtRatio(r.width > 0 ? (e.clientX - r.left) / r.width : Number.NaN, length)
    if (km !== null) onSeekKm(km)
    e.currentTarget.blur()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const km = kmForKey(e.key, head, length)
    if (km === null) return
    // las flechas son del slider: ni la página las lee como `−5 km` y `+5 km` otra vez, ni hacen scroll
    e.preventDefault()
    e.stopPropagation()
    if (enabled && !e.repeat) onSeekKm(km)
  }
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Stage progress"
      aria-valuemin={0}
      aria-valuemax={Math.round(length)}
      aria-valuenow={Math.round(head)}
      aria-valuetext={`${Math.round(head)} of ${Math.round(length)} km`}
      aria-disabled={enabled ? undefined : true}
      aria-describedby={describedBy}
      data-bar="km"
      className={`relative block h-11 w-full rounded-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
        enabled ? 'cursor-pointer' : 'cursor-default'
      }`}
      onPointerDown={() => {
        armedAtDown.current = armed
      }}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
        {/* la carretera entera; encima, los puertos, de su pie a su cima */}
        <rect x="0" y="19" width="100%" height="6" rx="3" className="fill-line" />
        {climbs.map((c) => (
          <rect
            key={`${c.footKm}-${c.topKm}`}
            data-mark="climb"
            x={pct(c.footKm)}
            width={`${((clamp(c.topKm) - clamp(c.footKm)) / length) * 100}%`}
            y="12"
            height="4"
            rx="2"
            className="fill-gold"
          />
        ))}
        {/* lo alcanzado, más claro, y la cabeza encima */}
        <rect
          data-fill="reached"
          x="0"
          y="19"
          width={pct(reached)}
          height="6"
          rx="3"
          className="fill-ink-3"
          fillOpacity={0.5}
        />
        <rect
          data-fill="head"
          x="0"
          y="19"
          width={pct(head)}
          height="6"
          rx="3"
          className="fill-accent"
        />
        {sprintsKm.map((km) => (
          <line
            key={km}
            data-mark="sprint"
            x1={pct(km)}
            x2={pct(km)}
            y1="15"
            y2="29"
            className="stroke-ink-2"
            strokeWidth={1.5}
          />
        ))}
        <circle data-thumb="head" cx={pct(head)} cy="22" r="7" className="fill-accent" />
      </svg>
    </div>
  )
}
