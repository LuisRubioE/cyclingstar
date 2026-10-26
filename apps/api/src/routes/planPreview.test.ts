import {
  gameState,
  raceRosters,
  riderAttrs,
  riderDailyLog,
  riders,
  teamTrainingOrders,
  teams,
  trainingOrders,
  trainingPlans,
  users,
  worlds,
} from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import {
  ATTRIBUTES,
  type OrdersDay,
  type PlanPreview,
  ordersResponseSchema,
  planPreviewResponseSchema,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'

/**
 * LA VISTA PREVIA DEL PLAN Y LOS 28 DÍAS (E3, docs/visual.md §11.2 a §11.4; D-34 a D-37; PR 13b). La
 * vista previa proyecta lo que hará el tick: una llegada por carrera, la de su salida; las semanas desde
 * el `startDay` del plan vivo; el modo y las órdenes de la pantalla; el viaje a 15; el primer día desde
 * el último diario; la carrera en curso sin llegada; y ningún número interno en la respuesta.
 * `GET /orders` trae los mismos días con lo guardado.
 *
 * El mundo, el día 188 de la temporada 0: A corre `race-france` (salió el 185 y vuelve a casa el 208),
 * B sale mañana en `race-austria` (189-193) y C no corre: tiene un plan vivo desde el 180, una orden
 * guardada y el plan de su equipo.
 */

const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const HOY = 188
const MANANA = HOY + 1
const A = { user: idDe(901), rider: idDe(1) }
const B = { user: idDe(902), rider: idDe(2) }
const C = { user: idDe(903), rider: idDe(3) }
const TEAM = idDe(100)
const FRANCE = 'race-france:s0'
const AUSTRIA = 'race-austria:s0'
/** Los bloques del plan vivo de C, con la tercera semana para el equipo y el entrenador. */
const BLOQUES = ['base', 'construccion', null, 'afinado'] as const
/** Lo que cargó cada etapa de A: poco, para que su mediana y la del mundo no se confundan con 150. */
const TSS_DE_ETAPA = 20

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

const cuerpo = (extra: Record<string, unknown> = {}) => ({
  mode: 'mixto',
  plan: { blocks: [...BLOQUES], focusAttr: null, intensity: null },
  edits: [],
  ...extra,
})

describe('POST /api/riders/me/plan/preview y GET /api/riders/me/orders (§11.2)', () => {
  let t: TestDb
  let app: ReturnType<typeof buildApp>
  const poolBefore = process.env.DB_POOL_MAX

  const pide = async (user: string, payload: unknown) =>
    app.inject({
      method: 'POST',
      url: '/api/riders/me/plan/preview',
      headers: { 'x-test-user': user },
      payload: payload as Record<string, unknown>,
    })
  const vista = async (user: string, payload: unknown): Promise<PlanPreview> => {
    const r = await pide(user, payload)
    expect(r.statusCode, r.body).toBe(200)
    return planPreviewResponseSchema.parse(r.json())
  }
  const diaDe = (p: { days: readonly OrdersDay[] }, gameDay: number) =>
    p.days.find((d) => d.gameDay === gameDay)

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'vista-previa', engineVersion: 1 })
      .returning({ id: worlds.id })
    const worldId = world!.id
    await t.db.insert(teams).values({
      id: TEAM,
      worldId,
      name: 'Equipo',
      division: 'WT',
      philosophy: 'general',
      jerseySeed: 'equipacion',
      country: 'ES',
    })
    for (const [i, quien] of [A, B, C].entries()) {
      await t.db.insert(users).values({
        id: quien.user,
        email: `jugador${i}@example.com`,
        name: `Jugador ${i}`,
        emailVerified: true,
      })
      await t.db.insert(riders).values({
        id: quien.rider,
        worldId,
        userId: quien.user,
        teamId: quien === C ? TEAM : null,
        name: `Corredor ${i}`,
        country: 'ES',
        gender: 'M',
        birthSeason: -25,
        archetype: 'escalada',
        faceSeed: `cara-${i}`,
      })
      await t.db
        .insert(riderAttrs)
        .values(ATTRIBUTES.map((attr) => ({ riderId: quien.rider, attr, value: 60 })))
    }
    await t.db.insert(raceRosters).values([
      { raceId: FRANCE, riderId: A.rider },
      { raceId: AUSTRIA, riderId: B.rider },
    ])
    // El diario: entrenamiento hasta el 184; A corre del 185 al 188, poco. La última fila decide el
    // primer día: la de B amanece con TSB 30 (`oxidado`), la de C con 0.
    const fila = (
      riderId: string,
      gameDay: number,
      ctl: number,
      atl: number,
      carrera: number | null,
    ) => ({
      riderId,
      gameDay,
      tss: carrera === null ? 90 : TSS_DE_ETAPA,
      ctl,
      atl,
      tsb: ctl - atl,
      activity: carrera === null ? 'fondo' : `carrera:race-france:e${carrera}`,
    })
    const diario = []
    for (let dia = 181; dia <= HOY; dia++) {
      diario.push(fila(A.rider, dia, 55, 50, dia >= 185 ? dia - 184 : null))
      diario.push(fila(B.rider, dia, 60, 30, null))
      diario.push(fila(C.rider, dia, 50, 50, null))
    }
    await t.db.insert(riderDailyLog).values(diario)
    // C: un plan vivo desde el 180 (el 189 es su semana 2), una orden guardada y el plan de su equipo.
    await t.db.insert(trainingPlans).values({
      riderId: C.rider,
      startDay: 180,
      block1: BLOQUES[0],
      block2: BLOQUES[1],
      block3: BLOQUES[2],
      block4: BLOQUES[3],
    })
    await t.db
      .insert(trainingOrders)
      .values({ riderId: C.rider, gameDay: 192, session: 'sprint', intensity: 'fuerte' })
    await t.db
      .insert(teamTrainingOrders)
      .values({ teamId: TEAM, gameDay: 195, session: 'umbral', intensity: 'normal' })
    await t.db.insert(gameState).values({ worldId, currentDay: HOY, lastProcessedDay: HOY })
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

  it('una carrera, una llegada: la de su salida, con el TSB del último diario', async () => {
    const p = await vista(B.user, cuerpo())
    expect(p.races).toHaveLength(1)
    expect(p.races[0]).toMatchObject({
      raceKey: AUSTRIA,
      raceId: 'race-austria',
      name: 'Race Austria',
      stageCount: 5,
      startDay: 189,
      endDay: 193,
      ongoing: false,
      // el TSB con que amanece mañana es el del último diario (60 − 30), no 0
      arrival: 'oxidado',
    })
    for (let dia = 189; dia <= 193; dia++) {
      expect(diaDe(p, dia)).toMatchObject({
        kind: 'race',
        source: 'carrera',
        session: null,
        intensity: null,
        raceKey: AUSTRIA,
      })
    }
  })

  it('el viaje, a 15: un día de viaje es `Easy`, de vuelta de su carrera', async () => {
    const p = await vista(B.user, cuerpo())
    expect(p.races[0]!.travelBack).toContain(194)
    expect(diaDe(p, 194)).toMatchObject({
      kind: 'travel',
      source: 'viaje',
      session: 'viaje',
      intensity: 'normal',
      raceKey: AUSTRIA,
      load: 1,
    })
  })

  it('la carrera en curso sale sin llegada, y sus etapas con la carga de las que ya corrió', async () => {
    const p = await vista(A.user, cuerpo())
    expect(p.races.map((r) => [r.raceKey, r.ongoing, r.arrival])).toEqual([[FRANCE, true, null]])
    expect(p.races[0]!.travelBack).toContain(208)
    // las suyas cargaron 20, `Easy`; sin ellas serían las 150 de `PREVIEW_RACE_DAY_TSS`, `Very hard`
    expect(diaDe(p, 189)).toMatchObject({ kind: 'race', load: 1 })
    expect(diaDe(p, 208)).toMatchObject({ kind: 'travel', source: 'viaje' })
  })

  it('sin días de carrera propios, la mediana de los del mundo: B corre Austria como A corrió Francia', async () => {
    const p = await vista(B.user, cuerpo())
    expect(diaDe(p, 189)).toMatchObject({ kind: 'race', load: 1 })
  })

  it('las semanas, desde el startDay del plan vivo; con startFresh, desde mañana', async () => {
    const vivo = await vista(C.user, cuerpo())
    expect(diaDe(vivo, MANANA)).toMatchObject({
      source: 'bloque',
      block: { code: 'construccion', week: 2 },
    })
    const deCero = await vista(C.user, cuerpo({ startFresh: true }))
    expect(diaDe(deCero, MANANA)).toMatchObject({
      source: 'bloque',
      block: { code: 'base', week: 1 },
    })
  })

  it('el modo y las órdenes de la pantalla, y el plan de equipo solo en mixto', async () => {
    const mixto = await vista(C.user, cuerpo())
    // la tercera semana del plan (194-200) es del equipo o del entrenador
    expect(diaDe(mixto, 195)).toMatchObject({ source: 'equipo', session: 'umbral' })
    expect(diaDe(mixto, 196)).toMatchObject({ source: 'entrenador' })
    // la ventana de la pantalla, sin la orden guardada del 192
    expect(diaDe(mixto, 192)).toMatchObject({ source: 'bloque' })
    const conOrden = await vista(
      C.user,
      cuerpo({ edits: [{ gameDay: 193, session: 'crono', intensity: 'suave' }] }),
    )
    expect(diaDe(conOrden, 193)).toMatchObject({
      source: 'orden',
      session: 'crono',
      intensity: 'suave',
    })
    const manual = await vista(
      C.user,
      cuerpo({
        mode: 'manual',
        plan: { blocks: [null, null, null, null], focusAttr: null, intensity: null },
      }),
    )
    expect(diaDe(manual, MANANA)).toMatchObject({ source: 'descanso', session: 'descanso_activo' })
    expect(diaDe(manual, 195)).toMatchObject({ source: 'descanso' })
    const entrenador = await vista(
      C.user,
      cuerpo({
        mode: 'entrenador',
        edits: [{ gameDay: 193, session: 'crono', intensity: 'suave' }],
      }),
    )
    expect(new Set(entrenador.days.map((d) => d.source))).toEqual(new Set(['entrenador']))
  })

  it('28 días, y ningún número interno: ni ctl, ni atl, ni tsb, ni tss', async () => {
    for (const quien of [A, B, C]) {
      const r = await pide(quien.user, cuerpo())
      expect(r.statusCode).toBe(200)
      const p = planPreviewResponseSchema.parse(r.json())
      expect(p.days.map((d) => d.gameDay)).toEqual(Array.from({ length: 28 }, (_, k) => MANANA + k))
      for (const clave of ['ctl', 'atl', 'tsb', 'tss', 'totalTss', 'arrivals']) {
        expect(r.body).not.toContain(`"${clave}"`)
      }
    }
  })

  it('GET /orders trae los mismos 28 días que la vista previa de lo guardado (11-a)', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/api/riders/me/orders',
      headers: { 'x-test-user': C.user },
    })
    expect(r.statusCode).toBe(200)
    const orders = ordersResponseSchema.parse(r.json())
    const guardado = await vista(
      C.user,
      cuerpo({ edits: [{ gameDay: 192, session: 'sprint', intensity: 'fuerte' }] }),
    )
    expect(orders.days).toEqual(
      guardado.days.map(({ gameDay, session, intensity, source, block, raceKey }) => ({
        gameDay,
        session,
        intensity,
        source,
        block,
        raceKey,
      })),
    )
    expect(diaDe(orders, 192)).toMatchObject({ source: 'orden', session: 'sprint' })
    // y los días de carrera de siempre, en números, para la pantalla de hoy
    const deA = ordersResponseSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: '/api/riders/me/orders',
          headers: { 'x-test-user': A.user },
        })
      ).json(),
    )
    expect(deA.raceDays[0]).toBe(189)
  })

  it('la petición es estricta: un startDay en el plan, o una clave de más, es un 400', async () => {
    expect(
      (
        await pide(
          C.user,
          cuerpo({
            plan: {
              startDay: 0,
              blocks: [...BLOQUES],
              focusAttr: null,
              intensity: null,
              goalRaceId: null,
            },
          }),
        )
      ).statusCode,
    ).toBe(400)
    expect((await pide(C.user, cuerpo({ totalTss: 0 }))).statusCode).toBe(400)
    expect((await pide(C.user, { mode: 'mixto', plan: cuerpo().plan })).statusCode).toBe(400)
  })
})
