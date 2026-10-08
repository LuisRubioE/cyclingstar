import {
  type Horizon,
  type StageRunSpec,
  type WatchRow,
  clearHorizonCaches,
  clearStageTimelineCache,
  gameState,
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
import {
  BASE_SEASON,
  SEASON_CALENDAR,
  type StageProfile,
  calendarForSeason,
  renderAltimetrySvg,
  stagesForSeason,
} from '@cyclingstar/engine'
import {
  ATTRIBUTES,
  BROADCAST,
  type SwitchMode,
  apiErrorBodySchema,
  stageReplaySchema,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AppDeps, buildApp } from './app.js'
import { clearAdaptedTimelineCache } from './broadcastSource.js'
import { stageAccessOf } from './spoiler.js'
import {
  frozenFromCalendar,
  raceRouteSource,
  stageCardRoute,
  stagePlanEntry,
} from './stageRoute.js'

/**
 * LA FICHA DE LA ETAPA ENSEÑA EL ORIGEN, LA FRASE Y LA EDICIÓN (docs/generador.md §10.8, §11.4 y
 * §15.12; D10 con su valor por defecto). Sin base: `frozen` es lo que `raceStagesForWorld` devuelve,
 * y aquí se construye a mano para poder trucarlo.
 */

describe('api: el origen y la edición de cada etapa', () => {
  it('temporada base: una real es real y sin ficha; ninguna generada lleva la frase vacía', () => {
    const cuenta = { real: 0, edicion: 0, generado: 0 }
    for (const race of SEASON_CALENDAR) {
      for (const st of race.stages) {
        const card = stageCardRoute(race.id, BASE_SEASON, frozenFromCalendar(st), null)
        cuenta[card.routeSource] += 1
        expect(card.edicion).toBe(1)
        expect(card.cambiosRespectoAnterior).toEqual([])
        if (card.routeSource === 'real') expect(card.arch).toBeNull()
        else {
          expect(card.arch?.frase.length ?? 0).toBeGreaterThan(0)
          expect(card.arch?.skeleton).toBe(st.arch?.skeleton)
          expect(card.arch?.geo).toBe(st.arch?.geo)
        }
      }
    }
    expect(cuenta.real).toBeGreaterThan(0)
    expect(cuenta.edicion).toBeGreaterThan(0)
    expect(cuenta.generado).toBeGreaterThan(0)
  })

  it('la ficha no promete física que el motor no hace (decisión 17)', () => {
    for (const race of SEASON_CALENDAR)
      for (const st of race.stages) {
        const frase = st.arch?.frase ?? ''
        for (const palabra of [
          'abanico',
          'oxígeno',
          'hipoxia',
          'falta de aire',
          'echelon',
          'crosswind',
          'oxygen',
          'hypoxia',
        ])
          expect(frase).not.toContain(palabra)
      }
  })

  it('temporada 1: edición 2 y cambios solo en lo generado', () => {
    let conCambios = 0
    for (const race of calendarForSeason(1)) {
      const anteriores = stagesForSeason(race.id, 0)
      for (const [i, st] of race.stages.entries()) {
        const card = stageCardRoute(
          race.id,
          1,
          frozenFromCalendar(st),
          frozenFromCalendar(anteriores[i]!),
        )
        expect(card.edicion).toBe(2)
        if (st.routeSource !== 'generado') expect(card.cambiosRespectoAnterior).toEqual([])
        else if (card.cambiosRespectoAnterior.length > 0) conCambios += 1
      }
    }
    // La edición mueve el km (± 6 %), las vueltas y la opción de final: algo tiene que anunciarse.
    expect(conCambios).toBeGreaterThan(0)
  })

  it('una fila congelada sin arch (anterior a la columna) toma la ficha de la edición', () => {
    const race = SEASON_CALENDAR.find((r) => r.stages.every((s) => s.routeSource === 'generado'))!
    const st = race.stages[0]!
    const card = stageCardRoute(race.id, 0, { ...frozenFromCalendar(st), arch: null }, null)
    expect(card.arch?.frase).toBe(st.arch?.frase)
  })

  it('el agregado de carrera sigue la regla de raceRouteSourceOf', () => {
    for (const race of SEASON_CALENDAR) expect(raceRouteSource(race.stages)).toBe(race.routeSource)
  })
})

describe('api: la altimetría de una etapa no corrida es la del mundo', () => {
  const race = SEASON_CALENDAR.find(
    (r) => r.stages.length >= 3 && r.stages.every((s) => s.routeSource === 'generado'),
  )!
  const trucado: StageProfile = {
    segments: [
      { km: 60, tipo: 'llano' },
      { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 8 }] },
    ],
  }

  it('lee el congelado y no la temporada 0 (run?.profile ?? frozen.profile)', () => {
    const deLaTemporada = stagesForSeason(race.id, 1)[1]!
    const frozen = { ...frozenFromCalendar(deLaTemporada), profile: trucado }
    const entry = stagePlanEntry({
      raceId: race.id,
      season: 1,
      deLaTemporada,
      frozen,
      anterior: frozenFromCalendar(stagesForSeason(race.id, 0)[1]!),
      run: undefined,
    })
    expect(entry.altimetry).toBe(renderAltimetrySvg(trucado))
    expect(entry.km).toBe(70)
    expect(entry.edicion).toBe(2)
    expect(entry.routeSource).toBe('generado')
  })

  it('sin congelar, la edición de la temporada del mundo', () => {
    const deLaTemporada = stagesForSeason(race.id, 1)[0]!
    const entry = stagePlanEntry({
      raceId: race.id,
      season: 1,
      deLaTemporada,
      frozen: frozenFromCalendar(deLaTemporada),
      anterior: null,
      run: undefined,
    })
    expect(entry.altimetry).toBe(renderAltimetrySvg(deLaTemporada.profile))
    expect(entry.arch?.frase).toBe(deLaTemporada.arch?.frase)
    // De dónde a dónde: las ciudades de la etapa de la temporada, siempre presentes.
    expect({ from: entry.from, to: entry.to }).toEqual({
      from: deLaTemporada.from,
      to: deLaTemporada.to,
    })
    expect(entry.from).toBeTruthy()
  })

  it('lo corrido manda sobre lo congelado', () => {
    const deLaTemporada = stagesForSeason(race.id, 1)[0]!
    const entry = stagePlanEntry({
      raceId: race.id,
      season: 1,
      deLaTemporada,
      frozen: frozenFromCalendar(deLaTemporada),
      anterior: null,
      run: { profile: trucado, timeTrial: false, km: 70 },
    })
    expect(entry.altimetry).toBe(renderAltimetrySvg(trucado))
  })
})

