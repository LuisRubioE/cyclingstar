import { ATTRIBUTES, type Attribute, birthSeasonForAge } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runMarket } from './contracts.js'
import { offers, riderAttrs, riderHidden, riders, teams, users, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * EL CONTRATO SE GANA, contra Postgres real (PGlite).
 *
 * El dueño, sobre cómo debería empezar un jugador: «yo diría que empiecen con 18 años… con stats
 * casi a cero, **sin equipo**… y así para cuando cumplan 19 y 20 ya pueden tener mejores stats,
 * **quizás un equipo**».
 *
 * La primera mitad ya se cumplía —`createRider` no asigna equipo— pero la segunda no significaba
 * nada: `runMarket` le mantiene a TODO agente libre humano una cartera de 3-5 ofertas frescas, sin
 * mirar su nivel. Así que «sin equipo» duraba hasta el primer tick y un chaval de 18 años con las
 * piernas de un chaval recibía tres ofertas continentales el primer día.
 *
 * Se prueba contra Postgres y no sobre una función pura porque lo que decide es el BUCLE del
 * mercado —a quién se le rellena la cartera— y no una fórmula: con `divisionsForRating` a solas el
 * defecto pasaría en verde, porque su respuesta para un novato («CON») es correcta; lo que estaba
 * mal es que se llegara a preguntar.
 */

const SEASON_DAYS = 364

interface Sembrado {
  worldId: string
  /** Recién creado: por debajo del suelo de una plantilla continental. */
  novato: string
  /** Un año después: ya cruza el listón. */
  crecido: string
}

/** Pone a un corredor todos los atributos al mismo valor, que es lo que mueve su `rating`. */
async function sembrarCorredor(
  t: TestDb,
  worldId: string,
  teamIdParaOfertas: string,
  nombre: string,
  nivel: number,
  edad: number,
  season: number,
): Promise<string> {
  const [user] = await t.db
    .insert(users)
    .values({ email: `${nombre}@ejemplo.test`, passwordHash: 'x' })
    .returning({ id: users.id })
  const [rider] = await t.db
    .insert(riders)
    .values({
      worldId,
      userId: user!.id,
      // SIN EQUIPO: es un agente libre, que es como empieza todo jugador.
      teamId: null,
      name: `Corredor ${nombre}`,
      country: 'ES',
      gender: 'M' as const,
      birthSeason: birthSeasonForAge(edad, season),
      archetype: 'escalada' as const,
      faceSeed: `cara-${nombre}`,
    })
    .returning({ id: riders.id })
  await t.db
    .insert(riderAttrs)
    .values(ATTRIBUTES.map((attr: Attribute) => ({ riderId: rider!.id, attr, value: nivel })))
  await t.db.insert(riderHidden).values({
    riderId: rider!.id,
    talent: 60,
    fragility: 1,
    peakAge: 27,
    declineAge: 33,
    ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 80])),
  })
  void teamIdParaOfertas
  return rider!.id
}

async function sembrar(t: TestDb, season: number): Promise<Sembrado> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-mercado', engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = world!.id
  // Equipos continentales con presupuesto y hueco: si nadie ficha, no es por falta de equipos.
  const equipos = await t.db
    .insert(teams)
    .values(
      Array.from({ length: 6 }, (_, i) => ({
        worldId,
        name: `Continental ${i}`,
        division: 'CON' as const,
        philosophy: 'cantera' as const,
        jerseySeed: `j${i}`,
        country: 'ES',
        budget: 5_000_000,
      })),
    )
    .returning({ id: teams.id })
  const novato = await sembrarCorredor(t, worldId, equipos[0]!.id, 'novato', 21, 18, season)
  const crecido = await sembrarCorredor(t, worldId, equipos[0]!.id, 'crecido', 50, 19, season)
  return { worldId, novato, crecido }
}

describe('db: el contrato se gana, no viene de serie', () => {
  let t: TestDb
  let s: Sembrado
  const gameDay = SEASON_DAYS * 3

  beforeAll(async () => {
    t = await startTestDb()
    s = await sembrar(t, gameDay / SEASON_DAYS)
    await t.db.transaction(async (tx) => {
      await runMarket(tx as never, s.worldId, gameDay, 'semilla-mercado')
    })
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  const ofertasDe = async (riderId: string): Promise<number> => {
    const rows = await t.db.select().from(offers).where(eq(offers.riderId, riderId))
    return rows.length
  }

  it('al chaval de 18 recién creado no le ficha nadie', async () => {
    // Su `rating` es 0,21: por debajo del percentil 10 de una plantilla continental (0,496).
    expect(`ofertas del novato: ${await ofertasDe(s.novato)}`).toBe('ofertas del novato: 0')
  })

  it('…y al que ya ha entrenado un año, sí', async () => {
    /**
     * La otra mitad, sin la cual esto se pasaría cerrando el mercado a todo el mundo. Con `rating`
     * 0,50 —lo que da una temporada de entrenamiento— el mercado vuelve a funcionar como siempre y
     * le mantiene su cartera de 3-5 ofertas frescas.
     */
    const n = await ofertasDe(s.crecido)
    expect(`ofertas del crecido: ${n >= 3 && n <= 5}`).toBe('ofertas del crecido: true')
  })
})
