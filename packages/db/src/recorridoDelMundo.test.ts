import { SEASON_CALENDAR } from '@cyclingstar/engine'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { backfillRaceRoutes, freezeRaceRoute, getRaceRoute } from './raceRoutes.js'
import { worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * EL RECORRIDO ES DEL MUNDO (docs/tactica.md paso 1a).
 *
 * Lo que hay que probar no es que la tabla guarde JSON: es la PROMESA que la justifica. El perfil
 * que el tick usa tiene que ser **idéntico byte a byte** al del calendario de hoy —si no, el paso 1a
 * ya habría cambiado la conducta y no puede, porque no sube versión— y tiene que quedar CONGELADO,
 * o sea que reescribirlo no puede pisarlo.
 */

/**
 * «IDÉNTICO BYTE A BYTE» NO SE PUEDE PEDIR, Y HAY QUE DECIR POR QUÉ EN VEZ DE AFLOJAR LA PRUEBA.
 *
 * El criterio del paso 1a pide que el perfil leído sea idéntico byte a byte al del calendario.
 * **JSONB de Postgres normaliza el orden de las claves** —`{g, km}` vuelve como `{km, g}`, y
 * `banners` se coloca antes que `segments`—, así que la igualdad de bytes es imposible por
 * construcción del almacén, no por un fallo del código.
 *
 * Y es IRRELEVANTE: el motor lee `s.km` y `s.tipo`, no un buffer. Lo que sí importa —y lo que esta
 * función comprueba— es que ningún VALOR cambie y que el orden de los ARRAYS se conserve, que eso
 * JSONB sí lo respeta y el motor sí lo lee (el tercer segmento es el tercer segmento).
 */
function canonico(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonico).join(',')}]`
  if (x !== null && typeof x === 'object') {
    const e = Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1))
    return `{${e.map(([k, v]) => `${JSON.stringify(k)}:${canonico(v)}`).join(',')}}`
  }
  return JSON.stringify(x)
}

describe('db: el recorrido se congela el día que nace la carrera', () => {
  let t: TestDb
  let worldId: string

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-rutas', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = w!.id
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('EL PERFIL GUARDADO ES IDÉNTICO AL DEL CALENDARIO, que es la condición del paso 1a', async () => {
    // Si difiriera en un decimal, este paso habría cambiado la conducta del motor sin subir versión.
    const race = SEASON_CALENDAR.find((r) => r.stages.length >= 3)!
    await freezeRaceRoute(t.db, worldId, `${race.id}:s0`, race.id)
    for (let i = 1; i <= race.stages.length; i++) {
      const leido = await getRaceRoute(t.db, worldId, `${race.id}:s0`, i)
      expect(canonico(leido)).toBe(canonico(race.stages[i - 1]!.profile))
    }
  })

  it('CONGELADO quiere decir congelado: volver a escribir no lo pisa', async () => {
    // Es la razón de ser entera de la tabla. Si el segundo `freeze` sobrescribiera, el día que el
    // paso 1b cambie el generador se le movería el recorrido a una carrera a medio correr.
    const race = SEASON_CALENDAR.find((r) => r.stages.length >= 3)!
    const antes = await getRaceRoute(t.db, worldId, `${race.id}:s0`, 1)
    await freezeRaceRoute(t.db, worldId, `${race.id}:s0`, race.id)
    const despues = await getRaceRoute(t.db, worldId, `${race.id}:s0`, 1)
    expect(canonico(despues)).toBe(canonico(antes))
  })

  it('una carrera de otra temporada es OTRO recorrido, aunque sea la misma carrera', async () => {
    // La clave lleva la temporada dentro: el Tour del año que viene puede tener otro recorrido, que
    // es justo lo que este rediseño quiere poder hacer.
    const race = SEASON_CALENDAR.find((r) => r.stages.length >= 3)!
    expect(await getRaceRoute(t.db, worldId, `${race.id}:s1`, 1)).toBeNull()
  })

  it('una carrera de antes de la tabla devuelve null, y el tick cae al calendario', async () => {
    // Es el caso de un mundo en marcha el día del despliegue: no puede reventar, tiene que degradar.
    expect(await getRaceRoute(t.db, worldId, 'race-que-no-existe:s0', 1)).toBeNull()
  })

  it('el backfill congela lo que falta y NO toca lo que ya estaba', async () => {
    const ya = SEASON_CALENDAR.find((r) => r.stages.length >= 3)!
    const nuevas = SEASON_CALENDAR.filter((r) => r.id !== ya.id).slice(0, 3)
    const claves = [`${ya.id}:s0`, ...nuevas.map((r) => `${r.id}:s0`)]
    const escritas = await backfillRaceRoutes(t.db, worldId, claves)
    // Tres nuevas; la que ya estaba no se vuelve a tocar.
    expect(escritas).toBe(3)
    for (const r of nuevas) {
      const leido = await getRaceRoute(t.db, worldId, `${r.id}:s0`, 1)
      expect(canonico(leido)).toBe(canonico(r.stages[0]!.profile))
    }
  })

  it('el backfill es idempotente: correrlo dos veces no escribe nada la segunda', async () => {
    const claves = SEASON_CALENDAR.slice(0, 4).map((r) => `${r.id}:s0`)
    await backfillRaceRoutes(t.db, worldId, claves)
    expect(await backfillRaceRoutes(t.db, worldId, claves)).toBe(0)
  })
})
