import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getTeamClassifications } from './teamClassification.js'
import { riders, stageResults, stageTeamResults, teams, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * Clasificación por equipos contra Postgres real (PGlite), derivada del histórico de
 * `stage_results`: acumulación por etapas (con corredores DISTINTOS puntuando cada día), equipos
 * incompletos, abandonos y agentes libres.
 *
 * Aquí se ejercita la rama de DERIVACIÓN (carreras corridas antes de que existiera la tabla). La de
 * PERSISTENCIA —lo que escribe el tick— se prueba en `stageRun.test.ts`, y un test de ahí comprueba
 * que las dos dan exactamente lo mismo.
 */

const RACE = 'equipos-test:s0'

interface Seed {
  worldId: string
  teamIds: Record<string, string>
  riderIds: Record<string, string>
}

/** Tres equipos de cuatro corredores y dos agentes libres. */
async function seed(t: TestDb): Promise<Seed> {
  const [world] = await t.db
    .insert(worlds)
    .values({ worldSeed: 'semilla-equipos', engineVersion: 1 })
    .returning({ id: worlds.id })
  const worldId = world!.id

  const teamNames = ['Alfa', 'Bravo', 'Charlie']
  const inserted = await t.db
    .insert(teams)
    .values(
      teamNames.map((name, i) => ({
        worldId,
        name,
        division: 'WT' as const,
        philosophy: 'general' as const,
        jerseySeed: `j${i}`,
        country: 'ES',
      })),
    )
    .returning({ id: teams.id, name: teams.name })
  const teamIds = Object.fromEntries(inserted.map((r) => [r.name, r.id]))

  // Cuatro corredores por equipo (a1..a4, b1..b4, c1..c4) y dos agentes libres (f1, f2).
  const plan: { key: string; team: string | null }[] = []
  for (const name of teamNames) {
    for (let i = 1; i <= 4; i++) plan.push({ key: `${name[0]!.toLowerCase()}${i}`, team: name })
  }
  plan.push({ key: 'f1', team: null }, { key: 'f2', team: null })

  const riderRows = await t.db
    .insert(riders)
    .values(
      plan.map((p) => ({
        worldId,
        teamId: p.team ? teamIds[p.team]! : null,
        name: p.key,
        country: 'ES',
        gender: 'M' as const,
        birthSeason: -25,
        archetype: 'fondo' as const,
        faceSeed: `cara-${p.key}`,
      })),
    )
    .returning({ id: riders.id, name: riders.name })
  const riderIds = Object.fromEntries(riderRows.map((r) => [r.name, r.id]))
  return { worldId, teamIds, riderIds }
}

/** Escribe el resultado de una etapa: lista ordenada de claves de corredor con su tiempo. */
async function runStage(
  t: TestDb,
  s: Seed,
  stageDay: number,
  finishers: readonly [string, number][],
): Promise<void> {
  await t.db.insert(stageResults).values(
    finishers.map(([key, tiempoS], i) => ({
      raceId: RACE,
      stageDay,
      riderId: s.riderIds[key]!,
      puesto: i + 1,
      tiempoS,
      // Bonificaciones REALES en las tres primeras plazas: no deben tocar la clasificación por
      // equipos, que va con tiempos de meta.
      bonificacionS: [10, 6, 4][i] ?? 0,
    })),
  )
}

describe('db: clasificación por equipos derivada del histórico', () => {
  let t: TestDb
  let s: Seed

  beforeAll(async () => {
    t = await startTestDb()
    s = await seed(t)
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('acumula los tres mejores DE CADA ETAPA, que no son los mismos corredores cada día', async () => {
    // Etapa 1: puntúan a1,a2,a3 (100+110+120 = 330) y b1,b2,b3 (130+140+150 = 420).
    await runStage(t, s, 1, [
      ['a1', 100],
      ['a2', 110],
      ['a3', 120],
      ['b1', 130],
      ['b2', 140],
      ['b3', 150],
      ['a4', 160],
      ['b4', 170],
      ['c1', 180],
      ['c2', 190],
      ['c3', 200],
      ['c4', 210],
      ['f1', 90], // el agente libre gana la etapa y no puntúa para nadie
      ['f2', 95],
    ])
    // Etapa 2: en Alfa puntúan OTROS TRES (a4, a3, a2: 100+110+120 = 330); en Bravo, b4,b3,b2.
    await runStage(t, s, 2, [
      ['a4', 100],
      ['a3', 110],
      ['a2', 120],
      ['b4', 130],
      ['b3', 140],
      ['b2', 150],
      ['a1', 900], // el líder de ayer se hunde: hoy NO puntúa para su equipo
      ['b1', 900],
      ['c1', 200],
      ['c2', 210],
      ['c3', 220],
      ['c4', 230],
    ])

    const { stage, overall } = await getTeamClassifications(t.db, RACE, 2)

    // La etapa 2 por separado.
    expect(stage.map((r) => r.teamName)).toEqual(['Alfa', 'Bravo', 'Charlie'])
    expect(stage[0]!.tiempoS).toBe(330)
    expect(stage[0]!.stagesScored).toBe(1)

    // Y la acumulada: 330 + 330 en Alfa. Si se hubieran tomado los tres mejores de la GENERAL en vez
    // de los de cada etapa, Alfa no sumaría 660 (a1 no puntúa el segundo día).
    const alfa = overall.find((r) => r.teamName === 'Alfa')!
    const bravo = overall.find((r) => r.teamName === 'Bravo')!
    expect(alfa.tiempoS).toBe(660)
    expect(alfa.stagesScored).toBe(2)
    expect(bravo.tiempoS).toBe(420 + 420)
    expect(overall.map((r) => r.teamName)).toEqual(['Alfa', 'Bravo', 'Charlie'])
    // Las bonificaciones de meta NO cuentan: con ellas Alfa sumaría 660 − 20.
    expect(alfa.tiempoS).not.toBe(640)
  }, 120_000)

  it('un abandono deja al equipo con menos de tres y lo saca de la clasificación', async () => {
    // Etapa 3: Charlie solo lleva dos a meta (los otros dos abandonaron). No puntúa, y con ello
    // queda FUERA de la acumulada aunque hubiera puntuado las dos etapas anteriores.
    await runStage(t, s, 3, [
      ['a1', 100],
      ['a2', 100],
      ['a3', 100],
      ['b1', 100],
      ['b2', 100],
      ['b3', 100],
      ['c1', 100],
      ['c2', 100],
    ])

    const stage3 = await getTeamClassifications(t.db, RACE, 3)
    const charlieStage = stage3.stage.find((r) => r.teamName === 'Charlie')!
    expect(charlieStage.out).toBe(true)
    expect(charlieStage.tiempoS).toBe(0)
    // Fuera de clasificación va SIEMPRE al final, como los DNF de la general individual.
    expect(stage3.stage.at(-1)!.teamName).toBe('Charlie')
    expect(stage3.overall.at(-1)!.teamName).toBe('Charlie')
    const charlieOverall = stage3.overall.find((r) => r.teamName === 'Charlie')!
    expect(charlieOverall.out).toBe(true)
    // Conserva lo que puntuó antes de caerse: es información, no un agujero.
    expect(charlieOverall.stagesScored).toBe(2)
    // Los que siguen en carrera no se ven afectados.
    expect(stage3.overall.slice(0, 2).map((r) => r.out)).toEqual([false, false])
  }, 120_000)

  it('la acumulada hasta una etapa no ve las etapas posteriores', async () => {
    const hasta1 = await getTeamClassifications(t.db, RACE, 1)
    expect(hasta1.overall.find((r) => r.teamName === 'Alfa')!.tiempoS).toBe(330)
    // Charlie aún no se había quedado corto en la etapa 1: sigue clasificado.
    expect(hasta1.overall.find((r) => r.teamName === 'Charlie')!.out).toBe(false)
  }, 120_000)

  it('sin etapa pedida devuelve solo la acumulada de toda la carrera', async () => {
    const todo = await getTeamClassifications(t.db, RACE)
    expect(todo.stage).toEqual([])
    expect(todo.overall.find((r) => r.teamName === 'Alfa')!.stagesScored).toBe(3)
  }, 120_000)

  it('una carrera sin resultados no tiene clasificación por equipos', async () => {
    const vacia = await getTeamClassifications(t.db, 'carrera-que-no-se-ha-corrido:s0')
    expect(vacia).toEqual({ stage: [], overall: [] })
  }, 120_000)
})

/**
 * Desempate TOTAL y DETERMINISTA, con el pelotón entero empatado a tiempo —que en una etapa llana es
 * el caso normal, no el raro—. Va en su propia base para poder sembrar empates exactos.
 */
describe('db: desempate de la clasificación por equipos', () => {
  let t: TestDb
  let s: Seed

  beforeAll(async () => {
    t = await startTestDb()
    s = await seed(t)
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('a igualdad de tiempo manda la suma de puestos de los que puntúan', async () => {
    // Todos con el mismo tiempo: los tres equipos suman 300 y solo los puestos los separan.
    await runStage(t, s, 1, [
      ['c1', 100],
      ['c2', 100],
      ['c3', 100],
      ['b1', 100],
      ['b2', 100],
      ['b3', 100],
      ['a1', 100],
      ['a2', 100],
      ['a3', 100],
    ])
    const { stage, overall } = await getTeamClassifications(t.db, RACE, 1)
    for (const row of stage) expect(row.tiempoS).toBe(300)
    // Charlie 1+2+3 = 6, Bravo 4+5+6 = 15, Alfa 7+8+9 = 24.
    expect(stage.map((r) => r.teamName)).toEqual(['Charlie', 'Bravo', 'Alfa'])
    expect(overall.map((r) => r.teamName)).toEqual(['Charlie', 'Bravo', 'Alfa'])
  }, 120_000)

  it('en la etapa, con tiempo y suma de puestos empatados, manda el mejor clasificado', async () => {
    // Mismo tiempo y misma suma de puestos: Alfa 1+5+6 = 12, Bravo 2+4+7 = 12. Solo los separa
    // quién metió antes a su primer corredor. El agente libre del medio es el que hace posible
    // el empate (siete plazas repartidas entre dos equipos suman impar).
    await t.db.insert(stageResults).values(
      (
        [
          ['a1', 1],
          ['b1', 2],
          ['b2', 3],
          ['f1', 4],
          ['a2', 5],
          ['a3', 6],
          ['b3', 7],
        ] as const
      ).map(([key, puesto]) => ({
        raceId: 'empate-etapa:s0',
        stageDay: 1,
        riderId: s.riderIds[key]!,
        puesto,
        tiempoS: 100,
      })),
    )
    const { stage } = await getTeamClassifications(t.db, 'empate-etapa:s0', 1)
    expect(stage.map((r) => [r.teamName, r.tiempoS, r.sumaPuestos])).toEqual([
      ['Alfa', 300, 12],
      ['Bravo', 300, 12],
    ])
  }, 120_000)

  it('con tiempo y puestos empatados desempata el mejor corredor en la general', async () => {
    // Empate PERFECTO entre Alfa y Bravo (mismo tiempo y misma suma de puestos), escrito a mano en
    // la tabla del tick: solo puede desempatar el mejor corredor de cada uno en la general.
    await t.db.insert(stageTeamResults).values([
      {
        raceId: 'empate:s0',
        stageDay: 1,
        teamId: s.teamIds.Alfa!,
        scored: true,
        tiempoS: 300,
        sumaPuestos: 12,
        mejorPuesto: 1,
      },
      {
        raceId: 'empate:s0',
        stageDay: 1,
        teamId: s.teamIds.Bravo!,
        scored: true,
        tiempoS: 300,
        sumaPuestos: 12,
        mejorPuesto: 2,
      },
    ])
    // La general de esa carrera: el mejor corredor es de Bravo (menos tiempo), así que Bravo manda.
    await t.db.insert(stageResults).values([
      { raceId: 'empate:s0', stageDay: 1, riderId: s.riderIds.b1!, puesto: 1, tiempoS: 90 },
      { raceId: 'empate:s0', stageDay: 1, riderId: s.riderIds.a1!, puesto: 2, tiempoS: 100 },
    ])
    const { overall } = await getTeamClassifications(t.db, 'empate:s0', 1)
    expect(overall.map((r) => r.teamName)).toEqual(['Bravo', 'Alfa'])
    // Y el orden es ESTABLE: dos consultas seguidas devuelven lo mismo.
    const otra = await getTeamClassifications(t.db, 'empate:s0', 1)
    expect(otra.overall.map((r) => r.teamName)).toEqual(['Bravo', 'Alfa'])
  }, 120_000)
})
