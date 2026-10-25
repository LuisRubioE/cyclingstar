#!/usr/bin/env node
/* global process, performance, Buffer */
/**
 * EL MUNDO DE LA PRUEBA DEL TELÉFONO (E3, docs/visual.md §7.2; PR 2a). Levanta en PGlite un mundo como
 * el del juego, con cincuenta días de calendario, y lo deja volcado para que `serve.mjs` lo sirva sin
 * volver a correr nada. Es el port de `docs/diseno/e3-visual/capturas/mundo.mjs`, el mundo que midió el
 * mapa 05:
 *
 *   1. La base: PGlite servida por socket (postgres.js habla el protocolo de verdad), con todas las
 *      migraciones (`runMigrations`), como `packages/db/src/testDb.ts`.
 *   2. La génesis: `runTick` con `forceDays: 0` y `GENESIS_WORLD_SEED`, que crea el mundo con
 *      `seedWorld`, como el primer tick de la API.
 *   3. Las cuentas, por la API de verdad (`buildApp` y better-auth, con `app.inject`), el día 0: el
 *      jugador, agente libre de España, inscrito a Race Murcia y Race Jaén (en casa) y a Race Var y Race
 *      Sardegna (fuera, para que haya viaje); el mánager, con su corredor; y la cuenta sin corredor. Y
 *      las cuatro escrituras con SQL que el juego no da en un mundo recién creado: el correo confirmado,
 *      400 de dinero al jugador (sin él, un agente libre no sale de su país), el contrato del corredor
 *      del mánager en un equipo WorldTour de su país, escrito como lo escribe `acceptOffer`, y `premium`
 *      del mánager.
 *   4. El calendario: `runTick` hasta el día 50, de 40 en 40, con `timelineRecord: 'on'` como en
 *      producción. El último día el mánager toma su equipo y los dos corredores guardan el mismo plan.
 *   5. El volcado: `dumpDataDir` en `<out>/mundo-50.tar.gz`, y en `<out>/cuentas.json` las cuentas y la
 *      primera contrarreloj corrida (su carrera y su número), la de la pantalla 38.
 *
 * CADA PASO COMPRUEBA SU RESPUESTA (decisiones 7-a y 7-i): una cuenta que no se crea, una toma del equipo
 * que no da 200, un mundo que no acaba con 219 equipos o sin ninguna crono corrida paran el script con
 * su motivo y un código de salida distinto de 0, para que un mundo a medias no llegue a la caché del CI
 * y fije una línea base falsa.
 *
 * PGlite tiene una sola sesión (`testDb.ts` l. 16-19): cada fase abre su conexión y la cierra antes de
 * la siguiente, y la API va con `DB_POOL_MAX=1`. Tarda unos 15 minutos en una máquina de cuatro núcleos
 * (17 s por día de juego, mapa 05 §1).
 *
 * Uso, desde la raíz del repositorio compilado (`pnpm install --frozen-lockfile && pnpm build`):
 *   node apps/web/e2e/world/build.mjs [--out apps/web/e2e/world/.mundo] [--day 50]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const OUT = resolve(arg('--out', resolve(HERE, '.mundo')))
const DAY = Number(arg('--day', '50'))
const BASE = 'http://localhost:3000'
const PASSWORD = 'contrasena-de-prueba-larga'
const MS_PER_GAME_DAY = 6 * 60 * 60 * 1000
const SEASON_DAYS = 364
const TEAMS = 219

process.env.DB_POOL_MAX = '1'

const fromRoot = (p) => pathToFileURL(resolve(ROOT, p)).href
const require = createRequire(resolve(ROOT, 'packages/db/package.json'))
const load = async (name) => import(pathToFileURL(require.resolve(name)).href)
const { PGlite } = await load('@electric-sql/pglite')
const { citext } = await load('@electric-sql/pglite/contrib/citext')
const { PGLiteSocketServer } = await load('@electric-sql/pglite-socket')
const db = await import(fromRoot('packages/db/dist/index.js'))
const { ENGINE_VERSION, calendarForSeason, stageDayOfSeason } = await import(
  fromRoot('packages/engine/dist/index.js')
)
const { buildApp } = await import(fromRoot('apps/api/dist/app.js'))
const { createAuth } = await import(fromRoot('apps/api/dist/auth.js'))

const log = (msg) => process.stderr.write(`[${(performance.now() / 1000).toFixed(1)} s] ${msg}\n`)

/** Para el script con su motivo: un mundo a medias no se vuelca (7-a). */
function fail(msg) {
  log(`ERROR: ${msg}`)
  process.exit(1)
}

async function freePort() {
  return new Promise((ok, ko) => {
    const srv = createServer()
    srv.once('error', ko)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => ok(port))
    })
  })
}

const pg = await PGlite.create({ extensions: { citext } })
const port = await freePort()
const socket = new PGLiteSocketServer({ db: pg, port, host: '127.0.0.1' })
await socket.start()
const url = `postgres://postgres@127.0.0.1:${port}/postgres`

