import { and, eq, isNull, notExists, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { raceRosters, riders } from './schema.js'

/**
 * Convocatoria de la vuelta de prueba desde el mundo real (Paso 33). Desde la génesis (SPEC 10)
 * el mundo ya tiene ~1.600 corredores NPC con equipo; la vuelta convoca a los que hagan falta.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const TEST_TOUR_ID = 'test-tour'

/**
 * Asegura un pelotón de al menos `target` corredores en la vuelta de prueba convocando NPC del
 * mundo que aún no estén en el roster. Idempotente: no hace nada si ya hay suficientes.
 */
export async function ensureTestTourField(tx: Tx, worldId: string, target: number): Promise<void> {
  const countRows = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(raceRosters)
    .where(eq(raceRosters.raceId, TEST_TOUR_ID))
  const current = countRows[0]?.n ?? 0
  if (current >= target) return

  // NPC del mundo que aún no están convocados a la vuelta.
  const candidates = await tx
    .select({ id: riders.id })
    .from(riders)
    .where(
      and(
        eq(riders.worldId, worldId),
        isNull(riders.userId),
        notExists(
          tx
            .select({ one: sql`1` })
            .from(raceRosters)
            .where(and(eq(raceRosters.raceId, TEST_TOUR_ID), eq(raceRosters.riderId, riders.id))),
        ),
      ),
    )
    .limit(target - current)

  if (candidates.length === 0) return
  await tx
    .insert(raceRosters)
    .values(candidates.map((c) => ({ raceId: TEST_TOUR_ID, riderId: c.id })))
    .onConflictDoNothing()
}
