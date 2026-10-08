import { SEASON_CALENDAR, stageDayOfSeason } from '@cyclingstar/engine'
import {
  BROADCAST,
  type CastRider,
  type ChampionTitle,
  DAYS_PER_SEASON,
  SPOILER,
  type StageRef,
  type TimelineCast,
} from '@cyclingstar/shared'
import { not, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Database } from './client.js'
import {
  type Horizon,
  TtlMemo,
  type VeiledStage,
  type WorldRef,
  anonHorizon,
  clearHorizonCaches,
  computeHorizon,
  horizonSummary,
  isVeiled,
  lastRunStages,
  stageGameDay,
  stageGateOf,
  throughStage,
  touchLastSeen,
  veilCast,
  veilSql,
  worldHorizon,
} from './horizon.js'
import { palmares, raceRosters, riderPoints, stageTeamResults } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import {
  LETTER_OF_MODE,
  ProgressMemory,
  type WatchKey,
  readWatch,
  recordProgress,
  revealStage,
  setFollow,
  setSpoilerScope,
} from './watch.js'

/**
 * PGlite admite UNA sesión (`testDb.ts`): la escritura que el barrido de la memoria lanza sin esperar no
 * puede abrir otra conexión mientras el test lee. `createDb` lee la variable al llamarse.
 */
const poolBefore = process.env.DB_POOL_MAX
beforeAll(() => {
  process.env.DB_POOL_MAX = '1'
})
afterAll(() => {
  if (poolBefore === undefined) delete process.env.DB_POOL_MAX
  else process.env.DB_POOL_MAX = poolBefore
})

/**
 * LOS GEMELOS DEL PREDICADO DEL VELO (docs/retransmision.md §10.6, punto 3; D-37, 10-j). Nacen en el
 * 3a con los tipos y las funciones puras (17-g).
 */

const KEY = 'race-france:s0'
const veiled = (stageDay: number, raceKey = KEY): VeiledStage => ({
  raceKey,
  stageDay,
  gameDay: 100 + stageDay,
  reason: 'headline',
})
const withVeil = (veil: readonly VeiledStage[]): Horizon => ({
  kind: 'viewer',
  userId: '00000000-0000-4000-8000-000000000001',
  readOnly: false,
  rev: '200.3',
  knownThrough: new Map([[KEY, 4]]),
  veil,
  watching: new Map(),
})

describe('los dos horizontes sin espectador (10-h)', () => {
  it('el del mundo y el del visitante tienen el velo vacío y se distinguen por kind y rev', () => {
    expect(worldHorizon).toMatchObject({
      kind: 'world',
      userId: null,
      readOnly: true,
      rev: 'world',
    })
    expect(anonHorizon()).toMatchObject({ kind: 'anon', userId: null, readOnly: true, rev: 'anon' })
    for (const h of [worldHorizon, anonHorizon()]) {
      expect(h.veil).toEqual([])
      expect(stageGateOf(h, KEY, 7)).toBeNull()
      expect(throughStage(h, KEY, 9)).toBe(9)
    }
  })
})

describe('throughStage, isVeiled y stageGateOf (§10.6)', () => {
  const h = withVeil([veiled(5), veiled(6), veiled(2, 'race-italy:s0')])

  it('throughStage sirve hasta la anterior a la primera velada de ESA carrera', () => {
    expect(throughStage(h, KEY, 6)).toBe(4)
    expect(throughStage(h, KEY, 3)).toBe(3) // lo corrido manda si es menor
    expect(throughStage(h, 'race-italy:s0', 8)).toBe(1)
    expect(throughStage(h, 'race-spain:s0', 8)).toBe(8)
  })

  it('isVeiled mira la carrera y la etapa', () => {
    expect(isVeiled(h, KEY, 5)).toBe(true)
    expect(isVeiled(h, KEY, 4)).toBe(false)
    expect(isVeiled(h, 'race-italy:s0', 5)).toBe(false)
  })

  it('la puerta: not_seen para la propia, y una anterior velada manda sobre la propia (10-j)', () => {
    expect(stageGateOf(h, KEY, 4)).toBeNull()
    expect(stageGateOf(h, KEY, 5)).toEqual({ k: 'not_seen' })
    expect(stageGateOf(h, KEY, 6)).toEqual({ k: 'previous_unseen', firstUnseen: 5 })
    expect(stageGateOf(h, KEY, 9)).toEqual({ k: 'previous_unseen', firstUnseen: 5 })
    expect(stageGateOf(h, 'race-italy:s0', 3)).toEqual({ k: 'previous_unseen', firstUnseen: 2 })
  })
})

/**
 * EL REPARTO BAJO EL VELO (docs/retransmision.md §10.10 y §7.8; I-11, D-15, D-37; paso 7b). Todo dato
 * del reparto congelado cuya procedencia (`from`, o la `source` de un título) está en el velo de quien
 * mira se degrada antes de servir: el maillot a la equipación, la línea fuera, la salida de la general a
 * null; `stage_wins`, etapa a etapa. Lo que no lleva procedencia (dorsal, país, equipo, `knownWins`,
 * los favoritos) viaja tal cual. B13, con las seis congeladas y 500 velos, está en
 * `apps/api/src/broadcastFixtures.test.ts` (17-t).
 */
