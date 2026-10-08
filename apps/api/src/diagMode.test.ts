import {
  type StageRunSpec,
  clearHorizonCaches,
  gameState,
  raceRosters,
  riderAttrs,
  riderHidden,
  riders,
  runOneStage,
  teams,
  users,
  worlds,
} from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type SwitchMode,
  newsResponseSchema,
  raceViewSchema,
  teamNewsResponseSchema,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AppDeps, buildApp } from './app.js'

/**
 * EL MODO DIAGNÓSTICO EN LA FICHA DE CARRERA Y EN EL FEED (docs/retransmision.md §11.15; D-40, decisión
 * 11-h; E2, paso 8a). PGlite, suite rápida.
 *
 * `?diag=1` vale, para un administrador con sesión, en `GET /api/calendar/:raceId`, `GET /api/news` y
 * `GET /api/teams/:id/news`: los sirve con el horizonte del mundo y sin escribir nada (ni una fila de
 * `race_watch` ni `horizon_rev`). Para cualquier otro, el parámetro no existe: la respuesta es la misma,
 * byte a byte y con las mismas cabeceras, que sin él. Las rutas de etapa tienen el suyo desde el 7b
 * (`stageRoute.test.ts`).
 *
 * El mundo: la 1 (la crono) y la 2 de `race-france` corridas y el día en la 3. El jugador tiene su
 * corredor en la carrera (en guardia por `own_rider`); el administrador la tiene en guardia por ser de
 * cabecera. Ninguno ha visto nada: con `SPOILER_MODE` para él, las dos etapas están en su velo.
 */

const RACE_ID = 'race-france'
const KEY = `${RACE_ID}:s0`
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
const SEED = 'modo-diagnostico'
const FIELD = 12
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const OWN_RIDER = idDe(0)
const PLAYER = idDe(900)
const ADMIN = idDe(902)
const TEAM_IDS = [idDe(100), idDe(101)]
const dayOf = (stageDay: number): number => RACE.startDay + stageDay - 1
/** Las tres rutas del 8a con `?diag=1`; el equipo del jugador, que va en la lista de salida. */
const URLS = [`/api/calendar/${RACE_ID}`, '/api/news', `/api/teams/${TEAM_IDS[0]!}/news`]
/** Los dos titulares de cambio de líder: salen solo a quien le aplica el velo (17-x). */
const LEADER_KINDS: ReadonlySet<string> = new Set(['gc_lead_taken', 'jersey_taken'])

