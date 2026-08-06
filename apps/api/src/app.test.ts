import type { TickSummary } from '@cyclingstar/db'
import { afterAll, describe, expect, it } from 'vitest'
import type { AppDeps } from './app.js'
import { buildApp } from './app.js'

const ADMIN_TOKEN = 'a'.repeat(32)
const UUID = '11111111-2222-4333-8444-555555555555'

/**
 * Doble de better-auth: `getSession` decide si hay sesión y `handler` responde a /api/auth/*.
 * Basta para probar el gating (401 sin sesión) sin levantar la base de datos.
 */
function fakeAuth(session: { user: { id: string } } | null): NonNullable<AppDeps['auth']> {
  return {
    api: { getSession: async () => session },
    handler: async () => new Response('{}', { status: 200 }),
  } as unknown as NonNullable<AppDeps['auth']>
}

/** App con base de datos y sesión falsas: todo lo que se comprueba ocurre antes de tocar la db. */
function buildTestApp(opts: { session?: { user: { id: string } } | null } & Partial<AppDeps> = {}) {
  const { session = null, ...rest } = opts
  return buildApp({
    migrationsApplied: true,
    serveWeb: false,
    tickIntervalMinutes: 360,
    db: {} as never,
    auth: fakeAuth(session),
    adminToken: ADMIN_TOKEN,
    ...rest,
  })
}

// serveWeb: false para probar el comportamiento de la API de forma determinista,
// independientemente de si la web está compilada.
const app = buildApp({ migrationsApplied: true, serveWeb: false, tickIntervalMinutes: 360 })

afterAll(async () => {
  await app.close()
})

describe('api: /health', () => {
  it('reporta versión, fecha de juego (nula) y migraciones aplicadas', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      ok: true,
      engineVersion: 1,
      gameDay: null,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      nextTickAtMs: null,
    })
  })

  it('devuelve un 404 uniforme para rutas desconocidas', async () => {
    const res = await app.inject({ method: 'GET', url: '/no-existe' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ ok: false, error: 'no_encontrado' })
  })

  it('queda fuera del rate limit (lo sondea el healthcheck de Railway)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.headers['x-ratelimit-limit']).toBeUndefined()
  })

  it('sirve las cabeceras de seguridad de helmet', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['strict-transport-security']).toContain('max-age=15552000')
  })
})

