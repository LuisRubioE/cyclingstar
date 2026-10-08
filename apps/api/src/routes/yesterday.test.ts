import {
  type StageRunSpec,
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
  healthSchema,
  lastRaceResponseSchema,
  newsItemSchema,
  newsResponseSchema,
  riderRaceReportSchema,
  riderRaceResultSchema,
  riderResultsResponseSchema,
  stageReplaySchema,
  teamNewsItemSchema,
  teamNewsResponseSchema,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'

/**
 * LA WEB DE AYER NO SE ROMPE (docs/retransmision.md §14.1 y §14.7, D-50, decisión 14-n; E2, paso 0).
 *
 * La web valida TODA respuesta con el esquema de `@cyclingstar/shared` y cae con `ContractError` si no
 * casa (`apps/web/src/api/request.ts`); la API no valida lo que devuelve. Entre un despliegue y el
 * siguiente, una pestaña abierta sigue validando con los esquemas de la versión anterior, así que cada
 * PR de E2 tiene que mandar algo que esos esquemas acepten. Este fichero lo hace test:
 *
 * - `YESTERDAY` son los esquemas de la web de ayer: los de hoy SIN lo que E2 les añade. Cada PR que
 *   ensancha uno le pone aquí su `.omit` de los campos nuevos (1a, 3a, 7b y 8a; el 12, el de `report`,
 *   que va anidado y por eso tiene su propia entrada).
 * - Una lista literal fija sus claves tal como están en la base de E2 (la v91, `b1be481`): con el
 *   `.omit` puesto no cambian, y cambiar o quitar una clave de hoy se ve en el diff.
 * - Las respuestas de hoy de esas rutas, sobre un mundo de verdad (PGlite, con dos etapas corridas por
 *   `runOneStage`), tienen que pasar por las envolturas de abajo, armadas con `YESTERDAY`: como los
 *   objetos son strip, eso es exactamente lo que valida la web anterior.
 */
/** Los seis campos que el 1a añade a los dos titulares (§14.2): la web de ayer no los conoce. */
const NEWS_DATA = {
  payload: true,
  seed: true,
  tplRev: true,
  raceId: true,
  raceKey: true,
  stageDay: true,
} as const

const YESTERDAY = {
  // `tplRev`, del 3a (12-c): la sirven el acta y el paquete de meta; la ruta de etapa, todavía no. Y
  // `watch`, del 7b (§14.1): lo visto de la etapa, que la ruta de etapa sirve con SPOILER_MODE.
  stageReplay: stageReplaySchema.omit({ tplRev: true, watch: true }),
  newsItem: newsItemSchema.omit(NEWS_DATA),
  teamNewsItem: teamNewsItemSchema.omit(NEWS_DATA),
  // `ready`, del 8a (§12.9): la última corrida, si está velada, con lo único que se sabe de ella.
  lastRaceResponse: lastRaceResponseSchema.omit({ ready: true }),
  riderRaceReport: riderRaceReportSchema,
  // `stagesToWatch`, del 8a (§11.6): las etapas por ver de una carrera, en los resultados del corredor.
  riderRaceResult: riderRaceResultSchema.omit({ stagesToWatch: true }),
  // `features`, del 3a (14-l): los interruptores de E2, que /health publica cuando los recibe.
  health: healthSchema.omit({ features: true }),
}

/** Lo que valida la web de ayer, ruta a ruta (apps/web/src/api: results, news, browse, lastRace, health). */
const yesterdayStage = YESTERDAY.stageReplay
const yesterdayNews = z.object({ news: z.array(YESTERDAY.newsItem) })
const yesterdayTeamNews = z.object({ news: z.array(YESTERDAY.teamNewsItem) })
const yesterdayLastRace = YESTERDAY.lastRaceResponse.extend({
  report: YESTERDAY.riderRaceReport.nullable(),
})
const yesterdayRiderResults = z.object({ results: z.array(YESTERDAY.riderRaceResult) })
const yesterdayHealth = YESTERDAY.health

/** Las claves de los esquemas de ayer en la base de E2 (v91). El diseño las fijaba en `9c21885`, la v89. */
const KEYS: Record<keyof typeof YESTERDAY, readonly string[]> = {
  stageReplay: [
    'day',
    'name',
    'km',
    'run',
    'race',
    'kind',
    'from',
    'to',
    'timeTrial',
    'journalUnavailable',
    'altimetry',
    'results',
    'chronicle',
    'gc',
    'kom',
    'points',
    'teamStage',
    'teamGc',
    'leaders',
    'radio',
  ],
  newsItem: [
    'gameDay',
    'kind',
    'text',
    'personal',
    'riderId',
    'riderName',
    'country',
    'teamId',
    'teamName',
  ],
  teamNewsItem: ['gameDay', 'kind', 'text'],
  lastRaceResponse: ['report'],
  riderRaceReport: [
    'raceName',
    'stageName',
    'raceId',
    'stageDay',
    'from',
    'to',
    'orders',
    'position',
    'fieldSize',
    'timeGapToWinnerS',
    'sprintPoints',
    'komPoints',
    'bonusS',
    'winnerName',
    'personalEvents',
    'story',
  ],
  riderRaceResult: [
    'raceId',
    'raceName',
    'raceClass',
    'season',
    'stageCount',
    'isOneDay',
    'gcPuesto',
    'dnf',
    'finished',
    'stages',
  ],
  health: [
    'ok',
    'engineVersion',
    'gameDay',
    'migrationsApplied',
    'tickIntervalMinutes',
    'nextTickAtMs',
  ],
}

const sorted = (keys: readonly string[]): string[] => [...keys].sort()

describe('la web de ayer: las claves de cada esquema', () => {
  it.each(Object.keys(KEYS) as (keyof typeof YESTERDAY)[])(
    '%s tiene las claves de la base de E2',
    (name) => {
      expect(sorted(Object.keys(YESTERDAY[name].shape))).toEqual(sorted(KEYS[name]))
    },
  )
})

const RACE_ID = 'race-france'
const RACE_KEY = `${RACE_ID}:s0`
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
const SEED = 'web-de-ayer'
const FIELD = 12
/** Ids fijos, como `packages/db/src/abandon.test.ts`: el desempate del motor mira el id. */
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const OWN_RIDER = idDe(0)
const USER_ID = idDe(900)
const TEAM_IDS = [idDe(100), idDe(101)]
/** Día de juego de la etapa N: la 1 y la 2 de `race-france` van seguidas (los descansos son tras la 9 y la 15). */
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

/** Doble de better-auth: el jugador dueño de OWN_RIDER tiene la sesión abierta en todas las peticiones. */
function playerAuth(): NonNullable<AppDeps['auth']> {
  return {
    api: { getSession: async () => ({ user: { id: USER_ID } }) },
    handler: async () => new Response('{}', { status: 200 }),
  } as unknown as NonNullable<AppDeps['auth']>
}

describe('la web de ayer: lo que la API manda hoy pasa por sus esquemas', () => {
  let t: TestDb
  let app: ReturnType<typeof buildApp>
  let worldId = ''
  const poolBefore = process.env.DB_POOL_MAX

  beforeAll(async () => {
    // PGlite admite UNA sesión (`packages/db/src/testDb.ts`) y la ruta de una etapa corrida lanza a la
    // vez las cuatro consultas de los maillots de la víspera (`leadersThroughStage`, routes/races.ts):
    // con el pool de 10 de `createDb`, el socket corta con ECONNRESET y la ruta responde 500.
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: SEED, engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = world!.id
    await t.db.insert(users).values({
      id: USER_ID,
      email: 'jugador@example.com',
      name: 'Jugador',
      emailVerified: true,
    })
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
        userId: idDe(i) === OWN_RIDER ? USER_ID : null,
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
    // Con dorsal: sin él el campo entra al motor en el orden que Postgres decida (stageRun.test.ts).
    await t.db.insert(raceRosters).values(
      Array.from({ length: FIELD }, (_, i) => ({
        raceId: RACE_KEY,
        riderId: idDe(i),
        bib: i + 1,
      })),
    )
    // La 1 es la crono; la 2, en línea, sale con los maillots que dejó la 1.
    for (const stageDay of [1, 2]) {
      await t.db.transaction((tx) =>
        runOneStage(tx, worldId, dayOf(stageDay), SEED, specOf(stageDay)),
      )
    }
    await t.db
      .insert(gameState)
      .values({ worldId, currentDay: dayOf(3), lastProcessedDay: dayOf(3) })
    app = buildApp({
      db: t.db,
      auth: playerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      // Como la arranca index.ts: /health publica `features` (3a), que la web de ayer descarta.
      switches: { broadcastWatch: 'admins', spoilerMode: 'off' },
    })
  }, 180_000)

  afterAll(async () => {
    await app?.close()
    await t?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  const get = async (url: string): Promise<unknown> => {
    const res = await app.inject({ method: 'GET', url })
    expect(res.statusCode, `${url} → ${res.body.slice(0, 200)}`).toBe(200)
    return res.json()
  }

  it('la etapa en línea corrida, con maillots de la víspera, radio y acta', async () => {
    const stage = yesterdayStage.parse(await get(`/api/races/${RACE_ID}/stages/2`))
    expect(stage.run).toBe(true)
    expect(stage.results?.length).toBeGreaterThan(0)
    expect(stage.chronicle?.length).toBeGreaterThan(0)
    expect(stage.radio?.kms.length).toBeGreaterThan(0)
    expect(stage.leaders?.onRoad.gc).not.toBeNull()
  })

  it('la crono corrida', async () => {
    const stage = yesterdayStage.parse(await get(`/api/races/${RACE_ID}/stages/1`))
    expect(stage.run).toBe(true)
    expect(stage.timeTrial).toBe(true)
    expect(stage.results?.length).toBeGreaterThan(0)
  })

  it('la etapa sin correr', async () => {
    const stage = yesterdayStage.parse(await get(`/api/races/${RACE_ID}/stages/3`))
    expect(stage.run).toBe(false)
    expect(stage.results).toBeUndefined()
  })

  /**
   * LA RUTA DE ETAPA CON SPOILER_MODE (§14.1, regla 1; paso 7b): velada, sin los opcionales de
   * resultado y sin `leaders` ENTERO; conocida, entera; las dos con `watch`, que la web de ayer descarta.
   * El jugador tiene su corredor en la carrera: sin nada visto, la 1 y la 2 están en su velo.
   */
  it('la ruta de etapa velada y la conocida, con SPOILER_MODE, pasan por los esquemas de ayer (7b)', async () => {
    const veiledApp = buildApp({
      db: t.db,
      auth: playerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      switches: { broadcastWatch: 'admins', spoilerMode: 'on' },
    })
    const stageOf = async (day: number) => {
      const res = await veiledApp.inject({
        method: 'GET',
        url: `/api/races/${RACE_ID}/stages/${day}`,
      })
      expect(res.statusCode, res.body.slice(0, 200)).toBe(200)
      return {
        parsed: yesterdayStage.parse(res.json()),
        raw: res.json() as Record<string, unknown>,
      }
    }
    try {
      for (const day of [1, 2]) {
        const veiled = await stageOf(day)
        expect(veiled.parsed.run).toBe(true)
        expect(veiled.parsed.results).toBeUndefined()
        expect(veiled.parsed.leaders).toBeUndefined()
        expect(veiled.raw.watch).toMatchObject({ known: false, seen: false })
      }
      await t.client`insert into race_watch (user_id, world_id, race_key, follow, known_through, how)
                     values (${USER_ID}, ${worldId}, ${RACE_KEY}, 1, 2, 'WW')`
      await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${USER_ID}`
      const known = await stageOf(2)
      expect(known.parsed.results?.length).toBeGreaterThan(0)
      expect(known.parsed.leaders?.onRoad.gc).not.toBeNull()
      expect(known.raw.watch).toMatchObject({ known: true, seen: true, gate: null })
    } finally {
      // Con el `rev` nuevo: el horizonte de cada (usuario, rev) se memoriza 60 s en el proceso (10-n).
      await t.client`delete from race_watch where user_id = ${USER_ID}`
      await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${USER_ID}`
      await veiledApp.close()
    }
  })

  it('las noticias del jugador', async () => {
    const { news } = yesterdayNews.parse(await get('/api/news'))
    expect(news.length).toBeGreaterThan(0)
  })

  it('y la web de hoy recibe además los datos de cada titular (E2, paso 1a)', async () => {
    // Todo lo de este mundo lo escribió el 1a: cada titular viaja con su payload, su semilla, la
    // revisión de las plantillas y la carrera y la etapa, además del `text` de siempre (§14.2).
    const { news } = newsResponseSchema.parse(await get('/api/news'))
    expect(news.length).toBeGreaterThan(0)
    for (const n of news) {
      expect(n.payload, n.text).toMatchObject({ kind: n.kind, raceId: RACE_ID, season: 0 })
      expect(n).toMatchObject({ tplRev: 0, raceId: RACE_ID, raceKey: RACE_KEY })
      expect(typeof n.seed).toBe('string')
      expect(n.stageDay).toBe(n.payload && 'stageDay' in n.payload ? n.payload.stageDay : null)
    }
    // Los dos titulares de líder se escriben desde la etapa 2 de una vuelta y desde el 8a salen solo a
    // quien le aplica el velo (17-x): con SPOILER_MODE apagado, a nadie.
    expect(news.filter((n) => n.kind === 'gc_lead_taken' || n.kind === 'jersey_taken')).toEqual([])
    const stage = yesterdayStage.parse(await get(`/api/races/${RACE_ID}/stages/2`))
    const winnerTeam = stage.results?.find((r) => r.puesto === 1)?.teamId
    const equipo = teamNewsResponseSchema.parse(await get(`/api/teams/${winnerTeam!}/news`))
    expect(equipo.news.length).toBeGreaterThan(0)
    for (const n of equipo.news) expect(n.payload?.kind).toBe(n.kind)
  })

  it('las noticias del equipo del ganador', async () => {
    const stage = yesterdayStage.parse(await get(`/api/races/${RACE_ID}/stages/2`))
    const winnerTeam = stage.results?.find((r) => r.puesto === 1)?.teamId
    expect(typeof winnerTeam).toBe('string')
    const { news } = yesterdayTeamNews.parse(await get(`/api/teams/${winnerTeam!}/news`))
    expect(news.length).toBeGreaterThan(0)
  })

  it('el informe de la última carrera', async () => {
    const { report } = yesterdayLastRace.parse(await get('/api/riders/me/last-race'))
    expect(report?.stageDay).toBe(2)
  })

  it('los resultados del corredor', async () => {
    const { results } = yesterdayRiderResults.parse(await get(`/api/riders/${OWN_RIDER}/results`))
    expect(results.map((r) => r.raceId)).toEqual([RACE_ID])
  })

  /**
   * BAJO EL VELO (§11.6, §11.7 y §12.9; paso 8a): con SPOILER_MODE y nada visto, la 1 y la 2 están en
   * el velo del jugador. El feed y las noticias de su equipo llevan un `stage_ready` por etapa velada,
   * `last-race` lleva `ready` y los resultados del corredor, `stagesToWatch`: todo pasa por los esquemas
   * de ayer, que leen el marcador como un titular más y descartan las dos claves nuevas. Con la 1 vista,
   * el informe es el de la 1 y `ready`, la 2; con las dos, la respuesta de siempre.
   */
  it('el feed con stage_ready, last-race con ready y los resultados con stagesToWatch, con SPOILER_MODE (8a)', async () => {
    const veiledApp = buildApp({
      db: t.db,
      auth: playerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      switches: { broadcastWatch: 'admins', spoilerMode: 'on' },
    })
    const getVeiled = async (url: string): Promise<unknown> => {
      const res = await veiledApp.inject({ method: 'GET', url })
      expect(res.statusCode, `${url} → ${res.body.slice(0, 200)}`).toBe(200)
      return res.json()
    }
    const watched = async (knownThrough: number, how: string): Promise<void> => {
      await t.client`delete from race_watch where user_id = ${USER_ID}`
      await t.client`insert into race_watch (user_id, world_id, race_key, follow, known_through, how)
                     values (${USER_ID}, ${worldId}, ${RACE_KEY}, 1, ${knownThrough}, ${how})`
      await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${USER_ID}`
    }
    const ready = (stageDay: number) => `Stage ${stageDay} of ${RACE.name} is ready to watch`
    try {
      await t.client`delete from race_watch where user_id = ${USER_ID}`
      await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${USER_ID}`
      const feed = await getVeiled('/api/news')
      const { news } = yesterdayNews.parse(feed)
      // Todo lo escrito en este mundo es de las dos etapas veladas: quedan sus dos marcadores.
      expect(news.map((n) => [n.kind, n.text])).toEqual([
        ['stage_ready', ready(2)],
        ['stage_ready', ready(1)],
      ])
      expect(newsResponseSchema.parse(feed).news.map((n) => [n.raceKey, n.stageDay])).toEqual([
        [RACE_KEY, 2],
        [RACE_KEY, 1],
      ])
      const team = yesterdayTeamNews.parse(await getVeiled(`/api/teams/${TEAM_IDS[0]!}/news`))
      expect(team.news.map((n) => n.text)).toEqual([ready(2), ready(1)])

      const lastRace = await getVeiled('/api/riders/me/last-race')
      expect(yesterdayLastRace.parse(lastRace).report).toBeNull()
      expect(lastRaceResponseSchema.parse(lastRace).ready).toMatchObject({
        raceName: RACE.name,
        season: 0,
        stageDay: 2,
        stageCount: RACE.stages.length,
      })

      const results = await getVeiled(`/api/riders/${OWN_RIDER}/results`)
      expect(yesterdayRiderResults.parse(results).results).toMatchObject([
        { raceId: RACE_ID, stages: [], gcPuesto: null },
      ])
      expect(riderResultsResponseSchema.parse(results).results[0]?.stagesToWatch).toBe(2)

      await watched(1, 'W')
      const known1 = lastRaceResponseSchema.parse(await getVeiled('/api/riders/me/last-race'))
      expect(known1.report?.stageDay).toBe(1)
      expect(known1.ready?.stageDay).toBe(2)

      await watched(2, 'WW')
      const known2 = (await getVeiled('/api/riders/me/last-race')) as Record<string, unknown>
      expect(known2).not.toHaveProperty('ready')
      expect(yesterdayLastRace.parse(known2).report?.stageDay).toBe(2)
    } finally {
      await t.client`delete from race_watch where user_id = ${USER_ID}`
      await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${USER_ID}`
      await veiledApp.close()
    }
  })

  it('la salud del servidor', async () => {
    const health = yesterdayHealth.parse(await get('/health'))
    expect(health.gameDay).toBe(dayOf(3))
  })
})
