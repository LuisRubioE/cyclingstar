import {
  type Division,
  SPONSOR_INCOME_PER_WEEK,
  gcPrizes,
  npcWageBill,
  stagePrize,
  teamGcPrizes,
  teamStagePrize,
} from '@cyclingstar/engine'
import type { RaceLevel } from '@cyclingstar/engine'
import { HOUSING_RENT_PER_WEEK, weeklyHousingCost } from '@cyclingstar/shared'
import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { contracts, riders, teams, transactions } from './schema.js'

/**
 * Economía del corredor (SPEC 9, Paso 38). Salario semanal (desde el contrato), premios de carrera
 * y el libro de transacciones. El saldo (`riders.money`) se mueve siempre junto a una entrada del
 * libro, así que cuadra con la suma del historial. Los NPC no llevan libro (economía no observada).
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

type TxnKind = 'salario' | 'premio' | 'staff' | 'patrocinador' | 'viaje' | 'vivienda' | 'otro'

/** Apunta una transacción y mueve el saldo del corredor en la misma operación. */
export async function creditRider(
  tx: Tx,
  riderId: string,
  gameDay: number,
  kind: TxnKind,
  amount: number,
  note: string,
): Promise<void> {
  if (amount === 0) return
  await tx.insert(transactions).values({ riderId, gameDay, kind, amount, note })
  await tx
    .update(riders)
    .set({ money: sql`${riders.money} + ${amount}` })
    .where(eq(riders.id, riderId))
}

/**
 * Nómina semanal (SPEC 9): paga el salario del contrato a los corredores humanos y les cobra el
 * ALQUILER de vivienda si residen fuera de su país (la casa familiar es gratis). Ambos apuntes van al
 * libro del corredor, así que el saldo cuadra. Los que viven en su país solo cobran salario.
 */
export async function runPayroll(tx: Tx, worldId: string, gameDay: number): Promise<void> {
  if (gameDay % 7 !== 0) return
  const rows = await tx
    .select({
      riderId: contracts.riderId,
      salary: contracts.salary,
      payHousing: contracts.payHousing,
      residence: riders.residence,
      nationality: riders.country,
    })
    .from(contracts)
    .innerJoin(riders, eq(riders.id, contracts.riderId))
    .where(and(eq(riders.worldId, worldId), isNotNull(riders.userId)))
  const week = Math.floor(gameDay / 7)
  for (const row of rows) {
    await creditRider(tx, row.riderId, gameDay, 'salario', row.salary, `Weekly salary · wk ${week}`)
    // El corredor paga el alquiler solo si vive fuera de su país y el equipo NO lo cubre (contrato).
    const rent = row.payHousing ? 0 : weeklyHousingCost(row.residence, row.nationality)
    if (rent > 0) {
      await creditRider(tx, row.riderId, gameDay, 'vivienda', -rent, `Housing rent · wk ${week}`)
    }
  }
}

/**
 * Finanzas semanales del EQUIPO: el presupuesto es una cuenta viva. Cada semana entra el patrocinio
 * (por división) y salen la masa salarial de la plantilla —estimada para los NPC, real para los
 * corredores humanos con contrato— y el alquiler de vivienda que el equipo asuma (contratos
 * pay_housing de corredores que residen fuera de su país). El patrocinio se dimensiona para cubrir a
 * grandes rasgos la nómina, de modo que el margen (y los viajes) marcan la diferencia. Sin libro por
 * equipo: se ajusta el presupuesto directamente (los NPC no observan su economía al detalle).
 */
