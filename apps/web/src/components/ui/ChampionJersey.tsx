import {
  CHAMPION_RAINBOW,
  CHAMPION_SILVER,
  CHAMPION_STAR_EDGE,
  COLLAR,
  COUNTRY_NAMES,
  type ChampionTitle,
  type KitSize,
  LOGO_STAR,
  NATIONAL_CODE,
  NATIONAL_FLAG_BOX,
  TORSO,
  WORLD_STAR,
  championTitleText,
  starTransform,
} from '@cyclingstar/shared'
import { memo, useId } from 'react'
import sprite from '../../assets/flags.webp'
import { FLAG_INK } from './flagInk.generated'
import { FLAG_CELLS, FLAG_SPRITE } from './flagSprite.generated'
import { useFlagSvg } from './flagSvg'
import { type KitSurface, svgId } from './Kit'

/**
 * EL MAILLOT DE CAMPEÓN (E3, docs/visual.md §9.1; PR 17a; D-00d, D-00m, 9-g). El nacional viste su
 * bandera, mangas incluidas y sin estrella; el mundial, el cuerpo blanco con la estrella del logotipo en
 * arcoíris; el continental, la misma estrella en plata, provisional hasta E12. Las capas son las que
 * mide la distancia dibujada (`drawingLayers`): el cuerpo blanco; en el nacional, la bandera recortada
 * por el torso; el filete fuerte, en el token `kit-edge-strong`; el cuello; y en el mundial y el
 * continental, la estrella con su filo `navy-dark` de 1,5 u y unión redonda. La bandera es la celda del
 * sprite por debajo de 72 px y su SVG desde 72 (9-j); desde 72 van también las dos letras del país, en
 * blanco o en `navy-dark` según su campo (`flagInk.generated.ts`), con el filo del otro (9-i). Ruta y
 * crono, élite y sub-23 comparten el dibujo, y los separa el texto (`championTitleText`).
 */

/** El filete fuerte de cada superficie forzada: los dos valores del token `kit-edge-strong` (§9.10). */
const EDGE_STRONG: Readonly<Record<KitSurface, string>> = {
  light: 'rgb(0 0 0 / 0.35)',
  dark: 'rgb(255 255 255 / 0.6)',
}

/** El blanco y `navy-dark` de las letras del nacional y de su filo (§9.5). */
const INK_HEX = { white: '#ffffff', 'navy-dark': '#0b2740' } as const

/** La estrella mide 22 u en `LOGO_STAR`: su filo, de 1,5 u en el maillot, va en las u de la estrella. */
const STAR_SCALE = WORLD_STAR.widthU / 22

export interface ChampionJerseyProps {
  readonly title: ChampionTitle
  readonly size: KitSize
  /** sin ella, el filete sigue al tema (el token kit-edge-strong) */
  readonly surface?: KitSurface
}

/** La celda de una bandera en el sprite, sin el anillo que repite su borde: la bandera entera. */
function spriteBox(code: string): string | null {
  const cell = FLAG_CELLS[code]
  if (cell === undefined) return null
  const { width, height, margin } = FLAG_SPRITE
  const [col, row] = cell
  return `${col * width + margin} ${row * height + margin} ${width - 2 * margin} ${height - 2 * margin}`
}

export const ChampionJersey = memo(function ChampionJersey({
  title,
  size,
  surface,
}: ChampionJerseyProps) {
  const id = svgId(useId())
  const label = championTitleText('en', title, COUNTRY_NAMES)
  const country = title.scope === 'national' ? title.country : null
  const big = size >= NATIONAL_CODE.minPx
  const svgFlag = useFlagSvg(country ?? '', country !== null && big)
  const cell = country === null ? null : spriteBox(country)
  const ink = country === null ? undefined : FLAG_INK[country]
  const box = NATIONAL_FLAG_BOX
  return (
    <svg
      data-ui="ChampionJersey"
      data-variant={title.scope}
      data-state="ready"
      data-kit={`champion-${title.scope}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={label}
      className="inline-block shrink-0 align-middle"
    >
      <title>{label}</title>
      <path d={TORSO} fill="#ffffff" />
      {cell !== null && (
        <>
          <clipPath id={`${id}-torso`}>
            <path d={TORSO} />
          </clipPath>
          <g clipPath={`url(#${id}-torso)`} data-flag={svgFlag === null ? 'sprite' : 'svg'}>
            {svgFlag === null ? (
              <svg
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                viewBox={cell}
                preserveAspectRatio="none"
              >
                <image
                  href={sprite}
                  width={FLAG_SPRITE.cols * FLAG_SPRITE.width}
                  height={FLAG_SPRITE.rows * FLAG_SPRITE.height}
                />
              </svg>
            ) : (
              <image
                href={svgFlag}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                preserveAspectRatio="xMidYMid slice"
              />
            )}
          </g>
        </>
      )}
      {surface === undefined ? (
        <path d={TORSO} fill="none" strokeWidth="1.5" className="stroke-kit-edge-strong" />
      ) : (
        <path d={TORSO} fill="none" strokeWidth="1.5" stroke={EDGE_STRONG[surface]} />
      )}
      <path d={COLLAR} fill="#ffffff" fillOpacity="0.85" />
      {title.scope !== 'national' && (
        <>
          {title.scope === 'world' && (
            <linearGradient id={`${id}-rainbow`} x1="0" y1="0" x2="1" y2="1">
              {CHAMPION_RAINBOW.map((color, i) => (
                <stop key={color} offset={i / (CHAMPION_RAINBOW.length - 1)} stopColor={color} />
              ))}
            </linearGradient>
          )}
          <path
            d={LOGO_STAR}
            transform={starTransform(WORLD_STAR.widthU, WORLD_STAR.cx, WORLD_STAR.cy)}
            fill={title.scope === 'world' ? `url(#${id}-rainbow)` : CHAMPION_SILVER}
            stroke={CHAMPION_STAR_EDGE}
            strokeWidth={WORLD_STAR.edgeU / STAR_SCALE}
            strokeLinejoin="round"
          />
        </>
      )}
      {country !== null && big && ink !== undefined && (
        <text
          x={NATIONAL_CODE.x}
          y={NATIONAL_CODE.y}
          textAnchor="middle"
          fontSize={NATIONAL_CODE.sizeU}
          fontWeight={700}
          letterSpacing="0.04em"
          fill={INK_HEX[ink]}
          stroke={INK_HEX[ink === 'white' ? 'navy-dark' : 'white']}
          strokeWidth={NATIONAL_CODE.edgeU}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {country}
        </text>
      )}
    </svg>
  )
})
