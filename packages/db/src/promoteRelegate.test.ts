import { birthSeasonForAge } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runRollover } from './rollover.js'
import { riders, teams, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * SUBE EL QUE HA PUNTUADO Y BAJA EL QUE NO (docs/epics.md «G4»), contra Postgres real.
 *
 * La maquinaria de ascensos y descensos existía —dos suben y dos bajan por división en cada
 * rollover— pero **se alimentaba de una columna vacía**: la fuerza del equipo era `sum(riders.fame)`
 * y `fame` no se escribe en ninguna parte del repositorio. Todos los equipos empataban a cero, así
 * que quién subía y quién bajaba lo decidía el desempate del `sort` y era ARBITRARIO cada temporada.
 *
 * Se prueba de punta a punta y no sobre una función pura a propósito, por la misma razón que el
 * test de retiros: lo que estaba mal no era una fórmula sino DE DÓNDE salía el número, y una prueba
 * de la fórmula habría pasado en verde con el defecto dentro.
 */

const SEASON_DAYS = 364
const GAME_DAY = SEASON_DAYS * 4

interface Sembrado {
  worldId: string
  /** El peor WorldTour por puntos: tiene que BAJAR. */
  wtHundido: string
  /** El mejor WorldTour: se queda. */
  wtFuerte: string
  /** El mejor Pro Series: tiene que SUBIR. */
  prsCampeon: string
  /** El peor Pro Series: tiene que bajar a Continental. */
  prsHundido: string
  /** El mejor Continental: sube a Pro Series. */
  conCampeon: string
}

/** Un equipo con `n` corredores, cada uno con `puntos` puntos de temporada. */
async function equipo(
  t: TestDb,
  worldId: string,
  nombre: string,
  division: 'WT' | 'PRS' | 'CON',
  puntos: number,
): Promise<string> {
  const [team] = await t.db
    .insert(teams)
    .values({
      worldId,
      name: nombre,
      division,
      philosophy: 'general' as const,
      jerseySeed: `j-${nombre}`,
      country: 'ES',
    })
    .returning({ id: teams.id })
  const teamId = team!.id
  await t.db.insert(riders).values(
    Array.from({ length: 4 }, (_, i) => ({
      worldId,
      teamId,
      name: `${nombre} ${i}`,
      country: 'ES',
      gender: 'M' as const,
      // Edad de sobra lejos del retiro: aquí no se mide eso.
      birthSeason: birthSeasonForAge(26, GAME_DAY / SEASON_DAYS),
      archetype: 'fondo' as const,
      faceSeed: `cara-${nombre}-${i}`,
      seasonPoints: puntos,
    })),
  )
  return teamId
}

async function sembrar(t: TestDb): Promise<Sembrado> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-ascensos', engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = world!.id
  // Cuatro equipos por división: hacen falta al menos dos para que el bloque se ejecute.
  const s: Sembrado = {
    worldId,
    wtFuerte: await equipo(t, worldId, 'WT-fuerte', 'WT', 900),
    wtHundido: await equipo(t, worldId, 'WT-hundido', 'WT', 5),
    prsCampeon: await equipo(t, worldId, 'PRS-campeon', 'PRS', 800),
    prsHundido: await equipo(t, worldId, 'PRS-hundido', 'PRS', 1),
    conCampeon: await equipo(t, worldId, 'CON-campeon', 'CON', 700),
  }
  await equipo(t, worldId, 'WT-medio', 'WT', 400)
  await equipo(t, worldId, 'WT-medio-2', 'WT', 300)
  await equipo(t, worldId, 'PRS-medio', 'PRS', 200)
  await equipo(t, worldId, 'PRS-medio-2', 'PRS', 150)
  await equipo(t, worldId, 'CON-medio', 'CON', 100)
  await equipo(t, worldId, 'CON-medio-2', 'CON', 50)
  return s
}

describe('db: sube el que puntúa y baja el que no (G4)', () => {
  let t: TestDb
  let s: Sembrado

  beforeAll(async () => {
    t = await startTestDb()
    s = await sembrar(t)
    await t.db.transaction(async (tx) => {
      await runRollover(tx as never, s.worldId, GAME_DAY, 'semilla-ascensos')
    })
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  const divisionDe = async (id: string): Promise<string> => {
    const rows = await t.db.select({ d: teams.division }).from(teams).where(eq(teams.id, id))
    return rows[0]!.d
  }

  it('el mejor Pro Series asciende al WorldTour', async () => {
    expect(`PRS-campeon: ${await divisionDe(s.prsCampeon)}`).toBe('PRS-campeon: WT')
  })

  it('…y el peor WorldTour baja a Pro Series', async () => {
    expect(`WT-hundido: ${await divisionDe(s.wtHundido)}`).toBe('WT-hundido: PRS')
  })

  it('el mejor Continental asciende, y el peor Pro Series baja a Continental', async () => {
    expect(`CON-campeon: ${await divisionDe(s.conCampeon)}`).toBe('CON-campeon: PRS')
    expect(`PRS-hundido: ${await divisionDe(s.prsHundido)}`).toBe('PRS-hundido: CON')
  })

  it('y al que gana la temporada no le mueve nadie', async () => {
    expect(`WT-fuerte: ${await divisionDe(s.wtFuerte)}`).toBe('WT-fuerte: WT')
  })
})
