import { startTestDb, type TestDb } from '@cyclingstar/db/test'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { createAuth } from './auth.js'
import type { MailMessage } from './mailer.js'
import { createMailQueue } from './mailQueue.js'

/**
 * EL REGISTRO POR APROBACIÓN, DE PUNTA A PUNTA (docs/cuenta.md §4.9; PR 5). Quien se registra queda
 * `pending` y no recibe nada hasta que un administrador lo aprueba; ninguna de las puertas que mandan
 * correo (el registro, el reenvío al entrar, `send-verification-email`, la recuperación) manda nada a
 * una cuenta pendiente, y todas responden igual que si lo hubieran mandado. Las cuentas que existían al
 * migrar quedan `approved` (lo fija `migrations.test.ts`, en `packages/db`, con el journal cortado).
 */
const ROOT = 'dueno@example.com'
const BASE = 'http://localhost:3000'
const PASSWORD = 'contrasena-larga'

describe('registro por aprobación, contra una base real', () => {
  let tdb: TestDb
  let app: ReturnType<typeof buildApp>
  const sent: MailMessage[] = []
  const cola = createMailQueue()
  let rootCookie = ''
  const poolBefore = process.env.DB_POOL_MAX

  const authPost = (path: string, body: unknown, cookie?: string) =>
    app.inject({
      method: 'POST',
      url: `/api/auth${path}`,
      headers: {
        'content-type': 'application/json',
        origin: BASE,
        ...(cookie ? { cookie } : {}),
      },
      payload: JSON.stringify(body),
    })

  const adminPost = (path: string) =>
    app.inject({ method: 'POST', url: path, headers: { cookie: rootCookie } })

  /** Lo que salió desde la última vez, ya con la cola vacía. */
  async function salidos(): Promise<MailMessage[]> {
    await cola.drain()
    return sent.splice(0)
  }

  const idDe = async (email: string): Promise<string> => {
    const [fila] = await tdb.client<{ id: string }[]>`select id from users where email = ${email}`
    return fila!.id
  }
  const estadoDe = async (email: string) => {
    const [fila] = await tdb.client<{ status: string; approved_at: Date | null }[]>`
      select status, approved_at from users where email = ${email}`
    return fila
  }

  beforeAll(async () => {
    // PGlite admite UNA sesión (testDb.ts), y el proxy pregunta el estado mientras el correo de
    // better-auth, en segundo plano, pregunta el suyo.
    process.env.DB_POOL_MAX = '1'
    tdb = await startTestDb()
    const auth = createAuth(tdb.db, {
      secret: 's'.repeat(32),
      baseURL: BASE,
      mailQueue: cola,
      adminEmail: ROOT,
      mailer: {
        async send(message) {
          sent.push(message)
          return true
        },
      },
    })
    app = buildApp({ db: tdb.db, auth, serveWeb: false, adminEmail: ROOT })
    // El dueño se registra, entra aprobado y su enlace sale al momento; lo abre (aquí, a mano).
    await authPost('/sign-up/email', { name: '', email: ROOT, password: PASSWORD })
    const correos = await salidos()
    expect(correos.map((m) => m.to)).toEqual([ROOT])
    await tdb.client`update users set email_verified = true where email = ${ROOT}`
    const login = await authPost('/sign-in/email', { email: ROOT, password: PASSWORD })
    const setCookie = login.headers['set-cookie']
    const lista = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    rootCookie = lista.map((c) => c.split(';')[0]).join('; ')
  }, 120_000)

  beforeEach(async () => {
    await salidos()
  })

  afterAll(async () => {
    await app?.close()
    await tdb?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('ADMIN_EMAIL entra aprobado', async () => {
    const fila = await estadoDe(ROOT)
    expect(fila?.status).toBe('approved')
    expect(fila?.approved_at).not.toBeNull()
  })

  it('el registro deja la cuenta pending y no manda ningún correo', async () => {
    const res = await authPost('/sign-up/email', {
      name: '',
      email: 'nueva@example.com',
      password: PASSWORD,
    })
    expect(res.statusCode).toBe(200)
    expect(await estadoDe('nueva@example.com')).toEqual({ status: 'pending', approved_at: null })
    expect(await salidos()).toEqual([])
  })

  it('nadie escribe el estado por sign-up/email', async () => {
    await authPost('/sign-up/email', {
      name: '',
      email: 'lista@example.com',
      password: PASSWORD,
      status: 'approved',
    })
    expect((await estadoDe('lista@example.com'))?.status ?? 'pending').toBe('pending')
  })

  it('entrar con la contraseña buena estando pendiente: 403 ACCOUNT_PENDING y nada sale', async () => {
    await authPost('/sign-up/email', { name: '', email: 'espera@example.com', password: PASSWORD })
    await salidos()
    const res = await authPost('/sign-in/email', {
      email: 'espera@example.com',
      password: PASSWORD,
    })
    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({ code: 'ACCOUNT_PENDING' })
    expect(await salidos()).toEqual([])
    // Con la contraseña mala no delata nada: el mismo 401 que cualquiera.
    const mala = await authPost('/sign-in/email', {
      email: 'espera@example.com',
      password: 'otra-mala',
    })
    expect(mala.statusCode).toBe(401)
  })

  it('send-verification-email y request-password-reset no mandan nada a una pendiente, con la respuesta idéntica', async () => {
    await authPost('/sign-up/email', { name: '', email: 'cola@example.com', password: PASSWORD })
    await salidos()
    const reenvio = await authPost('/send-verification-email', { email: 'cola@example.com' })
    const reenvioNadie = await authPost('/send-verification-email', { email: 'nadie@example.com' })
    expect(reenvio.statusCode).toBe(reenvioNadie.statusCode)
    expect(reenvio.body).toBe(reenvioNadie.body)
    const reset = await authPost('/request-password-reset', {
      email: 'cola@example.com',
      redirectTo: '/reset-password',
    })
    const resetNadie = await authPost('/request-password-reset', {
      email: 'nadie@example.com',
      redirectTo: '/reset-password',
    })
    expect(reset.statusCode).toBe(200)
    expect(reset.body).toBe(resetNadie.body)
    expect(await salidos()).toEqual([])
  })

  it('aprobar manda un verify_signup y escribe user.status en admin_audit', async () => {
    await authPost('/sign-up/email', {
      name: '',
      email: 'aprobada@example.com',
      password: PASSWORD,
    })
    await salidos()
    const id = await idDe('aprobada@example.com')
    const res = await adminPost(`/api/admin/users/${id}/approve`)
    expect(res.statusCode).toBe(200)
    const fila = await estadoDe('aprobada@example.com')
    expect(fila?.status).toBe('approved')
    expect(fila?.approved_at).not.toBeNull()
    const correos = await salidos()
    expect(correos).toHaveLength(1)
    expect(correos[0]!.to).toBe('aprobada@example.com')
    expect(correos[0]!.text).toContain('/verify-email')
    const audit = await tdb.client<{ actor: string; action: string; detail: unknown }[]>`
      select actor, action, detail from admin_audit where target_user_id = ${id}`
    expect(audit).toEqual([
      {
        actor: await idDe(ROOT),
        action: 'user.status',
        detail: { field: 'status', from: 'pending', to: 'approved' },
      },
    ])
    // Ya aprobada: la segunda vez es 409, y no sale otro correo.
    const otra = await adminPost(`/api/admin/users/${id}/approve`)
    expect(otra.statusCode).toBe(409)
    expect(otra.json()).toEqual({ ok: false, error: 'no_pendiente' })
    expect(await salidos()).toEqual([])
  })

  it('una aprobada sin confirmar sí recibe el enlace al intentar entrar', async () => {
    const res = await authPost('/sign-in/email', {
      email: 'aprobada@example.com',
      password: PASSWORD,
    })
    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' })
    expect((await salidos()).map((m) => m.to)).toEqual(['aprobada@example.com'])
  })

  it('rechazar borra la cuenta sin correo y deja registrarse otra vez', async () => {
    await authPost('/sign-up/email', { name: '', email: 'rechazo@example.com', password: PASSWORD })
    const id = await idDe('rechazo@example.com')
    const res = await adminPost(`/api/admin/users/${id}/reject`)
    expect(res.statusCode).toBe(200)
    expect(await tdb.client`select id from users where id = ${id}`).toHaveLength(0)
    expect(await tdb.client`select id from accounts where user_id = ${id}`).toHaveLength(0)
    const audit = await tdb.client<{ detail: unknown }[]>`
      select detail from admin_audit where target_user_id = ${id}`
    expect(audit).toEqual([{ detail: { field: 'status', from: 'pending', to: 'rejected' } }])
    expect(await salidos()).toEqual([])
    // La fila desapareció: el mismo correo puede volver a pedir cuenta, y vuelve a esperar.
    await authPost('/sign-up/email', { name: '', email: 'rechazo@example.com', password: PASSWORD })
    expect((await estadoDe('rechazo@example.com'))?.status).toBe('pending')
    // Rechazar una cuenta que ya no está pendiente: 409.
    const aprobada = await adminPost(`/api/admin/users/${await idDe(ROOT)}/reject`)
    expect(aprobada.statusCode).toBe(409)
  })

  it('aprobar y rechazar piden administrador', async () => {
    const id = await idDe('rechazo@example.com')
    const res = await app.inject({ method: 'POST', url: `/api/admin/users/${id}/approve` })
    expect(res.statusCode).toBe(401)
  })

  it('la cola sale de la más vieja a la más nueva', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users?status=pending',
      headers: { cookie: rootCookie },
    })
    const { users } = res.json() as { users: { email: string; status: string }[] }
    expect(users.every((u) => u.status === 'pending')).toBe(true)
    expect(users.map((u) => u.email)).toEqual([
      'nueva@example.com',
      'lista@example.com',
      'espera@example.com',
      'cola@example.com',
      'rechazo@example.com',
    ])
  })

  it.todo('con el presupuesto de verify_signup gastado, aprobar da 503 y no cambia nada (PR 7)')
})
