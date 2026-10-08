import { DAYS_PER_SEASON, birthSeasonForAge, seededRng } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getFreeAgents } from './browse.js'
import { type Horizon, clearHorizonCaches, worldHorizon } from './horizon.js'
import {
  RANKING_WINDOW_DAYS,
  addSeasonPointsBatch,
  byPointsThenId,
  compareIds,
  getRanking,
  getSeasonAwards,
  getYoungRiders,
  topAtHorizon,
} from './ranking.js'
import { getSeasonRank } from './riders.js'
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
    const filas = await getRanking(t.db, worldHorizon, s.worldId, day)
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
    const filas = await getRanking(t.db, worldHorizon, s.worldId, HOY)
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

/**
 * EL RECORTE DE 11-f (docs/retransmision.md §11.5 y §11.19; paso 8b): una lista con tope a horizonte pide
 * `limit + d` filas del orden real, con `d` los corredores con puntos velados, resta, reordena y corta, y
 * da lo mismo que restar a todos y reordenar la lista entera. Con puntos y restas al azar (semilla fija,
 * 500 casos) y empates de sobra, para que el desempate por id cuente. No es vacío: pedir solo `limit`
 * filas se equivoca en muchos de los mismos casos.
 */
describe('el recorte de 11-f: pedir limit + d basta (500 casos con semilla fija)', () => {
  it('los limit primeros tras pedir limit + d coinciden con los del recálculo entero', () => {
    const rng = seededRng('ranking365:11-f')
    const int = (n: number): number => Math.floor(rng() * n)
    let soloLimitSeEquivoca = 0
    for (let c = 0; c < 500; c++) {
      const n = 1 + int(80)
      const limit = 1 + int(25)
      // ids en un orden que no es el de creación, y puntos de 0 a 39: muchos empates
      const real = Array.from({ length: n }, (_, i) => ({
        riderId: `${String(int(1_000_000)).padStart(7, '0')}-${i}`,
        points: int(40),
      })).sort(byPointsThenId)
      const minus = new Map<string, number>()
      for (const r of real) if (r.points > 0 && rng() < 0.3) minus.set(r.riderId, 1 + int(r.points))
      const adjust = (r: { riderId: string; points: number }) => ({
        ...r,
        points: r.points - (minus.get(r.riderId) ?? 0),
      })
      const entero = topAtHorizon(real, adjust, byPointsThenId, limit)
      expect(
        topAtHorizon(real.slice(0, limit + minus.size), adjust, byPointsThenId, limit),
      ).toEqual(entero)
      const corto = topAtHorizon(real.slice(0, limit), adjust, byPointsThenId, limit)
      if (JSON.stringify(corto) !== JSON.stringify(entero)) soloLimitSeEquivoca += 1
    }
    expect(soloLimitSeEquivoca).toBeGreaterThan(50)
  })
})

/**
 * R EN LAS LISTAS DE PUNTOS (docs/retransmision.md §10.6 y §11.5; sups. W1, W2, P1 y X4; paso 8b), sobre
 * PGlite: el ranking a 365 días, los jóvenes, los agentes libres, los premios del año y el puesto de un
 * corredor, a horizonte. Cinco corredores sin equipo de la temporada 5; la etapa 3 de `race-a` (diez
 * días antes de hoy) está velada: le dio 50 puntos a A y 5 a C. A horizonte, B y C empatan a 40 y los
 * desempata el id; A se queda sin puntos y cae con los de cero.
 */
