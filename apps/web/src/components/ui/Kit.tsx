import {
  BACK_NAME_BOX,
  BACK_NUMBER_BOX,
  BIB,
  BIB_CUFFS,
  BIB_PANELS,
  BIB_STRAPS,
  type BibStyle,
  COLLAR,
  KIT_COLORS,
  KIT_FIGURE_PATHS,
  type KitBigSize,
  type KitCode,
  type KitSize,
  type KitView,
  POCKETS,
  SPONSOR_ZONES,
  type SponsorZone,
  TORSO,
  TORSO_BACK,
  type ZoneBox,
  bibPaint,
  kitBackPath,
  parseKit,
} from '@cyclingstar/shared'
import { memo, useContext, useId } from 'react'
import {
  KIT_INK,
  KIT_WHITE,
  type KitSponsors,
  SPONSOR_WEIGHT,
  TextMeasureContext,
  type ZoneEntry,
  colorsUnder,
  fitsText,
  inkOn,
  sponsorPaints,
  textU,
  zoneShown,
} from './kitText'

/**
 * EL MAILLOT DE UN EQUIPO (E3, docs/visual.md §8.3 y §8.10; PR 17a y PR 17c), por su código. Por delante,
 * las capas son las que mide la distancia dibujada (`packages/db/src/kitDistance.ts`, `drawingLayers`), de
 * abajo arriba: `TORSO` en la base; la región de la figura en el segundo color, recortada por `TORSO`; el
 * filete, `TORSO` sin relleno con 1 u de trazo, en el token `kit-edge`, que sigue al tema; y el cuello,
 * blanco al 85 %. Los colores son del maillot y no cambian con el tema. Ninguno por debajo de 28 px
 * (`KitSize`, D-00b). Un código que no casa pinta el hueco (`hidden`).
 *
 * En grande (§8.10), a 160 y a 320 y nada más, porque el tipo no deja otra cosa: la espalda (`back`), la
 * de delante reflejada sobre `TORSO_BACK`, sin cuello, con los bolsillos, el nombre del equipo sobre los
 * hombros si cabe a 12 px y el dorsal si lo hay; y el culote (`bib`), con su estilo. Las zonas compradas
 * (`sponsors`, la interfaz para E8) pintan lo que dice la regla 8-p (`sponsorPaints`): el pecho, desde
 * 72 px sobre su banda de un color; las demás, solo en grande.
 */

/** Dónde se pinta: `dark` fuerza el filete claro donde el fondo es oscuro sin ámbito (D-00i; §9.10). */
export type KitSurface = 'light' | 'dark'

/** El filete de cada superficie forzada: los dos valores del token `kit-edge` (§3.1, §9.10). */
const EDGE: Readonly<Record<KitSurface, string>> = {
  light: 'rgb(0 0 0 / 0.3)',
  dark: 'rgb(255 255 255 / 0.6)',
}

type KitCommon = {
  readonly code: KitCode
  readonly teamName: string
  /** sin ella, el filete sigue al tema (el token kit-edge) */
  readonly surface?: KitSurface
  /** las zonas compradas (§8.10, §9.9): la interfaz para E8, que hoy nadie llena */
  readonly sponsors?: KitSponsors
}

/** Cada vista con lo suyo: el dorsal es de la espalda y el estilo, del culote (`never` en las demás). */
export type KitProps = KitCommon &
  (
    | {
        readonly view?: 'front'
        readonly size: KitSize
        readonly number?: never
        readonly bib?: never
      }
    | {
        readonly view: 'back'
        readonly size: KitBigSize
        /** el dorsal, en carrera */
        readonly number?: number
        readonly bib?: never
      }
    | {
        readonly view: 'bib'
        readonly size: KitBigSize
        readonly bib: BibStyle
        readonly number?: never
      }
  )

/** El id de un `clipPath`: el de `useId()` sin lo que no vale en `url(#…)`. */
export const svgId = (id: string): string => id.replace(/[^A-Za-z0-9_-]/g, '')