export async function runTeamFinances(tx: Tx, worldId: string, gameDay: number): Promise<void> {
  if (gameDay % 7 !== 0) return
  const teamRows = await tx
    .select({ id: teams.id, division: teams.division })
    .from(teams)
    .where(eq(teams.worldId, worldId))

  // Nº de corredores NPC en activo por equipo (masa salarial estimada).
  const npcRows = await tx
    .select({ teamId: riders.teamId, n: sql<number>`count(*)::int` })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNull(riders.userId), isNull(riders.retiredAt)))
    .groupBy(riders.teamId)
  const npcByTeam = new Map(npcRows.map((r) => [r.teamId, r.n]))

  // Salario y alquiler cubierto de los corredores humanos con contrato, por equipo.
  const humanRows = await tx
    .select({
      teamId: contracts.teamId,
      salary: contracts.salary,
      payHousing: contracts.payHousing,
      residence: riders.residence,
      nationality: riders.country,
    })
    .from(contracts)
    .innerJoin(riders, eq(riders.id, contracts.riderId))
    .where(and(eq(riders.worldId, worldId), isNotNull(riders.userId)))
  const humanCostByTeam = new Map<string, number>()
  for (const r of humanRows) {
    const rent =
      r.payHousing && weeklyHousingCost(r.residence, r.nationality) > 0 ? HOUSING_RENT_PER_WEEK : 0
    humanCostByTeam.set(r.teamId, (humanCostByTeam.get(r.teamId) ?? 0) + r.salary + rent)
  }

  for (const team of teamRows) {
    const div = team.division as Division
    const income = SPONSOR_INCOME_PER_WEEK[div]
    const wages =
      npcWageBill(div, npcByTeam.get(team.id) ?? 0) + (humanCostByTeam.get(team.id) ?? 0)
    const net = income - wages
    if (net !== 0) {
      await tx
        .update(teams)
        .set({ budget: sql`${teams.budget} + ${net}` })
        .where(eq(teams.id, team.id))
    }
  }
}

/**
 * Premios de una etapa ya corrida: premio al ganador y, si es la última etapa, reparto de la
 * general (SPEC 9). Solo se apuntan los de corredores humanos. `standings` viene ordenada.
 */
export async function awardRacePrizes(
  tx: Tx,
  gameDay: number,
  level: RaceLevel,
  raceName: string,
  stageWinnerId: string,
  isFinalStage: boolean,
  gcOrder: string[],
): Promise<void> {
  const ids = [...new Set([stageWinnerId, ...gcOrder.slice(0, gcPrizes(level).length)])]
  const rows = await tx
    .select({ id: riders.id, userId: riders.userId, teamId: riders.teamId })
    .from(riders)
    .where(inArray(riders.id, ids))
  const humans = new Set(rows.filter((r) => r.userId != null).map((r) => r.id))
  const teamByRider = new Map(rows.map((r) => [r.id, r.teamId]))

  // Premio personal del CORREDOR humano (a su bolsillo) + premio de EQUIPO (a su presupuesto): los
  // resultados dan ingresos al equipo, no solo el patrocinio. El de equipo va a todos (NPC o humano).
  const creditTeam = async (riderId: string, amount: number) => {
    const teamId = teamByRider.get(riderId)
    if (teamId) {
      await tx
        .update(teams)
        .set({ budget: sql`${teams.budget} + ${amount}` })
        .where(eq(teams.id, teamId))
    }
  }

  if (humans.has(stageWinnerId)) {
    await creditRider(
      tx,
      stageWinnerId,
      gameDay,
      'premio',
      stagePrize(level),
      `${raceName} · stage win`,
    )
  }
  await creditTeam(stageWinnerId, teamStagePrize(level))
  if (isFinalStage) {
    const prizes = gcPrizes(level)
    const teamPrizes = teamGcPrizes(level)
    for (let i = 0; i < gcOrder.length && i < prizes.length; i++) {
      const riderId = gcOrder[i]!
      if (humans.has(riderId)) {
        await creditRider(tx, riderId, gameDay, 'premio', prizes[i]!, `${raceName} · GC #${i + 1}`)
      }
      await creditTeam(riderId, teamPrizes[i]!)
    }
  }
}

export interface LedgerEntry {
  gameDay: number
  kind: string
  amount: number
  note: string
}

export interface Ledger {
  balance: number
  entries: LedgerEntry[]
}

/** Libro de transacciones y saldo del corredor para el perfil. */
export async function getLedger(db: Database, riderId: string, limit = 60): Promise<Ledger> {
  const balanceRows = await db
    .select({ money: riders.money })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  const entries = await db
    .select({
      gameDay: transactions.gameDay,
      kind: transactions.kind,
      amount: transactions.amount,
      note: transactions.note,
    })
    .from(transactions)
    .where(eq(transactions.riderId, riderId))
    .orderBy(desc(transactions.gameDay), desc(transactions.createdAt))
    .limit(limit)
  return { balance: balanceRows[0]?.money ?? 0, entries }
}
