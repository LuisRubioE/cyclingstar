import { ENGINE_VERSION } from '@cyclingstar/engine'
import { ATTRIBUTES, gameDayToReal } from '@cyclingstar/shared'
import { and, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { awayFacts, welcomeBack } from './away.js'
import {
  contracts,
  offers,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  teamTrainingOrders,
  teams,
  trainingPlans,
  users,
  worlds,
} from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { trainWorldDay } from './train.js'

/**
 * LA AUSENCIA EN EL TICK Y EN SUS PANTALLAS (docs/cuenta.md §14.1, §14.2 y §14.5; 14-c; PR 13 de E4), contra
 * Postgres real (PGlite):
 *
 * - Un día de tick: el corredor en `manual` de un dueño ausente, sin orden, entrena en `mixto` (el plan de
 *   su equipo) y no descansa; el de un dueño presente, en `manual`, hace `descanso_activo`; en `mixto`, lo
 *   mismo con y sin ausencia. `ENGINE_VERSION` sigue en 91: el cambio vive en `packages/shared` y `packages/db`.
 * - Las líneas de `Away`, con los datos de cada jugador: plan vivo y contrato que vence, agente libre sin
 *   plan, y el mánager.
 * - `Welcome back`: días, entrenamientos y etapas desde `welcome_back_from`, ofertas caducadas y abiertas.
 */

const GAME_DAY = 100
const PLAN_EQUIPO = { session: 'umbral', intensity: 'normal' } as const

interface Seeded {
  readonly worldId: string
  readonly ausente: { readonly user: string; readonly rider: string }
  readonly presente: { readonly user: string; readonly rider: string }
  readonly mixto: { readonly user: string; readonly rider: string }
}

async function siembra(t: TestDb): Promise<Seeded> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-ausencia', engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = world!.id
  const cuentas = await t.db
    .insert(users)
    .values(['ausente', 'presente', 'mixto'].map((n) => ({ email: `${n}@example.com` })))
    .returning({ id: users.id })
  const [uAusente, uPresente, uMixto] = cuentas.map((c) => c.id) as [string, string, string]
  // el dueño del primero, ausente cinco días; el del tercero también, y dirige el equipo
  await t.client`update users set away_since = now(), away_until = now() + interval '5 days'
    where id in (${uAusente}, ${uMixto})`
  const [team] = await t.db
    .insert(teams)
    .values({
      worldId,
      name: 'Equipo de la ausencia',
      division: 'WT',
      philosophy: 'general',
      jerseySeed: 'j0',
      country: 'ES',
      ownerUserId: uMixto,
    })
    .returning({ id: teams.id })
  const filas = await t.db
    .insert(riders)
    .values(
      (
        [
          [uAusente, 'manual', team!.id],
          [uPresente, 'manual', null],
          [uMixto, 'mixto', team!.id],
        ] as const
      ).map(([userId, trainingMode, teamId], i) => ({
        worldId,
        userId,
        teamId,
        trainingMode,
        name: `Corredor ${i}`,
        country: 'ES',
        residence: 'ES' as const,
        gender: 'M' as const,
        birthSeason: -6,
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
        ctl: 60,
        atl: 60,
      })),
    )
    .returning({ id: riders.id })
  const [rAusente, rPresente, rMixto] = filas.map((r) => r.id) as [string, string, string]
  const todos = [rAusente, rPresente, rMixto]
  await t.db
    .insert(riderAttrs)
    .values(todos.flatMap((id) => ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 }))))
  await t.db.insert(riderHidden).values(
    todos.map((id) => ({
      riderId: id,
      talent: 1,
      ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])),
      fragility: 0,
      peakAge: 28,
      declineAge: 33,
    })),
  )
  // el plan de equipo del día: lo que hace `mixto` en el hueco
  await t.db
    .insert(teamTrainingOrders)
    .values({ teamId: team!.id, gameDay: GAME_DAY, ...PLAN_EQUIPO })
  // contratos: el del ausente vence esta temporada (la 0); el del mánager, en dos
  await t.db.insert(contracts).values([
    { riderId: rAusente, teamId: team!.id, salary: 100, startSeason: 0, endSeason: 0 },
    { riderId: rMixto, teamId: team!.id, salary: 100, startSeason: 0, endSeason: 2 },
  ])
  // el plan vivo del ausente, desde el día 95: su último día es el 122; su primera semana, la de hoy, va a
  // `null` («esa semana decide el entrenador»; en `manual`, nadie), para que el día lo decida el hueco
  await t.db.insert(trainingPlans).values({ riderId: rAusente, startDay: 95, block2: 'base' })
  return {
    worldId,
    ausente: { user: uAusente, rider: rAusente },
    presente: { user: uPresente, rider: rPresente },
    mixto: { user: uMixto, rider: rMixto },
  }
}

