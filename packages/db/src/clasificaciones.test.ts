import { birthSeasonForAge } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { YOUNG_MAX_AGE, getRaceClassifications, standingsByRider } from './classifications.js'
import { raceGc, riders, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * LAS CLASIFICACIONES SECUNDARIAS (docs/tactica.md paso 4).
 *
 * Se calculan de `race_gc` en vez de guardarse en una tabla propia, y lo que hay que probar es que
 * esa decisión no cuesta nada: que salen bien, ordenadas, y con el hueco al de delante, que es el
 * dato del que cuelgan R05, R06 y R07.
 */

const SEASON = 4
const GAME_DAY = SEASON * 364 + 40

describe('db: puntos, montaña y joven', () => {
  let t: TestDb
  let worldId: string
  const ids: string[] = []

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-clasif', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = w!.id
    // Cuatro corredores: dos jóvenes y dos veteranos, con puntos cruzados a propósito para que el
    // orden de una clasificación no coincida con el de otra.
    const edades = [22, 24, 30, 33]
    for (let i = 0; i < 4; i++) {
      const [r] = await t.db
        .insert(riders)
        .values({
          worldId,
          name: `Corredor ${i}`,
          country: 'ES',
          gender: 'M' as const,
          archetype: 'fondo' as const,
          birthSeason: birthSeasonForAge(edades[i]!, SEASON),
          faceSeed: `cara-${i}`,
        })
        .returning({ id: riders.id })
      ids.push(r!.id)
    }
    await t.db.insert(raceGc).values([
      { raceId: 'x:s4', riderId: ids[0]!, tiempoTotalS: 3600, puntosVolante: 10, puntosMontana: 2 },
      { raceId: 'x:s4', riderId: ids[1]!, tiempoTotalS: 3550, puntosVolante: 30, puntosMontana: 0 },
      {
        raceId: 'x:s4',
        riderId: ids[2]!,
        tiempoTotalS: 3500,
        puntosVolante: 25,
        puntosMontana: 18,
      },
      { raceId: 'x:s4', riderId: ids[3]!, tiempoTotalS: 3700, puntosVolante: 0, puntosMontana: 40 },
    ])
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('los puntos van de MÁS a menos, que es como se gana esa clasificación', async () => {
    const c = await getRaceClassifications(t.db, 'x:s4', GAME_DAY)
    expect(c.puntos.map((f) => f.riderId)).toEqual([ids[1], ids[2], ids[0], ids[3]])
    expect(c.puntos[0]?.points).toBe(30)
  })

  it('la montaña es OTRA clasificación: su orden no es el de los puntos', async () => {
    // Importa: si las dos salieran iguales, el módulo estaría devolviendo la misma lista dos veces y
    // nadie se enteraría hasta que una regla decidiera con ella.
    const c = await getRaceClassifications(t.db, 'x:s4', GAME_DAY)
    expect(c.montana.map((f) => f.riderId)).toEqual([ids[3], ids[2], ids[0], ids[1]])
  })

  it('LA DE JÓVENES ES LA GENERAL FILTRADA, así que va por TIEMPO y menos es mejor', async () => {
    const c = await getRaceClassifications(t.db, 'x:s4', GAME_DAY)
    // Solo los de 22 y 24 entran; el de 30 y el de 33 no.
    expect(c.joven.map((f) => f.riderId)).toEqual([ids[1], ids[0]])
    expect(c.joven[0]?.points).toBe(3550)
    expect(YOUNG_MAX_AGE).toBe(25)
  })

  it('EL HUECO AL DE DELANTE, que es lo que decide si vale la pena pelear hoy', async () => {
    // Ir segundo a un punto y ir segundo a cuarenta son dos carreras distintas, y «rank 2» no las
    // distingue. Es el dato del que cuelga R05.
    const c = await getRaceClassifications(t.db, 'x:s4', GAME_DAY)
    expect(c.puntos[0]?.toNextRank).toBe(0)
    expect(c.puntos[1]?.toNextRank).toBe(5)
    expect(c.puntos[2]?.toNextRank).toBe(15)
  })

  it('vueltas del revés, por corredor: es como el motor las quiere', async () => {
    const c = await getRaceClassifications(t.db, 'x:s4', GAME_DAY)
    const porCorredor = standingsByRider(c)
    // El veterano líder de la montaña tiene dos filas y NO la de joven.
    const suyas = porCorredor.get(ids[3]!) ?? []
    expect(suyas.map((f) => f.kind).sort()).toEqual(['montana', 'puntos'])
    // Y el chaval tiene las tres.
    expect((porCorredor.get(ids[1]!) ?? []).map((f) => f.kind).sort()).toEqual([
      'joven',
      'montana',
      'puntos',
    ])
  })

  it('una carrera sin filas devuelve tres listas vacías, no revienta', async () => {
    const c = await getRaceClassifications(t.db, 'no-existe:s4', GAME_DAY)
    expect(c).toEqual({ puntos: [], montana: [], joven: [] })
  })
})