describe('veilCast · el reparto bajo el velo (§10.10; 7b)', () => {
  const ref = (stageDay: number, raceKey = KEY): StageRef => ({ raceKey, stageDay })
  const n1 = ref(6) // la N−1 de la etapa 7
  const title = (source: StageRef): ChampionTitle => ({
    scope: 'national',
    country: 'IT',
    discipline: 'road',
    category: 'elite',
    season: 0,
    validFromDay: 0,
    validToDay: 365,
    source,
    provisional: true,
  })
  const NC = ref(1, 'nc-it-road:s0')
  const rider = (i: number, over: Partial<CastRider>): CastRider => ({
    rider: i,
    riderId: `rider-${i}`,
    bib: i + 1,
    team: 0,
    country: 'IT',
    gender: 'M',
    start: { gcRank: i + 1, gcDeficitS: i * 10, from: n1 },
    worn: { kind: 'team' },
    distinctions: [],
    knownWins: 3,
    ...over,
  })
  const cast: TimelineCast = {
    riders: [
      rider(0, { worn: { kind: 'leader', jersey: 'gc', delegated: false, from: n1 } }),
      rider(1, {
        worn: { kind: 'leader', jersey: 'points', delegated: true, from: n1 },
        distinctions: [
          { kind: 'wears_for', jersey: 'points', rank: 2, from: n1 },
          { kind: 'leads', jersey: 'kom', from: n1 },
        ],
      }),
      rider(2, {
        worn: { kind: 'champion', title: title(NC) },
        distinctions: [
          { kind: 'gc', rank: 3, deficitS: 20, from: n1 },
          { kind: 'stage_wins', stages: [ref(2), ref(5)] },
        ],
      }),
      rider(3, { distinctions: [{ kind: 'champion', title: title(NC) }] }),
    ],
    teams: [{ teamId: 'team-0', jerseySeed: 'j0' }],
    favourites: [{ rider: 2, why: 'climb' }],
  }

  it('con el velo vacío devuelve el mismo reparto, sin copiarlo', () => {
    expect(veilCast(cast, worldHorizon)).toBe(cast)
    expect(veilCast(cast, anonHorizon())).toBe(cast)
  })

  it('con la N−1 velada: nadie lleva maillot de líder, sin líneas de la N−1 y sin general de salida', () => {
    const out = veilCast(cast, withVeil([veiled(6)]))
    expect(out.riders.map((c) => c.worn.kind)).toEqual(['team', 'team', 'champion', 'team'])
    expect(out.riders[1]!.distinctions).toEqual([])
    // la línea de general se va; las victorias de etapa de antes, que conoce, se quedan
    expect(out.riders[2]!.distinctions).toEqual([{ kind: 'stage_wins', stages: [ref(2), ref(5)] }])
    for (const c of out.riders)
      expect(c.start).toEqual({ gcRank: null, gcDeficitS: null, from: null })
    // lo que no lleva procedencia viaja tal cual
    expect(out.teams).toBe(cast.teams)
    expect(out.favourites).toBe(cast.favourites)
    expect(out.riders.map((c) => [c.riderId, c.bib, c.team, c.country, c.knownWins])).toEqual(
      cast.riders.map((c) => [c.riderId, c.bib, c.team, c.country, c.knownWins]),
    )
    expect(JSON.stringify(out)).not.toContain('"stageDay":6')
  })

  it('stage_wins se filtra etapa a etapa, y sin ninguna se va la línea', () => {
    const one = veilCast(cast, withVeil([veiled(5)]))
    expect(one.riders[2]!.distinctions).toEqual([
      { kind: 'gc', rank: 3, deficitS: 20, from: n1 },
      { kind: 'stage_wins', stages: [ref(2)] },
    ])
    const both = veilCast(cast, withVeil([veiled(2), veiled(5)]))
    expect(both.riders[2]!.distinctions.map((d) => d.kind)).toEqual(['gc'])
    // la N−1 sigue conocida: el maillot y la general de salida viajan
    expect(both.riders[0]!.worn).toEqual(cast.riders[0]!.worn)
    expect(both.riders[0]!.start).toEqual(cast.riders[0]!.start)
  })

  it('un título cuyo campeonato está velado no viste a nadie ni sale en su línea (D-37)', () => {
    const out = veilCast(cast, withVeil([veiled(1, 'nc-it-road:s0')]))
    expect(out.riders[2]!.worn).toEqual({ kind: 'team' })
    expect(out.riders[3]!.distinctions).toEqual([])
    // lo de la carrera, que conoce, sigue
    expect(out.riders[0]!.worn).toEqual(cast.riders[0]!.worn)
    expect(out.riders[2]!.distinctions).toEqual(cast.riders[2]!.distinctions)
    expect(JSON.stringify(out)).not.toContain('nc-it-road')
  })

  it('un velo de otra carrera o de otra etapa no toca nada', () => {
    const out = veilCast(cast, withVeil([veiled(6, 'race-italy:s0'), veiled(9)]))
    expect(out).toEqual(cast)
  })
})

/**
 * B12 · LA ARITMÉTICA DEL HORIZONTE, lo que solo toca la base (docs/retransmision.md §10.14 y §16.4;
 * paso 7a). El mundo mínimo de §10.14, sobre PGlite: una vuelta de siete etapas en guardia por
 * `own_rider` (`race-catalonia`, días 82 a 88), una de cabecera (`race-sanremo`, día 80) y una ajena
 * (`race-two-seas`, días 68 a 74), más tres para casos sueltos (`race-emirates`, a medio correr;
 * `race-langkawi`, de la temporada pasada; y la vuelta de prueba, `test-tour`). Tres cuentas: el
 * jugador, con su corredor en la catalana; el mánager, que posee un equipo con un corredor en la
 * catalana y otro en la ajena; y otra. Los casos que pasan por la petición (la puerta con su 403, lo
 * servido que no es visto, las cookies y `SPOILER_MODE`) están en `apps/api/src/routes/me.test.ts` y
 * `broadcast.test.ts`; el de dos dispositivos, en `watchConcurrency.test.ts` (Postgres de verdad).
 */
const FIXED = '00000000-0000-4000-8000-'
const idDe = (i: number): string => `${FIXED}${String(i).padStart(12, '0')}`
const PLAYER = idDe(900)
const MANAGER = idDe(901)
const OTHER = idDe(902)
const PLAYER_RIDER = idDe(1)
const TEAM_RIDER_OWN = idDe(2) // del equipo del mánager, en la catalana
const TEAM_RIDER_FOREIGN = idDe(3) // del equipo del mánager, en la ajena

const race = (id: string) => SEASON_CALENDAR.find((r) => r.id === id)!
const OWN = 'race-catalonia:s0'
const FOREIGN = 'race-two-seas:s0'
const HEADLINE = 'race-sanremo:s0'
const HALF = 'race-emirates:s0' // corre la 1, la 2 y la 3 de siete
const LAST_SEASON = 'race-langkawi:s0' // de la temporada 0, mirada en la 1, a medio correr
const TEST_TOUR = 'test-tour'
/** El día de juego de la última etapa de la catalana: con él, en guardia y sin caducar. */
const OWN_LAST_DAY = stageDayOfSeason(race('race-catalonia'), 7)

const tags = (h: Horizon, raceKey?: string): string[] =>
  h.veil
    .filter((v) => raceKey === undefined || v.raceKey === raceKey)
    .map((v) => `${v.raceKey}#${v.stageDay}:${v.reason}`)
const stagesOf = (h: Horizon, raceKey: string): number[] =>
  h.veil.filter((v) => v.raceKey === raceKey).map((v) => v.stageDay)
const me = (userId: string) => ({ userId, readOnly: false })

