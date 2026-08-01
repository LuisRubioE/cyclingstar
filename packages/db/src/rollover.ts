import { randomUUID } from 'node:crypto'
import { type Division, generateNpcRider, neoproAge, shouldRetire } from '@cyclingstar/engine'
import { ATTRIBUTES, VOCATIONS, type Vocation, seededRng } from '@cyclingstar/shared'
import { and, eq, isNull, lt, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { generateName } from './names.js'
import { contracts, riderAttrs, riderHidden, riders, teams } from './schema.js'

/**
 * Rollover de temporada (SPEC 2, 11, Paso 37). Al cruzar el día 364 amanece una temporada nueva sin
 * intervención: envejecen todos (implícito, la edad deriva de birthSeason + temporada), se retiran
 * los NPC mayores y entran neoprofesionales para mantener la población, los equipos ascienden y
 * descienden según su fuerza, los puntos se reinician y los contratos vencidos liberan al corredor.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const SEASON_DAYS = 364
const TARGET_POPULATION = 1600
const PROMO_RELEGATE = 2
const COUNTRIES = [
  'FR',
  'IT',
  'ES',
  'BE',
  'GB',
  'DE',
  'NL',
  'US',
  'CO',
  'DK',
  'NO',
  'PT',
  'SI',
  'AU',
]

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!
}

/** Ascensos y descensos entre divisiones por fuerza de plantilla (suma de fama), contando estable. */
async function promoteRelegate(tx: Tx, worldId: string): Promise<void> {
  const rows = await tx
    .select({
      id: teams.id,
      division: teams.division,
      strength: sql<number>`coalesce(sum(${riders.fame}), 0)::float`,
    })
    .from(teams)
    .leftJoin(riders, and(eq(riders.teamId, teams.id), isNull(riders.retiredAt)))
    .where(eq(teams.worldId, worldId))
    .groupBy(teams.id)
  const byDiv = (d: Division) =>
    rows.filter((r) => r.division === d).sort((a, b) => b.strength - a.strength)
  const wt = byDiv('WT')
  const prs = byDiv('PRS')
  const con = byDiv('CON')
  if (wt.length < PROMO_RELEGATE || prs.length < PROMO_RELEGATE || con.length < PROMO_RELEGATE)
    return

  const setDivision = async (id: string, division: Division) =>
    tx.update(teams).set({ division }).where(eq(teams.id, id))

  const promoteToWT = prs.slice(0, PROMO_RELEGATE)
  const relegateFromWT = wt.slice(-PROMO_RELEGATE)
  const promoteToPRS = con.slice(0, PROMO_RELEGATE)
  // Los peores PRS que no ascienden a WT bajan a CON.
  const promotedIds = new Set(promoteToWT.map((t) => t.id))
  const relegateFromPRS = prs.filter((t) => !promotedIds.has(t.id)).slice(-PROMO_RELEGATE)

  for (const t of promoteToWT) await setDivision(t.id, 'WT')
  for (const t of relegateFromWT) await setDivision(t.id, 'PRS')
  for (const t of promoteToPRS) await setDivision(t.id, 'PRS')
  for (const t of relegateFromPRS) await setDivision(t.id, 'CON')
}

/** Inserta un neoprofesional (~20 años) en un equipo (o como agente libre si teamId es null). */
async function insertNeopro(
  tx: Tx,
  worldId: string,
  division: Division,
  teamId: string | null,
  seed: string,
  newSeason: number,
): Promise<void> {
  const rng = seededRng(`${seed}:meta`)
  const vocation: Vocation = pick(VOCATIONS, rng)
  const country = pick(COUNTRIES, rng)
  const age = neoproAge(rng)
  const genome = generateNpcRider(`${seed}:genome`, { division, vocation, age })
  const name = generateName(`${seed}:name`, { country, gender: 'M' }).fullName
  const id = randomUUID()
  await tx.insert(riders).values({
    id,
    worldId,
    userId: null,
    teamId,
    name,
    country,
    gender: 'M',
    birthSeason: newSeason - (age - 20),
    archetype: vocation,
    faceSeed: `${id}:face`,
    ctl: 45,
    atl: 45,
    morale: 60,
  })
  await tx
    .insert(riderAttrs)
    .values(ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: genome.attributes[attr] })))
  await tx.insert(riderHidden).values({
    riderId: id,
    talent: genome.hidden.talent,
    ceilings: genome.hidden.ceilings,
    fragility: genome.hidden.fragility,
    peakAge: genome.hidden.peakAge,
    declineAge: genome.hidden.declineAge,
  })
}

/** Corre el rollover cuando el mundo cruza a una temporada nueva (día 364, 728, ...). */
export async function runRollover(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
): Promise<void> {
  if (gameDay === 0 || gameDay % SEASON_DAYS !== 0) return
  const newSeason = gameDay / SEASON_DAYS

  // 1) Ascensos y descensos por la fuerza de la temporada que acaba.
  await promoteRelegate(tx, worldId)

  // 2) Reinicio de puntos de temporada de los equipos.
  await tx.update(teams).set({ pointsSeason: 0 }).where(eq(teams.worldId, worldId))

  // 3) Contratos vencidos: liberan al corredor (el mercado lo re-fichará).
  await tx.delete(contracts).where(lt(contracts.endSeason, newSeason))

  // 4) Retiros de NPC mayores.
  const npcs = await tx
    .select({
      id: riders.id,
      birthSeason: riders.birthSeason,
      teamId: riders.teamId,
      declineAge: riderHidden.declineAge,
    })
    .from(riders)
    .innerJoin(riderHidden, eq(riderHidden.riderId, riders.id))
    .where(and(eq(riders.worldId, worldId), isNull(riders.userId), isNull(riders.retiredAt)))

  const rng = seededRng(`${worldSeed}:rollover:s${newSeason}`)
  let retired = 0
  for (const npc of npcs) {
    const age = 20 - npc.birthSeason + newSeason
    if (shouldRetire(age, npc.declineAge, rng)) {
      await tx
        .update(riders)
        .set({ retiredAt: newSeason, teamId: null })
        .where(eq(riders.id, npc.id))
      retired++
    }
  }

  // 5) Neoprofesionales para mantener la población (~1.600). Rellenan huecos de plantilla; el resto
  //    entra como agente libre en Continental.
  const popRows = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNull(riders.retiredAt)))
  const population = popRows[0]?.n ?? 0
  const needed = Math.max(retired, TARGET_POPULATION - population)

  // Equipos con hueco (los que perdieron corredores por retiro), para colocar algunos neopros.
  const gaps = await tx
    .select({
      id: teams.id,
      division: teams.division,
      roster: sql<number>`count(${riders.id})::int`,
    })
    .from(teams)
    .leftJoin(riders, and(eq(riders.teamId, teams.id), isNull(riders.retiredAt)))
    .where(eq(teams.worldId, worldId))
    .groupBy(teams.id)
  const target: Record<Division, number> = { WT: 14, PRS: 12, CON: 10 }
  const openSlots: { teamId: string; division: Division }[] = []
  for (const g of gaps) {
    const div = g.division as Division
    for (let i = g.roster; i < target[div]; i++) openSlots.push({ teamId: g.id, division: div })
  }

  for (let i = 0; i < needed; i++) {
    const slot = openSlots[i]
    const division = slot?.division ?? 'CON'
    const teamId = slot?.teamId ?? null
    await insertNeopro(
      tx,
      worldId,
      division,
      teamId,
      `${worldSeed}:neopro:s${newSeason}:${i}`,
      newSeason,
    )
  }
}