/** La banda del pecho que se pinta de un color bajo la marca, desde 72 px (§9.9). */
const CHEST_BAND = 'M0 23H48V33H0Z'
/** Los bolsillos: trazos de 0,5 u al 30 % de negro (§8.10). */
const POCKET_STROKE = 'rgba(0,0,0,0.3)'
/** El peso del nombre y del dorsal de la espalda, y el alto del dorsal, en u (§8.10). */
const BACK_WEIGHT = 700
const NUMBER_U = 6

/** Cómo se dice cada zona en el nombre del maillot (pantalla). */
const ZONE_WORDS: Readonly<Record<SponsorZone, string>> = {
  chest: 'chest',
  back: 'back',
  sleeves: 'sleeves',
  bibSides: 'shorts',
}

/**
 * Los patrocinadores que se ven, para el nombre del maillot: el del pecho siempre por delante, porque por
 * debajo de 72 px su nombre solo va aquí (§9.9); los demás, en la vista donde se ven y a su tamaño.
 */
export function sponsorsLabel(sponsors: KitSponsors, view: KitView, size: KitSize): string {
  return (Object.keys(SPONSOR_ZONES) as SponsorZone[])
    .filter((zone) => SPONSOR_ZONES[zone].views.includes(view))
    .filter((zone) => zone === 'chest' || zoneShown(zone, size))
    .flatMap((zone) => {
      const sponsor = sponsors[zone]
      return sponsor === undefined ? [] : [`, ${sponsor.name} on the ${ZONE_WORDS[zone]}`]
    })
    .join('')
}

/** El nombre del maillot (pantalla): `Mistral Racing kit`, `… kit, back, number 214`, `… shorts`. */
export function kitLabel(
  teamName: string,
  view: KitView,
  size: KitSize,
  sponsors: KitSponsors,
  number?: number,
): string {
  const base =
    view === 'bib'
      ? `${teamName} shorts`
      : view === 'back'
        ? `${teamName} kit, back${number === undefined ? '' : `, number ${number}`}`
        : `${teamName} kit`
  return base + sponsorsLabel(sponsors, view, size)
}

/** Una caja comprada (8-p): llena del color de su ficha, o su texto a 12 px, centrado, en `ink`. */
export function ZoneMark({
  entry,
  ink,
  size,
}: {
  readonly entry: ZoneEntry
  readonly ink: string
  readonly size: KitSize
}) {
  const { zone, box, paint } = entry
  if (paint.kind === 'fill')
    return (
      <rect data-zone={zone} x={box.x} y={box.y} width={box.w} height={box.h} fill={paint.color} />
    )
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  return (
    <text
      data-zone={zone}
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={textU(size)}
      fontWeight={SPONSOR_WEIGHT}
      fill={ink}
      {...(box.vertical === true ? { transform: `rotate(-90 ${cx} ${cy})` } : {})}
    >
      {paint.text}
    </text>
  )
}

/** El filete: sin `surface`, el token `kit-edge` del tema; con ella, su valor forzado. */
function Edge({ d, surface }: { readonly d: string; readonly surface: KitSurface | undefined }) {
  return surface === undefined ? (
    <path d={d} fill="none" strokeWidth="1" className="stroke-kit-edge" />
  ) : (
    <path d={d} fill="none" strokeWidth="1" stroke={EDGE[surface]} />
  )
}

