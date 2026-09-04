import {
  type Attribute,
  ATTRIBUTES,
  type Gender,
  type PublicRider,
  type Vocation,
} from '@cyclingstar/shared'
import type { StageEffort } from '@cyclingstar/engine'
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import {
  contracts,
  gameState,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  teams,
  worlds,
} from './schema.js'

/**
 * Servicios de datos del ciclista (Paso 15). La creación inserta el corredor, sus atributos
 * visibles y su genoma oculto en una transacción. Los atributos ocultos (techos, talento...)
 * nunca se exponen a la web.
 */

export interface RiderHiddenInput {
  talent: number
  fragility: number
  peakAge: number
  declineAge: number
  ceilings: Record<Attribute, number>
}

export interface CreateRiderInput {
  worldId: string
  userId: string
  name: string
  country: string
  gender: Gender
  archetype: Vocation
  birthSeason: number
  faceSeed: string
  attributes: Record<Attribute, number>
  hidden: RiderHiddenInput
}

/** Día actual y creación del mundo (epoch ms), para calcular la cuenta atrás del próximo avance. */
export async function getWorldClock(
  db: Database,
): Promise<{ currentDay: number; createdAtMs: number } | null> {
  const rows = await db
    .select({ currentDay: gameState.currentDay, createdAt: worlds.createdAt })
    .from(gameState)
    .innerJoin(worlds, eq(worlds.id, gameState.worldId))
    .limit(1)
  const row = rows[0]
  return row ? { currentDay: row.currentDay, createdAtMs: row.createdAt.getTime() } : null
}

/** Mundo actual y día de juego (o null si aún no hubo génesis). */
export async function getCurrentWorld(
  db: Database,
): Promise<{ worldId: string; currentDay: number; worldSeed: string } | null> {
  const rows = await db
    .select({
      worldId: gameState.worldId,
      currentDay: gameState.currentDay,
      worldSeed: worlds.worldSeed,
    })
    .from(gameState)
    .innerJoin(worlds, eq(worlds.id, gameState.worldId))
    .limit(1)
  const row = rows[0]
  return row ? { worldId: row.worldId, currentDay: row.currentDay, worldSeed: row.worldSeed } : null
}

/** Crea un corredor con sus atributos y su genoma oculto (una transacción). */
export async function createRider(db: Database, input: CreateRiderInput): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(riders)
      .values({
        worldId: input.worldId,
        userId: input.userId,
        name: input.name,
        country: input.country,
        residence: input.country, // un corredor nuevo vive en su país hasta que fiche por un equipo
        gender: input.gender,
        birthSeason: input.birthSeason,
        archetype: input.archetype,
        faceSeed: input.faceSeed,
      })
      .returning({ id: riders.id })

    const rider = inserted[0]
    if (!rider) {
      throw new Error('no se pudo crear el corredor')
    }

    await tx
      .insert(riderAttrs)
      .values(
        ATTRIBUTES.map((attr) => ({ riderId: rider.id, attr, value: input.attributes[attr] })),
      )

    await tx.insert(riderHidden).values({
      riderId: rider.id,
      talent: input.hidden.talent,
      ceilings: input.hidden.ceilings,
      fragility: input.hidden.fragility,
      peakAge: input.hidden.peakAge,
      declineAge: input.hidden.declineAge,
    })

    return { id: rider.id }
  })
}

/**
 * Cambia la vocación declarada (la "etiqueta") del corredor. No toca techos ni atributos: el
 * corredor decide luego alinear su entrenamiento; además influye en las convocatorias por tipo
 * de carrera (la IA lee el archetype).
 */
export async function setRiderArchetype(
  db: Database,
  riderId: string,
  archetype: Vocation,
): Promise<void> {
  await db.update(riders).set({ archetype }).where(eq(riders.id, riderId))
}

/** El ciclista del usuario (con atributos visibles), o null si aún no ha creado uno. */
/**
 * El corredor ACTIVO de un usuario. El filtro por `retiredAt` es de la v47 y es lo que hace posible
 * el relevo: cuando el rollover jubila a los 39, este hombre deja de ser «tu ciclista» —pasa a ser
 * historia, con su palmarés intacto— y el jugador puede crearse uno nuevo. Sin el filtro, el retirado
 * seguiría bloqueando la creación y la jubilación sería el final de la partida en vez de un capítulo.
 */
export async function getRiderForUser(db: Database, userId: string): Promise<PublicRider | null> {
  const riderRows = await db
    .select()
    .from(riders)
    .where(and(eq(riders.userId, userId), isNull(riders.retiredAt)))
    .limit(1)
  const rider = riderRows[0]
  if (!rider) return null

  const attrRows = await db.select().from(riderAttrs).where(eq(riderAttrs.riderId, rider.id))
  const attributes = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) attributes[attr] = 0
  for (const row of attrRows) attributes[row.attr] = row.value

  return {
    id: rider.id,
    name: rider.name,
    country: rider.country,
    gender: rider.gender,
    archetype: rider.archetype,
    birthSeason: rider.birthSeason,
    attributes,
  }
}

