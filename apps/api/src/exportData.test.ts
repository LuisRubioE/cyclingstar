import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { EXPORTS_PER_DAY } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import { limitKeys } from './limitKeys.js'
import { createMailQueue } from './mailQueue.js'

/**
 * EXPORTAR LOS DATOS (docs/cuenta.md §10.5; D-39, 10-f, 10-g; PR 12). `POST /api/me/export` con
 * `{ password }`: reserva L3 (`pw:` y `pwu:`) antes de mirar la contraseña; mala, 400 `INVALID_PASSWORD` y el
 * intento cuenta; buena, L3 a cero y una de `exp:` (`EXPORTS_PER_DAY`, 3 al día; la cuarta, 429
 * `EXPORT_LIMIT`). El fichero va como adjunto y sin caché, sin hash, tokens, IP, `isAdmin` ni `deviceEpoch`.
 */
const BASE = 'http://localhost:3000'
const SECRET = 'e'.repeat(32)
const BUENA = 'contrasena-buena'
const IP_FALSA = '198.51.100.77'

let ipSiguiente = 1
const ipNueva = (): string => {
  const n = ipSiguiente++
  return `203.0.${Math.floor(n / 250)}.${(n % 250) + 1}`
}

describe('POST /api/me/export (§10.5)', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  const keys = limitKeys(SECRET)
  const poolBefore = process.env.DB_POOL_MAX

  const exportar = (cookie: string | null, password: unknown) =>
    app.inject({
      method: 'POST',
      url: '/api/me/export',
      headers: {
        origin: BASE,
        'content-type': 'application/json',
        'x-forwarded-for': ipNueva(),
        ...(cookie !== null ? { cookie } : {}),
      },
      payload: JSON.stringify({ password }),
    })

  /** Crea la cuenta, la aprueba y entra; devuelve la cookie, el id y el token de la sesión. */
  async function cuenta(email: string) {
    await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { origin: BASE, 'content-type': 'application/json', 'x-forwarded-for': ipNueva() },
      payload: JSON.stringify({ name: '', email, password: BUENA, birthDate: '1990-01-01' }),
    })
    await tdb.client`update users set status = 'approved', email_verified = true where email = ${email}`
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { origin: BASE, 'content-type': 'application/json', 'x-forwarded-for': ipNueva() },
      payload: JSON.stringify({ email, password: BUENA }),
    })
    expect(res.statusCode).toBe(200)
    const crudas = res.headers['set-cookie']
    const lista = Array.isArray(crudas) ? crudas : crudas ? [crudas] : []
    const cookie = lista.map((c) => c.split(';')[0]).join('; ')
    const [u] = await tdb.client<{ id: string }[]>`select id from users where email = ${email}`
    const [s] = await tdb.client<{ id: string; token: string }[]>`
      select id, token from sessions where user_id = ${u!.id}`
    return { cookie, userId: u!.id, sessionId: s!.id, token: s!.token }
  }

  const contador = async (key: string): Promise<number | null> =>
    (await tdb.client<{ count: number }[]>`select count from auth_limits where key = ${key}`)[0]
      ?.count ?? null

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: SECRET,
      baseURL: BASE,
      mailQueue: createMailQueue(),
      mailer: { send: async () => true },
    })
    app = buildApp({ db: tdb.db, auth, serveWeb: false })
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('sin sesión, 401', async () => {
    expect((await exportar(null, BUENA)).statusCode).toBe(401)
  })

  it('la contraseña mala da 400 INVALID_PASSWORD y cuenta en L3, por sesión y por cuenta', async () => {
    const c = await cuenta('mala@example.com')
    const res = await exportar(c.cookie, 'no-es-esta')
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ code: 'INVALID_PASSWORD' })
    expect(await contador(keys.pw(c.sessionId))).toBe(1)
    expect(await contador(keys.pwu(c.userId))).toBe(1)
    expect(await contador(keys.exp(c.userId))).toBeNull()
    // Vacía, también 400, sin llegar a contar.
    expect((await exportar(c.cookie, '')).statusCode).toBe(400)
    expect(await contador(keys.pw(c.sessionId))).toBe(1)
  })

  it('L3 cierra a los 5 fallos de la sesión: el sexto, 429 PASSWORD_ATTEMPTS_LOCKED', async () => {
    const c = await cuenta('cierre@example.com')
    for (let i = 0; i < 5; i++) expect((await exportar(c.cookie, 'mal')).statusCode).toBe(400)
    const res = await exportar(c.cookie, BUENA)
    expect(res.statusCode).toBe(429)
    expect(res.json()).toMatchObject({ code: 'PASSWORD_ATTEMPTS_LOCKED' })
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('con la buena: el JSON como adjunto, sin caché, L3 a cero y una de exp:', async () => {
    const c = await cuenta('todo@example.com')
    await exportar(c.cookie, 'no-es-esta')
    // Una IP en la sesión, aunque no se guarde (§6.2): si estuviera, tampoco saldría.
    await tdb.client`update sessions set ip_address = ${IP_FALSA} where id = ${c.sessionId}`
    const [w] = await tdb.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('exportar', 1) returning id`
    const [team] = await tdb.client<{ id: string }[]>`
      insert into teams (world_id, owner_user_id, name, division, philosophy, jersey_seed, country, budget)
      values (${w!.id}, ${c.userId}, 'Los Exportados', 'CON', 'cantera', 'j', 'ES', 1000) returning id`
    await tdb.client`
      insert into riders (world_id, user_id, team_id, name, country, gender, birth_season, archetype, face_seed)
      values (${w!.id}, ${c.userId}, ${team!.id}, 'Corredor Exportado', 'ES', 'M', 1, 'escalada', 'cara')`
    await tdb.client`insert into race_watch (user_id, world_id, race_key) values (${c.userId}, ${w!.id}, 'vuelta')`
    await tdb.client`
      insert into email_log (kind, recipient_hash, user_id, status, resend_id)
      values ('verify_signup', 'hash-del-buzon', ${c.userId}, 'delivered', 'resend-123')`

    const res = await exportar(c.cookie, BUENA)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="cycling-star-\d{4}-\d{2}-\d{2}\.json"$/,
    )
    expect(res.headers['cache-control']).toBe('no-store')
    expect(await contador(keys.pw(c.sessionId))).toBeNull()
    expect(await contador(keys.pwu(c.userId))).toBeNull()
    expect(await contador(keys.exp(c.userId))).toBe(1)

    const body = res.body
    const datos = res.json()
    expect(datos.account.email).toBe('todo@example.com')
    for (const fuera of ['passwordHash', 'isAdmin', 'deviceEpoch', 'name', 'image'])
      expect(Object.keys(datos.account)).not.toContain(fuera)
    expect(datos.devices).toHaveLength(1)
    expect(datos.devices[0]).toMatchObject({ current: true })
    expect(datos.notificationDevices).toEqual([])
    expect(datos.racesFollowed).toHaveLength(1)
    expect(datos.rider.rider.name).toBe('Corredor Exportado')
    expect(datos.rider).toMatchObject({ plans: [], log: [], transactions: [], contract: null })
    expect(datos.team.name).toBe('Los Exportados')
    expect(datos.emails).toEqual([
      { kind: 'verify_signup', status: 'delivered', createdAt: expect.any(String) },
    ])
    // Lo que no sale nunca: el token de la sesión, el hash, la IP, las claves y lo de Resend.
    const [hash] = await tdb.client<{ password: string }[]>`
      select password from accounts where user_id = ${c.userId}`
    expect(body).not.toContain(c.token)
    expect(body).not.toContain(hash!.password)
    expect(body).not.toContain(IP_FALSA)
    expect(body).not.toContain('hash-del-buzon')
    expect(body).not.toContain('resend-123')
    expect(body).not.toMatch(/"(token|password|ipAddress|deviceEpoch|isAdmin)"/)
  })

  it(`${EXPORTS_PER_DAY} al día; la cuarta, 429 EXPORT_LIMIT con su espera`, async () => {
    const c = await cuenta('tres@example.com')
    for (let i = 0; i < EXPORTS_PER_DAY; i++)
      expect((await exportar(c.cookie, BUENA)).statusCode).toBe(200)
    const res = await exportar(c.cookie, BUENA)
    expect(res.statusCode).toBe(429)
    expect(res.json()).toMatchObject({ code: 'EXPORT_LIMIT' })
    expect(res.json().retryAfterS).toBeGreaterThan(0)
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
    // La contraseña buena borró L3 también en la cuarta.
    expect(await contador(keys.pw(c.sessionId))).toBeNull()
  })

  it('borrar la cuenta (§10.4): 200, cero filas, y la cs_device pierde la entrada de ese correo', async () => {
    const c = await cuenta('adios@example.com')
    expect(c.cookie).toContain('cs_device=')
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/delete-user',
      headers: {
        origin: BASE,
        'content-type': 'application/json',
        'x-forwarded-for': ipNueva(),
        cookie: c.cookie,
      },
      payload: JSON.stringify({ password: BUENA }),
    })
    expect(res.statusCode).toBe(200)
    const [u] = await tdb.client`select count(*)::int as n from users where id = ${c.userId}`
    expect(u!.n).toBe(0)
    const crudas = res.headers['set-cookie']
    const lista = (Array.isArray(crudas) ? crudas : crudas ? [crudas] : []) as string[]
    // Su entrada era la única: la cookie se borra.
    expect(lista.find((x) => x.startsWith('cs_device='))).toMatch(
      /^cs_device=; Path=\/api\/auth; Max-Age=0/,
    )
  })

  it.todo('notificationDevices lista los aparatos con avisos, sin credential (PR 14; 10-g)')
})
