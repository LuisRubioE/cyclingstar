import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type Database, type DbClient, createDb } from './client.js'
import { realTestDatabaseUrl, realTestDbFor } from './testDb.js'
import { type WatchKey, readWatch, recordProgress, revealStage } from './watch.js'

/**
 * B12 · DOS DISPOSITIVOS (docs/retransmision.md §10.12, regla 2, y §16.4; D-57; paso 7a). Con dos
 * dispositivos gana el máximo: `recordProgress` y `revealStage` corren en una transacción que crea la
 * fila si no existe y la BLOQUEA (`select … for update`) antes de calcular la nueva, así que dos
 * escrituras a la vez de la misma carrera no pierden letras y lo alcanzado es el mayor.
 *
 * No se puede probar sobre PGlite, que tiene un solo backend y una sesión (`testDb.ts`): allí las dos
 * transacciones irían una detrás de otra y el caso pasaría aunque faltara el `for update`. Va contra el
 * Postgres de servicio del job `test` (`TEST_DATABASE_URL`, desde el 1a), en su propia base,
 * `cyclingstar_watch` (16-r: vitest corre los ficheros en paralelo y `resetRealTestDb` vacía el esquema
 * entero), con dos conexiones que llaman a la vez. Sin la variable, en local, se salta.
 */
const REAL_URL = realTestDatabaseUrl()
const ROUNDS = 25

describe.skipIf(REAL_URL == null)('B12 · dos dispositivos a la vez (D-57)', () => {
  const clients: DbClient[] = []
  let a: Database
  let b: Database
  const ids = { user: '', world: '' }
  const key = (raceKey: string): WatchKey => ({ userId: ids.user, worldId: ids.world, raceKey })

  beforeAll(async () => {
    const url = await realTestDbFor('cyclingstar_watch')
    for (let i = 0; i < 2; i++) clients.push(createDb(url))
    a = clients[0]!.db
    b = clients[1]!.db
    const [w] = await clients[0]!.client<{ id: string }[]>`
      insert into worlds (world_seed, engine_version) values ('dos-dispositivos', 91) returning id`
    const [u] = await clients[0]!.client<{ id: string }[]>`
      insert into users (email, name) values ('dos@example.com', 'Dos') returning id`
    ids.world = w!.id
    ids.user = u!.id
  }, 120_000)

  afterAll(async () => {
    for (const c of clients) await c.client.end({ timeout: 5 })
  })

  it('dos progresos a la vez de la misma etapa: reached_s es el mayor y el arrastre, uno solo', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const k = key(`race-progreso-${round}:s0`)
      const [x, y] = [1_000 + round, 2_000 + 3 * round]
      await Promise.all([
        recordProgress(a, k, 3, x, 'play', 20_000),
        recordProgress(b, k, 3, y, 'play', 20_000),
      ])
      expect(await readWatch(a, k), `ronda ${round}`).toEqual({
        follow: 1,
        knownThrough: 2,
        how: 'AA',
        watchingStage: 3,
        reachedS: Math.max(x, y),
      })
    }
  }, 120_000)

  it('la meta en uno y un progreso en el otro, a la vez: la letra no se pierde', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const k = key(`race-meta-${round}:s0`)
      await Promise.all([
        recordProgress(a, k, 3, 20_000, 'play', 20_000),
        recordProgress(b, k, 3, 500 + round, 'play', 20_000),
      ])
      expect(await readWatch(a, k), `ronda ${round}`).toEqual({
        follow: 1,
        knownThrough: 3,
        how: 'AAW',
        watchingStage: null,
        reachedS: null,
      })
    }
  }, 120_000)

  it('ver la 3 en uno y revelar la 5 en el otro, a la vez: gana el prefijo más largo', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const k = key(`race-prefijo-${round}:s0`)
      await Promise.all([
        recordProgress(a, k, 3, 20_000, 'summary', 20_000),
        revealStage(b, k, 5, false),
      ])
      const r = await readWatch(a, k)
      // Si la meta llega antes, AAS y luego AR; si el revelado llega antes, AAAAR y la meta ya no mueve
      // nada. Lo que no puede salir es una de las dos escrituras pisada por la otra.
      expect(['AASAR', 'AAAAR'], `ronda ${round}: ${r?.how}`).toContain(r?.how)
      expect(r?.knownThrough).toBe(5)
    }
  }, 120_000)
})