describe('B12 · la aritmética del horizonte (§10.14)', () => {
  let t: TestDb
  let worldId = ''
  const at = (currentDay: number): WorldRef => ({ worldId, currentDay })
  /** El día de la última etapa de la catalana: en guardia y sin caducar. */
  const day = (): WorldRef => at(OWN_LAST_DAY)
  const k = (userId: string, raceKey: string): WatchKey => ({ userId, worldId, raceKey })

  /** Las etapas corridas de una carrera: su fila de stage_snapshots, que es lo que mira el mapa del día. */
  const run = async (raceKey: string, stages: readonly number[]): Promise<void> => {
    for (const s of stages)
      await t.client`insert into stage_snapshots (race_id, stage_day, seed, engine_version, input)
                     values (${raceKey}, ${s}, 'b12', 91, '{}'::jsonb)`
  }
  /** Una fila de race_watch escrita a mano, como la dejaría `watch.ts`. */
  const row = async (
    userId: string,
    raceKey: string,
    cols: { follow?: number; known_through?: number; how?: string } = {},
  ): Promise<void> => {
    await t.client`insert into race_watch ${t.client({
      user_id: userId,
      world_id: worldId,
      race_key: raceKey,
      ...cols,
    })}`
  }
  const rev = async (userId: string): Promise<number> =>
    (await t.client<{ r: number }[]>`select horizon_rev as r from users where id = ${userId}`)[0]!.r

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('b12', 91) returning id`
    worldId = w!.id
    for (const [id, email] of [
      [PLAYER, 'jugador@example.com'],
      [MANAGER, 'manager@example.com'],
      [OTHER, 'otra@example.com'],
    ] as const)
      await t.client`insert into users (id, email, name) values (${id}, ${email}, 'B12')`
    const [team] = await t.client<{ id: string }[]>`
      insert into teams (world_id, name, division, philosophy, jersey_seed, owner_user_id)
      values (${worldId}, 'Equipo del mánager', 'WT', 'general', 'j1', ${MANAGER}) returning id`
    for (const [id, userId, teamId] of [
      [PLAYER_RIDER, PLAYER, null],
      [TEAM_RIDER_OWN, null, team!.id],
      [TEAM_RIDER_FOREIGN, null, team!.id],
    ] as const)
      await t.client`insert into riders (id, world_id, team_id, user_id, name, country, gender,
                                         birth_season, archetype, face_seed)
                     values (${id}, ${worldId}, ${teamId}, ${userId}, 'Corredor', 'ES', 'M', -25,
                             'fondo', 'f')`
    for (const [raceKey, riderId] of [
      [OWN, PLAYER_RIDER],
      [OWN, TEAM_RIDER_OWN],
      [FOREIGN, TEAM_RIDER_FOREIGN],
      [HALF, PLAYER_RIDER],
      [LAST_SEASON, PLAYER_RIDER],
      [TEST_TOUR, PLAYER_RIDER],
    ] as const)
      await t.client`insert into race_rosters (race_id, rider_id) values (${raceKey}, ${riderId})`
    await run(OWN, [1, 2, 3, 4, 5, 6, 7])
    await run(FOREIGN, [1, 2, 3, 4, 5, 6, 7])
    await run(HEADLINE, [1])
    await run(HALF, [1, 2, 3])
    await run(TEST_TOUR, [1])
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  beforeEach(async () => {
    clearHorizonCaches()
    await t.client`delete from race_watch`
    await t.client`update users set spoiler_scope = 'guarded', horizon_rev = 0, reveal_confirm = true,
                   last_seen_at = null`
  })

  it('el jugador, sin nada visto: la suya entera y la de cabecera, en orden y con su motivo', async () => {
    const h = await computeHorizon(t.db, me(PLAYER), day())
    expect(h).toMatchObject({ kind: 'viewer', userId: PLAYER, readOnly: false })
    expect(tags(h, OWN)).toEqual([1, 2, 3, 4, 5, 6, 7].map((s) => `${OWN}#${s}:own_rider`))
    expect(tags(h, HEADLINE)).toEqual([`${HEADLINE}#1:headline`])
    expect(stagesOf(h, FOREIGN)).toEqual([]) // la ajena se ve al día (D-30)
    expect(h.knownThrough.get(OWN)).toBe(0)
    // El día de juego de cada etapa velada es el del calendario, el mismo en que la corre el tick.
    for (const v of h.veil) expect(v.gameDay).toBe(stageGameDay(v.raceKey, v.stageDay))
    expect(h.veil.find((v) => v.raceKey === OWN && v.stageDay === 7)?.gameDay).toBe(OWN_LAST_DAY)
    expect(h.rev).toBe(`${OWN_LAST_DAY}.0`)
  })

  it('prefijo al revelar: known_through 2 y revelar la 5 dan 5, AAR detrás y horizon_rev + 1', async () => {
    await row(PLAYER, OWN, { follow: 1, known_through: 2, how: 'WW' })
    const before = await rev(PLAYER)
    const r = await revealStage(t.db, k(PLAYER, OWN), 5, false)
    expect(r.horizonRev).toBe(before + 1)
    expect(await readWatch(t.db, k(PLAYER, OWN))).toEqual({
      follow: 1,
      knownThrough: 5,
      how: 'WWAAR',
      watchingStage: null,
      reachedS: null,
    })
    const h = await computeHorizon(t.db, me(PLAYER), day())
    expect(stagesOf(h, OWN)).toEqual([6, 7])
    // Revelar lo que ya se conoce no cambia nada, ni el rev.
    expect((await revealStage(t.db, k(PLAYER, OWN), 3, false)).horizonRev).toBe(before + 1)
  })

  it('arrastre al ver: fuera de guardia y sin nada, el primer progreso de la 5 escribe AAAA y sigue (10-a)', async () => {
    const before = await rev(PLAYER)
    const r = await recordProgress(t.db, k(PLAYER, FOREIGN), 5, 120.7, 'play', 15_000)
    expect(r).toEqual({ status: 'watching', horizonRev: before + 1, followed: true })
    expect(await readWatch(t.db, k(PLAYER, FOREIGN))).toEqual({
      follow: 1,
      knownThrough: 4,
      how: 'AAAA',
      watchingStage: 5,
      reachedS: 120,
    })
    // Seguida desde el primer progreso, antes de llegar a meta: la 5, a medias, sigue en el velo.
    const h = await computeHorizon(t.db, me(PLAYER), day())
    expect(tags(h, FOREIGN)).toEqual([5, 6, 7].map((s) => `${FOREIGN}#${s}:follow`))
    expect(h.watching.get(FOREIGN)).toEqual({ stageDay: 5, reachedS: 120 })
    // El segundo progreso de la misma etapa no arrastra ni sigue: no sube el rev, y gana el mayor.
    const r2 = await recordProgress(t.db, k(PLAYER, FOREIGN), 5, 90, 'play', 15_000)
    expect(r2).toEqual({ status: 'watching', horizonRev: before + 1, followed: false })
    expect((await readWatch(t.db, k(PLAYER, FOREIGN)))?.reachedS).toBe(120)
  })

  it('a medias sigue oculta: viendo la 5 en el segundo 3.000, la 5 está en el velo y en watching', async () => {
    await row(PLAYER, OWN, { known_through: 4, how: 'WWWW' })
    await t.client`update race_watch set watching_stage = 5, reached_s = 3000
                   where user_id = ${PLAYER} and race_key = ${OWN}`
    const h = await computeHorizon(t.db, me(PLAYER), day())
    expect(stagesOf(h, OWN)).toEqual([5, 6, 7])
    expect(isVeiled(h, OWN, 5)).toBe(true)
    expect(h.watching.get(OWN)).toEqual({ stageDay: 5, reachedS: 3000 })
  })

  it('meta por modo: llegar a la meta con play, summary, digest y seek escribe W, S, S y R', async () => {
    const modes = ['play', 'summary', 'digest', 'seek'] as const
    for (const [i, mode] of modes.entries()) {
      const key = k(OTHER, `race-meta-${i}:s0`)
      await recordProgress(t.db, key, 1, 100, mode, 4000)
      const r = await recordProgress(t.db, key, 1, 4000, mode, 4000)
      expect(r.status).toBe('known')
      expect(await readWatch(t.db, key)).toMatchObject({
        knownThrough: 1,
        how: LETTER_OF_MODE[mode],
        watchingStage: null,
        reachedS: null,
      })
    }
    expect(modes.map((m) => LETTER_OF_MODE[m])).toEqual(['W', 'S', 'S', 'R'])
    // Volver a ver una etapa conocida no mueve nada.
    const key = k(OTHER, 'race-meta-0:s0')
    const before = await rev(OTHER)
    expect(await recordProgress(t.db, key, 1, 50, 'play', 4000)).toEqual({
      status: 'known',
      horizonRev: before,
      followed: false,
    })
    expect((await readWatch(t.db, key))?.how).toBe('W')
  })

  it('caducidad: velada el día D + 55 y no el D + 56; la que está a medio correr no caduca nunca', async () => {
    const expiry = OWN_LAST_DAY + SPOILER.expiryGameDays
    const h55 = await computeHorizon(t.db, me(PLAYER), at(expiry - 1))
    expect(stagesOf(h55, OWN)).toEqual([1, 2, 3, 4, 5, 6, 7])
    const h56 = await computeHorizon(t.db, me(PLAYER), at(expiry))
    expect(stagesOf(h56, OWN)).toEqual([])
    expect(h56.knownThrough.has(OWN)).toBe(false)
    // race-emirates solo ha corrido tres de sus siete etapas: en curso, nunca caduca.
    const halfLast = stageDayOfSeason(race('race-emirates'), 7)
    const h100 = await computeHorizon(t.db, me(PLAYER), at(halfLast + 100))
    expect(stagesOf(h100, HALF)).toEqual([1, 2, 3])
  })

  it('acuse: la caducada sale en expiredSinceLastVisit y, con revealStage expired, X en todas las que faltaban', async () => {
    const expired = at(OWN_LAST_DAY + SPOILER.expiryGameDays)
    await row(PLAYER, OWN, { known_through: 2, how: 'WW' })
    const toGo = async () => 0
    const s1 = await horizonSummary(t.db, me(PLAYER), expired, toGo)
    expect(s1.expiredSinceLastVisit).toContain(OWN)
    expect(s1.ready.map((r) => r.raceKey)).not.toContain(OWN)
    await revealStage(t.db, k(PLAYER, OWN), 7, true)
    expect(await readWatch(t.db, k(PLAYER, OWN))).toMatchObject({
      knownThrough: 7,
      how: 'WWXXXXX',
    })
    const s2 = await horizonSummary(t.db, me(PLAYER), expired, toGo)
    expect(s2.expiredSinceLastVisit).not.toContain(OWN)
  })

  it('fuentes y alcances: la guardia exacta de §10.4; soltar gana a todo; off no guarda nada', async () => {
    // El mánager: la catalana y la ajena, por su equipo; la de cabecera, por ser de cabecera.
    const m = await computeHorizon(t.db, me(MANAGER), day())
    expect(new Set(m.veil.map((v) => `${v.raceKey}:${v.reason}`))).toEqual(
      new Set([`${OWN}:own_team`, `${FOREIGN}:own_team`, `${HEADLINE}:headline`]),
    )
    // El jugador: own_rider manda sobre own_team y sobre follow.
    await row(PLAYER, OWN, { follow: 1 })
    await row(PLAYER, FOREIGN, { follow: 1 })
    clearHorizonCaches()
    const p = await computeHorizon(t.db, me(PLAYER), day())
    expect(tags(p, OWN)[0]).toBe(`${OWN}#1:own_rider`)
    expect(tags(p, FOREIGN)[0]).toBe(`${FOREIGN}#1:follow`)
    // Soltar gana a todo: la suya y la de cabecera, fuera.
    await setFollow(t.db, k(PLAYER, OWN), -1)
    await setFollow(t.db, k(PLAYER, HEADLINE), -1)
    const dropped = await computeHorizon(t.db, me(PLAYER), day())
    expect(stagesOf(dropped, OWN)).toEqual([])
    expect(stagesOf(dropped, HEADLINE)).toEqual([])
    expect(stagesOf(dropped, FOREIGN)).toEqual([1, 2, 3, 4, 5, 6, 7])
    // own_only: sin las de cabecera; off: nada en guardia, nada velado.
    await setFollow(t.db, k(PLAYER, OWN), 0)
    await setSpoilerScope(t.db, PLAYER, 'own_only', undefined)
    const ownOnly = await computeHorizon(t.db, me(PLAYER), day())
    expect(new Set(ownOnly.veil.map((v) => v.raceKey))).toEqual(new Set([OWN, FOREIGN, HALF]))
    await setSpoilerScope(t.db, PLAYER, 'off', false)
    const off = await computeHorizon(t.db, me(PLAYER), day())
    expect(off.veil).toEqual([])
    expect(off.knownThrough.size).toBe(0)
    const [prefs] =
      await t.client`select spoiler_scope, reveal_confirm from users where id = ${PLAYER}`
    expect(prefs).toEqual({ spoiler_scope: 'off', reveal_confirm: false })
  })

  it('setSpoilerScope sube horizon_rev solo si cambia el alcance; setFollow, solo si cambia follow', async () => {
    const r0 = await rev(OTHER)
    expect((await setSpoilerScope(t.db, OTHER, 'guarded', true)).horizonRev).toBe(r0)
    expect((await setSpoilerScope(t.db, OTHER, 'own_only', undefined)).horizonRev).toBe(r0 + 1)
    expect((await setFollow(t.db, k(OTHER, FOREIGN), 0)).horizonRev).toBe(r0 + 1)
    expect((await setFollow(t.db, k(OTHER, FOREIGN), 1)).horizonRev).toBe(r0 + 2)
    expect(await readWatch(t.db, k(OTHER, FOREIGN))).toMatchObject({ follow: 1, knownThrough: 0 })
  })

  /**
   * LA TEMPORADA ANTERIOR (§10.4: se busca en la actual y en la anterior). El diseño lo monta con una
   * propia acabada 40 días de juego antes, pero con el calendario de la v91 no existe: la última etapa
   * del año es el día 307 y 307 + 56 < 364, así que toda carrera de la temporada pasada ya ha caducado
   * al empezar la nueva. Se monta con una de la temporada pasada a medio correr, que no caduca, mirada
   * desde el día 10 de la temporada 1: la consulta 2 la encuentra por `%:s0` y el mapa del día, también.
   */
  it('temporada anterior: la propia de la temporada pasada sigue en guardia y velada, con su día de juego', async () => {
    const lastDay = Math.max(...SEASON_CALENDAR.map((r) => stageDayOfSeason(r, r.stages.length)))
    expect(lastDay + SPOILER.expiryGameDays).toBeLessThan(DAYS_PER_SEASON)
    await run(LAST_SEASON, [1, 2, 3])
    try {
      const h = await computeHorizon(t.db, me(PLAYER), at(DAYS_PER_SEASON + 10))
      expect(tags(h, LAST_SEASON)).toEqual([1, 2, 3].map((s) => `${LAST_SEASON}#${s}:own_rider`))
      expect(h.veil.find((v) => v.raceKey === LAST_SEASON)?.gameDay).toBe(
        stageDayOfSeason(race('race-langkawi'), 1),
      )
      // Las de la temporada 0 ya caducadas no velan nada en la 1.
      expect(stagesOf(h, OWN)).toEqual([])
      expect(stagesOf(h, HEADLINE)).toEqual([])
    } finally {
      await t.client`delete from stage_snapshots where race_id = ${LAST_SEASON}`
    }
  })

  it('vuelta de prueba: su corredor en test-tour no la pone nunca en guardia', async () => {
    await row(PLAYER, TEST_TOUR, { follow: 1 })
    const h = await computeHorizon(t.db, me(PLAYER), day())
    expect(stagesOf(h, TEST_TOUR)).toEqual([])
    expect(h.knownThrough.has(TEST_TOUR)).toBe(false)
    expect(stageGameDay(TEST_TOUR, 1)).toBe(1) // sin temporada, el número de etapa
  })

  it('el memo: la segunda llamada del mismo minuto solo hace la consulta 1; tras revelar, cambia el rev', async () => {
    const counted = countingDb(t.db)
    const h1 = await computeHorizon(counted.db, me(PLAYER), day())
    const first = counted.calls()
    // La 1, la 2 y la 3 juntas en una sentencia (B14, 16-k), y el mapa del día. RE-SELLADO: eran 4
    // antes de juntar la 2 y la 3.
    expect(first).toBe(3)
    const h2 = await computeHorizon(counted.db, me(PLAYER), day())
    expect(counted.calls() - first).toBe(1)
    expect(h2).toBe(h1)
    // En lectura (cs_viewer), el mismo velo con readOnly.
    const ro = await computeHorizon(counted.db, { userId: PLAYER, readOnly: true }, day())
    expect(ro.readOnly).toBe(true)
    expect(ro.veil).toEqual(h1.veil)
    await revealStage(t.db, k(PLAYER, OWN), 2, false)
    const before = counted.calls()
    const h3 = await computeHorizon(counted.db, me(PLAYER), day())
    // Otra clave: la 1, y la 2 y la 3 juntas (eran 3 antes de juntarlas); el mapa del día sigue.
    expect(counted.calls() - before).toBe(2)
    expect(h3.rev).not.toBe(h1.rev)
    expect(stagesOf(h3, OWN)).toEqual([3, 4, 5, 6, 7])
  })

  it('el mapa del día: una consulta por (mundo, día) para todos; el velo, el de la cuarta consulta por espectador (18-a)', async () => {
    await row(OTHER, FOREIGN, { follow: 1, known_through: 2, how: 'WR' })
    const counted = countingDb(t.db)
    const runs1 = lastRunStages(counted.db, day())
    expect(lastRunStages(counted.db, day())).toBe(runs1)
    const hp = await computeHorizon(counted.db, me(PLAYER), day())
    const ho = await computeHorizon(counted.db, me(OTHER), day())
    expect(counted.snapshotQueries()).toBe(1)
    for (const [userId, h] of [
      [PLAYER, hp],
      [OTHER, ho],
    ] as const)
      expect(tags(h).sort()).toEqual((await veilWithPerViewerRuns(t.db, userId, day())).sort())
    // El tick sube el día: el mapa se rehace una vez, y el memo del horizonte va por el día.
    const next = at(OWN_LAST_DAY + 1)
    expect(lastRunStages(counted.db, next)).not.toBe(runs1)
    await computeHorizon(counted.db, me(PLAYER), next)
    expect(counted.snapshotQueries()).toBe(2)
  })

  it('horizonSummary: ready por carrera y en orden, watching con los km a meta, y el rev del horizonte', async () => {
    await row(PLAYER, OWN, { known_through: 2, how: 'WW' })
    await t.client`update race_watch set watching_stage = 3, reached_s = 1200
                   where user_id = ${PLAYER} and race_key = ${OWN}`
    const asked: string[] = []
    const s = await horizonSummary(t.db, me(PLAYER), day(), async (raceKey, stageDay, reachedS) => {
      asked.push(`${raceKey}#${stageDay}@${reachedS}`)
      return 42.5
    })
    expect(s.rev).toBe(`${OWN_LAST_DAY}.0`)
    expect(s.scope).toBe('guarded')
    // La más antigua primero: la de cabecera (día 80) antes que la catalana (su etapa 3, día 84).
    expect(s.ready.map((r) => r.raceKey)).toEqual(
      [HEADLINE, OWN, HALF].sort((a, b) => {
        const first = (key: string) => stageGameDay(key, key === OWN ? 3 : 1)
        return first(a) - first(b)
      }),
    )
    const own = s.ready.find((r) => r.raceKey === OWN)!
    expect(own).toEqual({
      raceKey: OWN,
      raceName: race('race-catalonia').name,
      stages: [3, 4, 5, 6, 7],
      reason: 'own_rider',
      expiresOnDay: OWN_LAST_DAY + SPOILER.expiryGameDays,
    })
    expect(s.watching).toEqual([{ raceKey: OWN, stageDay: 3, reachedS: 1200, toGoKm: 42.5 }])
    expect(asked).toEqual([`${OWN}#3@1200`])
    expect(s.expiredSinceLastVisit).toEqual([])
  })

  it('touchLastSeen escribe como mucho una vez por hora: el memo evita la consulta y el where, la escritura', async () => {
    const counted = countingDb(t.db)
    const t0 = 1_000_000
    await touchLastSeen(counted.db, OTHER, t0)
    const [a] = await t.client<
      { at: string | null }[]
    >`select last_seen_at::text as at from users where id = ${OTHER}`
    expect(a!.at).not.toBeNull()
    const updates = counted.updates()
    await touchLastSeen(counted.db, OTHER, t0 + 59 * 60_000)
    expect(counted.updates()).toBe(updates) // dentro de la hora, ni la consulta
    clearHorizonCaches() // otro proceso: el where no deja escribir dentro de la hora
    await touchLastSeen(t.db, OTHER, t0 + 60 * 60_000)
    const [b] = await t.client<
      { at: string | null }[]
    >`select last_seen_at::text as at from users where id = ${OTHER}`
    expect(b!.at).toBe(a!.at)
  })

  /**
   * EL PREDICADO (§10.6, punto 3; D-32, 10-d; el caso de B12 de §10.14, paso 8a): `veilSql` es la ÚNICA
   * forma de escribir el corte en SQL. Con el velo vacío, `false`; una fila con `stage_day` casa por su
   * etapa (y el día de juego no cuenta); una vieja, de antes de la 0049 y con `stage_day` nulo, por su
   * día de juego. Las dos firmas de 10-d: sin `stage_day` (el abandono, que guarda un día de juego) y
   * sin día de juego (`stage_team_results`). Y `palmares`, cuya `race_id` va sin temporada.
   */
  it('el predicado: velo vacío, fila con stage_day y fila vieja con stage_day nulo (veilSql, 10-d)', async () => {
    const g = (s: number): number => stageGameDay(OWN, s)
    const h: Horizon = {
      ...worldHorizon,
      kind: 'viewer',
      userId: PLAYER,
      rev: '1.1',
      veil: [3, 4].map((s) => ({ raceKey: OWN, stageDay: s, gameDay: g(s), reason: 'own_rider' })),
    }
    // rider_points: la clave CON temporada en race_id, y stage_day desde la 0049.
    for (const [kind, raceKey, gameDay, stageDay] of [
      ['nueva-velada', OWN, g(3), 3],
      ['nueva-vista', OWN, g(2), 2],
      ['vieja-velada', OWN, g(3), null],
      ['vieja-vista', OWN, g(2), null],
      ['otra-carrera', FOREIGN, g(3), 3],
      ['manda-la-etapa', OWN, g(2), 4], // con stage_day, el día de juego no cuenta
    ] as const)
      await t.client`insert into rider_points (rider_id, game_day, points, race_id, kind, stage_day)
                     values (${PLAYER_RIDER}, ${gameDay}, 1, ${raceKey}, ${kind}, ${stageDay})`
    const puntos = async (hh: Horizon, velados: boolean): Promise<string[]> => {
      const pred = veilSql(hh, riderPoints.raceId, riderPoints.gameDay, riderPoints.stageDay)
      const rows = await t.db
        .select({ kind: riderPoints.kind })
        .from(riderPoints)
        .where(velados ? pred : not(pred))
      return rows.map((r) => r.kind).sort()
    }
    expect(await puntos(h, true)).toEqual(['manda-la-etapa', 'nueva-velada', 'vieja-velada'])
    expect(await puntos(h, false)).toEqual(['nueva-vista', 'otra-carrera', 'vieja-vista'])
    for (const vacio of [worldHorizon, anonHorizon()]) {
      expect(await puntos(vacio, true)).toEqual([])
      expect((await puntos(vacio, false)).length).toBe(6)
    }
    // Sin stage_day: el abandono guarda un día de juego (`race_rosters.abandoned_day`).
    await t.client`update race_rosters set abandoned_day = ${g(4)}
                   where race_id = ${OWN} and rider_id = ${TEAM_RIDER_OWN}`
    const abandonos = await t.db
      .select({ riderId: raceRosters.riderId })
      .from(raceRosters)
      .where(veilSql(h, raceRosters.raceId, raceRosters.abandonedDay))
    expect(abandonos).toEqual([{ riderId: TEAM_RIDER_OWN }])
    // Sin día de juego: stage_team_results va por su etapa.
    const [team] = await t.client<{ id: string }[]>`select id from teams limit 1`
    for (const s of [2, 3])
      await t.client`insert into stage_team_results (race_id, stage_day, team_id) values (${OWN}, ${s}, ${team!.id})`
    const deEquipo = await t.db
      .select({ s: stageTeamResults.stageDay })
      .from(stageTeamResults)
      .where(veilSql(h, stageTeamResults.raceId, null, stageTeamResults.stageDay))
    expect(deEquipo).toEqual([{ s: 3 }])
    // palmares: race_id SIN temporada, que va en `season`; la clave se compone en SQL (§10.6).
    for (const [detail, stageDay] of [
      ['Stage 3', 3],
      ['Stage 2', 2],
      ['vieja', null],
    ] as const)
      await t.client`insert into palmares (world_id, rider_id, season, race_id, race_name, kind, detail, game_day, stage_day)
                     values (${worldId}, ${PLAYER_RIDER}, 0, 'race-catalonia', 'Catalonia', 'stage', ${detail},
                             ${stageDay === null ? g(4) : g(stageDay)}, ${stageDay})`
    const honores = await t.db
      .select({ d: palmares.detail })
      .from(palmares)
      .where(
        veilSql(
          h,
          sql`${palmares.raceId} || ':s' || ${palmares.season}`,
          palmares.gameDay,
          palmares.stageDay,
        ),
      )
    expect(honores.map((r) => r.d).sort()).toEqual(['Stage 3', 'vieja'])
    await t.client`delete from rider_points`
    await t.client`delete from palmares`
    await t.client`delete from stage_team_results`
    await t.client`update race_rosters set abandoned_day = null`
  })

  /**
   * LAS LISTAS DEL VELO, CADA UNA UN PARÁMETRO (10-d). Una lista tal cual dentro de `sql`, drizzle-orm
   * 0.45.2 la expande a `($1, $2)` y el `::text[]` falla («Failed query», medido en PGlite y con
   * postgres-js); con `sql.param` sale `$1::text[]`. Con una sola etapa también: es el caso en que la
   * expansión no se nota hasta que llega la segunda.
   */
  it('veilSql enlaza cada lista del velo como UN parámetro de tipo array; con el velo vacío, false', async () => {
    const dialect = (
      t.db as unknown as {
        dialect: { sqlToQuery(s: unknown): { sql: string; params: unknown[] } }
      }
    ).dialect
    const de = (veil: readonly VeiledStage[]): Horizon => ({ ...worldHorizon, veil })
    const una = de([{ raceKey: OWN, stageDay: 3, gameDay: 85, reason: 'follow' }])
    const dos = de([...una.veil, { raceKey: HALF, stageDay: 2, gameDay: 20, reason: 'follow' }])
    for (const [hh, n] of [
      [una, 1],
      [dos, 2],
    ] as const) {
      const q = dialect.sqlToQuery(
        veilSql(hh, riderPoints.raceId, riderPoints.gameDay, riderPoints.stageDay),
      )
      expect(q.sql).toMatch(/unnest\(\$1::text\[\], \$2::int\[\], \$3::int\[\]\) as w\(k, d, s\)/)
      expect(q.params).toHaveLength(3)
      expect(q.params.every((p) => Array.isArray(p) && p.length === n)).toBe(true)
      // y corre: la consulta no falla
      await expect(
        t.db
          .select({ id: riderPoints.id })
          .from(riderPoints)
          .where(veilSql(hh, riderPoints.raceId, riderPoints.gameDay, riderPoints.stageDay)),
      ).resolves.toEqual([])
    }
    expect(
      dialect.sqlToQuery(
        veilSql(worldHorizon, riderPoints.raceId, riderPoints.gameDay, riderPoints.stageDay),
      ),
    ).toEqual({ sql: 'false', params: [] })
  })

  /** Lo que §10.14 pone en otros PR, aquí para que encenderlo sea quitar el `todo` (regla 1 de §17.1). */
  it.todo(
    'la retirada voluntaria en el día de una etapa velada no entra en VeilDelta.abandons (8b, 10-i)',
  )
  it.todo(
    'la cuenta del día (8b, 11-s): veinte peticiones a la vez el día nuevo hacen una sola cuenta',
  )
})

