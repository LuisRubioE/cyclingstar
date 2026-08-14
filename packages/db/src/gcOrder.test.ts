import { TEST_TOUR } from '@cyclingstar/engine'
import { ATTRIBUTES } from '@cyclingstar/shared'
import { and, asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { gcFinishersWhere, gcOrderBy, gcRosterOn } from './gcSort.js'
import { getRiderGcStandings } from './riderResults.js'
import { getGcThroughStage, getRaceGc } from './results.js'
import {
  raceGc,
  raceRosters,
  riderAttrs,
  riderHidden,
  riders,
  stageResults,
  teams,
  worlds,
} from './schema.js'
import { runOneStage } from './stageRun.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * Coherencia de la clasificación general contra Postgres real (PGlite).
 *
 * Cubre el fallo que se vio en producción en una carrera de UN DÍA: la general mostraba al ganador
 * 10 s por debajo de su tiempo de meta (bonificaciones que no debían existir) y, del 4.º en adelante,
 * corredores DISTINTOS a los del resultado de etapa, porque con todo el pelotón empatado a tiempo el
 * orden lo decidía Postgres y ni siquiera era estable entre consultas.
 */

const ONE_DAY_KEY = 'clasica-test:s0'
const TIE_KEY = 'vuelta-test:s0'
const FIELD = 30

async function seedWorld(t: TestDb): Promise<{ worldId: string; riderIds: string[] }> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-general', engineVersion: 1 })
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
      Array.from({ length: FIELD }, (_, i) => ({
        worldId,
        teamId: team!.id,
        name: `Corredor ${i}`,
        country: 'ES',
        gender: 'M' as const,
        birthSeason: -25,
        archetype: 'fondo' as const,
        faceSeed: `cara-${i}`,
        ctl: 60,
        atl: 40,
      })),
    )
    .returning({ id: riders.id })
  const riderIds = inserted.map((r) => r.id)

  await t.db
    .insert(riderAttrs)
    .values(
      riderIds.flatMap((id, i) =>
        ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: 50 + (i % 20) })),
      ),
    )
  await t.db.insert(riderHidden).values(
    riderIds.map((id) => ({
      riderId: id,
      talent: 1,
      ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, 90])),
      fragility: 0.1,
      peakAge: 28,
      declineAge: 33,
    })),
  )
  await t.db
    .insert(raceRosters)
    .values(riderIds.map((id) => ({ raceId: ONE_DAY_KEY, riderId: id })))
  return { worldId, riderIds }
}

