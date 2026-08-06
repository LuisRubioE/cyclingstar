import { createServer } from 'node:net'
import { PGlite } from '@electric-sql/pglite'
import { citext } from '@electric-sql/pglite/contrib/citext'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import postgres from 'postgres'
import { type Database, type DbClient, createDb } from './client.js'
import { runMigrations } from './migrate.js'

/**
 * Postgres EFÍMERA en proceso para los tests de integración de esta capa.
 *
 * Usa PGlite (Postgres compilado a WASM) expuesto por un socket TCP, de modo que el cliente real
 * del proyecto (postgres.js + Drizzle) se conecta por el protocolo de verdad: los tests ejercitan
 * el MISMO código de producción, migraciones incluidas, sin Docker ni un Postgres instalado.
 *
 * LIMITACIÓN CONOCIDA: PGlite tiene UN SOLO backend, así que solo admite una sesión a la vez. De ahí
 * `detached()`, para el código que abre su propia conexión (runTick, runMigrations). Y por eso los
 * tests de concurrencia real (contención de advisory locks) necesitan un Postgres de verdad y se
 * saltan si no hay `TEST_DATABASE_URL` (ver `realTestDatabaseUrl`).
 */

export interface TestDb {
  /** Cadena de conexión que entiende postgres.js. */
  readonly url: string
  /** Drizzle sobre la conexión abierta del test. */
  readonly db: Database
  /** Cliente crudo de postgres.js (para SQL a pelo en las aserciones). */
  readonly client: DbClient['client']
  /**
   * Cierra la conexión del test, ejecuta `fn` (que puede abrir la suya: runTick, runMigrations…) y
   * vuelve a conectar. Imprescindible con PGlite, que no admite dos sesiones a la vez.
   */
  detached: <T>(fn: (url: string) => Promise<T>) => Promise<T>
  close: () => Promise<void>
}

/** Pide al sistema operativo un puerto libre (lo abre y lo suelta antes de dárselo a PGlite). */
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (addr === null || typeof addr === 'string') {
        srv.close(() => reject(new Error('no se pudo reservar un puerto libre')))
        return
      }
      const { port } = addr
      srv.close(() => resolve(port))
    })
  })
}

/**
 * Arranca una base efímera con TODAS las migraciones aplicadas desde cero. La base vive solo en
 * memoria: `close()` no deja nada en disco.
 */
export async function startTestDb(): Promise<TestDb> {
  const pg = await PGlite.create({ extensions: { citext } })
  const port = await freePort()
  const server = new PGLiteSocketServer({ db: pg, port, host: '127.0.0.1' })
  await server.start()
  const url = `postgres://postgres@127.0.0.1:${port}/postgres`
  try {
    await runMigrations(url)
  } catch (err) {
    await server.stop()
    await pg.close()
    throw err
  }

  let open = createDb(url)
  const detached = async <T>(fn: (url: string) => Promise<T>): Promise<T> => {
    await open.client.end({ timeout: 5 })
    try {
      return await fn(url)
    } finally {
      open = createDb(url)
    }
  }
  return {
    url,
    get db() {
      return open.db
    },
    get client() {
      return open.client
    },
    detached,
    close: async () => {
      await open.client.end({ timeout: 5 })
      await server.stop()
      await pg.close()
    },
  }
}

/**
 * URL de un Postgres REAL para los tests que necesitan varias sesiones a la vez (contención de
 * advisory locks). Sin ella esos tests se saltan: PGlite no puede simularlos.
 */
export function realTestDatabaseUrl(): string | undefined {
  const url = process.env.TEST_DATABASE_URL
  return url && url.length > 0 ? url : undefined
}

/**
 * Prepara un Postgres REAL (el de `TEST_DATABASE_URL`) para un test: VACÍA el esquema y vuelve a
 * aplicar las migraciones desde cero. Solo para bases de prueba; borra todo lo que haya.
 *
 * A diferencia de PGlite, aquí sí se pueden abrir varias conexiones a la vez, que es lo que hace
 * falta para probar la contención de advisory locks (el doble cobro tick↔web).
 */
export async function resetRealTestDb(url: string): Promise<void> {
  const admin = postgres(url, { max: 1 })
  try {
    await admin.unsafe('drop schema if exists drizzle cascade')
    await admin.unsafe('drop schema if exists public cascade')
    await admin.unsafe('create schema public')
  } finally {
    await admin.end({ timeout: 5 })
  }
  await runMigrations(url)
}