describe('api: lista de bloqueo de nombres (admin)', () => {
  // Un db mínimo basta: la comprobación del token ocurre antes de tocar la base.
  const adminApp = buildApp({
    migrationsApplied: true,
    serveWeb: false,
    tickIntervalMinutes: 360,
    db: {} as never,
    adminToken: ADMIN_TOKEN,
  })
  afterAll(async () => {
    await adminApp.close()
  })

  it('rechaza sin token', async () => {
    const res = await adminApp.inject({ method: 'GET', url: '/api/admin/blocklist?kind=team' })
    expect(res.statusCode).toBe(401)
  })

  it('rechaza con token incorrecto', async () => {
    const res = await adminApp.inject({
      method: 'GET',
      url: '/api/admin/blocklist?kind=team',
      headers: { 'x-admin-token': 'incorrecto' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rechaza un kind inválido aun con token correcto', async () => {
    const res = await adminApp.inject({
      method: 'GET',
      url: '/api/admin/blocklist?kind=nope',
      headers: { 'x-admin-token': ADMIN_TOKEN },
    })
    expect(res.statusCode).toBe(400)
  })

  it('rechaza un id que no es uuid con 400, no con 500', async () => {
    const res = await adminApp.inject({
      method: 'DELETE',
      url: '/api/admin/blocklist/no-soy-un-uuid',
      headers: { 'x-admin-token': ADMIN_TOKEN },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ ok: false, error: 'validacion' })
  })
})

describe('api: guarda de ADMIN_TOKEN', () => {
  const summary = { currentDay: 3, daysProcessed: 2 } as unknown as TickSummary
  const adminApp = buildTestApp({
    onAdminTick: async () => summary,
    onAdminAdvance: async () => summary,
  })
  afterAll(async () => {
    await adminApp.close()
  })

  const adminRoutes: { method: 'GET' | 'POST' | 'DELETE'; url: string }[] = [
    { method: 'POST', url: '/admin/tick' },
    { method: 'POST', url: '/admin/advance?days=1' },
    { method: 'GET', url: '/api/admin/blocklist?kind=team' },
    { method: 'POST', url: '/api/admin/blocklist' },
    { method: 'DELETE', url: `/api/admin/blocklist/${UUID}` },
    { method: 'GET', url: '/api/admin/health' },
    { method: 'POST', url: '/api/admin/premium' },
    { method: 'POST', url: '/api/world/advance?days=1' },
  ]

  it.each(adminRoutes)('$method $url responde 401 sin token', async ({ method, url }) => {
    const res = await adminApp.inject({ method, url, payload: {} })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ ok: false, error: 'no_autorizado' })
  })

  it.each(adminRoutes)('$method $url responde 401 con token erróneo', async ({ method, url }) => {
    const res = await adminApp.inject({
      method,
      url,
      payload: {},
      headers: { 'x-admin-token': 'b'.repeat(32) },
    })
    expect(res.statusCode).toBe(401)
  })

  it('un token de longitud distinta no rompe la comparación en tiempo constante', async () => {
    for (const token of ['', 'x', 'a'.repeat(31), 'a'.repeat(33)]) {
      const res = await adminApp.inject({
        method: 'POST',
        url: '/admin/tick',
        headers: { 'x-admin-token': token },
      })
      expect(res.statusCode).toBe(401)
    }
  })

  it('con el token correcto, /admin/tick ejecuta el tick', async () => {
    const res = await adminApp.inject({
      method: 'POST',
      url: '/admin/tick',
      headers: { 'x-admin-token': ADMIN_TOKEN },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, currentDay: 3 })
  })
})

describe('api: /api/world/advance ya no basta con tener sesión', () => {
  const summary = { currentDay: 9, daysProcessed: 4 } as unknown as TickSummary
  // Un usuario con sesión válida (pero sin ADMIN_TOKEN) podía avanzar el mundo 10 días de forma
  // irreversible. Este es el test de regresión de esa vulnerabilidad.
  const sessionApp = buildTestApp({
    session: { user: { id: 'user-1' } },
    onAdminAdvance: async () => summary,
  })
  afterAll(async () => {
    await sessionApp.close()
  })

  it('un usuario con sesión pero sin token recibe 401', async () => {
    const res = await sessionApp.inject({ method: 'POST', url: '/api/world/advance?days=10' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ ok: false, error: 'no_autorizado' })
  })

  it('con ADMIN_TOKEN sigue funcionando para el admin', async () => {
    const res = await sessionApp.inject({
      method: 'POST',
      url: '/api/world/advance?days=10',
      headers: { 'x-admin-token': ADMIN_TOKEN },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true, currentDay: 9, daysProcessed: 4 })
  })
})

describe('api: gating de sesión', () => {
  const anonApp = buildTestApp({ session: null })
  afterAll(async () => {
    await anonApp.close()
  })

  const protectedRoutes: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; url: string }[] = [
    { method: 'GET', url: '/api/riders/me' },
    { method: 'GET', url: '/api/riders/me/upcoming-races' },
    { method: 'GET', url: '/api/riders/me/last-race' },
    { method: 'GET', url: '/api/riders/me/orders' },
    { method: 'PUT', url: '/api/riders/me/orders' },
    { method: 'GET', url: '/api/riders/me/form' },
    { method: 'GET', url: '/api/riders/me/race-prefs' },
    { method: 'PUT', url: '/api/riders/me/race-prefs' },
    { method: 'GET', url: '/api/riders/me/palmares' },
    { method: 'GET', url: '/api/riders/me/summary' },
    { method: 'GET', url: '/api/riders/me/ledger' },
    { method: 'GET', url: '/api/riders/me/offers' },
    { method: 'POST', url: `/api/riders/me/offers/${UUID}/accept` },
    { method: 'POST', url: `/api/riders/me/offers/${UUID}/reject` },
    { method: 'GET', url: '/api/riders/me/race-entries' },
    { method: 'POST', url: '/api/riders/me/race-entries/test-tour' },
    { method: 'DELETE', url: '/api/riders/me/race-entries/test-tour' },
    { method: 'PUT', url: '/api/riders/me/archetype' },
    { method: 'POST', url: '/api/riders' },
    { method: 'GET', url: '/api/me/team-control' },
    { method: 'GET', url: '/api/me/team-training' },
    { method: 'PUT', url: '/api/me/team-training' },
    { method: 'POST', url: '/api/teams/take-over' },
    { method: 'PUT', url: '/api/teams/me' },
    { method: 'GET', url: '/api/teams/me/calendar' },
    { method: 'POST', url: '/api/teams/me/calendar/tour-de-france' },
    { method: 'DELETE', url: '/api/teams/me/calendar/tour-de-france' },
    { method: 'GET', url: '/api/races/test-tour' },
    { method: 'PUT', url: '/api/races/test-tour/orders' },
    { method: 'GET', url: '/api/races/test-tour/results' },
    { method: 'GET', url: '/api/races/test-tour/stages/1' },
    { method: 'GET', url: '/api/my-orders?raceKey=tour-de-france:s0' },
    { method: 'PUT', url: '/api/my-orders' },
  ]

  it.each(protectedRoutes)('$method $url responde 401 sin sesión', async ({ method, url }) => {
    const res = await anonApp.inject({ method, url, payload: {} })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ ok: false, error: 'no_autorizado' })
  })
})

