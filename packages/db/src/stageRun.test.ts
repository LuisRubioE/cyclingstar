import { TEST_TOUR } from '@cyclingstar/engine'
import { ATTRIBUTES } from '@cyclingstar/shared'
import { and, asc, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  raceGc,
  raceRosters,
  riderAttrLog,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  stageResults,
  stageSnapshots,
  stageTeamResults,
  teams,
  worlds,
} from './schema.js'
import { runOneStage } from './stageRun.js'
import { getTeamClassifications } from './teamClassification.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * Integración real de `runOneStage` contra Postgres (PGlite): comprueba que las escrituras EN LOTE
 * dejan exactamente los mismos datos que el bucle fila a fila de antes —resultados, general
 * acumulada entre etapas, carga (ctl/atl), subidas de atributos, bitácoras y puntos de temporada—.
 */

const RACE_KEY = 'race-test:s0'
const FIELD = 40

async function seedMiniWorld(t: TestDb): Promise<{ worldId: string; riderIds: string[] }> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-etapa', engineVersion: 1 })
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

  // Atributos visibles distintos por corredor (para que la carrera tenga jerarquía) y techos altos,
  // de modo que la etapa deje margen de subida y se escriban filas en rider_attrs / rider_attr_log.
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
  await t.db.insert(raceRosters).values(riderIds.map((id) => ({ raceId: RACE_KEY, riderId: id })))
  return { worldId, riderIds }
}

