import {
  JERSEY_LABEL,
  type JerseyKind,
  KIT_FIGURE_PATHS,
  type KitSize,
  LEADER_DOTS,
  LEADER_JERSEY,
  TORSO,
} from '@cyclingstar/shared'
import { memo, useId } from 'react'
import { type KitSurface, svgId } from './Kit'

/**
 * LOS TRES MAILLOTS DE LÍDER (E3, docs/visual.md §9.7; PR 17a; [DUEÑO 1]), de `LEADER_JERSEY`: el
 * amarillo liso, el verde con la banda blanca de la región de `band` y el azul con cinco lunares
 * blancos de 4 u. El color no es lo único que los separa: cada uno lleva su marca de forma, que se lee
 * igual en grises, y su texto (`JERSEY_LABEL`) en `aria-label` y en `<title>`. Las capas son las que
 * mide la distancia dibujada (`drawingLayers`): el cuerpo, la marca y el filete fuerte de 1,5 u, en el
 * token `kit-edge-strong`, que sigue al tema; sin cuello, como hoy. Ninguno por debajo de 28 px.
 */

/** El filete fuerte de cada superficie forzada: los dos valores del token `kit-edge-strong` (§9.10). */
const EDGE_STRONG: Readonly<Record<KitSurface, string>> = {
  light: 'rgb(0 0 0 / 0.35)',
  dark: 'rgb(255 255 255 / 0.6)',
}

export interface LeaderJerseyProps {
  readonly kind: JerseyKind
  readonly size: KitSize
  /** sin ella, el filete sigue al tema (el token kit-edge-strong) */
  readonly surface?: KitSurface
}

export const LeaderJersey = memo(function LeaderJersey({ kind, size, surface }: LeaderJerseyProps) {
  const clip = svgId(useId())
  const { base, mark } = LEADER_JERSEY[kind]
  const label = JERSEY_LABEL[kind]
  return (
    <svg
      data-ui="LeaderJersey"
      data-variant={kind}
      data-state="ready"
      data-kit={`leader-${kind}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={label}
      className="inline-block shrink-0 align-middle"
    >
      <title>{label}</title>
      <path d={TORSO} fill={base} />
      {mark?.kind === 'band' && (
        <>
          <clipPath id={clip}>
            <path d={TORSO} />
          </clipPath>
          <path d={KIT_FIGURE_PATHS.band ?? ''} fill={mark.fill} clipPath={`url(#${clip})`} />
        </>
      )}
      {mark?.kind === 'dots' &&
        LEADER_DOTS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={mark.radiusU} fill={mark.fill} />
        ))}
      {surface === undefined ? (
        <path d={TORSO} fill="none" strokeWidth="1.5" className="stroke-kit-edge-strong" />
      ) : (
        <path d={TORSO} fill="none" strokeWidth="1.5" stroke={EDGE_STRONG[surface]} />
      )}
    </svg>
  )
})