export const Kit = memo(function Kit(props: KitProps) {
  const { code, teamName, size, surface, sponsors = {} } = props
  const view = props.view ?? 'front'
  const clip = svgId(useId())
  const measure = useContext(TextMeasureContext)
  const kit = parseKit(code)
  if (kit === null)
    return (
      <span
        data-ui="Kit"
        data-variant="hidden"
        data-state="hidden"
        aria-hidden="true"
        className="inline-block shrink-0"
        style={{ width: size, height: size }}
      />
    )
  const number = props.view === 'back' ? props.number : undefined
  const label = kitLabel(teamName, view, size, sponsors, number)
  const entries = sponsorPaints(sponsors, view, size, measure)
  const base = KIT_COLORS[kit.base]
  const secondary = kit.figure === 'plain' ? null : KIT_COLORS[kit.secondary]

  let layers
  if (props.view === 'bib') {
    const paint = bibPaint(kit, props.bib)
    const ink = inkOn([paint.panels ?? paint.body])
    layers = (
      <>
        <path d={BIB_STRAPS} fill={paint.body} />
        <path d={BIB} fill={paint.body} />
        {paint.panels !== null && <path d={BIB_PANELS} fill={paint.panels} />}
        {paint.cuffs !== paint.body && (
          <>
            <clipPath id={clip}>
              <path d={BIB} />
            </clipPath>
            <path d={BIB_CUFFS} fill={paint.cuffs} clipPath={`url(#${clip})`} />
          </>
        )}
        {entries.map((e) => (
          <ZoneMark key={`${e.zone}-${e.box.x}`} entry={e} ink={ink} size={size} />
        ))}
        <Edge d={`${BIB} ${BIB_STRAPS}`} surface={surface} />
      </>
    )
  } else {
    const back = view === 'back'
    const silhouette = back ? TORSO_BACK : TORSO
    const region = back ? kitBackPath(kit.figure) : KIT_FIGURE_PATHS[kit.figure]
    const under = (box: ZoneBox) => inkOn(colorsUnder(box, region, base, secondary))
    // el pecho comprado se pinta sobre su banda de un color: el segundo en `band`, la base en las demás
    const chestText = entries.some((e) => e.zone === 'chest' && e.paint.kind === 'text')
    const band = kit.figure === 'band' && secondary !== null ? secondary : base
    const repaint = chestText && region !== null && kit.figure !== 'band'
    const name = teamName.toUpperCase()
    const nameFits = back && fitsText(name, BACK_WEIGHT, BACK_NAME_BOX, size, measure)
    layers = (
      <>
        <path d={silhouette} fill={base} />
        {region !== null && secondary !== null && (
          <>
            <clipPath id={clip}>
              <path d={silhouette} />
            </clipPath>
            <path d={region} fill={secondary} clipPath={`url(#${clip})`} />
          </>
        )}
        {repaint && <path d={CHEST_BAND} fill={band} clipPath={`url(#${clip})`} />}
        {entries.map((e) => (
          <ZoneMark
            key={`${e.zone}-${e.box.x}`}
            entry={e}
            ink={e.zone === 'chest' ? inkOn([band]) : under(e.box)}
            size={size}
          />
        ))}
        {back && <path d={POCKETS} fill="none" stroke={POCKET_STROKE} strokeWidth="0.5" />}
        {nameFits && (
          <text
            data-back="name"
            x={BACK_NAME_BOX.x + BACK_NAME_BOX.w / 2}
            y={BACK_NAME_BOX.y + BACK_NAME_BOX.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={textU(size)}
            fontWeight={BACK_WEIGHT}
            fill={under(BACK_NAME_BOX)}
          >
            {name}
          </text>
        )}
        {number !== undefined && (
          <>
            <rect
              data-back="number"
              x={BACK_NUMBER_BOX.x}
              y={BACK_NUMBER_BOX.y}
              width={BACK_NUMBER_BOX.w}
              height={BACK_NUMBER_BOX.h}
              fill={KIT_WHITE}
            />
            <text
              x={BACK_NUMBER_BOX.x + BACK_NUMBER_BOX.w / 2}
              y={BACK_NUMBER_BOX.y + BACK_NUMBER_BOX.h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={NUMBER_U}
              fontWeight={BACK_WEIGHT}
              fill={KIT_INK}
            >
              {number}
            </text>
          </>
        )}
        <Edge d={silhouette} surface={surface} />
        {!back && <path d={COLLAR} fill="#ffffff" fillOpacity="0.85" />}
      </>
    )
  }

  return (
    <svg
      data-ui="Kit"
      data-variant={kit.figure}
      data-state="ready"
      data-kit={code}
      data-view={view}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={label}
      className="inline-block shrink-0 align-middle"
    >
      <title>{label}</title>
      {layers}
    </svg>
  )
})
