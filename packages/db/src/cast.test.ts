import { TEST_TOUR, type TourStage } from '@cyclingstar/engine'
import {
  type CastRider,
  JERSEY_PRIORITY,
  type StageTimeline,
  raceLeaders,
} from '@cyclingstar/shared'
import { and, eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { worldHorizon } from './horizon.js'
import { getGcThroughStage, getKomClassification, getPointsClassification } from './results.js'
import { palmares, riderAttrs, riderHidden, riders, stageResults, worlds } from './schema.js'
import { runOneStage } from './stageRun.js'
import { getTeamClassifications } from './teamClassification.js'
import { type TestDb, startTestDb } from './testDb.js'
import { type TestWorld, enrollAll, idDe, seedTestWorld, stageSpecOf } from './timelineTestWorld.js'
import { clearStageTimelineCache, readStageTimeline, timelineTickLog } from './timelines.js'

/**
 * EL REPARTO CONGELADO (docs/retransmision.md §7.2, §7.5, §7.8, 7-b, 7-e y 8-g; E2, paso 5), leído de
 * la línea que deja cada etapa corrida como el tick, con la grabación encendida y `flush` detrás:
 *
 * - 7-b: sin títulos, el maillot llevado de `buildTimelineCast` es el de `raceLeaders` de shared sobre
 *   las cuatro lecturas de la API con la etapa N − 1 (`getGcThroughStage`, `getPointsClassification`,
 *   `getKomClassification` y `getTeamClassifications`), que es lo que hace `leadersThroughStage` en la
 *   API (`packages/db` no puede importarla), salvo empates exactos a puntos, donde la API no fija orden.
 * - la procedencia (`from`) de cada dato que sale de una etapa;
 * - `knownWins` con la consulta de 7-e;
 * - los campeones de `palmares` en su disciplina (el de crono en la crono, el de ruta en línea);
 * - y los favoritos de 8-g: los del orden de atributos leído AL EMPEZAR la etapa, con dos corredores
 *   que el aprendizaje de esa misma etapa cambia de orden.
 */

const A = 'race-reparto:s0'
const B = 'race-campeones:s0'
const SEMILLA = 'semilla-reparto'

describe('db: buildTimelineCast, el reparto congelado de la línea (§7, 7-b, 7-e, 8-g)', () => {
  let t: TestDb
  let w: TestWorld
  let otroMundo: string
  /** Las líneas de la carrera A (sin títulos), por etapa. */
  const lineasA = new Map<number, StageTimeline>()
  /** Las de la carrera B (con campeones), por etapa. */
  const lineasB = new Map<number, StageTimeline>()
  /** Los SPR de todos AL EMPEZAR la etapa 2 de B y los de P y Q después. */
  let sprAntes = new Map<string, number>()
  let sprDespues = new Map<string, number>()

  const R = (n: number) => idDe(n)
  // Los protagonistas de los casos: X campeón de ruta, Y de crono, Z y W con victorias conocidas,
  // P y Q los dos favoritos que el aprendizaje cambia de orden.
  const X = R(5)
  const Y = R(6)
  const Z = R(7)
  const W = R(8)
  const P = R(33)
  const Q = R(34)

  const correr = async (
    raceKey: string,
    stageDay: number,
    stage: TourStage,
    isFinal: boolean,
    gameDay: number,
  ): Promise<StageTimeline> => {
    const log = timelineTickLog()
    await t.db.transaction(async (tx) => {
      await runOneStage(tx, w.worldId, gameDay, SEMILLA, {
        ...stageSpecOf(raceKey, stageDay, stage, isFinal),
        timeline: log,
      })
      await log.flush(tx)
    })
    expect(log.summary(), `${raceKey} e${stageDay}`).toBe('timeline: 1 grabadas, 0 sin línea')
    clearStageTimelineCache()
    const tl = await readStageTimeline(t.db, worldHorizon, raceKey, stageDay)
    if (tl === null) throw new Error(`${raceKey} e${stageDay} sin línea`)
    return tl
  }

  const victoria = (
    riderId: string,
    o: { raceId: string; kind: 'gc' | 'stage'; gameDay: number; worldId?: string },
  ) => ({
    worldId: o.worldId ?? w.worldId,
    riderId,
    season: 0,
    raceId: o.raceId,
    raceName: o.raceId,
    kind: o.kind,
    detail: o.kind === 'stage' ? 'Stage 1' : '',
    gameDay: o.gameDay,
  })

  beforeAll(async () => {
    t = await startTestDb()
    w = await seedTestWorld(t, { worldSeed: SEMILLA })
    const [otro] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'otro-mundo', engineVersion: 1 })
      .returning({ id: worlds.id })
    otroMundo = otro!.id

    // LA CARRERA A, del día 120 al 124: cinco etapas de TEST_TOUR, sin campeones (ninguno ganado aún).
    await enrollAll(t, w, A)
    for (const [i, stage] of TEST_TOUR.entries())
      lineasA.set(i + 1, await correr(A, i + 1, stage, i === TEST_TOUR.length - 1, 120 + i))

    // El palmarés de antes de la carrera B (día 200, con victorias conocidas hasta el 144):
    await t.db.insert(palmares).values([
      // los nacionales de España del día 150: X de ruta, Y de crono
      victoria(X, { raceId: 'nc-es-road', kind: 'gc', gameDay: 150 }),
      victoria(Y, { raceId: 'nc-es-itt', kind: 'gc', gameDay: 147 }),
      // una carrera terminada el día 100: su general (W) y dos etapas (Z), que cuentan
      victoria(W, { raceId: 'race-vieja', kind: 'gc', gameDay: 100 }),
      victoria(Z, { raceId: 'race-vieja', kind: 'stage', gameDay: 95 }),
      victoria(Z, { raceId: 'race-vieja', kind: 'stage', gameDay: 96 }),
      // una terminada el 190 (su velo aún no ha caducado para nadie) y una en curso: no cuentan
      victoria(W, { raceId: 'race-reciente', kind: 'gc', gameDay: 190 }),
      victoria(Z, { raceId: 'race-reciente', kind: 'stage', gameDay: 188 }),
      victoria(Z, { raceId: 'race-en-curso', kind: 'stage', gameDay: 199 }),
      // y en otro mundo, aunque sea la misma carrera: tampoco
      victoria(Z, { raceId: 'race-vieja', kind: 'stage', gameDay: 97, worldId: otroMundo }),
      victoria(Z, { raceId: 'race-vieja', kind: 'gc', gameDay: 100, worldId: otroMundo }),
    ])

    // LA CARRERA B: un prólogo (crono) el 200 y una llana el 201.
    await enrollAll(t, w, B)
    lineasB.set(1, await correr(B, 1, TEST_TOUR[3]!, false, 200))
    // P y Q, los mejores velocistas, separados por una centésima: P en su techo (no aprende) y Q joven,
    // con talento y margen (aprende en la llana). Se fijan justo antes de la etapa 2.
    await t.db
      .update(riderAttrs)
      .set({ value: 80 })
      .where(and(eq(riderAttrs.riderId, P), eq(riderAttrs.attr, 'SPR')))
    await t.db
      .update(riderAttrs)
      .set({ value: 79.99 })
      .where(and(eq(riderAttrs.riderId, Q), eq(riderAttrs.attr, 'SPR')))
    const techos = await t.db
      .select({ riderId: riderHidden.riderId, ceilings: riderHidden.ceilings })
      .from(riderHidden)
      .where(inArray(riderHidden.riderId, [P, Q]))
    for (const { riderId, ceilings } of techos)
      await t.db
        .update(riderHidden)
        .set({
          ceilings: { ...(ceilings as Record<string, number>), SPR: riderId === P ? 80 : 99 },
          ...(riderId === Q ? { talent: 90, peakAge: 27, declineAge: 34 } : {}),
        })
        .where(eq(riderHidden.riderId, riderId))
    await t.db.update(riders).set({ birthSeason: -4 }).where(eq(riders.id, Q))
    const spr = async () =>
      new Map(
        (
          await t.db
            .select({ riderId: riderAttrs.riderId, value: riderAttrs.value })
            .from(riderAttrs)
            .where(eq(riderAttrs.attr, 'SPR'))
        ).map((r) => [r.riderId, r.value] as const),
      )
    sprAntes = await spr()
    lineasB.set(2, await correr(B, 2, TEST_TOUR[0]!, true, 201))
    sprDespues = await spr()
  }, 300_000)

  afterAll(async () => {
    await t?.close()
  })

  const de = (tl: StageTimeline, riderId: string): CastRider => {
    const c = tl.cast.riders.find((x) => x.riderId === riderId)
    if (c === undefined) throw new Error(`${riderId} no está en el reparto`)
    return c
  }

  it('sin títulos, los maillots son los de raceLeaders sobre las lecturas de la API en la N − 1 (7-b)', async () => {
    const comparados = { gc: 0, points: 0, kom: 0 }
    const conDueño = { gc: 0, points: 0, kom: 0 }
    let empates = 0
    for (const [n, tl] of lineasA) {
      const llevan = (jersey: string) =>
        tl.cast.riders
          .filter((c) => c.worn.kind === 'leader' && c.worn.jersey === jersey)
          .map((c) => c.riderId)
      if (n === 1) {
        // Día 1 de una vuelta: nadie lleva maillot de líder (UCI 2.6.018).
        for (const jersey of JERSEY_PRIORITY) expect(llevan(jersey), `e1 ${jersey}`).toEqual([])
        continue
      }
      const [gc, points, kom, teams] = [
        await getGcThroughStage(t.db, worldHorizon, A, n - 1),
        await getPointsClassification(t.db, worldHorizon, A, n - 1),
        await getKomClassification(t.db, worldHorizon, A, n - 1),
        await getTeamClassifications(t.db, worldHorizon, A, n - 1),
      ]
      const lideres = raceLeaders({ gc, points, kom, teams: teams.overall })
      const tablas = { gc: null, points, kom }
      for (const jersey of JERSEY_PRIORITY) {
        // Un empate exacto a puntos entre los que pueden llevarlo: la API no fija orden (results.ts).
        const tabla = tablas[jersey]
        const puntos = tabla?.slice(0, 4).map((r) => r.puntos) ?? []
        if (new Set(puntos).size !== puntos.length) {
          empates += 1
          continue
        }
        const quien = lideres[jersey]
        expect(llevan(jersey), `e${n} ${jersey}`).toEqual(quien === null ? [] : [quien])
        comparados[jersey] += 1
        if (quien !== null) conDueño[jersey] += 1
      }
    }
    // La prueba no es vacía: los tres maillots se comparan con alguien que los lleva.
    expect(comparados.gc).toBe(4)
    expect(comparados.points + comparados.kom + empates).toBe(8)
    expect(conDueño.gc).toBe(4)
    expect(conDueño.points).toBeGreaterThan(0)
    expect(conDueño.kom).toBeGreaterThan(0)
  })

  it('cada dato que sale de una etapa lleva su procedencia, la N − 1, y las victorias de etapa son las de esta carrera', async () => {
    for (const [n, tl] of lineasA) {
      const from = n === 1 ? null : { raceKey: A, stageDay: n - 1 }
      const ganadores = await t.db
        .select({ riderId: stageResults.riderId, stageDay: stageResults.stageDay })
        .from(stageResults)
        .where(and(eq(stageResults.raceId, A), eq(stageResults.puesto, 1)))
      for (const c of tl.cast.riders) {
        expect(c.start.from, `e${n}`).toEqual(c.start.gcRank === null ? null : from)
        if (n > 1) expect(c.start.gcRank, `e${n}`).not.toBeNull()
        if (c.worn.kind === 'leader') expect(c.worn.from).toEqual(from)
        const ganadas = ganadores
          .filter((g) => g.riderId === c.riderId && g.stageDay < n)
          .map((g) => ({ raceKey: A, stageDay: g.stageDay }))
          .sort((a, b) => a.stageDay - b.stageDay)
        for (const d of c.distinctions) {
          if (d.kind === 'stage_wins') expect(d.stages).toEqual(ganadas)
          else if (d.kind !== 'champion') expect(d.from).toEqual(from)
          if (d.kind === 'gc') {
            expect(d.rank).toBe(c.start.gcRank)
            expect(d.deficitS).toBe(c.start.gcDeficitS)
          }
        }
        expect(c.distinctions.some((d) => d.kind === 'stage_wins')).toBe(ganadas.length > 0)
      }
    }
    // En la última, alguien sale con victorias de etapa y alguien con su línea de general.
    const ultima = lineasA.get(TEST_TOUR.length)!
    expect(
      ultima.cast.riders.some((c) => c.distinctions.some((d) => d.kind === 'stage_wins')),
    ).toBe(true)
    expect(ultima.cast.riders.some((c) => c.distinctions.some((d) => d.kind === 'gc'))).toBe(true)
  })

  it('el equipo y la equipación son los del día, por primera aparición', () => {
    const tl = lineasA.get(1)!
    expect(tl.cast.teams).toEqual(
      w.teamIds.map((teamId, k) => ({ teamId, jerseySeed: `equipacion-${k + 1}` })),
    )
    for (const c of tl.cast.riders) {
      expect(c.team).toBe(Math.floor(c.rider / 10))
      expect(c.bib).toBe(c.rider + 1)
      expect([c.country, c.gender]).toEqual(['ES', 'M'])
    }
  })

  it('knownWins cuenta las victorias de carreras terminadas hace más de expiryGameDays, en su mundo (7-e)', async () => {
    const filas = await t.db.select().from(palmares)
    /** El oráculo, a mano sobre todo el palmarés: victorias de general o de etapa de una carrera
     *  (y temporada) cuya fila gc, en el mismo mundo, es del día `hasta` o anterior. */
    const oraculo = (riderId: string, hasta: number): number => {
      const terminadas = new Set(
        filas
          .filter((f) => f.worldId === w.worldId && f.kind === 'gc' && f.gameDay <= hasta)
          .map((f) => `${f.raceId}|${f.season}`),
      )
      return filas.filter(
        (f) =>
          f.worldId === w.worldId &&
          f.riderId === riderId &&
          (f.kind === 'gc' || f.kind === 'stage') &&
          terminadas.has(`${f.raceId}|${f.season}`),
      ).length
    }
    // La carrera A, terminada el día 124, ya cuenta en la B (su velo caducó el 180).
    const enA = (riderId: string) =>
      filas.filter((f) => f.riderId === riderId && f.raceId === 'race-reparto').length
    for (const [n, tl] of lineasB) {
      const hasta = 199 + n - 56
      for (const c of tl.cast.riders) expect(c.knownWins).toBe(oraculo(c.riderId, hasta))
      // De lo escrito a mano solo cuenta race-vieja: ni la recién terminada, ni la que sigue en
      // curso, ni la del otro mundo.
      expect(de(tl, Z).knownWins).toBe(2 + enA(Z))
      expect(de(tl, W).knownWins).toBe(1 + enA(W))
    }
    // La prueba no es vacía: alguien más tiene victorias conocidas, las de la carrera A.
    expect(lineasB.get(1)!.cast.riders.filter((c) => c.knownWins > 0).length).toBeGreaterThan(2)
    // Y en la carrera A (días 120 a 124) ni la general de race-vieja (día 100) había caducado.
    for (const tl of lineasA.values()) for (const c of tl.cast.riders) expect(c.knownWins).toBe(0)
  })

  it('el campeón lleva su maillot en su disciplina y lo dice en una línea en la otra (§7.2, §7.4)', () => {
    const ruta = { raceKey: 'nc-es-road:s0', stageDay: 1 }
    const crono = { raceKey: 'nc-es-itt:s0', stageDay: 1 }
    const prologo = lineasB.get(1)!
    const llana = lineasB.get(2)!
    // El prólogo es el día 1: nadie de líder; el de crono lleva el suyo y el de ruta lo dice.
    expect(de(prologo, Y).worn).toMatchObject({ kind: 'champion', title: { source: crono } })
    expect(de(prologo, X).worn).toEqual({ kind: 'team' })
    expect(de(prologo, X).distinctions).toEqual([
      { kind: 'champion', title: expect.objectContaining({ source: ruta, discipline: 'road' }) },
    ])
    // En la llana, al revés (si ninguno de los dos va de amarillo).
    const xLlana = de(llana, X)
    if (xLlana.worn.kind === 'leader')
      expect(xLlana.distinctions).toContainEqual(
        expect.objectContaining({
          kind: 'champion',
          title: expect.objectContaining({ source: ruta }),
        }),
      )
    else expect(xLlana.worn).toMatchObject({ kind: 'champion', title: { source: ruta } })
    expect(de(llana, Y).distinctions).toContainEqual(
      expect.objectContaining({
        kind: 'champion',
        title: expect.objectContaining({ source: crono }),
      }),
    )
    // Tras un prólogo, sin puntos ni montaña, solo se viste el amarillo (caso 14 de §7.2).
    const lideres = llana.cast.riders.filter((c) => c.worn.kind === 'leader')
    expect(lideres.map((c) => c.worn.kind === 'leader' && c.worn.jersey)).toEqual(['gc'])
  })

  it('los favoritos son los del orden de atributos leído al empezar, aunque el aprendizaje los cambie (8-g)', () => {
    const llana = lineasB.get(2)!
    // Lo esperado, con los SPR de antes de la etapa: valor decreciente y, a igual valor, RiderIx.
    const esperados = llana.riderIds
      .map((riderId, rider) => ({ rider, value: sprAntes.get(riderId) ?? 0 }))
      .sort((a, b) => b.value - a.value || a.rider - b.rider)
      .slice(0, 3)
      .map(({ rider }) => ({ rider, why: 'sprint' as const }))
    expect(llana.cast.favourites).toEqual(esperados)
    expect(llana.riderIds[llana.cast.favourites[0]!.rider]).toBe(P)
    expect(llana.riderIds[llana.cast.favourites[1]!.rider]).toBe(Q)
    // La prueba no es vacía: el aprendizaje de la etapa puso a Q por delante de P.
    expect(sprDespues.get(P)).toBe(sprAntes.get(P))
    expect(sprDespues.get(Q)!).toBeGreaterThan(sprDespues.get(P)!)
    // Y el prólogo los ordena por CRI.
    expect(lineasB.get(1)!.cast.favourites.every((f) => f.why === 'tt')).toBe(true)
  })
})
