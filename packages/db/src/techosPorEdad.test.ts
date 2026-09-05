import { ATTRIBUTES, type Attribute, birthSeasonForAge } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { gameState, riderAttrs, riderHidden, riders, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * A LOS QUE YA EXISTEN TAMBIÉN SE LES REABRE EL TECHO (migración 0032, docs/epics.md «G1»).
 *
 * Arreglar el generador solo sirve para quien nazca a partir de ahora; los corredores del mundo
 * vivo llevan sus techos guardados y congelados. Esta prueba corre la migración de verdad sobre
 * Postgres —la base de test aplica todas— y comprueba que al veterano se le abre el oficio, al de
 * plenitud casi nada de motor, y que a nadie se le BAJA lo que ya tenía.
 */

const SEASON_DAYS = 364
const EDAD_SEASON = 5

interface Sembrado {
  veterano: string
  plenitud: string
  jovenConMargen: string
}

async function corredor(
  t: TestDb,
  worldId: string,
  nombre: string,
  edad: number,
  valor: number,
  techo: number,
): Promise<string> {
  const [r] = await t.db
    .insert(riders)
    .values({
      worldId,
      name: nombre,
      country: 'ES',
      gender: 'M' as const,
      birthSeason: birthSeasonForAge(edad, EDAD_SEASON),
      archetype: 'escalada' as const,
      faceSeed: `cara-${nombre}`,
    })
    .returning({ id: riders.id })
  const riderId = r!.id
  await t.db
    .insert(riderAttrs)
    .values(ATTRIBUTES.map((attr: Attribute) => ({ riderId, attr, value: valor })))
  await t.db.insert(riderHidden).values({
    riderId,
    talent: 60,
    fragility: 1,
    peakAge: 27,
    declineAge: 33,
    ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, techo])),
  })
  return riderId
}

describe('db: la migración reabre el techo de los que ya existían', () => {
  let t: TestDb
  let s: Sembrado

  beforeAll(async () => {
    t = await startTestDb()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-techos', engineVersion: 1 })
      .returning({ id: worlds.id })
    const worldId = world!.id
    await t.db.insert(gameState).values({
      id: 1,
      worldId,
      currentDay: SEASON_DAYS * EDAD_SEASON,
      lastProcessedDay: SEASON_DAYS * EDAD_SEASON,
    })
    s = {
      // Congelados como los generaba el motor viejo: el techo ES el atributo.
      veterano: await corredor(t, worldId, 'veterano', 33, 70, 70),
      plenitud: await corredor(t, worldId, 'plenitud', 26, 70, 70),
      // Éste ya tenía margen de sobra: la migración no puede quitárselo.
      jovenConMargen: await corredor(t, worldId, 'joven', 21, 50, 90),
    }
    // La migración 0032 ya se aplicó al crear la base, cuando todavía no había nadie; estos
    // corredores se han sembrado DESPUÉS, así que hay que pasarles la misma sentencia a mano. Es
    // literalmente el SQL del fichero de migración, copiado abajo.
    await t.client.unsafe(MIGRACION_0032)
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  const techos = async (riderId: string): Promise<Record<string, number>> => {
    const rows = await t.db
      .select({ c: riderHidden.ceilings })
      .from(riderHidden)
      .where(eq(riderHidden.riderId, riderId))
    return rows[0]!.c
  }

  it('al veterano se le abre el OFICIO y casi nada de motor', async () => {
    const c = await techos(s.veterano)
    expect(`TAC ${c.TAC}`).toBe('TAC 80')
    expect(`DES ${c.DES}`).toBe('DES 80')
    expect(`PAV ${c.PAV}`).toBe('PAV 80')
    expect(`MON ${c.MON}`).toBe('MON 71')
    expect(`CRI ${c.CRI}`).toBe('CRI 71')
  })

  it('al de plenitud le queda un poco de motor todavía', async () => {
    const c = await techos(s.plenitud)
    expect(`MON ${c.MON}`).toBe('MON 75')
    expect(`TAC ${c.TAC}`).toBe('TAC 84')
  })

  it('y al que ya tenía margen no se le baja', async () => {
    const c = await techos(s.jovenConMargen)
    // Su techo era 90 y el que tocaría por la tabla es 67: manda el máximo, que es el suyo.
    expect(`MON ${c.MON}`).toBe('MON 90')
  })
})

/** La sentencia de la migración 0032, tal cual, para poder aplicarla a lo sembrado en el test. */
const MIGRACION_0032 = `
WITH edades AS (
  SELECT r."id",
         20 - r."birth_season"
           + floor(COALESCE((SELECT g."current_day" FROM "game_state" g WHERE g."id" = 1), 0) / 364)
           AS edad
  FROM "riders" r
),
nuevos AS (
  SELECT h."rider_id",
         jsonb_object_agg(
           a."attr"::text,
           LEAST(96, GREATEST(
             COALESCE((h."ceilings" ->> a."attr"::text)::numeric, a."value"),
             a."value" + CASE
               WHEN a."attr" IN ('TAC', 'DES', 'PAV') THEN
                 CASE WHEN e.edad <= 23 THEN 19 WHEN e.edad <= 27 THEN 14 ELSE 10 END
               ELSE
                 CASE WHEN e.edad <= 23 THEN 17 WHEN e.edad <= 27 THEN 5 ELSE 1 END
             END
           ))
         ) AS techos
  FROM "rider_hidden" h
  JOIN "rider_attrs" a ON a."rider_id" = h."rider_id"
  JOIN edades e ON e."id" = h."rider_id"
  GROUP BY h."rider_id"
)
UPDATE "rider_hidden" h
SET "ceilings" = h."ceilings" || n.techos
FROM nuevos n
WHERE n."rider_id" = h."rider_id";
`
