import { DAYS_PER_SEASON, birthSeasonForAge } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RANKING_WINDOW_DAYS, addSeasonPointsBatch, getRanking } from './ranking.js'
import { riderPoints, riders, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * EL RANKING A 365 DÍAS RODANTES (docs/epics.md «G3»), contra Postgres real (PGlite).
 *
 * El dueño: «el ranking debería sumar los puntos en los últimos 365 días: si llegamos al GD 25, hay
 * que sumar los que consigan ese día y **restar los que consiguieron el GD 25 del año anterior**».
 *
 * Se prueba contra la base y no sobre una función pura porque lo que cambia es DE DÓNDE sale el
 * número: antes de la v48 el ranking sumaba `riders.season_points`, un contador que el rollover
 * pone a cero. La prueba que de verdad importa es la última: el ranking sobrevive al rollover.
 */

const HOY = DAYS_PER_SEASON * 5 + 25

interface Sembrado {
  worldId: string
  /** Puntuó hace un mes: dentro de la ventana. */
  reciente: string
  /** Puntuó el mismo día del año pasado: fuera, por el ejemplo del dueño. */
  justoFuera: string
  /** Puntuó el día siguiente al mismo día del año pasado: el primero que entra. */
  justoDentro: string
  /** Puntuó hace un mes y hace un año: solo cuenta lo de hace un mes. */
  mixto: string
}

async function sembrarCorredor(t: TestDb, worldId: string, nombre: string): Promise<string> {
  const [rider] = await t.db
    .insert(riders)
    .values({
      worldId,
      name: `Corredor ${nombre}`,
      country: 'ES',
      gender: 'M' as const,
      birthSeason: birthSeasonForAge(25, 5),
      archetype: 'escalada' as const,
      faceSeed: `cara-${nombre}`,
    })
    .returning({ id: riders.id })
  return rider!.id
}

async function sembrar(t: TestDb): Promise<Sembrado> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-ranking', engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = world!.id
  const s: Sembrado = {
    worldId,
    reciente: await sembrarCorredor(t, worldId, 'reciente'),
    justoFuera: await sembrarCorredor(t, worldId, 'justo-fuera'),
    justoDentro: await sembrarCorredor(t, worldId, 'justo-dentro'),
    mixto: await sembrarCorredor(t, worldId, 'mixto'),
  }
  const puntuar = async (riderId: string, gameDay: number, points: number): Promise<void> => {
    await t.db.transaction(async (tx) => {
      await addSeasonPointsBatch(tx as never, [{ riderId, points }], {
        gameDay,
        raceId: 'race-x:s5',
        kind: 'stage',
      })
    })
  }
  await puntuar(s.reciente, HOY - 30, 100)
  await puntuar(s.justoFuera, HOY - RANKING_WINDOW_DAYS, 500)
  await puntuar(s.justoDentro, HOY - RANKING_WINDOW_DAYS + 1, 400)
  await puntuar(s.mixto, HOY - 30, 60)
  await puntuar(s.mixto, HOY - RANKING_WINDOW_DAYS - 10, 900)
  return s
}

describe('db: el ranking suma los últimos 365 días de juego', () => {
  let t: TestDb
  let s: Sembrado

  beforeAll(async () => {
    t = await startTestDb()
    s = await sembrar(t)
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  const puntosDe = async (riderId: string, day = HOY): Promise<number> => {
    const filas = await getRanking(t.db, s.worldId, day)
    return filas.find((r) => r.riderId === riderId)?.points ?? -1
  }

  it('la ventana son 364 días, que es lo que dura un año aquí', () => {
    expect(RANKING_WINDOW_DAYS).toBe(DAYS_PER_SEASON)
  })

  it('cuenta lo de este año y deja fuera el mismo día del año pasado', async () => {
    // El ejemplo del dueño, literal: lo del GD de hace exactamente un año ya no suma.
    expect(`reciente: ${await puntosDe(s.reciente)}`).toBe('reciente: 100')
    expect(`justo fuera: ${await puntosDe(s.justoFuera)}`).toBe('justo fuera: 0')
    expect(`justo dentro: ${await puntosDe(s.justoDentro)}`).toBe('justo dentro: 400')
  })

  it('a un mismo corredor le suma lo de dentro y le resta lo de fuera', async () => {
    expect(`mixto: ${await puntosDe(s.mixto)}`).toBe('mixto: 60')
  })

  it('lo de hace un año SÍ contaba cuando era reciente', async () => {
    // La misma fila, mirada desde el día en que se consiguió: la ventana rueda, no borra.
    const entonces = HOY - RANKING_WINDOW_DAYS
    expect(`justo fuera, entonces: ${await puntosDe(s.justoFuera, entonces)}`).toBe(
      'justo fuera, entonces: 500',
    )
  })

  it('el que no ha puntuado en un año sale con 0, no desaparece del mundo', async () => {
    const filas = await getRanking(t.db, s.worldId, HOY)
    const nadie = filas.find((r) => r.riderId === s.justoFuera)
    expect(`sigue en la lista: ${nadie !== undefined}`).toBe('sigue en la lista: true')
  })

  it('EL ROLLOVER YA NO BORRA EL RANKING', async () => {
    /**
     * Lo que motivó la épica. `season_points` se pone a cero al cambiar de temporada; antes de la
     * v48 eso vaciaba el ranking entero y el ganador del Tour de diciembre aparecía por detrás de
     * cualquiera que puntuase en una .2 en enero.
     */
    await t.db.update(riders).set({ seasonPoints: 0 }).where(eq(riders.worldId, s.worldId))
    expect(`tras el rollover: ${await puntosDe(s.reciente)}`).toBe('tras el rollover: 100')
  })

  it('cada puntuación queda fechada y con su origen', async () => {
    const filas = await t.db.select().from(riderPoints).where(eq(riderPoints.riderId, s.reciente))
    expect(filas.length).toBe(1)
    expect(`${filas[0]?.gameDay} ${filas[0]?.raceId} ${filas[0]?.kind}`).toBe(
      `${HOY - 30} race-x:s5 stage`,
    )
  })
})