/** B12 · el memo con tope (10-m), con el reloj inyectado: sin base. */
describe('TtlMemo (§10.7, 10-m)', () => {
  const LIFE = SPOILER.horizonMemoS * 1000
  const MAX = SPOILER.horizonMemoEntries

  it('mil claves distintas en un minuto nunca pasan del tope; la más antigua sale primero', () => {
    const m = new TtlMemo<number>(LIFE, MAX)
    for (let i = 0; i < 1000; i++) {
      m.set(`u${i}`, i, i * 50) // mil claves en 50 s
      expect(m.size).toBeLessThanOrEqual(MAX)
    }
    expect(m.size).toBe(MAX)
    expect(m.get('u0', 50_000)).toBeUndefined() // fuera por el tope
    expect(m.get('u999', 50_000)).toBe(999)
  })

  it('una entrada caducada se borra al leerla; dos días de juego son dos claves', () => {
    const m = new TtlMemo<string>(LIFE, MAX)
    m.set('u|100|0', 'día 100', 0)
    m.set('u|101|0', 'día 101', 1)
    expect(m.size).toBe(2)
    expect(m.get('u|100|0', LIFE - 1)).toBe('día 100')
    expect(m.get('u|100|0', LIFE)).toBeUndefined()
    expect(m.size).toBe(1)
  })

  it('un set a los 61 s de la última petición deja solo su entrada: barre todas las caducadas', () => {
    const m = new TtlMemo<number>(LIFE, MAX)
    for (let i = 0; i < 300; i++) m.set(`u${i}`, i, i)
    expect(m.size).toBe(300) // sin peticiones nadie barre
    m.set('nueva', 1, 299 + 61_000)
    expect(m.size).toBe(1)
  })
})

