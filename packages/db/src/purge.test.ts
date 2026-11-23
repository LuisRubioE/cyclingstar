import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  AUTH_LIMITS_RETENTION_DAYS,
  EMAIL_LOG_RETENTION_DAYS,
  PURGE_UNCONFIRMED_DAYS,
  purgeAccounts,
} from './purge.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * LA PURGA (docs/cuenta.md §15.4; D-34, DD-17 A, 9-g, 15-c; PR 12). Borra lo de cada plazo y nada más:
 * `auth_limits` de más de 2 días sin cierre vivo, `email_log` de más de 90, `verifications` caducadas y las
 * cuentas aprobadas sin confirmar con `approved_at` de más de 7 días y sin corredor ni equipo. Las `pending`
 * no se tocan: las decide un administrador. Que corra en `runTick` solo si se procesaron días lo mira
 * `tickRun.test.ts`.
 */
const AHORA = new Date('2026-11-23T12:00:00.000Z')
const hace = (dias: number): string => new Date(AHORA.getTime() - dias * 86_400_000).toISOString()

describe('purgeAccounts (§15.4)', () => {
  let t: TestDb

  beforeAll(async () => {
    t = await startTestDb()
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  it('las constantes de §16.1', () => {
    expect([AUTH_LIMITS_RETENTION_DAYS, EMAIL_LOG_RETENTION_DAYS, PURGE_UNCONFIRMED_DAYS]).toEqual([
      2, 90, 7,
    ])
  })

  it('borra lo de cada plazo y nada más', async () => {
    const limite = async (key: string, inicio: string, cierre: string | null) => {
      await t.client`
        insert into auth_limits (key, window_start, count, day_start, day_count, locked_until)
        values (${key}, ${inicio}, 1, ${inicio}, 1, ${cierre})`
    }
    await limite('acct:viejo', hace(3), null)
    await limite('acct:nuevo', hace(1), null)
    await limite('acct:cerrado', hace(3), new Date(AHORA.getTime() + 3_600_000).toISOString())
    await limite('acct:cierre-pasado', hace(3), hace(2.5))

    const correo = async (hash: string, dias: number) => {
      await t.client`
        insert into email_log (kind, recipient_hash, status, created_at)
        values ('verify_signup', ${hash}, 'delivered', ${hace(dias)})`
    }
    await correo('viejo', 91)
    await correo('nuevo', 89)

    await t.client`insert into verifications (identifier, value, expires_at) values ('caducada', 'x', ${hace(0.01)})`
    await t.client`insert into verifications (identifier, value, expires_at) values ('viva', 'x', ${new Date(AHORA.getTime() + 60_000).toISOString()})`

    await purgeAccounts(t.db, AHORA)

    const claves = await t.client<{ key: string }[]>`select key from auth_limits order by key`
    expect(claves.map((c) => c.key)).toEqual(['acct:cerrado', 'acct:nuevo'])
    const correos = await t.client<
      { recipient_hash: string }[]
    >`select recipient_hash from email_log`
    expect(correos.map((c) => c.recipient_hash)).toEqual(['nuevo'])
    const enlaces = await t.client<{ identifier: string }[]>`select identifier from verifications`
    expect(enlaces.map((v) => v.identifier)).toEqual(['viva'])
  })

  it('la aprobada sin confirmar de hace 8 días y sin corredor cae; la de 6, la que tiene corredor y la pending de 30, no', async () => {
    const [w] = await t.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('purga', 1) returning id`
    const cuenta = async (
      email: string,
      o: {
        status: 'pending' | 'approved'
        verificada: boolean
        aprobada: string | null
        creada: string
      },
    ): Promise<string> => {
      const [u] = await t.client<{ id: string }[]>`
        insert into users (email, email_verified, status, approved_at, created_at)
        values (${email}, ${o.verificada}, ${o.status}, ${o.aprobada}, ${o.creada}) returning id`
      return u!.id
    }
    const cae = await cuenta('cae@example.com', {
      status: 'approved',
      verificada: false,
      aprobada: hace(8),
      creada: hace(20),
    })
    await t.client`insert into accounts (account_id, provider_id, user_id, password) values (${cae}, 'credential', ${cae}, 'h')`
    await cuenta('seis@example.com', {
      status: 'approved',
      verificada: false,
      aprobada: hace(6),
      creada: hace(20),
    })
    await cuenta('confirmada@example.com', {
      status: 'approved',
      verificada: true,
      aprobada: hace(30),
      creada: hace(30),
    })
    await cuenta('pendiente@example.com', {
      status: 'pending',
      verificada: false,
      aprobada: null,
      creada: hace(30),
    })
    const conCorredor = await cuenta('corredor@example.com', {
      status: 'approved',
      verificada: false,
      aprobada: hace(8),
      creada: hace(20),
    })
    await t.client`
      insert into riders (world_id, user_id, name, country, gender, birth_season, archetype, face_seed)
      values (${w!.id}, ${conCorredor}, 'Con Corredor', 'ES', 'M', 1, 'escalada', 'c')`
    const conEquipo = await cuenta('equipo@example.com', {
      status: 'approved',
      verificada: false,
      aprobada: hace(8),
      creada: hace(20),
    })
    await t.client`
      insert into teams (world_id, owner_user_id, name, division, philosophy, jersey_seed, country, budget)
      values (${w!.id}, ${conEquipo}, 'Con Equipo', 'CON', 'cantera', 'j', 'ES', 1000)`

    const out = await purgeAccounts(t.db, AHORA)
    expect(out.accounts).toBe(1)

    const quedan = await t.client<{ email: string }[]>`select email from users order by email`
    expect(quedan.map((u) => u.email)).toEqual([
      'confirmada@example.com',
      'corredor@example.com',
      'equipo@example.com',
      'pendiente@example.com',
      'seis@example.com',
    ])
    const [cred] = await t.client`select count(*)::int as n from accounts where user_id = ${cae}`
    expect(cred!.n).toBe(0)

    // Idempotente: otra pasada no borra nada más.
    expect((await purgeAccounts(t.db, AHORA)).accounts).toBe(0)
  })
})
