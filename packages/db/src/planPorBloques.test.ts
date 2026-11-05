import { ATTRIBUTES, type Attribute, birthSeasonForAge } from '@cyclingstar/shared'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  getPlanForDay,
  getTrainingMode,
  saveLiveTrainingPlan,
  setTrainingMode,
  setTrainingOrders,
  setTrainingPlan,
  getTrainingOrders,
} from './training.js'
import { riderAttrs, riderHidden, riders, trainingPlans, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { readTrainingDayInputs } from './train.js'

/**
 * EL PLAN POR BLOQUES Y EL MODO (D0-D4, docs/entrenamiento.md §5.3, paso 11).
 *
 * Lo que hay que probar es lo que ANTES NO SE PODÍA HACER: deshacer. La pantalla congelaba los
 * veintiocho días y los mandaba enteros, así que tocar un jueves dejaba el mes entero fuera del
 * alcance del entrenador para siempre y no había forma de devolvérselo.
 */

const SEASON = 5
const HOY = SEASON * 364 + 100

const attrs = (v: number): Record<Attribute, number> =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, v])) as Record<Attribute, number>

describe('db: el plan por bloques', () => {
  let t: TestDb
  let riderId: string

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-plan', engineVersion: 1 })
      .returning({ id: worlds.id })
    const [r] = await t.db
      .insert(riders)
      .values({
        worldId: w!.id,
        name: 'Planificador',
        country: 'ES',
        gender: 'M' as const,
        archetype: 'escalada' as const,
        birthSeason: birthSeasonForAge(25, SEASON),
        faceSeed: 'cara',
      })
      .returning({ id: riders.id })
    riderId = r!.id
    await t.db.insert(riderAttrs).values(ATTRIBUTES.map((attr) => ({ riderId, attr, value: 60 })))
    await t.db.insert(riderHidden).values({
      riderId,
      talent: 50,
      fragility: 1,
      peakAge: 28,
      declineAge: 33,
      ceilings: attrs(85),
    })
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('el modo por defecto es `mixto`: el jugador encima del entrenador', async () => {
    expect(await getTrainingMode(t.db, riderId)).toBe('mixto')
  })

  it('un bloque a null NO es «sin decidir»: es «decide tú, entrenador»', async () => {
    await setTrainingPlan(t.db, riderId, {
      startDay: HOY,
      blocks: ['base', null, 'construccion', 'afinado'],
      focusAttr: 'SPR',
      intensity: 'fuerte',
      goalRaceId: null,
    })
    const guardado = (await getPlanForDay(t.db, riderId, HOY))!
    expect(guardado.plan.blocks).toEqual(['base', null, 'construccion', 'afinado'])
    expect(guardado.plan.focusAttr).toBe('SPR')
    expect(guardado.plan.intensity).toBe('fuerte')
  })

  it('el plan sabe qué SEMANA toca, que es lo que decide el bloque del día', async () => {
    expect((await getPlanForDay(t.db, riderId, HOY))!.week).toBe(0)
    expect((await getPlanForDay(t.db, riderId, HOY + 6))!.week).toBe(0)
    expect((await getPlanForDay(t.db, riderId, HOY + 7))!.week).toBe(1)
    expect((await getPlanForDay(t.db, riderId, HOY + 27))!.week).toBe(3)
    // Y fuera de sus cuatro semanas, ese plan ya no manda.
    expect(await getPlanForDay(t.db, riderId, HOY + 28)).toBeNull()
  })

  it('guardar el plan otra vez lo SUSTITUYE, no acumula filas', async () => {
    await setTrainingPlan(t.db, riderId, {
      startDay: HOY,
      blocks: [null, null, null, null],
      focusAttr: null,
      intensity: null,
      goalRaceId: null,
    })
    const g = (await getPlanForDay(t.db, riderId, HOY))!
    expect(g.plan.blocks).toEqual([null, null, null, null])
    expect(g.plan.focusAttr).toBeNull()
  })

  it('SE PUEDE DESHACER UN DÍA, que es lo que no se podía hacer', async () => {
    const ventana = { fromDay: HOY, toDay: HOY + 27 }
    await setTrainingOrders(
      t.db,
      riderId,
      [
        { gameDay: HOY + 1, session: 'sprint', intensity: 'fuerte' },
        { gameDay: HOY + 2, session: 'crono', intensity: 'normal' },
      ],
      ventana,
    )
    expect((await getTrainingOrders(t.db, riderId, HOY, HOY + 27)).length).toBe(2)

    // El jugador quita el segundo día y guarda otra vez: tiene que DESAPARECER, no quedarse.
    await setTrainingOrders(
      t.db,
      riderId,
      [{ gameDay: HOY + 1, session: 'sprint', intensity: 'fuerte' }],
      ventana,
    )
    const quedan = await getTrainingOrders(t.db, riderId, HOY, HOY + 27)
    expect(quedan.map((o) => o.gameDay)).toEqual([HOY + 1])
  })

  it('…y se pueden quitar TODOS: el mes vuelve entero al entrenador', async () => {
    await setTrainingOrders(t.db, riderId, [], { fromDay: HOY, toDay: HOY + 27 })
    expect(await getTrainingOrders(t.db, riderId, HOY, HOY + 27)).toEqual([])
  })

  it('sin ventana no se borra nada ajeno: la firma vieja sigue haciendo lo de siempre', async () => {
    // Importa porque `setTeamTrainingPlan` y las pruebas viejas siguen llamándola así: si la firma
    // sin ventana hubiera pasado a borrar el horizonte, habrían empezado a borrarse planes enteros.
    await setTrainingOrders(t.db, riderId, [
      { gameDay: HOY + 5, session: 'fondo', intensity: 'normal' },
    ])
    await setTrainingOrders(t.db, riderId, [
      { gameDay: HOY + 6, session: 'umbral', intensity: 'normal' },
    ])
    const dos = await getTrainingOrders(t.db, riderId, HOY, HOY + 27)
    expect(dos.map((o) => o.gameDay).sort((a, b) => a - b)).toEqual([HOY + 5, HOY + 6])
  })

  it('el modo se guarda y se lee', async () => {
    await setTrainingMode(t.db, riderId, 'entrenador')
    expect(await getTrainingMode(t.db, riderId)).toBe('entrenador')
    await setTrainingMode(t.db, riderId, 'manual')
    expect(await getTrainingMode(t.db, riderId)).toBe('manual')
  })
})

