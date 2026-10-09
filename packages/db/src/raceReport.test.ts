import { type RaceEvent, SEASON_CALENDAR } from '@cyclingstar/engine'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { type Horizon, worldHorizon } from './horizon.js'
import { type RiderRaceReport, getRiderLastRaceReport } from './raceReport.js'
import { stageResults, stageSnapshots } from './schema.js'
import { type StageRunSpec, runOneStage } from './stageRun.js'
import { type TestDb, startTestDb } from './testDb.js'
import { type TestWorld, enrollAll, idDe, seedTestWorld } from './timelineTestWorld.js'
import { timelineTickLog } from './timelines.js'

/**
 * EL INFORME DE LA ÚLTIMA CARRERA YA NO RE-SIMULA LA ETAPA (fuera del plan de E2, 9 de octubre de 2026;
 * la parte «deja de re-simular» del paso 17d de docs/tactica.md, R23.5). `getRiderLastRaceReport` saca
 * `personalEvents` y `story` de los sucesos CONGELADOS al correr la etapa (`stage_snapshots.events`,
 * desde la 0024), los que lee la ruta de etapa, en vez de volver a correrla con el motor de hoy en cada
 * petición. Sobre PGlite, con tres etapas de `race-france` corridas por `runOneStage` como el tick (con el
 * diario de la línea y su `flush`):
 *
 * - (a) con los sucesos guardados, el informe de cada corredor es IGUAL, campo a campo, al que daba la
 *   re-simulación (la misma etapa con `events` a null), en las tres etapas, y sin llamar al motor;
 * - (b) con un motor «de otra versión», el informe cuenta lo guardado: el motor de hoy que cuenta otra
 *   carrera no lo mueve, y un snapshot con sucesos que la re-simulación no da se cuenta tal cual;
 * - (c) una etapa sin sucesos guardados (corrida antes de la 0024) se sigue re-simulando, como antes.
 *
 * La medida de lo que cuesta cada camino no vive aquí: va en docs/diseno/e2-retransmision/implementacion.md.
 */

/**
 * EL MOTOR DE VERDAD, ENVUELTO (un `vi.mock` parcial, como `timelines.test.ts`): `simulateStage` cuenta sus
 * llamadas y, con `otraVersion`, cuenta otra carrera de la misma etapa (la de otra semilla), que es lo que
 * hace un motor de otra versión con la etapa de ayer. Las re-simulaciones sin sonda se memorizan por
 * entrada y semilla: el motor es puro, y así cada etapa se vuelve a correr una vez y no una por corredor.
 * Las de `runOneStage` llevan sonda y pasan tal cual.
 */
const motor = vi.hoisted(() => ({
  llamadas: 0,
  otraVersion: false,
  memo: new Map<string, import('@cyclingstar/engine').StageOutput>(),
}))

vi.mock('@cyclingstar/engine', async (importOriginal) => {
  const real = await importOriginal<typeof import('@cyclingstar/engine')>()
  return {
    ...real,
    simulateStage: (...args: Parameters<typeof real.simulateStage>) => {
      motor.llamadas += 1
      const [input, seed, probe] = args
      if (probe !== undefined) return real.simulateStage(...args)
      const semilla = motor.otraVersion ? `${seed}:otra-version` : seed
      const clave = `${semilla}|${JSON.stringify(input)}`
      const hecha = motor.memo.get(clave)
      if (hecha !== undefined) return hecha
      const out = real.simulateStage(input, semilla)
      motor.memo.set(clave, out)
      return out
    },
  }
})

const RACE_ID = 'race-france'
const KEY = `${RACE_ID}:s0`
const RACE = SEASON_CALENDAR.find((r) => r.id === RACE_ID)!
/**
 * Con esta semilla y el campo de abajo, hoy (v91): la 1 es la crono, sin fuga; en la 2 la fuga llega y en
 * la 3 la cazan; y en cada etapa hay corredores con sucesos propios y sin ellos. Lo que la prueba necesita
 * de eso lo comprueba (a), para que un motor nuevo que lo cambie no la deje vacía sin decirlo.
 */
