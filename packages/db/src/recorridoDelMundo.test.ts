import { readFileSync } from 'node:fs'
import {
  SEASON_CALENDAR,
  type StageProfile,
  calendarForSeason,
  stagesForSeason,
} from '@cyclingstar/engine'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildRaceContext, terrenoRestante } from './raceContext.js'
import {
  backfillRaceRoutes,
  canonico,
  freezeRaceRoute,
  getRaceRoute,
  raceStagesForWorld,
  reclassifyRouteSource,
  seasonOfRaceKey,
} from './raceRoutes.js'
import { raceRoutes, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * EL RECORRIDO ES DEL MUNDO (docs/tactica.md paso 1a).
 *
 * Lo que hay que probar no es que la tabla guarde JSON: es la PROMESA que la justifica. El perfil
 * que el tick usa tiene que ser **idéntico** al del calendario de la temporada que se congela, y
 * tiene que quedar CONGELADO, o sea que reescribirlo no puede pisarlo.
 *
 * «Idéntico byte a byte» no se puede pedir: JSONB de Postgres normaliza el orden de las claves
 * (`{g, km}` vuelve como `{km, g}`). Es irrelevante, porque el motor lee `s.km` y `s.tipo` y no un
 * buffer; lo que se compara es la forma canónica (`canonico`, claves ordenadas), que exige que
 * ningún VALOR cambie y que el orden de los ARRAYS se conserve.
 */

/** Temporada 1 del calendario: la primera que no es la de `SEASON_CALENDAR`. */
const S1 = 1
const DIA_S1 = 364 + 100

describe('db: el recorrido se congela el día que nace la carrera', () => {
  let t: TestDb
  let worldId: string

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-rutas', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = w!.id
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('EL PERFIL GUARDADO ES IDÉNTICO AL DEL CALENDARIO, que es la condición del paso 1a', async () => {
    const race = SEASON_CALENDAR.find((r) => r.stages.length >= 3)!
    await freezeRaceRoute(t.db, worldId, `${race.id}:s0`, race.id, 0)
    for (let i = 1; i <= race.stages.length; i++) {
      const leido = await getRaceRoute(t.db, worldId, `${race.id}:s0`, i)
      expect(canonico(leido)).toBe(canonico(race.stages[i - 1]!.profile))
    }
  })

  it('CONGELADO quiere decir congelado: volver a escribir no lo pisa', async () => {
    // Es la razón de ser entera de la tabla. Si el segundo `freeze` sobrescribiera, el día que
    // cambie el generador se le movería el recorrido a una carrera a medio correr.
    const race = SEASON_CALENDAR.find((r) => r.stages.length >= 3)!
    const antes = await getRaceRoute(t.db, worldId, `${race.id}:s0`, 1)
    await freezeRaceRoute(t.db, worldId, `${race.id}:s0`, race.id, 0)
    const despues = await getRaceRoute(t.db, worldId, `${race.id}:s0`, 1)
    expect(canonico(despues)).toBe(canonico(antes))
  })

  it('una carrera de otra temporada es OTRO recorrido, aunque sea la misma carrera', async () => {
    const race = SEASON_CALENDAR.find((r) => r.stages.length >= 3)!
    expect(await getRaceRoute(t.db, worldId, `${race.id}:s1`, 1)).toBeNull()
  })

  it('una carrera de antes de la tabla devuelve null, y el tick cae al calendario', async () => {
    expect(await getRaceRoute(t.db, worldId, 'race-que-no-existe:s0', 1)).toBeNull()
  })

  it('una carrera que no está en el calendario es un error de datos, no un caso', async () => {
    await expect(
      freezeRaceRoute(t.db, worldId, 'race-que-no-existe:s0', 'race-que-no-existe', 0),
    ).rejects.toThrow('carrera desconocida')
  })

  it('la temporada sale del sufijo de la raceKey, y sin sufijo es la 0', () => {
    expect(seasonOfRaceKey('race-tour:s0')).toBe(0)
    expect(seasonOfRaceKey('race-tour:s12')).toBe(12)
    expect(seasonOfRaceKey('race-tour')).toBe(0)
  })

  it('congela kind, label, time_trial, route_source y arch y los lee de vuelta', async () => {
    // Una carrera con etapas de los tres orígenes si la hay; si no, una con real y otra cosa.
    const race = SEASON_CALENDAR.find(
      (r) =>
        r.stages.some((s) => s.routeSource === 'real') &&
        r.stages.some((s) => s.routeSource !== 'real'),
    )!
    const key = `${race.id}:s0`
    await freezeRaceRoute(t.db, worldId, key, race.id, 0)
    const leidas = await raceStagesForWorld(t.db, worldId, key, race.id, 0)
    expect(leidas.map((s) => s.stageDay)).toEqual(race.stages.map((s) => s.index))
    for (const [i, st] of race.stages.entries()) {
      const f = leidas[i]!
      expect(f.kind).toBe(st.kind)
      expect(f.label).toBe(st.label)
      expect(f.timeTrial).toBe(st.timeTrial ?? false)
      expect(f.routeSource).toBe(st.routeSource)
      expect(canonico(f.profile)).toBe(canonico(st.profile))
      if (st.routeSource === 'real') expect(f.arch).toBeNull()
      else {
        expect(f.arch?.skeleton).toBe(st.arch?.skeleton)
        expect(f.arch?.frase).toBe(st.arch?.frase)
        expect(canonico(f.arch?.motivos)).toBe(canonico(st.arch?.motivos))
      }
    }
  })

  it('dos temporadas, dos recorridos, un esqueleto', async () => {
    const race = calendarForSeason(0).find(
      (r) => r.stages.length >= 3 && r.routeSource === 'generado',
    )!
    await freezeRaceRoute(t.db, worldId, `${race.id}:s0`, race.id, 0)
    await freezeRaceRoute(t.db, worldId, `${race.id}:s1`, race.id, 1)
    // En serie: la base de pruebas (PGlite) sirve una consulta cada vez.
    const s0 = await raceStagesForWorld(t.db, worldId, `${race.id}:s0`, race.id, 0)
    const s1 = await raceStagesForWorld(t.db, worldId, `${race.id}:s1`, race.id, 1)
    expect(s0.map((x) => x.kind)).toEqual(s1.map((x) => x.kind))
    expect(s0.map((x) => x.timeTrial)).toEqual(s1.map((x) => x.timeTrial))
    expect(s0.map((x) => x.arch?.skeleton)).toEqual(s1.map((x) => x.arch?.skeleton))
    expect(s0.every((x) => x.arch !== null)).toBe(true) // filas nuevas: arch escrito
    expect(s0.some((x, i) => canonico(x.profile) !== canonico(s1[i]!.profile))).toBe(true)
    expect(s0[0]!.routeSource).toBe('generado')
    expect(s0[0]!.label).toBeTruthy()
    // Y lo de la temporada 1 es exactamente la edición 1 del calendario, no la 0.
    const ed1 = stagesForSeason(race.id, 1)
    expect(s1.map((x) => canonico(x.profile))).toEqual(ed1.map((x) => canonico(x.profile)))
  })

  it('sin fila, la edición de la temporada; nunca la de SEASON_CALENDAR', async () => {
    // La temporada 2 no la congela ningún otro caso de este fichero: aquí no hay fila seguro.
    const race = calendarForSeason(0).find(
      (r) => r.stages.length >= 3 && r.stages.every((s) => s.routeSource === 'generado'),
    )!
    const key = `${race.id}:s2`
    const leidas = await raceStagesForWorld(t.db, worldId, key, race.id, 2)
    const ed2 = stagesForSeason(race.id, 2)
    expect(leidas.map((x) => canonico(x.profile))).toEqual(ed2.map((x) => canonico(x.profile)))
    expect(leidas.map((x) => x.arch?.frase)).toEqual(ed2.map((x) => x.arch?.frase))
    expect(leidas.some((x, i) => canonico(x.profile) !== canonico(race.stages[i]!.profile))).toBe(
      true,
    )
  })

  it('una fila anterior a la migración se completa desde la temporada, con arch a null', async () => {
    const race = calendarForSeason(0).find(
      (r) => r.stages.length >= 2 && r.stages.every((s) => s.routeSource === 'generado'),
    )!
    const key = `${race.id}:s7`
    const perfilViejo: StageProfile = { segments: [{ km: 150, tipo: 'llano' }] }
    await t.db.insert(raceRoutes).values(
      race.stages.map((_, i) => ({
        worldId,
        raceKey: key,
        stageDay: i + 1,
        profile: perfilViejo,
        routeSource: 'generado',
      })),
    )
    const leidas = await raceStagesForWorld(t.db, worldId, key, race.id, 7)
    const ed = stagesForSeason(race.id, 7)
    expect(leidas.map((x) => x.kind)).toEqual(ed.map((x) => x.kind))
    expect(leidas.map((x) => x.label)).toEqual(ed.map((x) => x.label))
    expect(leidas.every((x) => x.arch === null)).toBe(true)
    // El perfil es el congelado, aunque sea viejo: eso no se completa nunca.
    expect(leidas.every((x) => canonico(x.profile) === canonico(perfilViejo))).toBe(true)
  })

  it('el backfill congela lo que falta, cada una en la temporada de su clave, y NO toca lo que ya estaba', async () => {
    const ya = SEASON_CALENDAR.find((r) => r.stages.length >= 3)!
    const nuevas = SEASON_CALENDAR.filter((r) => r.id !== ya.id).slice(0, 3)
    const claves = [`${ya.id}:s0`, ...nuevas.map((r) => `${r.id}:s0`), `${nuevas[0]!.id}:s${S1}`]
    const escritas = await backfillRaceRoutes(t.db, worldId, claves)
    expect(escritas).toBe(4)
    for (const r of nuevas) {
      const leido = await getRaceRoute(t.db, worldId, `${r.id}:s0`, 1)
      expect(canonico(leido)).toBe(canonico(r.stages[0]!.profile))
    }
    const s1 = await getRaceRoute(t.db, worldId, `${nuevas[0]!.id}:s${S1}`, 1)
    expect(canonico(s1)).toBe(canonico(stagesForSeason(nuevas[0]!.id, S1)[0]!.profile))
  })

  it('el backfill es idempotente: correrlo dos veces no escribe nada la segunda', async () => {
    const claves = SEASON_CALENDAR.slice(0, 4).map((r) => `${r.id}:s0`)
    await backfillRaceRoutes(t.db, worldId, claves)
    expect(await backfillRaceRoutes(t.db, worldId, claves)).toBe(0)
  })
})

/**
 * LOS LECTORES LEEN LO CONGELADO (decisión 23; docs/generador.md §10.7). Una carrera congelada en la
 * temporada 1 con un `kind` y un perfil que difieren A PROPÓSITO de los del calendario: si alguno de
 * los lectores leyera el código en vez del mundo, estos números no saldrían.
 */
describe('db: los lectores del recorrido leen el mundo y no el calendario de la temporada 0', () => {
  let t: TestDb
  let worldId: string
  const race = SEASON_CALENDAR.find(
    (r) => r.stages.length >= 3 && r.stages.every((s) => !s.timeTrial && s.kind !== 'reina'),
  )!
  const key = `${race.id}:s${S1}`
  // Todo reina, con un puerto de 12 km por etapa: nada que ver con lo que dibuja el generador.
  const perfilTrucado: StageProfile = {
    segments: [
      { km: 100, tipo: 'llano' },
      { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 7 }] },
    ],
  }

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-lectores', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = w!.id
    await t.db.insert(raceRoutes).values(
      race.stages.map((_, i) => ({
        worldId,
        raceKey: key,
        stageDay: i + 1,
        profile: perfilTrucado,
        routeSource: 'generado',
        kind: 'reina' as const,
        label: 'Mountains',
        timeTrial: false,
        arch: null,
      })),
    )
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('raceStagesForWorld devuelve el kind y el perfil congelados', async () => {
    const leidas = await raceStagesForWorld(t.db, worldId, key, race.id, S1)
    expect(leidas).toHaveLength(race.stages.length)
    expect(leidas.every((s) => s.kind === 'reina')).toBe(true)
    expect(leidas.every((s) => canonico(s.profile) === canonico(perfilTrucado))).toBe(true)
  })

  it('terrenoRestante del contexto de carrera se cuenta sobre lo congelado', async () => {
    const ctx = await buildRaceContext(t.db, worldId, key, race.id, S1, 2, DIA_S1)
    const congelado = terrenoRestante(
      race.stages.map(() => ({ profile: perfilTrucado, timeTrial: false })),
      2,
    )
    const delCodigo = terrenoRestante(stagesForSeason(race.id, S1), 2)
    expect(ctx.totalStages).toBe(race.stages.length)
    expect(ctx.shape?.raceClimbKmLeft).toBe(congelado.climbKm)
    expect(congelado.climbKm).not.toBe(delCodigo.climbKm)
    expect(ctx.shape?.totalKm).toBe(112)
  })

  it('el tick y la convocatoria sacan kind, perfil, crono y vocación de raceStagesForWorld', () => {
    // No se cuentan lecturas de SEASON_CALENDAR: esos ficheros lo recorren legítimamente para ids,
    // días y número de etapas, que son identidad (decisión 20). Lo que se sella es que `kind`,
    // `profile` y `timeTrial` ya no salen de `race.stages`.
    const leer = (f: string): string => readFileSync(new URL(f, import.meta.url), 'utf8')
    const run = leer('./calendarRun.ts')
    const callups = leer('./callups.ts')
    expect(run).not.toMatch(/raceVocationFit\(race\.stages/)
    expect(callups).not.toMatch(/raceVocationFit\(race\.stages/)
    expect(run).toMatch(
      /const frozen = await raceStagesForWorld\(tx, worldId, raceKey, race\.id, season\)/,
    )
    expect(run).toMatch(/const stage = frozen\[idx - 1\]/)
    expect(run).toMatch(/isFinal: idx === frozen\.length/)
    expect(run).toMatch(/freezeRaceRoute\(tx, worldId, raceKey, race\.id, season\)/)
    expect(run.match(/raceStagesForWorld\(/g)?.length).toBeGreaterThanOrEqual(2)
    expect(callups).toMatch(/raceStagesForWorld\(tx, worldId, raceKey, race\.id, season\)/)
  })
})

/**
 * LA RECLASIFICACIÓN DEL ORIGEN (docs/generador.md §11.4): un mundo congelado antes de la v87 tiene
 * todo como `'generado'`. Se corre una vez y solo toca `route_source`.
 */
describe('db: reclassifyRouteSource', () => {
  let t: TestDb
  let worldId: string

  beforeAll(async () => {
    t = await startTestDb()
    const [w] = await t.db
      .insert(worlds)
      .values({ worldSeed: 'semilla-origen', engineVersion: 1 })
      .returning({ id: worlds.id })
    worldId = w!.id
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  it('devuelve real, edicion y generado a cada fila, y la segunda pasada no cambia nada', async () => {
    const mixta = SEASON_CALENDAR.find(
      (r) =>
        r.stages.some((s) => s.routeSource === 'real') &&
        r.stages.some((s) => s.routeSource === 'edicion'),
    )!
    const inventada = SEASON_CALENDAR.find(
      (r) => r.stages.length >= 2 && r.stages.every((s) => s.routeSource === 'generado'),
    )!
    for (const r of [mixta, inventada]) await freezeRaceRoute(t.db, worldId, `${r.id}:s0`, r.id, 0)
    // Lo que dejaba la v86: todo `'generado'`.
    await t.db
      .update(raceRoutes)
      .set({ routeSource: 'generado' })
      .where(eq(raceRoutes.worldId, worldId))
    const cuenta = await reclassifyRouteSource(t.db, worldId)
    const reales = mixta.stages.filter((s) => s.routeSource === 'real').length
    expect(cuenta).toEqual({
      real: reales,
      edicion: mixta.stages.length - reales,
      generado: inventada.stages.length,
    })
    const filas = await t.db
      .select()
      .from(raceRoutes)
      .where(and(eq(raceRoutes.worldId, worldId), eq(raceRoutes.raceKey, `${mixta.id}:s0`)))
    for (const f of filas) {
      const st = mixta.stages[f.stageDay - 1]!
      expect(f.routeSource).toBe(st.routeSource === 'real' ? 'real' : 'edicion')
    }
    const todas = () =>
      t.db
        .select()
        .from(raceRoutes)
        .where(eq(raceRoutes.worldId, worldId))
        .orderBy(raceRoutes.raceKey, raceRoutes.stageDay)
    const antes = await todas()
    expect(await reclassifyRouteSource(t.db, worldId)).toEqual(cuenta)
    expect(canonico(await todas())).toBe(canonico(antes))
  })
})
