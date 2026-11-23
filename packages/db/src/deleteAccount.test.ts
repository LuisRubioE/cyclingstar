import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { deleteAccount, deleteUserAsAdmin } from './adminUsers.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * BORRAR UNA CUENTA, EN UNA TRANSACCIÓN (docs/cuenta.md §10.4; D-38, 10-b, 10-d; PR 12). `deleteAccount`
 * suelta corredor y equipo (`releaseUserToWorld`), borra sus `verifications`, vacía los correos de sus filas
 * `user.email` de `admin_audit` y borra la fila de `users`: lo demás cae en cascada y `email_log.user_id`
 * pasa a nulo. Un fallo a mitad no deja nada a medias, y el equipo conserva el nombre que puso el jugador.
 */
describe('deleteAccount (§10.4)', () => {
  let t: TestDb
  let worldId: string

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('borrar-cuenta', 1) returning id`
    worldId = w!.id
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  /** Una cuenta con todo lo que se puede tener: sesión, credencial, equipo, corredor, lo visto, enlaces y correos. */
  async function cuentaCompleta(email: string, equipo: string) {
    const [u] = await t.client<{ id: string }[]>`
      insert into users (email, email_verified, status) values (${email}, true, 'approved') returning id`
    const id = u!.id
    await t.client`insert into sessions (token, expires_at, user_id) values (${`tok-${email}`}, now() + interval '1 day', ${id})`
    await t.client`insert into accounts (account_id, provider_id, user_id, password) values (${id}, 'credential', ${id}, 'hash')`
    const [team] = await t.client<{ id: string }[]>`
      insert into teams (world_id, owner_user_id, name, division, philosophy, jersey_seed, country, budget)
      values (${worldId}, ${id}, ${equipo}, 'CON', 'cantera', 'j', 'ES', 1000) returning id`
    const [rider] = await t.client<{ id: string }[]>`
      insert into riders (world_id, user_id, team_id, name, country, gender, birth_season, archetype, face_seed)
      values (${worldId}, ${id}, ${team!.id}, ${`Corredor ${equipo}`}, 'ES', 'M', 1, 'escalada', 'cara') returning id`
    await t.client`insert into race_watch (user_id, world_id, race_key) values (${id}, ${worldId}, 'vuelta')`
    await t.client`insert into verifications (identifier, value, expires_at) values ('reset-x', ${id}, now() + interval '1 hour')`
    await t.client`insert into email_log (kind, recipient_hash, user_id, status) values ('verify_signup', 'h', ${id}, 'delivered')`
    await t.client`
      insert into admin_audit (actor, action, target_user_id, detail)
      values ('token', 'user.email', ${id}, ${JSON.stringify({ field: 'email', from: 'viejo@example.com', to: email })}::jsonb)`
    return { id, teamId: team!.id, riderId: rider!.id }
  }

  const n = async (q: PromiseLike<{ n: number }[]>): Promise<number> => (await q)[0]!.n

  async function filasDe(id: string) {
    return {
      users: await n(t.client`select count(*)::int as n from users where id = ${id}`),
      sessions: await n(t.client`select count(*)::int as n from sessions where user_id = ${id}`),
      accounts: await n(t.client`select count(*)::int as n from accounts where user_id = ${id}`),
      raceWatch: await n(t.client`select count(*)::int as n from race_watch where user_id = ${id}`),
      verifications: await n(
        t.client`select count(*)::int as n from verifications where value = ${id}`,
      ),
      emailLog: await n(t.client`select count(*)::int as n from email_log where user_id = ${id}`),
    }
  }

  it('un fallo inyectado tras soltar el corredor no deja nada a medias', async () => {
    const c = await cuentaCompleta('fallo@example.com', 'Los del Fallo')
    // El último paso, borrar la fila de `users`, revienta: lo de antes (corredor y equipo soltados, enlaces
    // borrados, correos olvidados) tiene que volver atrás con él.
    await t.client.unsafe(`
      create function falla_borrado() returns trigger language plpgsql as $$
      begin raise exception 'borrado envenenado'; end $$;
      create trigger borrado_envenenado before delete on users for each row execute function falla_borrado();`)
    try {
      await expect(deleteAccount(t.db, c.id)).rejects.toThrow()
    } finally {
      await t.client.unsafe(
        `drop trigger borrado_envenenado on users; drop function falla_borrado();`,
      )
    }
    expect(await filasDe(c.id)).toEqual({
      users: 1,
      sessions: 1,
      accounts: 1,
      raceWatch: 1,
      verifications: 1,
      emailLog: 1,
    })
    const [r] = await t.client`select user_id from riders where id = ${c.riderId}`
    expect(r!.user_id).toBe(c.id)
    const [e] = await t.client`select owner_user_id from teams where id = ${c.teamId}`
    expect(e!.owner_user_id).toBe(c.id)
    const [a] = await t.client`select detail from admin_audit where target_user_id = ${c.id}`
    expect(a!.detail).toMatchObject({ from: 'viejo@example.com', to: 'fallo@example.com' })
  })

  it('borra la cuenta entera; corredor y equipo pasan a la máquina y el equipo conserva su nombre', async () => {
    const c = await cuentaCompleta('adios@example.com', 'Los que se Quedan')
    await expect(deleteAccount(t.db, c.id)).resolves.toBe(true)
    expect(await filasDe(c.id)).toEqual({
      users: 0,
      sessions: 0,
      accounts: 0,
      raceWatch: 0,
      verifications: 0,
      emailLog: 0,
    })
    // El registro de correos se queda, sin a quién (90 días, §15.4).
    expect(
      await n(
        t.client`select count(*)::int as n from email_log where user_id is null and recipient_hash = 'h'`,
      ),
    ).toBeGreaterThanOrEqual(1)
    const [r] = await t.client`select user_id, team_id from riders where id = ${c.riderId}`
    expect(r).toEqual({ user_id: null, team_id: c.teamId })
    const [e] = await t.client`select owner_user_id, name from teams where id = ${c.teamId}`
    expect(e).toEqual({ owner_user_id: null, name: 'Los que se Quedan' })
    const [a] = await t.client`select detail from admin_audit where target_user_id = ${c.id}`
    expect(a!.detail).toMatchObject({ field: 'email', from: null, to: null })
    // Otra vez: ya no existe.
    await expect(deleteAccount(t.db, c.id)).resolves.toBe(false)
  })

  it('el panel borra con la misma función y deja su fila user.delete', async () => {
    const c = await cuentaCompleta('panel@example.com', 'Los del Panel')
    await expect(deleteUserAsAdmin(t.db, c.id, 'token')).resolves.toBe(true)
    expect((await filasDe(c.id)).verifications).toBe(0)
    const [e] = await t.client`select owner_user_id, name from teams where id = ${c.teamId}`
    expect(e).toEqual({ owner_user_id: null, name: 'Los del Panel' })
    const filas = await t.client`
      select action from admin_audit where target_user_id = ${c.id} order by at`
    expect(filas.map((f) => f.action)).toContain('user.delete')
    await expect(deleteUserAsAdmin(t.db, c.id, 'token')).resolves.toBe(false)
  })
})
