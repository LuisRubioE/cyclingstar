import {
  type StageRunSpec,
  gameState,
  palmares,
  raceRosters,
  raceWatch,
  riderAttrs,
  riderHidden,
  riders,
  runOneStage,
  stageGameDay,
  stageSnapshots,
  teams,
  users,
  worlds,
} from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  type ChampionTitle,
  type ChampionTitleView,
  DAYS_PER_SEASON,
  championTitleView,
  publicRiderDetailResponseSchema,
  raceViewSchema,
  stageReplaySchema,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { AppDeps } from '../app.js'
import { buildApp } from '../app.js'

/**
 * EL MAILLOT DE CAMPEÓN EN LAS TABLAS Y EN LA FICHA (docs/visual.md §8.5 y §6.1; 4-l; E3, paso 17a).
 * PGlite, suite rápida.
 *
 * La ficha de carrera y la de la etapa llevan, una vez por respuesta, `champions`: el título que lleva
 * cada corredor de sus tablas el día de la tabla, de la disciplina de esa etapa y la categoría de la
 * carrera (`wearableTitles`). La ficha del corredor lleva `champion`, su título vigente de mayor alcance,
 * el de ruta antes que el de crono (el orden entero, con el mundial y el continental, en
 * `packages/shared/src/jerseys.test.ts`). Ninguno lleva el título de un campeonato velado para quien mira.
 *
 * El mundo, el de `rowIdentity.test.ts`: dos equipos y doce corredores en `race-france`, la 1 (la crono)
 * y la 2 (en línea) corridas y el día en la 3. Los títulos salen de los ganadores de los campeonatos de
 * la temporada, apuntados en `palmares` como lo hace `stageRun.ts` (`kind = 'gc'`, la carrera sin
 * temporada y el día de su única etapa), que es lo que lee `palmaresTitleSource`: el de ruta, el de
 * crono y el sub-23 de ruta de España, los dos de Francia de un mismo corredor y el de ruta de Italia de
 * uno que no corre. Lo pide un visitante con `SPOILER_MODE` apagado; el velo, el jugador dueño del
 * campeón de ruta de España, con `SPOILER_MODE` y sin haber visto su campeonato.
 */

const RACE_ID = 'race-france'
const RACE_KEY = `${RACE_ID}:s0`
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
const SEED = 'campeones-en-las-tablas'
const FIELD = 12
/** Ids fijos, como `rowIdentity.test.ts`: el desempate del motor mira el id. */
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const TEAM_IDS = [idDe(100), idDe(101)] as const
const PLAYER = idDe(900)
/** Sin título. */
const PLAIN = idDe(0)
/** El campeón de España de ruta, corredor del jugador. */
const ROAD = idDe(1)
/** El campeón de España de crono. */
const ITT = idDe(2)
/** El campeón sub-23 de España de ruta: no lo lleva en una carrera élite. */
const U23 = idDe(3)
/** El campeón de Francia de ruta y de crono. */
const BOTH = idDe(4)
/** El campeón de Italia de ruta, que no corre `race-france`: no está en sus tablas. */
const OUTSIDER_IX = 20
const OUTSIDER = idDe(OUTSIDER_IX)
/** El día de juego de la etapa N, el mismo en que la corre el tick. */
const dayOf = (stageDay: number): number => stageGameDay(RACE_KEY, stageDay)
const TODAY = dayOf(3)

/** El día de juego de un campeonato de la temporada 0: el de su única etapa. */
const ncDay = (raceId: string): number => stageGameDay(`${raceId}:s0`, 1)
/**
 * El título que da un campeonato nacional de la temporada 0 (§7.4): vale un año desde el día siguiente. Se
 * sirve en su forma de pantalla, sin hasta cuándo vale ni si es provisional (E3, docs/visual.md §13.5; 19d).
 */
const titleOf = (
  raceId: string,
  country: string,
  discipline: 'road' | 'itt',
  category: 'elite' | 'u23',
): ChampionTitleView => {
  const title: ChampionTitle = {
    scope: 'national',
    country,
    discipline,
    category,
    season: 0,
    validFromDay: ncDay(raceId),
    validToDay: ncDay(raceId) + DAYS_PER_SEASON,
    source: { raceKey: `${raceId}:s0`, stageDay: 1 },
    provisional: true,
  }
  return championTitleView(title)
}
const ROAD_ES = titleOf('nc-es-road', 'ES', 'road', 'elite')
const ITT_ES = titleOf('nc-es-itt', 'ES', 'itt', 'elite')
const U23_ES = titleOf('nc-es-u23-road', 'ES', 'road', 'u23')
const ROAD_FR = titleOf('nc-fr-road', 'FR', 'road', 'elite')
const ITT_FR = titleOf('nc-fr-itt', 'FR', 'itt', 'elite')
const ROAD_IT = titleOf('nc-it-road', 'IT', 'road', 'elite')
/** Los campeonatos de la temporada y su ganador. */
const WINNERS: readonly { readonly raceId: string; readonly winner: string }[] = [
  { raceId: 'nc-es-road', winner: ROAD },
  { raceId: 'nc-es-itt', winner: ITT },
  { raceId: 'nc-es-u23-road', winner: U23 },
  { raceId: 'nc-fr-road', winner: BOTH },
  { raceId: 'nc-fr-itt', winner: BOTH },
  { raceId: 'nc-it-road', winner: OUTSIDER },
]
/** El campeonato del jugador, el que no ha visto. */
const OWN_NC_KEY = 'nc-es-road:s0'

