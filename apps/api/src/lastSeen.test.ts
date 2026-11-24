import { clearHorizonCaches } from '@cyclingstar/db'
import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import { createMailQueue } from './mailQueue.js'

/**
 * LA ÚLTIMA VISITA EN TODA VISITA (docs/cuenta.md §10.6 y §14.5; D-40, 14-d; PR 12). El gancho `after` de
 * `get-session` llama a `touchLastSeen` sin esperarla: cualquier página con sesión cuenta, no solo las rutas
 * del espectador, y como mucho una vez por hora. Si la visita anterior tenía más de 7 días, `welcome_back_from`
 * se queda con ella en el mismo `UPDATE`.
 */
const BASE = 'http://localhost:3000'
const SECRET = 'l'.repeat(32)
const EMAIL = 'visita@example.com'
const BUENA = 'contrasena-buena'

describe('last_seen_at en get-session (§10.6)', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  let cookie = ''
  const poolBefore = process.env.DB_POOL_MAX

  const sesion = () =>
    app.inject({ method: 'GET', url: '/api/auth/get-session', headers: { cookie } })

  const fila = async () =>
    (
      await tdb.client<{ last_seen_at: Date | null; welcome_back_from: Date | null }[]>`
        select (extract(epoch from last_seen_at) * 1000)::float8 as last_seen_at,
               (extract(epoch from welcome_back_from) * 1000)::float8 as welcome_back_from
        from users where email = ${EMAIL}`
    ).map((f) => ({
      last_seen_at: f.last_seen_at === null ? null : new Date(Number(f.last_seen_at)),
      welcome_back_from:
        f.welcome_back_from === null ? null : new Date(Number(f.welcome_back_from)),
    }))[0]!

  /** La escritura va sin esperar: se mira hasta que llega, o hasta rendirse. */
  async function hasta<T>(leer: () => Promise<T>, vale: (v: T) => boolean): Promise<T> {
    let v = await leer()
    for (let i = 0; i < 50 && !vale(v); i++) {
      await new Promise((r) => setTimeout(r, 20))
      v = await leer()
    }
    return v
  }

  /** Pone la última visita hace `minutos` minutos. */
  const visitaHace = async (minutos: number) => {
    await tdb.client`
      update users set last_seen_at = now() - make_interval(mins => ${minutos}) where email = ${EMAIL}`
    return (await fila()).last_seen_at!
  }

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
    await auth.api.signUpEmail({
      body: { name: '', email: EMAIL, password: BUENA, birthDate: '1990-01-01' },
    })
    await tdb.client`update users set status = 'approved', email_verified = true where email = ${EMAIL}`
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { origin: BASE, 'content-type': 'application/json' },
      payload: JSON.stringify({ email: EMAIL, password: BUENA }),
    })
    expect(res.statusCode).toBe(200)
    const crudas = res.headers['set-cookie']
    const lista = Array.isArray(crudas) ? crudas : crudas ? [crudas] : []
    cookie = lista.map((c) => c.split(';')[0]).join('; ')
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('entrar y pedir la sesión, sin pasar por ninguna ruta del espectador, apunta la visita', async () => {
    clearHorizonCaches()
    await tdb.client`update users set last_seen_at = null where email = ${EMAIL}`
    expect((await sesion()).statusCode).toBe(200)
    const f = await hasta(fila, (x) => x.last_seen_at !== null)
    expect(f.last_seen_at).not.toBeNull()
    expect(f.welcome_back_from).toBeNull()
  })

  it('sin sesión no escribe nada', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/get-session' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('null')
  })

  it('como mucho una vez por hora: dentro de la hora no vuelve a escribir', async () => {
    clearHorizonCaches()
    const antes = await visitaHace(30)
    await sesion()
    await new Promise((r) => setTimeout(r, 200))
    expect((await fila()).last_seen_at).toEqual(antes)
  })

  it('pasada la hora escribe otra vez; el memo del proceso ahorra hasta la consulta', async () => {
    clearHorizonCaches()
    const antes = await visitaHace(120)
    await sesion()
    const f = await hasta(fila, (x) => x.last_seen_at!.getTime() !== antes.getTime())
    expect(f.last_seen_at!.getTime()).toBeGreaterThan(antes.getTime())
    expect(f.welcome_back_from).toBeNull()
    // Con el memo vivo, aunque la base diga que hace dos horas, este proceso no escribe.
    const otra = await visitaHace(120)
    await sesion()
    await new Promise((r) => setTimeout(r, 200))
    expect((await fila()).last_seen_at).toEqual(otra)
  })

  it('welcome_back_from toma la visita vieja si tenía más de 7 días (14-d)', async () => {
    clearHorizonCaches()
    const vieja = await visitaHace(8 * 24 * 60)
    await sesion()
    const f = await hasta(fila, (x) => x.welcome_back_from !== null)
    expect(f.welcome_back_from).toEqual(vieja)
    expect(f.last_seen_at!.getTime()).toBeGreaterThan(vieja.getTime())
    // Una ausencia de menos de 7 días no la pisa.
    clearHorizonCaches()
    await visitaHace(3 * 24 * 60)
    await sesion()
    await new Promise((r) => setTimeout(r, 200))
    expect((await fila()).welcome_back_from).toEqual(vieja)
  })
})