describe('db: runOneStage escribe en lote con la misma semántica', () => {
  let t: TestDb
  let worldId: string
  let riderIds: string[]

  beforeAll(async () => {
    t = await startTestDb()
    const seeded = await seedMiniWorld(t)
    worldId = seeded.worldId
    riderIds = seeded.riderIds
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('corre dos etapas y acumula la general con los tiempos netos de cada una', async () => {
    const stage1 = TEST_TOUR[0]!
    const stage2 = TEST_TOUR[1]!

    const raced1 = await t.db.transaction((tx) =>
      runOneStage(tx, worldId, 1, 'semilla-etapa', {
        raceKey: RACE_KEY,
        raceId: 'race-test',
        raceName: 'Carrera de pruebas',
        level: 'WT',
        raceClass: 'WT',
        season: 0,
        stageDay: 1,
        kind: stage1.kind,
        profile: stage1.profile,
        timeTrial: false,
        isFinal: false,
      }),
    )
    expect(raced1.size).toBe(FIELD)

    const res1 = await t.db
      .select({
        riderId: stageResults.riderId,
        tiempoS: stageResults.tiempoS,
        bonificacionS: stageResults.bonificacionS,
        puntosVolante: stageResults.puntosVolante,
        puntosMontana: stageResults.puntosMontana,
      })
      .from(stageResults)
      .where(and(eq(stageResults.raceId, RACE_KEY), eq(stageResults.stageDay, 1)))
    expect(res1).toHaveLength(FIELD)

    // En una carrera POR ETAPAS sí hay bonificaciones (10/6/4 a los tres primeros): construyen la
    // general, que es justo lo que una carrera de un día no tiene.
    const puestoById = new Map(
      (
        await t.db
          .select({ riderId: stageResults.riderId, puesto: stageResults.puesto })
          .from(stageResults)
          .where(and(eq(stageResults.raceId, RACE_KEY), eq(stageResults.stageDay, 1)))
      ).map((r) => [r.riderId, r.puesto] as const),
    )
    const bonoDe = (puesto: number): number =>
      res1.find((r) => puestoById.get(r.riderId) === puesto)?.bonificacionS ?? -1
    expect([bonoDe(1), bonoDe(2), bonoDe(3), bonoDe(4)]).toEqual([10, 6, 4, 0])

    // La general tras la etapa 1 es exactamente el tiempo neto (tiempo − bonificación) de la etapa.
    const gc1 = await t.db.select().from(raceGc).where(eq(raceGc.raceId, RACE_KEY))
    expect(gc1).toHaveLength(FIELD)
    const netById = new Map(
      res1.map((r) => [r.riderId, Math.max(0, r.tiempoS - r.bonificacionS)] as const),
    )
    for (const row of gc1) {
      expect(row.tiempoTotalS).toBe(netById.get(row.riderId))
      // Desempate: con una sola etapa corrida, la suma de puestos ES el puesto de esa etapa.
      expect(row.sumaPuestos).toBe(puestoById.get(row.riderId))
      expect(row.ultimoPuesto).toBe(puestoById.get(row.riderId))
    }

    // Puntos de temporada: los del puesto de etapa, sumados en una sola sentencia en lote.
    const points1 = await t.db
      .select({ n: sql<number>`sum(${riders.seasonPoints})::int` })
      .from(riders)
      .where(eq(riders.worldId, worldId))
    expect(points1[0]!.n).toBeGreaterThan(0)

    // Carga del día: ctl/atl se actualizan con UPDATE ... FROM (VALUES …) y quedan distintos del alta.
    const loaded = await t.db
      .select({ n: sql<number>`count(*)::int` })
      .from(riders)
      .where(and(eq(riders.worldId, worldId), sql`${riders.ctl} <> 60`))
    expect(loaded[0]!.n).toBe(FIELD)

    const dailyLog = await t.db
      .select({ n: sql<number>`count(*)::int` })
      .from(riderDailyLog)
      .where(eq(riderDailyLog.gameDay, 1))
    expect(dailyLog[0]!.n).toBe(FIELD)

    // Subidas de atributos: la etapa llana reparte XP a LLA, SPR y TAC de todos los que corrieron.
    const attrLog = await t.db
      .select({ attr: riderAttrLog.attr, n: sql<number>`count(*)::int` })
      .from(riderAttrLog)
      .where(eq(riderAttrLog.gameDay, 1))
      .groupBy(riderAttrLog.attr)
    expect(new Set(attrLog.map((a) => a.attr))).toEqual(new Set(['LLA', 'SPR', 'TAC']))
    for (const a of attrLog) expect(a.n).toBe(FIELD)

    const raised = await t.db
      .select({ n: sql<number>`count(*)::int` })
      .from(riderAttrs)
      .where(and(eq(riderAttrs.attr, 'LLA'), sql`${riderAttrs.value} > 50`))
    expect(raised[0]!.n).toBe(FIELD)

    // Segunda etapa: la general debe SUMAR, no reemplazar (el upsert en lote usa excluded.*).
    await t.db.transaction((tx) =>
      runOneStage(tx, worldId, 2, 'semilla-etapa', {
        raceKey: RACE_KEY,
        raceId: 'race-test',
        raceName: 'Carrera de pruebas',
        level: 'WT',
        raceClass: 'WT',
        season: 0,
        stageDay: 2,
        kind: stage2.kind,
        profile: stage2.profile,
        timeTrial: false,
        isFinal: true,
      }),
    )
    const res2 = await t.db
      .select({
        riderId: stageResults.riderId,
        puesto: stageResults.puesto,
        tiempoS: stageResults.tiempoS,
        bonificacionS: stageResults.bonificacionS,
        puntosVolante: stageResults.puntosVolante,
        puntosMontana: stageResults.puntosMontana,
      })
      .from(stageResults)
      .where(and(eq(stageResults.raceId, RACE_KEY), eq(stageResults.stageDay, 2)))
    const gc2 = await t.db.select().from(raceGc).where(eq(raceGc.raceId, RACE_KEY))
    const gc1ById = new Map(gc1.map((r) => [r.riderId, r] as const))
    for (const r of res2) {
      const prev = gc1ById.get(r.riderId)!
      const now = gc2.find((g) => g.riderId === r.riderId)!
      expect(now.tiempoTotalS).toBe(prev.tiempoTotalS + Math.max(0, r.tiempoS - r.bonificacionS))
      expect(now.puntosVolante).toBe(prev.puntosVolante + r.puntosVolante)
      expect(now.puntosMontana).toBe(prev.puntosMontana + r.puntosMontana)
      // El desempate se acumula etapa a etapa igual que el tiempo.
      expect(now.sumaPuestos).toBe(prev.sumaPuestos + r.puesto)
      expect(now.ultimoPuesto).toBe(r.puesto)
    }

    // Al ser la etapa final se reparten además los puntos de la general: el total sube.
    const points2 = await t.db
      .select({ n: sql<number>`sum(${riders.seasonPoints})::int` })
      .from(riders)
      .where(eq(riders.worldId, worldId))
    expect(points2[0]!.n).toBeGreaterThan(points1[0]!.n)
    expect(riderIds).toHaveLength(FIELD)

    // --- Clasificación por equipos escrita por el tick -------------------------------------
    // El mundo de este test tiene UN solo equipo con los 40 corredores, así que hay una fila por
    // etapa y su tiempo es la suma de los tres primeros puestos de esa etapa (tiempos de META: las
    // bonificaciones, que aquí sí existen, no cuentan para esta clasificación).
    const teamRows = await t.db
      .select()
      .from(stageTeamResults)
      .where(eq(stageTeamResults.raceId, RACE_KEY))
      .orderBy(asc(stageTeamResults.stageDay))
    expect(teamRows).toHaveLength(2)
    const tresMejores = (rows: { puesto: number; tiempoS: number }[]): number =>
      [...rows]
        .sort((a, b) => a.puesto - b.puesto)
        .slice(0, 3)
        .reduce((sum, r) => sum + r.tiempoS, 0)
    const res1Full = await t.db
      .select({ puesto: stageResults.puesto, tiempoS: stageResults.tiempoS })
      .from(stageResults)
      .where(and(eq(stageResults.raceId, RACE_KEY), eq(stageResults.stageDay, 1)))
    expect(teamRows[0]!.scored).toBe(true)
    expect(teamRows[0]!.tiempoS).toBe(tresMejores(res1Full))
    expect(teamRows[0]!.sumaPuestos).toBe(6) // 1 + 2 + 3
    expect(teamRows[0]!.mejorPuesto).toBe(1)
    expect(teamRows[1]!.tiempoS).toBe(tresMejores(res2))

    // Y lo persistido coincide EXACTAMENTE con lo que se derivaría del histórico: la regla es la
    // misma función en los dos caminos, y este test lo ata para que no puedan separarse.
    const persistida = await getTeamClassifications(t.db, RACE_KEY, 2)
    await t.db.delete(stageTeamResults).where(eq(stageTeamResults.raceId, RACE_KEY))
    const derivada = await getTeamClassifications(t.db, RACE_KEY, 2)
    expect(derivada).toEqual(persistida)
    // La acumulada suma las dos etapas, no las recalcula desde la general.
    expect(persistida.overall[0]!.tiempoS).toBe(teamRows[0]!.tiempoS + teamRows[1]!.tiempoS)
    expect(persistida.overall[0]!.stagesScored).toBe(2)
  }, 180_000)

  /**
   * LA RADIO SE GUARDA AL CORRER. El dueño la pidió y durante toda una tanda existió solo como
   * script de línea de comandos: la vista no podía existir porque el dato no se guardaba. Y guardarlo
   * es obligatorio, no una optimización: una etapa corrida con el motor de ayer no se puede
   * reconstruir con el de hoy (`checkReplay`), así que calcularla al vuelo la dejaría vacía justo
   * para las etapas ya corridas, que son las que se quieren mirar.
   *
   * Se lee la etapa 1 que acaba de correr el caso de arriba: es la misma escritura de producción.
   */
  it('la etapa corrida deja su RADIO guardada, con grupos y huecos', async () => {
    const [row] = await t.db
      .select({ radio: stageSnapshots.radio })
      .from(stageSnapshots)
      .where(and(eq(stageSnapshots.raceId, RACE_KEY), eq(stageSnapshots.stageDay, 1)))
    const radio = row?.radio as
      | { starters: number; kms: { km: number; groups: { size: number; gapS: number }[] }[] }
      | null
      | undefined
    expect(radio).toBeTruthy()
    expect(radio!.starters).toBeGreaterThan(0)
    // Una foto por kilómetro, y cada una con al menos un grupo: si esto sale vacío, la vista sale
    // vacía y el dueño vuelve a ver una pestaña que no enseña nada.
    expect(radio!.kms.length).toBeGreaterThan(10)
    for (const k of radio!.kms) expect(k.groups.length).toBeGreaterThan(0)
    // El primer grupo de carretera es el líder: su hueco al líder es cero por construcción.
    expect(radio!.kms[0]!.groups[0]!.gapS).toBe(0)
  })
})