const SEMILLA = 'informe-e'
const ETAPAS = [1, 2, 3] as const
/** Día de juego de la etapa N: la 1, la 2 y la 3 de `race-france` van seguidas. */
const dayOf = (stageDay: number): number => RACE.startDay + stageDay - 1

const specOf = (stageDay: number): StageRunSpec => {
  const stage = RACE.stages.find((s) => s.index === stageDay)!
  return {
    raceKey: KEY,
    raceId: RACE_ID,
    raceName: RACE.name,
    level: 'WT',
    raceClass: 'WT',
    season: 0,
    stageDay,
    kind: stage.kind,
    profile: stage.profile,
    timeTrial: stage.timeTrial === true,
    isFinal: false,
  }
}

/** Quien conoce la carrera hasta la etapa `k`: las siguientes, en su velo. Su última etapa conocida es la `k`. */
const hastaLa = (k: number): Horizon => ({
  ...worldHorizon,
  kind: 'viewer',
  userId: idDe(999),
  rev: '1.1',
  veil: ETAPAS.filter((s) => s > k).map((s) => ({
    raceKey: KEY,
    stageDay: s,
    gameDay: dayOf(s),
    reason: 'own_rider' as const,
  })),
})

describe('db: el informe de la última carrera sale de los sucesos guardados, sin re-simular', () => {
  let t: TestDb
  let w: TestWorld

  beforeAll(async () => {
    t = await startTestDb()
    w = await seedTestWorld(t, { worldSeed: SEMILLA, teams: 4, perTeam: 6 })
    await enrollAll(t, w, KEY)
    // Como el tick con la grabación encendida: cada etapa con su diario y el `flush` detrás.
    for (const stageDay of ETAPAS) {
      const log = timelineTickLog()
      await t.db.transaction(async (tx) => {
        await runOneStage(tx, w.worldId, dayOf(stageDay), SEMILLA, {
          ...specOf(stageDay),
          timeline: log,
        })
        await log.flush(tx)
      })
      expect(log.summary(), `e${stageDay}`).toBe('timeline: 1 grabadas, 0 sin línea')
    }
  }, 180_000)

  afterAll(async () => {
    await t?.close()
  })

  /** Los clasificados de la etapa `k`: los que la tienen por última conocida con `hastaLa(k)`. */
  const clasificados = async (k: number): Promise<string[]> =>
    (
      await t.db
        .select({ riderId: stageResults.riderId })
        .from(stageResults)
        .where(and(eq(stageResults.raceId, KEY), eq(stageResults.stageDay, k)))
        .orderBy(stageResults.riderId)
    ).map((r) => r.riderId)

  /** El informe de cada clasificado de la `k`, en serie (PGlite admite una sesión), y las llamadas al motor. */
  const informes = async (
    k: number,
  ): Promise<{ porCorredor: Map<string, RiderRaceReport>; simulaciones: number }> => {
    const antes = motor.llamadas
    const porCorredor = new Map<string, RiderRaceReport>()
    for (const id of await clasificados(k)) {
      const report = await getRiderLastRaceReport(t.db, hastaLa(k), id)
      expect(report?.stageDay, id).toBe(k)
      porCorredor.set(id, report!)
    }
    return { porCorredor, simulaciones: motor.llamadas - antes }
  }

  const snapshotDe = (k: number) =>
    and(eq(stageSnapshots.raceId, KEY), eq(stageSnapshots.stageDay, k))

  /** Lo que devuelve `fn` con el snapshot de la `k` cambiado; luego, el de verdad otra vez. */
  const conSnapshot = async <T>(
    k: number,
    cambio: { events: unknown; engineVersion?: number },
    fn: () => Promise<T>,
  ): Promise<T> => {
    const [deVerdad] = await t.db
      .select({ events: stageSnapshots.events, engineVersion: stageSnapshots.engineVersion })
      .from(stageSnapshots)
      .where(snapshotDe(k))
    if (deVerdad === undefined) throw new Error(`e${k} sin snapshot`)
    await t.db.update(stageSnapshots).set(cambio).where(snapshotDe(k))
    try {
      return await fn()
    } finally {
      await t.db.update(stageSnapshots).set(deVerdad).where(snapshotDe(k))
    }
  }

  /** Como una etapa corrida antes de la 0024: el snapshot sin sus sucesos. */
  const sinSucesos = <T>(k: number, fn: () => Promise<T>): Promise<T> =>
    conSnapshot(k, { events: null }, fn)

  /**
   * (a) IGUAL QUE LA RE-SIMULACIÓN, Y SIN EL MOTOR. En cada etapa, la última conocida de quien la ha visto
   * hasta ahí, y para cada clasificado, el informe de los sucesos guardados es el que daba re-simular la
   * etapa con el motor de hoy, campo a campo: `personalEvents`, `story` y todo lo demás. Y se saca sin una
   * sola llamada a `simulateStage`. La prueba no vale si el campo no tiene corredores con sucesos propios y
   * sin ellos, o ninguna etapa con fuga: se comprueba al final.
   */
  it('(a) en cada etapa y para cada corredor, el informe de lo guardado es el de la re-simulación, sin correrla', async () => {
    let conSucesos = 0
    let sinSucesosPropios = 0
    let conHistoria = 0
    for (const k of ETAPAS) {
      const guardado = await informes(k)
      expect(guardado.porCorredor.size, `e${k}`).toBeGreaterThan(0)
      expect(guardado.simulaciones, `e${k}: lo guardado no llama al motor`).toBe(0)
      const resimulado = await sinSucesos(k, () => informes(k))
      expect(resimulado.simulaciones, `e${k}: sin sucesos, una por informe`).toBe(
        guardado.porCorredor.size,
      )
      for (const [id, report] of guardado.porCorredor) {
        expect(report, `e${k} ${id}`).toEqual(resimulado.porCorredor.get(id))
        if (report.personalEvents.length > 0) conSucesos += 1
        else sinSucesosPropios += 1
        if (report.story.length > 0) conHistoria += 1
      }
    }
    expect(conSucesos, 'ningún corredor con sucesos propios').toBeGreaterThan(0)
    expect(sinSucesosPropios, 'ningún corredor sin sucesos propios').toBeGreaterThan(0)
    expect(conHistoria, 'ninguna etapa con fuga').toBeGreaterThan(0)
  })

  /**
   * (b) UN MOTOR DE OTRA VERSIÓN NO MUEVE EL INFORME. El motor de hoy deja de ser el que corrió las etapas
   * y, re-simulada, cada una cuenta otra carrera. El informe de las etapas con sus sucesos guardados sigue
   * siendo el de antes; el de una etapa sin ellos, que se re-simula, cambia: es lo que les pasaba antes a
   * todas (C16, docs/retransmision.md), y la prueba de que el cambio de motor cuenta otra carrera.
   */
  it('(b) con un motor de otra versión, el informe sigue contando la carrera que se corrió', async () => {
    const antes = new Map<number, Map<string, RiderRaceReport>>()
    for (const k of ETAPAS) antes.set(k, (await informes(k)).porCorredor)
    motor.otraVersion = true
    try {
      for (const k of ETAPAS) {
        const otroMotor = await informes(k)
        expect(otroMotor.simulaciones, `e${k}`).toBe(0)
        expect(otroMotor.porCorredor, `e${k}`).toEqual(antes.get(k))
      }
      const reSimulado = await sinSucesos(3, () => informes(3))
      expect(reSimulado.simulaciones).toBe(reSimulado.porCorredor.size)
      expect(reSimulado.porCorredor).not.toEqual(antes.get(3))
    } finally {
      motor.otraVersion = false
    }
  })

  /**
   * …Y UN SNAPSHOT CUYOS SUCESOS NO SON LOS DE LA RE-SIMULACIÓN SE CUENTA TAL CUAL: el de otra versión
   * (`engine_version` 52), con unos sucesos escritos a mano que el motor de hoy no da para esta etapa. El
   * informe cuenta esos, con la regla de siempre: los del corredor, con el km redondeado, por km y sin el
   * mismo suceso dos veces en el mismo km; y la fuga, cazada o no. Lo demás del informe no cambia.
   */
  it('(b) un snapshot con sucesos que la re-simulación no da: el informe cuenta los guardados', async () => {
    const k = 3
    const [a, b, c, ajeno] = await clasificados(k)
    const deVerdad = (await informes(k)).porCorredor
    const ataque: RaceEvent = {
      km: 151.6,
      tS: 13_000,
      tipo: 'ataque',
      plantilla: 'attack_go',
      protagonistas: [a!],
    }
    const nace: RaceEvent = {
      km: 12.4,
      tS: 900,
      tipo: 'fuga_formada',
      plantilla: 'breakaway_formed',
      protagonistas: [a!, b!, c!],
    }
    const volante: RaceEvent = {
      km: 97.2,
      tS: 8_000,
      tipo: 'banner',
      plantilla: 'sprint_won',
      protagonistas: [b!],
    }
    const caza: RaceEvent = {
      km: 140.5,
      tS: 12_000,
      tipo: 'fuga_cazada',
      plantilla: 'breakaway_caught',
      protagonistas: [a!, b!, c!],
    }

    const cazada = await conSnapshot(
      k,
      { events: [ataque, nace, ataque, volante, caza], engineVersion: 52 },
      () => informes(k),
    )
    expect(cazada.simulaciones).toBe(0)
    const historiaCazada = [
      { km: 12, plantilla: 'A 3-rider break went clear' },
      { km: 141, plantilla: 'The bunch reeled the break back in' },
    ]
    expect(cazada.porCorredor.get(a!)).toEqual({
      ...deVerdad.get(a!),
      personalEvents: [
        { km: 12, plantilla: 'breakaway_formed' },
        { km: 141, plantilla: 'breakaway_caught' },
        { km: 152, plantilla: 'attack_go' },
      ],
      story: historiaCazada,
    })
    expect(cazada.porCorredor.get(b!)).toEqual({
      ...deVerdad.get(b!),
      personalEvents: [
        { km: 12, plantilla: 'breakaway_formed' },
        { km: 97, plantilla: 'sprint_won' },
        { km: 141, plantilla: 'breakaway_caught' },
      ],
      story: historiaCazada,
    })
    expect(cazada.porCorredor.get(ajeno!)).toEqual({
      ...deVerdad.get(ajeno!),
      personalEvents: [],
      story: historiaCazada,
    })

    // Sin la caza, la fuga llegó.
    const llego = await conSnapshot(k, { events: [nace, volante], engineVersion: 52 }, () =>
      informes(k),
    )
    expect(llego.simulaciones).toBe(0)
    expect(llego.porCorredor.get(c!)).toEqual({
      ...deVerdad.get(c!),
      personalEvents: [{ km: 12, plantilla: 'breakaway_formed' }],
      story: [{ km: 12, plantilla: 'A 3-rider break went clear and stayed away to the finish' }],
    })
  })

  /**
   * (c) UNA ETAPA SIN SUCESOS GUARDADOS SE SIGUE RE-SIMULANDO, COMO ANTES. Las etapas corridas antes de la
   * 0024 tienen `events` a null: para ellas no hay otra cosa, y el informe vuelve a correrlas con el motor de
   * hoy, una vez por petición, y cuenta lo que contaba antes de este cambio (con el mismo motor, lo mismo
   * que lo guardado; con otro, otra carrera, arriba).
   */
  it('(c) una etapa anterior a la 0024, sin sucesos guardados, se re-simula y cuenta lo de antes', async () => {
    const k = 2
    const guardado = await informes(k)
    const anterior = await sinSucesos(k, () => informes(k))
    expect(anterior.simulaciones).toBe(anterior.porCorredor.size)
    expect(anterior.porCorredor).toEqual(guardado.porCorredor)
    const reports = [...anterior.porCorredor.values()]
    expect(reports.some((r) => r.personalEvents.length > 0)).toBe(true)
  })
})
