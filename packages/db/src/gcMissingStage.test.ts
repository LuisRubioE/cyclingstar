import { ATTRIBUTES } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getGcThroughStage } from './results.js'
import { raceRosters, riderAttrs, riders, stageResults, teams, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * El falso líder por NO correr una etapa, contra Postgres real (PGlite).
 *
 * Visto en producción, Race Colombia: Roberto Martínez no terminó la etapa 8 y la general le puso
 * PRIMERO, con 4h36 sobre el segundo, después de haber sido 129.º y 130.º en las dos reinas
 * anteriores. Las 6h09 del ganador de la etapa que no corrió eran toda su «ventaja».
 *
 * La causa: `getGcThroughStage` sumaba `stage_results` agrupando por corredor. Sin fila en una
 * etapa, la suma es menor, y **la ausencia hace más rápido**. `riderResults.ts` ya avisaba de esta
 * trampa por escrito —por eso el perfil se pasó a `race_gc`— pero la pestaña de general de cada
 * etapa, que es la que ve el jugador, se quedó con la consulta mala.
 */

const KEY = 'race-falso-lider:s0'
const STAGES = 3
/** El tiempo de cada etapa: quien se salte una se «ahorra» una hora entera. */
const HOUR = 3600

interface Seeded {
  completos: string[]
  ausente: string
  abandonado: string
}

async function seedWorld(t: TestDb): Promise<Seeded> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-falso-lider', engineVersion: 1 })
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

  const inserted = await t.db
    .insert(riders)
    .values(
      ['bueno', 'segundo', 'tercero', 'ausente', 'abandonado'].map((tag, i) => ({
        worldId,
        teamId: team!.id,
        name: `Corredor ${tag}`,
        country: 'CO',
        gender: 'M' as const,
        birthSeason: -6,
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
      })),
    )
    .returning({ id: riders.id })
  const [bueno, segundo, tercero, ausente, abandonado] = inserted.map((r) => r.id) as [
    string,
    string,
    string,
    string,
    string,
  ]
  await t.db
    .insert(riderAttrs)
    .values(
      inserted.flatMap(({ id }) => ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 }))),
    )

  // Tres etapas de una hora. Los tres primeros las corren todas; los otros dos se saltan la 3.ª.
  // `ausente` simplemente no tiene fila (el agujero puro, sin nadie que lo anote); `abandonado`
  // tampoco la tiene, pero además está marcado en el roster.
  const rows: (typeof stageResults.$inferInsert)[] = []
  for (let day = 1; day <= STAGES; day++) {
    const corren: [string, number][] = [
      [bueno, HOUR],
      [segundo, HOUR + 60],
      [tercero, HOUR + 120],
    ]
    if (day < STAGES) {
      // Los dos que faltarán a la última son los MÁS LENTOS mientras corren: si la general los
      // pone arriba, es solo por la etapa que no tienen.
      corren.push([ausente, HOUR + 600], [abandonado, HOUR + 700])
    }
    corren.forEach(([riderId, tiempoS], i) => {
      rows.push({
        raceId: KEY,
        stageDay: day,
        riderId,
        puesto: i + 1,
        tiempoS,
        bonificacionS: 0,
        puntosVolante: 0,
        puntosMontana: 0,
      })
    })
  }
  await t.db.insert(stageResults).values(rows)
  await t.db.insert(raceRosters).values([
    { raceId: KEY, riderId: bueno },
    { raceId: KEY, riderId: segundo },
    { raceId: KEY, riderId: tercero },
    { raceId: KEY, riderId: ausente },
    { raceId: KEY, riderId: abandonado, abandonedDay: 3 },
  ])
  return { completos: [bueno, segundo, tercero], ausente, abandonado }
}

describe('db: faltar a una etapa no puede hacerte líder de la general', () => {
  let t: TestDb
  let s: Seeded

  beforeAll(async () => {
    t = await startTestDb()
    s = await seedWorld(t)
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('quien no tiene todas las etapas no está clasificado, aunque nadie anotara su abandono', async () => {
    const gc = await getGcThroughStage(t.db, KEY, STAGES)
    const clasificados = gc.filter((r) => !r.dnf).map((r) => r.riderId)
    expect(clasificados).toEqual(s.completos)
    // Los dos que se saltaron la última salen marcados y AL FINAL, por detrás de todos los demás.
    const cola = gc.slice(-2).map((r) => r.riderId)
    expect(cola.sort()).toEqual([s.ausente, s.abandonado].sort())
    expect(
      gc
        .filter((r) => r.dnf)
        .map((r) => r.riderId)
        .sort(),
    ).toEqual([s.ausente, s.abandonado].sort())
  })

  it('el líder es el más rápido de verdad, no el que menos etapas corrió', async () => {
    const gc = await getGcThroughStage(t.db, KEY, STAGES)
    // Sin la corrección, los dos ausentes sumaban 2 horas contra las 3 de los demás y encabezaban
    // la general con una hora de «ventaja»: exactamente lo de Race Colombia.
    expect(gc[0]!.riderId).toBe(s.completos[0])
    expect(gc[0]!.tiempoTotalS).toBe(STAGES * HOUR)
    const ausente = gc.find((r) => r.riderId === s.ausente)!
    expect(ausente.tiempoTotalS).toBeLessThan(gc[0]!.tiempoTotalS)
    expect(ausente.dnf).toBe(true)
  })

  it('a mitad de carrera, cuando aún no faltaba nadie, están todos clasificados', async () => {
    // La regla es «todas las etapas corridas HASTA HOY», no «todas las de la carrera»: en la etapa
    // 2 los cinco tienen sus dos días y los cinco cuentan, salvo el que ya figura como abandonado.
    const gc = await getGcThroughStage(t.db, KEY, 2)
    expect(
      gc
        .filter((r) => !r.dnf)
        .map((r) => r.riderId)
        .sort(),
    ).toEqual([...s.completos, s.ausente].sort())
    expect(gc.at(-1)!.riderId).toBe(s.abandonado)
  })
})
