import {
  type StageRunSpec,
  type TimelineTickLog,
  clearHorizonCaches,
  clearStageTimelineCache,
  gameState,
  raceRosters,
  raceWatch,
  riderAttrs,
  riderHidden,
  riders,
  runOneStage,
  teams,
  timelineTickLog,
  worlds,
} from '@cyclingstar/db'
import { type TestDb, startTestDb } from '@cyclingstar/db/test'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { ATTRIBUTES } from '@cyclingstar/shared'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../app.js'
import { createAuth } from '../auth.js'
import { clearAdaptedTimelineCache } from '../broadcastSource.js'
// Sin drizzle-orm: `apps/api` no depende de él y sus tests escriben con SQL crudo (authFlow.test.ts).

/**
 * EL MUNDO DE B1a, B1b Y B1c (docs/retransmision.md §16.3; E2, paso 7a). PGlite, suite rápida.
 *
 * Una carrera en guardia por corredor propio (`race-france`, doce corredores), la 1 y la 2 corridas y
 * vistas, y el reloj en el día de la 3, que se corre con `runVeiled` y queda velada para el jugador. Con
 * la sesión de verdad de better-auth (`createAuth`, sin doble de `getSession`), `BROADCAST_WATCH=on` y
 * `SPOILER_MODE=on`: lo que barren los bancos es lo que recibiría el jugador en producción.
 *
 * Los bancos recorren `app.spoilerRegistry`, lo que registra Fastify, y no una lista a mano: una ruta
 * nueva entra sola en el barrido, y si pide un `:param` que este mundo no sabe rellenar, el barrido
 * falla (`PARAM`). `PENDING_ROUTES` es lo que todavía destripa con su PR; los tests comprueban las dos
 * cosas, que nada fuera de la lista falla y que cada ruta de la lista sigue fallando.
 */

export const RACE_ID = 'race-france'
export const RACE_KEY = `${RACE_ID}:s0`
/** La etapa que el jugador no ha visto; la 1 y la 2, sí. */
export const VEILED = 3
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
export const dayOf = (stageDay: number): number => RACE.startDay + stageDay - 1
/** Ids fijos, como abandon.test.ts: dos bases con la misma semilla base son el mismo mundo hasta la etapa velada. */
const FIXED = '00000000-0000-4000-8000-'
export const idDe = (i: number): string => `${FIXED}${String(i).padStart(12, '0')}`
export const OWN_RIDER = idDe(0)
const FIELD = 12
const BASE = 'http://localhost:3000'

export type Bank = 'B1a' | 'B1b' | 'B1c'
/**
 * Lo que el paso 8 aún no ha cerrado: ruta, PR que la cierra (la columna «Mecanismo en» de §11.3) y
 * bancos que la ven. Nació llena en el 7a, medida con este mundo y el código del 7a: cada test comprueba
 * que nada fuera de ella falla y que cada ruta de ella sigue fallando en sus bancos («ya no destripa:
 * quítala»). Un banco que no aparece no ve la ruta en este mundo: B1a solo ve los cinco valores canario,
 * B1b no barre la etapa velada (`B1B_SKIP`) y B1c compara dos desenlaces con el mismo velo. El 7b quitó
 * las dos de la etapa, la ruta de etapa (G y P, `stageAccessOf`) y el acta (G, `sendGate`); el 8a, sus
 * seis, con P, F y G sobre `veilSql`: la ficha de carrera, las dos de noticias, `last-race` y el
 * palmarés y los resultados de un corredor; y el 8b, las trece de R y M con `veilDelta`: el ranking, los
 * premios, el salón, los récords, las naciones, la tendencia, el informe, el resumen, el libro de
 * cuentas, la ficha de un corredor y las dos de equipos. VACÍA desde el 8b (D-54, 17-n): B1a, B1b y B1c
 * en verde en todas las rutas. La constante y sus `it` se borran en el 9b (§16.3).
 */
export const PENDING_ROUTES: ReadonlyMap<
  string,
  { readonly pr: string; readonly banks: readonly Bank[] }