// ================================================= la ruta de etapa cerrada (E2, paso 7b; §14.1)

const KEY = 'race-france:s0'
/** El horizonte de un espectador con esas etapas de `race-france` en el velo. */
const viewerWith = (veil: readonly number[]): Horizon => ({
  ...worldHorizon,
  kind: 'viewer',
  userId: 'u',
  readOnly: false,
  rev: '200.1',
  veil: veil.map((stageDay) => ({ raceKey: KEY, stageDay, gameDay: 0, reason: 'own_rider' })),
})
/** Una fila de race_watch con esas letras. */
const watchRow = (how: string, over: Partial<WatchRow> = {}): WatchRow => ({
  follow: 1,
  knownThrough: how.length,
  how,
  watchingStage: null,
  reachedS: null,
  ...over,
})

/**
 * QUÉ SIRVE LA RUTA DE ETAPA (docs/retransmision.md §14.1, decisiones 14-e, 10-e y 6-r; paso 7b): el
 * resultado solo si la pantalla lo va a enseñar, que no es lo mismo que «si la etapa no está velada».
 */
describe('stageAccessOf · el resultado solo si la pantalla lo va a enseñar (§14.1, 14-e)', () => {
  const base = {
    h: worldHorizon,
    applies: true,
    watchOn: true,
    row: null,
    raceKey: KEY,
    day: 3,
    run: true,
  }

  it('sin SPOILER_MODE para quien pide, el producto de hoy: todo y sin watch (§10.13)', () => {
    expect(stageAccessOf({ ...base, applies: false, h: viewerWith([3]) })).toEqual({
      serveResult: true,
      watch: undefined,
    })
  })

  it('las letras: W, S y R se han visto y se sirven; A es conocida y abre en Watch (6-r); X no es conocida (10-e)', () => {
    for (const letter of ['W', 'S', 'R'])
      expect(stageAccessOf({ ...base, row: watchRow(`WW${letter}`) }), letter).toEqual({
        serveResult: true,
        watch: { known: true, reachedS: null, gate: null, seen: true },
      })
    const dragged = { ...base, row: watchRow('WWA') }
    expect(stageAccessOf(dragged)).toEqual({
      serveResult: false,
      watch: { known: true, reachedS: null, gate: null, seen: false },
    })
    // sin Watch que abrir, la arrastrada y la caducada se sirven: el acta de siempre
    expect(stageAccessOf({ ...dragged, watchOn: false }).serveResult).toBe(true)
    const expired = { ...base, row: watchRow('WWX') }
    expect(stageAccessOf(expired)).toEqual({
      serveResult: false,
      watch: { known: false, reachedS: null, gate: null, seen: false },
    })
    expect(stageAccessOf({ ...expired, watchOn: false }).serveResult).toBe(true)
  })

  it('velada, nunca, con su puerta; a medias, con lo alcanzado; con una anterior velada, previous_unseen (10-j)', () => {
    const half = {
      ...base,
      h: viewerWith([3]),
      row: watchRow('WW', { watchingStage: 3, reachedS: 3000 }),
    }
    for (const watchOn of [true, false])
      expect(stageAccessOf({ ...half, watchOn })).toEqual({
        serveResult: false,
        watch: { known: false, reachedS: 3000, gate: { k: 'not_seen' }, seen: false },
      })
    expect(stageAccessOf({ ...base, h: viewerWith([2, 3]), row: watchRow('W') }).watch).toEqual({
      known: false,
      reachedS: null,
      gate: { k: 'previous_unseen', firstUnseen: 2 },
      seen: false,
    })
  })

  it('fuera de guardia o el visitante: fuera del velo, abre en Watch si lo hay y, si no, el acta de siempre', () => {
    expect(stageAccessOf(base)).toEqual({
      serveResult: false,
      watch: { known: false, reachedS: null, gate: null, seen: false },
    })
    expect(stageAccessOf({ ...base, watchOn: false }).serveResult).toBe(true)
  })

  it('sin correr no hay resultado que servir, y la puerta de la anterior viaja igual', () => {
    expect(stageAccessOf({ ...base, run: false, watchOn: false }).serveResult).toBe(false)
    expect(stageAccessOf({ ...base, run: false, h: viewerWith([2]) }).watch?.gate).toEqual({
      k: 'previous_unseen',
      firstUnseen: 2,
    })
  })
})

