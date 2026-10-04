import { gzipSync } from 'node:zlib'
import {
  type StageRunSpec,
  clearHorizonCaches,
  clearStageTimelineCache,
  gameState,
  raceRosters,
  readStageTimeline,
  readWatch,
  riderAttrs,
  riderHidden,
  riders,
  runOneStage,
  stageTimelines,
  teams,
  timelineTickLog,
  tombstoneRow,
  users,
  worldHorizon,
  worlds,
  writeStageTimelineRows,
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
import { clearAdaptedTimelineCache, threeKmRuleRiders } from '../broadcastSource.js'
import { VIEWER_COOKIE, signViewerCookie } from '../viewerCookie.js'

/**
 * LAS RUTAS DE LA RETRANSMISIÓN SOBRE ETAPAS CORRIDAS (docs/retransmision.md §14.2, §14.4, §14.7 y
 * §17.9). Un mundo de PGlite con tres etapas de `race-france` corridas por `runOneStage`, como
 * `yesterday.test.ts`: la 1 (la crono) y la 2 (en línea), con el grabador, como las corre el tick desde
 * el paso 5; y la 3 (en línea) sin él, como las corridas antes del 5 o con `TIMELINE_RECORD=off`, que
 * sirve el adaptador de la radio. La cabecera, el tramo, la meta y el acta pasan su esquema con
 * `schema.parse` y cada error, `apiErrorBodySchema`; `BROADCAST_WATCH` decide quién alcanza la
 * retransmisión (404 `broadcast_off`), y el tramo lleva su propio límite de peticiones (14-q): dos
 * sesiones desde la misma IP piden 320 tramos en un minuto sin un 429, y un visitante que pasa de 300
 * recibe el 429 con su `retry-after`.
 *
 * El 7a añade lo visto: la meta escribe la letra (14-f) y la cabecera dice lo alcanzado (`view`); la
 * cookie que solo restringe no se re-firma dentro del día (10-g); y B12, lo servido no es visto. Tras
 * una meta, esa etapa queda conocida para quien la pidió: la primera meta del administrador es la de la
 * 2, y por eso su caso va antes que los demás que la piden.
 *
 * El 6a pone delante la línea grabada (el reloj exacto, la crono con su preparación pública y la
 * revisión de plantillas de su fila, `tplRev`); una lápida es 404 `broadcast_unavailable` y una etapa sin
 * fila sigue con el adaptador; y B6 de la meta y de la ruta de etapa conocida, con gzip 6 como
 * `@fastify/compress`, y B8 del parse de esa ruta (§16.4). Esta es la prueba de humo de esas dos cifras:
 * la de verdad, sobre las 24 × 2, es `scripts/broadcast-fixtures.mjs --sizes`. El tope de lo alcanzado
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
/** La 1 (la crono) y la 2 se graban; la 3, no: la sirve el adaptador. */
const RECORDED = [1, 2]
const ADAPTED = 3

/**
 * B8 de la ruta de etapa conocida (§16.4, 16-m): la mediana de `JSON.parse` más `stageReplaySchema.safeParse`
 * de su respuesta, en ms. El umbral es el de §16.4 (la de hoy cuesta de 2,8 a 9,3 ms de parse y de 4,1 a
 * 24,9 de Zod, 34,2 como mucho; `datos.md` §10.5, §14.8), escrito una sola vez aquí (16-v).
 */
const B8_KNOWN_STAGE_PARSE_MS = 40

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

/** Las LRU de líneas de la API (la grabada y la del adaptador) se vacían cuando el test cambia una fila. */
const clearLines = (): void => {
  clearStageTimelineCache()
  clearAdaptedTimelineCache()
}

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
    clearLines()
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
    // La 1 es la crono; la 2, en línea, sale con los maillots que dejó la 1. Las dos se graban como
    // las graba el tick (el diario y `flush` en la transacción del día); la 3, sin el diario.
    for (const stageDay of [1, 2, ADAPTED]) {
      const timeline = RECORDED.includes(stageDay) ? timelineTickLog() : undefined
      await t.db.transaction(async (tx) => {
        await runOneStage(tx, worldId, dayOf(stageDay), SEED, {
          ...specOf(stageDay),
          ...(timeline === undefined ? {} : { timeline }),
        })
        await timeline?.flush(tx)
      })
    }
    await t.db
      .insert(gameState)
      .values({ worldId, currentDay: dayOf(4), lastProcessedDay: dayOf(4) })
  }, 180_000)

  afterAll(async () => {
    for (const app of apps) await app.close()
    await t?.close()
    clearLines()
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

  /** Los tramos de una etapa, uno tras otro, hasta el que llega al borde de la meta. */
  const chunksOf = async (
    app: ReturnType<typeof buildApp>,
    day: number,
  ): Promise<BroadcastChunk[]> => {
    const chunks: BroadcastChunk[] = []
    for (let from = 0; ; from += BROADCAST.chunkRaceS * 10) {
      const res = await call(
        app,
        'GET',
        `${STAGE_URL}/${day}/broadcast/chunk?fromDs=${from}&toDs=${from + BROADCAST.chunkRaceS * 10}`,
        ADMIN,
      )
      expect(res.statusCode, res.body.slice(0, 300)).toBe(200)
      expect(res.headers['cache-control']).toBe(`private, max-age=${BROADCAST.chunkCacheMaxAgeS}`)
      const chunk = broadcastChunkSchema.parse(res.json())
      chunks.push(chunk)
      if (chunk.atFinish) break
      expect(chunks.length).toBeLessThan(100)
    }
    return chunks
  }

  it('el mundo: la 1 y la 2 tienen su línea grabada, y la 3 no tiene fila', async () => {
    const rows = await t.db.select().from(stageTimelines)
    expect(rows.map((r) => [r.stageDay, r.format]).sort()).toEqual([
      [1, 1],
      [2, 1],
    ])
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

    describe('la etapa grabada (6a)', () => {
      it('la cabecera: su esquema, el reloj exacto, la línea por la red y el nombre de la etapa que se corrió', async () => {
        const res = await call(app, 'GET', `${STAGE_URL}/2/broadcast`, ADMIN)
        expect(res.statusCode, res.body.slice(0, 300)).toBe(200)
        const head = broadcastHeadSchema.parse(res.json())
        expect(head).toMatchObject({
          clock: 'exact',
          source: 'timeline',
          gate: null,
          tt: null,
          tplRev: 0,
          view: { reachedS: null, known: false },
        })
        const replay = stageReplaySchema.parse((await call(app, 'GET', `${STAGE_URL}/2`)).json())
        expect(head.stage).toMatchObject({
          raceKey: RACE_KEY,
          day: 2,
          name: replay.name,
          kind: replay.kind,
          timeTrial: false,
        })
        expect(head.stage.lengthKm).toBe(stageLengthKm(specOf(2).profile))
        expect(head.stage.blocks).toBe(Math.round(head.stage.lengthKm / head.stage.dx))
        // el reparto congelado de la salida: por RiderIx, con el maillot de líder que dejó la 1
        expect(head.cast).toHaveLength(FIELD)
        const gc = head.cast.filter((c) => c.worn.kind === 'leader' && c.worn.jersey === 'gc')
        expect(gc).toHaveLength(1)
        expect(gc[0]!.worn).toMatchObject({ from: { raceKey: RACE_KEY, stageDay: 1 } })
        expect(head.startState.leaders.gc).toBe(gc[0]!.ix)
        // el recorrido y el tiempo, los grabados (§5.4)
        const tl = await readStageTimeline(t.db, worldHorizon, RACE_KEY, 2)
        expect(head.profile).toEqual(tl!.profile)
        expect(head.weather).toEqual(tl!.weather)
      })

      it('los tramos, uno tras otro, hasta la meta: la marca de salida de verdad en el primero y la voz a su hora', async () => {
        const chunks = await chunksOf(app, 2)
        expect(chunks.length).toBeGreaterThan(1)
        expect(chunks.flatMap((c) => c.lines).length).toBeGreaterThan(0)
        // el grupo de salida y su marca del bloque 0, la de verdad (la del adaptador valía 0 Ds)
        expect(chunks[0]!.groupsBorn[0]).toEqual([0, 'peloton', 'start'])
        expect(chunks[0]!.clocks.slice(0, 2)).toEqual([0, 0])
        expect(chunks[0]!.clocks[2]).toBeGreaterThan(0)
        for (const c of chunks)
          for (const l of c.lines) {
            expect(l.revealS * 10).toBeGreaterThan(c.fromDs - 1e-6)
            expect(l.revealS * 10).toBeLessThanOrEqual(c.toDs + 1e-6)
          }
        // los tramos llevan las marcas de verdad, no solo las de las fotos: las de los cuatro sitios de §3.4
        const head = broadcastHeadSchema.parse(
          (await call(app, 'GET', `${STAGE_URL}/2/broadcast`, ADMIN)).json(),
        )
        const calendar = new Set(photoBlocksOf(head.stage.lengthKm, head.stage.dx))
        const blocks = chunks.flatMap((c) => c.clocks.filter((_, i) => i % 3 === 0))
        expect(blocks.some((b) => !calendar.has(b))).toBe(true)
        for (const b of blocks) expect(b).toBeLessThan(head.stage.blocks)
      })

      /**
       * La primera meta que pide el administrador, que no había visto nada (re-sellado del 7a, aquí sobre
       * la línea grabada): el paquete con las llegadas de la línea, la revisión de plantillas de su fila y
       * la regla de los 3 km de sus caídas; y la letra de lo visto, escrita con `recordProgress` hasta
       * `finishS` (14-f, §10.3): la crono, arrastrada (A, 10-a), y la 2, vista en directo (W). La cabecera
       * lo dice. Desde aquí la 2 es conocida para él: por eso este caso va antes que los demás que la piden.
       */
      it('la meta: las llegadas y las caídas de la línea, y la letra de lo visto escrita (7a)', async () => {
        const key = { userId: ADMIN, worldId, raceKey: RACE_KEY }
        expect(await readWatch(t.db, key)).toBeNull()
        const res = await call(app, 'POST', `${STAGE_URL}/2/broadcast/finish`, ADMIN, {
          mode: 'play',
        })
        expect(res.statusCode, res.body.slice(0, 300)).toBe(200)
        const finish = broadcastFinishSchema.parse(res.json())
        const tl = await readStageTimeline(t.db, worldHorizon, RACE_KEY, 2)
        expect(finish.arrivals.map((a) => a.riders)).toEqual(
          tl!.finish.arrivals.map(([, riders]) => riders),
        )
        expect(finish.arrivals[0]?.gapS).toBe(0)
        expect(finish.result.length).toBeGreaterThan(0)
        expect(finish.closing.podium).toHaveLength(3)
        expect(finish.report.radio).toBeUndefined()
        // la de la fila: el TEMPLATE_REV del tick que la grabó
        expect(finish.report.tplRev).toBe(0)
        // la regla de los 3 km, de las caídas de la línea, con el final al sprint o en alto (6-o)
        expect([threeKmRuleRiders(tl!, false), threeKmRuleRiders(tl!, true)]).toContainEqual(
          finish.threeKmRule,
        )
        expect(await readWatch(t.db, key)).toEqual({
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

      it('la revisión de plantillas sale de su fila: en la cabecera, el acta y la meta (12-c)', async () => {
        await t.client`UPDATE stage_timelines SET tpl_rev = 7 WHERE race_id = ${RACE_KEY} AND stage_day = 2`
        clearLines()
        try {
          const head = broadcastHeadSchema.parse(
            (await call(app, 'GET', `${STAGE_URL}/2/broadcast`, ADMIN)).json(),
          )
          expect(head.tplRev).toBe(7)
          const report = stageReplaySchema.parse(
            (await call(app, 'GET', `${STAGE_URL}/2/report`)).json(),
          )
          expect(report.tplRev).toBe(7)
          const finish = broadcastFinishSchema.parse(
            (
              await call(app, 'POST', `${STAGE_URL}/2/broadcast/finish`, ADMIN, { mode: 'play' })
            ).json(),
          )
          expect(finish.report.tplRev).toBe(7)
        } finally {
          await t.client`UPDATE stage_timelines SET tpl_rev = 0 WHERE race_id = ${RACE_KEY} AND stage_day = 2`
          clearLines()
        }
      })

      it('B6 y B8 de lo que pesa la meta y la ruta de etapa conocida, con gzip 6 (prueba de humo; §16.4)', async () => {
        const finish = await call(app, 'POST', `${STAGE_URL}/2/broadcast/finish`, ADMIN, {
          mode: 'play',
        })
        const known = await call(app, 'GET', `${STAGE_URL}/2`)
        expect(known.statusCode).toBe(200)
        const gz = (body: string): number => gzipSync(Buffer.from(body), { level: 6 }).length
        expect(gz(finish.body)).toBeLessThanOrEqual(BROADCAST.maxFinishGzipBytes)
        expect(gz(known.body)).toBeLessThanOrEqual(BROADCAST.maxKnownStageGzipBytes)
        // B8: JSON.parse y stageReplaySchema.safeParse de la ruta conocida, la mediana de 21 vueltas
        const ms: number[] = []
        for (let i = 0; i < 21; i++) {
          const t0 = performance.now()
          expect(stageReplaySchema.safeParse(JSON.parse(known.body)).success).toBe(true)
          ms.push(performance.now() - t0)
        }
        const median = ms.sort((a, b) => a - b)[10]!
        console.info(
          `[broadcast] B6 de la meta ${gz(finish.body)} B y de la ruta conocida ${gz(known.body)} B ` +
            `(gzip 6; topes ${BROADCAST.maxFinishGzipBytes} y ${BROADCAST.maxKnownStageGzipBytes}); ` +
            `B8 de la ruta conocida, mediana ${median.toFixed(2)} ms (umbral ${B8_KNOWN_STAGE_PARSE_MS})`,
        )
        expect(median).toBeLessThanOrEqual(B8_KNOWN_STAGE_PARSE_MS)
      })

      it('la crono grabada (la 1): su cabecera con la preparación pública y sus tramos con los pasos', async () => {
        const res = await call(app, 'GET', `${STAGE_URL}/1/broadcast`, ADMIN)
        expect(res.statusCode, res.body.slice(0, 300)).toBe(200)
        const head = broadcastHeadSchema.parse(res.json())
        const tl = await readStageTimeline(t.db, worldHorizon, RACE_KEY, 1)
        expect(head.stage.timeTrial).toBe(true)
        expect(head.clock).toBe('exact')
        expect(head.tt).toEqual({
          order: tl!.tt!.order,
          intervalS: tl!.tt!.intervalS,
          checksKm: tl!.tt!.checksKm,
        })
        const chunks = await chunksOf(app, 1)
        expect(chunks.flatMap((c) => c.tt?.starts ?? []).length).toBeGreaterThan(0)
        expect(chunks.flatMap((c) => c.tt?.km ?? []).length).toBeGreaterThan(0)
      })

      it('una crono sin fila (corrida antes del 5) no tiene retransmisión: 404 broadcast_unavailable (3-d)', async () => {
        const rows = await t.db.select().from(stageTimelines)
        const saved = rows.find((r) => r.raceId === RACE_KEY && r.stageDay === 1)!
        await t.client`DELETE FROM stage_timelines WHERE race_id = ${RACE_KEY} AND stage_day = 1`
        clearLines()
        try {
          const res = await call(app, 'GET', `${STAGE_URL}/1/broadcast`, ADMIN)
          expect(res.statusCode).toBe(404)
          expect(apiErrorBodySchema.parse(res.json()).error).toBe('broadcast_unavailable')
        } finally {
          await writeStageTimelineRows(t.db, [saved])
          clearLines()
        }
      })
    })

    it('una lápida no tiene retransmisión: 404 broadcast_unavailable en las tres rutas y el acta de siempre (D-12); sin fila, el adaptador', async () => {
      const tomb = tombstoneRow(
        { raceKey: RACE_KEY, stageDay: ADAPTED, gameDay: dayOf(ADAPTED), tplRev: 0 },
        { reason: 'I1', message: 'una discrepancia' },
      )
      await writeStageTimelineRows(t.db, [tomb])
      clearLines()
      try {
        for (const [method, url, body] of [
          ['GET', `${STAGE_URL}/${ADAPTED}/broadcast`],
          ['GET', `${STAGE_URL}/${ADAPTED}/broadcast/chunk?fromDs=0&toDs=9000`],
          ['POST', `${STAGE_URL}/${ADAPTED}/broadcast/finish`, { mode: 'play' }],
        ] as const) {
          const res = await call(app, method, url, ADMIN, body)
          expect(res.statusCode, url).toBe(404)
          expect(apiErrorBodySchema.parse(res.json()).error).toBe('broadcast_unavailable')
        }
        const report = await call(app, 'GET', `${STAGE_URL}/${ADAPTED}/report`)
        expect(report.statusCode).toBe(200)
        expect(stageReplaySchema.parse(report.json()).tplRev).toBe(0)
      } finally {
        await t.client`DELETE FROM stage_timelines WHERE race_id = ${RACE_KEY} AND stage_day = ${ADAPTED}`
        clearLines()
      }
      const back = await call(app, 'GET', `${STAGE_URL}/${ADAPTED}/broadcast`, ADMIN)
      expect(back.statusCode).toBe(200)
      expect(broadcastHeadSchema.parse(back.json()).clock).toBe('estimated')
    })

    describe('la etapa sin fila: el adaptador de la radio (3a)', () => {
      it('la cabecera: su esquema, el reloj estimado y el reparto provisional', async () => {
        const res = await call(app, 'GET', `${STAGE_URL}/${ADAPTED}/broadcast`, ADMIN)
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
          day: ADAPTED,
          timeTrial: false,
        })
        // Lo que la web necesita para rehacer la línea con los tramos (3c), sin redondear: km es el de
        // la ficha, redondeado, y blocks sale de la longitud, como en la línea.
        expect(head.stage.dx).toBe(STAGE.dx)
        expect(head.stage.blocks).toBe(Math.round(head.stage.lengthKm / head.stage.dx))
        expect(head.stage.km).toBe(Math.round(head.stage.lengthKm))
        expect(head.stage.lengthKm).toBe(stageLengthKm(specOf(ADAPTED).profile))
        expect(head.cast).toHaveLength(FIELD)
        // el reparto: dorsal, país y equipo del día; el maillot de líder de tras la etapa 2, con su procedencia
        for (const c of head.cast) {
          expect(c.bib).toBe(Number(c.id.slice(-12)) + 1)
          expect(c.team?.id).toBe(TEAM_IDS[Number(c.id.slice(-12)) % 2])
          expect(c.lines).toEqual([])
        }
        const gc = head.cast.filter((c) => c.worn.kind === 'leader' && c.worn.jersey === 'gc')
        expect(gc).toHaveLength(1)
        expect(gc[0]!.worn).toMatchObject({ from: { raceKey: RACE_KEY, stageDay: ADAPTED - 1 } })
        expect(gc[0]!.notoriety).toBe(0)
        expect(head.startState.leaders.gc).toBe(gc[0]!.ix)
        expect(head.estimateS).toBeGreaterThan(0)
        expect(head.profile.altM.length).toBeGreaterThan(1)
      })

      it('los tramos, uno tras otro, hasta la meta: su esquema, la voz y las marcas en el calendario de fotos', async () => {
        const head = broadcastHeadSchema.parse(
          (await call(app, 'GET', `${STAGE_URL}/${ADAPTED}/broadcast`, ADMIN)).json(),
        )
        const chunks = await chunksOf(app, ADAPTED)
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
        // La web rehace la línea con la cabecera (3c): en la del adaptador, toda marca de reloj cae en
        // el calendario de fotos que saca de lengthKm y dx, en el último bloque o en la muerte de su
        // grupo (la marca de diedB, §3.4), y ningún bloque pasa de blocks.
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

      it('la meta: el paquete con su esquema, sin radio en el acta, sin caídas que contar, y la letra de la 3 (7a)', async () => {
        const res = await call(app, 'POST', `${STAGE_URL}/${ADAPTED}/broadcast/finish`, ADMIN, {
          mode: 'play',
        })
        expect(res.statusCode, res.body.slice(0, 300)).toBe(200)
        const finish = broadcastFinishSchema.parse(res.json())
        expect(finish.arrivals[0]?.gapS).toBe(0)
        expect(finish.result.length).toBeGreaterThan(0)
        expect(finish.closing.podium).toHaveLength(3)
        expect(finish.report.radio).toBeUndefined()
        expect(finish.report.tplRev).toBe(0)
        // la radio guardada no dice quién se cayó: el adaptador no tiene caídas
        expect(finish.threeKmRule).toEqual([])
        // la 3, vista en directo detrás de la 2, que el administrador ya conocía por su meta
        expect(await readWatch(t.db, { userId: ADMIN, worldId, raceKey: RACE_KEY })).toMatchObject({
          knownThrough: ADAPTED,
          how: 'AWW',
        })
        const bad = await call(app, 'POST', `${STAGE_URL}/${ADAPTED}/broadcast/finish`, ADMIN, {
          mode: 'x',
        })
        expect(bad.statusCode).toBe(400)
      })
    })

    it('una etapa sin correr: no_encontrado', async () => {
      const later = await call(app, 'GET', `${STAGE_URL}/4/broadcast`, ADMIN)
      expect(later.statusCode).toBe(404)
      expect(apiErrorBodySchema.parse(later.json()).error).toBe('no_encontrado')
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

    it('el acta: el StageReplay entero de una etapa corrida, con tplRev; sin correr, 404', async () => {
      const res = await call(app, 'GET', `${STAGE_URL}/2/report`)
      expect(res.statusCode).toBe(200)
      const report = stageReplaySchema.parse(res.json())
      expect(report).toMatchObject({ run: true, tplRev: 0 })
      expect(report.radio?.kms.length).toBeGreaterThan(0)
      const notRun = await call(app, 'GET', `${STAGE_URL}/4/report`)
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
    // en este mundo la 3 también está corrida, y también va en el velo
    expect(h.ready.find((r) => r.raceKey === RACE_KEY)?.stages).toEqual([2, ADAPTED])
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