describe('db: general coherente en carreras de un día y con desempate por puestos', () => {
  let t: TestDb
  let worldId: string
  let riderIds: string[]

  beforeAll(async () => {
    t = await startTestDb()
    const seeded = await seedWorld(t)
    worldId = seeded.worldId
    riderIds = seeded.riderIds
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('una carrera de un día no da bonificaciones y su general es el resultado de etapa', async () => {
    const stage = TEST_TOUR[0]!
    // Etapa única que es a la vez la final: eso ES una carrera de un día.
    await t.db.transaction((tx) =>
      runOneStage(tx, worldId, 1, 'semilla-general', {
        raceKey: ONE_DAY_KEY,
        raceId: 'clasica-test',
        raceName: 'Clásica de pruebas',
        level: 'WT',
        raceClass: 'WT',
        season: 0,
        stageDay: 1,
        kind: stage.kind,
        profile: stage.profile,
        timeTrial: false,
        isFinal: true,
      }),
    )

    const results = await t.db
      .select({
        riderId: stageResults.riderId,
        puesto: stageResults.puesto,
        tiempoS: stageResults.tiempoS,
        bonificacionS: stageResults.bonificacionS,
      })
      .from(stageResults)
      .where(and(eq(stageResults.raceId, ONE_DAY_KEY), eq(stageResults.stageDay, 1)))
      .orderBy(asc(stageResults.puesto))
    expect(results).toHaveLength(FIELD)

    // 1) Ni una bonificación: en una prueba de un día no hay general que construir.
    for (const r of results) expect(r.bonificacionS).toBe(0)

    // 2) El tiempo de la general es EXACTAMENTE el de meta (antes, 10 s menos para el ganador).
    const gcRows = await t.db.select().from(raceGc).where(eq(raceGc.raceId, ONE_DAY_KEY))
    const timeById = new Map(results.map((r) => [r.riderId, r.tiempoS] as const))
    for (const row of gcRows) {
      expect(row.tiempoTotalS).toBe(timeById.get(row.riderId))
      // El desempate se acumula desde la primera etapa: con una sola, ambos son su puesto.
      expect(row.sumaPuestos).toBe(row.ultimoPuesto)
    }

    // 3) La general que se muestra sale en el MISMO orden que el resultado de etapa, tanto la
    // almacenada (race_gc) como la recalculada para la ficha de la etapa (stage_results). Nadie
    // figura como DNF: en una prueba de un día una caída no "hace abandonar la vuelta" —el corredor
    // ya ha llegado a meta y tiene su puesto—.
    const stageOrder = results.map((r) => r.riderId)
    const gc = await getRaceGc(t.db, ONE_DAY_KEY)
    expect(gc.filter((r) => r.dnf)).toHaveLength(0)
    expect(gc.map((r) => r.riderId)).toEqual(stageOrder)
    const through = await getGcThroughStage(t.db, ONE_DAY_KEY, 1)
    expect(through.map((r) => r.riderId)).toEqual(stageOrder)

    // 4) Y el orden es ESTABLE: dos consultas seguidas devuelven lo mismo (antes no lo era).
    const gcOtraVez = await getRaceGc(t.db, ONE_DAY_KEY)
    expect(gcOtraVez.map((r) => r.riderId)).toEqual(stageOrder)
  }, 180_000)

  /**
   * EL QUE SE RETIRA EL PRIMER DÍA NO GANA LA CARRERA (v31). Lo vio el dueño en producción: «Iván
   * García en su palmarés pone que ganó la vuelta a Andalucía; no es cierto, se retiró en la primera
   * etapa». Y así era: un abandono CONSERVA su fila en `race_gc` —a propósito, para que la ficha lo
   * enseñe como DNF con lo que llevaba hecho— pero con el tiempo de las etapas que corrió, o sea
   * MENOS que el de cualquiera que las corriera todas. Ordenando por tiempo ascendente, gana él.
   *
   * Y lo peor: la general que se MUESTRA ya lo hacía bien; la que REPARTE —premios, puntos UCI,
   * palmarés y el dorsal 1 del año siguiente— no. Dos definiciones de lo mismo, una sola arreglada.
   * Por eso el filtro vive junto al orden, en `gcSort.ts`, y esto lo sella.
   */
  it('el que se retira el primer día NO está clasificado, por mucho que su reloj sea el más bajo', async () => {
    const [a, b, c] = riderIds
    const KEY = 'race-dnf:s0'
    await t.db.insert(raceGc).values([
      // El que se retiró tras la etapa 1: UNA etapa de tiempo, el más bajo de la carrera con mucho.
      { raceId: KEY, riderId: a!, tiempoTotalS: 13654, sumaPuestos: 40, ultimoPuesto: 40 },
      // Los que la acabaron entera: cinco días de reloj.
      { raceId: KEY, riderId: b!, tiempoTotalS: 67425, sumaPuestos: 12, ultimoPuesto: 3 },
      { raceId: KEY, riderId: c!, tiempoTotalS: 67480, sumaPuestos: 20, ultimoPuesto: 8 },
    ])
    await t.db.insert(raceRosters).values([
      { raceId: KEY, riderId: a!, abandonedDay: 1, abandonedReason: 'voluntario' },
      { raceId: KEY, riderId: b! },
      { raceId: KEY, riderId: c! },
    ])

    // ASÍ ERA EL FALLO, y queda escrito para que se vea el tamaño: sin filtrar, el que se retiró el
    // primer día sale PRIMERO de la general, por delante de los que la corrieron entera.
    const comoEstaba = await t.db
      .select({ riderId: raceGc.riderId })
      .from(raceGc)
      .where(eq(raceGc.raceId, KEY))
      .orderBy(...gcOrderBy())
    expect(comoEstaba[0]!.riderId).toBe(a!)

    // La general que REPARTE: el retirado no está, y el primero es quien de verdad ganó.
    const reparte = await t.db
      .select({ riderId: raceGc.riderId })
      .from(raceGc)
      .leftJoin(raceRosters, gcRosterOn())
      .where(gcFinishersWhere(KEY))
      .orderBy(...gcOrderBy())
    expect(reparte.map((r) => r.riderId)).toEqual([b!, c!])

    // La general que se MUESTRA sí lo lleva, al final y marcado: la ficha tiene que poder enseñarlo.
    const muestra = await getRaceGc(t.db, KEY)
    expect(muestra.map((r) => r.riderId)).toEqual([b!, c!, a!])
    expect(muestra[2]!.dnf).toBe(true)
  }, 60_000)

  it('a igualdad de tiempo manda quien acumula mejores puestos, luego la última etapa, luego el id', async () => {
    // General de una carrera POR ETAPAS con cuatro empatados a tiempo: el orden lo deciden los
    // puestos acumulados, y solo si todo empata, el id (para que el orden sea total y determinista).
    const [a, b, c, d, e] = riderIds
    await t.db.insert(raceGc).values([
      // Mejor tiempo: manda por encima de cualquier desempate.
      { raceId: TIE_KEY, riderId: a!, tiempoTotalS: 3599, sumaPuestos: 99, ultimoPuesto: 99 },
      // Empatados a tiempo: gana la menor suma de puestos.
      { raceId: TIE_KEY, riderId: b!, tiempoTotalS: 3600, sumaPuestos: 12, ultimoPuesto: 9 },
      { raceId: TIE_KEY, riderId: c!, tiempoTotalS: 3600, sumaPuestos: 8, ultimoPuesto: 5 },
      // Misma suma que `c`: desempata el mejor puesto en la última etapa disputada.
      { raceId: TIE_KEY, riderId: d!, tiempoTotalS: 3600, sumaPuestos: 8, ultimoPuesto: 3 },
      // Idéntico a `d` en todo: desempata el id, que es estable.
      { raceId: TIE_KEY, riderId: e!, tiempoTotalS: 3600, sumaPuestos: 8, ultimoPuesto: 3 },
    ])

    const gc = await getRaceGc(t.db, TIE_KEY)
    const porId = [d!, e!].sort()
    expect(gc.map((r) => r.riderId)).toEqual([a!, porId[0]!, porId[1]!, c!, b!])
  }, 60_000)

  // Este test va el ÚLTIMO del fichero: al final marca un abandono en TIE_KEY y eso cambia el orden
  // de esa general para cualquiera que la lea después.
  it('el puesto de la general que ve el corredor en su ficha es el de la carrera', async () => {
    // La ficha del corredor no recalcula nada por su cuenta: numera la MISMA general que la página
    // de carrera, así que el 3.º de la general es el 3.º en su ficha, gane o no.
    const gc = await getRaceGc(t.db, TIE_KEY)
    for (const [i, row] of gc.entries()) {
      const standings = await getRiderGcStandings(t.db, row.riderId, [TIE_KEY])
      expect(standings.get(TIE_KEY)).toEqual({ puesto: i + 1, dnf: false })
    }

    // Quien abandona deja de estar clasificado: cae al final y se marca como tal.
    const abandona = gc[0]!.riderId
    await t.db.insert(raceRosters).values({ raceId: TIE_KEY, riderId: abandona, abandonedDay: 3 })
    const conAbandono = await getRaceGc(t.db, TIE_KEY)
    expect(conAbandono.at(-1)!.riderId).toBe(abandona)
    const standings = await getRiderGcStandings(t.db, abandona, [TIE_KEY])
    expect(standings.get(TIE_KEY)).toEqual({ puesto: conAbandono.length, dnf: true })
  }, 60_000)
})
