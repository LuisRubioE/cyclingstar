import {
  type StageResultRow,
  type StageRunSpec,
  clearHorizonCaches,
  clearStageTimelineCache,
  gameState,
  getRaceRiderIdentities,
  raceRosters,
  riderAttrs,
  riderHidden,
  riders,
  runOneStage,
  teams,
  timelineTickLog,
  users,
  worldHorizon,
  worlds,
} from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  BROADCAST,
  type ChronicleEntry,
  type ChronicleRider,
  NO_LEADERS,
  type SwitchMode,
  broadcastChunkSchema,
  lastRaceResponseSchema,
  stageReplaySchema,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'
import { clearAdaptedTimelineCache } from '../broadcastSource.js'
import { namesOfTheDay, riderMomentsOf, stageContextOf } from '../stageReplay.js'

/**
 * `GET /api/riders/me/last-race` CON LOS MOMENTOS DEL CORREDOR, Y LA IDENTIDAD DEL DÍA (E2,
 * docs/retransmision.md §12.7 y §12.9, 12-k, D-47; paso 12).
 *
 * `moments` es opcional en `riderRaceReportSchema`: nada fallaría al compilar si nadie lo escribiera y
 * la tarjeta `Your last race` se quedaría sin los momentos del corredor. Aquí, sobre un mundo de PGlite
 * con tres etapas de `race-france` corridas por `runOneStage` como el tick (con su línea grabada):
 *
 * - con la etapa conocida, `report.moments` son las líneas del acta (la ruta de etapa) en que el
 *   corredor es protagonista o destinatario, en el orden del acta; y con la última corrida velada, el
 *   informe es el de la anterior conocida, con sus momentos, y `ready` lleva la velada;
 * - la identidad del día: tras un traspaso, el acta, la voz de `Watch` y los momentos siguen nombrando
 *   el equipo con el que cada uno corrió, no el de hoy, y quien corrió sin equipo sigue sin él.
 */

const RACE_ID = 'race-france'
const RACE_KEY = `${RACE_ID}:s0`
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
const SEED = 'ultima-carrera'
const FIELD = 12
/** Ids fijos, como `yesterday.test.ts`: el desempate del motor mira el id. */
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const ixOf = (id: string): number => Number(id.slice(-12))
const PLAYER = idDe(900)
const TEAM_IDS = [idDe(100), idDe(101)]
/** El equipo con el que corre el corredor i: el de la siembra. */
const dayTeamOf = (i: number): string => `Team ${i % 2}`
/** Día de juego de la etapa N: la 1, la 2 y la 3 de `race-france` van seguidas. */
const dayOf = (stageDay: number): number => RACE.startDay + stageDay - 1
const STAGE_URL = `/api/races/${RACE_ID}/stages`

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

/** Doble de better-auth: el jugador tiene la sesión abierta en todas las peticiones. */
function playerAuth(): NonNullable<AppDeps['auth']> {
  return {
    api: { getSession: async () => ({ user: { id: PLAYER } }) },
    handler: async () => new Response('{}', { status: 200 }),
  } as unknown as NonNullable<AppDeps['auth']>
}

/** Las líneas de un acta en que el corredor es protagonista o destinatario (`mentions`), en su orden. */
const linesOf = (acta: readonly ChronicleEntry[], riderId: string): ChronicleEntry[] =>
  acta.filter(
    (e) =>
      e.protagonists.some((p) => p.id === riderId) ||
      Object.values(e.mentions ?? {}).some((m) => m.id === riderId),
  )

/** Todos los corredores que nombra una lista de líneas, con su equipo. */
const ridersIn = (lines: readonly ChronicleEntry[]): ChronicleRider[] =>
  lines.flatMap((e) => [...e.protagonists, ...Object.values(e.mentions ?? {})])

