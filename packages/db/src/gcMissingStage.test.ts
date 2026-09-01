import { ATTRIBUTES, assignLeaderJerseys } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getGcThroughStage, getKomClassification, getPointsClassification } from './results.js'
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

  /**
   * A MITAD DE CARRERA ESTÁN TODOS, INCLUIDO EL QUE ABANDONARÁ DESPUÉS (corregido en la v45).
   *
   * Esta prueba EXIGÍA LO CONTRARIO: daba por bueno que el corredor con `abandonedDay: 3` saliera ya
   * marcado en la etapa 2, con el argumento de que «ya figura como abandonado». Y eso era el defecto,
   * no la regla: en la etapa 2 ese hombre había corrido sus dos etapas y estaba clasificado. Que se
   * baje mañana no cambia lo que fue ayer.
   *
   * El dueño lo vio en Race Guatemala —un corredor que ganó tres etapas y enfermó en la octava
   * aparecía como DNF también en la clasificación de la primera— y por eso la expectativa se
   * INVIERTE en vez de ajustarse: lo que estaba mal era lo que se afirmaba.
   */
  it('a mitad de carrera está clasificado hasta el que abandonará después', async () => {
    const gc = await getGcThroughStage(t.db, KEY, 2)
    expect(
      gc
        .filter((r) => !r.dnf)
        .map((r) => r.riderId)
        .sort(),
    ).toEqual([...s.completos, s.ausente, s.abandonado].sort())
    // Y en la etapa 3, la suya, sí sale marcado: es la MISMA consulta la que lo distingue.
    const enLaTres = await getGcThroughStage(t.db, KEY, STAGES)
    expect(enLaTres.find((r) => r.riderId === s.abandonado)!.dnf).toBe(true)
  })

  /**
   * Y LA OTRA MITAD, que es lo que hacía visible el defecto: el que abandona sigue puntuando en la
   * general de las etapas que SÍ corrió, con su tiempo y su puesto de verdad. Antes se le sacaba de
   * la clasificación entera y se le mandaba al final con el tiempo tachado.
   */
  it('el que abandonará conserva su puesto en las etapas que corrió', async () => {
    const gc = await getGcThroughStage(t.db, KEY, 2)
    const puesto = gc.findIndex((r) => r.riderId === s.abandonado)
    // Es el más lento de los cinco mientras corre, así que va último — pero CLASIFICADO y con su
    // tiempo, no descolgado al final por una marca que aún no le corresponde.
    expect(puesto).toBe(4)
    expect(gc[puesto]!.tiempoTotalS).toBe(2 * (HOUR + 700))
  })

  /**
   * Y LA CONSECUENCIA VISIBLE: un DNF no puede salir de amarillo.
   *
   * El reparto de maillots (`assignLeaderJerseys`) se alimenta de esta misma consulta, así que la
   * defensa de arriba lo cubre por construcción; se comprueba de punta a punta porque es el caso
   * que el dueño vio en producción y el que hay que poder enseñar arreglado.
   */
  it('el maillot amarillo se lo lleva el primer CLASIFICADO, no el ausente', async () => {
    const gc = await getGcThroughStage(t.db, KEY, STAGES)
    const points = await getPointsClassification(t.db, KEY, STAGES)
    const kom = await getKomClassification(t.db, KEY, STAGES)
    const maillots = assignLeaderJerseys({ gc, points, kom })
    expect(maillots.gc).toBe(s.completos[0])
    expect(maillots.gc).not.toBe(s.ausente)
    expect(maillots.gc).not.toBe(s.abandonado)
  })
})
