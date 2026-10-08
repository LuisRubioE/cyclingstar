import {
  type StageRunSpec,
  clearHorizonCaches,
  gameState,
  raceRosters,
  readWatch,
  riderAttrs,
  riderHidden,
  riders,
  runOneStage,
  teams,
  users,
  worlds,
} from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { SEASON_CALENDAR, stageLengthKm } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type SwitchMode,
  apiErrorBodySchema,
  horizonSummarySchema,
  revResponseSchema,
  stageGateErrorSchema,
  watchResponseSchema,
} from '@cyclingstar/shared'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'
import { clearAdaptedTimelineCache } from '../broadcastSource.js'
import { VIEWER_COOKIE, signViewerCookie } from '../viewerCookie.js'

/**
 * LAS RUTAS DE /api/me (docs/retransmision.md §14.2 y §14.7; paso 7a), sobre un mundo de PGlite con la
 * etapa 1 de `race-france` (la crono) y la 2 (en línea) corridas por `runOneStage`, como
 * `routes/broadcast.test.ts`: las cinco rutas con su esquema (`watchResponseSchema`,
 * `revResponseSchema`, `horizonSummarySchema`), el 401 sin sesión, el progreso en `text/plain`, la
 * memoria de lo alcanzado, un `touchLastSeen` que rechaza sin tumbar el proceso y el límite propio del
 * progreso (14-q). Y los casos de B12 que pasan por la petición (§10.14): la puerta con su 403, la
 * cookie que solo restringe, las cookies malas y `SPOILER_MODE`, que vive en `request.horizon()`. Los
 * de los tramos (lo servido no es visto y la cookie que no se re-firma) están en `broadcast.test.ts`.
 */

const RACE_ID = 'race-france'
const RACE_KEY = `${RACE_ID}:s0`
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
const SEED = 'lo-visto'
const FIELD = 12
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const OWN_RIDER = idDe(0)
const PLAYER = idDe(900) // su corredor corre race-france: en guardia por own_rider
const PLAYER_2 = idDe(901) // sin corredor: race-france, de cabecera
const ADMIN = idDe(902)
const MEMORY = idDe(903) // para la memoria de lo alcanzado
const LIMIT_1 = idDe(904)
const LIMIT_2 = idDe(905)
const GONE = idDe(999) // un usuario que no existe: la cookie de una cuenta borrada
const TEAM_IDS = [idDe(100), idDe(101)]
const SECRET = 's'.repeat(32)
const dayOf = (stageDay: number): number => RACE.startDay + stageDay - 1
const TODAY = dayOf(3)
const WATCH = (day: number) => `/api/me/watch/${encodeURIComponent(RACE_KEY)}/${day}`
const REVEAL = (day: number) => `/api/me/reveal/${encodeURIComponent(RACE_KEY)}/${day}`

const specOf = (stageDay: number): StageRunSpec => {
  const stage = RACE.stages.find((s) => s.index === stageDay)!
  return {
    raceKey: RACE_KEY,
    raceId: RACE_ID,
    raceName: RACE.name,
    level: 'WT',
    raceClass: 'WT',
    season: 0,
    stageDay,
    kind: stage.kind,
    profile: stage.profile,
    timeTrial: stage.timeTrial === true,
    isFinal: false,
  }
}

/** Doble de better-auth: la sesión es la del usuario de la cabecera `x-test-user`; sin ella, visitante. */
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