describe('db: la ausencia en el tick, en Away y en Welcome back (§14)', () => {
  let t: TestDb
  let s: Seeded

  const actividad = async (riderId: string) =>
    (
      await t.db
        .select({ activity: riderDailyLog.activity })
        .from(riderDailyLog)
        .where(and(eq(riderDailyLog.riderId, riderId), eq(riderDailyLog.gameDay, GAME_DAY)))
    )[0]?.activity

  beforeAll(async () => {
    t = await startTestDb()
    s = await siembra(t)
    await t.db.transaction((tx) => trainWorldDay(tx, s.worldId, GAME_DAY, 'semilla'))
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  it('manual con el dueño ausente: entrena el plan de equipo, como mixto, y no descansa', async () => {
    expect(await actividad(s.ausente.rider)).toBe(PLAN_EQUIPO.session)
  })

  it('manual con el dueño presente: descanso activo', async () => {
    expect(await actividad(s.presente.rider)).toBe('descanso_activo')
  })

  it('mixto con el dueño ausente: lo de siempre, el plan de equipo', async () => {
    expect(await actividad(s.mixto.rider)).toBe(PLAN_EQUIPO.session)
  })

  it('ENGINE_VERSION sigue en 91: el motor no ve training_mode', () => {
    expect(ENGINE_VERSION).toBe(91)
  })

  it('Away: plan vivo hasta su último día y contrato que vence', async () => {
    const now = new Date()
    expect(await awayFacts(t.db, s.ausente.user, GAME_DAY, now)).toEqual({
      rider: {
        name: 'Corredor 0',
        gender: 'M',
        planEndsAt: gameDayToReal(122, GAME_DAY, now).toISOString(),
        freeAgent: false,
        contractEnding: true,
      },
      managesTeam: false,
    })
  })

  it('Away: agente libre sin plan; y el mánager, con su contrato que no vence', async () => {
    expect(await awayFacts(t.db, s.presente.user, GAME_DAY)).toEqual({
      rider: {
        name: 'Corredor 1',
        gender: 'M',
        planEndsAt: null,
        freeAgent: true,
        contractEnding: false,
      },
      managesTeam: false,
    })
    expect(await awayFacts(t.db, s.mixto.user, GAME_DAY)).toMatchObject({
      rider: { freeAgent: false, contractEnding: false, planEndsAt: null },
      managesTeam: true,
    })
  })

  it('Welcome back: nada sin welcome_back_from, ni con la ausencia viva', async () => {
    expect(await welcomeBack(t.db, s.presente.user, GAME_DAY)).toBeNull()
    await t.client`update users set welcome_back_from = now() - interval '3 days' where id = ${s.ausente.user}`
    expect(await welcomeBack(t.db, s.ausente.user, GAME_DAY)).toBeNull()
  })

  it('Welcome back: los días, lo entrenado y lo corrido, y las ofertas', async () => {
    const r = s.presente.rider
    // 3 días reales son 12 de juego: del 89 al 100. Del 89 al 99, 7 de entrenamiento, 2 etapas y 2 de
    // viaje; el 100 lo escribió el tick (descanso activo, entrena).
    const dias = [
      ...Array.from({ length: 7 }, (_, i) => ({ d: 89 + i, a: 'fondo' })),
      { d: 96, a: 'viaje' },
      { d: 97, a: 'carrera:race-x:e1' },
      { d: 98, a: 'carrera:race-x:e2' },
      { d: 99, a: 'viaje' },
      // fuera de la ventana: no cuenta
      { d: 80, a: 'fondo' },
    ]
    await t.db.insert(riderDailyLog).values(
      dias.map(({ d, a }) => ({
        riderId: r,
        gameDay: d,
        tss: 50,
        ctl: 60,
        atl: 60,
        tsb: 0,
        activity: a,
      })),
    )
    const [equipo] = await t.db.select({ id: teams.id }).from(teams)
    const oferta = {
      riderId: r,
      teamId: equipo!.id,
      season: 0,
      role: 'libre' as const,
      salary: 1,
      seasons: 1,
    }
    await t.db.insert(offers).values([
      { ...oferta, createdDay: 70, status: 'expirada' },
      { ...oferta, createdDay: 50, status: 'expirada' },
      { ...oferta, createdDay: 95, status: 'pendiente' },
      { ...oferta, createdDay: 90, status: 'pendiente' },
      { ...oferta, createdDay: 60, status: 'rechazada' },
    ])
    await t.client`update users set welcome_back_from = now() - interval '3 days' where id = ${s.presente.user}`
    const now = new Date()
    const w = await welcomeBack(t.db, s.presente.user, GAME_DAY, now)
    expect(w).toMatchObject({
      days: 3,
      gameDays: 12,
      rider: { id: r, name: 'Corredor 1', trainedDays: 8, stages: 2 },
      offers: { expired: 1, open: 2 },
    })
    // la primera abierta (la del 90) caduca tras el día 111
    expect(w!.offers.firstExpiresAt).toBe(gameDayToReal(111, GAME_DAY, now).toISOString())
  })

  it('Welcome back sin corredor: solo los días', async () => {
    const [u] = await t.db
      .insert(users)
      .values({ email: 'sin-corredor@example.com' })
      .returning({ id: users.id })
    await t.db
      .update(users)
      .set({ welcomeBackFrom: sql`now() - interval '9 days'` })
      .where(eq(users.id, u!.id))
    expect(await welcomeBack(t.db, u!.id, GAME_DAY)).toMatchObject({
      days: 9,
      rider: null,
      offers: { expired: 0, open: 0, firstExpiresAt: null },
    })
  })
})
