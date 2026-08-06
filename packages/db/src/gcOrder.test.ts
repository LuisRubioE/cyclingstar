import { TEST_TOUR } from '@cyclingstar/engine'
import { ATTRIBUTES } from '@cyclingstar/shared'
import { and, asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getGcThroughStage, getRaceGc } from './results.js'
import {
  raceGc,
  raceRosters,
  riderAttrs,
  riderHidden,
  riders,
  stageResults,
  teams,
  worlds,
} from './schema.js'
import { runOneStage } from './stageRun.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * Coherencia de la clasificación general contra Postgres real (PGlite).
 *
 * Cubre el fallo que se vio en producción en una carrera de UN DÍA: la general mostraba al ganador
 * 10 s por debajo de su tiempo de meta (bonificaciones que no debían existir) y, del 4.º en adelante,
 * corredores DISTINTOS a los del resultado de etapa, porque con todo el pelotón empatado a tiempo el
 * orden lo decidía Postgres y ni siquiera era estable entre consultas.
 */

const ONE_DAY_KEY = 'clasica-test:s0'
const TIE_KEY = 'vuelta-test:s0'
const FIELD = 30

async function seedWorld(t: TestDb): Promise<{ worldId: string; riderIds: string[] }> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-general', engineVersion: 1 })
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

  const inserted = await t.db
    .insert(riders)
    .values(
      Array.from({ length: FIELD }, (_, i) => ({
        worldId,
        teamId: team!.id,
        name: `Corredor ${i}`,
        country: 'ES',
        gender: 'M' as const,
        birthSeason: -25,
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
        ctl: 60,
        atl: 40,
      })),
    )
    .returning({ id: riders.id })
  const riderIds = inserted.map((r) => r.id)

  await t.db
    .insert(riderAttrs)
    .values(
      riderIds.flatMap((id, i) =>
        ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 + (i % 20) })),
      ),
    )
  await t.db.insert(riderHidden).values(
    riderIds.map((id) => ({
      riderId: id,
      talent: 1,
      ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])),
      fragility: 0.1,
      peakAge: 28,
      declineAge: 33,
    })),
  )
  await t.db
    .insert(raceRosters)
    .values(riderIds.map((id) => ({ raceId: ONE_DAY_KEY, riderId: id })))
  return { worldId, riderIds }
}

describe('db: general coherente en carreras de un día y con desempate por puestos', () => {
  let t: TestDb
  let worldId: string
  let riderIds: string[]

  beforeAll(async () => {
    t = await startTestDb()
    const seeded = await seedWorld(t)
    worldId = seeded.worldId
    riderIds = seeded.riderIds
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('una carrera de un día no da bonificaciones y su general es el resultado de etapa', async () => {
    const stage = TEST_TOUR[0]!
    // Etapa única que es a la vez la final: eso ES una carrera de un día.
    await t.db.transaction((tx) =>
      runOneStage(tx, worldId, 1, 'semilla-general', {
        raceKey: ONE_DAY_KEY,
        raceId: 'clasica-test',
        raceName: 'Clásica de pruebas',
        level: 'WT',
        raceClass: 'WT',
        season: 0,
        stageDay: 1,
        kind: stage.kind,
        profile: stage.profile,
        timeTrial: false,
        isFinal: true,
      }),
    )

    const results = await t.db
      .select({
        riderId: stageResults.riderId,
        puesto: stageResults.puesto,
        tiempoS: stageResults.tiempoS,
        bonificacionS: stageResults.bonificacionS,
      })
      .from(stageResults)
      .where(and(eq(stageResults.raceId, ONE_DAY_KEY), eq(stageResults.stageDay, 1)))
      .orderBy(asc(stageResults.puesto))
    expect(results).toHaveLength(FIELD)

    // 1) Ni una bonificación: en una prueba de un día no hay general que construir.
    for (const r of results) expect(r.bonificacionS).toBe(0)

    // 2) El tiempo de la general es EXACTAMENTE el de meta (antes, 10 s menos para el ganador).
    const gcRows = await t.db.select().from(raceGc).where(eq(raceGc.raceId, ONE_DAY_KEY))
    const timeById = new Map(results.map((r) => [r.riderId, r.tiempoS] as const))
    for (const row of gcRows) {
      expect(row.tiempoTotalS).toBe(timeById.get(row.riderId))
      // El desempate se acumula desde la primera etapa: con una sola, ambos son su puesto.
      expect(row.sumaPuestos).toBe(row.ultimoPuesto)
    }

    // 3) La general que se muestra sale en el MISMO orden que el resultado de etapa, tanto la
    // almacenada (race_gc) como la recalculada para la ficha de la etapa (stage_results). Nadie
    // figura como DNF: en una prueba de un día una caída no "hace abandonar la vuelta" —el corredor
    // ya ha llegado a meta y tiene su puesto—.
    const stageOrder = results.map((r) => r.riderId)
    const gc = await getRaceGc(t.db, ONE_DAY_KEY)
    expect(gc.filter((r) => r.dnf)).toHaveLength(0)
    expect(gc.map((r) => r.riderId)).toEqual(stageOrder)
    const through = await getGcThroughStage(t.db, ONE_DAY_KEY, 1)
    expect(through.map((r) => r.riderId)).toEqual(stageOrder)

    // 4) Y el orden es ESTABLE: dos consultas seguidas devuelven lo mismo (antes no lo era).
    const gcOtraVez = await getRaceGc(t.db, ONE_DAY_KEY)
    expect(gcOtraVez.map((r) => r.riderId)).toEqual(stageOrder)
  }, 180_000)

  it('a igualdad de tiempo manda quien acumula mejores puestos, luego la última etapa, luego el id', async () => {
    // General de una carrera POR ETAPAS con cuatro empatados a tiempo: el orden lo deciden los
    // puestos acumulados, y solo si todo empata, el id (para que el orden sea total y determinista).
    const [a, b, c, d, e] = riderIds
    await t.db.insert(raceGc).values([
      // Mejor tiempo: manda por encima de cualquier desempate.
      { raceId: TIE_KEY, riderId: a!, tiempoTotalS: 3599, sumaPuestos: 99, ultimoPuesto: 99 },
      // Empatados a tiempo: gana la menor suma de puestos.
      { raceId: TIE_KEY, riderId: b!, tiempoTotalS: 3600, sumaPuestos: 12, ultimoPuesto: 9 },
      { raceId: TIE_KEY, riderId: c!, tiempoTotalS: 3600, sumaPuestos: 8, ultimoPuesto: 5 },
      // Misma suma que `c`: desempata el mejor puesto en la última etapa disputada.
      { raceId: TIE_KEY, riderId: d!, tiempoTotalS: 3600, sumaPuestos: 8, ultimoPuesto: 3 },
      // Idéntico a `d` en todo: desempata el id, que es estable.
      { raceId: TIE_KEY, riderId: e!, tiempoTotalS: 3600, sumaPuestos: 8, ultimoPuesto: 3 },
    ])

    const gc = await getRaceGc(t.db, TIE_KEY)
    const porId = [d!, e!].sort()
    expect(gc.map((r) => r.riderId)).toEqual([a!, porId[0]!, porId[1]!, c!, b!])
  }, 60_000)
})