/**
 * UN SOLO PLAN VIVO (E3, docs/visual.md §11.5; D-39, H-04; PR 13a). Hasta el 13a cada guardado empezaba
 * cuatro semanas desde mañana: guardar dos veces en la misma ventana dejaba dos filas, la pantalla leía
 * una (`getPlanForDay`, sin orden) y el tick entrenaba otra (la última de su `Map`). Ahora el guardado va
 * sobre el `startDay` del plan vivo, o desde mañana si no hay o si el jugador empieza de cero
 * (`startFresh`), y en la misma transacción se borra todo plan suyo a menos de 28 días del guardado.
 */
describe('db: un solo plan vivo (§11.5)', () => {
  let t: TestDb
  let worldId: string
  const corredores: string[] = []
  /** El día de hoy: el plan nuevo empieza mañana, el 101. */
  const D = SEASON * 364

  const P1 = {
    blocks: ['base', 'construccion', null, 'afinado'],
    focusAttr: 'MON',
    intensity: 'fuerte',
  } as const
  const P2 = {
    blocks: ['especifico', null, 'recuperacion', 'base'],
    focusAttr: null,
    intensity: null,
  } as const

  const filas = async (riderId: string) =>
    t.db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.riderId, riderId))
      .orderBy(asc(trainingPlans.startDay))
  /** El plan que lee el tick ese día: el de `readTrainingDayInputs`, la misma lectura que entrena. */
  const delTick = async (riderId: string, gameDay: number) =>
    (
      await t.db.transaction((tx) => readTrainingDayInputs(tx, worldId, gameDay, new Set()))
    ).planByRider.get(riderId)

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-plan-vivo', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = w!.id
    for (let i = 0; i < 6; i++) {
      const [r] = await t.db
        .insert(riders)
        .values({
          worldId,
          name: `Planificador ${i}`,
          country: 'ES',
          gender: 'M' as const,
          archetype: 'escalada' as const,
          birthSeason: birthSeasonForAge(25, SEASON),
          faceSeed: `cara-${i}`,
        })
        .returning({ id: riders.id })
      corredores.push(r!.id)
    }
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('guardar el día 100 y otra vez el 110 deja una sola fila, con el startDay 101', async () => {
    const id = corredores[0]!
    expect(
      await saveLiveTrainingPlan(t.db, id, { currentDay: D + 100, mode: 'mixto', plan: P1 }),
    ).toEqual({
      startDay: D + 101,
    })
    expect(
      await saveLiveTrainingPlan(t.db, id, { currentDay: D + 110, mode: 'mixto', plan: P2 }),
    ).toEqual({
      startDay: D + 101,
    })
    const quedan = await filas(id)
    expect(quedan.map((f) => f.startDay)).toEqual([D + 101])
    expect([quedan[0]!.block1, quedan[0]!.block2, quedan[0]!.block3, quedan[0]!.block4]).toEqual(
      P2.blocks,
    )
    expect(quedan[0]!.focusAttr).toBeNull()
    expect(quedan[0]!.intensity).toBeNull()
  })

  it('con startFresh, el del 110 deja solo la del 111', async () => {
    const id = corredores[1]!
    await saveLiveTrainingPlan(t.db, id, { currentDay: D + 100, mode: 'mixto', plan: P1 })
    expect(
      await saveLiveTrainingPlan(t.db, id, {
        currentDay: D + 110,
        mode: 'mixto',
        plan: P2,
        startFresh: true,
      }),
    ).toEqual({ startDay: D + 111 })
    expect((await filas(id)).map((f) => f.startDay)).toEqual([D + 111])
  })

  it('la pantalla y el tick leen el mismo plan, en los dos casos', async () => {
    for (const [id, startDay] of [
      [corredores[0]!, D + 101],
      [corredores[1]!, D + 111],
    ] as const) {
      for (const dia of [D + 111, D + 120]) {
        expect((await getPlanForDay(t.db, id, dia))!.plan.startDay).toBe(startDay)
        expect((await delTick(id, dia))!.startDay).toBe(startDay)
      }
    }
  })

  it('con dos filas solapadas, las de antes de la 0051, los dos leen la de start_day mayor', async () => {
    const id = corredores[2]!
    for (const startDay of [D + 111, D + 101]) {
      await setTrainingPlan(t.db, id, { startDay, ...P1, blocks: [...P1.blocks], goalRaceId: null })
    }
    expect((await getPlanForDay(t.db, id, D + 115))!.plan.startDay).toBe(D + 111)
    expect((await delTick(id, D + 115))!.startDay).toBe(D + 111)
    // …y guardar encima deja solo esa: la del 101 estaba a menos de 28 días
    expect(
      await saveLiveTrainingPlan(t.db, id, { currentDay: D + 114, mode: 'mixto', plan: P2 }),
    ).toEqual({
      startDay: D + 111,
    })
    expect((await filas(id)).map((f) => f.startDay)).toEqual([D + 111])
  })

  it('un plan que ya acabó no es el vivo: el nuevo empieza mañana y el viejo, a 28 días o más, se queda', async () => {
    const id = corredores[3]!
    await setTrainingPlan(t.db, id, {
      startDay: D + 70,
      ...P1,
      blocks: [...P1.blocks],
      goalRaceId: null,
    })
    expect(
      await saveLiveTrainingPlan(t.db, id, { currentDay: D + 100, mode: 'mixto', plan: P2 }),
    ).toEqual({
      startDay: D + 101,
    })
    expect((await filas(id)).map((f) => f.startDay)).toEqual([D + 70, D + 101])
  })

  it('el modo se guarda con el plan, y el objetivo guardado se conserva al guardar encima', async () => {
    const id = corredores[4]!
    await setTrainingPlan(t.db, id, {
      startDay: D + 101,
      ...P1,
      blocks: [...P1.blocks],
      goalRaceId: 'race-france',
    })
    await saveLiveTrainingPlan(t.db, id, { currentDay: D + 105, mode: 'manual', plan: P2 })
    expect(await getTrainingMode(t.db, id)).toBe('manual')
    const [fila] = await filas(id)
    expect(fila!.startDay).toBe(D + 101)
    expect(fila!.goalRaceId).toBe('race-france')
  })

  it('si algo falla, no se guarda nada: el modo, el plan y el borrado van en la misma transacción', async () => {
    const id = corredores[5]!
    await saveLiveTrainingPlan(t.db, id, { currentDay: D + 100, mode: 'mixto', plan: P1 })
    await expect(
      saveLiveTrainingPlan(t.db, id, {
        currentDay: D + 110,
        mode: 'manual',
        // un bloque que no existe: Postgres rechaza el enum y la transacción entera se deshace
        plan: { ...P2, blocks: ['inventado' as 'base', null, null, null] },
        startFresh: true,
      }),
    ).rejects.toThrow()
    expect(await getTrainingMode(t.db, id)).toBe('mixto')
    expect((await filas(id)).map((f) => f.startDay)).toEqual([D + 101])
  })
})