const RACE_ID = 'race-france'
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
const SEED = 'etapa-cerrada'
const FIELD = 12
const idDe = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const OWN_RIDER = idDe(0)
const PLAYER = idDe(900)
const ADMIN = idDe(902)
const TEAM_IDS = [idDe(100), idDe(101)]
const dayOf = (stageDay: number): number => RACE.startDay + stageDay - 1
const STAGE_URL = `/api/races/${RACE_ID}/stages`
/** Los opcionales de resultado de `StageReplay` (§14.1, regla 1): la ficha sin resultado no lleva ninguno. */
const RESULT_KEYS = [
  'results',
  'chronicle',
  'gc',
  'kom',
  'points',
  'teamStage',
  'teamGc',
  'radio',
  'leaders',
  'journalUnavailable',
] as const

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

/**
 * LA RUTA DE ETAPA CERRADA, sobre PGlite (§14.1, §14.2 y §11.15; D-40, D-50; 14-e, 11-h; paso 7b). La 1
 * (la crono) y la 2 de `race-france` corridas como las corre el tick (la 2 con su línea), y el día en la
 * 3, sin correr. El jugador tiene su corredor en la carrera (en guardia por `own_rider`); el
 * administrador la tiene en guardia por ser de cabecera. Lo visto se escribe a mano en `race_watch`, y
 * cada escritura sube `horizon_rev` para que el memo del horizonte no la tape (§10.7).
 */
