#!/usr/bin/env node
/* global process, console, Blob */
/**
 * SIRVE EL MUNDO DE LA PRUEBA DEL TELÉFONO (E3, docs/visual.md §7.2; PR 2a). Carga en PGlite el volcado
 * de `build.mjs` y levanta la API de verdad (`buildApp`, better-auth, el horizonte y la retransmisión)
 * con la web compilada (`apps/web/dist`). Es el port de `docs/diseno/e3-visual/capturas/servir.mjs`.
 * Los dos interruptores de E2 van en `on`, como en producción desde el 10 de octubre de 2026. No corre
 * el tick: el mundo se queda en el día del volcado.
 *
 * Toca dos cosas, y solo en esta copia: el ancla del reloj (`worlds.created_at`), para que la cuenta
 * atrás del siguiente día no salga vencida, y el país por IP, que contesta un doble (`ES`) en vez de
 * salir a la red. El límite de la API es de 300 peticiones por minuto e IP (`apps/api/src/security.ts`
 * l. 10): quien la mida pone una IP propia por contexto en `x-forwarded-for`.
 *
 * Uso, desde la raíz del repositorio compilado:
 *   node apps/web/e2e/world/serve.mjs [--world apps/web/e2e/world/.mundo/mundo-50.tar.gz] [--port 3005]
 *     [--web <carpeta de una web compilada>]
 * `--web` sirve otra web sobre el mismo mundo y con la misma API: la de la base de un PR, que la prueba
 * del teléfono mide para comparar con la del PR (7-h).
 * Escribe `listening <url>` en la salida cuando está listo; SIGINT o SIGTERM lo paran.
 */
import { readFileSync } from 'node:fs'
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
const WORLD = resolve(arg('--world', resolve(HERE, '.mundo/mundo-50.tar.gz')))
const PORT = Number(arg('--port', '3005'))
const WEB = arg('--web', null)
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
  ...(WEB === null ? {} : { webRoot: resolve(WEB) }),
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
