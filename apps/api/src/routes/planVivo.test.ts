import { gameState, riders, users, worlds } from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { trainingPlanResponseSchema } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'

/**
 * UN SOLO PLAN VIVO, POR LA RUTA (E3, docs/visual.md §11.5; PR 13a). `PUT /api/riders/me/plan` guarda sobre
 * el `startDay` del plan vivo, o desde mañana con `startFresh`, y `GET` enseña el mismo; el cuerpo que manda
 * hoy la pantalla (con `startDay` y `goalRaceId`, que ya no cuentan) se sigue aceptando. Lo de dentro, la
 * transacción y el borrado de los solapes, lo prueba `packages/db/src/planPorBloques.test.ts`.
 */

const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const PLAYER = idDe(900)
const D = 5 * 364
const PLAN = '/api/riders/me/plan'

/** Doble de better-auth: la sesión es la del usuario de la cabecera `x-test-user`. */
function headerAuth(): NonNullable<AppDeps['auth']> {
  return {
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const id = headers.get('x-test-user')
        return id ? { user: { id } } : null
      },
    },
    handler: async () => new Response('{}', { status: 200 }),
  } as unknown as NonNullable<AppDeps['auth']>
}

/** El cuerpo que manda hoy `PlanLadder`: el plan entero, con su `startDay` y su `goalRaceId`. */
const cuerpo = (blocks: readonly (string | null)[], extra: Record<string, unknown> = {}) => ({
  mode: 'mixto',
  plan: { startDay: 0, blocks, focusAttr: null, intensity: null, goalRaceId: null },
  ...extra,
})

describe('PUT /api/riders/me/plan: un solo plan vivo (§11.5)', () => {
  let t: TestDb
  let app: ReturnType<typeof buildApp>
  let riderId = ''
  const poolBefore = process.env.DB_POOL_MAX

  const hoy = async (currentDay: number) => {
    await t.db.update(gameState).set({ currentDay, lastProcessedDay: currentDay })
  }
  const pide = (method: 'GET' | 'PUT', payload?: unknown) =>
    app.inject({
      method,
      url: PLAN,
      headers: { 'x-test-user': PLAYER },
      ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    })
  // Sin drizzle-orm: `apps/api` no depende de él y sus tests leen con SQL crudo (authFlow.test.ts).
  const filas = async (): Promise<number[]> =>
    (
      await t.client<{ start_day: number }[]>`
        select start_day from training_plans where rider_id = ${riderId} order by start_day`
    ).map((f) => f.start_day)

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'plan-vivo-ruta', engineVersion: 1 })
      .returning({ id: worlds.id })
    await t.db
      .insert(users)
      .values({ id: PLAYER, email: 'jugador@example.com', name: 'Jugador', emailVerified: true })
    const [rider] = await t.db
      .insert(riders)
      .values({
        worldId: world!.id,
        userId: PLAYER,
        name: 'Jugador',
        country: 'ES',
        gender: 'M',
        birthSeason: -25,
        archetype: 'escalada',
        faceSeed: 'cara',
      })
      .returning({ id: riders.id })
    riderId = rider!.id
    await t.db
      .insert(gameState)
      .values({ worldId: world!.id, currentDay: D + 100, lastProcessedDay: D + 100 })
    app = buildApp({
      db: t.db,
      auth: headerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      adminEmail: 'raiz@example.com',
      switches: { broadcastWatch: 'on', spoilerMode: 'off' },
    })
  }, 180_000)

  afterAll(async () => {
    await app?.close()
    await t?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('el día 100 y otra vez el 110: una fila, la del 101, con los bloques del segundo', async () => {
    expect((await pide('PUT', cuerpo(['base', null, null, null]))).statusCode).toBe(200)
    await hoy(D + 110)
    expect((await pide('PUT', cuerpo(['especifico', 'afinado', null, 'base']))).statusCode).toBe(
      200,
    )
    expect(await filas()).toEqual([D + 101])
    const leido = trainingPlanResponseSchema.parse((await pide('GET')).json())
    expect(leido.plan?.startDay).toBe(D + 101)
    expect(leido.plan?.blocks).toEqual(['especifico', 'afinado', null, 'base'])
  })

  it('con startFresh, empieza mañana y el de antes, que pisaba, se borra', async () => {
    const r = await pide('PUT', cuerpo(['recuperacion', null, null, null], { startFresh: true }))
    expect(r.statusCode).toBe(200)
    expect(await filas()).toEqual([D + 111])
    const leido = trainingPlanResponseSchema.parse((await pide('GET')).json())
    expect(leido.plan?.startDay).toBe(D + 111)
    expect(leido.plan?.blocks).toEqual(['recuperacion', null, null, null])
  })

  it('un startFresh que no es un booleano es un 400, y no toca nada', async () => {
    const r = await pide('PUT', cuerpo(['base', null, null, null], { startFresh: 'sí' }))
    expect(r.statusCode).toBe(400)
    expect(await filas()).toEqual([D + 111])
  })
})
