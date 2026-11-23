import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clearAttempts, reserveAttempt } from './authLimits.js'
import { startTestDb, type TestDb } from './testDb.js'

/**
 * LA RESERVA (docs/cuenta.md §7.3; H-01; O-14): el juez de código midió una ráfaga de 40 a la vez con
 * un límite de 10. Contando después pasaban 39; reservando antes, 10 pasan y 30 se niegan.
 */
const REGLA = { windowS: 900, max: 10, dayMax: null, lockS: 900 }

describe('db: reserveAttempt', () => {
  let t: TestDb
  const poolBefore = process.env.DB_POOL_MAX

  beforeAll(async () => {
    // PGlite admite una sesión (testDb.ts): las 40 reservas van por la misma conexión, intercaladas.
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
  }, 120_000)

  afterAll(async () => {
    await t?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('40 a la vez con un límite de 10: 10 pasan, 30 se niegan, una fila', async () => {
    const ahora = new Date()
    const r = await Promise.all(
      Array.from({ length: 40 }, () => reserveAttempt(t.db, 'acct:rafaga', REGLA, ahora)),
    )
    expect(r.filter((x) => x.allowed)).toHaveLength(10)
    expect(r.filter((x) => !x.allowed)).toHaveLength(30)
    const filas = await t.client<
      { count: number }[]
    >`select count from auth_limits where key = 'acct:rafaga'`
    expect(filas).toHaveLength(1)
  })

  it('un intento negado no suma; pasado el cierre, la ventana empieza otra vez; clearAttempts la borra', async () => {
    const t0 = new Date('2026-11-23T10:00:00Z')
    for (let i = 0; i < 10; i++) {
      expect((await reserveAttempt(t.db, 'acct:cierre', REGLA, t0)).allowed).toBe(true)
    }
    const undecimo = await reserveAttempt(t.db, 'acct:cierre', REGLA, t0)
    expect(undecimo).toEqual({ allowed: false, retryAfterS: 900, byDay: false })
    // diez minutos después, sigue cerrada y el contador no se mueve
    const luego = await reserveAttempt(t.db, 'acct:cierre', REGLA, new Date(t0.getTime() + 600_000))
    expect(luego).toEqual({ allowed: false, retryAfterS: 300, byDay: false })
    const [fila] = await t.client<
      { count: number }[]
    >`select count from auth_limits where key = 'acct:cierre'`
    expect(fila!.count).toBe(11)
    const despues = await reserveAttempt(
      t.db,
      'acct:cierre',
      REGLA,
      new Date(t0.getTime() + 901_000),
    )
    expect(despues).toMatchObject({ allowed: true, count: 1 })
    await clearAttempts(t.db, ['acct:cierre'])
    const quedan = await t.client`select 1 from auth_limits where key = 'acct:cierre'`
    expect(quedan).toHaveLength(0)
  })

  it('el tope diario: negado con byDay y cerrado hasta que acaba el día', async () => {
    const regla = { windowS: 900, max: 5, dayMax: 10, lockS: 900 }
    const t0 = new Date('2026-11-23T10:00:00Z')
    let r = await reserveAttempt(t.db, 'pw:dia', regla, t0)
    for (let i = 1; i < 10; i++) {
      r = await reserveAttempt(t.db, 'pw:dia', regla, new Date(t0.getTime() + i * 1_000_000))
    }
    expect(r).toMatchObject({ allowed: true, dayCount: 10 })
    const once = await reserveAttempt(t.db, 'pw:dia', regla, new Date(t0.getTime() + 10_000_000))
    expect(once).toEqual({ allowed: false, retryAfterS: 86_400 - 10_000, byDay: true })
  })
})
