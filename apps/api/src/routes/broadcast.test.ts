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
import { SEASON_CALENDAR, STAGE, stageLengthKm } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  BROADCAST,
  type BroadcastChunk,
  type SwitchMode,
  apiErrorBodySchema,
  broadcastChunkSchema,
  broadcastFinishSchema,
  broadcastHeadSchema,
  healthSchema,
  horizonSummarySchema,
  photoBlocksOf,
  stageReplaySchema,
  watchResponseSchema,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'
import { clearAdaptedTimelineCache } from '../broadcastSource.js'
import { VIEWER_COOKIE, signViewerCookie } from '../viewerCookie.js'

/**
 * LAS RUTAS DE LA RETRANSMISIÓN SOBRE UNA ETAPA CORRIDA (docs/retransmision.md §14.2, §14.7 y §17.6).
 * Un mundo de PGlite con la etapa 1 de `race-france` (la crono) y la 2 (en línea) corridas por
 * `runOneStage`, como `yesterday.test.ts`: la cabecera, el tramo, la meta y el acta pasan su esquema
 * con `schema.parse` y cada error, `apiErrorBodySchema`; `BROADCAST_WATCH` decide quién alcanza la
 * retransmisión (404 `broadcast_off`), la crono sin línea da 404 `broadcast_unavailable`, y el tramo
 * lleva su propio límite de peticiones (14-q): dos sesiones desde la misma IP piden 320 tramos en un
 * minuto sin un 429, y un visitante que pasa de 300 recibe el 429 con su `retry-after`. El 7a añade lo
 * visto: la meta escribe la letra (14-f) y la cabecera dice lo alcanzado (`view`); la cookie que solo
 * restringe no se re-firma dentro del día (10-g); y B12, lo servido no es visto. El tope de lo alcanzado
 * (B18, 409 `beyond_reached`) llega en el 7b, que re-sella ese caso de B12 (§17.10).
 */

const RACE_ID = 'race-france'
const RACE_KEY = `${RACE_ID}:s0`
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
const SEED = 'retransmision'
const FIELD = 12
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const OWN_RIDER = idDe(0)
const PLAYER = idDe(900)
const PLAYER_2 = idDe(901)
const ADMIN = idDe(902)
const TEAM_IDS = [idDe(100), idDe(101)]
const dayOf = (stageDay: number): number => RACE.startDay + stageDay - 1

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

const STAGE_URL = `/api/races/${RACE_ID}/stages`