/** Una fase con la API de verdad en el proceso: su conexión se cierra al acabar. */
async function withApi(fn) {
  const { db: database, client } = db.createDb(url)
  const auth = createAuth(database, {
    secret: 's'.repeat(32),
    baseURL: BASE,
    mailer: { send: async () => true },
  })
  const app = buildApp({ db: database, auth, serveWeb: false, migrationsApplied: true })
  await app.ready()
  /** Una llamada a la API; con `expect`, para el script si el código no es ese. */
  const call = async (method, path, cookie, body, expect) => {
    const res = await app.inject({
      method,
      url: path,
      headers: {
        origin: BASE,
        ...(cookie ? { cookie } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { payload: JSON.stringify(body) } : {}),
    })
    if (expect !== undefined && res.statusCode !== expect)
      fail(`${method} ${path} dio ${res.statusCode} y no ${expect}: ${res.body.slice(0, 200)}`)
    return res
  }
  const signIn = async (email) => {
    const res = await call(
      'POST',
      '/api/auth/sign-in/email',
      null,
      { email, password: PASSWORD },
      200,
    )
    const raw = res.headers['set-cookie']
    const list = Array.isArray(raw) ? raw : raw ? [raw] : []
    const cookie = list.map((c) => c.split(';')[0]).join('; ')
    if (cookie === '') fail(`la sesión de ${email} no trae cookie`)
    return cookie
  }
  const signUp = async (name, email) => {
    await call('POST', '/api/auth/sign-up/email', null, { name, email, password: PASSWORD }, 200)
    await client`update users set email_verified = true where email = ${email}`
    return signIn(email)
  }
  try {
    return await fn({ call, signIn, signUp, client })
  } finally {
    await app.close()
    await client.end({ timeout: 5 })
  }
}

async function tick(days) {
  let left = days
  do {
    const n = Math.min(left, 40)
    const t0 = performance.now()
    const s = await db.runTick(url, {
      now: new Date(),
      msPerGameDay: MS_PER_GAME_DAY,
      worldSeed: db.GENESIS_WORLD_SEED,
      engineVersion: ENGINE_VERSION,
      forceDays: n,
      timelineRecord: 'on',
    })
    if (!s.ran || s.daysProcessed !== n)
      fail(`el tick procesó ${s.daysProcessed} de ${n} días (ran: ${s.ran})`)
    log(
      `  tick: ${s.daysProcessed} días hasta el ${s.currentDay} en ${((performance.now() - t0) / 1000).toFixed(1)} s`,
    )
    left -= n
  } while (left > 0)
}

log(`raíz ${ROOT}; migraciones`)
await db.runMigrations(url)
log('génesis (seedWorld)')
await tick(0)

const accounts = {
  jugador: { email: 'jugador@example.com', name: 'Jugador', country: 'ES', vocation: 'escalada' },
  manager: { email: 'manager@example.com', name: 'Manager', country: 'BE', vocation: 'clasicas' },
  nuevo: { email: 'nuevo@example.com', name: 'Nuevo' },
}
const PLAYER_RACES = ['race-murcia', 'race-jaen', 'race-var', 'race-sardegna']

log('cuentas, corredores e inscripciones (día 0)')
await withApi(async ({ call, signUp, signIn, client }) => {
  for (const [key, a] of Object.entries(accounts)) {
    const cookie = await signUp(a.name, a.email)
    if (!a.country) continue
    await call(
      'POST',
      '/api/riders',
      cookie,
      {
        vocation: a.vocation,
        gender: 'M',
        country: a.country,
        nameSeed: `${a.country}-M-${key.length}`,
      },
      201,
    )
  }
  const jug = await signIn(accounts.jugador.email)
  for (const race of PLAYER_RACES)
    await call('POST', `/api/riders/me/race-entries/${race}`, jug, undefined, 200)
  await client`update riders set money = 400 where user_id = (select id from users where email = ${accounts.jugador.email})`
})

log('el corredor del mánager, a un equipo WorldTour de su país (contrato escrito con SQL)')
await withApi(async ({ client }) => {
  /*
   * El mercado no le ofrece nada a un corredor recién creado (`MIN_RATING_FOR_OFFERS`, 0,42, en
   * packages/db/src/contracts.ts l. 75): el contrato se escribe como lo escribe `acceptOffer`, con el
   * equipo, la residencia y el contrato de esta temporada y la siguiente. El equipo corre como bot
   * hasta el último día, en que el mánager lo toma.
   */
  const [rider] = await client`
    select r.id, r.country from riders r join users u on u.id = r.user_id
    where u.email = ${accounts.manager.email}`
  if (!rider) fail('el mánager no tiene corredor')
  const [team] = await client`
    select id, country from teams
    where division = 'WT' and owner_user_id is null
    order by (country = ${rider.country}) desc, name limit 1`
  if (!team) fail('no hay ningún equipo WorldTour sin dueño')
  await client`insert into contracts (rider_id, team_id, role, salary, start_season, end_season)
    values (${rider.id}, ${team.id}, 'gregario', 20, 0, 1)`
  await client`update riders set team_id = ${team.id}, residence = ${team.country} where id = ${rider.id}`
  log(`  equipo ${team.id} (${team.country})`)
})

log(`calendario hasta el día ${DAY}`)
await tick(DAY)

const PLAN = {
  startDay: 0,
  blocks: ['construccion', 'especifico', 'afinado', 'recuperacion'],
  focusAttr: null,
  intensity: 'normal',
  goalRaceId: null,
}

/**
 * La primera contrarreloj corrida (7-i): `TimeTrialBoard` no sale en ninguna de las 45 pantallas del
 * mapa 05, y que haya una en el mundo de 50 días no estaba comprobado. Llegan de la base las etapas
 * corridas que su recorrido congelado dice crono (`stage_snapshots` con `race_routes.time_trial`; las
 * dos guardan la clave de la temporada, `race-x:s0`, y el NÚMERO de etapa en `stage_day`), y aquí se
 * elige la que se corrió antes, con el día que da el calendario de su temporada (`stageDayOfSeason`).
 * La URL de la pantalla lleva el id del calendario, sin la temporada.
 */
function firstTimeTrial(rows) {
  const seasons = new Map()
  let first = null
  for (const { race_key: key, stage_day: stage } of rows) {
    const season = db.seasonOfRaceKey(key)
    const id = key.replace(/:s\d+$/, '')
    if (!seasons.has(season)) seasons.set(season, calendarForSeason(season))
    const race = seasons.get(season).find((r) => r.id === id)
    if (!race) continue
    const day = season * SEASON_DAYS + stageDayOfSeason(race, stage)
    if (first === null || day < first.day || (day === first.day && id < first.raceId))
      first = { raceId: id, stage, name: race.name, day }
  }
  return first
}

log('premium, toma del equipo y planes (último día)')
const summary = await withApi(async ({ call, signIn, client }) => {
  await client`update users set premium = true where email = ${accounts.manager.email}`
  const man = await signIn(accounts.manager.email)
  const take = await call('POST', '/api/teams/take-over', man, undefined, 200)
  await call('PUT', '/api/riders/me/plan', man, { mode: 'mixto', plan: PLAN }, 200)
  const jug = await signIn(accounts.jugador.email)
  await call('PUT', '/api/riders/me/plan', jug, { mode: 'mixto', plan: PLAN }, 200)
  const who = async (email) =>
    (
      await client`select r.id, r.name, r.team_id, r.money from riders r join users u on u.id = r.user_id
        where u.email = ${email}`
    )[0] ?? null
  const me = await who(accounts.jugador.email)
  const manMe = await who(accounts.manager.email)
  const [counts] = await client`
    select (select count(*)::int from riders) as riders, (select count(*)::int from teams) as teams,
           (select count(*)::int from stage_snapshots) as stages,
           (select count(*)::int from stage_timelines where format <> 0) as timelines,
           (select count(*)::int from news) as news,
           (select current_day from game_state) as day`
  const rosters = await client`
    select race_id from race_rosters where rider_id = ${me?.id ?? null} order by race_id`
  const timeTrials = await client`
    select s.race_id as race_key, s.stage_day from stage_snapshots s
      join race_routes r on r.race_key = s.race_id and r.stage_day = s.stage_day
     where r.time_trial`
  return {
    takeOver: JSON.parse(take.body),
    player: { ...me, rosters: rosters.map((r) => r.race_id) },
    manager: manMe,
    counts,
    timeTrial: firstTimeTrial(timeTrials),
  }
})
log(JSON.stringify(summary))

// El estado final, antes de volcar (7-a y 7-i).
if (summary.counts.teams !== TEAMS)
  fail(`el mundo acaba con ${summary.counts.teams} equipos y no ${TEAMS}`)
if (summary.counts.day !== DAY)
  fail(`el mundo acaba en el día ${summary.counts.day} y no en el ${DAY}`)
if (summary.timeTrial === null)
  fail('no se corrió ninguna contrarreloj: la pantalla 38 no tendría etapa')
if (!summary.player.id || !summary.manager?.team_id)
  fail('falta el corredor del jugador o el equipo del mánager')

mkdirSync(OUT, { recursive: true })
const dump = await pg.dumpDataDir('gzip')
const file = resolve(OUT, `mundo-${DAY}.tar.gz`)
writeFileSync(file, Buffer.from(await dump.arrayBuffer()))
writeFileSync(
  resolve(OUT, 'cuentas.json'),
  `${JSON.stringify(
    {
      base: BASE,
      password: PASSWORD,
      day: DAY,
      accounts,
      playerRaces: PLAYER_RACES,
      // La pantalla 38 (§7.3): `MundoDePrueba.firstTimeTrialStage` de `e2e/pantallas.ts`.
      firstTimeTrialStage: { race: summary.timeTrial.raceId, stage: summary.timeTrial.stage },
      summary,
    },
    null,
    2,
  )}\n`,
)
log(`volcado en ${file}`)
await socket.stop()
await pg.close()