describe('las rutas de /api/me (§14.2)', () => {
  let t: TestDb
  let worldId = ''
  const apps: ReturnType<typeof buildApp>[] = []
  const poolBefore = process.env.DB_POOL_MAX

  const appWith = (
    spoilerMode: SwitchMode,
    extra: Partial<AppDeps> = {},
  ): ReturnType<typeof buildApp> => {
    const app = buildApp({
      db: t.db,
      auth: headerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      adminEmail: 'raiz@example.com',
      switches: { broadcastWatch: 'on', spoilerMode },
      viewerSecret: SECRET,
      ...extra,
    })
    apps.push(app)
    return app
  }

  const call = async (
    app: ReturnType<typeof buildApp>,
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    opts: { user?: string; payload?: unknown; cookie?: string; contentType?: string } = {},
  ) =>
    app.inject({
      method,
      url,
      headers: {
        ...(opts.user ? { 'x-test-user': opts.user } : {}),
        ...(opts.cookie ? { cookie: opts.cookie } : {}),
        ...(opts.contentType ? { 'content-type': opts.contentType } : {}),
      },
      ...(opts.payload === undefined
        ? {}
        : {
            payload:
              typeof opts.payload === 'string'
                ? opts.payload
                : (opts.payload as Record<string, unknown>),
          }),
    })

  const rev = async (userId: string): Promise<number> =>
    (await t.client<{ r: number }[]>`select horizon_rev as r from users where id = ${userId}`)[0]!.r
  const row = async (userId: string) => readWatch(t.db, { userId, worldId, raceKey: RACE_KEY })

  beforeAll(async () => {
    // PGlite admite UNA sesión (testDb.ts), y la ruta de etapa lanza consultas a la vez.
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    clearAdaptedTimelineCache()
    clearHorizonCaches()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: SEED, engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = world!.id
    await t.db.insert(users).values(
      [
        [PLAYER, 'jugador'],
        [PLAYER_2, 'otra'],
        [MEMORY, 'memoria'],
        [LIMIT_1, 'limite1'],
        [LIMIT_2, 'limite2'],
      ].map(([id, name]) => ({
        id: id!,
        email: `${name}@example.com`,
        name: name!,
        emailVerified: true,
      })),
    )
    await t.db.insert(users).values({
      id: ADMIN,
      email: 'admin@example.com',
      name: 'Admin',
      emailVerified: true,
      isAdmin: true,
    })
    await t.db.insert(teams).values(
      TEAM_IDS.map((id, k) => ({
        id,
        worldId: worldId,
        name: `Team ${k}`,
        division: 'WT' as const,
        philosophy: 'general' as const,
        jerseySeed: `j${k}`,
        country: 'ES',
      })),
    )
    await t.db.insert(riders).values(
      Array.from({ length: FIELD }, (_, i) => ({
        id: idDe(i),
        worldId: worldId,
        teamId: TEAM_IDS[i % 2]!,
        userId: idDe(i) === OWN_RIDER ? PLAYER : null,
        name: `Rider ${String(i).padStart(2, '0')}`,
        country: 'ES',
        gender: 'M' as const,
        birthSeason: -25,
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
        ctl: 60,
        atl: 40,
      })),
    )
    await t.db
      .insert(riderAttrs)
      .values(
        Array.from({ length: FIELD }, (_, i) =>
          ATTRIBUTES.map((attr) => ({ riderId: idDe(i), attr, value: 50 + i })),
        ).flat(),
      )
    await t.db.insert(riderHidden).values(
      Array.from({ length: FIELD }, (_, i) => ({
        riderId: idDe(i),
        talent: 1,
        ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])),
        fragility: 0.1,
        peakAge: 28,
        declineAge: 33,
      })),
    )
    await t.db.insert(raceRosters).values(
      Array.from({ length: FIELD }, (_, i) => ({
        raceId: RACE_KEY,
        riderId: idDe(i),
        bib: i + 1,
      })),
    )
    for (const stageDay of [1, 2])
      await t.db.transaction((tx) =>
        runOneStage(tx, worldId, dayOf(stageDay), SEED, specOf(stageDay)),
      )
    await t.db.insert(gameState).values({ worldId, currentDay: TODAY, lastProcessedDay: TODAY })
  }, 180_000)

  afterEach(() => {
    vi.useRealTimers()
  })

  afterAll(async () => {
    for (const app of apps) await app.close()
    await t?.close()
    clearAdaptedTimelineCache()
    clearHorizonCaches()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('las cinco rutas pasan su esquema; escriben y devuelven el rev de después (§14.2)', async () => {
    const app = appWith('on')
    // La crono ya vista: la 2 se puede informar (sin puerta).
    await t.client`insert into race_watch (user_id, world_id, race_key, known_through, how)
                   values (${PLAYER_2}, ${worldId}, ${RACE_KEY}, 1, 'W')`
    const r0 = await rev(PLAYER_2)
    const watch = await call(app, 'POST', WATCH(2), {
      user: PLAYER_2,
      payload: { reachedS: 1234.56, mode: 'play' },
    })
    expect(watch.statusCode, watch.body).toBe(200)
    // El primer progreso sigue la carrera (D-30): sube el rev.
    expect(watchResponseSchema.parse(watch.json())).toEqual({
      status: 'watching',
      rev: `${TODAY}.${r0 + 1}`,
    })
    expect(await row(PLAYER_2)).toEqual({
      follow: 1,
      knownThrough: 1,
      how: 'W',
      watchingStage: 2,
      reachedS: 1234,
    })

    const horizon = await call(app, 'GET', '/api/me/horizon', { user: PLAYER_2 })
    expect(horizon.statusCode).toBe(200)
    const summary = horizonSummarySchema.parse(horizon.json())
    expect(summary.rev).toBe(`${TODAY}.${r0 + 1}`)
    expect(summary.scope).toBe('guarded')
    expect(summary.ready).toContainEqual(
      expect.objectContaining({ raceKey: RACE_KEY, stages: [2], reason: 'follow' }),
    )
    expect(summary.watching).toHaveLength(1)
    const w = summary.watching[0]!
    expect(w).toMatchObject({ raceKey: RACE_KEY, stageDay: 2, reachedS: 1234 })
    // Lo que le queda a la cabeza en lo alcanzado: ni la etapa entera ni la meta.
    expect(w.toGoKm).toBeGreaterThan(0)
    expect(w.toGoKm).toBeLessThan(stageLengthKm(specOf(2).profile))

    const drop = await call(app, 'PUT', `/api/me/follow/${encodeURIComponent(RACE_KEY)}`, {
      user: PLAYER_2,
      payload: { follow: 'drop' },
    })
    expect(revResponseSchema.parse(drop.json()).rev).toBe(`${TODAY}.${r0 + 2}`)
    const dropped = horizonSummarySchema.parse(
      (await call(app, 'GET', '/api/me/horizon', { user: PLAYER_2 })).json(),
    )
    expect(dropped.ready.map((r) => r.raceKey)).not.toContain(RACE_KEY)

    const scope = await call(app, 'PUT', '/api/me/spoiler-scope', {
      user: PLAYER_2,
      payload: { scope: 'own_only', revealConfirm: false },
    })
    expect(revResponseSchema.parse(scope.json()).rev).toBe(`${TODAY}.${r0 + 3}`)
    const [prefs] =
      await t.client`select spoiler_scope, reveal_confirm from users where id = ${PLAYER_2}`
    expect(prefs).toEqual({ spoiler_scope: 'own_only', reveal_confirm: false })
    // 9a: el horizonte lo dice, para que `Show result` no vuelva a preguntar en ningún dispositivo (DD-17)
    expect(summary.revealConfirm).toBe(true)
    const asked = horizonSummarySchema.parse(
      (await call(app, 'GET', '/api/me/horizon', { user: PLAYER_2 })).json(),
    )
    expect(asked).toMatchObject({ scope: 'own_only', revealConfirm: false })

    const reveal = await call(app, 'POST', REVEAL(2), { user: PLAYER_2, payload: {} })
    expect(revResponseSchema.parse(reveal.json()).rev).toBe(`${TODAY}.${r0 + 4}`)
    expect(await row(PLAYER_2)).toMatchObject({ knownThrough: 2, how: 'WR', watchingStage: null })

    // Lo que no vale: 400 con su código, 404 si la carrera o la etapa no existen o no se han corrido.
    for (const [method, url, payload, status] of [
      ['POST', WATCH(2), { reachedS: -1, mode: 'play' }, 400],
      ['POST', WATCH(2), { reachedS: 10, mode: 'rewind' }, 400],
      ['POST', REVEAL(2), { extra: 1 }, 400],
      ['PUT', `/api/me/follow/${encodeURIComponent(RACE_KEY)}`, { follow: 'yes' }, 400],
      ['PUT', '/api/me/spoiler-scope', { scope: 'all' }, 400],
      ['POST', `/api/me/watch/race-nowhere:s0/2`, { reachedS: 10, mode: 'play' }, 404],
      ['POST', `/api/me/reveal/${encodeURIComponent(RACE_KEY)}/9`, {}, 404],
      [
        'POST',
        `/api/me/watch/${encodeURIComponent(RACE_KEY)}/9`,
        { reachedS: 10, mode: 'play' },
        404,
      ],
    ] as const) {
      const res = await call(app, method, url, { user: PLAYER_2, payload })
      expect(res.statusCode, `${method} ${url}`).toBe(status)
      expect(apiErrorBodySchema.parse(res.json()).error).toBe(
        status === 400 ? 'validacion' : 'no_encontrado',
      )
    }
  })

  it('sin sesión, las cinco dan 401; y con el modo apagado, el horizonte da rev world y listas vacías', async () => {
    const app = appWith('off')
    for (const [method, url, payload] of [
      ['POST', WATCH(2), { reachedS: 10, mode: 'play' }],
      ['POST', REVEAL(2), {}],
      ['PUT', `/api/me/follow/${encodeURIComponent(RACE_KEY)}`, { follow: 'follow' }],
      ['PUT', '/api/me/spoiler-scope', { scope: 'off' }],
      ['GET', '/api/me/horizon', undefined],
    ] as const) {
      const res = await call(app, method, url, payload === undefined ? {} : { payload })
      expect(res.statusCode, url).toBe(401)
      expect(apiErrorBodySchema.parse(res.json()).error).toBe('no_autorizado')
    }
    const h = await call(app, 'GET', '/api/me/horizon', { user: PLAYER })
    // Re-sellado en el 9a: con sesión, el horizonte dice además si revelar pregunta antes (DD-17).
    expect(horizonSummarySchema.parse(h.json())).toEqual({
      rev: 'world',
      scope: 'guarded',
      ready: [],
      watching: [],
      expiredSinceLastVisit: [],
      revealConfirm: true,
    })
  })

  it('el progreso en text/plain (el respaldo de sendBeacon, 14-g): el JSON vale; una cadena que no lo es, 400', async () => {
    const app = appWith('off')
    const ok = await call(app, 'POST', WATCH(2), {
      user: ADMIN,
      contentType: 'text/plain;charset=UTF-8',
      payload: JSON.stringify({ reachedS: 300, mode: 'play' }),
    })
    expect(ok.statusCode, ok.body).toBe(200)
    expect(watchResponseSchema.parse(ok.json())).toEqual({ status: 'watching', rev: 'world' })
    const bad = await call(app, 'POST', WATCH(2), {
      user: ADMIN,
      contentType: 'text/plain;charset=UTF-8',
      payload: 'reachedS=300',
    })
    expect(bad.statusCode).toBe(400)
    expect(apiErrorBodySchema.parse(bad.json()).error).toBe('validacion')
  })

  it('B12 · la puerta: con la 1 velada, el progreso de la 2 da 403 previous_unseen y no escribe nada', async () => {
    const app = appWith('on')
    const before = await rev(PLAYER)
    const res = await call(app, 'POST', WATCH(2), {
      user: PLAYER,
      payload: { reachedS: 500, mode: 'play' },
    })
    expect(res.statusCode).toBe(403)
    expect(stageGateErrorSchema.parse(res.json())).toEqual({
      ok: false,
      error: 'previous_unseen',
      gate: { k: 'previous_unseen', firstUnseen: 1 },
    })
    expect(await row(PLAYER)).toBeNull()
    expect(await rev(PLAYER)).toBe(before)
  })

  it('la memoria de lo alcanzado: escribe con 60 s de carrera y 15 de pared, se barre a los 60 s y la meta la vacía', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const t0 = new Date('2026-10-04T10:00:00Z').getTime()
    vi.setSystemTime(t0)
    const app = appWith('off')
    const report = async (reachedS: number, user = MEMORY) =>
      call(app, 'POST', WATCH(2), { user, payload: { reachedS, mode: 'play' } })
    expect((await report(100)).statusCode).toBe(200)
    expect((await row(MEMORY))?.reachedS).toBe(100) // el primer informe de una etapa se escribe
    vi.setSystemTime(t0 + 5_000)
    await report(400)
    expect((await row(MEMORY))?.reachedS).toBe(100) // 5 s de pared: solo en memoria
    // La cabecera ya lo sabe: lo alcanzado es lo último informado aunque no esté escrito.
    const head = await call(app, 'GET', `/api/races/${RACE_ID}/stages/2/broadcast`, {
      user: MEMORY,
    })
    expect(head.json()).toMatchObject({ view: { reachedS: 400, known: false } })
    // Sin informes de MEMORY en 61 s, el informe de otro barre su entrada y escribe lo que faltaba.
    vi.setSystemTime(t0 + 66_000)
    await report(50, ADMIN)
    await expect.poll(async () => (await row(MEMORY))?.reachedS).toBe(400)
    // La meta escribe la letra (14-f) y la memoria de esa carrera se vacía: la cabecera dice conocida.
    const fin = await call(app, 'POST', `/api/races/${RACE_ID}/stages/2/broadcast/finish`, {
      user: MEMORY,
      payload: { mode: 'summary' },
    })
    expect(fin.statusCode, fin.body.slice(0, 200)).toBe(200)
    expect(await row(MEMORY)).toMatchObject({ knownThrough: 2, how: 'AS', watchingStage: null })
    const after = await call(app, 'GET', `/api/races/${RACE_ID}/stages/2/broadcast`, {
      user: MEMORY,
    })
    expect(after.json()).toMatchObject({ view: { reachedS: null, known: true } })
    // Un informe más de la etapa conocida no escribe nada: volver a verla no mueve nada.
    const again = await report(60)
    expect(watchResponseSchema.parse(again.json()).status).toBe('known')
    expect((await row(MEMORY))?.how).toBe('AS')
  })

  it('un touchLastSeen que rechaza se apunta y no tumba el proceso (10-k)', async () => {
    const logs: string[] = []
    const app = appWith('off', {
      logger: { level: 'warn', stream: { write: (s: string) => void logs.push(s) } },
    })
    const unhandled: unknown[] = []
    const onUnhandled = (err: unknown) => void unhandled.push(err)
    process.on('unhandledRejection', onUnhandled)
    clearHorizonCaches() // que touchLastSeen no tenga a nadie en su memo de la hora
    // La escritura de last_seen_at falla en la base (23514): un fallo de ejecución, como el de una base
    // caída a mitad; NOT VALID para no comprobar las filas de antes.
    await t.client`update users set last_seen_at = null where id = ${PLAYER}`
    await t.client`alter table users add constraint sin_ultima_visita check (last_seen_at is null) not valid`
    try {
      const res = await call(app, 'GET', '/api/me/horizon', { user: PLAYER })
      expect(res.statusCode).toBe(200)
      await expect.poll(() => logs.some((l) => l.includes('touchLastSeen'))).toBe(true)
      await new Promise((r) => setTimeout(r, 50))
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
      await t.client`alter table users drop constraint sin_ultima_visita`
    }
  })

  it('el límite propio del progreso (14-q): dos sesiones desde la misma IP informan 320 veces sin un 429; un visitante, el 429 con su retry-after', async () => {
    const app = appWith('off')
    for (let i = 0; i < 320; i++) {
      const res = await call(app, 'POST', WATCH(2), {
        user: i % 2 === 0 ? LIMIT_1 : LIMIT_2,
        payload: { reachedS: 100 + i, mode: 'play' },
      })
      expect(res.statusCode, `informe ${i}`).toBe(200)
    }
    for (let i = 0; i < 300; i++) {
      const res = await call(app, 'POST', WATCH(2), { payload: { reachedS: 10, mode: 'play' } })
      expect(res.statusCode, `visitante ${i}`).toBe(401)
    }
    const res = await call(app, 'POST', WATCH(2), { payload: { reachedS: 10, mode: 'play' } })
    expect(res.statusCode).toBe(429)
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
  }, 120_000)

  it('B12 · la cookie que solo restringe: sin sesión, el horizonte del jugador en lectura; escribir y lo privado, 401', async () => {
    const app = appWith('on')
    const cookie = `${VIEWER_COOKIE}=${signViewerCookie(PLAYER, SECRET, Date.now() / 1000)}`
    const h = await call(app, 'GET', '/api/me/horizon', { cookie })
    expect(h.statusCode).toBe(200)
    // El rev es el del jugador (no 'anon'), y solo rev y scope: las listas, vacías (14-i).
    expect(horizonSummarySchema.parse(h.json())).toEqual({
      rev: `${TODAY}.${await rev(PLAYER)}`,
      scope: 'guarded',
      ready: [],
      watching: [],
      expiredSinceLastVisit: [],
    })
    for (const [method, url, payload] of [
      ['POST', WATCH(2), { reachedS: 10, mode: 'play' }],
      ['POST', REVEAL(1), {}],
      ['GET', '/api/riders/me', undefined],
    ] as const) {
      const res = await call(
        app,
        method,
        url,
        payload === undefined ? { cookie } : { cookie, payload },
      )
      expect(res.statusCode, url).toBe(401)
    }
    expect(await row(PLAYER)).toBeNull()
  })

  it('B12 · cookies malas: manipulada o caducada, como sin nada (401); de una cuenta borrada, el horizonte del visitante', async () => {
    const app = appWith('on')
    const good = signViewerCookie(PLAYER, SECRET, Date.now() / 1000)
    const tampered = good.replace(PLAYER, PLAYER_2)
    const expired = signViewerCookie(PLAYER, SECRET, Date.now() / 1000 - 91 * 86_400)
    for (const value of [tampered, expired, 'v1.basura'])
      expect(
        (await call(app, 'GET', '/api/me/horizon', { cookie: `${VIEWER_COOKIE}=${value}` }))
          .statusCode,
      ).toBe(401)
    const gone = await call(app, 'GET', '/api/me/horizon', {
      cookie: `${VIEWER_COOKIE}=${signViewerCookie(GONE, SECRET, Date.now() / 1000)}`,
    })
    expect(horizonSummarySchema.parse(gone.json())).toMatchObject({ rev: 'anon', ready: [] })
  })

  it('B12 · SPOILER_MODE vive en request.horizon(): la tabla de §10.13, con tres rev distintos', async () => {
    const seen = new Set<string>()
    const probe = (mode: SwitchMode) => {
      const app = appWith(mode)
      app.get(
        '/test/horizonte',
        { config: { spoiler: 'horizon', veil: { by: ['N'] } } },
        async (request) => {
          const h = await request.horizon()
          return { kind: h.kind, rev: h.rev, applies: await request.spoilerApplies() }
        },
      )
      return async (user?: string) => {
        const res = await call(app, 'GET', '/test/horizonte', user ? { user } : {})
        const body = res.json<{ kind: string; rev: string; applies: boolean }>()
        seen.add(body.rev)
        return body
      }
    }
    const viewerRev = (userId: string) => async () => `${TODAY}.${await rev(userId)}`
    const off = probe('off')
    expect(await off(ADMIN)).toEqual({ kind: 'world', rev: 'world', applies: false })
    expect(await off(PLAYER)).toEqual({ kind: 'world', rev: 'world', applies: false })
    expect(await off()).toEqual({ kind: 'anon', rev: 'anon', applies: false })
    const admins = probe('admins')
    expect(await admins(ADMIN)).toEqual({
      kind: 'viewer',
      rev: await viewerRev(ADMIN)(),
      applies: true,
    })
    expect(await admins(PLAYER)).toEqual({ kind: 'world', rev: 'world', applies: false })
    expect(await admins()).toEqual({ kind: 'anon', rev: 'anon', applies: false })
    const on = probe('on')
    expect(await on(PLAYER)).toEqual({
      kind: 'viewer',
      rev: await viewerRev(PLAYER)(),
      applies: true,
    })
    expect(await on(ADMIN)).toMatchObject({ kind: 'viewer', applies: true })
    expect(await on()).toEqual({ kind: 'anon', rev: 'anon', applies: true })
    expect(seen).toEqual(
      new Set(['world', 'anon', `${TODAY}.${await rev(ADMIN)}`, `${TODAY}.${await rev(PLAYER)}`]),
    )
    // Las cabeceras de una ruta con horizonte (§14.9): no se guarda para otra cuenta.
    const res = await appWith('on').inject({
      method: 'GET',
      url: '/api/me/horizon',
      headers: { 'x-test-user': PLAYER },
    })
    expect(res.headers['cache-control']).toBe('private, no-store')
    expect(String(res.headers.vary)).toMatch(/Cookie/)
  })

  it('sign-out y delete-user con éxito borran cs_viewer; el resto de better-auth no la toca (§10.8)', async () => {
    const app = appWith('off')
    for (const path of ['/api/auth/sign-out', '/api/auth/delete-user']) {
      const res = await app.inject({
        method: 'POST',
        url: path,
        headers: { 'content-type': 'application/json' },
        payload: {},
      })
      expect(res.statusCode).toBe(200)
      const set = [res.headers['set-cookie'] ?? []].flat()
      expect(set, path).toContain(`${VIEWER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
    }
    const other = await app.inject({ method: 'GET', url: '/api/auth/get-session' })
    expect([other.headers['set-cookie'] ?? []].flat().join(';')).not.toContain(VIEWER_COOKIE)
  })
})
