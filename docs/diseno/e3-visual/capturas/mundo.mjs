#!/usr/bin/env node
/* global process, performance, Buffer */
/**
 * E3, mapa 05: EL MUNDO DE LAS CAPTURAS. Levanta en PGlite un mundo como el del juego y lo deja
 * volcado en un fichero para que `servir.mjs` lo sirva sin volver a correr el calendario.
 *
 *   1. La base: PGlite servida por socket (postgres.js habla el protocolo de verdad), con todas las
 *      migraciones (`runMigrations`), como `packages/db/src/testDb.ts`.
 *   2. La génesis: `runTick` con `forceDays: 0` crea el mundo con `seedWorld` (lo que hace el primer
 *      tick de la API, `apps/api/src/index.ts`), con la semilla de producción (`GENESIS_WORLD_SEED`).
 *   3. Las cuentas, por la API de verdad (`buildApp` y better-auth, con `app.inject`), el día 0: un
 *      jugador agente libre de España con su corredor, inscrito por `/api/riders/me/race-entries` a
 *      cuatro carreras continentales (Murcia y Jaén en casa; Var en Francia y Cerdeña, de cinco
 *      etapas, fuera, para que haya viaje); un mánager con su corredor; y una cuenta sin corredor. El
 *      correo se da por confirmado con SQL, como los tests de la API (`adminPanel.test.ts`), y al
 *      jugador se le dan 400 de dinero para que pueda pagar los viajes (nace con 0, y un agente libre
 *      sin dinero no sale de su país).
 *   4. El corredor del mánager, a un equipo WorldTour de su país, con su contrato escrito con SQL como
 *      lo escribe `acceptOffer`: el mercado no le ofrece nada a un corredor recién creado.
 *   5. El calendario: `runTick` hasta `--day` (50 por defecto), de 40 en 40 días, con
 *      `timelineRecord: 'on'` como en producción, para que haya resultados, clasificaciones, noticias
 *      y líneas de `Watch`. El último día, el mánager pasa a premium y toma el control de su equipo
 *      (`/api/teams/take-over`), y los dos corredores guardan el mismo plan de bloques.
 *   6. El volcado: `dumpDataDir` en `<out>/mundo-<día>.tar.gz` y las cuentas en `<out>/cuentas.json`.
 *
 * PGlite tiene una sola sesión (testDb.ts l. 16-19): cada fase abre su conexión y la cierra antes de
 * la siguiente, y la API de las fases 3 y 5 va con `DB_POOL_MAX=1`. En esta máquina (cuatro núcleos)
 * tarda unos 15 minutos, 17 s por día de juego.
 *
 * Uso, desde un clon compilado del repositorio (`pnpm install --frozen-lockfile && pnpm build`):
 *   node <este-fichero> --root <clon> --out <carpeta> [--day 50]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const ROOT = resolve(arg('--root', process.cwd()))
const OUT = resolve(arg('--out', 'mundo-capturas'))
const DAY = Number(arg('--day', '50'))
const BASE = 'http://localhost:3000'
const PASSWORD = 'contrasena-de-prueba-larga'
const MS_PER_GAME_DAY = 6 * 60 * 60 * 1000

process.env.DB_POOL_MAX = '1'

const fromRoot = (p) => pathToFileURL(resolve(ROOT, p)).href
const require = createRequire(resolve(ROOT, 'packages/db/package.json'))
const load = async (name) => import(pathToFileURL(require.resolve(name)).href)
const { PGlite } = await load('@electric-sql/pglite')
const { citext } = await load('@electric-sql/pglite/contrib/citext')
const { PGLiteSocketServer } = await load('@electric-sql/pglite-socket')
const db = await import(fromRoot('packages/db/dist/index.js'))
const { ENGINE_VERSION } = await import(fromRoot('packages/engine/dist/index.js'))
const { buildApp } = await import(fromRoot('apps/api/dist/app.js'))
const { createAuth } = await import(fromRoot('apps/api/dist/auth.js'))

const log = (msg) => process.stderr.write(`[${(performance.now() / 1000).toFixed(1)} s] ${msg}\n`)

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
  const call = async (method, path, cookie, body) => {
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
    if (res.statusCode >= 400)
      log(`  ${method} ${path} -> ${res.statusCode} ${res.body.slice(0, 160)}`)
    return res
  }
  const signIn = async (email) => {
    const res = await call('POST', '/api/auth/sign-in/email', null, { email, password: PASSWORD })
    const raw = res.headers['set-cookie']
    const list = Array.isArray(raw) ? raw : raw ? [raw] : []
    return list.map((c) => c.split(';')[0]).join('; ')
  }
  const signUp = async (name, email) => {
    await call('POST', '/api/auth/sign-up/email', null, { name, email, password: PASSWORD })
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
    await call('POST', '/api/riders', cookie, {
      vocation: a.vocation,
      gender: 'M',
      country: a.country,
      nameSeed: `${a.country}-M-${key.length}`,
    })
  }
  const jug = await signIn(accounts.jugador.email)
  for (const race of PLAYER_RACES) await call('POST', `/api/riders/me/race-entries/${race}`, jug)
  await client`update riders set money = 400 where user_id = (select id from users where email = ${accounts.jugador.email})`
})

log('el corredor del mánager, a un equipo WorldTour de su país (contrato escrito con SQL)')
await withApi(async ({ client }) => {
  /*
   * El mercado no le ofrece nada a un corredor recién creado (`MIN_RATING_FOR_OFFERS`, 0,42, en
   * packages/db/src/contracts.ts l. 75): el contrato se escribe como lo escribe `acceptOffer`
   * (contracts.ts l. 278-317), con el equipo, la residencia y el contrato de esta temporada y la
   * siguiente. El equipo corre como bot hasta el último día, en que el mánager lo toma.
   */
  const [rider] = await client`
    select r.id, r.country from riders r join users u on u.id = r.user_id
    where u.email = ${accounts.manager.email}`
  const [team] = await client`
    select id, country from teams
    where division = 'WT' and owner_user_id is null
    order by (country = ${rider.country}) desc, name limit 1`
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
log('premium, toma del equipo y planes (último día)')
const summary = await withApi(async ({ call, signIn, client }) => {
  await client`update users set premium = true where email = ${accounts.manager.email}`
  const man = await signIn(accounts.manager.email)
  const take = await call('POST', '/api/teams/take-over', man)
  await call('PUT', '/api/riders/me/plan', man, { mode: 'mixto', plan: PLAN })
  const jug = await signIn(accounts.jugador.email)
  await call('PUT', '/api/riders/me/plan', jug, { mode: 'mixto', plan: PLAN })
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
  return {
    takeOver: JSON.parse(take.body),
    player: { ...me, rosters: rosters.map((r) => r.race_id) },
    manager: manMe,
    counts,
  }
})
log(JSON.stringify(summary))

mkdirSync(OUT, { recursive: true })
const dump = await pg.dumpDataDir('gzip')
const file = resolve(OUT, `mundo-${DAY}.tar.gz`)
writeFileSync(file, Buffer.from(await dump.arrayBuffer()))
writeFileSync(
  resolve(OUT, 'cuentas.json'),
  `${JSON.stringify({ base: BASE, password: PASSWORD, day: DAY, accounts, playerRaces: PLAYER_RACES, summary }, null, 2)}\n`,
)
log(`volcado en ${file}`)
await socket.stop()
await pg.close()