export type HealthState = 'sano' | 'molestias' | 'enfermo' | 'lesionado'
export interface RiderHealth {
  state: HealthState
  /** Día de juego hasta el que dura la baja (enfermo/lesionado); null si está sano. */
  untilDay: number | null
}

/** Estado de salud del corredor (sano / molestias / enfermo / lesionado) y hasta cuándo dura la baja. */
export async function getRiderHealth(db: Database, riderId: string): Promise<RiderHealth | null> {
  const rows = await db
    .select({ health: riders.health, healthUntilDay: riders.healthUntilDay })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  return { state: r.health as HealthState, untilDay: r.healthUntilDay }
}

export interface RiderSummary {
  teamId: string | null
  teamName: string | null
  money: number
  morale: number
  fame: number
  seasonPoints: number
  /** Puesto en el ranking de la temporada (por puntos) entre los corredores en activo del mundo. */
  seasonRank: number
  /** Corredores en activo del mundo (tamaño del ranking). */
  fieldSize: number
  /** Nacionalidad (país de origen, casa familiar). */
  nationality: string
  /** País de residencia actual (dónde vive/entrena). */
  residence: string
  /** El contrato cubre el alquiler de vivienda (el equipo lo paga). */
  housingCovered: boolean
}

/**
 * Ranking de temporada por puntos entre los corredores en activo del mundo: puesto (cuántos tienen
 * más puntos, +1) y tamaño del campo. Reutilizado por la ficha propia y la pública.
 */
export async function getSeasonRank(
  db: Database,
  worldId: string,
  seasonPoints: number,
): Promise<{ seasonRank: number; fieldSize: number }> {
  const activeWorld = and(eq(riders.worldId, worldId), isNull(riders.retiredAt))
  const betterRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(riders)
    .where(and(activeWorld, gt(riders.seasonPoints, seasonPoints)))
  const totalRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(riders)
    .where(activeWorld)
  return { seasonRank: (betterRows[0]?.n ?? 0) + 1, fieldSize: totalRows[0]?.n ?? 0 }
}

/** Estado del corredor para la cabecera del perfil: equipo, dinero, moral, fama, puntos y ranking. */
export async function getRiderSummary(db: Database, riderId: string): Promise<RiderSummary | null> {
  const rows = await db
    .select({
      worldId: riders.worldId,
      teamId: riders.teamId,
      teamName: teams.name,
      money: riders.money,
      morale: riders.morale,
      fame: riders.fame,
      seasonPoints: riders.seasonPoints,
      nationality: riders.country,
      residence: riders.residence,
      housingCovered: contracts.payHousing,
    })
    .from(riders)
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .leftJoin(contracts, eq(contracts.riderId, riders.id))
    .where(eq(riders.id, riderId))
    .limit(1)
  const me = rows[0]
  if (!me) return null

  const rank = await getSeasonRank(db, me.worldId, me.seasonPoints)
  return {
    teamId: me.teamId,
    teamName: me.teamName,
    money: me.money,
    morale: me.morale,
    fame: me.fame,
    seasonPoints: me.seasonPoints,
    seasonRank: rank.seasonRank,
    fieldSize: rank.fieldSize,
    nationality: me.nationality,
    residence: me.residence ?? me.nationality,
    housingCovered: me.housingCovered ?? false,
  }
}

export interface DailyLogRow {
  gameDay: number
  ctl: number
  atl: number
  tsb: number
  tss: number
  activity: string
  /**
   * EL PARTE DEL DÍA DE CARRERA (v47): en qué se le fue la energía. `null` en los días de
   * entrenamiento —no hay carrera que contar— y en las etapas anteriores a la v47.
   */
  parte: StageEffort | null
}

/** Serie diaria de carga/forma (SPEC 4, 11) para la gráfica del perfil, orden ascendente. */
export async function getDailyLog(
  db: Database,
  riderId: string,
  limitDays: number,
): Promise<DailyLogRow[]> {
  const rows = await db
    .select({
      gameDay: riderDailyLog.gameDay,
      ctl: riderDailyLog.ctl,
      atl: riderDailyLog.atl,
      tsb: riderDailyLog.tsb,
      tss: riderDailyLog.tss,
      activity: riderDailyLog.activity,
      parte: riderDailyLog.parte,
    })
    .from(riderDailyLog)
    .where(eq(riderDailyLog.riderId, riderId))
    .orderBy(desc(riderDailyLog.gameDay))
    .limit(limitDays)
  return rows.reverse()
}