describe('api: validación de parámetros de ruta', () => {
  const sessionApp = buildTestApp({ session: { user: { id: 'user-1' } } })
  afterAll(async () => {
    await sessionApp.close()
  })

  // Antes estos ids llegaban tal cual a Postgres y el `invalid input syntax for type uuid`
  // acababa en un 500. Ahora son 404 (recurso inexistente) o 400 (petición mal formada).
  const notFoundRoutes = [
    '/api/riders/no-soy-un-uuid',
    '/api/riders/no-soy-un-uuid/badges',
    '/api/riders/no-soy-un-uuid/palmares',
    '/api/riders/no-soy-un-uuid/results',
    '/api/teams/no-soy-un-uuid',
    '/api/teams/no-soy-un-uuid/news',
    '/api/calendar/carrera-que-no-existe',
    '/api/calendar/..%2Fetc%2Fpasswd/startlist',
    '/api/races/carrera-que-no-existe/stages/1',
    '/api/races/tour-de-france/stages/no-es-un-numero',
    '/api/races/test-tour/stages/99999',
  ]

  it.each(notFoundRoutes)('GET %s responde 404, no 500', async (url) => {
    const res = await sessionApp.inject({ method: 'GET', url })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ ok: false, error: 'no_encontrado' })
  })

  const badRequestRoutes: { method: 'POST' | 'DELETE'; url: string }[] = [
    { method: 'POST', url: '/api/riders/me/offers/no-soy-un-uuid/accept' },
    { method: 'POST', url: '/api/riders/me/offers/no-soy-un-uuid/reject' },
    { method: 'POST', url: '/api/riders/me/race-entries/NO%20es%20un%20slug' },
    { method: 'DELETE', url: '/api/riders/me/race-entries/NO%20es%20un%20slug' },
    { method: 'POST', url: '/api/teams/me/calendar/NO%20es%20un%20slug' },
    { method: 'DELETE', url: '/api/teams/me/calendar/NO%20es%20un%20slug' },
  ]

  it.each(badRequestRoutes)('$method $url responde 400, no 500', async ({ method, url }) => {
    const res = await sessionApp.inject({ method, url, payload: {} })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ ok: false, error: 'validacion' })
  })

  it('/api/my-orders con una raceKey mal formada responde 404', async () => {
    const res = await sessionApp.inject({ method: 'GET', url: '/api/my-orders?raceKey=basura' })
    expect(res.statusCode).toBe(404)
  })
})

describe('api: formato único de error', () => {
  const sessionApp = buildTestApp({ session: { user: { id: 'user-1' } } })
  afterAll(async () => {
    await sessionApp.close()
  })

  it('un cuerpo inválido responde solo con { ok, error }, sin filtrar el esquema', async () => {
    const res = await sessionApp.inject({
      method: 'PUT',
      url: '/api/riders/me/archetype',
      payload: { archetype: 'no-existe' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ ok: false, error: 'validacion' })
    expect(Object.keys(res.json() as object)).toEqual(['ok', 'error'])
  })
})

describe('api: rate limiting', () => {
  it('las rutas normales llevan el límite global', async () => {
    const rlApp = buildTestApp({ session: null })
    const res = await rlApp.inject({ method: 'GET', url: '/api/riders/me' })
    expect(res.headers['x-ratelimit-limit']).toBe('300')
    await rlApp.close()
  })

  it('corta el exceso con un 429 en el formato de error uniforme', async () => {
    const rlApp = buildTestApp({ session: null })
    let last = await rlApp.inject({ method: 'GET', url: '/api/riders/me' })
    for (let i = 0; i < 400 && last.statusCode !== 429; i++) {
      last = await rlApp.inject({ method: 'GET', url: '/api/riders/me' })
    }
    expect(last.statusCode).toBe(429)
    expect(last.json()).toEqual({ ok: false, error: 'demasiadas_peticiones' })
    await rlApp.close()
  })

  it('el login lleva un límite mucho más estricto (fuerza bruta de contraseñas)', async () => {
    const rlApp = buildTestApp({ session: null })
    const first = await rlApp.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: 'a@b.c', password: 'x' },
    })
    expect(first.headers['x-ratelimit-limit']).toBe('10')

    let last = first
    for (let i = 0; i < 20 && last.statusCode !== 429; i++) {
      last = await rlApp.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'a@b.c', password: `intento-${i}` },
      })
    }
    expect(last.statusCode).toBe(429)
    await rlApp.close()
  })

  it('el resto de /api/auth/* tiene un límite holgado (get-session en cada navegación)', async () => {
    const rlApp = buildTestApp({ session: null })
    const res = await rlApp.inject({ method: 'GET', url: '/api/auth/get-session' })
    expect(res.headers['x-ratelimit-limit']).toBe('60')
    await rlApp.close()
  })
})