/**
 * LA CARGA (D-55, 10-l y 10-m): la memoria de lo alcanzado decide cuándo se escribe. Siempre en una
 * etapa nueva y en la meta; si no, cuando lo alcanzado crece 60 s de carrera desde lo escrito y han
 * pasado 15 s de pared desde la última escritura. Y se barre a los 60 s sin informes, escribiendo
 * antes lo que faltaba. La ruta (`me.test.ts`) lo prueba también por la petición.
 */
describe('ProgressMemory (D-55, §10.3)', () => {
  let t: TestDb
  let worldId = ''
  const USER = idDe(950)
  const RACE = 'race-two-seas:s0'
  const key = (): WatchKey => ({ userId: USER, worldId, raceKey: RACE })
  const written = async () => readWatch(t.db, key())

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('memoria', 91) returning id`
    worldId = w!.id
    await t.client`insert into users (id, email, name) values (${USER}, 'memoria@example.com', 'M')`
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  beforeEach(async () => {
    await t.client`delete from race_watch`
  })

  it('el primer informe de una etapa escribe; los siguientes, con 60 s de carrera y 15 s de pared', async () => {
    const mem = new ProgressMemory()
    const e1 = await mem.report(t.db, key(), 2, 100.4, 'play', 9000, 0)
    expect(e1).toMatchObject({ status: 'watching', wrote: true })
    expect((await written())?.reachedS).toBe(100)
    // 15 s de pared pero solo 30 s de carrera: no escribe; lo recuerda, sin redondear.
    expect(await mem.report(t.db, key(), 2, 130.9, 'play', 9000, 15_000)).toEqual({
      status: 'watching',
      horizonRev: null,
      wrote: false,
    })
    expect(mem.reachedOf(key(), 2)).toBe(130.9)
    expect((await written())?.reachedS).toBe(100)
    // 60 s de carrera o más y 15 s de pared desde la última escritura: escribe.
    expect((await mem.report(t.db, key(), 2, 300.2, 'play', 9000, 16_000)).wrote).toBe(true)
    expect((await written())?.reachedS).toBe(300)
    expect(mem.reachedOf(key(), 3)).toBeNull()
    // 200 s de carrera pero solo 5 s de pared desde la última escritura: no escribe (10-l).
    expect((await mem.report(t.db, key(), 2, 500, 'play', 9000, 21_000)).wrote).toBe(false)
    expect(mem.reachedOf(key(), 2)).toBe(500)
  })

  it('el umbral de escritura es el de PROGRESS_MIN_DELTA_S si se da (15-j); si no, 60 s de carrera', async () => {
    expect(BROADCAST.progressMinDeltaS).toBe(60)
    const mem = new ProgressMemory({ minDeltaS: 600 })
    await mem.report(t.db, key(), 2, 100, 'play', 9000, 0)
    expect((await mem.report(t.db, key(), 2, 400, 'play', 9000, 60_000)).wrote).toBe(false)
    expect((await mem.report(t.db, key(), 2, 700, 'play', 9000, 75_000)).wrote).toBe(true)
  })

  it('la meta y la etapa nueva se escriben siempre; la conocida no escribe más', async () => {
    const mem = new ProgressMemory()
    await mem.report(t.db, key(), 2, 100, 'play', 9000, 0)
    const fin = await mem.report(t.db, key(), 2, 9000, 'summary', 9000, 1_000)
    expect(fin).toMatchObject({ status: 'known', wrote: true })
    expect(await written()).toMatchObject({ knownThrough: 2, how: 'AS', watchingStage: null })
    // Volver a verla: el primer informe consulta, los demás ni eso.
    expect(await mem.report(t.db, key(), 2, 50, 'play', 9000, 2_000)).toEqual({
      status: 'known',
      horizonRev: null,
      wrote: false,
    })
    // La etapa siguiente, aunque sea a 1 s de pared: estado nuevo.
    expect((await mem.report(t.db, key(), 3, 10, 'play', 9000, 3_000)).wrote).toBe(true)
    expect(await written()).toMatchObject({ knownThrough: 2, watchingStage: 3, reachedS: 10 })
  })

  it('sin informes en 60 s se barre, escribiendo antes lo que faltaba; forget la quita sin escribir', async () => {
    const errors: unknown[] = []
    const mem = new ProgressMemory({ onLateWriteError: (err) => errors.push(err) })
    await mem.report(t.db, key(), 2, 100, 'play', 9000, 0)
    await mem.report(t.db, key(), 2, 140.6, 'play', 9000, 1_000) // recordado, sin escribir
    expect((await written())?.reachedS).toBe(100)
    // Otro espectador informa 61 s después del último informe de este: la entrada se barre.
    const other: WatchKey = { userId: USER, worldId, raceKey: 'race-catalonia:s0' }
    await mem.report(t.db, other, 1, 10, 'play', 9000, 62_000)
    expect(mem.size).toBe(1)
    await expect.poll(async () => (await written())?.reachedS).toBe(140)
    expect(errors).toEqual([])
    mem.forget(other)
    expect(mem.size).toBe(0)
  })
})

/** Un `db` que cuenta sus `execute` (la consulta 1 sola en el memo) y los que leen stage_snapshots. */
function countingDb(db: Database): {
  readonly db: Database
  readonly calls: () => number
  readonly snapshotQueries: () => number
  readonly updates: () => number
} {
  let calls = 0
  let snapshots = 0
  let updates = 0
  const dialect = (db as unknown as { dialect: { sqlToQuery(s: unknown): { sql: string } } })
    .dialect
  const proxy = new Proxy(db, {
    get(target, prop, receiver) {
      const v: unknown = Reflect.get(target, prop, receiver)
      if (prop === 'execute' && typeof v === 'function')
        return (q: unknown) => {
          calls += 1
          if (dialect.sqlToQuery(q).sql.includes('stage_snapshots')) snapshots += 1
          return (v as (q: unknown) => unknown).call(target, q)
        }
      if (prop === 'update' && typeof v === 'function')
        return (...args: unknown[]) => {
          updates += 1
          return (v as (...a: unknown[]) => unknown).apply(target, args)
        }
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v
    },
  })
  return {
    db: proxy,
    calls: () => calls,
    snapshotQueries: () => snapshots,
    updates: () => updates,
  }
}

/**
 * EL VELO CON LA CUARTA CONSULTA POR ESPECTADOR (la forma B de §18.2), escrito aparte para comparar
 * con la D, que la hace una vez por día para todos (18-a): la guardia de §10.4 y, para sus carreras,
 * `max(stage_day)` de stage_snapshots en una consulta de este espectador.
 */
async function veilWithPerViewerRuns(db: Database, userId: string, w: WorldRef): Promise<string[]> {
  const season = Math.floor(w.currentDay / DAYS_PER_SEASON)
  const like = [`%:s${season}`, `%:s${season - 1}`]
  const scope = String(
    (await db.execute(sql`select spoiler_scope as s from users where id = ${userId}`))[0]?.s,
  )
  const own = await db.execute(sql`
    select rr.race_id as race_key,
           bool_or(r.user_id = ${userId}) as own_rider
    from race_rosters rr join riders r on r.id = rr.rider_id
    left join teams t on t.id = r.team_id
    where (r.user_id = ${userId} or t.owner_user_id = ${userId}) and r.retired_at is null
      and (rr.race_id like ${like[0]} or rr.race_id like ${like[1]})
    group by rr.race_id`)
  const rows = await db.execute(sql`
    select race_key, follow, known_through from race_watch
    where user_id = ${userId} and world_id = ${w.worldId}`)
  const guard = new Map<string, string>()
  if (scope !== 'off') {
    for (const o of own)
      guard.set(String(o.race_key), o.own_rider === true ? 'own_rider' : 'own_team')
    for (const r of rows)
      if (Number(r.follow) === 1 && !guard.has(String(r.race_key)))
        guard.set(String(r.race_key), 'follow')
    if (scope === 'guarded')
      for (const id of SPOILER.headlineRaces)
        for (const s of [season, season - 1])
          if (!guard.has(`${id}:s${s}`)) guard.set(`${id}:s${s}`, 'headline')
    for (const r of rows) if (Number(r.follow) === -1) guard.delete(String(r.race_key))
  }
  if (guard.size === 0) return []
  const runs = await db.execute(sql`
    select race_id, max(stage_day) as last from stage_snapshots
    where race_id = any(${sql.param([...guard.keys()])}::text[]) group by race_id`)
  const known = new Map(rows.map((r) => [String(r.race_key), Number(r.known_through)]))
  const out: string[] = []
  for (const r of runs) {
    const raceKey = String(r.race_id)
    const last = Number(r.last)
    const id = raceKey.replace(/:s\d+$/, '')
    const cal = SEASON_CALENDAR.find((x) => x.id === id)
    if (cal === undefined) continue
    const S = cal.stages.length
    if (last >= S && w.currentDay >= stageGameDay(raceKey, S) + SPOILER.expiryGameDays) continue
    for (let s = (known.get(raceKey) ?? 0) + 1; s <= last; s++)
      out.push(`${raceKey}#${s}:${guard.get(raceKey)}`)
  }
  return out
}
