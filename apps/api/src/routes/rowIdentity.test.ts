import {
  ENROLL_LOCK_DAYS,
  type StageRunSpec,
  gameState,
  predictStartlist,
  raceRosters,
  riderAttrs,
  riderHidden,
  riders,
  runOneStage,
  teams,
  users,
  worldHorizon,
  worlds,
} from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { type CalendarRace, SEASON_CALENDAR } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  hallOfFameResponseSchema,
  raceStartlistSchema,
  raceViewSchema,
  stageReplaySchema,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'

/**
 * LA IDENTIDAD DE CADA FILA DE CLASIFICACIÓN (docs/visual.md §6.1, 6-d y 17-q; E3, paso 12b). PGlite,
 * suite rápida.
 *
 * Las tablas de una carrera toman el dorsal de cada fila de la lista de salida, por `riderId`, y el
 * maillot del equipo, por `teamId`. Por eso la lista de salida sirve la escuadra congelada también tras
 * la salida, y solo ella: ni una previsión ni un congelado nuevo, y nada de lo corrido (el que abandonó
 * sigue en su equipo con su dorsal). Y las dos filas que no traían equipo, la de puntos y montaña
 * (`pointsEntrySchema`) y la del salón de la fama (`hallOfFameRowSchema`), lo traen: el de hoy, null en
 * un agente libre.
 *
 * El mundo: dos equipos y el corredor de un jugador sin equipo, apuntado solo, en `race-france`, todos
 * con dorsal; la 1 (la crono) y la 2 corridas, un corredor que abandona en la 2 y el día en la 3. Todo
 * lo pide un visitante con `SPOILER_MODE` apagado: no tiene nada velado.
 */

const RACE_ID = 'race-france'
const RACE_KEY = `${RACE_ID}:s0`
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
const SEED = 'identidad-de-fila'
const FIELD = 12
/** Ids fijos, como `yesterday.test.ts`: el desempate del motor mira el id. */
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const TEAM_IDS = [idDe(100), idDe(101)] as const
const PLAYER = idDe(900)
/** El agente libre: el corredor del jugador, sin equipo, que se apuntó solo a la carrera. */
const FREE = FIELD - 1
/** El que abandona en la 2: la vuelta sigue sin él, y la lista de salida, con él. */
const ABANDONS = 3
/** Día de juego de la etapa N: la 1, la 2 y la 3 de `race-france` van seguidas. */
const dayOf = (stageDay: number): number => RACE.startDay + stageDay - 1
const TODAY = dayOf(3)

/** El equipo de hoy del corredor `i` (índice en `TEAM_IDS`), o null en el agente libre. */
const teamIndexOf = (i: number): number | null => (i === FREE ? null : i % 2)
const nameOf = (i: number): string => `Rider ${String(i).padStart(2, '0')}`
/** Lo que una fila de clasificación tiene que decir del equipo de cada corredor. */
const TEAM_OF: ReadonlyMap<string, { teamId: string | null; teamName: string | null }> = new Map(
  Array.from({ length: FIELD }, (_, i) => {
    const k = teamIndexOf(i)
    return [
      idDe(i),
      k === null ? { teamId: null, teamName: null } : { teamId: TEAM_IDS[k]!, teamName: `Team ${k}` },
    ] as const
  }),
)

/**
 * Una carrera de la temporada abierta al WorldTour, fuera de los campeonatos, cuya salida queda a
 * `daysUntil` días de hoy (negativo: ya salió): con nuestros dos equipos admitidos, una lista que los
 * previera no saldría vacía.
 */
function raceAt(ok: (daysUntil: number) => boolean): CalendarRace {
  const race = SEASON_CALENDAR.find(
    (r) =>
      r.id !== RACE_ID &&
      r.championshipCountry === undefined &&
      r.openTo.includes('WT') &&
      ok(r.startDay - TODAY),
  )
  if (race === undefined) throw new Error('el calendario no tiene la carrera que pide el test')
  return race
}
/** Ya salió, sin escuadra congelada en este mundo (corrió antes de que naciera). */
const PAST = raceAt((d) => d < 0)
/** Dentro de la ventana de cierre de inscripciones. */
const SOON = raceAt((d) => d > 0 && d <= ENROLL_LOCK_DAYS)
/** Más allá de la ventana. */
const LATER = raceAt((d) => d > ENROLL_LOCK_DAYS)

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

/** Doble de better-auth: nadie tiene sesión, todo lo pide un visitante. */
function visitorAuth(): NonNullable<AppDeps['auth']> {
  return {
    api: { getSession: async () => null },
    handler: async () => new Response('{}', { status: 200 }),
  } as unknown as NonNullable<AppDeps['auth']>
}