describe('las rutas de la retransmisión (§14.2)', () => {
  let t: TestDb
  const apps: ReturnType<typeof buildApp>[] = []
  const poolBefore = process.env.DB_POOL_MAX

  const appWith = (
    broadcastWatch?: SwitchMode,
    extra: Partial<AppDeps> = {},
    spoilerMode: SwitchMode = 'off',
  ): ReturnType<typeof buildApp> => {
    const app = buildApp({
      db: t.db,
      auth: headerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      ...(broadcastWatch ? { switches: { broadcastWatch, spoilerMode } } : {}),
      ...extra,
    })
    apps.push(app)
    return app
  }
  let worldId = ''

  beforeAll(async () => {
    // PGlite admite UNA sesión (testDb.ts), y la ruta de etapa lanza consultas a la vez.
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    clearAdaptedTimelineCache()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: SEED, engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = world!.id
    clearHorizonCaches()
    await t.db.insert(users).values([
      { id: PLAYER, email: 'jugador@example.com', name: 'Jugador', emailVerified: true },
      { id: PLAYER_2, email: 'otra@example.com', name: 'Otra', emailVerified: true },
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
        country: i % 3 === 0 ? 'FR' : 'ES',
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
    // La 1 es la crono; la 2, en línea, sale con los maillots que dejó la 1.
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
    clearAdaptedTimelineCache()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  const call = async (
    app: ReturnType<typeof buildApp>,
    method: 'GET' | 'POST',
    url: string,
    user?: string,
    payload?: unknown,
  ) =>
    app.inject({
      method,
      url,
      headers: user ? { 'x-test-user': user } : {},
      ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
    })

  describe('con BROADCAST_WATCH=admins', () => {
    let app: ReturnType<typeof buildApp>
    beforeAll(() => {
      app = appWith('admins')
    })

    it('a quien no es administrador, 404 broadcast_off en las tres rutas; el acta no depende del interruptor', async () => {
      for (const user of [PLAYER, undefined])
        for (const [method, url, body] of [
          ['GET', `${STAGE_URL}/2/broadcast`],
          ['GET', `${STAGE_URL}/2/broadcast/chunk?fromDs=0&toDs=9000`],
          ['POST', `${STAGE_URL}/2/broadcast/finish`, { mode: 'play' }],
        ] as const) {
          const res = await call(app, method, url, user, body)
          expect(res.statusCode, url).toBe(404)
          expect(apiErrorBodySchema.parse(res.json()).error).toBe('broadcast_off')
        }
      const report = await call(app, 'GET', `${STAGE_URL}/2/report`, PLAYER)
      expect(report.statusCode).toBe(200)
    })

    it('la cabecera de una etapa del adaptador: su esquema, el reloj estimado y el reparto provisional', async () => {
      const res = await call(app, 'GET', `${STAGE_URL}/2/broadcast`, ADMIN)
      expect(res.statusCode, res.body.slice(0, 300)).toBe(200)
      const head = broadcastHeadSchema.parse(res.json())
      expect(head).toMatchObject({
        clock: 'estimated',
        source: 'radio',
        gate: null,
        tt: null,
        tplRev: 0,
        view: { reachedS: null, known: false },
      })
      expect(head.stage).toMatchObject({
        raceKey: RACE_KEY,
        raceId: RACE_ID,
        day: 2,
        timeTrial: false,
      })
      // Lo que la web necesita para rehacer la línea con los tramos (3c), sin redondear: km es el de
      // la ficha, redondeado, y blocks sale de la longitud, como en la línea.
      expect(head.stage.dx).toBe(STAGE.dx)
      expect(head.stage.blocks).toBe(Math.round(head.stage.lengthKm / head.stage.dx))
      expect(head.stage.km).toBe(Math.round(head.stage.lengthKm))
      expect(head.stage.lengthKm).toBe(stageLengthKm(specOf(2).profile))
      expect(head.cast).toHaveLength(FIELD)
      // el reparto: dorsal, país y equipo del día; el maillot de líder de tras la etapa 1, con su procedencia
      for (const c of head.cast) {
        expect(c.bib).toBe(Number(c.id.slice(-12)) + 1)
        expect(c.team?.id).toBe(TEAM_IDS[Number(c.id.slice(-12)) % 2])
        expect(c.lines).toEqual([])
      }
      const gc = head.cast.filter((c) => c.worn.kind === 'leader' && c.worn.jersey === 'gc')
      expect(gc).toHaveLength(1)
      expect(gc[0]!.worn).toMatchObject({ from: { raceKey: RACE_KEY, stageDay: 1 } })
      expect(gc[0]!.notoriety).toBe(0)
      expect(head.startState.leaders.gc).toBe(gc[0]!.ix)
      expect(head.estimateS).toBeGreaterThan(0)
      expect(head.profile.altM.length).toBeGreaterThan(1)
    })

    it('una crono sin línea da 404 broadcast_unavailable; una etapa sin correr, no_encontrado', async () => {
      const tt = await call(app, 'GET', `${STAGE_URL}/1/broadcast`, ADMIN)
      expect(tt.statusCode).toBe(404)
      expect(apiErrorBodySchema.parse(tt.json()).error).toBe('broadcast_unavailable')
      const later = await call(app, 'GET', `${STAGE_URL}/3/broadcast`, ADMIN)
      expect(later.statusCode).toBe(404)
      expect(apiErrorBodySchema.parse(later.json()).error).toBe('no_encontrado')
    })

    it('los tramos, uno tras otro, hasta la meta: su esquema, la voz y la caché del navegador', async () => {
      const head = broadcastHeadSchema.parse(
        (await call(app, 'GET', `${STAGE_URL}/2/broadcast`, ADMIN)).json(),
      )
      const chunks: BroadcastChunk[] = []
      for (let from = 0; ; from += BROADCAST.chunkRaceS * 10) {
        const res = await call(
          app,
          'GET',
          `${STAGE_URL}/2/broadcast/chunk?fromDs=${from}&toDs=${from + BROADCAST.chunkRaceS * 10}`,
          ADMIN,
        )
        expect(res.statusCode, res.body.slice(0, 300)).toBe(200)
        expect(res.headers['cache-control']).toBe(`private, max-age=${BROADCAST.chunkCacheMaxAgeS}`)
        const chunk = broadcastChunkSchema.parse(res.json())
        chunks.push(chunk)
        if (chunk.atFinish) break
        expect(chunks.length).toBeLessThan(100)
      }
      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks.flatMap((c) => c.clocks).length).toBeGreaterThan(0)
      expect(chunks.flatMap((c) => c.lines).length).toBeGreaterThan(0)
      // El primero lleva lo que se ve desde la salida (3c): el grupo de salida y su marca del bloque
      // 0, que en la línea del adaptador vale 0 Ds, y ninguno más los repite
      expect(chunks[0]!.groupsBorn[0]).toEqual([0, 'peloton', 'start'])
      expect(chunks[0]!.clocks.slice(0, 3)).toEqual([0, 0, 0])
      expect(chunks.flatMap((c) => c.groupsBorn).filter(([g]) => g === 0)).toHaveLength(1)
      // cada línea de voz, dentro de su tramo
      for (const c of chunks)
        for (const l of c.lines) {
          expect(l.revealS * 10).toBeGreaterThan(c.fromDs - 1e-6)
          expect(l.revealS * 10).toBeLessThanOrEqual(c.toDs + 1e-6)
        }
      // La web rehace la línea con la cabecera (3c): toda marca de reloj cae en el calendario de
      // fotos que saca de lengthKm y dx, en el último bloque o en la muerte de su grupo (la marca de
      // diedB, §3.4), y ningún bloque pasa de blocks.
      const { lengthKm, dx, blocks } = head.stage
      const calendar = new Set([...photoBlocksOf(lengthKm, dx), blocks - 1])
      const deaths = new Set(chunks.flatMap((c) => c.groupsDied.map(([g, b]) => `${g}:${b}`)))
      let marks = 0
      for (const c of chunks)
        for (let i = 0; i < c.clocks.length; i += 3) {
          const [b, g] = [c.clocks[i]!, c.clocks[i + 1]!]
          marks += 1
          expect(calendar.has(b) || deaths.has(`${g}:${b}`), `marca de ${g} en ${b}`).toBe(true)
        }
      expect(marks).toBeGreaterThan(0)
      for (const c of chunks)
        for (let i = 0; i < c.moves.length; i += 3) expect(c.moves[i]!).toBeLessThan(blocks)
    })

    it('un tramo mal pedido es un 400 validacion', async () => {
      for (const q of [
        'fromDs=0&toDs=9001',
        'fromDs=10&toDs=10',
        'fromDs=a&toDs=9000',
        'toDs=9000',
      ]) {
        const res = await call(app, 'GET', `${STAGE_URL}/2/broadcast/chunk?${q}`, ADMIN)
        expect(res.statusCode, q).toBe(400)
        expect(apiErrorBodySchema.parse(res.json()).error).toBe('validacion')
      }
    })

    /**
     * RE-SELLADO en E2, paso 7a: la meta ya no deja de escribir. Con sesión, escribe la letra del modo
     * con `recordProgress` hasta `finishS` (14-f, §10.3): el administrador no había visto nada, así que
     * la crono queda arrastrada (A, 10-a) y la 2, vista en directo (W); y la cabecera lo dice.
     */
    it('la meta: el paquete con su esquema, sin radio en el acta, y la letra de lo visto escrita (7a)', async () => {
      expect(await readWatch(t.db, { userId: ADMIN, worldId, raceKey: RACE_KEY })).toBeNull()
      const res = await call(app, 'POST', `${STAGE_URL}/2/broadcast/finish`, ADMIN, {
        mode: 'play',
      })
      expect(res.statusCode, res.body.slice(0, 300)).toBe(200)
      const finish = broadcastFinishSchema.parse(res.json())
      expect(finish.arrivals[0]?.gapS).toBe(0)
      expect(finish.result.length).toBeGreaterThan(0)
      expect(finish.closing.podium).toHaveLength(3)
      expect(finish.report.radio).toBeUndefined()
      expect(finish.report.tplRev).toBe(0)
      expect(finish.threeKmRule).toEqual([])
      expect(await readWatch(t.db, { userId: ADMIN, worldId, raceKey: RACE_KEY })).toEqual({
        follow: 1,
        knownThrough: 2,
        how: 'AW',
        watchingStage: null,
        reachedS: null,
      })
      const head = broadcastHeadSchema.parse(
        (await call(app, 'GET', `${STAGE_URL}/2/broadcast`, ADMIN)).json(),
      )
      expect(head.view).toEqual({ reachedS: null, known: true })
      const bad = await call(app, 'POST', `${STAGE_URL}/2/broadcast/finish`, ADMIN, { mode: 'x' })
      expect(bad.statusCode).toBe(400)
    })

    it('el acta: el StageReplay entero de una etapa corrida, con tplRev; sin correr, 404', async () => {
      const res = await call(app, 'GET', `${STAGE_URL}/2/report`)
      expect(res.statusCode).toBe(200)
      const report = stageReplaySchema.parse(res.json())
      expect(report).toMatchObject({ run: true, tplRev: 0 })
      expect(report.radio?.kms.length).toBeGreaterThan(0)
      const notRun = await call(app, 'GET', `${STAGE_URL}/3/report`)
      expect(notRun.statusCode).toBe(404)
      expect(apiErrorBodySchema.parse(notRun.json()).error).toBe('no_encontrado')
      const badSeason = await call(app, 'GET', `${STAGE_URL}/2/report?season=x`)
      expect(badSeason.statusCode).toBe(400)
    })

    it('/health publica los interruptores', async () => {
      const res = await call(app, 'GET', '/health')
      expect(healthSchema.parse(res.json()).features).toEqual({
        broadcastWatch: 'admins',
        spoilerMode: 'off',
      })
    })
  })

  it('sin interruptores, la retransmisión está apagada para todos', async () => {
    const app = appWith()
    const res = await call(app, 'GET', `${STAGE_URL}/2/broadcast`, ADMIN)
    expect(res.statusCode).toBe(404)
    expect(apiErrorBodySchema.parse(res.json()).error).toBe('broadcast_off')
  })

  /**
   * LA COOKIE QUE NO SE RE-FIRMA DENTRO DEL DÍA (10-g, §14.9). La firma lleva la hora de emisión:
   * firmarla en cada respuesta cambiaría la cabecera `Cookie` en cada petición, y con `Vary: Cookie` el
   * navegador no reutilizaría ningún tramo guardado. Se firma solo si falta, no vale, es de otro usuario
   * o tiene más de un día.
   */
  describe('cs_viewer en los tramos (10-g)', () => {
    const SECRET = 's'.repeat(32)
    const chunkUrl = `${STAGE_URL}/2/broadcast/chunk?fromDs=0&toDs=600`
    const setCookies = (res: { headers: Record<string, unknown> }): string[] =>
      [res.headers['set-cookie'] ?? []].flat().map(String)

    it('dos tramos seguidos de la misma sesión con una cs_viewer de hace una hora no llevan Set-Cookie', async () => {
      const app = appWith('on', { viewerSecret: SECRET })
      const nowS = Date.now() / 1000
      const cookie = `${VIEWER_COOKIE}=${signViewerCookie(ADMIN, SECRET, nowS - 3600)}`
      for (let i = 0; i < 2; i++) {
        const res = await app.inject({
          method: 'GET',
          url: chunkUrl,
          headers: { 'x-test-user': ADMIN, cookie },
        })
        expect(res.statusCode).toBe(200)
        expect(setCookies(res)).toEqual([])
        expect(res.headers['cache-control']).toBe(`private, max-age=${BROADCAST.chunkCacheMaxAgeS}`)
        const vary = String(res.headers.vary)
          .split(',')
          .map((v) => v.trim())
        expect(vary.filter((v) => v === 'Cookie')).toEqual(['Cookie'])
      }
    })

    it('sin ella, de otro usuario o de hace más de un día, la sesión recibe una nueva; sin sesión, ninguna', async () => {
      const app = appWith('on', { viewerSecret: SECRET })
      const nowS = Date.now() / 1000
      for (const cookie of [
        undefined,
        `${VIEWER_COOKIE}=${signViewerCookie(PLAYER, SECRET, nowS - 60)}`,
        `${VIEWER_COOKIE}=${signViewerCookie(ADMIN, SECRET, nowS - 86_400 - 60)}`,
        `${VIEWER_COOKIE}=basura`,
      ]) {
        const res = await app.inject({
          method: 'GET',
          url: chunkUrl,
          headers: { 'x-test-user': ADMIN, ...(cookie ? { cookie } : {}) },
        })
        const set = setCookies(res)
        expect(set, cookie).toHaveLength(1)
        expect(set[0]!.startsWith(`${VIEWER_COOKIE}=v1.${ADMIN}.`)).toBe(true)
        expect(set[0]).toContain('HttpOnly; SameSite=Lax')
      }
      const anon = await app.inject({ method: 'GET', url: chunkUrl })
      expect(setCookies(anon)).toEqual([])
    })
  })

  /**
   * B12 · LO SERVIDO NO ES VISTO (§10.2, §10.11; O-20). Los tramos hasta el borde de la meta, con lo
   * alcanzado informado hasta `finishS − 1` y sin `POST …/finish`: la etapa sigue sin conocerse y en el
   * velo; solo la meta la hace vista. En el 7b, con el tope de lo alcanzado, se re-sella pidiendo cada
   * tramo dentro de lo informado más `prefetchRaceS` (§17.10).
   */
  it('B12 · lo servido no es visto: los tramos hasta la meta y lo alcanzado hasta finishS − 1 no la hacen vista', async () => {
    const app = appWith('on', {}, 'on')
    const key = { userId: PLAYER, worldId, raceKey: RACE_KEY }
    const watchUrl = `/api/me/watch/${encodeURIComponent(RACE_KEY)}/2`
    // El jugador vio la crono; su corredor corre la carrera: en guardia, con la 2 por ver.
    await t.client`insert into race_watch (user_id, world_id, race_key, known_through, how)
                   values (${PLAYER}, ${worldId}, ${RACE_KEY}, 1, 'W')`
    let finishS = 0
    for (let from = 0; ; from += BROADCAST.chunkRaceS * 10) {
      const res = await call(
        app,
        'GET',
        `${STAGE_URL}/2/broadcast/chunk?fromDs=${from}&toDs=${from + BROADCAST.chunkRaceS * 10}`,
        PLAYER,
      )
      expect(res.statusCode).toBe(200)
      const c = broadcastChunkSchema.parse(res.json())
      if (c.atFinish) {
        finishS = c.toDs / 10
        break
      }
      const watch = await call(app, 'POST', watchUrl, PLAYER, {
        reachedS: c.toDs / 10,
        mode: 'play',
      })
      expect(watchResponseSchema.parse(watch.json()).status).toBe('watching')
    }
    const last = await call(app, 'POST', watchUrl, PLAYER, { reachedS: finishS - 1, mode: 'play' })
    expect(watchResponseSchema.parse(last.json()).status).toBe('watching')
    expect(await readWatch(t.db, key)).toMatchObject({ knownThrough: 1, how: 'W' })
    const h = horizonSummarySchema.parse((await call(app, 'GET', '/api/me/horizon', PLAYER)).json())
    expect(h.ready.find((r) => r.raceKey === RACE_KEY)?.stages).toEqual([2])
    expect(h.watching.find((w) => w.raceKey === RACE_KEY)?.stageDay).toBe(2)
  })

  describe('el límite propio del tramo (14-q)', () => {
    const chunkUrl = `${STAGE_URL}/2/broadcast/chunk?fromDs=0&toDs=600`

    it('dos sesiones desde la misma IP piden 320 tramos en un minuto sin un 429', async () => {
      const app = appWith('on')
      for (let i = 0; i < 320; i++) {
        const res = await call(app, 'GET', chunkUrl, i % 2 === 0 ? PLAYER : PLAYER_2)
        expect(res.statusCode, `petición ${i}`).toBe(200)
      }
    }, 120_000)

    it('un visitante que pasa de 300 recibe el 429 con su retry-after', async () => {
      const app = appWith('on')
      for (let i = 0; i < 300; i++) {
        const res = await call(app, 'GET', chunkUrl)
        expect(res.statusCode, `petición ${i}`).toBe(200)
      }
      const res = await call(app, 'GET', chunkUrl)
      expect(res.statusCode).toBe(429)
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
      expect(apiErrorBodySchema.parse(res.json()).error).toBe('demasiadas_peticiones')
    }, 120_000)
  })
})
