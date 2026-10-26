import {
  COLLAR,
  KIT_COLORS,
  KIT_FIGURE_PATHS,
  type KitCode,
  type KitSize,
  TORSO,
  parseKit,
} from '@cyclingstar/shared'
import { memo, useId } from 'react'

/**
 * EL MAILLOT DE UN EQUIPO (E3, docs/visual.md §8.3; PR 17a), por su código y por delante. Las capas son
 * las que mide la distancia dibujada (`packages/db/src/kitDistance.ts`, `drawingLayers`), de abajo
 * arriba: `TORSO` en la base; la región de la figura en el segundo color, recortada por `TORSO`; el
 * filete, `TORSO` sin relleno con 1 u de trazo, en el token `kit-edge`, que sigue al tema; y el cuello,
 * blanco al 85 %. Los colores son del maillot y no cambian con el tema. Ninguno por debajo de 28 px
 * (`KitSize`, D-00b). Un código que no casa pinta el hueco (`hidden`). Las vistas grandes, el culote y
 * las zonas del patrocinador llegan con el 17c (§8.10).
 */

/** Dónde se pinta: `dark` fuerza el filete claro donde el fondo es oscuro sin ámbito (D-00i; §9.10). */
export type KitSurface = 'light' | 'dark'

/** El filete de cada superficie forzada: los dos valores del token `kit-edge` (§3.1, §9.10). */
const EDGE: Readonly<Record<KitSurface, string>> = {
  light: 'rgb(0 0 0 / 0.3)',
  dark: 'rgb(255 255 255 / 0.6)',
}

export interface KitProps {
  readonly code: KitCode
  readonly teamName: string
  readonly size: KitSize
  /** sin ella, el filete sigue al tema (el token kit-edge) */
  readonly surface?: KitSurface
}

/** El id de un `clipPath`: el de `useId()` sin lo que no vale en `url(#…)`. */
export const svgId = (id: string): string => id.replace(/[^A-Za-z0-9_-]/g, '')

export const Kit = memo(function Kit({ code, teamName, size, surface }: KitProps) {
  const clip = svgId(useId())
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
  const label = `${teamName} kit`
  const region = KIT_FIGURE_PATHS[kit.figure]
  return (
    <svg
      data-ui="Kit"
      data-variant={kit.figure}
      data-state="ready"
      data-kit={code}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={label}
      className="inline-block shrink-0 align-middle"
    >
      <title>{label}</title>
      <path d={TORSO} fill={KIT_COLORS[kit.base]} />
      {kit.figure !== 'plain' && region !== null && (
        <>
          <clipPath id={clip}>
            <path d={TORSO} />
          </clipPath>
          <path d={region} fill={KIT_COLORS[kit.secondary]} clipPath={`url(#${clip})`} />
        </>
      )}
      {surface === undefined ? (
        <path d={TORSO} fill="none" strokeWidth="1" className="stroke-kit-edge" />
      ) : (
        <path d={TORSO} fill="none" strokeWidth="1" stroke={EDGE[surface]} />
      )}
      <path d={COLLAR} fill="#ffffff" fillOpacity="0.85" />
    </svg>
  )
})
