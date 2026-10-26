import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { and, desc, eq } from 'drizzle-orm'
import { fieldTeamsFor } from './calendarRun.js'
import { teamRacePlan, teams } from './schema.js'
import type { Queryable } from './titles.js'

/**
 * LOS RIVALES DE TEMPORADA (E3, docs/visual.md §8.4; H-01, D-24, punto 3; PR 16a). Dos equipos son
 * rivales si comparten al menos una carrera de la temporada, y lo que importa del maillot es no parecerse
 * a ellos: con los demás no se cruza nunca en una carrera.
 *
 * Construye, sin correr nada, el pelotón de cada carrera de `SEASON_CALENDAR` con la selección del tick
 * (`fieldTeamsFor`, de `calendarRun.ts`), con dos lecturas para toda la temporada: los equipos del mundo
 * por presupuesto y las excepciones de `team_race_plan`. Tres límites: los admitidos se ordenan por
 * `teams.budget` el día en que se congela la escuadra, así que los rivales de hoy son una previsión; los
 * campeonatos nacionales quedan fuera, porque mezclan corredores de decenas de equipos (mapa 03 §8); y no
 * se guardan, se calculan al pedir.
 */

/** Por equipo, sus rivales con las carreras que comparten. */
export type SeasonRivals = ReadonlyMap<string, ReadonlyMap<string, number>>

/** El pelotón previsto de cada carrera de la temporada que no es nacional, por su clave (`race:s0`). */
export async function seasonFields(
  q: Queryable,
  worldId: string,
  season: number,
): Promise<ReadonlyMap<string, readonly string[]>> {
  const all = await q
    .select({
      id: teams.id,
      division: teams.division,
      country: teams.country,
      ownerUserId: teams.ownerUserId,
    })
    .from(teams)
    .where(eq(teams.worldId, worldId))
    .orderBy(desc(teams.budget))
  const plan = await q
    .select({
      teamId: teamRacePlan.teamId,
      raceId: teamRacePlan.raceId,
      attend: teamRacePlan.attend,
    })
    .from(teamRacePlan)
    .innerJoin(teams, eq(teams.id, teamRacePlan.teamId))
    .where(and(eq(teams.worldId, worldId), eq(teamRacePlan.season, season)))
  const overrides = new Map<string, Map<string, boolean>>()
  for (const row of plan) {
    const byTeam = overrides.get(row.raceId) ?? new Map<string, boolean>()
    byTeam.set(row.teamId, row.attend)
    overrides.set(row.raceId, byTeam)
  }
  const fields = new Map<string, readonly string[]>()
  for (const race of SEASON_CALENDAR) {
    if (race.championshipCountry) continue
    const open = new Set<string>(race.openTo)
    // la misma lista que lee el tick: los abiertos a la carrera, en el orden del presupuesto
    const eligible = all.filter((t) => open.has(t.division))
    const raceKey = `${race.id}:s${season}`
    const { teamRows } = fieldTeamsFor(eligible, race, raceKey, overrides.get(race.id) ?? new Map())
    fields.set(
      raceKey,
      teamRows.map((t) => t.id),
    )
  }
  return fields
}

/** Los rivales de los pelotones: cada pareja de equipos que coincide en una carrera, con cuántas. */
export function rivalsOf(fields: ReadonlyMap<string, readonly string[]>): SeasonRivals {
  const rivals = new Map<string, Map<string, number>>()
  const bump = (a: string, b: string) => {
    const of = rivals.get(a) ?? new Map<string, number>()
    of.set(b, (of.get(b) ?? 0) + 1)
    rivals.set(a, of)
  }
  for (const field of fields.values())
    for (const [i, a] of field.entries())
      for (const b of field.slice(i + 1)) {
        bump(a, b)
        bump(b, a)
      }
  return rivals
}

/** Los rivales de temporada de cada equipo del mundo. */
export async function seasonRivals(
  q: Queryable,
  worldId: string,
  season: number,
): Promise<SeasonRivals> {
  return rivalsOf(await seasonFields(q, worldId, season))
}
