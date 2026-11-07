import { type ReactNode, useCallback, useMemo, useState } from 'react'
import {
  type BannerKind,
  bannerLabels,
  DEFAULT_WIDTH_PX,
  markerLabels,
  parseAltimetry,
} from '../domain/altimetry'

/**
 * LA ALTIMETRÍA DE UNA ETAPA, CON EL SISTEMA (E3, paso 24a). El motor la manda como un SVG con sus colores y
 * su letra dentro (`renderAltimetrySvg`), que se pintaba tal cual: a 360 de ancho, su letra salía a unos
 * 4 px, y en el modo oscuro sus etiquetas oscuras quedaban sobre el fondo oscuro. Aquí se lee
 * (`domain/altimetry.ts`) y se pinta como el perfil de `Watch` (`ProfileStrip`, 14-h) y `FormChart`:
 *
 * - el dibujo, sin `<text>`, con tokens: el relieve en `line`, la curva en `accent`, los puertos en
 *   `gold-ink`, las volantes en `ink-3` y las cotas menores en `line-strong`, todo con su trazo en px de
 *   pantalla (`non-scaling-stroke`), para que no adelgace a 0,3 px en un teléfono;
 * - las etiquetas, en `caption` (12 px) en una capa encima sin `viewBox`, donde la letra se pinta a su
 *   tamaño: arriba, la de cada banner (`bannerLabels`, la forma larga si caben todas); abajo, el total y las
 *   marcas del replay (`markerLabels`), con su punto en la curva, de un tamaño fijo. Se colocan al ancho
 *   medido del dibujo, y mientras no se ha medido, al de un teléfono.
 *
 * Sobre `surface`, el fondo de la tarjeta: `gold-ink` como texto solo está garantizado sobre él en el claro
 * (§3.3), así que ya no va sobre `surface-2`. Es una imagen con el nombre que le da la página; lo de dentro
 * no se lee. Lo que no es una altimetría da `fallback`.
 */

const TRAZO: Readonly<Record<BannerKind, string>> = {
  climb: 'stroke-gold-ink',
  sprint: 'stroke-ink-3',
  minor: 'stroke-line-strong',
}

const TINTA = {
  climb: 'fill-gold-ink font-semibold',
  sprint: 'fill-ink-2',
  marker: 'fill-ink',
  total: 'fill-ink-3',
} as const

/**
 * Dónde van los renglones de etiquetas, en px de su letra a 12 (`caption` con la letra del navegador por
 * defecto), y se escriben en `em`: con una letra mayor, crecen con ella, como el relleno de la figura (`rem`).
 * El de arriba, 6 px sobre la línea de los banners (a 4, el punto de una llegada en alto tocaba su `HC`); el
 * de abajo, 13 px bajo el dibujo; y cada renglón, 14 px más allá.
 */
const SOBRE_LA_LINEA = -6
const BAJO_EL_DIBUJO = 13
const RENGLON = 14
const em = (px: number): string => `${(px / 12).toFixed(3)}em`

/**
 * El ancho del dibujo, medido y llevado a una letra de 16 px, la del navegador por defecto: con una mayor, las
 * etiquetas (`rem`) crecen y caben menos, que es lo que da colocarlas en un ancho menor. La primera medida va
 * en el `ref`, antes de pintar (una actualización del `ResizeObserver` llegaba después, y el primer cuadro
 * salía con el ancho de un teléfono); las demás, con el `ResizeObserver`. 0 sin medir (las pruebas no tienen DOM).
 */
function useAncho(): readonly [(el: HTMLDivElement | null) => (() => void) | undefined, number] {
  const [ancho, setAncho] = useState(0)
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (el === null) return undefined
    const mide = (w: number): void => {
      const raiz = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      const efectivo = Math.round(raiz > 0 ? (w * 16) / raiz : w)
      if (efectivo > 0) setAncho(efectivo)
    }
    mide(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return undefined
    const observador = new ResizeObserver((entradas) => mide(entradas[0]?.contentRect.width ?? 0))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])
  return [ref, ancho]
}

export function Altimetry({
  svg,
  label,
  className,
  fallback = null,
}: {
  /** la altimetría que manda la API (`renderAltimetrySvg`) */
  readonly svg: string
  /** su nombre, en inglés: `Elevation profile of …` */
  readonly label: string
  readonly className?: string
  readonly fallback?: ReactNode
}) {
  const d = useMemo(() => parseAltimetry(svg), [svg])
  const [medida, ancho] = useAncho()
  if (d === null) return <>{fallback}</>
  const w = ancho > 0 ? ancho : DEFAULT_WIDTH_PX
  const arriba = bannerLabels(d, w)
  const abajo = markerLabels(d, w)
  const pct = (v: number, de: number) => `${((v / de) * 100).toFixed(2)}%`
  // el alto de la línea de los banners, donde se apoyan sus etiquetas (en el motor, `PAD`)
  const techo = d.banners[0]?.top ?? 0
  // el sitio de las etiquetas, dentro de la figura: relleno y no margen, que dentro de un `<li>` se colapsaba
  // fuera de ella y su caja dejaba fuera sus propias etiquetas
  const caja = [
    className ?? null,
    d.banners.some((b) => b.label !== null) ? 'pt-6' : null,
    d.markers.some((m) => m.label !== null) ? 'pb-8' : d.total === null ? null : 'pb-4',
  ]
    .filter((c) => c !== null)
    .join(' ')
  return (
    <figure className={caja === '' ? undefined : caja} role="img" aria-label={label}>
      <div ref={medida} className="relative">
        <svg
          viewBox={`0 0 ${d.width} ${d.height}`}
          className="block h-auto w-full"
          aria-hidden="true"
        >
          <polygon points={d.area} className="fill-line" />
          <polyline
            points={d.curve}
            fill="none"
            className="stroke-accent"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {d.banners.map((b, i) => (
            <line
              // las líneas no se reordenan: son las del dibujo, en su orden
              key={i}
              data-banner={b.kind}
              x1={b.x}
              x2={b.x}
              y1={b.top}
              y2={b.bottom}
              className={TRAZO[b.kind]}
              strokeWidth={1}
              strokeDasharray={b.kind === 'minor' ? '2 4' : '3 3'}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          {d.markers.map((m, i) => (
            <circle
              key={i}
              cx={pct(m.x, d.width)}
              cy={pct(m.y, d.height)}
              r={3.5}
              className="fill-ink"
            />
          ))}
          {arriba.map((l) => {
            const kind = /^(?:Sprint|S)$/.test(l.text) ? 'sprint' : 'climb'
            return (
              <text
                key={l.key}
                data-label={kind}
                x={`${l.xPct.toFixed(2)}%`}
                y={pct(techo, d.height)}
                dy={em(SOBRE_LA_LINEA - RENGLON * l.row)}
                textAnchor={l.anchor}
                className={`${TINTA[kind]} text-caption tabular-nums`}
              >
                {l.text}
              </text>
            )
          })}
          {abajo.map((l) => {
            const kind = l.key === 'total' ? 'total' : 'marker'
            return (
              <text
                key={l.key}
                data-label={kind}
                x={`${l.xPct.toFixed(2)}%`}
                y="100%"
                dy={em(BAJO_EL_DIBUJO + RENGLON * l.row)}
                textAnchor={l.anchor}
                className={`${TINTA[kind]} text-caption tabular-nums`}
              >
                {l.text}
              </text>
            )
          })}
        </svg>
      </div>
    </figure>
  )
}
