import {
  type ContractRole,
  type Division,
  offerSalary,
  offerSeasons,
  releaseClause,
} from '@cyclingstar/engine'
import { seededRng } from '@cyclingstar/shared'
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { emitNews } from './news.js'
import { contracts, offers, riderAttrs, riders, teams } from './schema.js'

/**
 * Mercado de fichajes (SPEC 7.2, Paso 36). En la ventana de fin de temporada, los corredores sin
 * contrato vigente (o con uno que expira) reciben ofertas coherentes con su nivel: la división del
 * equipo y el salario (fórmula del SPEC) escalan con el percentil del corredor. La bandeja permite
 * aceptar (firma el contrato, mueve de equipo) o rechazar.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const SEASON_DAYS = 364
const ROSTER_TARGET: Record<Division, number> = { WT: 14, PRS: 12, CON: 10 }
/** Intervalo mínimo entre tandas de ofertas a un agente libre (días de juego). */
const FREE_AGENT_COOLDOWN_DAYS = 7

/** Nivel del corredor como percentil [0,1]: media de sus 5 mejores atributos sobre 100. */
async function riderRating(tx: Tx, riderId: string): Promise<number> {
  const rows = await tx
    .select({ value: riderAttrs.value })
    .from(riderAttrs)
    .where(eq(riderAttrs.riderId, riderId))
  if (rows.length === 0) return 0.3
  const top = rows
    .map((r) => r.value)
    .sort((a, b) => b - a)
    .slice(0, 5)
  const mean = top.reduce((s, v) => s + v, 0) / top.length
  return Math.max(0, Math.min(1, mean / 100))
}

/** Divisiones que encajan con el nivel del corredor (ofertas coherentes, SPEC 7.2). */
function divisionsForRating(rating: number): Division[] {
  if (rating > 0.7) return ['WT', 'PRS']
  if (rating > 0.45) return ['PRS', 'CON']
  return ['CON']
}

/** Rol propuesto según el nivel: los mejores son líderes, los flojos gregarios. */
function roleForRating(rating: number): ContractRole {
  if (rating > 0.78) return 'lider'
  if (rating > 0.58) return 'colider'
  if (rating > 0.38) return 'gregario'
  return 'libre'
}

/**
 * Genera la bandeja de ofertas de los corredores humanos. Un **agente libre** (sin contrato
 * vigente) recibe ofertas en cualquier momento, con un intervalo entre tandas; quien ya tiene
 * contrato vigente aún no recibe (cambiar de equipo llegará con los equipos de usuarios).
 */
export async function runMarket(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
): Promise<void> {
  const season = Math.floor(gameDay / SEASON_DAYS)

  const humans = await tx
    .select({ id: riders.id, birthSeason: riders.birthSeason, country: riders.country })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNotNull(riders.userId)))

  for (const human of humans) {
    // Con contrato vigente no recibe ofertas por ahora.
    const current = await tx
      .select({ endSeason: contracts.endSeason })
      .from(contracts)
      .where(eq(contracts.riderId, human.id))
      .limit(1)
    if (current[0] && current[0].endSeason >= season) continue

    // Agente libre: no re-ofertar si tiene ofertas pendientes o si la última tanda es reciente.
    const pending = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(offers)
      .where(and(eq(offers.riderId, human.id), eq(offers.status, 'pendiente')))
    if ((pending[0]?.n ?? 0) > 0) continue
    const last = await tx
      .select({ d: sql<number | null>`max(${offers.createdDay})` })
      .from(offers)
      .where(eq(offers.riderId, human.id))
    const lastDay = last[0]?.d ?? null
    if (lastDay != null && gameDay - lastDay < FREE_AGENT_COOLDOWN_DAYS) continue

    const rating = await riderRating(tx, human.id)
    const age = 20 - human.birthSeason + season
    const divisions = divisionsForRating(rating)

    // Equipos que encajan, priorizando los que tienen hueco en plantilla. Los equipos del MISMO país
    // que el corredor tiran primero por él (los bots fichan sobre todo compatriotas), sin que sea
    // exclusivo: un buen corredor también recibe ofertas de fuera.
    const teamRows = await tx
      .select({
        id: teams.id,
        division: teams.division,
        budget: teams.budget,
        country: teams.country,
        roster: sql<number>`count(${riders.id})::int`,
      })
      .from(teams)
      .leftJoin(riders, eq(riders.teamId, teams.id))
      .where(and(eq(teams.worldId, worldId), inArray(teams.division, divisions)))
      .groupBy(teams.id)
      .orderBy(desc(teams.budget))
    const SAME_COUNTRY_BONUS = 10
    const ranked = teamRows
      .map((t) => ({
        ...t,
        gap: ROSTER_TARGET[t.division as Division] - t.roster,
        homeBonus: t.country && t.country === human.country ? SAME_COUNTRY_BONUS : 0,
      }))
      .sort((a, b) => b.gap + b.homeBonus - (a.gap + a.homeBonus) || b.budget - a.budget)

    const rng = seededRng(`${worldSeed}:market:${human.id}:d${gameDay}`)
    const count = rng() < 0.5 ? 2 : 3
    const chosen = ranked.slice(0, count)
    if (chosen.length === 0) continue

    for (const team of chosen) {
      const division = team.division as Division
      const role = roleForRating(rating)
      const salary = offerSalary({ division, pointsPercentile: rating, age, role })
      const seasons = offerSeasons(rating, rng)
      await tx.insert(offers).values({
        riderId: human.id,
        teamId: team.id,
        season,
        role,
        salary,
        seasons,
        releaseClause: releaseClause(salary, seasons),
        createdDay: gameDay,
      })
    }
  }
}

