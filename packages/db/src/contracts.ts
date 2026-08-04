import {
  type ContractRole,
  type Division,
  offerSalary,
  offerSeasons,
  releaseClause,
} from '@cyclingstar/engine'
import {
  COUNTRIES,
  HOUSING_RENT_PER_WEEK,
  continentForCountry,
  residenceAfterSigning,
  seededRng,
} from '@cyclingstar/shared'
import { and, desc, eq, gte, inArray, isNotNull, lt, or, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { emitNews } from './news.js'
import { contracts, gameState, offers, riderAttrs, riders, teams } from './schema.js'

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
/**
 * Días de juego que una oferta sigue en la mesa antes de caducar si el corredor no decide. Da frescura
 * al mercado (las ofertas viejas se retiran) y evita que un equipo cuya oferta se rechazó vuelva a
 * ofertar de inmediato (puede reintentar pasado este plazo).
 */
const OFFER_TTL_DAYS = 21
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
 * vigente) mantiene siempre una cartera de 3-5 ofertas frescas: si rechaza una (o caduca), se rellena
 * en la siguiente pasada; quien ya tiene contrato vigente aún no recibe (cambiar de equipo llegará con
 * los equipos de usuarios).
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

    // Caducan las ofertas pendientes que llevan demasiado tiempo sin decidir (frescura del mercado).
    await tx
      .update(offers)
      .set({ status: 'expirada' })
      .where(
        and(
          eq(offers.riderId, human.id),
          eq(offers.status, 'pendiente'),
          lt(offers.createdDay, gameDay - OFFER_TTL_DAYS),
        ),
      )

    // Agente libre: mantenemos una CARTERA de ofertas frescas y la rellenamos hasta un objetivo (3-5).
    // Así, al rechazar una (o al caducar), en la siguiente pasada entra otra en su lugar: no hace falta
    // vaciarlas todas para volver a recibir. Si ya está en el objetivo, no añadimos más.
    const pending = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(offers)
      .where(and(eq(offers.riderId, human.id), eq(offers.status, 'pendiente')))
    const pendingCount = pending[0]?.n ?? 0
    const rng = seededRng(`${worldSeed}:market:${human.id}:d${gameDay}`)
    const target = 3 + (rng() < 0.6 ? 1 : 0) + (rng() < 0.35 ? 1 : 0)
    const need = target - pendingCount
    if (need <= 0) continue

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
    const ranked = teamRows
      .map((t) => ({ ...t, gap: ROSTER_TARGET[t.division as Division] - t.roster }))
      // Dentro de cada grupo (país/continente/resto) tiran primero los que tienen hueco y más presupuesto.
      .sort((a, b) => b.gap - a.gap || b.budget - a.budget)

    // Más ofertas del PROPIO PAÍS; si no hay suficientes equipos válidos del país, se completa con el
    // CONTINENTE; y solo si aún faltan, con el resto del mundo. Un agente libre recibe sobre todo
    // ofertas de casa (los bots fichan compatriotas), sin cerrarse a alguna de fuera.
    const myContinent = continentForCountry(human.country ?? '')
    const sameCountry = ranked.filter((t) => t.country && t.country === human.country)
    const sameContinent = ranked.filter(
      (t) => t.country !== human.country && continentForCountry(t.country ?? '') === myContinent,
    )
    const elsewhere = ranked.filter(
      (t) => t.country !== human.country && continentForCountry(t.country ?? '') !== myContinent,
    )
    const ordered = [...sameCountry, ...sameContinent, ...elsewhere]

    // No repetimos un equipo que ya tiene oferta pendiente ni uno cuya oferta se rechazó hace poco (no
    // spamear al que dijo que no); pasado OFFER_TTL_DAYS un equipo puede volver a intentarlo.
    const usedRows = await tx
      .select({ teamId: offers.teamId })
      .from(offers)
      .where(
        and(
          eq(offers.riderId, human.id),
          or(
            eq(offers.status, 'pendiente'),
            and(eq(offers.status, 'rechazada'), gte(offers.createdDay, gameDay - OFFER_TTL_DAYS)),
          ),
        ),
      )
    const used = new Set(usedRows.map((r) => r.teamId))
    // Rellenamos la cartera hasta el objetivo con equipos nuevos (los `need` que faltan).
    const chosen = ordered.filter((t) => !used.has(t.id)).slice(0, need)
    if (chosen.length === 0) continue

    for (const team of chosen) {
      const division = team.division as Division
      const role = roleForRating(rating)
      const full = offerSalary({ division, pointsPercentile: rating, age, role })
      const seasons = offerSeasons(rating, rng)
      // Fichaje internacional: el equipo de fuera A VECES asume el alquiler de vivienda del corredor
      // (se mudará a otro país) a cambio de rebajar el salario por el importe del alquiler. El corredor
      // queda igual de caja y gana certeza; unas ofertas de fuera lo cubren y otras no (como reclamo).
      const abroad = !!team.country && team.country !== human.country
      const payHousing = abroad && rng() < 0.55
      const salary = payHousing ? Math.max(1, full - HOUSING_RENT_PER_WEEK) : full
      await tx.insert(offers).values({
        riderId: human.id,
        teamId: team.id,
        season,
        role,
        salary,
        seasons,
        releaseClause: releaseClause(salary, seasons),
        createdDay: gameDay,
        payHousing,
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
  /** El equipo pagaría el alquiler de vivienda del corredor (fichaje internacional). */
  payHousing: boolean
  /** País (ISO) al que se mudaría el corredor si es un fichaje internacional; null si se queda en casa. */
  relocatesTo: string | null
}

/** Ofertas pendientes de un corredor, con el equipo que las hace. */
export async function getOffers(db: Database, riderId: string): Promise<OfferRow[]> {
  const me = await db
    .select({ country: riders.country })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  const nationality = me[0]?.country ?? null
  const rows = await db
    .select({
      id: offers.id,
      teamId: teams.id,
      teamName: teams.name,
      teamCountry: teams.country,
      division: teams.division,
      role: offers.role,
      salary: offers.salary,
      seasons: offers.seasons,
      releaseClause: offers.releaseClause,
      payHousing: offers.payHousing,
    })
    .from(offers)
    .innerJoin(teams, eq(teams.id, offers.teamId))
    .where(and(eq(offers.riderId, riderId), eq(offers.status, 'pendiente')))
    .orderBy(desc(offers.salary))
  return rows.map(({ teamCountry, ...r }) => ({
    ...r,
    relocatesTo: teamCountry && teamCountry !== nationality ? teamCountry : null,
  }))
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
      payHousing: offer.payHousing,
    })
    // Al firmar, el corredor se muda al país del equipo (allí está la base y entrena con el grupo):
    // si es extranjero, empieza a pagar alquiler (o el equipo lo asume). Movemos residencia con equipo.
    const teamRow = await tx
      .select({ country: teams.country, nationality: riders.country })
      .from(riders)
      .innerJoin(teams, eq(teams.id, offer.teamId))
      .where(eq(riders.id, riderId))
      .limit(1)
    const residence = residenceAfterSigning(
      teamRow[0]?.nationality ?? null,
      teamRow[0]?.country ?? null,
    )
    await tx.update(riders).set({ teamId: offer.teamId, residence }).where(eq(riders.id, riderId))
    await tx.update(offers).set({ status: 'aceptada' }).where(eq(offers.id, offerId))

    // Noticia del fichaje (Paso 39), personal del corredor.
    const info = await tx
      .select({ worldId: riders.worldId, rider: riders.name, team: teams.name })
      .from(riders)
      .innerJoin(teams, eq(teams.id, offer.teamId))
      .where(eq(riders.id, riderId))
      .limit(1)
    if (info[0]) {
      // Si el corredor se muda a otro país, la noticia lo cuenta (y si el equipo le cubre la vivienda).
      const teamCountry = teamRow[0]?.country ?? null
      const abroad = !!teamCountry && teamCountry !== (teamRow[0]?.nationality ?? null)
      const countryName = COUNTRIES.find((c) => c.code === teamCountry)?.name ?? teamCountry
      const detail = abroad
        ? `, relocating to ${countryName}${offer.payHousing ? ' with housing covered' : ''}`
        : ''
      // El fichaje se fecha el día de la FIRMA (hoy), no el día en que llegó la oferta.
      const clock = await tx.select({ currentDay: gameState.currentDay }).from(gameState).limit(1)
      await emitNews(tx, {
        worldId: info[0].worldId,
        gameDay: clock[0]?.currentDay ?? offer.createdDay,
        kind: 'contract',
        seed: `contract:${offerId}`,
        data: { rider: info[0].rider, team: info[0].team, detail },
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
