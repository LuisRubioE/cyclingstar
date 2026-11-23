#!/usr/bin/env node
/* global process, console */
/**
 * E4, mapa 05: LA API LOCAL DE LAS PANTALLAS DE LA CUENTA. Como `docs/diseno/e3-visual/capturas/servir.mjs`,
 * pero con un mundo recién nacido (las pantallas de la cuenta no necesitan calendario) y con un `Mailer`
 * falso que escribe cada correo entero (destinatario, asunto, texto y HTML) en `<out>/correos.jsonl`,
 * para que `recorridos.mjs` siga los enlaces como lo haría la persona desde su buzón.
 *
 *   1. PGlite servida por socket, con todas las migraciones (`runMigrations`), como `testDb.ts`.
 *   2. La génesis: `runTick` con `forceDays: 0` (lo que hace el primer tick de la API).
 *   3. `createAuth` y `buildApp` de verdad, con la web compilada (`apps/web/dist`), los dos interruptores
 *      de E2 en `on` (como en producción) y el país por IP contestado por un doble (`ES`).
 *   4. Una ruta del arnés, `POST /__sql`, fuera de la API, para preparar estados que la web no deja
 *      fabricar (una cuenta antigua con sesión y sin correo confirmado). Solo escucha en 127.0.0.1.
 *
 * `NODE_ENV` se hereda del entorno: sin él, `better-auth` no limita (mapa 01 §4); con
 * `NODE_ENV=production`, sí, como en Railway.
 *
 * Uso, desde un clon compilado del repositorio (`pnpm install --frozen-lockfile && pnpm build`):
 *   [NODE_ENV=production] node <este-fichero> --root <clon> --out <carpeta> [--port 3005]
 * Escribe `listening <url>` cuando está listo. SIGTERM lo para.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const ROOT = resolve(arg('--root', process.cwd()))
const OUT = resolve(arg('--out', 'salida'))
const PORT = Number(arg('--port', '3005'))
const BASE = `http://localhost:${PORT}`
const SECRET = 's'.repeat(32)

process.env.DB_POOL_MAX = '1'
mkdirSync(OUT, { recursive: true })

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

const freePort = () =>
  new Promise((ok, ko) => {
    const srv = createServer()
    srv.once('error', ko)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => ok(port))
    })
  })

const pg = await PGlite.create({ extensions: { citext } })
const dbPort = await freePort()
const socket = new PGLiteSocketServer({ db: pg, port: dbPort, host: '127.0.0.1' })
await socket.start()
const url = `postgres://postgres@127.0.0.1:${dbPort}/postgres`
await db.runMigrations(url)
await db.runTick(url, {
  now: new Date(),
  msPerGameDay: 6 * 60 * 60 * 1000,
  worldSeed: db.GENESIS_WORLD_SEED,
  engineVersion: ENGINE_VERSION,
  forceDays: 0,
  timelineRecord: 'on',
})
const { db: database, client } = db.createDb(url)

const MAIL = resolve(OUT, 'correos.jsonl')
writeFileSync(MAIL, '')
const mailer = {
  send: async (m) => {
    appendFileSync(MAIL, `${JSON.stringify({ t: Date.now(), ...m })}\n`)
    return true
  },
}
const auth = createAuth(database, { secret: SECRET, baseURL: BASE, mailer })
const app = buildApp({
  db: database,
  auth,
  migrationsApplied: true,
  tickIntervalMinutes: 360,
  adminToken: 'a'.repeat(32),
  switches: { broadcastWatch: 'on', spoilerMode: 'on' },
  viewerSecret: SECRET,
  secureCookies: false,
  geoLookup: async () => ({ code: 'ES', proveedor: 'doble' }),
  logger: { level: arg('--log', 'warn') },
})
app.post('/__sql', { config: { spoiler: 'safe', rateLimit: false } }, async (req) =>
  client.unsafe(req.body.q),
)
await app.listen({ port: PORT, host: '127.0.0.1' })
console.log(`listening ${BASE} NODE_ENV=${process.env.NODE_ENV ?? '(sin)'}`)

const stop = async () => {
  await app.close()
  await client.end({ timeout: 5 })
  await socket.stop()
  await pg.close()
  process.exit(0)
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())