describe('la identidad de cada fila de clasificación (docs/visual.md §6.1, 17-q; 12b)', () => {
  let t: TestDb
  let app: ReturnType<typeof buildApp>
  let worldId = ''
  const poolBefore = process.env.DB_POOL_MAX

  beforeAll(async () => {
    // PGlite admite UNA sesión (`packages/db/src/testDb.ts`) y la ruta de una etapa corrida lanza
    // consultas a la vez: con el pool de 10 de `createDb`, el socket corta y la ruta responde 500.
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: SEED, engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = world!.id
    await t.db.insert(users).values({
      id: PLAYER,
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
      Array.from({ length: FIELD }, (_, i) => {
        const k = teamIndexOf(i)
        return {
          id: idDe(i),
          worldId,
          teamId: k === null ? null : TEAM_IDS[k]!,
          userId: i === FREE ? PLAYER : null,
          name: nameOf(i),
          country: 'ES',
          gender: 'M' as const,
          birthSeason: -25,
          archetype: 'fondo' as const,
          faceSeed: `cara-${i}`,
          ctl: 60,
          atl: 40,
        }
      }),
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
    // La escuadra congelada, con dorsal: sin él el campo entra al motor en el orden que Postgres decida.
    await t.db
      .insert(raceRosters)
      .values(
        Array.from({ length: FIELD }, (_, i) => ({ raceId: RACE_KEY, riderId: idDe(i), bib: i + 1 })),
      )
    await t.db.transaction((tx) => runOneStage(tx, worldId, dayOf(1), SEED, specOf(1)))
    // El abandono, como lo escribe el tick en su fila de la lista (`stageRun.ts`): el día y el motivo.
    // Escrito antes de correr la 2, que sale sin él.
    await t.client`update race_rosters set abandoned_day = ${dayOf(2)}, abandoned_reason = 'lesion'
                   where race_id = ${RACE_KEY} and rider_id = ${idDe(ABANDONS)}`
    await t.db.transaction((tx) => runOneStage(tx, worldId, dayOf(2), SEED, specOf(2)))
    await t.db.insert(gameState).values({ worldId, currentDay: TODAY, lastProcessedDay: TODAY })
    app = buildApp({
      db: t.db,
      auth: visitorAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      switches: { broadcastWatch: 'admins', spoilerMode: 'off' },
    })
  }, 180_000)

  afterAll(async () => {
    await app?.close()
    await t?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  const get = async (url: string): Promise<{ json: unknown; body: string }> => {
    const res = await app.inject({ method: 'GET', url })
    expect(res.statusCode, `${url} → ${res.body.slice(0, 200)}`).toBe(200)
    return { json: res.json(), body: res.body }
  }
  const startlistUrl = (raceId: string): string => `/api/calendar/${raceId}/startlist`

  describe('la lista de salida tras la salida (17-q)', () => {
    const riderOf = (i: number) => ({
      id: idDe(i),
      name: nameOf(i),
      country: 'ES',
      isBot: i !== FREE,
      bib: i + 1,
    })
    const indices = Array.from({ length: FIELD }, (_, i) => i)

    it('empezada y con su escuadra congelada: la escuadra entera, por equipo y dorsal, y el que abandonó en su sitio', async () => {
      const { json, body } = await get(startlistUrl(RACE_ID))
      const daysUntil = RACE.startDay - TODAY
      expect(daysUntil).toBeLessThan(0)
      expect(json).toEqual({
        upcoming: false,
        daysUntil,
        frozen: true,
        // los equipos por su dorsal más bajo, y cada corredor por el suyo
        teams: TEAM_IDS.map((id, k) => ({
          id,
          name: `Team ${k}`,
          country: 'ES',
          division: 'WT',
          jerseySeed: `j${k}`,
          riders: indices.filter((i) => teamIndexOf(i) === k).map(riderOf),
        })),
        freeAgents: [riderOf(FREE)],
      })
      // La web la valida con el contrato de siempre: no gana ningún campo.
      const startlist = raceStartlistSchema.parse(json)
      const listed = startlist.teams.flatMap((team) => team.riders)
      expect(listed.find((r) => r.id === idDe(ABANDONS))).toEqual(riderOf(ABANDONS))
      // Nada de lo corrido: ni el abandono ni puestos ni tiempos.
      expect(body).not.toMatch(/abandon|lesion|dnf|reason|puesto|tiempo/i)
      // Es la misma escuadra que se servía antes de la salida, por la misma lectura.
      const before = await predictStartlist(t.db, worldHorizon, worldId, RACE, 0)
      expect(json).toEqual({ upcoming: false, daysUntil, ...before })
    })

    it('empezada sin escuadra congelada: vacía, como antes, sin prever equipos', async () => {
      const daysUntil = PAST.startDay - TODAY
      expect((await get(startlistUrl(PAST.id))).json).toEqual({
        upcoming: false,
        daysUntil,
        teams: [],
        freeAgents: [],
      })
      // Tampoco la congela: tras la salida no se convoca a nadie.
      const [row] = await t.client<{ n: number }[]>`
        select count(*)::int as n from race_rosters where race_id = ${`${PAST.id}:s0`}`
      expect(row?.n).toBe(0)
    })

    it('lejos de la salida, fuera de la ventana de cierre: vacía, como antes', async () => {
      expect((await get(startlistUrl(LATER.id))).json).toEqual({
        upcoming: false,
        daysUntil: LATER.startDay - TODAY,
        teams: [],
        freeAgents: [],
      })
    })

    // El último de la lista: dentro de la ventana la ruta congela la escuadra si puede, y escribe.
    it('dentro de la ventana de cierre, la de antes: upcoming, con lo que da predictStartlist', async () => {
      const { json } = await get(startlistUrl(SOON.id))
      console.log('DEPURA', SOON.id, JSON.stringify(json))
      const startlist = raceStartlistSchema.parse(json)
      expect(startlist.upcoming).toBe(true)
      expect(startlist.daysUntil).toBe(SOON.startDay - TODAY)
      expect(startlist.teams.length).toBeGreaterThan(0)
      expect(json).toEqual({
        upcoming: true,
        daysUntil: SOON.startDay - TODAY,
        ...(await predictStartlist(t.db, worldHorizon, worldId, SOON, 0)),
      })
    })
  })

  describe('el equipo de las filas que no lo traían (§6.1, 6-d)', () => {
    /** Las sumas de cada corredor en `stage_results` hasta la 2, mayor primero y a igualdad por id. */
    const sums = async (kind: 'sprint' | 'kom'): Promise<[string, number][]> => {
      const rows =
        kind === 'sprint'
          ? await t.client<{ rider_id: string; n: number }[]>`
              select rider_id, sum(puntos_volante)::int as n from stage_results
              where race_id = ${RACE_KEY} group by rider_id order by n desc, rider_id`
          : await t.client<{ rider_id: string; n: number }[]>`
              select rider_id, sum(puntos_montana)::int as n from stage_results
              where race_id = ${RACE_KEY} group by rider_id order by n desc, rider_id`
      return rows.filter((r) => r.n > 0).map((r) => [r.rider_id, r.n])
    }

    it('puntos y montaña, de la etapa y de la carrera: el equipo de hoy de cada corredor, null en el agente libre', async () => {
      const stage = stageReplaySchema.parse((await get(`/api/races/${RACE_ID}/stages/2`)).json)
      const race = raceViewSchema.parse((await get(`/api/calendar/${RACE_ID}`)).json)
      const points = stage.points ?? []
      const kom = stage.kom ?? []
      expect(points.length).toBeGreaterThan(0)
      expect(kom.length).toBeGreaterThan(0)
      for (const rows of [points, kom, race.points, race.kom])
        for (const r of rows)
          expect({ teamId: r.teamId, teamName: r.teamName }, r.name).toEqual(TEAM_OF.get(r.riderId))
      // La meta da puntos a los catorce primeros: el agente libre puntúa, y sin equipo.
      expect(points.find((r) => r.riderId === idDe(FREE))).toMatchObject({
        teamId: null,
        teamName: null,
      })
      // Agrupar también por el equipo no parte ni reordena nada: una fila por corredor, con la suma de
      // sus etapas, la de más puntos primero y a igualdad por id.
      expect(points.map((r) => [r.riderId, r.puntos])).toEqual(await sums('sprint'))
      expect(kom.map((r) => [r.riderId, r.puntos])).toEqual(await sums('kom'))
      expect(race.points).toEqual(points)
      expect(race.kom).toEqual(kom)
    })

    it('el salón de la fama: el equipo de HOY de cada corredor, el nuevo tras fichar y null sin equipo', async () => {
      const hallOfFame = async () =>
        hallOfFameResponseSchema.parse((await get('/api/hall-of-fame')).json).riders
      const rows = await hallOfFame()
      expect(rows.length).toBeGreaterThan(0)
      // Una fila por corredor con su palmarés entero, en el orden de siempre: el equipo no parte ninguna.
      const honours = await t.client<{ rider_id: string; n: number }[]>`
        select rider_id, count(*)::int as n from palmares group by rider_id order by n desc, rider_id`
      expect(rows.map((r) => [r.riderId, r.total])).toEqual(honours.map((h) => [h.rider_id, h.n]))
      for (const r of rows)
        expect({ teamId: r.teamId, teamName: r.teamName }, r.name).toEqual(TEAM_OF.get(r.riderId))

      // El palmarés no guarda con qué equipo se ganó: el de la fila es el de hoy.
      const star = rows[0]!
      const was = TEAM_OF.get(star.riderId)!
      const k = was.teamId === TEAM_IDS[0] ? 1 : 0
      const teamOfStar = async () => {
        const row = (await hallOfFame()).find((r) => r.riderId === star.riderId)
        return { teamId: row?.teamId, teamName: row?.teamName }
      }
      try {
        await t.client`update riders set team_id = ${TEAM_IDS[k]!} where id = ${star.riderId}`
        expect(await teamOfStar()).toEqual({ teamId: TEAM_IDS[k], teamName: `Team ${k}` })
        await t.client`update riders set team_id = null where id = ${star.riderId}`
        expect(await teamOfStar()).toEqual({ teamId: null, teamName: null })
      } finally {
        await t.client`update riders set team_id = ${was.teamId} where id = ${star.riderId}`
      }
    })
  })
})
