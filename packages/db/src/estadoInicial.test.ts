import { ATTRIBUTES, type Attribute, birthSeasonForAge } from '@cyclingstar/shared'
import { BANISTER, MORALE, generateRiderGenome } from '@cyclingstar/engine'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { countRidersForUser, createRider } from './riders.js'
import { purgeAttrLog } from './tick.js'
import { riderAttrLog, riders, users, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * EL ESTADO CON EL QUE NACE UN HUMANO, Y DE DÓNDE VIENE CADA PUNTO (paso 2 del rediseño de
 * entrenamiento, docs/balance.md «v59 §2»).
 *
 * Las tres cosas que se comprueban aquí son las tres que estaban mal y ninguna rompía nada, que es
 * lo que las hacía difíciles de ver: un corredor con CTL 0 corre, un registro sin origen se escribe,
 * y una fila que se pierde por colisión de clave no da error.
 */

const SEASON = 5

describe('db: el humano nace con piernas y el registro sabe de dónde viene', () => {
  let t: TestDb
  let worldId: string
  let userId: string

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-inicial', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = w!.id
    const [u] = await t.db
      .insert(users)
      .values({ email: 'chaval@example.com', passwordHash: 'x' })
      .returning({ id: users.id })
    userId = u!.id
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('`createRider` escribe el estado inicial de las constantes, no el defecto de la columna', async () => {
    const genome = generateRiderGenome('semilla-inicial:usuario:0', 'escalada')
    const { id } = await createRider(t.db, {
      worldId,
      userId,
      name: 'Chaval Nuevo',
      country: 'ES',
      gender: 'M',
      archetype: 'escalada',
      birthSeason: birthSeasonForAge(18, SEASON),
      faceSeed: 'cara',
      attributes: genome.attributes,
      hidden: genome.hidden,
    })
    const [fila] = await t.db
      .select({ ctl: riders.ctl, atl: riders.atl, morale: riders.morale })
      .from(riders)
      .where(eq(riders.id, id))
    // 45/45/60 y no 0/0/50, que es lo que daba la columna cuando nadie los escribía.
    expect(fila!.ctl).toBe(BANISTER.initialCtl)
    expect(fila!.atl).toBe(BANISTER.initialAtl)
    expect(fila!.morale).toBe(MORALE.mean)
    // Y el número importa: con CTL 0 el multiplicador de depósito no es el mismo.
    expect(fila!.ctl).toBeGreaterThan(5)
  })

  it('cuenta los intentos del usuario incluyendo a los retirados, para que la semilla no se repita', async () => {
    // El vivo que acaba de crear la prueba anterior.
    expect(await countRidersForUser(t.db, userId)).toBe(1)
    await t.db
      .update(riders)
      .set({ retiredAt: SEASON })
      .where(and(eq(riders.userId, userId), eq(riders.name, 'Chaval Nuevo')))
    // Retirarse NO baja la cuenta: si bajara, el siguiente ciclista de este usuario nacería con el
    // mismo genoma que el anterior y su segunda carrera sería la misma partida otra vez.
    expect(await countRidersForUser(t.db, userId)).toBe(1)
  })

  it('el mismo día puede sumar por entrenar y por correr, y ya no se pierde una de las dos', async () => {
    const [r] = await t.db
      .insert(riders)
      .values({
        worldId,
        name: 'Doble Jornada',
        country: 'ES',
        gender: 'M' as const,
        birthSeason: birthSeasonForAge(25, SEASON),
        archetype: 'fondo' as const,
        faceSeed: 'cara-doble',
      })
      .returning({ id: riders.id })
    const riderId = r!.id
    const attr: Attribute = ATTRIBUTES[0]!
    await t.db.insert(riderAttrLog).values([
      { riderId, gameDay: 10, attr, delta: 0.4, source: 'entrenamiento' },
      { riderId, gameDay: 10, attr, delta: 0.9, source: 'carrera' },
    ])
    const filas = await t.db
      .select({ delta: riderAttrLog.delta, source: riderAttrLog.source })
      .from(riderAttrLog)
      .where(and(eq(riderAttrLog.riderId, riderId), eq(riderAttrLog.gameDay, 10)))
    // Con la clave vieja `(rider_id, game_day, attr)` la segunda fila chocaba y el
    // `onConflictDoNothing` de los escritores la tiraba en silencio: aquí serían 1.
    expect(filas).toHaveLength(2)
    expect(filas.map((f) => f.source).sort()).toEqual(['carrera', 'entrenamiento'])
  })
})

describe('db: la purga del registro de atributos, que no existía', () => {
  let t: TestDb
  let riderId: string

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-purga', engineVersion: 1 })
      .returning({ id: worlds.id })
    const [r] = await t.db
      .insert(riders)
      .values({
        worldId: w!.id,
        name: 'Viejo Registro',
        country: 'ES',
        gender: 'M' as const,
        birthSeason: birthSeasonForAge(25, SEASON),
        archetype: 'fondo' as const,
        faceSeed: 'cara-purga',
      })
      .returning({ id: riders.id })
    riderId = r!.id
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('deja vivos exactamente los últimos 60 días y borra el 61', async () => {
    const attr: Attribute = ATTRIBUTES[0]!
    const hoy = 200
    // Un día por cada antigüedad entre 0 y 62.
    await t.db.insert(riderAttrLog).values(
      Array.from({ length: 63 }, (_, edad) => ({
        riderId,
        gameDay: hoy - edad,
        attr,
        delta: 0.1,
        source: 'entrenamiento' as const,
      })),
    )
    await t.db.transaction(async (tx) => {
      await purgeAttrLog(tx, hoy)
    })
    const quedan = await t.db
      .select({ gameDay: riderAttrLog.gameDay })
      .from(riderAttrLog)
      .where(eq(riderAttrLog.riderId, riderId))
    const dias = quedan.map((f) => f.gameDay).sort((a, b) => a - b)
    // Vivos del 140 al 200: son 61 filas, las de antigüedad 0 a 60. El de 61 días (139) se va.
    expect(dias).toHaveLength(61)
    expect(dias[0]).toBe(hoy - 60)
    expect(dias.includes(hoy - 61)).toBe(false)
  })
})
