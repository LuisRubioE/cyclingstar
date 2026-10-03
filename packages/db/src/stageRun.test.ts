import { type Incident, TEST_TOUR, TIMELINE } from '@cyclingstar/engine'
import { ATTRIBUTES, TEMPLATE_REV, newsPayloadSchema, renderNews } from '@cyclingstar/shared'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { worldHorizon } from './horizon.js'
import { newsNames } from './news.js'
import {
  news,
  raceGc,
  raceRosters,
  riderAttrLog,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  stageResults,
  stageSnapshots,
  stageTeamResults,
  teams,
  worlds,
} from './schema.js'
import { getGcThroughStage, getKomClassification, getPointsClassification } from './results.js'
import {
  type StageRunSpec,
  applyIncidents,
  runOneStage,
  soleLeader,
  wonFromBreakaway,
} from './stageRun.js'
import { getTeamClassifications } from './teamClassification.js'
import { type TestDb, startTestDb } from './testDb.js'
import { type TestWorld, enrollAll, seedTestWorld, stageSpecOf } from './timelineTestWorld.js'
import {
  type TimelineTickLog,
  clearStageTimelineCache,
  readStageTimeline,
  timelineTickLog,
} from './timelines.js'

/**
 * Integración real de `runOneStage` contra Postgres (PGlite): comprueba que las escrituras EN LOTE
 * dejan exactamente los mismos datos que el bucle fila a fila de antes —resultados, general
 * acumulada entre etapas, carga (ctl/atl), subidas de atributos, bitácoras y puntos de temporada—.
 */

const RACE_KEY = 'race-test:s0'
const FIELD = 40

/**
 * IDENTIFICADORES FIJOS, Y NO SOLO DORSALES. El dorsal arregla el ORDEN de entrada al motor, pero no
 * los DESEMPATES: `stage/simulate.ts` rompe los empates comparando el id del corredor
 * (`a.input.riderId < b.input.riderId`, líneas 2282 y 4131), que aquí es un UUID que Postgres
 * sortea nuevo en cada corrida. Con la misma semilla y el mismo campo, dos corridas resolvían los
 * empates al revés y contaban carreras distintas: casi siempre igual, y de vez en cuando con un
 * abandono de más. Eso es lo que ponía roja esta prueba en la CI mientras pasaba en local. En
 * producción los ids son estables dentro de un mundo, así que la reproducibilidad de verdad no
 * dependía de esto; la de la prueba sí. Se fijan en orden ascendente para que el desempate coincida
 * con el del dorsal.
 */
