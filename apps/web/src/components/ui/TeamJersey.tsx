import type { KitCode, KitSize } from '@cyclingstar/shared'
import { type KitSurface, Kit } from './Kit'
import { LegacyJersey } from './LegacyJersey'

/**
 * LA EQUIPACIÓN DE UN EQUIPO UN DÍA (E3, docs/visual.md §8.5, §8.6 y §9.10; PR 17a): su `KitCode`, o la
 * semilla de su dibujo de hoy mientras la traducción no le ha dado uno (hasta el 17b) y en lo que se
 * corrió antes de ella, que no se repinta (O-21). Las respuestas traen las dos (`kit`, nulo hasta el
 * 17b, y `jerseySeed`) y `wornTeam` elige; `TeamJersey` pinta `Kit` o `LegacyJersey`, con el mismo texto
 * (`Mistral Racing kit`).
 */

/** El equipo del corredor ese día: su código, o la semilla del dibujo de antes de la traducción (§8.6). */
export type WornTeam =
  | { readonly name: string; readonly kit: KitCode }
  | { readonly name: string; readonly legacySeed: string }

/** Lo que una respuesta dice de un equipo: el código si lo tiene, y si no la semilla (17-e, 17-q). */
export function wornTeam(name: string, kit: KitCode | null, jerseySeed: string): WornTeam {
  return kit === null ? { name, legacySeed: jerseySeed } : { name, kit }
}

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
