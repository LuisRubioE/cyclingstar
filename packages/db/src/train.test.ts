import { ATTRIBUTES } from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  teams,
  trainingOrders,
  worlds,
} from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { trainWorldDay } from './train.js'

/**
 * El día de VIAJE contra Postgres real (PGlite).
 *
 * Un corredor que vuelve de una carrera lejana entraba en el `skip` de `trainWorldDay` y salía por
 * `continue`, así que no llegaba a pasar por `simulateRiderDay`: su CTL/ATL se quedaban CONGELADOS
 * (viajar no descansaba nada) y no se escribía fila en `rider_daily_log`. Las dos consecuencias las
 * vio el dueño: "hice descanso activo y no mejoró mi frescura" (la sesión elegida ni se ejecutaba) y
 * un gráfico de forma que caía en vertical, porque cosía dos puntos con días de agujero en medio.
 */

const GAME_DAY = 100

interface Seeded {
  worldId: string
  travelling: string
  resting: string
  racing: string
}

async function seedWorld(t: TestDb): Promise<Seeded> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-viaje', engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = world!.id
  const [team] = await t.db
    .insert(teams)
    .values({
      worldId,
      name: 'Equipo de pruebas',
      division: 'WT',
      philosophy: 'general',
      jerseySeed: 'j0',
      country: 'ES',
    })
    .returning({ id: teams.id })

  // Los tres llegan al día con la MISMA carga (fatiga alta, como tras una tanda de carreras), para
  // que lo único que los distinga sea lo que hacen hoy.
  const inserted = await t.db
    .insert(riders)
    .values(
      ['viajero', 'descansa', 'corre'].map((tag, i) => ({
        worldId,
        teamId: team!.id,
        name: `Corredor ${tag}`,
        country: 'ES',
        gender: 'M' as const,
        birthSeason: -6, // 26 años el día 100: fuera de la zona de decaimiento por edad
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
        ctl: 60,
        atl: 130,
        // El viajero aún no ha llegado a casa hoy; los otros dos no viajan.
        travelUntilDay: tag === 'viajero' ? GAME_DAY : null,
      })),
    )
    .returning({ id: riders.id })
  const [travelling, resting, racing] = inserted.map((r) => r.id) as [string, string, string]

  await t.db
    .insert(riderAttrs)
    .values(
      [travelling, resting, racing].flatMap((id) =>
        ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 })),
      ),
    )
  await t.db.insert(riderHidden).values(
    [travelling, resting, racing].map((id) => ({
      riderId: id,
      talent: 1,
      // Fragilidad 0 para que la tirada de enfermedad no ensucie la medición de la carga.
      ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])),
      fragility: 0,
      peakAge: 28,
      declineAge: 33,
    })),
  )
  // Órdenes explícitas: el que descansa hace descanso TOTAL (TSS 0). Así la comparación con el
  // viaje (TSS 15) tiene un sentido definido y no depende del plan que toque al entrenador ese día.
  await t.db.insert(trainingOrders).values([
    { riderId: travelling, gameDay: GAME_DAY, session: 'puertos', intensity: 'fuerte' },
    { riderId: resting, gameDay: GAME_DAY, session: 'descanso_total', intensity: 'normal' },
  ])
  return { worldId, travelling, resting, racing }
}

describe('db: el día de viaje cuenta como día vivido, no como día congelado', () => {
  let t: TestDb
  let s: Seeded

  beforeAll(async () => {
    t = await startTestDb()
    s = await seedWorld(t)
    // `skip` trae a quien YA ha corrido hoy: la carrera fue su carga y `stageRun` escribe su diario.
    await t.db.transaction((tx) =>
      trainWorldDay(tx, s.worldId, GAME_DAY, 'semilla-viaje', new Set([s.racing])),
    )
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  const logOf = async (riderId: string) =>
    (
      await t.db
        .select()
        .from(riderDailyLog)
        .where(and(eq(riderDailyLog.riderId, riderId), eq(riderDailyLog.gameDay, GAME_DAY)))
    )[0]

  const riderOf = async (riderId: string) =>
    (await t.db.select().from(riders).where(eq(riders.id, riderId)))[0]!

  it('el viajero deja fila en el diario, con el viaje como actividad', async () => {
    const log = await logOf(s.travelling)
    expect(log).toBeDefined()
    expect(log!.activity).toBe('viaje')
    // Sin esta fila el gráfico de forma une dos puntos separados por días y la caída sale vertical.
  })

  it('el viajero SÍ recupera: su fatiga baja, aunque menos que la del que descansa', async () => {
    const travelled = await riderOf(s.travelling)
    const rested = await riderOf(s.resting)
    // Antes el ATL se quedaba clavado en 130: `applyDailyLoad` no se llegaba a ejecutar.
    expect(travelled.atl).toBeLessThan(130)
    // El viaje cuesta más que el descanso total, así que recupera algo menos: el viaje no es un día
    // libre. Y fíjate en la orden que dejó el viajero: `puertos/fuerte` (TSS 140). El viaje MANDA
    // sobre la orden —no se entrenan puertos en un aeropuerto—, así que su fatiga BAJA en vez de
    // dispararse, que es lo que pasaría si se le aplicase la sesión que pidió.
    expect(travelled.atl).toBeGreaterThan(rested.atl)
  })

  it('el viaje no da atributos: cuesta el día de trabajo', async () => {
    const log = await logOf(s.travelling)
    const attrs = await t.db
      .select()
      .from(riderAttrs)
      .where(eq(riderAttrs.riderId, s.travelling))
    expect(log!.tss).toBeGreaterThan(0)
    for (const a of attrs) expect(a.value).toBe(50)
  })

  it('quien ha corrido hoy sigue sin entrenar: su carga la escribe la etapa', async () => {
    expect(await logOf(s.racing)).toBeUndefined()
    expect((await riderOf(s.racing)).atl).toBe(130)
  })
})
