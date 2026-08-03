import { TEST_TOUR } from '@cyclingstar/engine'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { ensureTestTourField } from './npc.js'
import { raceRosters, riders } from './schema.js'
import { runOneStage } from './stageRun.js'

/**
 * La vuelta de prueba en el tick (Paso 30). Corre en los días de juego 1..5 (solo temporada 0) como
 * demo estable de la web (/results). Delega la simulación en el motor de etapa genérico (stageRun).
 */

const TEST_TOUR_ID = 'test-tour'
/** Tamaño del pelotón de la vuelta de prueba (humanos + NPC de relleno). */
const TEST_TOUR_FIELD = 30

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** La etapa de la vuelta de prueba que corre en este día de juego, o null. */
function stageForDay(gameDay: number): (typeof TEST_TOUR)[number] | null {
  return TEST_TOUR.find((s) => s.day === gameDay) ?? null
}

export async function raceWorldDay(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
): Promise<Set<string>> {
  const stage = stageForDay(gameDay)
  if (!stage) return new Set()

  // Convoca NPC del mundo si hace falta, para que la etapa sea una carrera de verdad (Paso 32/33).
  await ensureTestTourField(tx, worldId, TEST_TOUR_FIELD)

  const hasRoster = await tx
    .select({ riderId: raceRosters.riderId })
    .from(raceRosters)
    .innerJoin(riders, eq(riders.id, raceRosters.riderId))
    .where(and(eq(raceRosters.raceId, TEST_TOUR_ID), eq(riders.worldId, worldId)))
    .limit(1)
  if (hasRoster.length === 0) return new Set()

  const lastDay = Math.max(...TEST_TOUR.map((s) => s.day))
  return runOneStage(tx, worldId, gameDay, worldSeed, {
    raceKey: TEST_TOUR_ID,
    raceId: TEST_TOUR_ID,
    raceName: 'Test tour',
    level: 'WT',
    raceClass: 'WT',
    season: Math.floor(gameDay / 364),
    stageDay: stage.day,
    kind: stage.kind,
    profile: stage.profile,
    timeTrial: stage.timeTrial ?? false,
    isFinal: stage.day === lastDay,
  })
}
