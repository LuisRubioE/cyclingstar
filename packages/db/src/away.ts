import {
  type AwayFacts,
  GAME_DAYS_PER_REAL_DAY_ESTIMATE,
  OFFER_TTL_GAME_DAYS,
  type WelcomeBack,
  currentSeason,
  gameDayToReal,
} from '@cyclingstar/shared'
import { and, eq, gt, gte, like, lte, min, not, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { isAway } from './inactivity.js'
import { contracts, offers, riderDailyLog, riders, teams, users } from './schema.js'
import { getPlanForDay } from './training.js'

/**
 * LA AUSENCIA EN LA BASE (docs/cuenta.md §14; PR 13 de E4): declararla, terminarla antes, leerla con los datos
 * de las líneas de `Away`, y `Welcome back` con sus cifras. Ausente es `away_until > now()`; las dos columnas
 * van juntas (`users_away_pair`). Entrar no la termina: nada de aquí se llama al leer una página.
 */

const DIA_MS = 86_400_000

export interface AwayState {
  readonly awaySince: Date | null
  readonly awayUntil: Date | null
}

/** La ausencia VIVA de la cuenta, o las dos a null sin ella; null si la cuenta no existe. */
export async function readAway(
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<AwayState | null> {
  const [u] = await db
    .select({ awaySince: users.awaySince, awayUntil: users.awayUntil })
    .from(users)
    .where(eq(users.id, userId))
  if (u === undefined) return null
  return isAway(u, now) ? u : { awaySince: null, awayUntil: null }
}

/**
 * Declara la ausencia hasta `until` (§14.1; 14-e). La ventana la comprueba quien llama. Sin ausencia viva,
 * `away_since` es ahora; con ella, se queda y solo cambia la vuelta. Null si la cuenta no existe.
 */
export async function setAway(
  db: Database,
  userId: string,
  until: Date,
): Promise<{ readonly awaySince: Date; readonly awayUntil: Date } | null> {
  const [u] = await db
    .update(users)
    .set({
      awaySince: sql`case when ${users.awayUntil} > now() then ${users.awaySince} else now() end`,
      awayUntil: until,
    })
    .where(eq(users.id, userId))
    .returning({ awaySince: users.awaySince, awayUntil: users.awayUntil })
  if (u === undefined || u.awaySince === null || u.awayUntil === null) return null
  return { awaySince: u.awaySince, awayUntil: u.awayUntil }
}

/**
 * `End now` (§14.3): la vuelta pasa a ahora, `away_since` se queda y `welcome_back_from` la toma (14-d).
 * Cuenta como visita (`last_seen_at`), para que `touchLastSeen` no vuelva a abrir el `Welcome back` que el
 * jugador cierre. Sin ausencia viva no hace nada.
 */
export async function endAway(db: Database, userId: string): Promise<void> {
  await db
    .update(users)
    .set({ awayUntil: sql`now()`, welcomeBackFrom: users.awaySince, lastSeenAt: sql`now()` })
    .where(and(eq(users.id, userId), gt(users.awayUntil, sql`now()`)))
}

/** El corredor del jugador, con lo que piden las dos pantallas. */
async function riderOf(db: Database, userId: string) {
  const [r] = await db
    .select({
      id: riders.id,
      name: riders.name,
      gender: riders.gender,
      trainingMode: riders.trainingMode,
    })
    .from(riders)
    .where(eq(riders.userId, userId))
    .limit(1)
  return r ?? null
}

/**
 * LO QUE LAS LÍNEAS DE `Away` NECESITAN SABER (§14.1, la tabla), con lo que hay ese día y sin tocar el motor
 * (D-52): el plan vivo y su último día en tiempo real estimado (en `entrenador` el plan no manda, y la línea
 * es la del entrenador), si es agente libre o su contrato vence esta temporada, y si dirige un equipo.
 */
export async function awayFacts(
  db: Database,
  userId: string,
  currentDay: number,
  now: Date = new Date(),
): Promise<AwayFacts> {
  const [equipo] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.ownerUserId, userId))
    .limit(1)
  const managesTeam = equipo !== undefined
  const r = await riderOf(db, userId)
  if (r === null) return { rider: null, managesTeam }
  // el plan de mañana cubre también el que empieza mañana (`startFresh`) y el que sigue hoy
  const vivo =
    r.trainingMode === 'entrenador' ? null : await getPlanForDay(db, r.id, currentDay + 1)
  const [contrato] = await db
    .select({ endSeason: contracts.endSeason })
    .from(contracts)
    .where(eq(contracts.riderId, r.id))
  return {
    rider: {
      name: r.name,
      gender: r.gender,
      planEndsAt:
        vivo === null
          ? null
          : gameDayToReal(vivo.plan.startDay + 27, currentDay, now).toISOString(),
      freeAgent: contrato === undefined,
      contractEnding: contrato !== undefined && contrato.endSeason <= currentSeason(currentDay),
    },
    managesTeam,
  }
}