describe('R: las listas de puntos a horizonte (8b)', () => {
  const HOY_R = DAYS_PER_SEASON * 5 + 100
  const VELADA = 'race-a:s5'
  const h: Horizon = {
    ...worldHorizon,
    kind: 'viewer',
    userId: '00000000-0000-4000-8000-000000000777',
    rev: `${HOY_R}.1`,
    knownThrough: new Map([[VELADA, 2]]),
    veil: [{ raceKey: VELADA, stageDay: 3, gameDay: HOY_R - 10, reason: 'follow' }],
  }
  let t: TestDb
  let worldId = ''
  const ids: Record<'A' | 'B' | 'C' | 'D' | 'E', string> = { A: '', B: '', C: '', D: '', E: '' }
  /** PGlite admite UNA sesión (`testDb.ts`) y los premios del año piden sus cuatro categorías a la vez. */
  const poolBefore = process.env.DB_POOL_MAX

  beforeAll(async () => {
    process.env.DB_POOL_MAX = '1'
    t = await startTestDb()
    clearHorizonCaches()
    const [world] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-r', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = world!.id
    for (const [name, age] of [
      ['A', 21],
      ['B', 27],
      ['C', 27],
      ['D', 22],
      ['E', 22],
    ] as const) {
      const [r] = await t.db
        .insert(riders)
        .values({
          worldId,
          name: `Corredor ${name}`,
          country: 'ES',
          gender: 'M' as const,
          birthSeason: birthSeasonForAge(age, 5),
          archetype: 'escalada' as const,
          faceSeed: `cara-${name}`,
        })
        .returning({ id: riders.id })
      ids[name] = r!.id
    }
    const puntuar = async (
      riderId: string,
      points: number,
      gameDay: number,
      raceId: string,
      stageDay: number,
    ): Promise<void> => {
      await t.db.transaction(async (tx) => {
        await addSeasonPointsBatch(tx as never, [{ riderId, points }], {
          gameDay,
          raceId,
          kind: 'stage',
          stageDay,
        })
      })
    }
    await puntuar(ids.A, 50, HOY_R - 10, VELADA, 3)
    await puntuar(ids.B, 40, HOY_R - 20, 'race-b:s5', 1)
    await puntuar(ids.C, 40, HOY_R - 20, 'race-b:s5', 1)
    await puntuar(ids.C, 5, HOY_R - 10, VELADA, 3)
    await puntuar(ids.D, 10, HOY_R - 5, 'race-c:s5', 2)
  }, 180_000)

  afterAll(async () => {
    await t?.close()
    if (poolBefore === undefined) delete process.env.DB_POOL_MAX
    else process.env.DB_POOL_MAX = poolBefore
  })

  const empate = (): string[] => [ids.B, ids.C].sort(compareIds)

  it('el ranking: el del mundo, y a horizonte sin la etapa velada, reordenado y con los de cero por id', async () => {
    const mundo = await getRanking(t.db, worldHorizon, worldId, HOY_R)
    expect(mundo.map((r) => [r.riderId, r.points])).toEqual([
      [ids.A, 50],
      [ids.C, 45],
      [ids.B, 40],
      [ids.D, 10],
      [ids.E, 0],
    ])
    const velado = await getRanking(t.db, h, worldId, HOY_R)
    expect(velado.map((r) => [r.riderId, r.points])).toEqual([
      ...empate().map((id) => [id, 40]),
      [ids.D, 10],
      ...[ids.A, ids.E].sort(compareIds).map((id) => [id, 0]),
    ])
    // Con tope: el de 2 pide 2 + d (A y C tienen puntos velados), y no los dos primeros de verdad.
    expect((await getRanking(t.db, h, worldId, HOY_R, 2)).map((r) => r.riderId)).toEqual(empate())
  })

  it('los jóvenes, los agentes libres y los premios del año, a horizonte', async () => {
    expect((await getYoungRiders(t.db, h, worldId, 5)).map((r) => [r.riderId, r.points])).toEqual([
      [ids.D, 10],
      ...[ids.A, ids.E].sort(compareIds).map((id) => [id, 0]),
    ])
    expect(
      (await getFreeAgents(t.db, h, worldId, 5, { limit: 3 })).map((r) => [r.id, r.seasonPoints]),
    ).toEqual([...empate().map((id) => [id, 40]), [ids.D, 10]])
    expect((await getSeasonAwards(t.db, worldHorizon, worldId, 5)).riderOfYear?.riderId).toBe(ids.A)
    const premios = await getSeasonAwards(t.db, h, worldId, 5)
    expect(premios.riderOfYear).toMatchObject({ riderId: empate()[0], points: 40 })
    expect(premios.revelation).toMatchObject({ riderId: ids.D, points: 10 })
  })

  it('el puesto de un corredor es su posición en el ranking de la temporada a horizonte (11-f)', async () => {
    expect(await getSeasonRank(t.db, worldHorizon, worldId, 45)).toEqual({
      seasonRank: 2,
      fieldSize: 5,
    })
    // C, a horizonte, tiene 40: nadie tiene más (A pasa a 0, B empata).
    expect(await getSeasonRank(t.db, h, worldId, 40)).toEqual({ seasonRank: 1, fieldSize: 5 })
    // y D, con 10, va tercero, por detrás de B y C y por delante de A, que de verdad tiene 50
    expect(await getSeasonRank(t.db, h, worldId, 10)).toEqual({ seasonRank: 3, fieldSize: 5 })
  })
})
