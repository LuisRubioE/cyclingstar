import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'

/**
 * EL PANEL DE ADMINISTRACIÓN, DE PUNTA A PUNTA: sesión de verdad, base de verdad (PGlite).
 *
 * Lo que se sella aquí es QUIÉN entra. Una guarda de admin mal hecha no se nota en el uso normal
 * —el dueño entra y todo funciona— y sólo se ve el día que entra quien no debía. Por eso se prueba
 * sobre todo el «no»: el jugador corriente, el que se registra con el correo del dueño sin
 * confirmarlo, el que manda un token malo junto a una sesión buena.
 */
const ROOT = 'dueno@example.com'
const BASE = 'http://localhost:3000'
const ADMIN_TOKEN = 't'.repeat(32)

describe('panel de administración, contra una base real', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  const cookies: Record<string, string> = {}
  const ids: Record<string, string> = {}
  const poolBefore = process.env.DB_POOL_MAX

  const authPost = (path: string, body: unknown) =>
    app.inject({
      method: 'POST',
      url: `/api/auth${path}`,
      headers: { 'content-type': 'application/json', origin: BASE },
      payload: JSON.stringify(body),
    })

  /** Da de alta una cuenta, la confirma si se pide, y guarda su cookie de sesión. */
  async function alta(nombre: string, email: string, confirmar = true): Promise<void> {
    await authPost('/sign-up/email', {
      name: nombre,
      email,
      password: 'contrasena-larga',
      birthDate: '1990-01-01',
    })
    if (confirmar) {
      await tdb.client`update users set email_verified = true where email = ${email}`
    }
    const [fila] = await tdb.client<{ id: string }[]>`select id from users where email = ${email}`
    ids[nombre] = fila!.id
    const login = await authPost('/sign-in/email', { email, password: 'contrasena-larga' })
    const setCookie = login.headers['set-cookie']
    const lista = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    cookies[nombre] = lista.map((c) => c.split(';')[0]).join('; ')
  }

  const como = (
    quien: string | null,
    method: 'GET' | 'PATCH' | 'DELETE' | 'POST',
    url: string,
    payload?: unknown,
    extra: Record<string, string> = {},
  ) =>
    app.inject({
      method,
      url,
      headers: {
        ...(quien ? { cookie: cookies[quien]! } : {}),
        ...(payload !== undefined ? { 'content-type': 'application/json' } : {}),
        ...extra,
      },
      ...(payload !== undefined ? { payload: JSON.stringify(payload) } : {}),
    })

  beforeAll(async () => {
    // PGlite admite UNA sesión (testDb.ts), y el correo de better-auth sale en segundo plano.
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailer: {
        async send() {
          return true
        },
      },
    })
    app = buildApp({
      db: tdb.db,
      auth,
      serveWeb: false,
      adminToken: ADMIN_TOKEN,
      adminEmail: ROOT,
      onAdminTick: async () => ({ ran: true, daysProcessed: 1, currentDay: 1, durationMs: 1 }),
      onAdminAdvance: async (days) => ({
        ran: true,
        daysProcessed: days,
        currentDay: days,
        durationMs: 1,
      }),
    })
    await alta('dueno', ROOT)
    await alta('jugador', 'jugador@example.com')
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('el dueño (ADMIN_EMAIL confirmado) entra con su sesión, sin token', async () => {
    const res = await como('dueno', 'GET', '/api/admin/whoami')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true, via: 'session', userId: ids.dueno })
  })

  it('un jugador corriente no entra', async () => {
    expect((await como('jugador', 'GET', '/api/admin/whoami')).statusCode).toBe(401)
    expect((await como('jugador', 'GET', '/api/admin/users')).statusCode).toBe(401)
  })

  it('sin sesión no entra nadie', async () => {
    expect((await como(null, 'GET', '/api/admin/users')).statusCode).toBe(401)
  })

  /* Una sesión de admin no «rescata» un token malo: quien lo manda está probando el token. */
  it('un token equivocado no cae a la sesión, aunque la sesión sea de admin', async () => {
    const res = await como('dueno', 'GET', '/api/admin/whoami', undefined, {
      'x-admin-token': 'x'.repeat(32),
    })
    expect(res.statusCode).toBe(401)
  })

  it('el token sigue valiendo para las máquinas', async () => {
    const res = await como(null, 'GET', '/api/admin/whoami', undefined, {
      'x-admin-token': ADMIN_TOKEN,
    })
    expect(res.json()).toEqual({ ok: true, via: 'token', userId: null })
  })

  it('la lista trae las cuentas y marca al raíz', async () => {
    const res = await como('dueno', 'GET', '/api/admin/users')
    const { users } = res.json() as { users: { email: string; isRootAdmin: boolean }[] }
    expect(users.map((u) => u.email).sort()).toEqual(['dueno@example.com', 'jugador@example.com'])
    expect(users.find((u) => u.email === ROOT)?.isRootAdmin).toBe(true)
    expect(users.find((u) => u.email !== ROOT)?.isRootAdmin).toBe(false)
  })

  it('busca por un trozo del correo', async () => {
    const res = await como('dueno', 'GET', '/api/admin/users?q=jugad')
    const { users } = res.json() as { users: { email: string }[] }
    expect(users.map((u) => u.email)).toEqual(['jugador@example.com'])
  })

  it('dar admin a otro lo deja entrar', async () => {
    const res = await como('dueno', 'PATCH', `/api/admin/users/${ids.jugador}`, { isAdmin: true })
    expect(res.statusCode).toBe(200)
    expect((await como('jugador', 'GET', '/api/admin/whoami')).statusCode).toBe(200)
  })

  it('otro admin no puede borrar al raíz', async () => {
    const res = await como('jugador', 'DELETE', `/api/admin/users/${ids.dueno}`)
    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ ok: false, error: 'es_el_admin_raiz' })
  })

  it('nadie se quita el admin a sí mismo ni se borra desde el panel', async () => {
    const quitar = await como('jugador', 'PATCH', `/api/admin/users/${ids.jugador}`, {
      isAdmin: false,
    })
    expect(quitar.statusCode).toBe(409)
    const borrar = await como('dueno', 'DELETE', `/api/admin/users/${ids.dueno}`)
    expect(borrar.statusCode).toBe(409)
  })

  it('un cambio vacío o con campos inventados es un 400', async () => {
    expect((await como('dueno', 'PATCH', `/api/admin/users/${ids.jugador}`, {})).statusCode).toBe(
      400,
    )
    const inventado = await como('dueno', 'PATCH', `/api/admin/users/${ids.jugador}`, {
      name: 'otro',
    })
    expect(inventado.statusCode).toBe(400)
    // `signOutEverywhere` solo acompaña a un correo nuevo.
    const solo = await como('dueno', 'PATCH', `/api/admin/users/${ids.jugador}`, {
      signOutEverywhere: true,
    })
    expect(solo.statusCode).toBe(400)
  })

  it('confirmar el correo y dar premium a mano', async () => {
    await tdb.client`update users set email_verified = false where id = ${ids.jugador!}`
    const res = await como('dueno', 'PATCH', `/api/admin/users/${ids.jugador}`, {
      emailVerified: true,
      premium: true,
    })
    expect(res.statusCode).toBe(200)
    const [fila] = await tdb.client<{ email_verified: boolean; premium: boolean }[]>`
      select email_verified, premium from users where id = ${ids.jugador!}`
    expect(fila).toEqual({ email_verified: true, premium: true })
  })

  /*
    Registrarse con el correo del dueño SIN confirmarlo no da nada. Es la condición que impide que
    ADMIN_EMAIL sea una puerta: sin ella, bastaría con conocer el correo del dueño.
  */
  it('el correo del raíz sin confirmar no es admin', async () => {
    await tdb.client`update users set email_verified = false where id = ${ids.dueno!}`
    expect((await como('dueno', 'GET', '/api/admin/whoami')).statusCode).toBe(401)
    await tdb.client`update users set email_verified = true where id = ${ids.dueno!}`
  })

  /** Las filas de `admin_audit` de una cuenta, de la más vieja a la más nueva. */
  const auditDe = (target: string, action?: string) =>
    tdb.client<{ actor: string; action: string; detail: Record<string, unknown> }[]>`
      select actor, action, detail from admin_audit
      where target_user_id = ${target} ${action ? tdb.client`and action = ${action}` : tdb.client``}
      order by at, action`

  const sesionesDe = async (id: string): Promise<number> => {
    const [fila] = await tdb.client<{ n: number }[]>`
      select count(*)::int as n from sessions where user_id = ${id}`
    return fila!.n
  }

  /*
    EL REGISTRO DEL PANEL (docs/cuenta.md §8.5; 8-d): una fila por campo que cambia, con el valor de
    antes y el de después, y el id de quien lo hizo.
  */
  it('cada campo cambiado deja su fila en admin_audit', async () => {
    const filas = await auditDe(ids.jugador!)
    expect(filas).toEqual([
      {
        actor: ids.dueno,
        action: 'user.is_admin',
        detail: { field: 'isAdmin', from: false, to: true },
      },
      {
        actor: ids.dueno,
        action: 'user.email_verified',
        detail: { field: 'emailVerified', from: false, to: true },
      },
      {
        actor: ids.dueno,
        action: 'user.premium',
        detail: { field: 'premium', from: false, to: true },
      },
    ])
  })

  /* La cuenta raíz la pone el despliegue (8-h): ni la confirmación, ni el permiso, ni el correo. */
  it('el PATCH sobre la cuenta raíz da 409 es_el_admin_raiz para emailVerified, isAdmin y email', async () => {
    for (const cambio of [
      { emailVerified: false },
      { isAdmin: false },
      { email: 'otro-dueno@example.com' },
    ]) {
      const res = await como('jugador', 'PATCH', `/api/admin/users/${ids.dueno}`, cambio)
      expect(res.statusCode, JSON.stringify(cambio)).toBe(409)
      expect(res.json()).toEqual({ ok: false, error: 'es_el_admin_raiz' })
    }
    // premium sí se le puede cambiar
    const premium = await como('jugador', 'PATCH', `/api/admin/users/${ids.dueno}`, {
      premium: true,
    })
    expect(premium.statusCode).toBe(200)
  })

  it.todo('birthDate en el PATCH, con birthDateSchema y 409 sobre la raíz (PR 9, con la columna)')

  /*
    EL CAMBIO DE CORREO, SOLO DESDE EL PANEL (docs/cuenta.md §5.5): normalizado, confirmado, sin
    correo a ninguna dirección y, con `Sign out everywhere` (por defecto), sin ninguna sesión viva.
  */
  it('cambiar el correo lo normaliza, lo deja confirmado y cierra todas las sesiones', async () => {
    await alta('tercero', 'tercero@example.com')
    await authPost('/sign-in/email', { email: 'tercero@example.com', password: 'contrasena-larga' })
    expect(await sesionesDe(ids.tercero!)).toBe(2)
    // el buzón viejo rebotaba (§9.3): con el correo nuevo, la marca se va (9-d)
    await tdb.client`update users set email_undeliverable_at = now() where id = ${ids.tercero!}`
    const res = await como('dueno', 'PATCH', `/api/admin/users/${ids.tercero}`, {
      email: '  Nuevo.Tercero@Example.com ',
    })
    expect(res.statusCode).toBe(200)
    const [fila] = await tdb.client<
      { email: string; email_verified: boolean; email_undeliverable_at: Date | null }[]
    >`select email, email_verified, email_undeliverable_at from users where id = ${ids.tercero!}`
    expect(fila).toEqual({
      email: 'nuevo.tercero@example.com',
      email_verified: true,
      email_undeliverable_at: null,
    })
    expect(await sesionesDe(ids.tercero!)).toBe(0)
    expect(await auditDe(ids.tercero!, 'user.email')).toEqual([
      {
        actor: ids.dueno,
        action: 'user.email',
        detail: { field: 'email', from: 'tercero@example.com', to: 'nuevo.tercero@example.com' },
      },
    ])
  })

  it('con signOutEverywhere en false, las sesiones siguen', async () => {
    await alta('cuarto', 'cuarto@example.com')
    const res = await como('dueno', 'PATCH', `/api/admin/users/${ids.cuarto}`, {
      email: 'cuarto.nuevo@example.com',
      signOutEverywhere: false,
    })
    expect(res.statusCode).toBe(200)
    expect(await sesionesDe(ids.cuarto!)).toBe(1)
  })

  it('el correo de ADMIN_EMAIL no se da (400 admin_email_fijo) y uno ocupado es 409 correo_ocupado', async () => {
    const fijo = await como('dueno', 'PATCH', `/api/admin/users/${ids.cuarto}`, {
      email: ROOT.toUpperCase(),
    })
    expect(fijo.statusCode).toBe(400)
    expect(fijo.json()).toEqual({ ok: false, error: 'admin_email_fijo' })
    const ocupado = await como('dueno', 'PATCH', `/api/admin/users/${ids.cuarto}`, {
      email: 'jugador@example.com',
    })
    expect(ocupado.statusCode).toBe(409)
    expect(ocupado.json()).toEqual({ ok: false, error: 'correo_ocupado' })
    // Ni una fila de más: lo que no se guarda no se apunta.
    expect(await auditDe(ids.cuarto!, 'user.email')).toHaveLength(1)
  })

  /*
    `PATCH /api/admin/teams/:id` (8-e): cualquier equipo, con las reglas de su dueño
    (`updateOwnedTeam`): de 2 a 40 caracteres, no bloqueado, no repetido en el mundo.
  */
  it('cambiar el nombre de un equipo, con las reglas de updateOwnedTeam y su fila team.name', async () => {
    const [world] = await tdb.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('panel-equipos', 91) returning id`
    const equipo = async (name: string) => {
      const [fila] = await tdb.client<{ id: string }[]>`
        insert into teams (world_id, name, division, philosophy, jersey_seed)
        values (${world!.id}, ${name}, 'WT', 'equilibrado', ${`panel:${name}`}) returning id`
      return fila!.id
    }
    const uno = await equipo('Noord Cycling')
    await equipo('Zuid Racing')
    const renombra = (id: string, name: string, quien: string | null = 'dueno') =>
      como(quien, 'PATCH', `/api/admin/teams/${id}`, { name })

    const bien = await renombra(uno, '  Oost Cycling ')
    expect(bien.statusCode).toBe(200)
    const [fila] = await tdb.client<{ name: string }[]>`select name from teams where id = ${uno}`
    expect(fila!.name).toBe('Oost Cycling')
    const [audit] = await tdb.client<{ actor: string; detail: unknown }[]>`
      select actor, detail from admin_audit where action = 'team.name'`
    expect(audit).toEqual({
      actor: ids.dueno,
      detail: { field: 'name', from: 'Noord Cycling', to: 'Oost Cycling', teamId: uno },
    })

    const repetido = await renombra(uno, 'zuid racing')
    expect(repetido.statusCode).toBe(409)
    expect(repetido.json()).toEqual({ ok: false, error: 'nombre_repetido' })
    expect((await renombra(uno, 'A')).json()).toEqual({ ok: false, error: 'nombre_invalido' })
    await como('dueno', 'POST', '/api/admin/blocklist', { kind: 'team', value: 'Equipo Vetado' })
    expect((await renombra(uno, 'Equipo Vetado')).json()).toEqual({
      ok: false,
      error: 'nombre_bloqueado',
    })
    expect((await renombra('00000000-0000-4000-8000-000000000000', 'Otro')).statusCode).toBe(404)
    expect((await renombra(uno, 'Otro Nombre', null)).statusCode).toBe(401)
  })

  /* 8-i: premium, la lista de bloqueo, el tick y el avance también se apuntan; con el token, 'token'. */
  it('premium, la lista de bloqueo, el tick y el avance escriben su fila; con ADMIN_TOKEN, actor token', async () => {
    const token = { 'x-admin-token': ADMIN_TOKEN }
    await como(
      null,
      'POST',
      '/api/admin/premium',
      { email: 'cuarto.nuevo@example.com', premium: true },
      token,
    )
    await como(null, 'POST', '/api/admin/blocklist', { kind: 'rider', value: 'Nombre Real' }, token)
    const lista = await como(null, 'GET', '/api/admin/blocklist?kind=rider', undefined, token)
    const { items } = lista.json() as { items: { id: string; value: string }[] }
    const vetado = items.find((i) => i.value === 'Nombre Real')!
    await como(null, 'DELETE', `/api/admin/blocklist/${vetado.id}`, undefined, token)
    expect((await como(null, 'POST', '/admin/tick', undefined, token)).statusCode).toBe(200)
    expect((await como(null, 'POST', '/admin/advance?days=3', undefined, token)).statusCode).toBe(
      200,
    )
    const filas = await tdb.client<
      { action: string; target_user_id: string | null; detail: unknown }[]
    >`
      select action, target_user_id, detail from admin_audit where actor = 'token' order by at, id`
    expect(filas).toEqual([
      {
        action: 'user.premium',
        target_user_id: ids.cuarto,
        detail: { field: 'premium', from: false, to: true },
      },
      {
        action: 'blocklist.add',
        target_user_id: null,
        detail: { field: 'rider', from: null, to: 'Nombre Real' },
      },
      {
        action: 'blocklist.remove',
        target_user_id: null,
        detail: { field: 'rider', from: 'Nombre Real', to: null },
      },
      { action: 'world.tick', target_user_id: null, detail: { field: 'days', from: null, to: 1 } },
      {
        action: 'world.advance',
        target_user_id: null,
        detail: { field: 'days', from: null, to: 3 },
      },
    ])
  })

  /* `GET /api/admin/audit` (8-f): las más nuevas primero, hasta 500, la página anterior con `before`. */
  it('GET /api/admin/audit pagina con before y corta en 500', async () => {
    const todo = await como('dueno', 'GET', '/api/admin/audit')
    expect(todo.statusCode).toBe(200)
    const { entries } = todo.json() as {
      entries: {
        id: string
        at: string
        action: string
        actor: string
        actorEmail: string | null
      }[]
    }
    expect(entries[0]!.action).toBe('world.advance')
    expect(entries[0]!.actorEmail).toBeNull()
    expect(entries.find((e) => e.actor === ids.dueno)?.actorEmail).toBe(ROOT)
    const dos = await como('dueno', 'GET', '/api/admin/audit?limit=2')
    const primeras = (dos.json() as { entries: { id: string; at: string }[] }).entries
    expect(primeras.map((e) => e.id)).toEqual(entries.slice(0, 2).map((e) => e.id))
    const despues = await como(
      'dueno',
      'GET',
      `/api/admin/audit?before=${encodeURIComponent(primeras[1]!.at)}`,
    )
    const resto = (despues.json() as { entries: { at: string }[] }).entries
    expect(resto.length).toBeGreaterThan(0)
    for (const e of resto) expect(e.at < primeras[1]!.at).toBe(true)
    expect((await como('dueno', 'GET', '/api/admin/audit?limit=501')).statusCode).toBe(400)
    expect((await como('dueno', 'GET', '/api/admin/audit?limit=500')).statusCode).toBe(200)
    expect((await como(null, 'GET', '/api/admin/audit')).statusCode).toBe(401)
  })

  it('borrar una cuenta desde el panel la quita del todo, con su fila user.delete y sin sus correos', async () => {
    const res = await como('dueno', 'DELETE', `/api/admin/users/${ids.tercero}`)
    expect(res.statusCode).toBe(200)
    expect(await auditDe(ids.tercero!, 'user.delete')).toHaveLength(1)
    // El registro dice que hubo un cambio de correo, no a qué dirección (§10.4).
    expect((await auditDe(ids.tercero!, 'user.email')).map((f) => f.detail)).toEqual([
      { field: 'email', from: null, to: null },
    ])
    expect((await como('dueno', 'DELETE', `/api/admin/users/${ids.jugador}`)).statusCode).toBe(200)
    const quedan = await tdb.client`select id from users where id = ${ids.jugador!}`
    expect(quedan).toHaveLength(0)
    // Y con ella su sesión: la cookie que tenía ya no abre nada.
    expect((await como('jugador', 'GET', '/api/admin/whoami')).statusCode).toBe(401)
  })

  it('borrar una cuenta que no existe es un 404', async () => {
    const res = await como('dueno', 'DELETE', `/api/admin/users/${ids.jugador}`)
    expect(res.statusCode).toBe(404)
  })
})