const idDe = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`

async function seedMiniWorld(
  t: TestDb,
): Promise<{ worldId: string; teamId: string; riderIds: string[] }> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-etapa', engineVersion: 1 })
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
        id: idDe(i),
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

  // Atributos visibles distintos por corredor (para que la carrera tenga jerarquía) y techos altos,
  // de modo que la etapa deje margen de subida y se escriban filas en rider_attrs / rider_attr_log.
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
  /**
   * CON DORSAL, PORQUE SI NO LA CARRERA NO ES LA MISMA DOS VECES. `runOneStage` ordena el campo por
   * `bib` y desempata por el id del corredor, que aquí es un UUID que Postgres sortea en cada alta.
   * Sin dorsales el orden de entrada al motor cambia de una corrida a otra, y el motor DEPENDE del
   * orden —sus flujos compartidos se consumen recorriendo el array, como está anotado en
   * `stageRun.ts`—, así que la misma semilla contaba una carrera distinta cada vez. Se vio en verde
   * y en rojo con el mismo commit: una corrida dejó a un corredor sin clasificar y la fila de
   * `stage_results` que esta prueba cuenta no estaba. En producción los dorsales los reparte
   * `calendarRun`; aquí hay que ponerlos a mano.
   */
  await t.db
    .insert(raceRosters)
    .values(riderIds.map((id, i) => ({ raceId: RACE_KEY, riderId: id, bib: i + 1 })))
  return { worldId, teamId: team!.id, riderIds }
}

describe('db: runOneStage escribe en lote con la misma semántica', () => {
  let t: TestDb
  let worldId: string
  let teamId: string
  let riderIds: string[]

  beforeAll(async () => {
    t = await startTestDb()
    const seeded = await seedMiniWorld(t)
    worldId = seeded.worldId
    teamId = seeded.teamId
    riderIds = seeded.riderIds
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('corre dos etapas y acumula la general con los tiempos netos de cada una', async () => {
    const stage1 = TEST_TOUR[0]!
    const stage2 = TEST_TOUR[1]!

    const raced1 = await t.db.transaction((tx) =>
      runOneStage(tx, worldId, 1, 'semilla-etapa', {
        raceKey: RACE_KEY,
        raceId: 'race-test',
        raceName: 'Carrera de pruebas',
        level: 'WT',
        raceClass: 'WT',
        season: 0,
        stageDay: 1,
        kind: stage1.kind,
        profile: stage1.profile,
        timeTrial: false,
        isFinal: false,
      }),
    )
    expect(raced1.size).toBe(FIELD)

    const res1 = await t.db
      .select({
        riderId: stageResults.riderId,
        tiempoS: stageResults.tiempoS,
        bonificacionS: stageResults.bonificacionS,
        puntosVolante: stageResults.puntosVolante,
        puntosMontana: stageResults.puntosMontana,
      })
      .from(stageResults)
      .where(and(eq(stageResults.raceId, RACE_KEY), eq(stageResults.stageDay, 1)))
    expect(res1).toHaveLength(FIELD)

    // En una carrera POR ETAPAS sí hay bonificaciones (10/6/4 a los tres primeros): construyen la
    // general, que es justo lo que una carrera de un día no tiene.
    const puestoById = new Map(
      (
        await t.db
          .select({ riderId: stageResults.riderId, puesto: stageResults.puesto })
          .from(stageResults)
          .where(and(eq(stageResults.raceId, RACE_KEY), eq(stageResults.stageDay, 1)))
      ).map((r) => [r.riderId, r.puesto] as const),
    )
    const bonoDe = (puesto: number): number =>
      res1.find((r) => puestoById.get(r.riderId) === puesto)?.bonificacionS ?? -1
    expect([bonoDe(1), bonoDe(2), bonoDe(3), bonoDe(4)]).toEqual([10, 6, 4, 0])

    // La general tras la etapa 1 es exactamente el tiempo neto (tiempo − bonificación) de la etapa.
    const gc1 = await t.db.select().from(raceGc).where(eq(raceGc.raceId, RACE_KEY))
    expect(gc1).toHaveLength(FIELD)
    const netById = new Map(
      res1.map((r) => [r.riderId, Math.max(0, r.tiempoS - r.bonificacionS)] as const),
    )
    for (const row of gc1) {
      expect(row.tiempoTotalS).toBe(netById.get(row.riderId))
      // Desempate: con una sola etapa corrida, la suma de puestos ES el puesto de esa etapa.
      expect(row.sumaPuestos).toBe(puestoById.get(row.riderId))
      expect(row.ultimoPuesto).toBe(puestoById.get(row.riderId))
    }

    // Puntos de temporada: los del puesto de etapa, sumados en una sola sentencia en lote.
    const points1 = await t.db
      .select({ n: sql<number>`sum(${riders.seasonPoints})::int` })
      .from(riders)
      .where(eq(riders.worldId, worldId))
    expect(points1[0]!.n).toBeGreaterThan(0)

    // Carga del día: ctl/atl se actualizan con UPDATE ... FROM (VALUES …) y quedan distintos del alta.
    const loaded = await t.db
      .select({ n: sql<number>`count(*)::int` })
      .from(riders)
      .where(and(eq(riders.worldId, worldId), sql`${riders.ctl} <> 60`))
    expect(loaded[0]!.n).toBe(FIELD)

    const dailyLog = await t.db
      .select({ n: sql<number>`count(*)::int` })
      .from(riderDailyLog)
      .where(eq(riderDailyLog.gameDay, 1))
    expect(dailyLog[0]!.n).toBe(FIELD)

    // Subidas de atributos: la etapa llana reparte XP a LLA, SPR y TAC de todos los que corrieron.
    const attrLog = await t.db
      .select({ attr: riderAttrLog.attr, n: sql<number>`count(*)::int` })
      .from(riderAttrLog)
      .where(eq(riderAttrLog.gameDay, 1))
      .groupBy(riderAttrLog.attr)
    expect(new Set(attrLog.map((a) => a.attr))).toEqual(new Set(['LLA', 'SPR', 'TAC']))
    for (const a of attrLog) expect(a.n).toBe(FIELD)

    const raised = await t.db
      .select({ n: sql<number>`count(*)::int` })
      .from(riderAttrs)
      .where(and(eq(riderAttrs.attr, 'LLA'), sql`${riderAttrs.value} > 50`))
    expect(raised[0]!.n).toBe(FIELD)

    // Segunda etapa: la general debe SUMAR, no reemplazar (el upsert en lote usa excluded.*).
    await t.db.transaction((tx) =>
      runOneStage(tx, worldId, 2, 'semilla-etapa', {
        raceKey: RACE_KEY,
        raceId: 'race-test',
        raceName: 'Carrera de pruebas',
        level: 'WT',
        raceClass: 'WT',
        season: 0,
        stageDay: 2,
        kind: stage2.kind,
        profile: stage2.profile,
        timeTrial: false,
        isFinal: true,
      }),
    )
    const res2 = await t.db
      .select({
        riderId: stageResults.riderId,
        puesto: stageResults.puesto,
        tiempoS: stageResults.tiempoS,
        bonificacionS: stageResults.bonificacionS,
        puntosVolante: stageResults.puntosVolante,
        puntosMontana: stageResults.puntosMontana,
      })
      .from(stageResults)
      .where(and(eq(stageResults.raceId, RACE_KEY), eq(stageResults.stageDay, 2)))
    const gc2 = await t.db.select().from(raceGc).where(eq(raceGc.raceId, RACE_KEY))
    const gc1ById = new Map(gc1.map((r) => [r.riderId, r] as const))
    for (const r of res2) {
      const prev = gc1ById.get(r.riderId)!
      const now = gc2.find((g) => g.riderId === r.riderId)!
      expect(now.tiempoTotalS).toBe(prev.tiempoTotalS + Math.max(0, r.tiempoS - r.bonificacionS))
      expect(now.puntosVolante).toBe(prev.puntosVolante + r.puntosVolante)
      expect(now.puntosMontana).toBe(prev.puntosMontana + r.puntosMontana)
      // El desempate se acumula etapa a etapa igual que el tiempo.
      expect(now.sumaPuestos).toBe(prev.sumaPuestos + r.puesto)
      expect(now.ultimoPuesto).toBe(r.puesto)
    }

    // Al ser la etapa final se reparten además los puntos de la general: el total sube.
    const points2 = await t.db
      .select({ n: sql<number>`sum(${riders.seasonPoints})::int` })
      .from(riders)
      .where(eq(riders.worldId, worldId))
    expect(points2[0]!.n).toBeGreaterThan(points1[0]!.n)
    expect(riderIds).toHaveLength(FIELD)

    // --- Clasificación por equipos escrita por el tick -------------------------------------
    // El mundo de este test tiene UN solo equipo con los 40 corredores, así que hay una fila por
    // etapa y su tiempo es la suma de los tres primeros puestos de esa etapa (tiempos de META: las
    // bonificaciones, que aquí sí existen, no cuentan para esta clasificación).
    const teamRows = await t.db
      .select()
      .from(stageTeamResults)
      .where(eq(stageTeamResults.raceId, RACE_KEY))
      .orderBy(asc(stageTeamResults.stageDay))
    expect(teamRows).toHaveLength(2)
    const tresMejores = (rows: { puesto: number; tiempoS: number }[]): number =>
      [...rows]
        .sort((a, b) => a.puesto - b.puesto)
        .slice(0, 3)
        .reduce((sum, r) => sum + r.tiempoS, 0)
    const res1Full = await t.db
      .select({ puesto: stageResults.puesto, tiempoS: stageResults.tiempoS })
      .from(stageResults)
      .where(and(eq(stageResults.raceId, RACE_KEY), eq(stageResults.stageDay, 1)))
    expect(teamRows[0]!.scored).toBe(true)
    expect(teamRows[0]!.tiempoS).toBe(tresMejores(res1Full))
    expect(teamRows[0]!.sumaPuestos).toBe(6) // 1 + 2 + 3
    expect(teamRows[0]!.mejorPuesto).toBe(1)
    expect(teamRows[1]!.tiempoS).toBe(tresMejores(res2))

    // Y lo persistido coincide EXACTAMENTE con lo que se derivaría del histórico: la regla es la
    // misma función en los dos caminos, y este test lo ata para que no puedan separarse.
    const persistida = await getTeamClassifications(t.db, RACE_KEY, 2)
    await t.db.delete(stageTeamResults).where(eq(stageTeamResults.raceId, RACE_KEY))
    const derivada = await getTeamClassifications(t.db, RACE_KEY, 2)
    expect(derivada).toEqual(persistida)
    // La acumulada suma las dos etapas, no las recalcula desde la general.
    expect(persistida.overall[0]!.tiempoS).toBe(teamRows[0]!.tiempoS + teamRows[1]!.tiempoS)
    expect(persistida.overall[0]!.stagesScored).toBe(2)
  }, 180_000)

  /**
   * LA RADIO SE GUARDA AL CORRER. El dueño la pidió y durante toda una tanda existió solo como
   * script de línea de comandos: la vista no podía existir porque el dato no se guardaba. Y guardarlo
   * es obligatorio, no una optimización: una etapa corrida con el motor de ayer no se puede
   * reconstruir con el de hoy (`checkReplay`), así que calcularla al vuelo la dejaría vacía justo
   * para las etapas ya corridas, que son las que se quieren mirar.
   *
   * Se lee la etapa 1 que acaba de correr el caso de arriba: es la misma escritura de producción.
   */
  it('la etapa corrida deja su RADIO guardada, con grupos y huecos', async () => {
    const [row] = await t.db
      .select({ radio: stageSnapshots.radio })
      .from(stageSnapshots)
      .where(and(eq(stageSnapshots.raceId, RACE_KEY), eq(stageSnapshots.stageDay, 1)))
    const radio = row?.radio as
      | { starters: number; kms: { km: number; groups: { size: number; gapS: number }[] }[] }
      | null
      | undefined
    expect(radio).toBeTruthy()
    expect(radio!.starters).toBeGreaterThan(0)
    // Una foto por kilómetro, y cada una con al menos un grupo: si esto sale vacío, la vista sale
    // vacía y el dueño vuelve a ver una pestaña que no enseña nada.
    expect(radio!.kms.length).toBeGreaterThan(10)
    for (const k of radio!.kms) expect(k.groups.length).toBeGreaterThan(0)
    // El primer grupo de carretera es el líder: su hueco al líder es cero por construcción.
    expect(radio!.kms[0]!.groups[0]!.gapS).toBe(0)
  })

  /**
   * LAS NOTICIAS DE LA ETAPA SE GUARDAN CON SUS DATOS (docs/retransmision.md §12.8 y §13.2; E2, paso
   * 1a). Las dos etapas del primer caso escribieron sus titulares (la victoria, la general y la
   * montaña de la final, y los abandonos y lesiones que hubiera): todos llevan un `NewsPayload` que
   * valida, su semilla, la carrera y la etapa de quien los escribe, y su `text` de compatibilidad es
   * exactamente lo que se lee al redactar desde los datos (B4).
   */
  it('cada titular de la etapa guarda sus datos y se lee como se escribió', async () => {
    const filas = await t.db.select().from(news).where(eq(news.worldId, worldId))
    const VICTORIA = ['stage_win', 'tt_win', 'breakaway_win']
    // Una victoria por etapa, y la general de la final.
    for (const dia of [1, 2]) {
      expect(filas.filter((f) => VICTORIA.includes(f.kind) && f.stageDay === dia)).toHaveLength(1)
    }
    expect(filas.filter((f) => f.kind === 'gc_win')).toHaveLength(1)
    const payloads = filas.map((f) => newsPayloadSchema.parse(f.data))
    const nombres = await newsNames(t.db, payloads)
    for (const [i, fila] of filas.entries()) {
      const p = payloads[i]!
      expect(fila.kind).toBe(p.kind)
      expect(fila.tplRev).toBe(TEMPLATE_REV)
      expect(fila.raceKey).toBe(RACE_KEY)
      expect(fila.stageDay).toBe('stageDay' in p ? p.stageDay : null)
      expect(p).toMatchObject({ raceId: 'race-test', season: 0 })
      // El equipo del día: el de la entrada de la etapa, que aquí es el único equipo.
      expect('teamId' in p ? p.teamId : null).toBe(teamId)
      expect(fila.text).toBe(renderNews('en', p, fila.seed!, fila.tplRev!, nombres))
    }
    const victoria = filas.find((f) => VICTORIA.includes(f.kind) && f.stageDay === 1)!
    expect(victoria.seed).toBe(`win:${RACE_KEY}:1:1`)
    // 'race-test' no está en el calendario: la carrera se nombra por su id y la etapa, sin ruta.
    expect(victoria.text).toMatch(
      /^Corredor \d+ wins stage 1 of the race-test( from the breakaway)?\.$/,
    )
  })

  /**
   * LOS DOS TITULARES DE LÍDER (docs/retransmision.md §12.8, 12-h; E2, paso 1a): `awardOutcome` los
   * escribe en una vuelta, de la etapa 2 a la penúltima, cuando cambia el primero de la general, de
   * los puntos o de la montaña respecto de la etapa anterior; en la primera los cubre la victoria y en
   * la última, `gc_win` y `kom`. Se escriben desde el 1a y no se sirven hasta el 8a (17-x).
   *
   * La etapa 1 de esta vuelta se escribe a mano para que el cambio de líder sea seguro y no dependa
   * de la carrera: su líder (un segundo por delante de todos) se retira antes de la 2, así que la 2
   * tiene que darle la general a otro. Nadie lleva puntos de nada tras la 1.
   */
  it('gc_lead_taken y jersey_taken cuando cambia el primero, nunca en la primera ni en la última', async () => {
    const KEY = 'race-lideres:s0'
    const specDe = (
      stageDay: number,
      stage: (typeof TEST_TOUR)[number],
      isFinal: boolean,
    ): StageRunSpec => ({
      raceKey: KEY,
      raceId: 'race-lideres',
      raceName: 'Carrera de líderes',
      level: 'WT',
      raceClass: 'WT',
      season: 0,
      stageDay,
      kind: stage.kind,
      profile: stage.profile,
      timeTrial: stage.timeTrial === true,
      isFinal,
    })
    const retirado = riderIds[0]!
    await t.db.insert(stageResults).values(
      riderIds.map((riderId, i) => ({
        raceId: KEY,
        stageDay: 1,
        riderId,
        puesto: i + 1,
        tiempoS: i === 0 ? 18_000 : 18_001,
        bonificacionS: 0,
        puntosVolante: 0,
        puntosMontana: 0,
      })),
    )
    await t.db.insert(raceRosters).values(
      riderIds.map((riderId, i) => ({
        raceId: KEY,
        riderId,
        bib: i + 1,
        ...(i === 0 ? { abandonedDay: 41, abandonedReason: 'voluntario' as const } : {}),
      })),
    )
    const leaderOf = async (day: number) => ({
      gc: (await getGcThroughStage(t.db, KEY, day)).find((r) => !r.dnf)?.riderId ?? null,
      points: soleLeader(await getPointsClassification(t.db, KEY, day)),
      kom: soleLeader(await getKomClassification(t.db, KEY, day)),
    })
    expect(await leaderOf(1)).toEqual({ gc: retirado, points: null, kom: null })

    const etapas = [TEST_TOUR[1]!, TEST_TOUR[2]!, TEST_TOUR[4]!]
    for (const [i, stage] of etapas.entries()) {
      const stageDay = i + 2
      await t.db.transaction((tx) =>
        runOneStage(
          tx,
          worldId,
          40 + stageDay,
          'semilla-lideres',
          specDe(stageDay, stage, stageDay === 4),
        ),
      )
    }

    const titulares = await t.db
      .select({ kind: news.kind, riderId: news.riderId, stageDay: news.stageDay, data: news.data })
      .from(news)
      .where(and(eq(news.raceKey, KEY), inArray(news.kind, ['gc_lead_taken', 'jersey_taken'])))
    // El líder se retiró: la etapa 2 le da la general a otro.
    const nuevo = (await leaderOf(2)).gc
    expect(nuevo).not.toBeNull()
    expect(nuevo).not.toBe(retirado)
    expect(titulares.filter((x) => x.kind === 'gc_lead_taken' && x.stageDay === 2)).toEqual([
      {
        kind: 'gc_lead_taken',
        riderId: nuevo,
        stageDay: 2,
        data: {
          kind: 'gc_lead_taken',
          raceId: 'race-lideres',
          season: 0,
          stageDay: 2,
          riderId: nuevo,
          teamId,
        },
      },
    ])
    // En cada etapa con anterior que no es la última, uno por clasificación que cambia de primero.
    for (const dia of [2, 3]) {
      const [antes, despues] = [await leaderOf(dia - 1), await leaderOf(dia)]
      const esperados: { kind: string; riderId: string; jersey?: string }[] = []
      if (despues.gc !== null && despues.gc !== antes.gc)
        esperados.push({ kind: 'gc_lead_taken', riderId: despues.gc })
      for (const jersey of ['points', 'kom'] as const) {
        const quien = despues[jersey]
        if (quien !== null && quien !== antes[jersey])
          esperados.push({ kind: 'jersey_taken', riderId: quien, jersey })
      }
      const escritos = titulares
        .filter((x) => x.stageDay === dia)
        .map((x) => {
          const p = newsPayloadSchema.parse(x.data)
          return {
            kind: x.kind,
            riderId: x.riderId!,
            ...(p.kind === 'jersey_taken' ? { jersey: p.jersey } : {}),
          }
        })
      expect(escritos, `etapa ${dia}`).toEqual(esperados)
    }
    // Nunca en la última: la cubren gc_win y kom.
    expect(titulares.filter((x) => x.stageDay === 4)).toEqual([])
    // Y nunca en la primera: la vuelta del primer caso corrió la 1 y la 2 (la última), y no tiene ninguno.
    const enLaOtra = await t.db
      .select({ kind: news.kind })
      .from(news)
      .where(and(eq(news.raceKey, RACE_KEY), inArray(news.kind, ['gc_lead_taken', 'jersey_taken'])))
    expect(enLaOtra).toEqual([])
  }, 180_000)

  /**
   * LA LESIÓN GUARDA LA SALUD DE ANTES (§12.8; la máscara de la ficha, sup. P5, la enseña mientras la
   * etapa de la caída esté velada). `applyIncidents` la conoce antes de escribir la nueva.
   */
  it('injury guarda los días, la salud de antes y hasta cuándo', async () => {
    const tocado = riderIds[5]!
    const sano = riderIds[6]!
    await t.db
      .update(riders)
      .set({ health: 'molestias', healthUntilDay: 40 })
      .where(eq(riders.id, tocado))
    await t.db
      .update(riders)
      .set({ health: 'sano', healthUntilDay: null })
      .where(eq(riders.id, sano))
    const filas = await t.db
      .select({ id: riders.id, health: riders.health, healthUntilDay: riders.healthUntilDay })
      .from(riders)
      .where(inArray(riders.id, [tocado, sano]))
    const riderById = new Map(filas.map((r) => [r.id, r]))
    const caida = (riderId: string, diasBaja: number): Incident => ({
      riderId,
      km: 80,
      tipo: 'caida',
      severidad: 'minor',
      perdidaS: 60,
      diasBaja,
    })
    const spec = { raceKey: RACE_KEY, raceId: 'race-test', season: 0, stageDay: 3 }
    await t.db.transaction((tx) =>
      applyIncidents(
        tx,
        worldId,
        30,
        spec,
        [caida(tocado, 16), caida(sano, 3)],
        riderById,
        () => teamId,
      ),
    )
    const lesiones = await t.db
      .select({ riderId: news.riderId, data: news.data, text: news.text })
      .from(news)
      .where(and(eq(news.worldId, worldId), eq(news.kind, 'injury'), eq(news.gameDay, 30)))
    const de = (id: string) => lesiones.find((l) => l.riderId === id)!
    expect(de(tocado).data).toEqual({
      kind: 'injury',
      raceId: 'race-test',
      season: 0,
      stageDay: 3,
      riderId: tocado,
      teamId,
      days: 16,
      prevHealth: 'molestias',
      prevUntilDay: 40,
    })
    expect(de(tocado).text).toBe('Corredor 5 injured — out for 2 weeks.')
    expect(de(sano).data).toMatchObject({ days: 3, prevHealth: 'sano', prevUntilDay: null })
    expect(de(sano).text).toBe('Corredor 6 injured — out for 3 days.')
    // …y la salud nueva, que es la de siempre: lesionado hasta el día de la caída más la baja.
    const despues = await t.db
      .select({ id: riders.id, health: riders.health, healthUntilDay: riders.healthUntilDay })
      .from(riders)
      .where(inArray(riders.id, [tocado, sano]))
    expect(new Map(despues.map((r) => [r.id, [r.health, r.healthUntilDay]]))).toEqual(
      new Map([
        [tocado, ['lesionado', 46]],
        [sano, ['lesionado', 33]],
      ]),
    )
  })
})

describe('db: la fuga del titular y el primero de una clasificación (E2, paso 1a)', () => {
  type Grupo = [kind: 'fuga' | 'contra' | 'peloton' | 'grupeto', riderIds: string[]]
  const foto = (km: number, grupos: Grupo[]) => ({
    km,
    groups: grupos.map(([kind, riderIds]) => ({ kind, riderIds })),
  })
  const radio = (...kms: ReturnType<typeof foto>[]) => ({ kms })
  const formada = { tipo: 'fuga_formada' }
  const cazada = { tipo: 'fuga_cazada' }

  /**
   * `breakaway_win` (§12.8, 12-g): a la regla de hoy (hubo fuga y no la cazaron) se le AÑADE que el
   * ganador vaya en ella, es decir, que su grupo en la última foto de la radio sea `fuga`. Medido en
   * 44 etapas del banco, la regla de hoy acierta en sus 16 y la foto sola añadiría diez ataques del
   * final; con las dos, el titular dice lo que pasó.
   */
  it('breakaway_win solo con el ganador en un grupo fuga en la última foto', () => {
    const final = (kind: Grupo[0]) =>
      radio(
        foto(0, [['peloton', ['g', 'a', 'b']]]),
        foto(150, [
          [kind, ['g', 'a']],
          ['peloton', ['b']],
        ]),
      )
    expect(wonFromBreakaway([formada], final('fuga'), 'g')).toBe(true)
    // Ganó un ataque del final: el grupo del ganador ya no es la fuga del día.
    expect(wonFromBreakaway([formada], final('contra'), 'g')).toBe(false)
    expect(wonFromBreakaway([formada], final('peloton'), 'g')).toBe(false)
    // Con la fuga cazada no hay titular de fuga, vaya el ganador donde vaya.
    expect(wonFromBreakaway([formada, cazada], final('fuga'), 'g')).toBe(false)
    // Sin fuga, tampoco.
    expect(wonFromBreakaway([], final('fuga'), 'g')).toBe(false)
    // Manda la ÚLTIMA foto: haber ido en la fuga antes no basta.
    const antes = radio(
      foto(100, [
        ['fuga', ['g']],
        ['peloton', ['a', 'b']],
      ]),
      foto(150, [['peloton', ['g', 'a', 'b']]]),
    )
    expect(wonFromBreakaway([formada], antes, 'g')).toBe(false)
    // Una etapa sin radio (una crono) no da fugas.
    expect(wonFromBreakaway([formada], radio(), 'g')).toBe(false)
  })

  it('el primero de puntos o de montaña es el que tiene más que nadie él solo', () => {
    expect(soleLeader([])).toBeNull()
    expect(soleLeader([{ riderId: 'a', puntos: 5 }])).toBe('a')
    expect(
      soleLeader([
        { riderId: 'b', puntos: 7 },
        { riderId: 'a', puntos: 9 },
        { riderId: 'c', puntos: 2 },
      ]),
    ).toBe('a')
    // Empatados arriba no hay primero: la consulta los da en el orden que quiera Postgres, y un
    // titular «X takes the points lead» con X sorteado entre dos sería inventado.
    expect(
      soleLeader([
        { riderId: 'a', puntos: 9 },
        { riderId: 'b', puntos: 9 },
        { riderId: 'c', puntos: 2 },
      ]),
    ).toBeNull()
  })
})

/**
 * LA LÍNEA EN LA TRANSACCIÓN DE LA ETAPA (docs/retransmision.md §5.5 y §17.8; E2, paso 5). Con
 * `spec.timeline` y `flush` detrás de la etapa, en la misma transacción, la etapa deja su fila en
 * `stage_timelines`; sin `flush` no la deja, y la retransmisión saldría del adaptador sin que nadie lo
 * notara. Y GRABAR NO CAMBIA NADA DE LO QUE LA ETAPA ESCRIBE: con la grabación apagada
 * (`TIMELINE_RECORD=off`, sin `spec.timeline`, la envoltura de hoy) y encendida, las mismas filas en
 * todas las tablas que toca `runOneStage`, el aprendizaje y la radio guardada incluidos. Cada corrida se
 * deshace al acabar, así que las dos parten del mismo mundo. Este fichero corre `runOneStage`
 * directamente y no ve `tick_log`, que solo escribe `runTick` (lo mira `tickRun.test.ts`).
 */
describe('db: runOneStage con la grabación de la línea temporal (E2, paso 5)', () => {
  let t: TestDb
  let w: TestWorld
  const KEY = 'race-grabada:s0'
  const SEMILLA = 'semilla-grabada'
  /** Todas las tablas que escribe una etapa (y las que no debería tocar), salvo `stage_timelines`. */
  const TABLAS = [
    'stage_snapshots',
    'stage_results',
    'race_gc',
    'stage_team_results',
    'race_rosters',
    'riders',
    'rider_attrs',
    'rider_attr_log',
    'rider_daily_log',
    'rider_points',
    'news',
    'palmares',
    'transactions',
    'teams',
  ] as const

  class Deshacer extends Error {}

  /** Las filas de cada tabla sin sus ids sorteados ni sus fechas de alta, ordenadas. */
  const fotoDe = async (tx: Parameters<Parameters<TestDb['db']['transaction']>[0]>[0]) => {
    const out: Record<string, string[]> = {}
    for (const tabla of TABLAS) {
      const filas = await tx.execute(sql.raw(`select * from "${tabla}"`))
      out[tabla] = [...filas]
        .map((f) => {
          const resto: Record<string, unknown> = { ...f }
          delete resto.id
          delete resto.created_at
          return JSON.stringify(resto)
        })
        .sort()
    }
    return out
  }

  /** Corre la etapa 2 en una transacción, saca la foto de lo escrito y la deshace. */
  const correrYDeshacer = async (
    log: TimelineTickLog | null,
    flush = true,
  ): Promise<{ foto: Record<string, string[]>; lineas: number }> => {
    let foto: Record<string, string[]> = {}
    let lineas = -1
    await t.db
      .transaction(async (tx) => {
        await runOneStage(tx, w.worldId, 41, SEMILLA, {
          ...stageSpecOf(KEY, 2, TEST_TOUR[1]!, false),
          ...(log ? { timeline: log } : {}),
        })
        if (log && flush) await log.flush(tx)
        foto = await fotoDe(tx)
        const [n] = await tx.execute<{ n: number }>(
          sql`select count(*)::int as n from stage_timelines where race_id = ${KEY} and stage_day = 2`,
        )
        lineas = n!.n
        throw new Deshacer()
      })
      .catch((e: unknown) => {
        if (!(e instanceof Deshacer)) throw e
      })
    return { foto, lineas }
  }

  beforeAll(async () => {
    t = await startTestDb()
    w = await seedTestWorld(t, { worldSeed: SEMILLA })
    await enrollAll(t, w, KEY)
    // La etapa 1, de verdad y sin grabar: la 2 sale con general, puntos y maillots.
    await t.db.transaction((tx) =>
      runOneStage(tx, w.worldId, 40, SEMILLA, stageSpecOf(KEY, 1, TEST_TOUR[0]!, false)),
    )
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('grabar no cambia nada de lo que escribe la etapa: las mismas filas con la grabación apagada y encendida', async () => {
    const apagada = await correrYDeshacer(null)
    const encendida = await correrYDeshacer(timelineTickLog())
    expect(apagada.lineas).toBe(0)
    expect(encendida.lineas).toBe(1)
    for (const tabla of TABLAS) {
      expect(encendida.foto[tabla], tabla).toEqual(apagada.foto[tabla])
    }
    // La prueba no es vacía: la etapa escribió resultados, general, aprendizaje y radio.
    for (const tabla of ['stage_results', 'rider_attr_log', 'stage_snapshots'] as const)
      expect(apagada.foto[tabla]!.length, tabla).toBeGreaterThan(0)
  }, 180_000)

  it('sin flush detrás de la etapa no queda fila, aunque la línea se haya cerrado', async () => {
    const log = timelineTickLog()
    const { lineas } = await correrYDeshacer(log, false)
    expect(lineas).toBe(0)
    // La línea se cerró y espera en el diario: el resumen no la cuenta porque no se escribió.
    expect(log.summary()).toBe('timeline: 0 grabadas, 0 sin línea')
  }, 120_000)

  it('con flush, la etapa deja su línea con el formato 1 y su reparto congelado', async () => {
    const log = timelineTickLog()
    await t.db.transaction(async (tx) => {
      await runOneStage(tx, w.worldId, 41, SEMILLA, {
        ...stageSpecOf(KEY, 2, TEST_TOUR[1]!, false),
        timeline: log,
      })
      await log.flush(tx)
    })
    expect(log.summary()).toBe('timeline: 1 grabadas, 0 sin línea')
    clearStageTimelineCache()
    const tl = await readStageTimeline(t.db, worldHorizon, KEY, 2)
    expect(tl?.format).toBe(TIMELINE.format)
    expect(tl?.cast.riders.map((c) => c.riderId)).toEqual(tl?.riderIds)
    // La 2 sale con la general de la 1: su líder lleva el amarillo desde la etapa 1.
    expect(
      tl?.cast.riders.filter((c) => c.worn.kind === 'leader' && c.worn.jersey === 'gc'),
    ).toHaveLength(1)
  }, 120_000)
})
