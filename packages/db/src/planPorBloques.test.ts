import { ATTRIBUTES, type Attribute, birthSeasonForAge } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  getPlanForDay,
  getTrainingMode,
  setTrainingMode,
  setTrainingOrders,
  setTrainingPlan,
  getTrainingOrders,
} from './training.js'
import { riderAttrs, riderHidden, riders, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

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