/**
 * `Welcome back` (§14.5; 14-d): desde `welcome_back_from` hasta ahora, los días reales y los de juego
 * (estimados), cuántos de esos entrenó y cuántas etapas corrió el corredor (`rider_daily_log.activity`), y
 * sus ofertas caducadas desde entonces y abiertas. Quién decidió cada día no se guarda, así que no se dice.
 * Null sin nada pendiente o con la ausencia todavía viva.
 */
export async function welcomeBack(
  db: Database,
  userId: string,
  currentDay: number,
  now: Date = new Date(),
): Promise<WelcomeBack | null> {
  const [u] = await db
    .select({ from: users.welcomeBackFrom, awayUntil: users.awayUntil })
    .from(users)
    .where(eq(users.id, userId))
  if (u === undefined || u.from === null || isAway(u, now)) return null
  const ms = Math.max(0, now.getTime() - u.from.getTime())
  const days = Math.max(1, Math.round(ms / DIA_MS))
  const gameDays = Math.min(
    Math.max(0, currentDay),
    Math.round((ms / DIA_MS) * GAME_DAYS_PER_REAL_DAY_ESTIMATE),
  )
  const base = { from: u.from.toISOString(), days, gameDays }
  const r = await riderOf(db, userId)
  if (r === null)
    return { ...base, rider: null, offers: { expired: 0, open: 0, firstExpiresAt: null } }

  const desde = currentDay - gameDays
  const ventana = and(
    eq(riderDailyLog.riderId, r.id),
    gt(riderDailyLog.gameDay, desde),
    lte(riderDailyLog.gameDay, currentDay),
  )
  const [dias] = await db
    .select({
      stages: sql<number>`count(*) filter (where ${like(riderDailyLog.activity, 'carrera:%')})::int`,
      trained: sql<number>`count(*) filter (where ${and(
        not(like(riderDailyLog.activity, 'carrera:%')),
        sql`${riderDailyLog.activity} <> 'viaje'`,
      )})::int`,
    })
    .from(riderDailyLog)
    .where(ventana)
  const [caducadas] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(offers)
    .where(
      and(
        eq(offers.riderId, r.id),
        eq(offers.status, 'expirada'),
        gte(offers.createdDay, desde - OFFER_TTL_GAME_DAYS),
      ),
    )
  const [abiertas] = await db
    .select({ n: sql<number>`count(*)::int`, primera: min(offers.createdDay) })
    .from(offers)
    .where(and(eq(offers.riderId, r.id), eq(offers.status, 'pendiente')))
  const primera = abiertas?.primera ?? null
  return {
    ...base,
    rider: {
      id: r.id,
      name: r.name,
      trainedDays: dias?.trained ?? 0,
      stages: dias?.stages ?? 0,
    },
    offers: {
      expired: caducadas?.n ?? 0,
      open: abiertas?.n ?? 0,
      firstExpiresAt:
        primera === null
          ? null
          : gameDayToReal(primera + OFFER_TTL_GAME_DAYS, currentDay, now).toISOString(),
    },
  }
}

/** Cerrar `Welcome back` (`DELETE /api/me/welcome-back`): `welcome_back_from` a nula. */
export async function dismissWelcomeBack(db: Database, userId: string): Promise<void> {
  await db.update(users).set({ welcomeBackFrom: null }).where(eq(users.id, userId))
}
