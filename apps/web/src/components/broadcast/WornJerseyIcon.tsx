import type { KitSize, RiderCard, WornJersey } from '@cyclingstar/shared'
import { memo } from 'react'
import { ChampionJersey } from '../ui/ChampionJersey'
import type { KitSurface } from '../ui/Kit'
import { LeaderJersey } from '../ui/LeaderJersey'
import { TeamJersey, type WornTeam, wornTeam } from '../ui/TeamJersey'

/**
 * EL MAILLOT QUE LLEVA UN CORREDOR (docs/retransmision.md §6.2, §7.1 y §7.4; E3, docs/visual.md §9.10,
 * PR 17a): el único sitio de la web que elige dibujo y texto por `WornJersey` (D-31). `leader`,
 * `LeaderJersey` con `JERSEY_LABEL`; `champion`, `ChampionJersey` con `championTitleText`; `team`, la
 * equipación de su equipo ese día (`Kit`, o `LegacyJersey` si llega la semilla de antes de la
 * traducción), con `Mistral Racing kit`; sin equipo, el hueco de su ancho, que no se lee. A 28 px o más
 * (D-00b). `surface` fuerza el filete claro donde el fondo es oscuro sin ámbito (`CueCard`, D-00i).
 */

export interface WornJerseyIconProps {
  readonly worn: WornJersey
  readonly team: WornTeam | null
  /** 28 o más (D-00b) */
  readonly size: KitSize
  /** fuerza el filete claro donde el fondo es oscuro sin ámbito; sin ella, el filete sigue al tema (D-00i) */
  readonly surface?: KitSurface
}

/** El equipo de la carta servida (§8.5): su maillot del día de la etapa, o su semilla hasta el 17b. */
export function wornTeamOf(card: RiderCard): WornTeam | null {
  return card.team === null ? null : wornTeam(card.team.name, card.team.kit, card.team.jerseySeed)
}

export const WornJerseyIcon = memo(function WornJerseyIcon({
  worn,
  team,
  size,
  surface,
}: WornJerseyIconProps) {
  const sobre = surface === undefined ? {} : { surface }
  if (worn.kind === 'leader') return <LeaderJersey kind={worn.jersey} size={size} {...sobre} />
  if (worn.kind === 'champion') return <ChampionJersey title={worn.title} size={size} {...sobre} />
  if (team === null)
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0 align-middle"
        style={{ width: size, height: size }}
      />
    )
  return <TeamJersey team={team} size={size} {...sobre} />
})