const countryOf = (id: string): string => (id === BOTH ? 'FR' : id === OUTSIDER ? 'IT' : 'ES')
const teamIndexOf = (i: number): 0 | 1 => (i % 2 === 0 ? 0 : 1)

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

/** Doble de better-auth: el jugador dueño de ROAD tiene la sesión abierta en todas las peticiones. */
function playerAuth(): NonNullable<AppDeps['auth']> {
  return {
    api: { getSession: async () => ({ user: { id: PLAYER } }) },
    handler: async () => new Response('{}', { status: 200 }),
  } as unknown as NonNullable<AppDeps['auth']>
}

describe('el maillot de campeón en las tablas y en la ficha (docs/visual.md §8.5; 4-l, 17a)', () => {
  let t: TestDb
  let app: ReturnType<typeof buildApp>
  /** El jugador, con `SPOILER_MODE`: el velo (§10.13). */
  let playerApp: ReturnType<typeof buildApp>
  let worldId = ''
  const poolBefore = process.env.DB_POOL_MAX

  /** Los campeonatos de la temporada en `palmares`, como los deja `stageRun.ts`. */
  const recordWinners = () =>
    t.db.insert(palmares).values(
      WINNERS.map(({ raceId, winner }) => ({
        worldId,
        riderId: winner,
        season: 0,
        raceId,
        raceName: SEASON_CALENDAR.find((r) => r.id === raceId)!.name,
        kind: 'gc' as const,
        gameDay: ncDay(raceId),
        stageDay: 1,
      })),
    )

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
    const field = Array.from({ length: FIELD }, (_, i) => i)
    await t.db.insert(riders).values(
      [...field, OUTSIDER_IX].map((i) => ({
        id: idDe(i),
        worldId,
        teamId: i === OUTSIDER_IX ? null : TEAM_IDS[teamIndexOf(i)],
        userId: idDe(i) === ROAD ? PLAYER : null,
        name: `Rider ${String(i).padStart(2, '0')}`,
        country: countryOf(idDe(i)),
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
        field.flatMap((i) => ATTRIBUTES.map((attr) => ({ riderId: idDe(i), attr, value: 50 + i }))),
      )
    await t.db.insert(riderHidden).values(
      field.map((i) => ({
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
      .values(field.map((i) => ({ raceId: RACE_KEY, riderId: idDe(i), bib: i + 1 })))
    for (const stageDay of [1, 2])
      await t.db.transaction((tx) =>
        runOneStage(tx, worldId, dayOf(stageDay), SEED, specOf(stageDay)),
      )
    await recordWinners()
    // El campeonato del jugador, en su velo (§10.4): su corredor en la lista de salida y la etapa corrida
    // (el mapa del día de `lastRunStages` lee `stage_snapshots`), sin fila de lo visto.
    await t.db.insert(raceRosters).values({ raceId: OWN_NC_KEY, riderId: ROAD, bib: 1 })
    await t.db.insert(stageSnapshots).values({
      raceId: OWN_NC_KEY,
      stageDay: 1,
      seed: SEED,
      engineVersion: 1,
      input: {},
    })
    // `race-france`, de cabecera y con su corredor, vista hasta la 2: sus tablas le llegan enteras.
    await t.db
      .insert(raceWatch)
      .values({ userId: PLAYER, worldId, raceKey: RACE_KEY, knownThrough: 2, how: 'WW' })
    await t.db.insert(gameState).values({ worldId, currentDay: TODAY, lastProcessedDay: TODAY })
    const appWith = (auth: NonNullable<AppDeps['auth']>, spoilerMode: 'on' | 'off') =>
      buildApp({
        db: t.db,
        auth,
        serveWeb: false,
        migrationsApplied: true,
        tickIntervalMinutes: 360,
        switches: { broadcastWatch: 'admins', spoilerMode },
      })
    app = appWith(visitorAuth(), 'off')
    playerApp = appWith(playerAuth(), 'on')
  }, 180_000)

  afterAll(async () => {
    await app?.close()
    await playerApp?.close()
    await t?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  type App = ReturnType<typeof buildApp>
  /** El cuerpo tal cual llega, sin los defectos del contrato: un `champions` que falta no sale `{}`. */
  const getFrom = async (
    on: App,
    url: string,
  ): Promise<{ json: Record<string, unknown>; body: string }> => {
    const res = await on.inject({ method: 'GET', url })
    expect(res.statusCode, `${url} → ${res.body.slice(0, 200)}`).toBe(200)
    return { json: z.record(z.string(), z.unknown()).parse(res.json()), body: res.body }
  }
  const stageUrl = (day: number): string => `/api/races/${RACE_ID}/stages/${day}`
  const raceUrl = `/api/calendar/${RACE_ID}`
  const riderUrl = (id: string): string => `/api/riders/${id}`
  const raceChampions = async (on: App) =>
    raceViewSchema.parse((await getFrom(on, raceUrl)).json).champions
  const stageChampions = async (on: App, day: number) =>
    stageReplaySchema.parse((await getFrom(on, stageUrl(day))).json).champions
  const championOf = async (on: App, id: string) =>
    publicRiderDetailResponseSchema.parse((await getFrom(on, riderUrl(id))).json).rider.champion

  describe('las tablas: el título del día de la tabla (§8.5, §6.1)', () => {
    it('la etapa en línea: el de ruta de la categoría de la carrera; ni el de crono, ni el sub-23, ni nada sin título', async () => {
      const stage = stageReplaySchema.parse((await getFrom(app, stageUrl(2))).json)
      // los que no lo llevan están en sus tablas: si no salen, es por la regla
      const ranked = new Set((stage.gc ?? []).map((r) => r.riderId))
      for (const id of [PLAIN, ROAD, ITT, U23, BOTH]) expect(ranked.has(id), id).toBe(true)
      expect(stage.champions).toEqual({ [ROAD]: ROAD_ES, [BOTH]: ROAD_FR })
    })

    it('la crono: el de crono, y no el de ruta', async () => {
      const stage = stageReplaySchema.parse((await getFrom(app, stageUrl(1))).json)
      // la ficha dice la crono por su tipo (`timeTrial` se fue con la crónica en W4)
      expect(stage.kind).toBe('cri')
      expect(stage.champions).toEqual({ [ITT]: ITT_ES, [BOTH]: ITT_FR })
    })

    it('la ficha de carrera: el del día de la última etapa corrida, la 2, en línea; y nadie de fuera de sus tablas', async () => {
      expect(await raceChampions(app)).toEqual({ [ROAD]: ROAD_ES, [BOTH]: ROAD_FR })
    })

    it('el acta de una etapa lleva los mismos que su ficha', async () => {
      const raw = await getFrom(app, `${stageUrl(2)}/report`)
      const report = stageReplaySchema.parse(raw.json)
      expect(report.champions).toEqual({ [ROAD]: ROAD_ES, [BOTH]: ROAD_FR })
      // el acta no pasa por el serializador (`responseCheck: 'tests'`): los títulos salen ya en su forma de
      // pantalla de `tableChampions`, sin hasta cuándo valen ni si son provisionales (§13.5; 19d)
      expect(raw.json.champions).toEqual({ [ROAD]: ROAD_ES, [BOTH]: ROAD_FR })
      expect(raw.body).not.toMatch(/"validToDay"|"provisional"/)
    })

    it('la etapa sin correr: vacío, sin tablas', async () => {
      const { json } = await getFrom(app, stageUrl(3))
      expect(json.run).toBe(false)
      expect(json).toHaveProperty('champions', {})
    })

    it('sin ningún campeón en el mundo: vacío en la etapa y en la carrera', async () => {
      await t.client`delete from palmares where race_id like 'nc-%'`
      try {
        for (const url of [stageUrl(1), stageUrl(2), raceUrl])
          expect((await getFrom(app, url)).json, url).toHaveProperty('champions', {})
      } finally {
        await recordWinners()
      }
    })
  })

  describe('la ficha del corredor: su título vigente de mayor alcance (§8.5)', () => {
    it('sin título, null', async () => {
      const { json } = await getFrom(app, riderUrl(PLAIN))
      expect(json.rider).toHaveProperty('champion', null)
    })

    it('con uno, el suyo, de la disciplina y la categoría que sea, y corra o no', async () => {
      expect(await championOf(app, ROAD)).toEqual(ROAD_ES)
      expect(await championOf(app, ITT)).toEqual(ITT_ES)
      expect(await championOf(app, U23)).toEqual(U23_ES)
      expect(await championOf(app, OUTSIDER)).toEqual(ROAD_IT)
    })

    it('con dos del mismo alcance, el de ruta antes que el de crono', async () => {
      expect(await championOf(app, BOTH)).toEqual(ROAD_FR)
    })
  })

  /**
   * EL VELO (B13, §10.10): el título cuya etapa está en el velo de quien mira no viaja. El jugador tiene
   * su corredor en el campeonato de ruta de España, corrido y sin ver: no ve a su campeón ni en las
   * tablas ni en la ficha, y sí a los demás. Lo ve en cuanto lo conoce.
   */
  describe('el velo: un título cuyo campeonato no ha visto no viaja (B13)', () => {
    /** Lo que hace `revealStage` (§10.3), escrito a mano, con el `rev` nuevo: el horizonte se memoriza 60 s. */
    const watched = async (raceKey: string, knownThrough: number, how: string) => {
      await t.client`delete from race_watch where user_id = ${PLAYER} and race_key = ${raceKey}`
      if (knownThrough > 0)
        await t.client`insert into race_watch (user_id, world_id, race_key, known_through, how)
                       values (${PLAYER}, ${worldId}, ${raceKey}, ${knownThrough}, ${how})`
      await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${PLAYER}`
    }

    it('ni en la ficha de carrera, ni en la de la etapa, ni en el acta, ni en la ficha del corredor', async () => {
      const others = { [BOTH]: ROAD_FR }
      const race = await getFrom(playerApp, raceUrl)
      // su campeón está en las tablas que le llegan: si no lo viste, es por el velo
      expect(raceViewSchema.parse(race.json).gc.map((r) => r.riderId)).toContain(ROAD)
      expect(raceViewSchema.parse(race.json).champions).toEqual(others)
      expect(race.body).not.toContain('nc-es-road')
      const stage = await getFrom(playerApp, stageUrl(2))
      expect(stageReplaySchema.parse(stage.json).gc?.map((r) => r.riderId)).toContain(ROAD)
      expect(stageReplaySchema.parse(stage.json).champions).toEqual(others)
      expect(stage.body).not.toContain('nc-es-road')
      const report = await getFrom(playerApp, `${stageUrl(2)}/report`)
      expect(stageReplaySchema.parse(report.json).champions).toEqual(others)
      const own = await getFrom(playerApp, riderUrl(ROAD))
      expect(own.json.rider).toHaveProperty('champion', null)
      expect(own.body).not.toContain('nc-es-road')
      expect(await championOf(playerApp, BOTH)).toEqual(ROAD_FR)
      // la crono no lleva el de ruta: la misma con el velo y sin él
      expect(await stageChampions(playerApp, 1)).toEqual({ [ITT]: ITT_ES, [BOTH]: ITT_FR })
    })

    it('visto su campeonato, lo lleva en todas', async () => {
      try {
        await watched(OWN_NC_KEY, 1, 'R')
        const all = { [ROAD]: ROAD_ES, [BOTH]: ROAD_FR }
        expect(await raceChampions(playerApp)).toEqual(all)
        expect(await stageChampions(playerApp, 2)).toEqual(all)
        expect(await championOf(playerApp, ROAD)).toEqual(ROAD_ES)
      } finally {
        await watched(OWN_NC_KEY, 0, '')
      }
    })

    it('la ficha elige entre lo que ve: con su crono a la vista y la ruta velada, la crono, y no null', async () => {
      // Elegir antes de quitar lo velado daría el de ruta, y después nada: `null` si ganó la ruta y la
      // crono si no la ganó, que destripa el campeonato (implementacion.md, el 17a, punto 3). Aquí su
      // corredor gana también la crono de España, que no está en su velo.
      await t.db.insert(palmares).values({
        worldId,
        riderId: ROAD,
        season: 0,
        raceId: 'nc-es-itt',
        raceName: SEASON_CALENDAR.find((r) => r.id === 'nc-es-itt')!.name,
        kind: 'gc' as const,
        gameDay: ncDay('nc-es-itt'),
        stageDay: 1,
      })
      try {
        expect(await championOf(playerApp, ROAD)).toEqual(ITT_ES)
        expect(await championOf(app, ROAD)).toEqual(ROAD_ES)
      } finally {
        await t.client`delete from palmares where rider_id = ${ROAD} and race_id = 'nc-es-itt'`
      }
    })

    it('la ficha de carrera de quien solo conoce la 1 es la de tras la crono: los de crono; la 2, sin tablas ni campeones', async () => {
      try {
        await watched(RACE_KEY, 1, 'W')
        expect(await raceChampions(playerApp)).toEqual({ [ITT]: ITT_ES, [BOTH]: ITT_FR })
        const veiled = (await getFrom(playerApp, stageUrl(2))).json
        expect(veiled).not.toHaveProperty('gc')
        expect(veiled).toHaveProperty('champions', {})
      } finally {
        await watched(RACE_KEY, 2, 'WW')
      }
    })
  })
})
