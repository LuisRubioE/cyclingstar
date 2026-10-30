import type { KitCode, KitSize } from '@cyclingstar/shared'
import { type KitSurface, Kit } from './Kit'
import { LegacyJersey } from './LegacyJersey'

/**
 * LA EQUIPACIÓN DE UN EQUIPO UN DÍA (E3, docs/visual.md §8.5, §8.6 y §9.10; PR 17a y 19e): su `KitCode`, o, en
 * lo que se grabó antes de la traducción, que no se repinta (O-21, D-23), la semilla con que se dibuja. Los
 * cuatro de estado traen siempre su `kit` desde el 19e; solo el rótulo de la retransmisión puede traer
 * `legacySeed` (8-f). `TeamJersey` pinta `Kit` o `LegacyJersey`, con el mismo texto (`Mistral Racing kit`).
 */

/** El equipo del corredor ese día: su código, o la semilla del dibujo de antes de la traducción (§8.6). */
export type WornTeam =
  | { readonly name: string; readonly kit: KitCode }
  | { readonly name: string; readonly legacySeed: string }

export function TeamJersey({
  team,
  size,
  surface,
}: {
  readonly team: WornTeam
  readonly size: KitSize
  /** solo la equipación nueva lo sigue; el dibujo de hoy lleva su filete de siempre */
  readonly surface?: KitSurface
}) {
  if ('kit' in team)
    return (
      <Kit
        code={team.kit}
        teamName={team.name}
        size={size}
        {...(surface === undefined ? {} : { surface })}
      />
    )
  return <LegacyJersey seed={team.legacySeed} size={size} team={team.name} />
}