> = new Map<string, { readonly pr: string; readonly banks: readonly Bank[] }>([])
/**
 * La lista blanca de B1b: ruta → campos que pueden cambiar al correrse una etapa velada. Su ÚNICA fuente es la primera tabla de
 * §11.18, fila a fila y en el mismo orden, con su columna «Campos (`strip`)»: puntos; `[]` recorre un array; `[veiledDay]` quita de
 * un array la fila cuyo `gameDay` es el de la etapa velada. Aquí no se escribe nada que no esté allí: una ruta nueva entra antes en
 * §11.18, con su motivo en `config.veil.why` (decisión 16-o).
 */
export const B1B_WHITELIST: ReadonlyMap<string, readonly string[]> = new Map([
  ['GET /api/calendar/:raceId', ['status', 'runDays']],
  ['GET /api/riders/me', ['rider.attributes']],
  ['GET /api/riders/me/form', ['form', 'log.[veiledDay]']],
  ['GET /api/riders/me/coach-view', ['coachView.notes']],
  ['GET /api/riders/:id', ['rider.attributes']],
  ['GET /api/riders/me/race-prefs', ['races.[].callup']],
  ['GET /api/riders/me/offers', ['offers']],
])
/**
 * Lo que cambia SOLO porque el velo gana la etapa entre los dos barridos de B1b (el jugador pasa de velo vacío a la etapa velada):
 * la segunda tabla de §11.18. B1b lo quita; B1c, que compara dos desenlaces con el mismo velo, no.
 */
export const B1B_VEIL: ReadonlyMap<string, readonly string[]> = new Map([
  ['GET /api/news', ['news.[stageReady]']],
  ['GET /api/teams/:id/news', ['news.[stageReady]']],
  ['GET /api/riders/:id/results', ['results.[toWatch]']],
  ['GET /api/riders/me/last-race', ['ready']],
  ['GET /api/riders/me/report', ['report.sessions', 'report.trainingDays']],
])
/** B1c además deja pasar el tiempo de la cabecera: la semilla de la etapa también decide el tiempo (simulate.ts), que en carretera se sabe antes de salir. */
export const B1C_WHITELIST: ReadonlyMap<string, readonly string[]> = new Map([
  ...B1B_WHITELIST,
  ['GET /api/races/:raceId/stages/:day/broadcast', ['weather', 'preview.weather']],
])

export interface Swept {
  readonly status: number
  readonly body: string
}
export interface SpoilerWorld {
  readonly t: TestDb
  readonly app: FastifyInstance
  readonly worldId: string
  readonly userId: string
  /** La sesión del jugador dueño de OWN_RIDER. */
  readonly cookie: string
  /** Otra cuenta con su sesión, sin corredor: la de B1b con dos cuentas (§11.14, 8b). */
  signUp(email: string): Promise<{ readonly userId: string; readonly cookie: string }>
  /** Corredores de más para barrer sus fichas (B1a añade al ganador; B1c no, para que las URL sean las mismas). */
  readonly extraRiders: string[]
  runVeiled(stageSeed: string): Promise<void>
  winner(): Promise<string>
  reveal(): Promise<void>
  close(): Promise<void>
}

const specOf = (stageDay: number, log: TimelineTickLog): StageRunSpec => {
  const s = RACE.stages.find((x) => x.index === stageDay)!
  return {
    raceKey: RACE_KEY,
    raceId: RACE_ID,
    raceName: RACE.name,
    level: 'WT',
    raceClass: 'WT',
    season: 0,
    stageDay,
    kind: s.kind,
    profile: s.profile,
    timeTrial: s.timeTrial === true,
    isFinal: false,
    timeline: log,
  }
}
/**
 * Una etapa como la corre el tick: runOneStage deja su fila en el diario y flush la escribe en la misma transacción (5-l, §5.5).
 * Sin la fila, la cabecera y los tramos saldrían del adaptador de la radio (D-07) sin que ningún B1 lo notara: se comprueba aquí.
 */
