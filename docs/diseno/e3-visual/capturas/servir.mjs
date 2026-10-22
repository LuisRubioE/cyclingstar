#!/usr/bin/env node
/* global process, console, Blob */
/**
 * E3, mapa 05: SIRVE EL MUNDO DE LAS CAPTURAS. Carga en PGlite el volcado de `mundo.mjs` y levanta
 * la API de verdad (`buildApp`, better-auth, el horizonte y la retransmisión) con la web compilada
 * (`apps/web/dist`), como el paso 10b de E2 (docs/diseno/e2-retransmision/implementacion.md l. 293 y
 * l. 687). Los dos interruptores de E2 van en `on`, como en producción desde el 10 de octubre de 2026
 * (implementacion.md, decisión 5). No corre el tick: el mundo se queda en el día del volcado.
 *
 * Toca dos cosas para las capturas, y solo en esta copia: el ancla del reloj (`worlds.created_at`),
 * para que la cuenta atrás del siguiente día no salga vencida, y el país por IP, que se contesta con
 * un doble (`ES`) en vez de salir a la red.
 *
 * Uso, desde un clon compilado del repositorio:
 *   node <este-fichero> --root <clon> --world <carpeta>/mundo-50.tar.gz [--port 3005]
 * Escribe `listening <url>` en la salida cuando está listo. Ctrl+C lo para.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const ROOT = resolve(arg('--root', process.cwd()))
const WORLD = resolve(arg('--world', 'mundo-capturas/mundo-50.tar.gz'))
const PORT = Number(arg('--port', '3005'))
const BASE = `http://localhost:${PORT}`
const SECRET = 's'.repeat(32)

process.env.DB_POOL_MAX = '1'

const fromRoot = (p) => pathToFileURL(resolve(ROOT, p)).href
const require = createRequire(resolve(ROOT, 'packages/db/package.json'))
const load = async (name) => import(pathToFileURL(require.resolve(name)).href)
const { PGlite } = await load('@electric-sql/pglite')
const { citext } = await load('@electric-sql/pglite/contrib/citext')
const { PGLiteSocketServer } = await load('@electric-sql/pglite-socket')
const { createDb } = await import(fromRoot('packages/db/dist/index.js'))
const { buildApp } = await import(fromRoot('apps/api/dist/app.js'))
const { createAuth } = await import(fromRoot('apps/api/dist/auth.js'))

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

const pg = await PGlite.create({
  extensions: { citext },
  loadDataDir: new Blob([readFileSync(WORLD)], { type: 'application/x-gzip' }),
})
const dbPort = await freePort()
const socket = new PGLiteSocketServer({ db: pg, port: dbPort, host: '127.0.0.1' })
await socket.start()
const { db, client } = createDb(`postgres://postgres@127.0.0.1:${dbPort}/postgres`)

// El reloj: el día actual empezó hace una hora (6 h por día de juego, TICK_INTERVAL_MINUTES = 360).
await client`update worlds set created_at = now() - make_interval(hours => 6 * (select current_day from game_state) + 1)`

const auth = createAuth(db, { secret: SECRET, baseURL: BASE, mailer: { send: async () => true } })
const app = buildApp({
  db,
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
await app.listen({ port: PORT, host: '127.0.0.1' })
console.log(`listening ${BASE}`)

const stop = async () => {
  await app.close()
  await client.end({ timeout: 5 })
  await socket.stop()
  await pg.close()
  process.exit(0)
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())
