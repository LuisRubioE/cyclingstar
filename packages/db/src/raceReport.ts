import {
  SEASON_CALENDAR,
  type StageInput,
  TEST_TOUR,
  simulateStage,
  stageDayOfSeason,
} from '@cyclingstar/engine'
import { and, eq, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { riders, stageResults, stageSnapshots } from './schema.js'

/**
 * Informe personal de carrera (item extra del backlog): "qué ordené vs qué pasó". Toma la etapa
 * más reciente que corrió el corredor, reconstruye la crónica desde el snapshot sellado y extrae
 * solo los momentos en los que fue protagonista, junto a sus órdenes y su resultado.
 */

const SEASON_DAYS = 364
const TEST_TOUR_KEY = 'test-tour'

export interface RaceReportOrders {
  role: string
  mentality: string
  contestSprints: boolean
  contestClimbs: boolean
}

export interface RaceReportEvent {
  km: number
  plantilla: string
}

export interface RiderRaceReport {
  raceName: string
  stageName: string
  raceId: string
  stageDay: number
  orders: RaceReportOrders | null
  position: number
  fieldSize: number
  timeGapToWinnerS: number
  sprintPoints: number
  komPoints: number
  bonusS: number
  winnerName: string | null
  personalEvents: RaceReportEvent[]
}

/** Día de juego absoluto de una etapa (para ordenar por recencia). */
function absoluteDay(raceId: string, stageDay: number): number {
  if (raceId === TEST_TOUR_KEY) return stageDay
  const m = /^(.*):s(\d+)$/.exec(raceId)
  if (!m) return stageDay
  const race = SEASON_CALENDAR.find((r) => r.id === m[1])
  if (!race) return stageDay
  return Number(m[2]) * SEASON_DAYS + stageDayOfSeason(race, stageDay)
}

/** Nombre legible de la carrera y de la etapa. */
function raceMeta(raceId: string, stageDay: number): { raceName: string; stageName: string } {
  if (raceId === TEST_TOUR_KEY) {
    const st = TEST_TOUR.find((s) => s.day === stageDay)
    return { raceName: 'Test Tour', stageName: st?.name ?? `Stage ${stageDay}` }
  }
  const m = /^(.*):s(\d+)$/.exec(raceId)
  const race = m ? SEASON_CALENDAR.find((r) => r.id === m[1]) : undefined
  const stg = race?.stages[stageDay - 1]
  return {
    raceName: race?.name ?? raceId,
    stageName:
      race && race.stages.length > 1 ? (stg?.name ?? `Stage ${stageDay}`) : (race?.name ?? ''),
  }
}

/** Informe de la última carrera del corredor, o null si aún no ha corrido ninguna. */
export async function getRiderLastRaceReport(
  db: Database,
  riderId: string,
): Promise<RiderRaceReport | null> {
  const rows = await db
    .select({
      raceId: stageResults.raceId,
      stageDay: stageResults.stageDay,
      puesto: stageResults.puesto,
      tiempoS: stageResults.tiempoS,
      bonificacionS: stageResults.bonificacionS,
      puntosVolante: stageResults.puntosVolante,
      puntosMontana: stageResults.puntosMontana,
    })
    .from(stageResults)
    .where(eq(stageResults.riderId, riderId))
  if (rows.length === 0) return null

  // La etapa más reciente por día de juego absoluto.
  const latest = rows.reduce((best, r) =>
    absoluteDay(r.raceId, r.stageDay) > absoluteDay(best.raceId, best.stageDay) ? r : best,
  )

  const { raceName, stageName } = raceMeta(latest.raceId, latest.stageDay)

  // Tamaño del pelotón y ganador de la etapa.
  const fieldRow = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(stageResults)
    .where(and(eq(stageResults.raceId, latest.raceId), eq(stageResults.stageDay, latest.stageDay)))
  const fieldSize = fieldRow[0]?.n ?? 0

  const winnerRows = await db
    .select({ name: riders.name, tiempoS: stageResults.tiempoS })
    .from(stageResults)
    .innerJoin(riders, eq(riders.id, stageResults.riderId))
    .where(
      and(
        eq(stageResults.raceId, latest.raceId),
        eq(stageResults.stageDay, latest.stageDay),
        eq(stageResults.puesto, 1),
      ),
    )
    .limit(1)
  const winnerName = winnerRows[0]?.name ?? null
  const winnerTime = winnerRows[0]?.tiempoS ?? latest.tiempoS

  // Órdenes y crónica personal desde el snapshot sellado (re-simulación determinista).
  let orders: RaceReportOrders | null = null
  let personalEvents: RaceReportEvent[] = []
  const snapRows = await db
    .select({ seed: stageSnapshots.seed, input: stageSnapshots.input })
    .from(stageSnapshots)
    .where(
      and(eq(stageSnapshots.raceId, latest.raceId), eq(stageSnapshots.stageDay, latest.stageDay)),
    )
    .limit(1)
  const snap = snapRows[0]
  if (snap) {
    const input = snap.input as StageInput
    const mine = input.riders.find((r) => r.riderId === riderId)
    if (mine) {
      orders = {
        role: mine.orders.role,
        mentality: mine.orders.mentality,
        contestSprints: mine.orders.contestSprints,
        contestClimbs: mine.orders.contestClimbs,
      }
    }
    const output = simulateStage(input, snap.seed)
    personalEvents = output.events
      .filter((e) => e.protagonistas.includes(riderId))
      .map((e) => ({ km: Math.round(e.km), plantilla: e.plantilla }))
      .sort((a, b) => a.km - b.km)
      .filter(
        (e, i, arr) =>
          !arr[i - 1] || arr[i - 1]!.plantilla !== e.plantilla || arr[i - 1]!.km !== e.km,
      )
  }

  return {
    raceName,
    stageName,
    raceId: latest.raceId,
    stageDay: latest.stageDay,
    orders,
    position: latest.puesto,
    fieldSize,
    timeGapToWinnerS: Math.max(0, latest.tiempoS - winnerTime),
    sprintPoints: latest.puntosVolante,
    komPoints: latest.puntosMontana,
    bonusS: latest.bonificacionS,
    winnerName,
    personalEvents,
  }
}
