import { SEASON_CALENDAR, applyDailyLoad } from '@cyclingstar/engine'
import { ATTRIBUTES } from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  raceRosters,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  teams,
  worlds,
} from './schema.js'
import { runOneStage } from './stageRun.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * R28.6 / S-431 — LA SEMIETAPA, Y SU PROBLEMA DE VERDAD (paso 18b).
 *
 * «Dos `StageInput` el mismo día, con depósito encadenado.» La parte fácil es el calendario y está
 * sellada en el motor (`routes/semietapa.test.ts`). La difícil es ésta, y no se ve mirando el
 * calendario:
 *
 * **`applyDailyLoad` es un paso de Banister POR DÍA.** El ATL se suaviza hacia el TSS con su tau y
 * el CTL igual, así que correr dos etapas el mismo día llamándolo dos veces aplicaría **dos días de
 * fisiología**: el corredor ganaría una jornada entera de forma y de recuperación que no ha pasado.
 * Y el parte diario, que va por `(corredor, día)`, tendría dos filas para un solo día.
 *
 * Así que la carga se aplica **una vez, con el TSS de las dos mitades** (`StageRunSpec.cargaDelDia`).
 * Estas pruebas corren una jornada partida de verdad contra Postgres y lo comprueban.
 */

const RACE_ID = 'race-france'
const SEASON = 0
const RACE_KEY = `${RACE_ID}:s${SEASON}`
const FIELD = 8
const GAME_DAY = 500
const idDe = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`

async function seedWorld(t: TestDb): Promise<{ worldId: string; riderIds: string[] }> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-semietapa', engineVersion: 1 })
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
        id: idDe(i),
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
      riderIds.flatMap((id, i) => ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 + i }))),
    )
  await t.db.insert(riderHidden).values(
    riderIds.map((id) => ({
      riderId: id,
      talent: 1,
      ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])),
      fragility: 1,
      peakAge: 28,
      declineAge: 33,
    })),
  )
  await t.db
    .insert(raceRosters)
    .values(riderIds.map((id, i) => ({ raceId: RACE_KEY, riderId: id, bib: i + 1 })))
  return { worldId, riderIds }
}

const spec = (stageDay: number, carga?: { banked: Map<string, number>; aplicaHoy: boolean }) => {
  const race = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
  const stage = race.stages.find((s) => s.index === stageDay)!
  return {
    raceKey: RACE_KEY,
    raceId: RACE_ID,
    raceName: race.name,
    level: 'WT' as const,
    raceClass: 'WT' as const,
    season: SEASON,
    stageDay,
    kind: stage.kind,
    profile: stage.profile,
    timeTrial: stage.timeTrial === true,
    isFinal: false,
    ...(carga ? { cargaDelDia: carga } : {}),
  }
}

describe('db: una jornada partida en dos mitades', () => {
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

  it('las dos mitades dejan UN SOLO parte diario, con el TSS de las dos', async () => {
    const banked = new Map<string, number>()
    await t.db.transaction((tx) =>
      runOneStage(
        tx,
        worldId,
        GAME_DAY,
        'semilla-semietapa',
        spec(1, { banked, aplicaHoy: false }),
      ),
    )

    // Tras la MAÑANA no hay parte todavía: el día no ha cerrado.
    const trasManana = await t.db
      .select({ tss: riderDailyLog.tss })
      .from(riderDailyLog)
      .where(and(eq(riderDailyLog.riderId, riderIds[0]!), eq(riderDailyLog.gameDay, GAME_DAY)))
    expect(trasManana).toHaveLength(0)
    // …pero el trabajo de la mañana está APUNTADO, que es lo que la tarde va a sumar.
    expect(banked.get(riderIds[0]!)).toBeGreaterThan(0)
    const tssManana = banked.get(riderIds[0]!)!

    await t.db.transaction((tx) =>
      runOneStage(tx, worldId, GAME_DAY, 'semilla-semietapa', spec(2, { banked, aplicaHoy: true })),
    )

    const trasTarde = await t.db
      .select({ tss: riderDailyLog.tss })
      .from(riderDailyLog)
      .where(and(eq(riderDailyLog.riderId, riderIds[0]!), eq(riderDailyLog.gameDay, GAME_DAY)))
    // UNA fila para el día, no dos.
    expect(trasTarde).toHaveLength(1)
    // …y con el trabajo de las DOS mitades, no solo el de la tarde.
    expect(trasTarde[0]!.tss).toBeGreaterThan(tssManana)
  })

  /**
   * EL BANISTER AVANZA UN DÍA, NO DOS. Es la aserción que justifica todo este mecanismo: el ATL del
   * corredor tras la jornada partida tiene que ser el de **un** paso con el TSS de las dos mitades.
   * Dos pasos darían otro número —y, lo que importa, una jornada de recuperación de regalo.
   */
  it('el ATL es el de UN paso con el TSS de las dos, no el de dos pasos', async () => {
    const [fila] = await t.db
      .select({ atl: riders.atl, ctl: riders.ctl })
      .from(riders)
      .where(eq(riders.id, riderIds[0]!))
    const [parte] = await t.db
      .select({ tss: riderDailyLog.tss })
      .from(riderDailyLog)
      .where(and(eq(riderDailyLog.riderId, riderIds[0]!), eq(riderDailyLog.gameDay, GAME_DAY)))

    // El campo arranca con CTL 60 / ATL 40 y el corredor 0 tiene REC 50 (ver `seedWorld`).
    const inicio = { ctl: 60, atl: 40 }
    const REC = 50
    const tssTotal = Number(parte!.tss)

    // UN paso con el TSS de las dos mitades: esto es lo que tiene que haber pasado.
    // Precisión 4 y no más: Postgres guarda `numeric` redondeado y la cuenta casa a seis cifras
    // significativas (57,38927 contra 57,389272). Sigue siendo mil veces más fina que la diferencia
    // entre un paso y dos, que es de lo que esta prueba trata.
    const unPaso = applyDailyLoad(inicio, tssTotal, REC)
    expect(Number(fila!.atl)).toBeCloseTo(unPaso.atl, 4)
    expect(Number(fila!.ctl)).toBeCloseTo(unPaso.ctl, 4)

    /**
     * Y EL CONTROL DEL CONTROL, que es lo que convierte esto en una prueba: dos pasos dan OTRO
     * número. Sin esta línea, la de arriba podría estar pasando por casualidad —si las dos cuentas
     * coincidieran, no estaría comprobando nada—.
     */
    const dosPasos = applyDailyLoad(applyDailyLoad(inicio, tssTotal / 2, REC), tssTotal / 2, REC)
    expect(Math.abs(dosPasos.atl - unPaso.atl)).toBeGreaterThan(0.5)
    expect(Number(fila!.atl)).not.toBeCloseTo(dosPasos.atl, 2)
  })
})