const specOf = (stageDay: number): StageRunSpec => {
  const stage = RACE.stages.find((s) => s.index === stageDay)!
  return {
    raceKey: KEY,
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

describe('?diag=1 en la ficha de carrera y en el feed (§11.15, 11-h; 8a)', () => {
  let t: TestDb
  let worldId = ''
  const apps: ReturnType<typeof buildApp>[] = []
  const poolBefore = process.env.DB_POOL_MAX

  const appWith = (spoilerMode: SwitchMode): ReturnType<typeof buildApp> => {
    const app = buildApp({
      db: t.db,
      auth: headerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      switches: { broadcastWatch: 'admins', spoilerMode },
    })
    apps.push(app)
    return app
  }

  beforeAll(async () => {
    // PGlite admite UNA sesión (testDb.ts), y la ficha de carrera lanza consultas a la vez.
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: SEED, engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = world!.id
    clearHorizonCaches()
    await t.db.insert(users).values([
      { id: PLAYER, email: 'jugador@example.com', name: 'Jugador', emailVerified: true },
      { id: ADMIN, email: 'admin@example.com', name: 'Admin', emailVerified: true, isAdmin: true },
    ])
    await t.db.insert(teams).values(
      TEAM_IDS.map((id, k) => ({
        id,
        worldId,
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
        worldId,
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
    await t.db
      .insert(raceRosters)
      .values(
        Array.from({ length: FIELD }, (_, i) => ({ raceId: KEY, riderId: idDe(i), bib: i + 1 })),
      )
    for (const stageDay of [1, 2])
      await t.db.transaction((tx) =>
        runOneStage(tx, worldId, dayOf(stageDay), SEED, specOf(stageDay)),
      )
    await t.db
      .insert(gameState)
      .values({ worldId, currentDay: dayOf(3), lastProcessedDay: dayOf(3) })
  }, 180_000)

  afterAll(async () => {
    for (const app of apps) await app.close()
    await t?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  const get = (app: ReturnType<typeof buildApp>, url: string, user?: string) =>
    app.inject({ method: 'GET', url, headers: user ? { 'x-test-user': user } : {} })
  const bodyOf = async (app: ReturnType<typeof buildApp>, url: string, user?: string) => {
    const res = await get(app, url, user)
    expect(res.statusCode, `${url} → ${res.body.slice(0, 200)}`).toBe(200)
    return res.body
  }
  /** Lo que se puede escribir al pedir: lo visto de todos y la revisión de su horizonte. */
  const written = async () => ({
    watch: await t.client`select * from race_watch order by user_id, race_key`,
    revs: await t.client`select id, horizon_rev from users order by id`,
  })

  it('el administrador, con ?diag=1: la ficha y el feed con el horizonte del mundo, y nada escrito', async () => {
    const app = appWith('admins')
    const today = appWith('off')
    const before = await written()

    // La ficha: sin el parámetro, cortada antes de la 1 (las dos veladas); con él, la de hoy, byte a byte.
    const sheetUrl = URLS[0]!
    const veiled = raceViewSchema.parse(JSON.parse(await bodyOf(app, sheetUrl, ADMIN)))
    expect(veiled.gc).toEqual([])
    expect(veiled.stageWinners).toEqual([])
    expect(veiled.runDays).toEqual([1, 2])
    const sheet = await bodyOf(app, `${sheetUrl}?diag=1`, ADMIN)
    expect(sheet).toBe(await bodyOf(today, sheetUrl, ADMIN))
    expect(raceViewSchema.parse(JSON.parse(sheet)).stageWinners).toHaveLength(2)
    // Un valor que no es `1` es como no mandarlo.
    expect(await bodyOf(app, `${sheetUrl}?diag=2`, ADMIN)).toBe(await bodyOf(app, sheetUrl, ADMIN))

    // El feed y las noticias del equipo: sin el parámetro, solo los marcadores de las dos veladas; con
    // él, lo de hoy y además los titulares de líder, que salen a quien le aplica el velo (17-x).
    for (const url of URLS.slice(1)) {
      const parse = url === '/api/news' ? newsResponseSchema : teamNewsResponseSchema
      const plain = parse.parse(JSON.parse(await bodyOf(app, url, ADMIN))).news
      expect(
        plain.map((n) => [n.kind, n.stageDay]),
        url,
      ).toEqual([
        ['stage_ready', 2],
        ['stage_ready', 1],
      ])
      const diag = parse.parse(JSON.parse(await bodyOf(app, `${url}?diag=1`, ADMIN))).news
      const now = parse.parse(JSON.parse(await bodyOf(today, url, ADMIN))).news
      expect(
        diag.filter((n) => n.kind === 'stage_ready'),
        url,
      ).toEqual([])
      expect(
        diag.some((n) => LEADER_KINDS.has(n.kind)),
        url,
      ).toBe(true)
      expect(
        diag.filter((n) => !LEADER_KINDS.has(n.kind)),
        url,
      ).toEqual(now)
    }

    expect(await written()).toEqual(before)
  })

  it('para quien no es administrador el parámetro no existe: lo mismo, byte a byte, que sin él', async () => {
    const on = appWith('on')
    // No es vacío: con SPOILER_MODE para él, el jugador tiene las dos etapas en su velo.
    const feed = newsResponseSchema.parse(JSON.parse(await bodyOf(on, '/api/news', PLAYER))).news
    expect(feed.map((n) => n.kind)).toEqual(['stage_ready', 'stage_ready'])
    const before = await written()
    for (const app of [appWith('admins'), on])
      for (const user of [PLAYER, undefined])
        for (const url of URLS) {
          const at = `${url} (${user ?? 'visitante'})`
          const plain = await get(app, url, user)
          const withDiag = await get(app, `${url}?diag=1`, user)
          expect(withDiag.statusCode, at).toBe(plain.statusCode)
          expect(withDiag.body, at).toBe(plain.body)
          for (const h of ['cache-control', 'vary', 'set-cookie'])
            expect(withDiag.headers[h], `${at} ${h}`).toEqual(plain.headers[h])
        }
    expect(await written()).toEqual(before)
  })
})