async function runStage(t: TestDb, worldId: string, stageDay: number, seed: string): Promise<void> {
  await t.db.transaction(async (tx) => {
    const log = timelineTickLog()
    await runOneStage(tx, worldId, dayOf(stageDay), seed, specOf(stageDay, log))
    await log.flush(tx)
  })
  const [row] = await t.client<
    { format: number }[]
  >`select format from stage_timelines where race_id = ${RACE_KEY} and stage_day = ${stageDay}`
  if (row?.format !== 1)
    throw new Error(`el mundo de B1: la etapa ${stageDay} quedó sin línea grabada (5-l)`)
}

/** Siembra el mundo, corre la 1 y la 2 con `baseSeed`, da de alta al jugador con lo visto hasta la 2 y deja el reloj en el día de la 3. */
export async function startSpoilerWorld(baseSeed: string): Promise<SpoilerWorld> {
  // Las dos LRU de líneas van por `${raceKey}|${stageDay}`, sin mundo (§5.6, §14.4), y B1c monta dos mundos con la misma carrera en el
  // mismo proceso: sin vaciarlas, el segundo leería la línea que dejó el primero (Rcodigo-086).
  clearStageTimelineCache()
  clearAdaptedTimelineCache()
  // PGlite admite UNA sesión (testDb.ts) y createDb abre hasta 10 (client.ts): la ruta de etapa hace varias consultas a la vez y
  // el socket corta con ECONNRESET y un 500. createDb lee la variable al llamarse; `close` deja la de antes.
  const poolBefore = process.env.DB_POOL_MAX
  process.env.DB_POOL_MAX = '1'
  const t = await startTestDb()
  const [w] = await t.db
    .insert(worlds)
    .values({ worldSeed: baseSeed, engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = w!.id
  // Las cachés del horizonte van por (worldId, día) y (worldId, userId, día, rev): un mundo nuevo no lee
  // las del anterior, pero se vacían igual para que cada mundo empiece como un proceso recién arrancado.
  clearHorizonCaches()
  await t.db.insert(teams).values(
    [0, 1].map((k) => ({
      id: idDe(100 + k),
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
      teamId: idDe(100 + (i % 2)),
      name: `Rider ${String(i).padStart(2, '0')}`,
      country: 'ES',
      gender: 'M' as const,
      birthSeason: -25,
      archetype: 'fondo' as const,
      faceSeed: `f${i}`,
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
      fragility: 1,
      peakAge: 28,
      declineAge: 33,
    })),
  )
  await t.db
    .insert(raceRosters)
    .values(
      Array.from({ length: FIELD }, (_, i) => ({ raceId: RACE_KEY, riderId: idDe(i), bib: i + 1 })),
    )
  for (const day of [1, 2]) await runStage(t, worldId, day, baseSeed)
  await t.db
    .insert(gameState)
    .values({ worldId, currentDay: dayOf(VEILED), lastProcessedDay: dayOf(VEILED) })

  const auth = createAuth(t.db, {
    secret: 's'.repeat(32),
    baseURL: BASE,
    mailer: {
      async send() {
        return true
      },
    },
  })
  const app = buildApp({
    db: t.db,
    auth,
    serveWeb: false,
    switches: { broadcastWatch: 'on', spoilerMode: 'on' },
  })
  const post = (path: string, body: unknown) =>
    app.inject({
      method: 'POST',
      url: `/api/auth${path}`,
      headers: { 'content-type': 'application/json', origin: BASE },
      payload: JSON.stringify(body),
    })
  /** Una cuenta con su sesión de verdad: alta, correo verificado y entrada. */
  const signUp = async (email: string): Promise<{ userId: string; cookie: string }> => {
    await post('/sign-up/email', { name: 'Player', email, password: 'contrasena-larga' })
    await t.client`update users set email_verified = true where email = ${email}`
    const [row] = await t.client<{ id: string }[]>`select id from users where email = ${email}`
    const login = await post('/sign-in/email', { email, password: 'contrasena-larga' })
    const set = login.headers['set-cookie']
    const cookie = (Array.isArray(set) ? set : set ? [set] : [])
      .map((c) => c.split(';')[0])
      .join('; ')
    if (!row || cookie === '') throw new Error(`el mundo de B1: ${email} no pudo entrar`)
    return { userId: row.id, cookie }
  }
  const { userId, cookie } = await signUp('player@example.com')
  await t.client`update riders set user_id = ${userId} where id = ${OWN_RIDER}`
  await t.db
    .insert(raceWatch)
    .values({ userId, worldId, raceKey: RACE_KEY, knownThrough: 2, how: 'WW' })

  const world: SpoilerWorld = {
    t,
    app,
    worldId,
    userId,
    cookie,
    signUp,
    extraRiders: [],
    async runVeiled(stageSeed) {
      await runStage(t, worldId, VEILED, stageSeed)
      // En producción el tick sube el día en la misma transacción y las cachés del horizonte, que van por (userId, currentDay,
      // horizonRev) y por (worldId, currentDay), se invalidan solas; aquí el día no cambia (§10.6).
      clearHorizonCaches()
    },
    async winner() {
      const [r] = await t.client<
        { rider_id: string }[]
      >`select rider_id from stage_results where race_id = ${RACE_KEY} and stage_day = ${VEILED} and puesto = 1`
      return r!.rider_id
    },
    async reveal() {
      // lo que hace revealStage (§10.3), escrito a mano: el test no depende de su firma
      await t.client`update race_watch set known_through = ${VEILED}, how = 'WWR' where user_id = ${userId}`
      await t.client`update users set horizon_rev = horizon_rev + 1 where id = ${userId}`
    },
    async close() {
      await app.close()
      await t.close()
      if (poolBefore === undefined) delete process.env.DB_POOL_MAX
      else process.env.DB_POOL_MAX = poolBefore
    },
  }
  return world
}

/** Los valores de cada :param. Un parámetro que no esté aquí hace fallar el barrido: se añade a propósito. */
const PARAM: Readonly<Record<string, (url: string, w: SpoilerWorld) => readonly string[]>> = {
  raceId: () => [RACE_ID],
  raceKey: () => [RACE_KEY],
  day: () => [String(VEILED)],
  season: () => ['0'],
  code: () => ['ES'],
  id: (url, w) =>
    url.startsWith('/api/teams') ? [idDe(100), idDe(101)] : [OWN_RIDER, idDe(5), ...w.extraRiders],
}
/** Las consultas mínimas de las rutas que las piden: sin ellas darían 400 y no probarían nada. */
const QUERY: Readonly<Record<string, string>> = {
  'GET /api/races/:raceId/stages/:day/broadcast/chunk': '?fromDs=0&toDs=9000',
}
/** Lo que no se barre, con su motivo. */
export const SKIP: ReadonlyMap<string, string> = new Map([
  ['GET /api/auth/*', 'better-auth: la cuenta, ningún dato de carrera'],
])
/** Lo que B1b no barre además (§11.18): el velo mismo, y la etapa velada, que antes de correrse da el plan o un 404 y después la puerta. Las vigilan B1a y B1c. */
export const B1B_SKIP: ReadonlyMap<string, string> = new Map([
  ...SKIP,
  ['GET /api/me/horizon', 'el velo mismo: cambia al correrse la etapa por construcción'],
  [
    'GET /api/races/:raceId/stages/:day',
    'la etapa velada: el plan antes, la puerta después (B1a, B1c)',
  ],
  [
    'GET /api/races/:raceId/stages/:day/broadcast',
    'ídem: 404 antes, la cabecera con `watch` después',
  ],
  [
    'GET /api/races/:raceId/stages/:day/broadcast/chunk',
    'ídem: 404 antes, 403 `not_seen` o el tramo después',
  ],
  ['GET /api/races/:raceId/stages/:day/report', 'ídem: 404 antes, la puerta después'],
])

/** Todas las GET del registro, con cada combinación de parámetros. La clave es `${ruta} ${url}`. */
export async function sweep(
  w: SpoilerWorld,
  who: 'player' | 'anon',
  skip: ReadonlyMap<string, string> = SKIP,
): Promise<Map<string, Swept>> {
  const out = new Map<string, Swept>()
  for (const [route, r] of w.app.spoilerRegistry) {
    if (r.method !== 'GET' || r.origin === 'static' || skip.has(route)) continue
    let urls = [r.url]
    for (const [, name] of r.url.matchAll(/:([A-Za-z]+)/g)) {
      const values = PARAM[name!]?.(r.url, w)
      if (values === undefined)
        throw new Error(`barrido: ${route} pide :${name}, que el mundo de B1 no sabe rellenar`)
      urls = urls.flatMap((u) => values.map((v) => u.replace(`:${name}`, encodeURIComponent(v))))
    }
    for (const url of urls) {
      const res = await w.app.inject({
        method: 'GET',
        url: url + (QUERY[route] ?? ''),
        headers: who === 'player' ? { cookie: w.cookie } : {},
      })
      out.set(`${route} ${url}`, { status: res.statusCode, body: res.body })
    }
  }
  return out
}
export const routeOf = (key: string): string => key.split(' ').slice(0, 2).join(' ')
export const pendingFor = (key: string, bank: Bank): boolean =>
  PENDING_ROUTES.get(routeOf(key))?.banks.includes(bank) ?? false
/** Un 5xx no es una respuesta igual ni distinta: es un banco que no ha mirado. Cada B1 tiene un `it` que exige esta lista vacía. */
export const serverErrors = (bodies: ReadonlyMap<string, Swept>): string[] =>
  [...bodies].filter(([, r]) => r.status >= 500).map(([k]) => k)

/** Quita del cuerpo los campos de la lista blanca. Un cuerpo que no es JSON se compara tal cual. */
export function strip(r: Swept, paths: readonly string[]): string {
  if (paths.length === 0) return `${r.status} ${r.body}`
  let v: unknown
  try {
    v = JSON.parse(r.body)
  } catch {
    return `${r.status} ${r.body}`
  }
  const dropRows = (x: unknown, gone: (row: Record<string, unknown>) => boolean): void => {
    if (Array.isArray(x))
      for (let i = x.length - 1; i >= 0; i--) {
        const row: unknown = x[i]
        if (typeof row === 'object' && row !== null && gone(row as Record<string, unknown>))
          x.splice(i, 1)
      }
  }
  const drop = (x: unknown, p: readonly string[]): void => {
    if (p.length === 0 || x === null || typeof x !== 'object') return
    const [head, ...tail] = p as [string, ...string[]]
    if (head === '[]') {
      if (Array.isArray(x)) for (const y of x) drop(y, tail)
      return
    }
    if (head === '[veiledDay]') return dropRows(x, (row) => row.gameDay === dayOf(VEILED)) // la fila del día de la etapa velada, entera
    if (head === '[stageReady]') return dropRows(x, (row) => row.kind === 'stage_ready') // el marcador de §11.7
    if (head === '[toWatch]') {
      // la cuenta de etapas por ver de §11.6, punto 2
      if (Array.isArray(x))
        for (const row of x)
          if (
            typeof row === 'object' &&
            row !== null &&
            (row as { raceId?: unknown }).raceId === RACE_ID
          )
            delete (row as Record<string, unknown>).stagesToWatch
      return
    }
    if (tail.length === 0) delete (x as Record<string, unknown>)[head]
    else drop((x as Record<string, unknown>)[head], tail)
  }
  for (const p of paths) drop(v, p.split('.'))
  return `${r.status} ${JSON.stringify(v)}`
}

/**
 * Lo que difiere entre dos bases por construcción y no por la etapa: uuid aleatorios, por orden de aparición; marcas de tiempo;
 * y la cuenta atrás de `/health`, que sale de la hora real de creación del mundo (`nextTickAtMs`, routes/health.ts).
 */
export function normalize(s: string): string {
  const seen = new Map<string, string>()
  return s
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<t>')
    .replace(/"nextTickAtMs":\d+/g, '"nextTickAtMs":<t>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, (id) => {
      if (id.startsWith(FIXED)) return id // los ids fijos son los mismos en las dos bases
      if (!seen.has(id)) seen.set(id, `<id${seen.size}>`)
      return seen.get(id)!
    })
}
