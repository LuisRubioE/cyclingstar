import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/postgres-js'
import { riders, teams } from './schema.js'

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * LA SEMILLA CON QUE SE DIBUJA EL MAILLOT (E3, docs/visual.md §8.9; la 0050): la que eligió el dueño
 * si la hay, y si no la de génesis. Se sirve con el nombre de hoy, `jerseySeed`, así que ni los
 * contratos ni la web cambian. Lo que IDENTIFICA al equipo (`seedWorld`, `reconcileTeams`, su nombre
 * por idioma) sigue leyendo `jersey_seed`.
 */
export const teamDrawSeed = sql<string>`coalesce(${teams.jerseyStyleSeed}, ${teams.jerseySeed})`

/** Lo mismo para una consulta con `leftJoin(teams, …)`: nula si el corredor no tiene equipo. */
export const teamDrawSeedOrNull = sql<
  string | null
>`coalesce(${teams.jerseyStyleSeed}, ${teams.jerseySeed})`

/** La forma de una semilla de génesis (`…:team:DIV:i:jersey`), la que reconoce `seedWorld`. */
const GENESIS_SEED_PATTERN = ':team:(WT|PRS|CON):[0-9]+:jersey$'

/**
 * BORRA EL CLON QUE DEJÓ UN MAILLOT CAMBIADO (E3, docs/visual.md §8.9; D-00q, decidido por el dueño).
 *
 * Hasta la 0050, `updateOwnedTeam` escribía la semilla elegida en `jersey_seed`, que es la identidad con
 * que `seedWorld` reconoce los equipos de la génesis, y el tick siguiente creaba un NPC con la semilla
 * vieja: el mismo nombre y una plantilla nueva. Desde la 0050 el maillot va a `jersey_style_seed` y no
 * nace ningún clon más; este paso borra el que ya haya, una sola vez, sin SQL a mano.
 *
 * La regla, por división: los equipos que abandonaron su semilla de génesis (con dueño o sin él) y los
 * clones, equipos sin dueño con semilla de génesis la mayoría de cuyos corredores nació después que el
 * mundo. «El mundo» es la primera alta de corredores de la base (la génesis, una sola transacción), y no
 * `worlds.created_at`, que el tick re-ancla tras un avance manual (`reanchorClock`). Si hay uno de cada
 * (8-y), el equipo recupera en `jersey_seed` la semilla de génesis del clon y guarda su dibujo en
 * `jersey_style_seed`, para que su maillot no cambie y el tick no vuelva a crear el clon; y el clon se
 * borra con sus corredores nacidos después de la génesis (los suyos), cuyo rastro se va con ellos por
 * sus `on delete cascade`. Un corredor de la génesis que hubiera fichado por el clon queda libre (la
 * clave de su equipo es `on delete set null`). Si en una división no casan uno con uno, no se borra
 * nada y la nota lo dice: confundir un aumento de estructura con un clon borraría un equipo legítimo.
 *
 * Idempotente: tras el arreglo ningún equipo abandona su semilla de génesis, así que sin nada que hacer
 * es una sola consulta y devuelve `null`. Devuelve la nota para `tick_log`.
 */
export async function removeJerseyClones(tx: Tx, worldId: string): Promise<string | null> {
  const abandoned = await tx
    .select({
      id: teams.id,
      name: teams.name,
      division: teams.division,
      jerseySeed: teams.jerseySeed,
      jerseyStyleSeed: teams.jerseyStyleSeed,
    })
    .from(teams)
    .where(and(eq(teams.worldId, worldId), sql`${teams.jerseySeed} !~ ${GENESIS_SEED_PATTERN}`))
  if (abandoned.length === 0) return null

  const firstBorn = await tx
    .select({ at: sql<string | null>`min(${riders.createdAt})::text` })
    .from(riders)
    .where(eq(riders.worldId, worldId))
  const genesisAt = firstBorn[0]?.at ?? null
  if (genesisAt === null) return null

  const notes: string[] = []
  const divisions = [...new Set(abandoned.map((t) => t.division))].sort()
  for (const division of divisions) {
    const own = abandoned.filter((t) => t.division === division)
    const clones = await tx
      .select({
        id: teams.id,
        name: teams.name,
        jerseySeed: teams.jerseySeed,
        late: sql<number>`count(${riders.id}) filter (where ${riders.createdAt} > ${genesisAt}::timestamptz)::int`,
      })
      .from(teams)
      .leftJoin(riders, eq(riders.teamId, teams.id))
      .where(
        and(
          eq(teams.worldId, worldId),
          eq(teams.division, division),
          isNull(teams.ownerUserId),
          sql`${teams.jerseySeed} ~ ${GENESIS_SEED_PATTERN}`,
        ),
      )
      .groupBy(teams.id)
      .having(
        sql`count(${riders.id}) filter (where ${riders.createdAt} > ${genesisAt}::timestamptz) * 2 > count(${riders.id})`,
      )
    const team = own[0]
    const clone = clones[0]
    // Sin candidato no hay clon que borrar (un equipo con semilla propia de un mundo de prueba, o uno cuya
    // semilla de génesis ya lleva otro); con más de uno, o con varios equipos sin semilla, no se adivina.
    if (clones.length === 0) continue
    if (own.length !== 1 || clones.length !== 1 || team === undefined || clone === undefined) {
      notes.push(
        `jersey clone: ${division}, ${own.length} sin semilla de génesis y ${clones.length} candidatos, no se borra nada`,
      )
      continue
    }

    // Los corredores del clon: los que nacieron con él, después de la génesis.
    const born = await tx
      .select({ id: riders.id })
      .from(riders)
      .where(and(eq(riders.teamId, clone.id), sql`${riders.createdAt} > ${genesisAt}::timestamptz`))
    const bornIds = born.map((r) => r.id)
    if (bornIds.length > 0) await tx.delete(riders).where(inArray(riders.id, bornIds))
    await tx.delete(teams).where(eq(teams.id, clone.id))
    await tx
      .update(teams)
      .set({
        jerseySeed: clone.jerseySeed,
        jerseyStyleSeed: team.jerseyStyleSeed ?? team.jerseySeed,
      })
      .where(eq(teams.id, team.id))
    notes.push(`jersey clone removed: ${clone.name} (${clone.id}), ${bornIds.length} riders`)
  }
  return notes.join(' · ')
}