describe('la ruta de etapa cerrada sobre una etapa corrida (§14.1; 7b)', () => {
  let t: TestDb
  let worldId = ''
  const apps: ReturnType<typeof buildApp>[] = []
  const poolBefore = process.env.DB_POOL_MAX

  const appWith = (
    spoilerMode: SwitchMode,
    broadcastWatch: SwitchMode = 'on',
  ): ReturnType<typeof buildApp> => {
    const app = buildApp({
      db: t.db,
      auth: headerAuth(),
      serveWeb: false,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      switches: { broadcastWatch, spoilerMode },
    })
    apps.push(app)
    return app
  }

  beforeAll(async () => {
    // PGlite admite UNA sesión (testDb.ts), y la ruta de etapa lanza consultas a la vez.
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    clearStageTimelineCache()
    clearAdaptedTimelineCache()
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
    await t.db
      .insert(raceRosters)
      .values(
        Array.from({ length: FIELD }, (_, i) => ({ raceId: KEY, riderId: idDe(i), bib: i + 1 })),
      )
    for (const stageDay of [1, 2]) {
      const timeline = stageDay === 2 ? timelineTickLog() : undefined
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
      .values({ worldId, currentDay: dayOf(3), lastProcessedDay: dayOf(3) })
  }, 180_000)

  afterAll(async () => {
    for (const app of apps) await app.close()
    await t?.close()
    clearStageTimelineCache()
    clearAdaptedTimelineCache()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  const get = (app: ReturnType<typeof buildApp>, url: string, user?: string) =>
    app.inject({ method: 'GET', url, headers: user ? { 'x-test-user': user } : {} })

  /** Lo visto de una cuenta, escrito a mano (null: sin fila); sube `horizon_rev`, como toda escritura de lo visto. */
  async function setWatch(user: string, row: WatchRow | null): Promise<void> {
    await t.client`delete from race_watch where user_id = ${user}`
    if (row !== null)
      await t.client`insert into race_watch (user_id, world_id, race_key, follow, known_through, how, watching_stage, reached_s)
        values (${user}, ${worldId}, ${KEY}, ${row.follow}, ${row.knownThrough}, ${row.how}, ${row.watchingStage}, ${row.reachedS})`
    await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${user}`
  }

  /** La ficha de hoy, la entera: la que sirve la ruta con SPOILER_MODE apagado. */
  const todayOf = async (day: number, user?: string): Promise<string> => {
    const res = await get(appWith('off'), `${STAGE_URL}/${day}`, user)
    expect(res.statusCode).toBe(200)
    return res.body
  }

  it('la etapa velada: la ficha sin los opcionales de resultado ni leaders, la altimetría sin marcas y watch con la puerta (14-e)', async () => {
    await setWatch(PLAYER, watchRow('W'))
    const res = await get(appWith('on'), `${STAGE_URL}/2`, PLAYER)
    expect(res.statusCode).toBe(200)
    const veiled = stageReplaySchema.parse(res.json())
    const today = stageReplaySchema.parse(JSON.parse(await todayOf(2, PLAYER)))
    for (const key of RESULT_KEYS) expect(Object.keys(veiled), key).not.toContain(key)
    expect(veiled.watch).toEqual({
      known: false,
      reachedS: null,
      gate: { k: 'not_seen' },
      seen: false,
    })
    // lo que no depende del desenlace, igual que en la ficha de hoy
    for (const key of [
      'day',
      'name',
      'km',
      'run',
      'race',
      'from',
      'to',
      'kind',
      'timeTrial',
    ] as const)
      expect(veiled[key], key).toEqual(today[key])
    // la altimetría del recorrido corrido, sin marcas: la de hoy lleva las de los sucesos (sup. E7)
    expect(veiled.altimetry).toBe(renderAltimetrySvg(specOf(2).profile))
    expect(today.altimetry).not.toBe(veiled.altimetry)
    // y la respuesta no se guarda para otra cuenta (§14.9)
    expect(res.headers['cache-control']).toBe('private, no-store')
    expect(String(res.headers.vary)).toContain('Cookie')
  })

  it('la vista (W): la ficha de hoy entera, con watch conocida y vista', async () => {
    await setWatch(PLAYER, watchRow('WW'))
    const res = await get(appWith('on'), `${STAGE_URL}/2`, PLAYER)
    expect(res.json()).toEqual({
      ...(JSON.parse(await todayOf(2, PLAYER)) as object),
      watch: { known: true, reachedS: null, gate: null, seen: true },
    })
  })

  it('la arrastrada (A): conocida y sin ver; con Watch abre en Watch, sin resultado, y sin él, el acta de siempre (6-r)', async () => {
    await setWatch(PLAYER, watchRow('WA'))
    const watch = { known: true, reachedS: null, gate: null, seen: false }
    const on = stageReplaySchema.parse((await get(appWith('on'), `${STAGE_URL}/2`, PLAYER)).json())
    expect(on.results).toBeUndefined()
    expect(on.watch).toEqual(watch)
    const off = await get(appWith('on', 'off'), `${STAGE_URL}/2`, PLAYER)
    expect(off.json()).toEqual({ ...(JSON.parse(await todayOf(2, PLAYER)) as object), watch })
  })

  it('a medias: sigue velada y watch lleva lo alcanzado', async () => {
    await setWatch(PLAYER, watchRow('W', { watchingStage: 2, reachedS: 3000 }))
    const veiled = stageReplaySchema.parse(
      (await get(appWith('on'), `${STAGE_URL}/2`, PLAYER)).json(),
    )
    expect(veiled.results).toBeUndefined()
    expect(veiled.watch).toEqual({
      known: false,
      reachedS: 3000,
      gate: { k: 'not_seen' },
      seen: false,
    })
  })

  it('con la anterior velada, previous_unseen; y la etapa sin correr lleva la misma puerta y su ficha de siempre', async () => {
    await setWatch(PLAYER, null)
    const app = appWith('on')
    const gate = { k: 'previous_unseen', firstUnseen: 1 }
    const two = stageReplaySchema.parse((await get(app, `${STAGE_URL}/2`, PLAYER)).json())
    expect(two.results).toBeUndefined()
    expect(two.watch).toEqual({ known: false, reachedS: null, gate, seen: false })
    const three = await get(app, `${STAGE_URL}/3`, PLAYER)
    expect(three.json()).toEqual({
      ...(JSON.parse(await todayOf(3, PLAYER)) as object),
      watch: { known: false, reachedS: null, gate, seen: false },
    })
    expect(stageReplaySchema.parse(three.json()).run).toBe(false)
  })

  it('el visitante: sin velo; con Watch abre en Watch, sin resultado, y sin él, el acta de siempre (D-36)', async () => {
    const watch = { known: false, reachedS: null, gate: null, seen: false }
    const on = stageReplaySchema.parse((await get(appWith('on'), `${STAGE_URL}/2`)).json())
    expect(on.results).toBeUndefined()
    expect(on.watch).toEqual(watch)
    const off = await get(appWith('on', 'off'), `${STAGE_URL}/2`)
    expect(off.json()).toEqual({ ...(JSON.parse(await todayOf(2)) as object), watch })
  })

  it('SPOILER_MODE apagado, o en admins para quien no lo es: la ficha de hoy, byte a byte, sin watch (§10.13)', async () => {
    await setWatch(PLAYER, watchRow('W'))
    const today = await todayOf(2, PLAYER)
    expect(JSON.parse(today)).not.toHaveProperty('watch')
    expect((await get(appWith('admins'), `${STAGE_URL}/2`, PLAYER)).body).toBe(today)
  })

  it('?season= abre la etapa de esa temporada; sin él, la de hoy; uno que no vale, 400 (§14.2)', async () => {
    const app = appWith('off')
    expect((await get(app, `${STAGE_URL}/2?season=0`)).body).toBe(await todayOf(2))
    const next = stageReplaySchema.parse((await get(app, `${STAGE_URL}/2?season=1`)).json())
    expect(next.run).toBe(false)
    const bad = await get(app, `${STAGE_URL}/2?season=x`)
    expect(bad.statusCode).toBe(400)
    expect(apiErrorBodySchema.parse(bad.json()).error).toBe('validacion')
  })

  /**
   * LA PESTAÑA `Race Radio` (§11.16, decisión 11-i): la ruta de etapa no manda `radio` de una etapa no
   * conocida (desde el 11a, la web la construye hasta lo pintado con los tramos); la de una conocida es la
   * de la ficha de hoy, entera, y con `?diag=1`, también. Del 7b al 10 era la radio guardada; desde el
   * 11a, en una etapa con línea como la 2, la de la línea (`radioFromTimeline`, con los diez primeros de la
   * etapa y los propios de quien pide, que aquí no tiene ninguno): las tres comparaciones no cambian.
   */
  it('la Race Radio: sin radio en la etapa no conocida; la de la ficha de hoy, entera, en la vista y con ?diag=1 (§11.16)', async () => {
    const app = appWith('admins', 'admins')
    const today = stageReplaySchema.parse(JSON.parse(await todayOf(2, ADMIN)))
    expect(today.radio?.kms.length).toBeGreaterThan(0)
    await setWatch(ADMIN, watchRow('W'))
    const veiled = stageReplaySchema.parse((await get(app, `${STAGE_URL}/2`, ADMIN)).json())
    expect(veiled.radio).toBeUndefined()
    const diag = stageReplaySchema.parse((await get(app, `${STAGE_URL}/2?diag=1`, ADMIN)).json())
    expect(diag.radio).toEqual(today.radio)
    await setWatch(ADMIN, watchRow('WW'))
    const seen = stageReplaySchema.parse((await get(app, `${STAGE_URL}/2`, ADMIN)).json())
    expect(seen.radio).toEqual(today.radio)
    await setWatch(ADMIN, null)
  })

  /**
   * EL MODO DIAGNÓSTICO (§11.15, D-40, 11-h): un administrador con `?diag=1` recibe la ficha entera de
   * una etapa velada, la de hoy, sin `watch`, y ninguna fila de `race_watch` ni su `horizon_rev` cambian
   * tras pedir la cabecera, tres tramos y el acta con el parámetro; un jugador con `?diag=1` recibe lo
   * mismo, byte a byte, que sin él.
   */
  it('?diag=1: el administrador, la ficha entera de una etapa velada y nada escrito; el jugador, lo mismo que sin él (11-h)', async () => {
    await setWatch(ADMIN, null)
    await setWatch(PLAYER, watchRow('W'))
    const app = appWith('admins', 'admins')
    // sin el parámetro, la 2 está velada para el administrador (la 1 también: previous_unseen)
    const veiled = stageReplaySchema.parse((await get(app, `${STAGE_URL}/2`, ADMIN)).json())
    expect(veiled.results).toBeUndefined()
    expect(veiled.watch?.gate).toEqual({ k: 'previous_unseen', firstUnseen: 1 })
    const before = await t.client`select * from race_watch order by user_id, race_key`
    const revs = await t.client`select id, horizon_rev from users order by id`
    const diag = await get(app, `${STAGE_URL}/2?diag=1`, ADMIN)
    expect(diag.statusCode).toBe(200)
    expect(diag.body).toBe(await todayOf(2, ADMIN))
    expect(stageReplaySchema.parse(diag.json()).results?.length).toBeGreaterThan(0)
    // la cabecera, tres tramos y el acta con el parámetro: sin velo, sin puerta y sin el tope
    const head = await get(app, `${STAGE_URL}/2/broadcast?diag=1`, ADMIN)
    expect(head.statusCode, head.body.slice(0, 200)).toBe(200)
    for (let from = 0; from < 3 * BROADCAST.chunkRaceS * 10; from += BROADCAST.chunkRaceS * 10) {
      const chunk = await get(
        app,
        `${STAGE_URL}/2/broadcast/chunk?fromDs=${from}&toDs=${from + BROADCAST.chunkRaceS * 10}&diag=1`,
        ADMIN,
      )
      expect(chunk.statusCode, chunk.body.slice(0, 200)).toBe(200)
    }
    const report = await get(app, `${STAGE_URL}/2/report?diag=1`, ADMIN)
    expect(report.statusCode, report.body.slice(0, 200)).toBe(200)
    expect(await t.client`select * from race_watch order by user_id, race_key`).toEqual(before)
    expect(await t.client`select id, horizon_rev from users order by id`).toEqual(revs)
    // el jugador, con SPOILER_MODE para él (on) o sin él (admins): el parámetro no existe
    for (const each of [app, appWith('on')])
      for (const url of [
        `${STAGE_URL}/1`,
        `${STAGE_URL}/2`,
        `${STAGE_URL}/3`,
        `${STAGE_URL}/2/report`,
      ]) {
        const plain = await get(each, url, PLAYER)
        const withDiag = await get(each, `${url}?diag=1`, PLAYER)
        expect(withDiag.statusCode, url).toBe(plain.statusCode)
        expect(withDiag.body, url).toBe(plain.body)
        for (const h of ['cache-control', 'vary', 'set-cookie'])
          expect(withDiag.headers[h], `${url} ${h}`).toEqual(plain.headers[h])
      }
  })
})
