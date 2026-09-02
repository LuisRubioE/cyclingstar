import { ATTRIBUTES, RIDER_AGE_EPOCH, birthSeasonForAge } from '@cyclingstar/shared'
import { HARD_RETIRE_AGE } from '@cyclingstar/engine'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getRiderForUser } from './riders.js'
import { runRollover } from './rollover.js'
import { riderAttrs, riderHidden, riders, teams, users, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * EL JUGADOR HUMANO TAMBIÉN SE JUBILA (v47), contra Postgres real.
 *
 * Hasta la v47 el bloque de retiros del rollover filtraba por `isNull(riders.userId)`: retiraba NPC
 * y **solo** NPC. Un corredor de jugador no se retiraba nunca, ni a los 39 ni a los sesenta, así que
 * la edad dura era decorado para la mitad del mundo que de verdad importa. El dueño lo pidió con
 * todas las letras: «tiene que obligar al jugador humano a retirarse… y ahí puede crear otro nuevo».
 *
 * Se prueba de punta a punta y no sobre una función pura a propósito: lo que estaba mal no era una
 * fórmula sino un FILTRO de SQL, y una prueba de la fórmula habría pasado en verde con el defecto
 * dentro.
 */

const SEASON_DAYS = 364

interface Sembrado {
  worldId: string
  viejo: string
  joven: string
  npc: string
  userViejo: string
  userJoven: string
}

/** La temporada a la que salta el rollover cuando se corre en `gameDay`. */
const temporadaTras = (gameDay: number): number => gameDay / SEASON_DAYS

async function sembrar(t: TestDb, gameDay: number): Promise<Sembrado> {
  // La temporada a la que el rollover va a saltar: las edades se siembran CONTRA ELLA, porque es la
  // que `runRollover` usa para decidir quién se jubila.
  const nueva = temporadaTras(gameDay)
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-retiro', engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = world!.id
  const [team] = await t.db
    .insert(teams)
    .values({
      worldId,
      name: 'Equipo de pruebas',
      division: 'WT',
      philosophy: 'general',
      jerseySeed: 'j0',
      country: 'ES',
    })
    .returning({ id: teams.id })

  const cuentas = await t.db
    .insert(users)
    .values([
      { email: 'viejo@ejemplo.test', passwordHash: 'x' },
      { email: 'joven@ejemplo.test', passwordHash: 'x' },
    ])
    .returning({ id: users.id })
  const [userViejo, userJoven] = cuentas.map((u) => u.id) as [string, string]

  // Tres corredores en el mismo equipo: el humano que YA cumple la edad dura, el humano que no la
  // cumple todavía (por un año), y un NPC de la misma edad que el primero como grupo de control.
  const gente: { tag: string; age: number; userId: string | null }[] = [
    { tag: 'viejo', age: HARD_RETIRE_AGE, userId: userViejo },
    { tag: 'joven', age: HARD_RETIRE_AGE - 1, userId: userJoven },
    { tag: 'npc', age: HARD_RETIRE_AGE, userId: null },
  ]
  const insertados = await t.db
    .insert(riders)
    .values(
      gente.map((g, i) => ({
        worldId,
        teamId: team!.id,
        userId: g.userId,
        name: `Corredor ${g.tag}`,
        country: 'ES',
        gender: 'M' as const,
        birthSeason: birthSeasonForAge(g.age, nueva),
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
      })),
    )
    .returning({ id: riders.id })
  const [viejo, joven, npc] = insertados.map((r) => r.id) as [string, string, string]

  await t.db
    .insert(riderAttrs)
    .values(
      insertados.flatMap(({ id }) => ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 }))),
    )
  // `riderHidden` hace falta porque el bloque de NPC lo une por `innerJoin`: sin él el NPC de control
  // no entraría siquiera en la consulta y el caso no probaría nada.
  await t.db.insert(riderHidden).values(
    insertados.map(({ id }) => ({
      riderId: id,
      talent: 50,
      fragility: 1,
      peakAge: 27,
      declineAge: 33,
      ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 60])),
    })),
  )
  return { worldId, viejo, joven, npc, userViejo, userJoven }
}

describe('db: el corredor de un jugador se jubila a la edad dura', () => {
  let t: TestDb
  let s: Sembrado
  const gameDay = SEASON_DAYS * 12

  beforeAll(async () => {
    t = await startTestDb()
    s = await sembrar(t, gameDay)
    await t.db.transaction(async (tx) => {
      await runRollover(tx as never, s.worldId, gameDay, 'semilla-retiro')
    })
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  const retiradoDe = async (id: string): Promise<number | null> => {
    const rows = await t.db
      .select({ retiredAt: riders.retiredAt, teamId: riders.teamId })
      .from(riders)
      .where(eq(riders.id, id))
    return rows[0]?.retiredAt ?? null
  }

  it('al humano que llega a la edad dura lo jubila, y le quita el equipo', async () => {
    expect(await retiradoDe(s.viejo)).toBe(temporadaTras(gameDay))
    const rows = await t.db
      .select({ teamId: riders.teamId })
      .from(riders)
      .where(eq(riders.id, s.viejo))
    expect(rows[0]?.teamId).toBeNull()
  })

  it('…y al que le falta un año NO lo toca', async () => {
    // Es la mitad que impide que la corrección se pase de frenada: si jubilara a todo humano, este
    // test pasaría igual de verde con un defecto peor que el original.
    expect(await retiradoDe(s.joven)).toBeNull()
  })

  /**
   * Y LA CONSECUENCIA QUE EL DUEÑO PIDIÓ: «ahí puede crear otro nuevo». La creación se bloquea con
   * `getRiderForUser`, así que lo que hace posible el relevo es que esa consulta deje de ver al
   * retirado. Su palmarés y su ficha siguen en la base: deja de ser «tu ciclista», no desaparece.
   */
  it('el jubilado deja de ser «tu ciclista», así que el jugador puede crearse otro', async () => {
    expect(await getRiderForUser(t.db, s.userViejo)).toBeNull()
    // …y al que sigue en activo se le sigue viendo, que es la otra mitad del filtro.
    const suyo = await getRiderForUser(t.db, s.userJoven)
    expect(suyo?.id).toBe(s.joven)
  })

  it('el NPC de la misma edad se jubila igual: esto no cambia lo que ya funcionaba', async () => {
    expect(await retiradoDe(s.npc)).toBe(temporadaTras(gameDay))
  })

  it('la época de las edades es la que dice `birthSeasonForAge`', () => {
    // El 20 estaba suelto dentro de `riderAge` y repetido a mano en rollover.ts y browse.ts. Si
    // alguien lo cambia sin darse cuenta, la edad de TODOS los corredores guardados se desplaza.
    expect(RIDER_AGE_EPOCH).toBe(20)
    expect(birthSeasonForAge(HARD_RETIRE_AGE, 12)).toBe(RIDER_AGE_EPOCH - HARD_RETIRE_AGE + 12)
  })
})