export interface OfferRow {
  id: string
  teamId: string
  teamName: string
  division: string
  role: string
  salary: number
  seasons: number
  releaseClause: number
}

/** Ofertas pendientes de un corredor, con el equipo que las hace. */
export async function getOffers(db: Database, riderId: string): Promise<OfferRow[]> {
  return db
    .select({
      id: offers.id,
      teamId: teams.id,
      teamName: teams.name,
      division: teams.division,
      role: offers.role,
      salary: offers.salary,
      seasons: offers.seasons,
      releaseClause: offers.releaseClause,
    })
    .from(offers)
    .innerJoin(teams, eq(teams.id, offers.teamId))
    .where(and(eq(offers.riderId, riderId), eq(offers.status, 'pendiente')))
    .orderBy(desc(offers.salary))
}

/** Acepta una oferta: firma el contrato, mueve al corredor y cierra las demás ofertas. */
export async function acceptOffer(db: Database, riderId: string, offerId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.riderId, riderId)))
      .limit(1)
    const offer = rows[0]
    if (!offer || offer.status !== 'pendiente') throw new Error('oferta no disponible')

    await tx.delete(contracts).where(eq(contracts.riderId, riderId))
    await tx.insert(contracts).values({
      riderId,
      teamId: offer.teamId,
      role: offer.role,
      salary: offer.salary,
      startSeason: offer.season,
      endSeason: offer.season + offer.seasons - 1,
      releaseClause: offer.releaseClause,
    })
    await tx.update(riders).set({ teamId: offer.teamId }).where(eq(riders.id, riderId))
    await tx.update(offers).set({ status: 'aceptada' }).where(eq(offers.id, offerId))

    // Noticia del fichaje (Paso 39), personal del corredor.
    const info = await tx
      .select({ worldId: riders.worldId, rider: riders.name, team: teams.name })
      .from(riders)
      .innerJoin(teams, eq(teams.id, offer.teamId))
      .where(eq(riders.id, riderId))
      .limit(1)
    if (info[0]) {
      await emitNews(tx, {
        worldId: info[0].worldId,
        gameDay: offer.createdDay,
        kind: 'contract',
        seed: `contract:${offerId}`,
        data: { rider: info[0].rider, team: info[0].team },
        riderId,
      })
    }
    // Las demás ofertas pendientes caducan.
    await tx
      .update(offers)
      .set({ status: 'expirada' })
      .where(and(eq(offers.riderId, riderId), eq(offers.status, 'pendiente')))
  })
}

export interface ContractRow {
  teamId: string
  teamName: string
  division: string
  role: string
  salary: number
  endSeason: number
  releaseClause: number
}

/** Contrato vigente del corredor, o null si es agente libre. */
export async function getContract(db: Database, riderId: string): Promise<ContractRow | null> {
  const rows = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      division: teams.division,
      role: contracts.role,
      salary: contracts.salary,
      endSeason: contracts.endSeason,
      releaseClause: contracts.releaseClause,
    })
    .from(contracts)
    .innerJoin(teams, eq(teams.id, contracts.teamId))
    .where(eq(contracts.riderId, riderId))
    .limit(1)
  return rows[0] ?? null
}

/** Rechaza una oferta pendiente. */
export async function rejectOffer(db: Database, riderId: string, offerId: string): Promise<void> {
  await db
    .update(offers)
    .set({ status: 'rechazada' })
    .where(and(eq(offers.id, offerId), eq(offers.riderId, riderId), eq(offers.status, 'pendiente')))
}
