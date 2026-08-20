import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { ATTRIBUTES } from '@cyclingstar/shared'
import { and, eq, isNull } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getRaceGc, getStageResults } from './results.js'
import { getRiderUpcomingRaces, retireFromRace } from './riderSchedule.js'
import {
  news,
  raceGc,
  raceRosters,
  riderAttrs,
  riderHidden,
  riders,
  teams,
  worlds,
} from './schema.js'
import { runOneStage } from './stageRun.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * Consecuencias de un abandono en la capa de datos (docs/motor.md §VI.3 y §V.5), contra Postgres
 * de verdad: quien se va de una carrera por etapas no toma la salida al día siguiente, no puntúa
 * desde ahí, aparece como DNF y se le narra en el feed. Y el jugador puede retirarse él mismo.
 */

const RACE_ID = 'race-france'
const SEASON = 0
const RACE_KEY = `${RACE_ID}:s${SEASON}`
const FIELD = 12
const START_DAY = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!.startDay

async function seedWorld(t: TestDb): Promise<{ worldId: string; riderIds: string[] }> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-abandono', engineVersion: 1 })
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
  await t.db.insert(raceRosters).values(riderIds.map((id) => ({ raceId: RACE_KEY, riderId: id })))
  return { worldId, riderIds }
}

const stageSpec = (stageDay: number) => {
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
  }
}

describe('db: consecuencias de un abandono', () => {
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

  it('el que abandonó no toma la salida en la etapa siguiente ni suma en la general', async () => {
    // Etapa 2 con todos: es la que fija la referencia.
    const raced = await t.db.transaction((tx) =>
      runOneStage(tx, worldId, START_DAY + 1, 'semilla-abandono', stageSpec(2)),
    )
    expect(raced.size).toBe(FIELD)
    const gcBefore = await getRaceGc(t.db, RACE_KEY)
    expect(gcBefore).toHaveLength(FIELD)

    // Uno abandona (da igual la causa: la marca es la misma para las cinco).
    const out = riderIds[0]!
    await t.db
      .update(raceRosters)
      .set({ abandonedDay: START_DAY + 1, abandonedReason: 'colapso' })
      .where(and(eq(raceRosters.raceId, RACE_KEY), eq(raceRosters.riderId, out)))

    const raced2 = await t.db.transaction((tx) =>
      runOneStage(tx, worldId, START_DAY + 2, 'semilla-abandono', stageSpec(3)),
    )
    // Ni corre…
    expect(raced2.has(out)).toBe(false)
    // …y no se ha caído NADIE MÁS por la puerta del abandono: los que corren son los que quedan en
    // la lista de salida. Se compara contra el ROSTER y no contra `FIELD - 1` a secas, que es lo
    // que hacía este test y lo que lo volvía frágil: el motor puede retirar a alguien DENTRO de la
    // etapa (colapso o fuera de control, v14) y eso es comportamiento legítimo, no un fallo de lo
    // que aquí se comprueba. Medido: el nocturno del 17/08 falló exactamente por eso.
    const enLista = await t.db
      .select({ riderId: raceRosters.riderId })
      .from(raceRosters)
      .where(and(eq(raceRosters.raceId, RACE_KEY), isNull(raceRosters.abandonedDay)))
    expect(raced2.size).toBe(enLista.length)
    // …ni tiene resultado en esa etapa…
    const res3 = await getStageResults(t.db, RACE_KEY, 3)
    expect(res3.some((r) => r.riderId === out)).toBe(false)
    // …ni su tiempo de general se mueve desde el día en que se fue.
    const before = gcBefore.find((r) => r.riderId === out)!.tiempoTotalS
    const [after] = await t.db
      .select({ tiempoTotalS: raceGc.tiempoTotalS })
      .from(raceGc)
      .where(and(eq(raceGc.raceId, RACE_KEY), eq(raceGc.riderId, out)))
    expect(after!.tiempoTotalS).toBe(before)
    // Y la clasificación lo marca como DNF, ordenado al final (`results.ts`).
    const gcAfter = await getRaceGc(t.db, RACE_KEY)
    expect(gcAfter.find((r) => r.riderId === out)?.dnf).toBe(true)
    expect(gcAfter[gcAfter.length - 1]?.riderId).toBe(out)
  })

  it('el jugador puede retirarse él mismo de una carrera en marcha, y es idempotente', async () => {
    const me = riderIds[1]!
    const day = START_DAY + 3
    const first = await retireFromRace(t.db, {
      worldId,
      riderId: me,
      raceKey: RACE_KEY,
      currentDay: day,
    })
    expect(first).toEqual({ ok: true, raceName: 'Race France', alreadyOut: false })
    const [row] = await t.db
      .select({
        abandonedDay: raceRosters.abandonedDay,
        abandonedReason: raceRosters.abandonedReason,
      })
      .from(raceRosters)
      .where(and(eq(raceRosters.raceId, RACE_KEY), eq(raceRosters.riderId, me)))
    expect(row).toEqual({ abandonedDay: day, abandonedReason: 'voluntario' })

    // Se le narra en el feed, una sola vez. SUYA: se filtra por el corredor y no por el `kind`,
    // porque en el feed puede haber abandonos de otros —el motor retira gente dentro de la etapa
    // (v14)— y contarlos todos convertía «no se duplica el titular» en «no abandona nadie más»,
    // que es otra cosa y además no es verdad.
    const headlines = await t.db
      .select({ kind: news.kind, text: news.text, riderId: news.riderId })
      .from(news)
    const mine = headlines.filter((h) => h.kind === 'abandon' && h.riderId === me)
    expect(mine).toHaveLength(1)
    expect(mine[0]!.text).toContain('abandons the Race France')

    // Repetirlo no mueve el día ni duplica el titular.
    const again = await retireFromRace(t.db, {
      worldId,
      riderId: me,
      raceKey: RACE_KEY,
      currentDay: day + 1,
    })
    expect(again).toEqual({ ok: true, raceName: 'Race France', alreadyOut: true })
    const [same] = await t.db
      .select({ abandonedDay: raceRosters.abandonedDay })
      .from(raceRosters)
      .where(and(eq(raceRosters.raceId, RACE_KEY), eq(raceRosters.riderId, me)))
    expect(same!.abandonedDay).toBe(day)
    expect(
      (await t.db.select({ kind: news.kind }).from(news)).filter((h) => h.kind === 'abandon'),
    ).toHaveLength(1)

    // Y desaparece de «mis carreras»: ya no está en ella.
    const upcoming = await getRiderUpcomingRaces(t.db, me, day + 1)
    expect(upcoming.some((r) => r.raceKey === RACE_KEY)).toBe(false)
  })

  it('no se puede retirar de una carrera en la que no está inscrito ni de una que no ha empezado', async () => {
    const me = riderIds[2]!
    expect(
      await retireFromRace(t.db, {
        worldId,
        riderId: me,
        raceKey: 'race-lombardy:s0',
        currentDay: START_DAY,
      }),
    ).toEqual({ ok: false, reason: 'no_inscrito' })
    expect(
      await retireFromRace(t.db, {
        worldId,
        riderId: me,
        raceKey: RACE_KEY,
        currentDay: START_DAY - 5,
      }),
    ).toEqual({ ok: false, reason: 'no_en_marcha' })
  })
})