describe('last-race con los momentos del corredor, y la identidad del día (§12.7, §12.9)', () => {
  let t: TestDb
  const apps: ReturnType<typeof buildApp>[] = []
  const poolBefore = process.env.DB_POOL_MAX
  let worldId = ''
  /** El corredor del jugador: uno que sale en el acta de la 2 y en la de la 3. */
  let own = ''

  const appWith = (spoilerMode: SwitchMode): ReturnType<typeof buildApp> => {
    const app = buildApp({
      db: t.db,
      auth: playerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      switches: { broadcastWatch: 'on', spoilerMode },
    })
    apps.push(app)
    return app
  }

  const get = async (app: ReturnType<typeof buildApp>, url: string): Promise<unknown> => {
    const res = await app.inject({ method: 'GET', url })
    expect(res.statusCode, `${url} → ${res.body.slice(0, 200)}`).toBe(200)
    return res.json()
  }

  const actaOf = async (app: ReturnType<typeof buildApp>, day: number): Promise<ChronicleEntry[]> =>
    stageReplaySchema.parse(await get(app, `${STAGE_URL}/${day}`)).chronicle ?? []

  /** Lo visto por el jugador: `knownThrough` etapas, y el memo del horizonte, al día. */
  const watched = async (knownThrough: number | null): Promise<void> => {
    await t.client`delete from race_watch where user_id = ${PLAYER}`
    if (knownThrough !== null)
      await t.client`insert into race_watch (user_id, world_id, race_key, follow, known_through, how)
                     values (${PLAYER}, ${worldId}, ${RACE_KEY}, 1, ${knownThrough}, ${'W'.repeat(knownThrough)})`
    await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${PLAYER}`
  }

  beforeAll(async () => {
    // PGlite admite UNA sesión y la ruta de etapa lanza consultas a la vez (yesterday.test.ts).
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    clearStageTimelineCache()
    clearAdaptedTimelineCache()
    clearHorizonCaches()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: SEED, engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = world!.id
    await t.db
      .insert(users)
      .values({ id: PLAYER, email: 'jugador@example.com', name: 'Jugador', emailVerified: true })
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
    // Como el tick con la grabación encendida: la 1 es la crono, la 2 y la 3 en línea.
    for (const stageDay of [1, 2, 3]) {
      const timeline = timelineTickLog()
      await t.db.transaction(async (tx) => {
        await runOneStage(tx, worldId, dayOf(stageDay), SEED, { ...specOf(stageDay), timeline })
        await timeline.flush(tx)
      })
    }
    await t.db
      .insert(gameState)
      .values({ worldId, currentDay: dayOf(4), lastProcessedDay: dayOf(4) })
    // El corredor del jugador se elige con las etapas ya corridas, y no cambia ninguna carrera: uno que
    // salga en el acta de la 2 y en la de la 3, para que los momentos de las dos no sean vacíos.
    const app = appWith('off')
    const [acta2, acta3] = [await actaOf(app, 2), await actaOf(app, 3)]
    const in2 = new Set(ridersIn(acta2).map((r) => r.id))
    own = ridersIn(acta3).find((r) => r.id !== null && in2.has(r.id))?.id ?? ''
    expect(own, 'nadie sale en las actas de la 2 y de la 3').not.toBe('')
    await t.client`update riders set user_id = ${PLAYER} where id = ${own}`
  }, 180_000)

  afterAll(async () => {
    for (const app of apps) await app.close()
    await t?.close()
    clearStageTimelineCache()
    clearAdaptedTimelineCache()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  it('con la etapa conocida, moments son las líneas del acta en que el corredor es protagonista o destinatario, en su orden', async () => {
    const app = appWith('off')
    const { report } = lastRaceResponseSchema.parse(await get(app, '/api/riders/me/last-race'))
    expect(report?.stageDay).toBe(3)
    const acta = await actaOf(app, 3)
    const mine = linesOf(acta, own)
    expect(mine.length).toBeGreaterThan(0)
    expect(report?.moments).toEqual(mine)
    // Y para cada corredor de la salida, los suyos: también los que solo son destinatarios (`forId`).
    const ctx = await stageContextOf(t.db, RACE_ID, 3, 0)
    for (let i = 0; i < FIELD; i++) {
      const moments = await riderMomentsOf(t.db, worldHorizon, ctx!, idDe(i))
      expect(JSON.parse(JSON.stringify(moments)), `Rider ${i}`).toEqual(linesOf(acta, idDe(i)))
    }
    // No vacío: en el acta hay líneas cuyo destinatario no es protagonista (`peloton_pull` con su `forId`,
    // entre otras), así que la igualdad de arriba prueba también ese caso.
    const onlyMentioned = acta.filter((e) =>
      Object.values(e.mentions ?? {}).some(
        (m) => m.id !== null && !e.protagonists.some((p) => p.id === m.id),
      ),
    )
    expect(onlyMentioned.length).toBeGreaterThan(0)
  })

  it('con la última corrida velada, el informe es el de la anterior conocida, con sus momentos, y ready lleva la velada', async () => {
    const veiled = appWith('on')
    try {
      await watched(2)
      const body = lastRaceResponseSchema.parse(await get(veiled, '/api/riders/me/last-race'))
      expect(body.report?.stageDay).toBe(2)
      expect(body.ready?.stageDay).toBe(3)
      const mine = linesOf(await actaOf(veiled, 2), own)
      expect(mine.length).toBeGreaterThan(0)
      expect(body.report?.moments).toEqual(mine)
      // Ningún momento sale de la velada: la crónica de la 3 no viaja.
      const veiledActa = stageReplaySchema.parse(await get(veiled, `${STAGE_URL}/3`))
      expect(veiledActa.chronicle).toBeUndefined()
    } finally {
      await watched(null)
    }
  })

  it('tras un traspaso, el acta, la voz de Watch y los momentos nombran el equipo con el que corrió cada uno', async () => {
    const swap = async (): Promise<void> => {
      await t.client`update riders set team_id = (case when team_id = ${TEAM_IDS[0]!}::uuid then ${TEAM_IDS[1]!} else ${TEAM_IDS[0]!} end)::uuid
                     where world_id = ${worldId}`
      clearStageTimelineCache()
    }
    await swap()
    try {
      // Hoy, cada uno está en el otro equipo.
      const today = await getRaceRiderIdentities(t.db, RACE_KEY)
      for (const r of today) expect(r.teamName, r.name).toBe(dayTeamOf(ixOf(r.riderId) + 1))
      const app = appWith('off')
      const acta = await actaOf(app, 3)
      const voice: ChronicleEntry[] = []
      for (let from = 0; ; from += BROADCAST.chunkRaceS * 10) {
        const chunk = broadcastChunkSchema.parse(
          await get(
            app,
            `${STAGE_URL}/3/broadcast/chunk?fromDs=${from}&toDs=${from + BROADCAST.chunkRaceS * 10}`,
          ),
        )
        voice.push(...chunk.lines)
        if (chunk.atFinish) break
      }
      const { report } = lastRaceResponseSchema.parse(await get(app, '/api/riders/me/last-race'))
      for (const [where, lines] of [
        ['el acta', acta],
        ['la voz', voice],
        ['los momentos', report?.moments ?? []],
      ] as const) {
        const named = ridersIn(lines).filter((r) => r.id !== null)
        expect(named.length, where).toBeGreaterThan(0)
        for (const r of named) expect(r.team, `${where}: ${r.name}`).toBe(dayTeamOf(ixOf(r.id!)))
      }
    } finally {
      await swap()
    }
  })

  it('quien corrió sin equipo sigue sin él aunque hoy lo tenga, y quien no tomó la salida sale con el de hoy', async () => {
    const result = (i: number): StageResultRow => ({
      riderId: idDe(i),
      name: `Rider ${String(i).padStart(2, '0')}`,
      country: 'ES',
      teamId: TEAM_IDS[i % 2]!,
      teamName: dayTeamOf(i),
      isBot: true,
      puesto: i + 1,
      tiempoS: 3600 + i,
      bonificacionS: 0,
      puntosVolante: 0,
      puntosMontana: 0,
      dnf: false,
      reason: null,
    })
    // El 5 corrió sin equipo (el mapa del día dice null); el 6 está inscrito y no tomó la salida.
    const names = await namesOfTheDay(
      t.db,
      RACE_KEY,
      new Map([
        [idDe(5), null],
        [idDe(4), TEAM_IDS[0]!],
      ]),
      [result(5), result(4)],
      NO_LEADERS,
    )
    expect(names.riderOf.get(idDe(5))).toMatchObject({ team: null, bib: 6 })
    expect(names.riderOf.get(idDe(4))?.team).toBe('Team 0')
    expect(names.riderOf.get(idDe(6))?.team).toBe(dayTeamOf(6))
  })
})
